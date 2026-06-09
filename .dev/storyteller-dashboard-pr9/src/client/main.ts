import { type GenerateNpcResponse, type ImageResponse, type Npc, type NpcFieldKey, type QuickOptions, type RerollFieldResponse, fieldLabels, npcFieldKeys } from "../shared/npc.js";

const defaultOptions: QuickOptions = {
  species: "Any V5-appropriate",
  gender: "Any",
  sceneRole: "Useful complication",
  threatLevel: "Street-level",
  tone: "Gothic-punk",
  pcRelationship: "Tie lightly to a PC if useful"
};

const optionSets: Record<keyof QuickOptions, string[]> = {
  species: ["Any V5-appropriate", "Mortal", "Kindred", "Ghoul", "Thin-blood", "Werewolf", "Wraith", "Hunter"],
  gender: ["Any", "Woman", "Man", "Nonbinary", "Trans woman", "Trans man"],
  sceneRole: ["Useful complication", "Antagonistic", "Distracting", "Helpful", "Knowledgeable", "Desperate", "Bystander with leverage"],
  threatLevel: ["Street-level", "Fragile", "Competent", "Dangerous", "Predator", "Elder-scale"],
  tone: ["Gothic-punk", "Political", "Monstrous", "Sympathetic", "Sleazy", "Tragic", "Coldly modern"],
  pcRelationship: ["Tie lightly to a PC if useful", "Beef with a PC", "Needs a PC", "Owes a PC", "Can expose a PC", "Faction-linked", "No PC tie"]
};

type AppState = {
  prompt: string;
  options: QuickOptions;
  multipleCount: number;
  npcs: Npc[];
  selectedNpcId?: string;
  busyLabel?: string;
  error?: string;
  chronicleStatus: string;
};

const state: AppState = {
  prompt: "",
  options: { ...defaultOptions },
  multipleCount: 3,
  npcs: loadSessionNpcs(),
  chronicleStatus: "Checking chronicle configuration..."
};

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element #root was not found.");
}
const root = rootElement;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNpcLike(value: unknown): value is Npc {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function loadSessionNpcs(): Npc[] {
  const saved = sessionStorage.getItem("tr-dashboard-npcs");
  if (saved === null) {
    return [];
  }
  const parsed: unknown = JSON.parse(saved);
  return Array.isArray(parsed) ? parsed.filter(isNpcLike) : [];
}

function saveSessionNpcs(): void {
  sessionStorage.setItem("tr-dashboard-npcs", JSON.stringify(state.npcs));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fieldValueHtml(value: string | string[]): string {
  if (Array.isArray(value)) {
    return `<ul>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }
  return `<p>${escapeHtml(value)}</p>`;
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const parsed: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(parsed) && typeof parsed.error === "string" ? parsed.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return parsed as TResponse;
}

function setBusy(label?: string): void {
  state.busyLabel = label;
  render();
}

function setError(message?: string): void {
  state.error = message;
  render();
}

async function submitGenerate(includeMultiple: boolean, includeImage: boolean, variant?: string): Promise<void> {
  if (state.prompt.trim().length === 0) {
    setError("Type a few NPC keywords first.");
    return;
  }
  state.error = undefined;
  setBusy(includeMultiple ? "Generating NPC set…" : "Generating NPC…");
  try {
    const response = await postJson<GenerateNpcResponse>("/api/npcs/generate", {
      prompt: state.prompt,
      count: includeMultiple ? state.multipleCount : 1,
      includeImage,
      quickOptions: state.options,
      variant
    });
    state.chronicleStatus = response.chronicleContextStatus;
    state.npcs = [...response.npcs, ...state.npcs];
    state.selectedNpcId = response.npcs[0]?.id;
    saveSessionNpcs();
    render();
    if (includeImage) {
      await Promise.all(response.npcs.map((npc) => generateImage(npc)));
    }
  } catch (caught) {
    state.error = caught instanceof Error ? caught.message : "NPC generation failed.";
  } finally {
    setBusy(undefined);
  }
}

async function generateImage(npc: Npc): Promise<void> {
  updateNpc(npc.id, { imageUrl: "loading" });
  try {
    const response = await postJson<ImageResponse>("/api/images/generate", { npc });
    updateNpc(response.npcId, { imageUrl: response.imageUrl });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Image generation failed.";
    updateNpc(npc.id, { imageUrl: `error:${message}` });
  }
}

async function rerollField(npc: Npc, field: NpcFieldKey): Promise<void> {
  setBusy(`Rerolling ${fieldLabels[field]}…`);
  try {
    const response = await postJson<RerollFieldResponse>("/api/npcs/reroll-field", { npc, field, prompt: state.prompt || npc.overview, quickOptions: state.options });
    updateNpc(npc.id, { [response.field]: response.value });
  } catch (caught) {
    state.error = caught instanceof Error ? caught.message : "Field reroll failed.";
  } finally {
    setBusy(undefined);
  }
}

async function rerollNpc(npc: Npc): Promise<void> {
  setBusy(`Rerolling ${npc.name}…`);
  try {
    const response = await postJson<Npc>("/api/npcs/reroll", { npc, prompt: state.prompt || npc.overview, quickOptions: state.options, lockedFields: npc.lockedFields ?? [] });
    state.npcs = state.npcs.map((candidate) => candidate.id === npc.id ? response : candidate);
    saveSessionNpcs();
  } catch (caught) {
    state.error = caught instanceof Error ? caught.message : "NPC reroll failed.";
  } finally {
    setBusy(undefined);
  }
}

function updateNpc(id: string, patch: Partial<Npc>): void {
  state.npcs = state.npcs.map((npc) => npc.id === id ? { ...npc, ...patch } : npc);
  saveSessionNpcs();
  render();
}

function toggleLock(npc: Npc, field: NpcFieldKey): void {
  const locked = new Set(npc.lockedFields ?? []);
  if (locked.has(field)) {
    locked.delete(field);
  } else {
    locked.add(field);
  }
  updateNpc(npc.id, { lockedFields: [...locked] });
}

function optionControlsHtml(): string {
  return (Object.keys(optionSets) as Array<keyof QuickOptions>).map((key) => {
    const label = key.replace(/([A-Z])/g, " $1");
    const options = optionSets[key].map((option) => `<option value="${escapeHtml(option)}" ${state.options[key] === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
    return `<label><span>${escapeHtml(label)}</span><select data-option="${key}">${options}</select></label>`;
  }).join("");
}

function portraitHtml(npc: Npc): string {
  if (npc.imageUrl === "loading") {
    return `<div class="portrait loading">Generating…</div>`;
  }
  if (npc.imageUrl?.startsWith("error:") === true) {
    return `<div class="portrait error">Portrait failed</div>`;
  }
  if (npc.imageUrl !== undefined) {
    return `<img class="portrait" src="${escapeHtml(npc.imageUrl)}" alt="${escapeHtml(npc.name)} portrait" />`;
  }
  return `<div class="portrait empty">No portrait</div>`;
}

function fieldBlockHtml(npc: Npc, field: NpcFieldKey): string {
  const locked = npc.lockedFields?.includes(field) ?? false;
  return `
    <section class="field-block">
      <div class="field-title">
        <strong>${escapeHtml(fieldLabels[field])}</strong>
        <span>
          <button class="micro" data-action="reroll-field" data-id="${npc.id}" data-field="${field}">REROLL</button>
          <button class="micro ${locked ? "locked" : ""}" data-action="lock-field" data-id="${npc.id}" data-field="${field}">LOCK</button>
        </span>
      </div>
      ${fieldValueHtml(npc[field])}
    </section>`;
}

function npcCardHtml(npc: Npc): string {
  return `
    <article class="npc-card ${npc.favorite ? "favorite" : ""}">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(npc.species)} // ${escapeHtml(npc.ageAndGender)}</p>
          <h2>${escapeHtml(npc.name)}</h2>
        </div>
        <button class="ghost" data-action="favorite" data-id="${npc.id}">${npc.favorite ? "PINNED" : "PIN"}</button>
      </header>
      <div class="summary-row">
        ${portraitHtml(npc)}
        <div>
          <p>${escapeHtml(npc.overview)}</p>
          <p class="muted">Want: ${escapeHtml(npc.immediateWant)}</p>
          <p class="muted">Risk: ${escapeHtml(npc.masqueradeRisk)}</p>
        </div>
      </div>
      ${fieldBlockHtml(npc, "secret")}
      ${fieldBlockHtml(npc, "chronicleRelationships")}
      ${fieldBlockHtml(npc, "sampleDialogue")}
      <footer class="button-row compact">
        <button data-action="open" data-id="${npc.id}">Full modal</button>
        <button data-action="image" data-id="${npc.id}">Portrait</button>
        <button data-action="reroll-npc" data-id="${npc.id}">Reroll unlocked</button>
      </footer>
    </article>`;
}

function modalHtml(npc: Npc): string {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <article class="modal-card" data-modal-card="true">
        <header>
          <div>
            <p class="eyebrow">Export / ShareX pin card</p>
            <h2>${escapeHtml(npc.name)}</h2>
            <p>${escapeHtml(npc.species)} // ${escapeHtml(npc.ageAndGender)}</p>
          </div>
          <button class="ghost" data-action="close-modal">Close</button>
        </header>
        <div class="modal-layout">
          ${portraitHtml(npc)}
          <div class="modal-fields">
            ${npcFieldKeys.map((field) => `<section><h3>${escapeHtml(fieldLabels[field])}</h3>${fieldValueHtml(npc[field])}</section>`).join("")}
          </div>
        </div>
      </article>
    </div>`;
}

function render(): void {
  const selectedNpc = state.npcs.find((npc) => npc.id === state.selectedNpcId);
  root.innerHTML = `
    <main class="app-shell">
      <section class="command-panel">
        <div>
          <p class="eyebrow">Toronto Rising // Storyteller Dashboard</p>
          <h1>Second-monitor NPC forge</h1>
          <p class="subhead">Fast V5 NPCs from scraps. Text returns first; portraits fill in after.</p>
        </div>
        <textarea id="prompt" placeholder="18, girl, has beef with Aishe, mortal…" aria-label="NPC prompt">${escapeHtml(state.prompt)}</textarea>
        <div class="hotkeys"><span>Enter: Generate</span><span>Shift+Enter: Multiples</span><span>Ctrl+Enter: Portrait</span><span>Ctrl+Shift+Enter: Both</span></div>
        <div class="quick-grid">
          ${optionControlsHtml()}
          <label><span>Multiple count</span><select id="multiple-count">${[2, 3, 4, 5, 6].map((count) => `<option value="${count}" ${state.multipleCount === count ? "selected" : ""}>${count}</option>`).join("")}</select></label>
        </div>
        <div class="button-row">
          <button data-action="generate">Generate</button>
          <button data-action="generate-many">Generate ${state.multipleCount}</button>
          <button data-action="generate-image">Generate + Portrait</button>
          <button data-action="generate-both">Both</button>
        </div>
        <div class="button-row variants">
          <button data-variant="Make this NPC more political and faction-entangled.">More political</button>
          <button data-variant="Make this NPC more monstrous but still playable in a modern-night scene.">More monstrous</button>
          <button data-variant="Make this NPC more sympathetic without removing danger.">More sympathetic</button>
          <button data-variant="Tie this NPC harder to known chronicle context, but mark uncertain hooks clearly.">Tie to chronicle</button>
        </div>
        ${state.busyLabel === undefined ? "" : `<p class="status busy">${escapeHtml(state.busyLabel)}</p>`}
        ${state.error === undefined ? "" : `<p class="status error">${escapeHtml(state.error)}</p>`}
        <p class="status">${escapeHtml(state.chronicleStatus)}</p>
      </section>
      <section class="npc-grid" aria-live="polite">
        ${state.npcs.length === 0 ? `<div class="empty-state"><h2>No NPCs yet.</h2><p>Type rough table notes, choose a few chips, and hit Enter. Chronicle context is retrieved from your configured OpenAI vector store.</p></div>` : state.npcs.map(npcCardHtml).join("")}
      </section>
      ${selectedNpc === undefined ? "" : modalHtml(selectedNpc)}
    </main>`;
  bindEvents();
}

function findNpc(id: string | null): Npc | undefined {
  return id === null ? undefined : state.npcs.find((npc) => npc.id === id);
}

function bindEvents(): void {
  const promptInput = document.getElementById("prompt");
  if (promptInput instanceof HTMLTextAreaElement) {
    promptInput.addEventListener("input", () => {
      state.prompt = promptInput.value;
    });
    promptInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      void submitGenerate(event.shiftKey, event.ctrlKey || event.metaKey);
    });
  }

  document.querySelectorAll<HTMLSelectElement>("[data-option]").forEach((select) => {
    select.addEventListener("change", () => {
      const key = select.dataset.option as keyof QuickOptions | undefined;
      if (key !== undefined) {
        state.options = { ...state.options, [key]: select.value };
      }
    });
  });

  const countSelect = document.getElementById("multiple-count");
  if (countSelect instanceof HTMLSelectElement) {
    countSelect.addEventListener("change", () => {
      state.multipleCount = Number.parseInt(countSelect.value, 10);
      render();
    });
  }

  document.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.dataset.action;
      const npc = findNpc(target.dataset.id ?? null);
      if (action === "generate") void submitGenerate(false, false);
      if (action === "generate-many") void submitGenerate(true, false);
      if (action === "generate-image") void submitGenerate(false, true);
      if (action === "generate-both") void submitGenerate(true, true);
      if (action === "open" && npc !== undefined) { state.selectedNpcId = npc.id; render(); }
      if (action === "favorite" && npc !== undefined) updateNpc(npc.id, { favorite: !npc.favorite });
      if (action === "image" && npc !== undefined) void generateImage(npc);
      if (action === "reroll-npc" && npc !== undefined) void rerollNpc(npc);
      if (action === "reroll-field" && npc !== undefined && target.dataset.field !== undefined) void rerollField(npc, target.dataset.field as NpcFieldKey);
      if (action === "lock-field" && npc !== undefined && target.dataset.field !== undefined) toggleLock(npc, target.dataset.field as NpcFieldKey);
      if (action === "close-modal") { state.selectedNpcId = undefined; render(); }
    });
  });

  document.querySelectorAll<HTMLElement>("[data-variant]").forEach((button) => {
    button.addEventListener("click", () => void submitGenerate(false, false, button.dataset.variant));
  });

  const modalCard = document.querySelector("[data-modal-card]");
  if (modalCard !== null) {
    modalCard.addEventListener("click", (event) => event.stopPropagation());
  }
}

async function refreshChronicleStatusFromHealth(): Promise<void> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      state.chronicleStatus = "Dashboard API health check failed.";
      return;
    }
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "chronicleStatus" in payload) {
      const status = (payload as { chronicleStatus: unknown }).chronicleStatus;
      if (typeof status === "string" && status.trim().length > 0) {
        state.chronicleStatus = status;
      }
    }
  } catch {
    state.chronicleStatus = "Could not reach the dashboard API.";
  }
}

void refreshChronicleStatusFromHealth().then(() => render());
render();

import {
  GENDER_OPTIONS,
  parseGenerateImageResponse,
  parseGenerateNpcResponse,
  PC_RELATIONSHIP_OPTIONS,
  ROLE_OPTIONS,
  SPECIES_OPTIONS,
  THREAT_OPTIONS,
  TONE_OPTIONS,
  type GenerateNpcRequest,
  type GenerateNpcResponse,
  type Npc,
  type QuickTags
} from "../shared/npc.js";

type LockMap = Partial<Record<keyof Npc, boolean>>;
type NpcArrayField = "roleplay" | "mannerisms" | "sampleDialogue" | "notableDicePools" | "disciplines" | "sceneHooks";
type NpcStringField = Exclude<keyof Npc, NpcArrayField>;
type LocksByNpc = Record<string, LockMap>;
type GenerateOptions = { readonly multiples: boolean; readonly images: boolean; readonly direction?: string };

const state: {
  prompt: string;
  quickTags: QuickTags;
  npcs: Npc[];
  history: Npc[];
  locksByNpc: LocksByNpc;
  favoriteIds: string[];
  busyNpcIds: string[];
} = {
  prompt: "",
  quickTags: {
    species: "Mortal",
    gender: "Any",
    sceneRole: "Antagonistic",
    threatLevel: "Moderate",
    tone: "Gothic-punk",
    pcRelationship: "None specified"
  },
  npcs: [],
  history: [],
  locksByNpc: {},
  favoriteIds: [],
  busyNpcIds: []
};

const mutationDirections = ["Make more political", "Make more monstrous", "Make more sympathetic", "Tie harder to existing chronicle"] as const;

const requiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }

  return element as T;
};

const promptElement = requiredElement<HTMLTextAreaElement>("prompt");
const quickGrid = requiredElement<HTMLDivElement>("quick-grid");
const npcGrid = requiredElement<HTMLDivElement>("npc-grid");
const historyList = requiredElement<HTMLDivElement>("history-list");
const statusElement = requiredElement<HTMLDivElement>("status");
const modalRoot = requiredElement<HTMLDivElement>("modal-root");
const mutationRow = requiredElement<HTMLDivElement>("mutation-row");

const setStatus = (kind: "idle" | "loading" | "error" | "success", message: string): void => {
  statusElement.className = `status ${kind}`;
  statusElement.textContent = message;
};

const postJson = async (url: string, body: unknown): Promise<unknown> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const generateNpcRequest = async (request: GenerateNpcRequest): Promise<GenerateNpcResponse> => {
  return parseGenerateNpcResponse(await postJson("/api/npcs/generate", request));
};

const renderValue = (value: string | readonly string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value.join(" • ");
  }

  return typeof value === "string" ? value : "—";
};

const readStringField = (npc: Npc, field: keyof Npc): string | readonly string[] | undefined => npc[field];

const withOptionalImage = (npc: Npc, imageDataUrl: string | undefined): Npc => imageDataUrl ? { ...npc, imageDataUrl } : npc;

const buildGenerateRequest = (prompt: string, count: number, includeImages: boolean, quickTags: QuickTags, direction?: string): GenerateNpcRequest => {
  const base: GenerateNpcRequest = { prompt, count, includeImages, quickTags };
  return direction ? { ...base, direction } : base;
};

const replaceNpc = (updated: Npc): void => {
  state.npcs = state.npcs.map((npc) => npc.id === updated.id ? updated : npc);
  state.history = state.history.map((npc) => npc.id === updated.id ? updated : npc);
  render();
};

const toggleLock = (npcId: string, field: keyof Npc): void => {
  const current = state.locksByNpc[npcId] ?? {};
  state.locksByNpc[npcId] = { ...current, [field]: !current[field] };
  render();
};

const toggleFavorite = (npcId: string): void => {
  state.favoriteIds = state.favoriteIds.includes(npcId) ? state.favoriteIds.filter((id) => id !== npcId) : [npcId, ...state.favoriteIds];
  render();
};

const withBusyNpc = async (npcId: string, task: () => Promise<void>): Promise<void> => {
  state.busyNpcIds = [...state.busyNpcIds, npcId];
  render();
  try {
    await task();
  } finally {
    state.busyNpcIds = state.busyNpcIds.filter((id) => id !== npcId);
    render();
  }
};

const generateImage = async (npc: Npc): Promise<void> => {
  await withBusyNpc(npc.id, async () => {
    const parsed = parseGenerateImageResponse(await postJson("/api/npcs/image", { npc }));
    replaceNpc(withOptionalImage(npc, parsed.imageDataUrl));
  });
};

const rerollField = async (npc: Npc, field: keyof Npc): Promise<void> => {
  await withBusyNpc(npc.id, async () => {
    const payload = await postJson("/api/npcs/reroll-field", { npc, field, prompt: state.prompt || "live table NPC", quickTags: state.quickTags });
    if (typeof payload !== "object" || payload === null || !("npc" in payload)) {
      throw new Error("Field reroll response did not include an NPC.");
    }

    replaceNpc(parseNpcFromUnknown(payload.npc));
  });
};

const mergeLockedFields = (oldNpc: Npc, newNpc: Npc, locks: LockMap): Npc => ({
  ...newNpc,
  id: oldNpc.id,
  ...(oldNpc.imageDataUrl ? { imageDataUrl: oldNpc.imageDataUrl } : {}),
  name: locks.name ? oldNpc.name : newNpc.name,
  species: locks.species ? oldNpc.species : newNpc.species,
  ageGender: locks.ageGender ? oldNpc.ageGender : newNpc.ageGender,
  apparentAge: locks.apparentAge ? oldNpc.apparentAge : newNpc.apparentAge,
  description: locks.description ? oldNpc.description : newNpc.description,
  overview: locks.overview ? oldNpc.overview : newNpc.overview,
  roleplay: locks.roleplay ? oldNpc.roleplay : newNpc.roleplay,
  publicFace: locks.publicFace ? oldNpc.publicFace : newNpc.publicFace,
  privateNeed: locks.privateNeed ? oldNpc.privateNeed : newNpc.privateNeed,
  immediateWant: locks.immediateWant ? oldNpc.immediateWant : newNpc.immediateWant,
  fear: locks.fear ? oldNpc.fear : newNpc.fear,
  secret: locks.secret ? oldNpc.secret : newNpc.secret,
  leverageOverThem: locks.leverageOverThem ? oldNpc.leverageOverThem : newNpc.leverageOverThem,
  leverageTheyHold: locks.leverageTheyHold ? oldNpc.leverageTheyHold : newNpc.leverageTheyHold,
  chronicleRelationships: locks.chronicleRelationships ? oldNpc.chronicleRelationships : newNpc.chronicleRelationships,
  mannerisms: locks.mannerisms ? oldNpc.mannerisms : newNpc.mannerisms,
  voiceCadence: locks.voiceCadence ? oldNpc.voiceCadence : newNpc.voiceCadence,
  sampleDialogue: locks.sampleDialogue ? oldNpc.sampleDialogue : newNpc.sampleDialogue,
  notableDicePools: locks.notableDicePools ? oldNpc.notableDicePools : newNpc.notableDicePools,
  disciplines: locks.disciplines ? oldNpc.disciplines : newNpc.disciplines,
  tactics: locks.tactics ? oldNpc.tactics : newNpc.tactics,
  escapePlan: locks.escapePlan ? oldNpc.escapePlan : newNpc.escapePlan,
  masqueradeRisk: locks.masqueradeRisk ? oldNpc.masqueradeRisk : newNpc.masqueradeRisk,
  sceneHooks: locks.sceneHooks ? oldNpc.sceneHooks : newNpc.sceneHooks,
  storytellerNotes: locks.storytellerNotes ? oldNpc.storytellerNotes : newNpc.storytellerNotes,
  imagePrompt: locks.imagePrompt ? oldNpc.imagePrompt : newNpc.imagePrompt
});

const parseNpcFromUnknown = (value: unknown): Npc => parseGenerateNpcResponse({ npcs: [value], chronicleContextUsed: false, chronicleContextFiles: [], chronicleStatus: "" }).npcs[0] ?? (() => { throw new Error("NPC parse failed."); })();

const generate = async (options: GenerateOptions): Promise<void> => {
  state.prompt = promptElement.value.trim();
  if (!state.prompt) {
    setStatus("error", "Type a prompt or keywords first.");
    return;
  }

  setStatus("loading", "Generating NPC text…");
  try {
    const result = await generateNpcRequest(buildGenerateRequest(state.prompt, options.multiples ? 3 : 1, options.images, state.quickTags, options.direction));
    state.npcs = [...result.npcs];
    state.history = [...result.npcs, ...state.history].slice(0, 30);
    setStatus("success", result.chronicleStatus.length > 0 ? result.chronicleStatus : (result.chronicleContextUsed ? "Generated with vector-store chronicle context." : "Generated without chronicle context."));
    render();

    if (options.images) {
      for (const npc of result.npcs) {
        void generateImage(npc).catch((error: unknown) => setStatus("error", error instanceof Error ? error.message : "Image generation failed."));
      }
    }
  } catch (error: unknown) {
    setStatus("error", error instanceof Error ? error.message : "Generation failed.");
  }
};

const rerollUnlocked = async (direction?: string): Promise<void> => {
  if (state.npcs.length === 0) {
    return;
  }

  setStatus("loading", "Mass-rerolling unlocked fields…");
  try {
    const result = await generateNpcRequest(buildGenerateRequest(state.prompt || "refresh these NPCs", state.npcs.length, false, state.quickTags, direction));
    const fallback = result.npcs[0];
    if (!fallback) {
      throw new Error("No NPCs returned for reroll.");
    }

    state.npcs = state.npcs.map((npc, index) => mergeLockedFields(npc, result.npcs[index] ?? fallback, state.locksByNpc[npc.id] ?? {}));
    state.history = [...state.npcs, ...state.history].slice(0, 30);
    setStatus("success", "Unlocked fields rerolled.");
    render();
  } catch (error: unknown) {
    setStatus("error", error instanceof Error ? error.message : "Mass reroll failed.");
  }
};

const createSelect = (label: string, field: keyof QuickTags, options: readonly string[]): HTMLElement => {
  const wrapper = document.createElement("label");
  wrapper.className = "select-control";
  const span = document.createElement("span");
  span.textContent = label;
  const select = document.createElement("select");
  select.value = state.quickTags[field];
  for (const option of options) {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.textContent = option;
    select.append(optionElement);
  }
  select.addEventListener("change", () => {
    state.quickTags = { ...state.quickTags, [field]: select.value };
  });
  wrapper.append(span, select);
  return wrapper;
};

const appendFieldRow = (container: HTMLElement, npc: Npc, label: string, field: keyof Npc): void => {
  const row = document.createElement("div");
  row.className = "field-row";
  const actions = document.createElement("div");
  actions.className = "field-actions";
  const locks = state.locksByNpc[npc.id] ?? {};
  const busy = state.busyNpcIds.includes(npc.id);
  const reroll = document.createElement("button");
  reroll.className = "micro";
  reroll.type = "button";
  reroll.textContent = "REROLL";
  reroll.disabled = busy || Boolean(locks[field]);
  reroll.addEventListener("click", () => void rerollField(npc, field).catch((error: unknown) => setStatus("error", error instanceof Error ? error.message : "Field reroll failed.")));
  const lock = document.createElement("button");
  lock.className = locks[field] ? "micro lock active" : "micro lock";
  lock.type = "button";
  lock.textContent = "LOCK";
  lock.addEventListener("click", () => toggleLock(npc.id, field));
  actions.append(reroll, lock);
  const copy = document.createElement("div");
  copy.className = "field-copy";
  const name = document.createElement("span");
  name.textContent = label;
  const value = document.createElement("p");
  value.textContent = renderValue(readStringField(npc, field));
  copy.append(name, value);
  row.append(actions, copy);
  container.append(row);
};

const openModal = (npc: Npc): void => {
  modalRoot.innerHTML = "";
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  const card = document.createElement("div");
  card.className = "modal-card";
  const header = document.createElement("header");
  header.className = "modal-header";
  const titleWrap = document.createElement("div");
  const modalEyebrow = document.createElement("p");
  modalEyebrow.className = "eyebrow";
  modalEyebrow.textContent = "Screen-pin export card";
  const modalTitle = document.createElement("h2");
  modalTitle.textContent = npc.name;
  const modalMeta = document.createElement("p");
  modalMeta.textContent = `${npc.species} / ${npc.ageGender} / Apparent: ${npc.apparentAge}`;
  titleWrap.append(modalEyebrow, modalTitle, modalMeta);
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "CLOSE";
  close.addEventListener("click", () => modalRoot.innerHTML = "");
  header.append(titleWrap, close);
  const body = document.createElement("div");
  body.className = "modal-body";
  if (npc.imageDataUrl) {
    const image = document.createElement("img");
    image.className = "modal-image";
    image.src = npc.imageDataUrl;
    image.alt = `Portrait of ${npc.name}`;
    body.append(image);
  }
  const grid = document.createElement("div");
  grid.className = "modal-grid";
  const details: readonly [string, string | readonly string[]][] = [
    ["Description", npc.description], ["Overview", npc.overview], ["Public face", npc.publicFace], ["Private need", npc.privateNeed], ["Immediate want", npc.immediateWant], ["Fear", npc.fear], ["Secret", npc.secret], ["Leverage over them", npc.leverageOverThem], ["Leverage they hold", npc.leverageTheyHold], ["Chronicle relationships", npc.chronicleRelationships], ["Roleplay", npc.roleplay], ["Mannerisms", npc.mannerisms], ["Voice/cadence", npc.voiceCadence], ["Dialogue", npc.sampleDialogue], ["Dice pools", npc.notableDicePools], ["Disciplines/signature uses", npc.disciplines], ["Tactics", npc.tactics], ["Escape plan", npc.escapePlan], ["Masquerade risk", npc.masqueradeRisk], ["Scene hooks", npc.sceneHooks], ["Storyteller-only notes", npc.storytellerNotes]
  ];
  for (const [title, detail] of details) {
    const section = document.createElement("section");
    section.className = "modal-detail";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const copy = document.createElement(Array.isArray(detail) ? "ul" : "p");
    if (Array.isArray(detail)) {
      for (const item of detail) {
        const li = document.createElement("li");
        li.textContent = item;
        copy.append(li);
      }
    } else if (typeof detail === "string") {
      copy.textContent = detail;
    }
    section.append(heading, copy);
    grid.append(section);
  }
  body.append(grid);
  card.append(header, body);
  backdrop.append(card);
  modalRoot.append(backdrop);
};

const renderNpcCard = (npc: Npc): HTMLElement => {
  const article = document.createElement("article");
  article.className = state.favoriteIds.includes(npc.id) ? "npc-card favorite" : "npc-card";
  const header = document.createElement("header");
  header.className = "npc-card-header";
  const title = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `${npc.species} / ${npc.ageGender}`;
  const heading = document.createElement("h2");
  heading.textContent = npc.name;
  title.append(eyebrow, heading);
  const buttons = document.createElement("div");
  buttons.className = "card-buttons";
  const pin = document.createElement("button");
  pin.type = "button";
  pin.textContent = state.favoriteIds.includes(npc.id) ? "PINNED" : "PIN";
  pin.addEventListener("click", () => toggleFavorite(npc.id));
  const full = document.createElement("button");
  full.type = "button";
  full.textContent = "FULL CARD";
  full.addEventListener("click", () => openModal(npc));
  buttons.append(pin, full);
  header.append(title, buttons);
  article.append(header);

  if (npc.imageDataUrl) {
    const image = document.createElement("img");
    image.className = "npc-image";
    image.src = npc.imageDataUrl;
    image.alt = `Portrait of ${npc.name}`;
    article.append(image);
  } else {
    const imageButton = document.createElement("button");
    imageButton.className = "image-button";
    imageButton.type = "button";
    imageButton.disabled = state.busyNpcIds.includes(npc.id);
    imageButton.textContent = "GENERATE IMAGE";
    imageButton.addEventListener("click", () => void generateImage(npc).catch((error: unknown) => setStatus("error", error instanceof Error ? error.message : "Image generation failed.")));
    article.append(imageButton);
  }

  const overview = document.createElement("p");
  overview.className = "overview";
  overview.textContent = npc.overview;
  article.append(overview);
  appendFieldRow(article, npc, "Want", "immediateWant");
  appendFieldRow(article, npc, "Secret", "secret");
  appendFieldRow(article, npc, "Leverage", "leverageTheyHold");
  appendFieldRow(article, npc, "Roleplay", "roleplay");
  appendFieldRow(article, npc, "Dice", "notableDicePools");
  return article;
};

const render = (): void => {
  npcGrid.replaceChildren(...state.npcs.map(renderNpcCard));
  if (state.history.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No generated NPCs yet.";
    historyList.replaceChildren(empty);
  } else {
    historyList.replaceChildren(...state.history.map((npc) => {
      const button = document.createElement("button");
      button.type = "button";
      const name = document.createElement("strong");
      name.textContent = npc.name;
      const meta = document.createElement("span");
      meta.textContent = `${npc.species} / ${npc.immediateWant}`;
      button.append(name, meta);
      button.addEventListener("click", () => openModal(npc));
      return button;
    }));
  }
};

quickGrid.append(
  createSelect("Species", "species", SPECIES_OPTIONS),
  createSelect("Gender", "gender", GENDER_OPTIONS),
  createSelect("Scene role", "sceneRole", ROLE_OPTIONS),
  createSelect("Threat", "threatLevel", THREAT_OPTIONS),
  createSelect("Tone", "tone", TONE_OPTIONS),
  createSelect("PC tie", "pcRelationship", PC_RELATIONSHIP_OPTIONS)
);
mutationRow.append(...mutationDirections.map((direction) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = direction;
  button.addEventListener("click", () => void rerollUnlocked(direction));
  return button;
}));
const rerollAll = document.createElement("button");
rerollAll.type = "button";
rerollAll.textContent = "REROLL ALL UNLOCKED";
rerollAll.addEventListener("click", () => void rerollUnlocked());
mutationRow.append(rerollAll);

requiredElement<HTMLButtonElement>("generate-one").addEventListener("click", () => void generate({ multiples: false, images: false }));
requiredElement<HTMLButtonElement>("generate-many").addEventListener("click", () => void generate({ multiples: true, images: false }));
requiredElement<HTMLButtonElement>("generate-image").addEventListener("click", () => void generate({ multiples: false, images: true }));
requiredElement<HTMLButtonElement>("generate-many-image").addEventListener("click", () => void generate({ multiples: true, images: true }));
promptElement.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  void generate({ multiples: event.shiftKey, images: event.ctrlKey });
});

const refreshChronicleStatusFromHealth = async (): Promise<void> => {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      setStatus("error", "Dashboard API health check failed.");
      return;
    }
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "chronicleStatus" in payload) {
      const status = (payload as { chronicleStatus: unknown }).chronicleStatus;
      if (typeof status === "string" && status.trim().length > 0) {
        setStatus("idle", status);
      }
    }
  } catch {
    setStatus("error", "Could not reach the dashboard API.");
  }
};

void refreshChronicleStatusFromHealth();
render();

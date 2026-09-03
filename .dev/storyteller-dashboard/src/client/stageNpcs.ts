const SAVED_TAGS_KEY = "tr-dashboard-saved-search-tags";

type GenericNpc = {
  readonly filename: string;
  readonly label: string;
  readonly key: string;
  readonly tags: string;
  readonly searchText: string;
};

type CatalogResponse = {
  readonly npcs?: readonly {
    readonly filename: string;
    readonly label: string;
    readonly key: string;
    readonly tags: string;
  }[];
  readonly error?: string;
};

const requiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
};

const splitTerms = (query: string): string[] => query.trim().split(/\s+/).filter(Boolean);

const withSearchText = (npc: { filename: string; label: string; key: string; tags: string }): GenericNpc => ({
  ...npc,
  searchText: [npc.label, npc.tags, npc.key, npc.filename].join(" ").toLowerCase()
});

const matchesQuery = (npc: GenericNpc, query: string): boolean => {
  const terms = splitTerms(query).map((term) => term.toLowerCase());
  if (terms.length === 0) {
    return true;
  }
  return terms.every((term) => npc.searchText.includes(term));
};

const sortTags = (tags: readonly string[]): string[] =>
  [...tags].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

const loadSavedTags = (): string[] => {
  try {
    const raw = window.localStorage.getItem(SAVED_TAGS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return sortTags(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()));
  } catch {
    return [];
  }
};

const persistSavedTags = (tags: readonly string[]): void => {
  window.localStorage.setItem(SAVED_TAGS_KEY, JSON.stringify(sortTags(tags)));
};

const queryHasTerm = (query: string, tag: string): boolean =>
  splitTerms(query).some((term) => term.toLowerCase() === tag.toLowerCase());

const toggleTermInQuery = (query: string, tag: string): string => {
  const terms = splitTerms(query);
  if (terms.some((term) => term.toLowerCase() === tag.toLowerCase())) {
    return terms.filter((term) => term.toLowerCase() !== tag.toLowerCase()).join(" ");
  }
  return [...terms, tag].join(" ");
};

const mergeSavedTags = (existing: readonly string[], incoming: readonly string[]): string[] => {
  const byLower = new Map<string, string>();
  for (const tag of existing) {
    byLower.set(tag.toLowerCase(), tag);
  }
  for (const tag of incoming) {
    const key = tag.toLowerCase();
    if (!byLower.has(key)) {
      byLower.set(key, tag);
    }
  }
  return sortTags([...byLower.values()]);
};

export const initStageNpcs = async (): Promise<void> => {
  const search = requiredElement<HTMLInputElement>("generic-npc-search");
  const saveTagsButton = requiredElement<HTMLButtonElement>("generic-npc-save-tags");
  const savedTagsList = requiredElement<HTMLDivElement>("saved-tags-list");
  const grid = requiredElement<HTMLDivElement>("generic-npc-grid");
  const previewImage = requiredElement<HTMLImageElement>("generic-npc-preview-image");
  const previewEmpty = requiredElement<HTMLParagraphElement>("generic-npc-preview-empty");
  const previewLabel = requiredElement<HTMLParagraphElement>("generic-npc-preview-label");
  const queueList = requiredElement<HTMLDivElement>("generic-npc-queue-list");
  const queueCount = requiredElement<HTMLSpanElement>("generic-npc-queue-count");
  const copyButton = requiredElement<HTMLButtonElement>("generic-npc-copy");
  const clearButton = requiredElement<HTMLButtonElement>("generic-npc-clear");
  const status = requiredElement<HTMLDivElement>("generic-npc-status");

  let allNpcs: GenericNpc[] = [];
  let selectedKeys: string[] = [];
  let savedTags = loadSavedTags();

  const setStatus = (kind: "idle" | "loading" | "error" | "success", message: string): void => {
    status.className = `status ${kind}`;
    status.textContent = message;
  };

  const selectedNpcs = (): GenericNpc[] =>
    selectedKeys.map((key) => allNpcs.find((npc) => npc.key === key)).filter((npc): npc is GenericNpc => npc !== undefined);

  const showPreview = (npc: GenericNpc): void => {
    previewImage.src = `/generic-npc-images/${encodeURIComponent(npc.filename)}`;
    previewImage.alt = npc.label;
    previewImage.hidden = false;
    previewEmpty.hidden = true;
    previewLabel.hidden = false;
    previewLabel.textContent = npc.label;
  };

  const toggleKey = (key: string): void => {
    selectedKeys = selectedKeys.includes(key) ? selectedKeys.filter((item) => item !== key) : [...selectedKeys, key];
    render();
  };

  const renderSavedTags = (): void => {
    if (savedTags.length === 0) {
      const empty = document.createElement("p");
      empty.className = "saved-tags-empty";
      empty.textContent = "Saved tags";
      savedTagsList.replaceChildren(empty);
      return;
    }

    savedTagsList.replaceChildren(...savedTags.map((tag) => {
      const active = queryHasTerm(search.value, tag);
      const button = document.createElement("button");
      button.type = "button";
      button.className = active ? "saved-tag lock active" : "saved-tag";
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.textContent = tag;
      button.addEventListener("click", () => {
        search.value = toggleTermInQuery(search.value, tag);
        render();
      });
      return button;
    }));
  };

  const renderGrid = (): void => {
    const matches = allNpcs.filter((npc) => matchesQuery(npc, search.value));
    if (matches.length === 0) {
      const empty = document.createElement("p");
      empty.className = "overview";
      empty.textContent = allNpcs.length === 0 ? "No generic NPC catalog loaded." : "No matching NPCs.";
      grid.replaceChildren(empty);
      return;
    }

    grid.replaceChildren(...matches.map((npc) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = selectedKeys.includes(npc.key) ? "generic-npc-tile lock active" : "generic-npc-tile";
      button.setAttribute("aria-pressed", selectedKeys.includes(npc.key) ? "true" : "false");
      const wrap = document.createElement("span");
      wrap.className = "generic-npc-thumb";
      const image = document.createElement("img");
      image.src = `/generic-npc-images/${encodeURIComponent(npc.filename)}`;
      image.alt = npc.label;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        wrap.textContent = "Image missing";
        console.warn(`Generic NPC image missing: ${npc.filename}`);
      });
      wrap.append(image);
      const label = document.createElement("span");
      label.className = "generic-npc-label";
      label.textContent = npc.label;
      button.append(wrap, label);
      button.addEventListener("click", () => toggleKey(npc.key));
      button.addEventListener("mouseenter", () => showPreview(npc));
      button.addEventListener("focus", () => showPreview(npc));
      return button;
    }));
  };

  const renderQueue = (): void => {
    const queued = selectedNpcs();
    queueCount.textContent = queued.length === 0 ? "No NPCs selected" : `Selected: ${queued.length}`;
    copyButton.disabled = queued.length === 0;
    clearButton.disabled = queued.length === 0;
    if (queued.length === 0) {
      queueList.replaceChildren();
      return;
    }

    queueList.replaceChildren(...queued.map((npc) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "generic-npc-chip";
      chip.textContent = `${npc.label} ×`;
      chip.addEventListener("click", () => toggleKey(npc.key));
      chip.addEventListener("mouseenter", () => showPreview(npc));
      return chip;
    }));
  };

  const render = (): void => {
    renderSavedTags();
    renderGrid();
    renderQueue();
  };

  search.addEventListener("input", () => render());
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = "";
      render();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return;
    }
    event.preventDefault();
    search.focus();
  });
  saveTagsButton.addEventListener("click", () => {
    const terms = splitTerms(search.value);
    if (terms.length === 0) {
      setStatus("error", "Type search terms before saving them as tags.");
      return;
    }
    savedTags = mergeSavedTags(savedTags, terms);
    persistSavedTags(savedTags);
    setStatus("success", `Saved ${terms.length} tag${terms.length === 1 ? "" : "s"}.`);
    render();
  });
  clearButton.addEventListener("click", () => {
    selectedKeys = [];
    render();
  });
  copyButton.addEventListener("click", () => {
    const queued = selectedNpcs();
    if (queued.length === 0) {
      return;
    }
    void navigator.clipboard.writeText(queued.map((npc) => npc.key).join(",")).then(() => {
      const previous = copyButton.textContent;
      copyButton.textContent = "Copied!";
      setStatus("success", `Copied ${queued.length} NPC keys`);
      window.setTimeout(() => {
        copyButton.textContent = previous;
      }, 1000);
    });
  });

  setStatus("loading", "Loading generic NPC catalog…");
  try {
    const response = await fetch("/api/generic-npcs");
    const payload = await response.json() as CatalogResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? `Catalog request failed (${response.status})`);
    }
    allNpcs = (payload.npcs ?? []).map(withSearchText);
    const seen = new Set<string>();
    for (const npc of allNpcs) {
      if (seen.has(npc.key)) {
        console.warn(`Duplicate NPC key: ${npc.key}`);
      }
      seen.add(npc.key);
    }
    setStatus("idle", `${allNpcs.length} generic NPCs.`);
    render();
    search.focus();
  } catch (error: unknown) {
    setStatus("error", error instanceof Error ? error.message : "Could not load generic NPCs.");
    render();
  }
};

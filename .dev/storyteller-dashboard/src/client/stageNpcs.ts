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

const withSearchText = (npc: { filename: string; label: string; key: string; tags: string }): GenericNpc => ({
  ...npc,
  searchText: [npc.label, npc.tags, npc.key, npc.filename].join(" ").toLowerCase()
});

const matchesQuery = (npc: GenericNpc, query: string): boolean => {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  return terms.every((term) => npc.searchText.includes(term));
};

export const initStageNpcs = async (): Promise<void> => {
  const search = requiredElement<HTMLInputElement>("generic-npc-search");
  const grid = requiredElement<HTMLDivElement>("generic-npc-grid");
  const queueList = requiredElement<HTMLDivElement>("generic-npc-queue-list");
  const queueCount = requiredElement<HTMLSpanElement>("generic-npc-queue-count");
  const copyButton = requiredElement<HTMLButtonElement>("generic-npc-copy");
  const clearButton = requiredElement<HTMLButtonElement>("generic-npc-clear");
  const status = requiredElement<HTMLDivElement>("generic-npc-status");

  let allNpcs: GenericNpc[] = [];
  let selectedKeys: string[] = [];

  const setStatus = (kind: "idle" | "loading" | "error" | "success", message: string): void => {
    status.className = `status ${kind}`;
    status.textContent = message;
  };

  const selectedNpcs = (): GenericNpc[] =>
    selectedKeys.map((key) => allNpcs.find((npc) => npc.key === key)).filter((npc): npc is GenericNpc => npc !== undefined);

  const toggleKey = (key: string): void => {
    selectedKeys = selectedKeys.includes(key) ? selectedKeys.filter((item) => item !== key) : [...selectedKeys, key];
    render();
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
      return chip;
    }));
  };

  const render = (): void => {
    renderGrid();
    renderQueue();
  };

  search.addEventListener("input", () => renderGrid());
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = "";
      renderGrid();
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

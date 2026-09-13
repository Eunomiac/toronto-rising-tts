import { relocatePolarFamily } from "./scenes/groupRelocate.js";
import {
  boardUvFromEvent,
  buildImportPayload,
  characterLabel,
  createDefaultDraft,
  cutoutUrl,
  nearestPolarSnap,
  nearestSeatSnap,
  parseControlBoardSnaps,
  parseSceneCatalogs,
  PC_BY_COLOR
} from "./scenes/payload.js";
import type {
  ControlBoardSnaps,
  NpcLightMode,
  SceneCatalogs,
  SceneDraft
} from "./scenes/types.js";

const DRAFT_KEY = "tr-dashboard-scenes-draft";

type BridgeStatus = {
  readonly usable: boolean;
  readonly message: string;
};

const requiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
};

const luaLongString = (value: string): string => {
  let n = 0;
  while (value.includes(`]${"=".repeat(n)}]`)) {
    n += 1;
  }
  const eq = "=".repeat(n);
  return `[${eq}[${value}]${eq}]`;
};

const cssTop = (v: number): string => `${((1 - v) * 100).toFixed(4)}%`;
const cssLeft = (u: number): string => `${(u * 100).toFixed(4)}%`;

export const initScenesTab = (): void => {
  const status = requiredElement<HTMLDivElement>("scenes-status");
  const bridgeStatus = requiredElement<HTMLDivElement>("scenes-bridge-status");
  const boardImg = requiredElement<HTMLImageElement>("scenes-board-img");
  const overlay = requiredElement<HTMLDivElement>("scenes-board-overlay");
  const palette = requiredElement<HTMLDivElement>("scenes-palette-list");
  const modalRoot = requiredElement<HTMLDivElement>("modal-root");
  const importButton = requiredElement<HTMLButtonElement>("scenes-import");
  const copyButton = requiredElement<HTMLButtonElement>("scenes-copy");
  const tableChips = requiredElement<HTMLDivElement>("scenes-table-chips");

  let catalogs: SceneCatalogs | null = null;
  let snaps: ControlBoardSnaps | null = null;
  let draft: SceneDraft | null = null;
  let bridgeUsable = false;
  let missingCutouts = new Set<string>();
  let dragKind: "token" | "family" | null = null;
  let dragKey = "";

  const setStatus = (kind: "idle" | "loading" | "error" | "success", message: string): void => {
    status.className = `status ${kind}`;
    status.textContent = message;
  };

  const persist = (): void => {
    if (draft) {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  };

  const namedByKey = (): Map<string, SceneCatalogs["namedNpcs"][number]> => {
    const map = new Map<string, SceneCatalogs["namedNpcs"][number]>();
    if (!catalogs) {
      return map;
    }
    for (const npc of catalogs.namedNpcs) {
      map.set(npc.characterKey, npc);
    }
    return map;
  };

  const tokenFrame = (lit: boolean): string =>
    lit ? "/scenes-assets/tokenFrameLit.webp" : "/scenes-assets/tokenFrameUnlit.webp";

  const markCutoutError = (characterKey: string): void => {
    missingCutouts.add(characterKey);
    setStatus("error", `Missing cutout: assets/images/NPCs/Catalogued/${characterKey}.webp`);
  };

  const makeToken = (characterKey: string, lit: boolean, extraClass = ""): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `scenes-token ${extraClass}`.trim();
    button.draggable = true;
    button.dataset.characterKey = characterKey;
    const cutout = document.createElement("img");
    cutout.className = "scenes-token-cutout";
    cutout.alt = characterKey;
    cutout.src = cutoutUrl(characterKey);
    cutout.addEventListener("error", () => markCutoutError(characterKey));
    const frame = document.createElement("img");
    frame.className = "scenes-token-frame";
    frame.alt = "";
    frame.src = tokenFrame(lit);
    button.append(cutout, frame);
    button.addEventListener("dragstart", (event) => {
      dragKind = "token";
      dragKey = characterKey;
      event.dataTransfer?.setData("text/plain", characterKey);
    });
    return button;
  };

  const placeNpcOnPolar = (characterKey: string, snapIndex: number, light: NpcLightMode): void => {
    if (!draft) {
      return;
    }
    draft.standard.paletteNpcKeys = draft.standard.paletteNpcKeys.filter((key) => key !== characterKey);
    draft.standard.polar = draft.standard.polar.filter((token) => token.characterKey !== characterKey);
    const occupant = draft.standard.polar.find((token) => token.snapIndex === snapIndex);
    if (occupant) {
      draft.standard.paletteNpcKeys.push(occupant.characterKey);
      draft.standard.polar = draft.standard.polar.filter((token) => token.characterKey !== occupant.characterKey);
    }
    draft.standard.polar.push({ characterKey, snapIndex, npcLightMode: light });
    for (const npcSeat of catalogs?.npcSeats ?? []) {
      const row = draft.standard.seatSlots[npcSeat];
      if (row && row.characterKey === characterKey) {
        row.isPresent = false;
      }
    }
  };

  const placeOnSeat = (characterKey: string, seatKey: string): void => {
    if (!draft || !catalogs || !snaps) {
      return;
    }
    const seat = snaps.seats.find((row) => row.seatKey === seatKey);
    if (!seat) {
      return;
    }
    const isPcSeat = Boolean(PC_BY_COLOR[seatKey]);
    if (isPcSeat) {
    const currentDraft = draft;
    const sourceColor = catalogs.playerColors.find((color) => {
      const occupant = currentDraft.standard.seatSlots[color];
      return occupant?.characterKey === characterKey;
    });
      if (sourceColor && sourceColor !== seatKey) {
        const source = draft.standard.seatSlots[sourceColor];
        const dest = draft.standard.seatSlots[seatKey];
        if (source && dest) {
          const sourceSlot = source.tableSlot;
          const destSlot = dest.tableSlot;
          if (destSlot !== undefined) {
            source.tableSlot = destSlot;
          } else {
            delete source.tableSlot;
          }
          if (sourceSlot !== undefined) {
            dest.tableSlot = sourceSlot;
          } else {
            delete dest.tableSlot;
          }
        }
      }
      return;
    }
    draft.standard.paletteNpcKeys = draft.standard.paletteNpcKeys.filter((key) => key !== characterKey);
    for (const npcSeat of catalogs.npcSeats) {
      const row = draft.standard.seatSlots[npcSeat];
      if (row && row.characterKey === characterKey) {
        draft.standard.seatSlots[npcSeat] = { characterKey: "", isPlayingNPC: false, isPresent: false, slotEmpty: true };
      }
    }
    const dest = draft.standard.seatSlots[seatKey];
    if (dest && dest.slotEmpty !== true && dest.characterKey !== "" && dest.characterKey !== characterKey) {
      draft.standard.paletteNpcKeys.push(dest.characterKey);
    }
    const onStage = draft.standard.polar.some((token) => token.characterKey === characterKey);
    draft.standard.seatSlots[seatKey] = {
      characterKey,
      isPlayingNPC: false,
      isPresent: !onStage,
      tableSlot: seat.tableSlot,
      slotEmpty: false
    };
  };

  const renderChrome = (): void => {
    if (!draft || !catalogs) {
      return;
    }
    const current = draft;
    requiredElement<HTMLInputElement>("scenes-scene-key").value = current.sceneKey;
    requiredElement<HTMLInputElement>("scenes-title").value = current.title;
    requiredElement<HTMLButtonElement>("scenes-mode-standard").classList.toggle("lock", current.placementMode === "standard");
    requiredElement<HTMLButtonElement>("scenes-mode-standard").classList.toggle("active", current.placementMode === "standard");
    requiredElement<HTMLButtonElement>("scenes-mode-scatter").classList.toggle("lock", current.placementMode === "scatter");
    requiredElement<HTMLButtonElement>("scenes-mode-scatter").classList.toggle("active", current.placementMode === "scatter");
    tableChips.hidden = current.placementMode === "scatter";
    tableChips.replaceChildren();
    for (const table of catalogs.tables) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = table.key === current.tableKey ? "lock active" : "";
      chip.textContent = `${table.key} (${table.slotCapacity})`;
      chip.addEventListener("click", () => {
        if (!draft) {
          return;
        }
        draft.tableKey = table.key;
        persist();
        render();
      });
      tableChips.append(chip);
    }
    requiredElement<HTMLSelectElement>("scenes-lighting").value = current.lightingPresetKey;
    requiredElement<HTMLInputElement>("scenes-fog").checked = current.isTopFogActive;
    requiredElement<HTMLInputElement>("scenes-present-day").checked = current.clockPresentDay;
    const district = catalogs.districts.find((row) => row.key === current.districtKey);
    const site = catalogs.sites.find((row) => row.key === current.siteKey);
    requiredElement<HTMLButtonElement>("scenes-district").textContent = district ? district.name : "District";
    requiredElement<HTMLButtonElement>("scenes-site").textContent = site ? site.name : "Site";
    const sky = catalogs.skyboxes.find((row) => row.key === current.skyboxOverride);
    requiredElement<HTMLButtonElement>("scenes-skybox").textContent = sky
      ? sky.display
      : current.skyboxOverride === "Generic"
        ? "Generic"
        : "Skybox";
    requiredElement<HTMLButtonElement>("scenes-sound").textContent = "Soundscape";
    requiredElement<HTMLButtonElement>("scenes-conditions").textContent =
      current.conditions.length > 0 ? `Conditions (${current.conditions.length})` : "Conditions";
  };

  const renderBoard = (): void => {
    if (!draft || !snaps || !catalogs) {
      return;
    }
    overlay.replaceChildren();
    const boardSnaps = snaps;
    const boardCatalogs = catalogs;
    boardImg.src = draft.placementMode === "scatter"
      ? "/scenes-assets/controlBoard_scatter.webp"
      : "/scenes-assets/controlBoard_standard.webp";

    if (draft.placementMode === "standard") {
      for (const token of draft.standard.polar) {
        const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
        if (!snap) {
          continue;
        }
        const el = makeToken(token.characterKey, token.npcLightMode !== "OFF");
        el.style.left = cssLeft(snap.u);
        el.style.top = cssTop(snap.v);
        el.title = characterLabel(boardCatalogs, token.characterKey);
        el.addEventListener("dblclick", () => {
          token.npcLightMode = token.npcLightMode === "OFF" ? "STANDARD" : "OFF";
          persist();
          render();
        });
        overlay.append(el);
      }
      const familyIds = new Set(boardSnaps.polar.map((snap) => snap.familyId));
      for (const familyId of familyIds) {
        const members = draft.standard.polar.filter((token) =>
          boardSnaps.polar.find((snap) => snap.snapIndex === token.snapIndex)?.familyId === familyId
        );
        if (members.length === 0) {
          continue;
        }
        const anchor = snaps.polar.find((snap) => snap.familyId === familyId && snap.isAnchor)
          ?? snaps.polar.find((snap) => snap.familyId === familyId);
        if (!anchor) {
          continue;
        }
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "scenes-family-handle";
        handle.draggable = true;
        handle.title = `Move group ${familyId}`;
        handle.style.left = cssLeft(anchor.u);
        handle.style.top = cssTop(anchor.v - 0.035);
        handle.addEventListener("dragstart", () => {
          dragKind = "family";
          dragKey = familyId;
        });
        overlay.append(handle);
      }
      for (const seat of snaps.seats) {
        const row = draft.standard.seatSlots[seat.seatKey];
        if (!row || row.slotEmpty === true || row.characterKey === "") {
          continue;
        }
        const lit = row.isPresent === true && row.absentFromSession !== true;
        const el = makeToken(row.characterKey, lit, "scenes-token-seat");
        el.style.left = cssLeft(seat.u);
        el.style.top = cssTop(seat.v);
        el.title = `${characterLabel(catalogs, row.characterKey)} — ${seat.seatKey}`;
        el.addEventListener("dblclick", () => {
          if (seat.kind === "pc") {
            row.isPresent = !row.isPresent;
          } else {
            row.isPresent = !row.isPresent;
          }
          persist();
          render();
        });
        overlay.append(el);
      }
    } else {
      for (const areaKey of snaps.scatter.areaOrder) {
        const area = draft.scatter.areas[areaKey];
        const layout = snaps.scatter.areas[areaKey];
        if (!area || !layout) {
          continue;
        }
        for (const [pcKey, row] of Object.entries(area.centerCharacters)) {
          const slot = layout.center.find((item) => item.slot === row.slot);
          if (!slot) {
            continue;
          }
          const displayKey = row.isPlayingNPC && row.characterKey ? row.characterKey : pcKey;
          const el = makeToken(displayKey, row.isPresent, "scenes-token-center");
          el.dataset.pcKey = pcKey;
          el.style.left = cssLeft(slot.u);
          el.style.top = cssTop(slot.v);
          el.addEventListener("dblclick", () => {
            row.isPresent = !row.isPresent;
            persist();
            render();
          });
          overlay.append(el);
        }
        for (const [npcKey, row] of Object.entries(area.orbitCharacters)) {
          const slot = layout.orbit.find((item) => item.slot === row.slot);
          if (!slot) {
            continue;
          }
          const el = makeToken(npcKey, row.npcLightMode !== "OFF");
          el.style.left = cssLeft(slot.u);
          el.style.top = cssTop(slot.v);
          el.addEventListener("dblclick", () => {
            row.npcLightMode = row.npcLightMode === "OFF" ? "STANDARD" : "OFF";
            persist();
            render();
          });
          overlay.append(el);
        }
      }
    }
  };

  const renderPalette = (): void => {
    if (!draft || !catalogs) {
      return;
    }
    palette.replaceChildren();
    const keys = draft.placementMode === "standard" ? draft.standard.paletteNpcKeys : draft.scatter.paletteNpcKeys;
    for (const key of keys) {
      const el = makeToken(key, true, "scenes-token-palette");
      el.title = characterLabel(catalogs, key);
      palette.append(el);
    }
  };

  const render = (): void => {
    renderChrome();
    renderBoard();
    renderPalette();
  };

  const usedNamedKeys = (): Set<string> => {
    const used = new Set<string>();
    if (!draft) {
      return used;
    }
    for (const token of draft.standard.polar) {
      used.add(token.characterKey);
    }
    for (const key of draft.standard.paletteNpcKeys) {
      used.add(key);
    }
    for (const [seatKey, row] of Object.entries(draft.standard.seatSlots)) {
      if (!PC_BY_COLOR[seatKey] && row.characterKey) {
        used.add(row.characterKey);
      }
      if (row.npcCharacterKey) {
        used.add(row.npcCharacterKey);
      }
    }
    for (const area of Object.values(draft.scatter.areas)) {
      for (const [npcKey] of Object.entries(area.orbitCharacters)) {
        used.add(npcKey);
      }
      for (const row of Object.values(area.centerCharacters)) {
        if (row.characterKey) {
          used.add(row.characterKey);
        }
      }
    }
    for (const key of draft.scatter.paletteNpcKeys) {
      used.add(key);
    }
    return used;
  };

  const openPickerModal = (
    title: string,
    renderBody: (root: HTMLDivElement) => void
  ): void => {
    modalRoot.innerHTML = "";
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const card = document.createElement("div");
    card.className = "modal-card";
    const header = document.createElement("div");
    header.className = "modal-header";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", () => {
      modalRoot.innerHTML = "";
    });
    header.append(heading, close);
    const body = document.createElement("div");
    body.className = "modal-body";
    renderBody(body);
    card.append(header, body);
    backdrop.append(card);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        modalRoot.innerHTML = "";
      }
    });
    modalRoot.append(backdrop);
  };

  const openNpcModal = (): void => {
    if (!catalogs || !draft) {
      return;
    }
    const groups = new Map<string, Array<SceneCatalogs["namedNpcs"][number]>>();
    for (const npc of catalogs.namedNpcs) {
      const tags = npc.pickerGroups.length > 0 ? npc.pickerGroups : ["Ungrouped"];
      for (const tag of tags) {
        const list = [...(groups.get(tag) ?? [])];
        list.push(npc);
        groups.set(tag, list);
      }
    }
    const groupNames = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    openPickerModal("Add NPCs", (root) => {
      const search = document.createElement("input");
      search.type = "search";
      search.placeholder = "Search NPCs…";
      const tabs = document.createElement("div");
      tabs.className = "scenes-modal-tabs";
      const grid = document.createElement("div");
      grid.className = "generic-npc-grid";
      let activeGroup = groupNames[0] ?? "Ungrouped";
      const used = usedNamedKeys();
      const paint = (): void => {
        grid.replaceChildren();
        const query = search.value.trim().toLowerCase();
        const list = (groups.get(activeGroup) ?? []).filter((npc) => {
          if (used.has(npc.characterKey)) {
            return false;
          }
          if (query === "") {
            return true;
          }
          return npc.fullName.toLowerCase().includes(query) || npc.characterKey.toLowerCase().includes(query);
        });
        for (const npc of list) {
          const tile = document.createElement("button");
          tile.type = "button";
          tile.className = "generic-npc-tile";
          const thumb = document.createElement("div");
          thumb.className = "generic-npc-thumb";
          const img = document.createElement("img");
          img.src = cutoutUrl(npc.characterKey);
          img.alt = npc.fullName;
          img.addEventListener("error", () => markCutoutError(npc.characterKey));
          thumb.append(img);
          const label = document.createElement("div");
          label.className = "generic-npc-label";
          label.textContent = npc.fullName;
          tile.append(thumb, label);
          tile.addEventListener("click", () => {
            if (!draft) {
              return;
            }
            if (draft.placementMode === "standard") {
              draft.standard.paletteNpcKeys.push(npc.characterKey);
            } else {
              draft.scatter.paletteNpcKeys.push(npc.characterKey);
            }
            persist();
            render();
            modalRoot.innerHTML = "";
          });
          grid.append(tile);
        }
      };
      for (const name of groupNames) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.textContent = name;
        tab.className = name === activeGroup ? "lock active" : "";
        tab.addEventListener("click", () => {
          activeGroup = name;
          for (const button of tabs.querySelectorAll("button")) {
            button.classList.toggle("lock", button === tab);
            button.classList.toggle("active", button === tab);
          }
          paint();
        });
        tabs.append(tab);
      }
      search.addEventListener("input", paint);
      root.append(search, tabs, grid);
      paint();
    });
  };

  const openSimpleListModal = (
    title: string,
    rows: readonly { key: string; label: string }[],
    onPick: (key: string) => void
  ): void => {
    openPickerModal(title, (root) => {
      const search = document.createElement("input");
      search.type = "search";
      search.placeholder = "Search…";
      const grid = document.createElement("div");
      grid.className = "scenes-chip-grid";
      const paint = (): void => {
        grid.replaceChildren();
        const query = search.value.trim().toLowerCase();
        for (const row of rows) {
          if (query !== "" && !row.label.toLowerCase().includes(query) && !row.key.toLowerCase().includes(query)) {
            continue;
          }
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = row.label;
          button.addEventListener("click", () => {
            onPick(row.key);
            modalRoot.innerHTML = "";
          });
          grid.append(button);
        }
      };
      search.addEventListener("input", paint);
      root.append(search, grid);
      paint();
    });
  };

  const handleBoardDrop = (event: DragEvent): void => {
    if (!draft || !snaps || !catalogs) {
      return;
    }
    const uv = boardUvFromEvent(overlay, event);
    if (!uv) {
      return;
    }
    event.preventDefault();
    if (draft.placementMode === "standard") {
      if (dragKind === "family") {
        const dest = nearestPolarSnap(snaps, uv.u, uv.v, 0.1);
        if (!dest) {
          setStatus("error", "Drop the group handle onto a polar pack.");
          return;
        }
        draft.standard.polar = relocatePolarFamily(draft.standard.polar, dragKey, dest.familyId, snaps);
        persist();
        render();
        return;
      }
      const seat = nearestSeatSnap(snaps, uv.u, uv.v, 0.055);
      const polar = nearestPolarSnap(snaps, uv.u, uv.v, 0.06);
      const isNpc = namedByKey().has(dragKey);
      if (seat && (!polar || Math.hypot(seat.u - uv.u, seat.v - uv.v) <= Math.hypot((polar?.u ?? 9) - uv.u, (polar?.v ?? 9) - uv.v))) {
        placeOnSeat(dragKey, seat.seatKey);
      } else if (polar && isNpc) {
        const existing = draft.standard.polar.find((token) => token.characterKey === dragKey);
        placeNpcOnPolar(dragKey, polar.snapIndex, existing?.npcLightMode ?? (polar.defaultLightMode === "STANDARD" ? "STANDARD" : "OFF"));
      } else if (polar && PC_BY_COLOR[Object.keys(PC_BY_COLOR).find((color) => PC_BY_COLOR[color] === dragKey) ?? ""]) {
        setStatus("error", "PCs sit on chairs, not on the polar stage.");
        return;
      }
      persist();
      render();
      return;
    }
    const isPc = catalogs.pcs.some((pc) => pc.characterKey === dragKey);
    let bestDist = 0.07;
    let best: { areaKey: string; kind: "center" | "orbit"; slot: number } | null = null;
    for (const areaKey of snaps.scatter.areaOrder) {
      const layout = snaps.scatter.areas[areaKey];
      if (!layout) {
        continue;
      }
      const slots = isPc ? layout.center : layout.orbit;
      const kind = isPc ? "center" as const : "orbit" as const;
      for (const slot of slots) {
        const dist = Math.hypot(slot.u - uv.u, slot.v - uv.v);
        if (dist < bestDist) {
          bestDist = dist;
          best = { areaKey, kind, slot: slot.slot };
        }
      }
    }
    if (!best) {
      setStatus("error", isPc ? "Drop PCs on a numbered center pentagon." : "Drop NPCs on an orbit slot.");
      return;
    }
    if (best.kind === "center") {
      for (const area of Object.values(draft.scatter.areas)) {
        delete area.centerCharacters[dragKey];
      }
      const area = draft.scatter.areas[best.areaKey];
      if (!area) {
        return;
      }
      for (const [pcKey, row] of Object.entries(area.centerCharacters)) {
        if (row.slot === best.slot) {
          delete area.centerCharacters[pcKey];
          break;
        }
      }
      area.centerCharacters[dragKey] = { slot: best.slot, isPlayingNPC: false, isPresent: true };
    } else {
      draft.scatter.paletteNpcKeys = draft.scatter.paletteNpcKeys.filter((key) => key !== dragKey);
      for (const area of Object.values(draft.scatter.areas)) {
        delete area.orbitCharacters[dragKey];
      }
      const area = draft.scatter.areas[best.areaKey];
      if (!area) {
        return;
      }
      for (const [npcKey, row] of Object.entries(area.orbitCharacters)) {
        if (row.slot === best.slot) {
          draft.scatter.paletteNpcKeys.push(npcKey);
          delete area.orbitCharacters[npcKey];
          break;
        }
      }
      area.orbitCharacters[dragKey] = { slot: best.slot, npcLightMode: "STANDARD" };
    }
    persist();
    render();
  };

  const copyJson = async (): Promise<void> => {
    if (!draft || !catalogs || !snaps) {
      return;
    }
    try {
      const payload = buildImportPayload(draft, catalogs, snaps);
      const text = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(text);
      setStatus("success", `Copied ${draft.placementMode} scene JSON for ${draft.sceneKey}.`);
    } catch (error: unknown) {
      setStatus("error", error instanceof Error ? error.message : "Could not build scene JSON.");
    }
  };

  const importInTts = async (): Promise<void> => {
    if (!draft || !catalogs || !snaps || !bridgeUsable) {
      return;
    }
    try {
      const payload = buildImportPayload(draft, catalogs, snaps);
      const script = `return GlobalImportSceneJson(${luaLongString(JSON.stringify(payload))})`;
      importButton.disabled = true;
      setStatus("loading", "Sending Import to TTS…");
      const response = await fetch("/api/tts/execute-lua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script })
      });
      const result = await response.json() as { error?: string; returnValue?: unknown; timedOut?: boolean };
      if (!response.ok || result.error) {
        throw new Error(result.error ?? `Import failed (${response.status})`);
      }
      if (result.timedOut) {
        throw new Error("TTS did not answer. Disable TTS Tools and keep External Editor on.");
      }
      setStatus("success", typeof result.returnValue === "string" ? result.returnValue : "Imported into the scene library.");
    } catch (error: unknown) {
      setStatus("error", error instanceof Error ? error.message : "Import in TTS failed.");
    } finally {
      importButton.disabled = !bridgeUsable;
    }
  };

  requiredElement<HTMLInputElement>("scenes-scene-key").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    draft.sceneKey = (event.target as HTMLInputElement).value;
    persist();
  });
  requiredElement<HTMLInputElement>("scenes-title").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    draft.title = (event.target as HTMLInputElement).value;
    persist();
  });
  requiredElement<HTMLButtonElement>("scenes-mode-standard").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    draft.placementMode = "standard";
    persist();
    render();
  });
  requiredElement<HTMLButtonElement>("scenes-mode-scatter").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    draft.placementMode = "scatter";
    persist();
    render();
  });
  requiredElement<HTMLSelectElement>("scenes-lighting").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.lightingPresetKey = (event.target as HTMLSelectElement).value;
    persist();
  });
  requiredElement<HTMLInputElement>("scenes-fog").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.isTopFogActive = (event.target as HTMLInputElement).checked;
    persist();
  });
  requiredElement<HTMLInputElement>("scenes-present-day").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.clockPresentDay = (event.target as HTMLInputElement).checked;
    persist();
  });
  requiredElement<HTMLButtonElement>("scenes-add-npcs").addEventListener("click", openNpcModal);
  requiredElement<HTMLButtonElement>("scenes-district").addEventListener("click", () => {
    if (!catalogs || !draft) {
      return;
    }
    openSimpleListModal(
      "District",
      catalogs.districts.map((row) => ({ key: row.key, label: row.name })),
      (key) => {
        if (!draft) {
          return;
        }
        draft.districtKey = key;
        persist();
        render();
      }
    );
  });
  requiredElement<HTMLButtonElement>("scenes-site").addEventListener("click", () => {
    if (!catalogs || !draft) {
      return;
    }
    const currentDraft = draft;
    const rows = catalogs.sites
      .filter((site) => currentDraft.districtKey === "" || site.districtKey === currentDraft.districtKey || site.districtKey === null)
      .map((site) => ({ key: site.key, label: site.name }));
    openSimpleListModal("Site", rows, (key) => {
      if (!draft || !catalogs) {
        return;
      }
      const site = catalogs.sites.find((row) => row.key === key);
      if (!site) {
        throw new Error(`Unknown site key ${key}.`);
      }
      draft.siteKey = site.key;
      if (site.districtKey) {
        draft.districtKey = site.districtKey;
      }
      if (site.lightMode) {
        draft.lightingPresetKey = site.lightMode;
      }
      if (site.topFog !== null) {
        draft.isTopFogActive = site.topFog;
      }
      if (site.skybox) {
        draft.skyboxOverride = site.skybox;
      }
      if (site.locationTrack) {
        draft.locationTrack = site.locationTrack;
      }
      persist();
      render();
    });
  });
  requiredElement<HTMLButtonElement>("scenes-skybox").addEventListener("click", () => {
    if (!catalogs || !draft) {
      return;
    }
    const rows = [
      { key: "", label: "(site default)" },
      { key: "Generic", label: "Generic" },
      ...catalogs.skyboxes.map((row) => ({ key: row.key, label: row.display }))
    ];
    openSimpleListModal("Skybox", rows, (key) => {
      if (!draft) {
        return;
      }
      draft.skyboxOverride = key;
      persist();
      render();
    });
  });
  requiredElement<HTMLButtonElement>("scenes-sound").addEventListener("click", () => {
    if (!catalogs || !draft) {
      return;
    }
    const loadedCatalogs = catalogs;
    const currentDraft = draft;
    openPickerModal("Soundscape", (root) => {
      const loc = document.createElement("select");
      loc.append(new Option("(none)", ""));
      for (const track of loadedCatalogs.locationTracks) {
        loc.append(new Option(track.key, track.key));
      }
      loc.value = currentDraft.locationTrack;
      const mood = document.createElement("select");
      mood.append(new Option("(none)", ""));
      for (const key of loadedCatalogs.backgroundMoods) {
        mood.append(new Option(key, key));
      }
      mood.value = currentDraft.backgroundMood;
      const weather = document.createElement("select");
      for (const row of loadedCatalogs.weatherConditions) {
        weather.append(new Option(row.label, row.key));
      }
      weather.value = currentDraft.weatherKey;
      const apply = document.createElement("button");
      apply.type = "button";
      apply.textContent = "Apply";
      apply.addEventListener("click", () => {
        if (!draft) {
          return;
        }
        draft.locationTrack = loc.value;
        draft.backgroundMood = mood.value;
        draft.weatherKey = weather.value;
        persist();
        render();
        modalRoot.innerHTML = "";
      });
      root.append(loc, mood, weather, apply);
    });
  });
  requiredElement<HTMLButtonElement>("scenes-conditions").addEventListener("click", () => {
    if (!catalogs || !draft) {
      return;
    }
    const loadedCatalogs = catalogs;
    const currentDraft = draft;
    openPickerModal("Conditions", (root) => {
      const selected = new Set(currentDraft.conditions);
      const grid = document.createElement("div");
      grid.className = "scenes-chip-grid";
      for (const cond of loadedCatalogs.conditions) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = cond.displayName;
        button.className = selected.has(cond.id) ? "lock active" : "";
        button.addEventListener("click", () => {
          if (selected.has(cond.id)) {
            selected.delete(cond.id);
            button.className = "";
          } else {
            selected.add(cond.id);
            button.className = "lock active";
          }
        });
        grid.append(button);
      }
      const apply = document.createElement("button");
      apply.type = "button";
      apply.textContent = "Apply";
      apply.addEventListener("click", () => {
        if (!draft) {
          return;
        }
        draft.conditions = [...selected];
        persist();
        render();
        modalRoot.innerHTML = "";
      });
      root.append(grid, apply);
    });
  });

  overlay.addEventListener("dragover", (event) => event.preventDefault());
  overlay.addEventListener("drop", handleBoardDrop);
  copyButton.addEventListener("click", () => void copyJson());
  importButton.addEventListener("click", () => void importInTts());

  const refreshBridge = async (): Promise<void> => {
    try {
      const response = await fetch("/api/tts-bridge-status");
      const payload = await response.json() as BridgeStatus & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Bridge status failed (${response.status})`);
      }
      bridgeUsable = payload.usable === true;
      importButton.disabled = !bridgeUsable;
      bridgeStatus.className = `status ${bridgeUsable ? "idle" : "error"}`;
      bridgeStatus.textContent = payload.message;
    } catch (error: unknown) {
      bridgeUsable = false;
      importButton.disabled = true;
      bridgeStatus.className = "status error";
      bridgeStatus.textContent = error instanceof Error ? error.message : "Could not check the TTS bridge.";
    }
  };

  void (async () => {
    try {
      const [catalogRes, snapRes] = await Promise.all([
        fetch("/api/scene-catalogs"),
        fetch("/api/control-board-snaps")
      ]);
      if (!catalogRes.ok || !snapRes.ok) {
        throw new Error("Could not load scene catalogs. Run npm run dashboard:scene-catalogs.");
      }
      catalogs = parseSceneCatalogs(await catalogRes.json());
      snaps = parseControlBoardSnaps(await snapRes.json());
      const lighting = requiredElement<HTMLSelectElement>("scenes-lighting");
      lighting.replaceChildren();
      for (const key of catalogs.lightModes) {
        lighting.append(new Option(key, key));
      }
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        draft = { ...createDefaultDraft(catalogs, snaps), ...(JSON.parse(saved) as SceneDraft) };
        draft.standard = { ...createDefaultDraft(catalogs, snaps).standard, ...draft.standard };
        draft.scatter = { ...createDefaultDraft(catalogs, snaps).scatter, ...draft.scatter };
      } else {
        draft = createDefaultDraft(catalogs, snaps);
      }
      setStatus("idle", "Ready. Drag tokens onto the board. Copy JSON or Import in TTS writes a library row only.");
      render();
    } catch (error: unknown) {
      setStatus("error", error instanceof Error ? error.message : "Scenes tab failed to load.");
    }
    await refreshBridge();
    window.setInterval(() => void refreshBridge(), 4000);
  })();
};

import { bindBoardDrag, gsap, killBoardDrags } from "./scenes/boardDrag.js";
import { relocatePolarFamily } from "./scenes/groupRelocate.js";
import {
  boardUvFromEvent,
  buildImportPayload,
  characterLabel,
  createDefaultDraft,
  cutoutUrl,
  familyLabelUv,
  polarAreaNameForFamily,
  tableChoiceIsSelected,
  tableChoiceKeys,
  nearestPolarSnap,
  nearestSeatSnap,
  parseControlBoardSnaps,
  parseSceneCatalogs,
  PC_BY_COLOR,
  sceneKeyFromTitle
} from "./scenes/payload.js";
import { initToasts } from "./scenes/toasts.js";
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const pad2 = (value: number): string => String(value).padStart(2, "0");

const formatClockTime = (hour: number, minute: number): string =>
  `${pad2(hour)}:${pad2(minute)}`;

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

export const initScenesTab = (): void => {
  const toasts = initToasts(requiredElement<HTMLDivElement>("scenes-toasts"));
  const bridgeStatus = requiredElement<HTMLDivElement>("scenes-bridge-status");
  const boardWrap = requiredElement<HTMLDivElement>("scenes-board-wrap");
  const boardFrame = requiredElement<HTMLDivElement>("scenes-board-frame");
  const boardImg = requiredElement<HTMLImageElement>("scenes-board-img");
  const overlay = requiredElement<HTMLDivElement>("scenes-board-overlay");
  const palette = requiredElement<HTMLDivElement>("scenes-palette-list");
  const dragLayer = requiredElement<HTMLDivElement>("scenes-drag-layer");
  const modalRoot = requiredElement<HTMLDivElement>("modal-root");
  const importButton = requiredElement<HTMLButtonElement>("scenes-import");
  const copyButton = requiredElement<HTMLButtonElement>("scenes-copy");
  const tableChips = requiredElement<HTMLDivElement>("scenes-table-chips");
  const tableRow = requiredElement<HTMLDivElement>("scenes-table-row");

  let catalogs: SceneCatalogs | null = null;
  let snaps: ControlBoardSnaps | null = null;
  let draft: SceneDraft | null = null;
  let bridgeUsable = false;
  let missingCutouts = new Set<string>();
  const ghostEls: HTMLElement[] = [];

  const setStatus = (kind: "idle" | "loading" | "error" | "success", message: string): void => {
    toasts.push(kind, message);
  };

  const clearGhosts = (): void => {
    while (ghostEls.length > 0) {
      ghostEls.pop()?.remove();
    }
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
    if (missingCutouts.has(characterKey)) {
      return;
    }
    missingCutouts.add(characterKey);
    setStatus("error", `Missing cutout: assets/images/NPCs/Catalogued/${characterKey}.webp`);
  };

  const layoutBoard = (): void => {
    const wrapRect = boardWrap.getBoundingClientRect();
    const naturalWidth = boardImg.naturalWidth;
    const naturalHeight = boardImg.naturalHeight;
    if (!naturalWidth || !naturalHeight || wrapRect.width < 8 || wrapRect.height < 8) {
      return;
    }
    const scale = Math.min(wrapRect.width / naturalWidth, wrapRect.height / naturalHeight);
    boardFrame.style.width = `${Math.floor(naturalWidth * scale)}px`;
    boardFrame.style.height = `${Math.floor(naturalHeight * scale)}px`;
  };

  const pickerGroupLabel = (groupKey: string): string => {
    const label = catalogs?.pickerGroupLabels?.[groupKey];
    if (label && label.trim() !== "") {
      return label;
    }
    return groupKey;
  };

  const clampClockDay = (): void => {
    if (!draft) {
      return;
    }
    const maxDay = daysInMonth(draft.clockYear, draft.clockMonth);
    if (draft.clockDay > maxDay) {
      draft.clockDay = maxDay;
    }
  };

  const makeToken = (characterKey: string, lit: boolean, extraClass = "", ghost = false): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `scenes-token ${extraClass}`.trim();
    button.dataset.characterKey = characterKey;
    const bg = document.createElement("span");
    bg.className = "scenes-token-bg";
    const cutout = document.createElement("img");
    cutout.className = "scenes-token-cutout";
    cutout.alt = characterKey;
    cutout.draggable = false;
    cutout.src = cutoutUrl(characterKey);
    if (!ghost) {
      cutout.addEventListener("error", () => markCutoutError(characterKey));
    }
    const frame = document.createElement("img");
    frame.className = "scenes-token-frame";
    frame.alt = "";
    frame.draggable = false;
    frame.src = tokenFrame(lit);
    button.append(bg, cutout, frame);
    return button;
  };

  const placeToken = (el: HTMLElement, u: number, v: number): void => {
    el.style.left = cssLeft(u);
    el.style.top = cssTop(v);
    gsap.set(el, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  };

  const applyBoardDrop = (clientX: number, clientY: number, dragKind: "token" | "family", dragKey: string): void => {
    if (!draft || !snaps || !catalogs) {
      return;
    }
    const uv = boardUvFromEvent(overlay, { clientX, clientY });
    if (!uv) {
      setStatus("error", "Drop tokens on the control board.");
      return;
    }
    if (draft.placementMode === "standard") {
      if (dragKind === "family") {
        const dest = nearestPolarSnap(snaps, uv.u, uv.v, 0.1);
        if (!dest) {
          setStatus("error", "Drop the group handle onto a polar pack.");
          return;
        }
        draft.standard.polar = relocatePolarFamily(draft.standard.polar, dragKey, dest.familyId, snaps);
        persist();
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
      } else if (polar && Object.values(PC_BY_COLOR).includes(dragKey)) {
        setStatus("error", "PCs sit on chairs, not on the polar stage.");
        return;
      }
      persist();
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
  };

  const showTokenGhost = (characterKey: string, extraClass: string, u: number, v: number): void => {
    const ghost = makeToken(characterKey, true, `${extraClass} scenes-token-ghost`.trim(), true);
    placeToken(ghost, u, v);
    overlay.append(ghost);
    ghostEls.push(ghost);
  };

  const paintTokenGhosts = (clientX: number, clientY: number, characterKey: string): void => {
    clearGhosts();
    if (!snaps || !draft) {
      return;
    }
    const uv = boardUvFromEvent(overlay, { clientX, clientY });
    if (!uv) {
      return;
    }
    if (draft.placementMode === "standard") {
      const seat = nearestSeatSnap(snaps, uv.u, uv.v, 0.09);
      const polar = nearestPolarSnap(snaps, uv.u, uv.v, 0.09);
      if (seat && (!polar || Math.hypot(seat.u - uv.u, seat.v - uv.v) <= Math.hypot((polar?.u ?? 9) - uv.u, (polar?.v ?? 9) - uv.v))) {
        showTokenGhost(characterKey, "scenes-token-seat", seat.u, seat.v);
        return;
      }
      if (polar) {
        showTokenGhost(characterKey, "", polar.u, polar.v);
      }
      return;
    }
    const isPc = catalogs?.pcs.some((pc) => pc.characterKey === characterKey) === true;
    let bestDist = 0.1;
    let best: { extraClass: string; u: number; v: number } | null = null;
    for (const areaKey of snaps.scatter.areaOrder) {
      const layout = snaps.scatter.areas[areaKey];
      if (!layout) {
        continue;
      }
      const slots = isPc ? layout.center : layout.orbit;
      const extraClass = isPc ? "scenes-token-center" : "";
      for (const slot of slots) {
        const dist = Math.hypot(slot.u - uv.u, slot.v - uv.v);
        if (dist < bestDist) {
          bestDist = dist;
          best = { extraClass, u: slot.u, v: slot.v };
        }
      }
    }
    if (best) {
      showTokenGhost(characterKey, best.extraClass, best.u, best.v);
    }
  };

  const paintFamilyGhosts = (clientX: number, clientY: number, familyId: string): void => {
    clearGhosts();
    if (!snaps || !draft) {
      return;
    }
    const uv = boardUvFromEvent(overlay, { clientX, clientY });
    if (!uv) {
      return;
    }
    const dest = nearestPolarSnap(snaps, uv.u, uv.v, 0.12);
    if (!dest) {
      return;
    }
    const preview = relocatePolarFamily(draft.standard.polar, familyId, dest.familyId, snaps);
    for (const token of preview) {
      const original = draft.standard.polar.find((row) => row.characterKey === token.characterKey);
      if (!original || original.snapIndex === token.snapIndex) {
        continue;
      }
      const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
      if (snap) {
        showTokenGhost(token.characterKey, "", snap.u, snap.v);
      }
    }
  };

  const bindTokenDrag = (el: HTMLElement, characterKey: string): void => {
    bindBoardDrag(el, {
      boardFrame,
      dragLayer,
      pickup: true,
      onMove: (clientX, clientY) => paintTokenGhosts(clientX, clientY, characterKey),
      onEnd: (clientX, clientY) => {
        clearGhosts();
        applyBoardDrop(clientX, clientY, "token", characterKey);
        render();
      }
    });
  };

  const bindFamilyHandle = (handle: HTMLElement, familyId: string): void => {
    handle.addEventListener("pointerenter", () => {
      if (handle.dataset.dragging === "1") {
        return;
      }
      gsap.killTweensOf(handle);
      gsap.fromTo(handle, { opacity: 0.72 }, { opacity: 1, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" });
    });
    bindBoardDrag(handle, {
      boardFrame,
      dragLayer,
      pickup: false,
      onDragStart: () => {
        handle.dataset.dragging = "1";
        gsap.killTweensOf(handle);
        gsap.set(handle, { opacity: 1 });
        gsap.to(handle, { scale: 1.18, duration: 0.16, yoyo: true, repeat: -1, ease: "sine.inOut" });
      },
      onMove: (clientX, clientY) => paintFamilyGhosts(clientX, clientY, familyId),
      onEnd: (clientX, clientY) => {
        gsap.killTweensOf(handle);
        handle.dataset.dragging = "0";
        clearGhosts();
        applyBoardDrop(clientX, clientY, "family", familyId);
        render();
      }
    });
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
    requiredElement<HTMLInputElement>("scenes-title").value = current.title;
    requiredElement<HTMLButtonElement>("scenes-mode-standard").classList.toggle("lock", current.placementMode === "standard");
    requiredElement<HTMLButtonElement>("scenes-mode-standard").classList.toggle("active", current.placementMode === "standard");
    requiredElement<HTMLButtonElement>("scenes-mode-scatter").classList.toggle("lock", current.placementMode === "scatter");
    requiredElement<HTMLButtonElement>("scenes-mode-scatter").classList.toggle("active", current.placementMode === "scatter");
    tableRow.hidden = current.placementMode === "scatter";
    tableChips.replaceChildren();
    for (const choiceKey of tableChoiceKeys(catalogs.tables)) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = tableChoiceIsSelected(choiceKey, current.tableKey) ? "lock active" : "";
      chip.textContent = choiceKey;
      chip.addEventListener("click", () => {
        if (!draft) {
          return;
        }
        draft.tableKey = choiceKey;
        persist();
        render();
      });
      tableChips.append(chip);
    }
    requiredElement<HTMLSelectElement>("scenes-lighting").value = current.lightingPresetKey;
    requiredElement<HTMLInputElement>("scenes-fog").checked = current.isTopFogActive;
    requiredElement<HTMLInputElement>("scenes-present-day").checked = current.clockPresentDay;
    requiredElement<HTMLInputElement>("scenes-clock-minutes").value = String(current.clockHour * 60 + current.clockMinute);
    requiredElement<HTMLOutputElement>("scenes-clock-time-out").value = formatClockTime(current.clockHour, current.clockMinute);
    const maxDay = daysInMonth(current.clockYear, current.clockMonth);
    const dayInput = requiredElement<HTMLInputElement>("scenes-clock-day");
    dayInput.max = String(maxDay);
    dayInput.value = String(current.clockDay);
    requiredElement<HTMLOutputElement>("scenes-clock-day-out").value = String(current.clockDay);
    requiredElement<HTMLInputElement>("scenes-clock-month").value = String(current.clockMonth);
    requiredElement<HTMLOutputElement>("scenes-clock-month-out").value =
      MONTH_NAMES[current.clockMonth - 1] ?? String(current.clockMonth);
    requiredElement<HTMLInputElement>("scenes-clock-year").value = String(current.clockYear);
    requiredElement<HTMLSelectElement>("scenes-weather").value = current.weatherKey;
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
    layoutBoard();
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
        placeToken(el, snap.u, snap.v);
        el.title = characterLabel(boardCatalogs, token.characterKey);
        el.addEventListener("dblclick", () => {
          token.npcLightMode = token.npcLightMode === "OFF" ? "STANDARD" : "OFF";
          persist();
          render();
        });
        overlay.append(el);
        bindTokenDrag(el, token.characterKey);
      }
      const familyIds = new Set(boardSnaps.polar.map((snap) => snap.familyId));
      for (const familyId of familyIds) {
        const label = familyLabelUv(boardSnaps, familyId);
        if (!label) {
          continue;
        }
        const areaName = polarAreaNameForFamily(boardSnaps, familyId);
        const handle = document.createElement("button");
        handle.type = "button";
        handle.id = `scenes-family-handle-${familyId.replace(":", "-")}`;
        handle.className = "scenes-family-handle";
        handle.dataset.familyId = familyId;
        handle.dataset.areaName = areaName;
        handle.dataset.u = label.u.toFixed(4);
        handle.dataset.v = label.v.toFixed(4);
        handle.title = `Move ${areaName}`;
        handle.setAttribute("aria-label", handle.title);
        handle.textContent = areaName;
        placeToken(handle, label.u, label.v);
        overlay.append(handle);
        bindFamilyHandle(handle, familyId);
      }
      for (const seat of snaps.seats) {
        const row = draft.standard.seatSlots[seat.seatKey];
        if (!row || row.slotEmpty === true || row.characterKey === "") {
          continue;
        }
        const lit = row.isPresent === true && row.absentFromSession !== true;
        const el = makeToken(row.characterKey, lit, "scenes-token-seat");
        placeToken(el, seat.u, seat.v);
        el.title = `${characterLabel(catalogs, row.characterKey)} — ${seat.seatKey}`;
        el.addEventListener("dblclick", () => {
          row.isPresent = !row.isPresent;
          persist();
          render();
        });
        overlay.append(el);
        bindTokenDrag(el, row.characterKey);
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
          placeToken(el, slot.u, slot.v);
          el.addEventListener("dblclick", () => {
            row.isPresent = !row.isPresent;
            persist();
            render();
          });
          overlay.append(el);
          bindTokenDrag(el, displayKey);
        }
        for (const [npcKey, row] of Object.entries(area.orbitCharacters)) {
          const slot = layout.orbit.find((item) => item.slot === row.slot);
          if (!slot) {
            continue;
          }
          const el = makeToken(npcKey, row.npcLightMode !== "OFF");
          placeToken(el, slot.u, slot.v);
          el.addEventListener("dblclick", () => {
            row.npcLightMode = row.npcLightMode === "OFF" ? "STANDARD" : "OFF";
            persist();
            render();
          });
          overlay.append(el);
          bindTokenDrag(el, npcKey);
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
      bindTokenDrag(el, key);
    }
  };

  const render = (): void => {
    clearGhosts();
    killBoardDrags(dragLayer);
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
    const groupNames = [...groups.keys()].sort((a, b) =>
      pickerGroupLabel(a).localeCompare(pickerGroupLabel(b))
    );
    openPickerModal("Add NPCs", (root) => {
      const search = document.createElement("input");
      search.type = "search";
      search.placeholder = "Search NPCs…";
      const tabs = document.createElement("div");
      tabs.className = "scenes-modal-tabs";
      const grid = document.createElement("div");
      grid.className = "generic-npc-grid";
      let activeGroup = groupNames[0] ?? "Ungrouped";
      const paint = (): void => {
        grid.replaceChildren();
        const query = search.value.trim().toLowerCase();
        const used = usedNamedKeys();
        const list = (groups.get(activeGroup) ?? []).filter((npc) => {
          if (query === "") {
            return true;
          }
          return npc.fullName.toLowerCase().includes(query) || npc.characterKey.toLowerCase().includes(query);
        });
        for (const npc of list) {
          const tile = document.createElement("button");
          tile.type = "button";
          tile.className = used.has(npc.characterKey) ? "generic-npc-tile added" : "generic-npc-tile";
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
            if (!draft || used.has(npc.characterKey)) {
              return;
            }
            if (draft.placementMode === "standard") {
              draft.standard.paletteNpcKeys.push(npc.characterKey);
            } else {
              draft.scatter.paletteNpcKeys.push(npc.characterKey);
            }
            persist();
            render();
            paint();
          });
          grid.append(tile);
        }
      };
      for (const name of groupNames) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.textContent = pickerGroupLabel(name);
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

  const openSiteModal = (): void => {
    if (!catalogs || !draft) {
      return;
    }
    const currentDraft = draft;
    const district = catalogs.districts.find((row) => row.key === currentDraft.districtKey);
    const districtSites = catalogs.sites.filter((site) =>
      currentDraft.districtKey === ""
        ? site.districtKey !== null
        : site.districtKey === currentDraft.districtKey
    );
    const genericSites = catalogs.sites.filter((site) => site.districtKey === null);
    openPickerModal("Site", (root) => {
      const search = document.createElement("input");
      search.type = "search";
      search.placeholder = "Search…";
      const districtHeading = document.createElement("h3");
      districtHeading.className = "scenes-modal-group-title";
      districtHeading.textContent = district
        ? `Sites in ${district.name}`
        : "District sites";
      const genericHeading = document.createElement("h3");
      genericHeading.className = "scenes-modal-group-title";
      genericHeading.textContent = "General sites";
      const districtGrid = document.createElement("div");
      districtGrid.className = "scenes-chip-grid";
      const genericGrid = document.createElement("div");
      genericGrid.className = "scenes-chip-grid";
      const paintGrid = (
        grid: HTMLDivElement,
        rows: readonly { key: string; label: string }[],
        query: string
      ): void => {
        grid.replaceChildren();
        for (const row of rows) {
          if (query !== "" && !row.label.toLowerCase().includes(query) && !row.key.toLowerCase().includes(query)) {
            continue;
          }
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = row.label;
          button.addEventListener("click", () => {
            if (!draft || !catalogs) {
              return;
            }
            const site = catalogs.sites.find((item) => item.key === row.key);
            if (!site) {
              throw new Error(`Unknown site key ${row.key}.`);
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
            modalRoot.innerHTML = "";
          });
          grid.append(button);
        }
      };
      const paint = (): void => {
        const query = search.value.trim().toLowerCase();
        const districtRows = districtSites.map((site) => {
          const districtName = catalogs?.districts.find((row) => row.key === site.districtKey)?.name;
          const suffix = currentDraft.districtKey === "" && districtName ? ` (${districtName})` : "";
          return { key: site.key, label: `${site.name}${suffix}` };
        });
        const genericRows = genericSites.map((site) => ({ key: site.key, label: site.name }));
        paintGrid(districtGrid, districtRows, query);
        paintGrid(genericGrid, genericRows, query);
      };
      search.addEventListener("input", paint);
      root.append(search, districtHeading, districtGrid, genericHeading, genericGrid);
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

  requiredElement<HTMLInputElement>("scenes-title").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    draft.title = (event.target as HTMLInputElement).value;
    draft.sceneKey = sceneKeyFromTitle(draft.title);
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
  requiredElement<HTMLInputElement>("scenes-clock-minutes").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    const total = Number((event.target as HTMLInputElement).value);
    draft.clockHour = Math.floor(total / 60);
    draft.clockMinute = total % 60;
    persist();
    renderChrome();
  });
  requiredElement<HTMLInputElement>("scenes-clock-day").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    draft.clockDay = Number((event.target as HTMLInputElement).value);
    persist();
    renderChrome();
  });
  requiredElement<HTMLInputElement>("scenes-clock-month").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    draft.clockMonth = Number((event.target as HTMLInputElement).value);
    clampClockDay();
    persist();
    renderChrome();
  });
  requiredElement<HTMLInputElement>("scenes-clock-year").addEventListener("input", (event) => {
    if (!draft) {
      return;
    }
    const year = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(year) || year < 1) {
      return;
    }
    draft.clockYear = year;
    clampClockDay();
    persist();
    renderChrome();
  });
  requiredElement<HTMLSelectElement>("scenes-weather").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.weatherKey = (event.target as HTMLSelectElement).value;
    persist();
    renderChrome();
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
  requiredElement<HTMLButtonElement>("scenes-site").addEventListener("click", openSiteModal);
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
      const apply = document.createElement("button");
      apply.type = "button";
      apply.textContent = "Apply";
      apply.addEventListener("click", () => {
        if (!draft) {
          return;
        }
        draft.locationTrack = loc.value;
        draft.backgroundMood = mood.value;
        persist();
        render();
        modalRoot.innerHTML = "";
      });
      root.append(loc, mood, apply);
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
      const weather = requiredElement<HTMLSelectElement>("scenes-weather");
      weather.replaceChildren();
      for (const row of catalogs.weatherConditions) {
        weather.append(new Option(row.label, row.key));
      }
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        draft = { ...createDefaultDraft(catalogs, snaps), ...(JSON.parse(saved) as SceneDraft) };
        draft.standard = { ...createDefaultDraft(catalogs, snaps).standard, ...draft.standard };
        draft.scatter = { ...createDefaultDraft(catalogs, snaps).scatter, ...draft.scatter };
      } else {
        draft = createDefaultDraft(catalogs, snaps);
      }
      draft.sceneKey = sceneKeyFromTitle(draft.title);
      persist();
      boardImg.addEventListener("load", layoutBoard);
      window.addEventListener("resize", layoutBoard);
      new ResizeObserver(layoutBoard).observe(boardWrap);
      render();
    } catch (error: unknown) {
      setStatus("error", error instanceof Error ? error.message : "Scenes tab failed to load.");
    }
    await refreshBridge();
    window.setInterval(() => void refreshBridge(), 4000);
  })();
};

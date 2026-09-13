import { bindBoardDrag, gsap, killBoardDrags } from "./scenes/boardDrag.js";
import { comparePickerGroups, groupThemeClass } from "./scenes/groupThemes.js";
import { relocatePolarFamily } from "./scenes/groupRelocate.js";
import {
  boardUvFromEvent,
  buildImportPayload,
  characterLabel,
  createDefaultDraft,
  cutoutUrl,
  familyHandleLayoutFor,
  layoutBoardFrame,
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
import { axesFromWeatherKey, cycleRain, weatherKeyFromAxes } from "./scenes/weatherAxes.js";
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
  const groupTrays = requiredElement<HTMLDivElement>("scenes-group-trays");
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
  let openPickerGroup: string | null = null;
  let reticuleUv = { u: 0.42, v: 0.48 };

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
    const layout = layoutBoardFrame(wrapRect.width, wrapRect.height, naturalWidth, naturalHeight);
    boardFrame.style.width = `${Math.floor(layout.width)}px`;
    boardFrame.style.height = `${Math.floor(layout.height)}px`;
    boardFrame.style.left = `${Math.round(layout.left)}px`;
    boardFrame.style.top = `${Math.round(layout.top)}px`;
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

  const makeToken = (
    characterKey: string,
    lit: boolean,
    extraClass = "",
    ghost = false,
    fullName = ""
  ): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `scenes-token ${extraClass}`.trim();
    button.dataset.characterKey = characterKey;
    if (lit && !extraClass.includes("scenes-token-palette")) {
      button.classList.add("scenes-token-lit");
      let delay = 0;
      for (let i = 0; i < characterKey.length; i += 1) {
        delay += characterKey.charCodeAt(i);
      }
      button.style.setProperty("--glow-delay", `${delay % 900}ms`);
    }
    const bg = document.createElement("span");
    bg.className = "scenes-token-bg";
    const cutout = document.createElement("img");
    cutout.className = "scenes-token-cutout";
    cutout.alt = fullName || characterKey;
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
    if (fullName !== "" && !ghost) {
      const name = document.createElement("span");
      name.className = "scenes-token-name";
      name.textContent = fullName;
      button.append(name);
    }
    return button;
  };

  const snapshotTokenRects = (): Map<string, DOMRect> => {
    const map = new Map<string, DOMRect>();
    const scan = (root: ParentNode, includeOrigin: boolean): void => {
      for (const el of root.querySelectorAll<HTMLElement>("[data-character-key]")) {
        if (el.classList.contains("scenes-token-ghost") || el.classList.contains("scenes-token-dragging")) {
          continue;
        }
        if (!includeOrigin && el.classList.contains("scenes-token-origin")) {
          continue;
        }
        const key = el.dataset.characterKey;
        if (key) {
          map.set(key, el.getBoundingClientRect());
        }
      }
    };
    scan(groupTrays, true);
    scan(palette, true);
    scan(overlay, true);
    return map;
  };

  const flipTokensFrom = (before: Map<string, DOMRect>): void => {
    for (const el of overlay.querySelectorAll<HTMLElement>("[data-character-key]")) {
      const key = el.dataset.characterKey;
      if (!key) {
        continue;
      }
      const prev = before.get(key);
      if (!prev) {
        continue;
      }
      const now = el.getBoundingClientRect();
      const dx = prev.left - now.left;
      const dy = prev.top - now.top;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        continue;
      }
      gsap.fromTo(el, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.34, ease: "power2.inOut" });
    }
  };

  const pointInRect = (clientX: number, clientY: number, rect: DOMRect): boolean =>
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

  const setPlaceLabel = (id: string, text: string, empty: boolean): void => {
    const button = requiredElement<HTMLButtonElement>(id);
    const value = button.querySelector(".scenes-widget-value");
    if (value) {
      value.textContent = text;
    } else {
      button.textContent = text;
    }
    button.classList.toggle("is-placeholder", empty);
  };

  const placeToken = (el: HTMLElement, u: number, v: number): void => {
    el.classList.remove("scenes-token-dragging");
    el.style.position = "absolute";
    el.style.width = "";
    el.style.height = "";
    el.style.zIndex = "";
    el.style.left = cssLeft(u);
    el.style.top = cssTop(v);
    gsap.set(el, {
      clearProps: "width,height,zIndex",
      position: "absolute",
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0
    });
  };

  const returnTokenOffBoard = (characterKey: string): void => {
    if (!draft || !catalogs) {
      return;
    }
    draft.standard.polar = draft.standard.polar.filter((token) => token.characterKey !== characterKey);
    draft.standard.paletteNpcKeys = draft.standard.paletteNpcKeys.filter((key) => key !== characterKey);
    draft.scatter.paletteNpcKeys = draft.scatter.paletteNpcKeys.filter((key) => key !== characterKey);
    for (const area of Object.values(draft.scatter.areas)) {
      delete area.orbitCharacters[characterKey];
      for (const [pcKey, row] of Object.entries(area.centerCharacters)) {
        if (pcKey === characterKey || row.characterKey === characterKey) {
          delete area.centerCharacters[pcKey];
        }
      }
    }
    if (Object.values(PC_BY_COLOR).includes(characterKey)) {
      return;
    }
    for (const npcSeat of catalogs.npcSeats) {
      const row = draft.standard.seatSlots[npcSeat];
      if (!row || row.characterKey !== characterKey) {
        continue;
      }
      if (row.isPresent === false) {
        row.isPresent = true;
      } else {
        draft.standard.seatSlots[npcSeat] = {
          characterKey: "",
          isPlayingNPC: false,
          isPresent: false,
          slotEmpty: true
        };
      }
    }
  };

  const applyBoardDrop = (clientX: number, clientY: number, dragKind: "token" | "family", dragKey: string): void => {
    if (!draft || !snaps || !catalogs) {
      return;
    }
    if (!pointInRect(clientX, clientY, boardWrap.getBoundingClientRect())) {
      if (dragKind === "family") {
        setStatus("error", "Drop the group handle onto a polar pack.");
        return;
      }
      returnTokenOffBoard(dragKey);
      persist();
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

  const finishBoardDrag = (clientX: number, clientY: number, dragKind: "token" | "family", dragKey: string): void => {
    const before = snapshotTokenRects();
    clearGhosts();
    applyBoardDrop(clientX, clientY, dragKind, dragKey);
    render();
    flipTokensFrom(before);
  };

  const bindTokenDrag = (el: HTMLElement, characterKey: string): void => {
    bindBoardDrag(el, {
      boardFrame,
      dragLayer,
      pickup: true,
      leaveOrigin: true,
      onMove: (clientX, clientY) => paintTokenGhosts(clientX, clientY, characterKey),
      onEnd: (clientX, clientY) => finishBoardDrag(clientX, clientY, "token", characterKey)
    });
  };

  const bindFamilyHandle = (handle: HTMLElement, familyId: string): void => {
    handle.addEventListener("pointerenter", () => {
      if (handle.dataset.dragging === "1") {
        return;
      }
      gsap.killTweensOf(handle);
      gsap.fromTo(handle, { opacity: 0 }, { opacity: 0.95, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" });
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
      leaveOrigin: true,
      onMove: (clientX, clientY) => paintFamilyGhosts(clientX, clientY, familyId),
      onEnd: (clientX, clientY) => {
        gsap.killTweensOf(handle);
        handle.dataset.dragging = "0";
        finishBoardDrag(clientX, clientY, "family", familyId);
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
    const axes = axesFromWeatherKey(current.weatherKey, catalogs.weatherConditions);
    const rainButton = requiredElement<HTMLButtonElement>("scenes-weather-rain");
    rainButton.classList.toggle("lock", axes.rain !== "none");
    rainButton.classList.toggle("active", axes.rain !== "none");
    rainButton.title = axes.rain === "heavy" ? "Heavy rain" : axes.rain === "light" ? "Light rain" : "Rain";
    const windButton = requiredElement<HTMLButtonElement>("scenes-weather-wind");
    windButton.classList.toggle("lock", axes.wind);
    windButton.classList.toggle("active", axes.wind);
    const thunderButton = requiredElement<HTMLButtonElement>("scenes-weather-thunder");
    thunderButton.classList.toggle("lock", axes.thunder);
    thunderButton.classList.toggle("active", axes.thunder);
    const district = catalogs.districts.find((row) => row.key === current.districtKey);
    const site = catalogs.sites.find((row) => row.key === current.siteKey);
    setPlaceLabel("scenes-district", district ? district.name : "District", !district);
    setPlaceLabel("scenes-site", site ? site.name : "Site", !site);
    const sky = catalogs.skyboxes.find((row) => row.key === current.skyboxOverride);
    const skyLabel = sky
      ? sky.display
      : current.skyboxOverride === "Generic"
        ? "Generic"
        : "Skybox";
    setPlaceLabel("scenes-skybox", skyLabel, !sky && current.skyboxOverride !== "Generic");
    const locationSelect = requiredElement<HTMLSelectElement>("scenes-location-track");
    if (locationSelect.value !== current.locationTrack) {
      locationSelect.value = current.locationTrack;
    }
    const moodSelect = requiredElement<HTMLSelectElement>("scenes-background-mood");
    if (moodSelect.value !== current.backgroundMood) {
      moodSelect.value = current.backgroundMood;
    }
    const conditionsList = requiredElement<HTMLDivElement>("scenes-conditions-list");
    conditionsList.replaceChildren();
    for (const cond of catalogs.conditions) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = current.conditions.includes(cond.id) ? "scenes-condition-chip lock active" : "scenes-condition-chip";
      chip.textContent = cond.displayName;
      chip.addEventListener("click", () => {
        if (!draft) {
          return;
        }
        if (draft.conditions.includes(cond.id)) {
          draft.conditions = draft.conditions.filter((id) => id !== cond.id);
        } else {
          draft.conditions = [...draft.conditions, cond.id];
        }
        persist();
        renderChrome();
      });
      conditionsList.append(chip);
    }
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
        const el = makeToken(token.characterKey, token.npcLightMode !== "OFF", "", false, characterLabel(boardCatalogs, token.characterKey));
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
        const layout = familyHandleLayoutFor(boardSnaps, familyId);
        if (!layout) {
          continue;
        }
        const areaName = polarAreaNameForFamily(boardSnaps, familyId);
        const handle = document.createElement("button");
        handle.type = "button";
        handle.id = `scenes-family-handle-${familyId.replace(":", "-")}`;
        handle.className = "scenes-family-handle";
        handle.dataset.familyId = familyId;
        handle.dataset.areaName = areaName;
        handle.title = `Move ${areaName}`;
        handle.setAttribute("aria-label", handle.title);
        handle.style.width = `${layout.widthPct}%`;
        placeToken(handle, layout.leftPct / 100, 1 - layout.topPct / 100);
        overlay.append(handle);
        bindFamilyHandle(handle, familyId);
      }
      for (const seat of snaps.seats) {
        const row = draft.standard.seatSlots[seat.seatKey];
        if (!row || row.slotEmpty === true || row.characterKey === "") {
          continue;
        }
        const lit = row.isPresent === true && row.absentFromSession !== true;
        const el = makeToken(row.characterKey, lit, "scenes-token-seat", false, characterLabel(catalogs, row.characterKey));
        placeToken(el, seat.u, seat.v);
        if (seat.v > 0.52) {
          el.classList.add("scenes-token-caption-above");
        }
        if (seat.u < 0.4) {
          el.classList.add("scenes-token-caption-left");
        } else if (seat.u > 0.5) {
          el.classList.add("scenes-token-caption-right");
        }
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
          const el = makeToken(displayKey, row.isPresent, "scenes-token-center", false, characterLabel(boardCatalogs, displayKey));
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
          const el = makeToken(npcKey, row.npcLightMode !== "OFF", "", false, characterLabel(boardCatalogs, npcKey));
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

    const reticule = document.createElement("button");
    reticule.type = "button";
    reticule.id = "scenes-reticule";
    reticule.className = "scenes-reticule";
    reticule.title = "Drop to copy board coordinates";
    reticule.setAttribute("aria-label", reticule.title);
    placeToken(reticule, reticuleUv.u, reticuleUv.v);
    overlay.append(reticule);
    bindBoardDrag(reticule, {
      boardFrame,
      dragLayer,
      pickup: false,
      leaveOrigin: false,
      dropPulse: false,
      onMove: () => undefined,
      onEnd: (clientX, clientY) => {
        overlay.append(reticule);
        const uv = boardUvFromEvent(overlay, { clientX, clientY });
        if (!uv) {
          placeToken(reticule, reticuleUv.u, reticuleUv.v);
          return;
        }
        reticuleUv = uv;
        placeToken(reticule, uv.u, uv.v);
        const text = `${uv.u.toFixed(4)}, ${uv.v.toFixed(4)}`;
        void navigator.clipboard.writeText(text).then(
          () => setStatus("success", `Copied ${text}`),
          () => setStatus("error", "Could not copy coordinates.")
        );
      }
    });
  };

  const renderPalette = (): void => {
    if (!draft || !catalogs) {
      return;
    }
    palette.replaceChildren();
    const keys = draft.placementMode === "standard" ? draft.standard.paletteNpcKeys : draft.scatter.paletteNpcKeys;
    palette.hidden = keys.length === 0;
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
    renderGroupTrays();
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

  const renderGroupTrays = (): void => {
    if (!catalogs) {
      return;
    }
    const used = usedNamedKeys();
    const groups = new Map<string, Array<SceneCatalogs["namedNpcs"][number]>>();
    for (const npc of catalogs.namedNpcs) {
      const tags = npc.pickerGroups.length > 0 ? npc.pickerGroups : ["Ungrouped"];
      for (const tag of tags) {
        const list = groups.get(tag) ?? [];
        list.push(npc);
        groups.set(tag, list);
      }
    }
    const groupNames = [...groups.keys()].sort((a, b) =>
      comparePickerGroups(a, b, pickerGroupLabel)
    );
    groupTrays.replaceChildren();
    for (const name of groupNames) {
      const tray = document.createElement("div");
      tray.className = `scenes-group-tray ${groupThemeClass(name)}`;
      if (openPickerGroup === name) {
        tray.classList.add("open");
      }
      const header = document.createElement("button");
      header.type = "button";
      header.className = "scenes-group-tray-header";
      header.textContent = pickerGroupLabel(name);
      header.addEventListener("click", () => {
        openPickerGroup = openPickerGroup === name ? null : name;
        render();
      });
      const body = document.createElement("div");
      body.className = "scenes-group-tray-body";
      for (const npc of groups.get(name) ?? []) {
        const onBoard = used.has(npc.characterKey);
        const el = makeToken(
          npc.characterKey,
          true,
          onBoard ? "scenes-token-palette added" : "scenes-token-palette"
        );
        el.title = npc.fullName;
        body.append(el);
        if (!onBoard) {
          bindTokenDrag(el, npc.characterKey);
        }
      }
      tray.append(header, body);
      groupTrays.append(tray);
    }
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
  const applyWeatherPatch = (patch: Partial<{ rain: "none" | "light" | "heavy"; wind: boolean; thunder: boolean }>): void => {
    if (!draft || !catalogs) {
      return;
    }
    const next = {
      ...axesFromWeatherKey(draft.weatherKey, catalogs.weatherConditions),
      ...patch
    };
    draft.weatherKey = weatherKeyFromAxes(next);
    persist();
    renderChrome();
  };

  requiredElement<HTMLSelectElement>("scenes-weather").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.weatherKey = (event.target as HTMLSelectElement).value;
    persist();
    renderChrome();
  });
  requiredElement<HTMLButtonElement>("scenes-weather-rain").addEventListener("click", () => {
    if (!draft || !catalogs) {
      return;
    }
    const axes = axesFromWeatherKey(draft.weatherKey, catalogs.weatherConditions);
    applyWeatherPatch({ rain: cycleRain(axes.rain), thunder: false });
  });
  requiredElement<HTMLButtonElement>("scenes-weather-wind").addEventListener("click", () => {
    if (!draft || !catalogs) {
      return;
    }
    const axes = axesFromWeatherKey(draft.weatherKey, catalogs.weatherConditions);
    applyWeatherPatch({ wind: !axes.wind, thunder: false });
  });
  requiredElement<HTMLButtonElement>("scenes-weather-thunder").addEventListener("click", () => {
    if (!draft || !catalogs) {
      return;
    }
    const axes = axesFromWeatherKey(draft.weatherKey, catalogs.weatherConditions);
    applyWeatherPatch({ thunder: !axes.thunder });
  });
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
  requiredElement<HTMLSelectElement>("scenes-location-track").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.locationTrack = (event.target as HTMLSelectElement).value;
    persist();
  });
  requiredElement<HTMLSelectElement>("scenes-background-mood").addEventListener("change", (event) => {
    if (!draft) {
      return;
    }
    draft.backgroundMood = (event.target as HTMLSelectElement).value;
    persist();
  });
  requiredElement<HTMLButtonElement>("scenes-clear-stage").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    const button = requiredElement<HTMLButtonElement>("scenes-clear-stage");
    if (!button.classList.contains("armed")) {
      button.classList.add("armed");
      window.setTimeout(() => button.classList.remove("armed"), 5000);
      return;
    }
    button.classList.remove("armed");
    const before = snapshotTokenRects();
    if (draft.placementMode === "standard") {
      for (const token of [...draft.standard.polar]) {
        returnTokenOffBoard(token.characterKey);
      }
    } else {
      for (const area of Object.values(draft.scatter.areas)) {
        for (const npcKey of Object.keys(area.orbitCharacters)) {
          returnTokenOffBoard(npcKey);
        }
      }
    }
    persist();
    render();
    flipTokensFrom(before);
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
      const locationSelect = requiredElement<HTMLSelectElement>("scenes-location-track");
      locationSelect.replaceChildren(new Option("(location)", ""));
      for (const track of catalogs.locationTracks) {
        locationSelect.append(new Option(track.key, track.key));
      }
      const moodSelect = requiredElement<HTMLSelectElement>("scenes-background-mood");
      moodSelect.replaceChildren(new Option("(mood)", ""));
      for (const key of catalogs.backgroundMoods) {
        moodSelect.append(new Option(key, key));
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

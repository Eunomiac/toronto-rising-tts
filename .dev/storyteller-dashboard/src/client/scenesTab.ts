import { bindBoardDrag, gsap, killBoardDrags, pointerOnVisibleBoard } from "./scenes/boardDrag.js";
import { formatChronicleDateTime } from "./scenes/clockFormat.js";
import {
  DISTRICT_MAP_HEIGHT,
  DISTRICT_MAP_SRC,
  DISTRICT_MAP_WIDTH,
  lockedDistrictPinPositions
} from "./scenes/districtMap.js";
import {
  applyDebugFillToDraft,
  captureDebugFillBackup,
  restoreDebugFillBackup,
  restoreDefaultPcSeats,
  type DebugFillBackup
} from "./scenes/debugFill.js";
import { comparePickerGroups, GROUP_THEMES, groupThemeClass, isImportantGroup, trayMergeLabel } from "./scenes/groupThemes.js";
import { applyLeadLightToFamily, placeKeysOnPolarFamily, polarTokensInFamily, relocatePolarFamily } from "./scenes/groupRelocate.js";
import { moveSeatOccupant, swapOntoPolarSnap } from "./scenes/tokenSwap.js";
import { formatNameOffsetsClipboard, roundOffset } from "./scenes/nameOffsets.js";
import { tokenStackZIndex } from "./scenes/tokenStack.js";
import {
  boardUvFromEvent,
  buildImportPayload,
  characterLabel,
  createDefaultDraft,
  cutoutUrl,
  familyHandleLayoutFor,
  layoutBoardFrame,
  polarAreaNameForFamily,
  resolveWeatherAxes,
  tableChoiceIsSelected,
  tableChoiceKeys,
  nearestPolarSnap,
  nearestSeatSnap,
  parseControlBoardSnaps,
  parseSceneCatalogs,
  PC_BY_COLOR,
  sceneKeyFromTitle
} from "./scenes/payload.js";
import {
  applyTokenNameLayout,
  nameAlignColor,
  nameLayoutForPolarSnap,
  nameLayoutForSeat,
  nextNameAlign,
  type TokenNameLayout
} from "./scenes/tokenNames.js";
import type { NameAlign, NameOffset } from "./scenes/nameOffsets.js";
import { initToasts } from "./scenes/toasts.js";
import {
  cycleRain,
  cycleSnow,
  cycleWind,
  applyThunder,
  axesFromLegacyWeatherKey,
  isWinterWind,
  rainIconCount,
  rainLabel,
  snowIconCount,
  snowLabel,
  thunderIconCount,
  weatherIntensityFill,
  windIconCount,
  windLabel
} from "./scenes/weatherAxes.js";
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

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

export const initScenesTab = (): void => {
  const toasts = initToasts(requiredElement<HTMLDivElement>("scenes-toasts"));
  const bridgeStatus = requiredElement<HTMLDivElement>("scenes-bridge-status");
  const boardWrap = requiredElement<HTMLDivElement>("scenes-board-wrap");
  const boardFrame = requiredElement<HTMLDivElement>("scenes-board-frame");
  const boardImg = requiredElement<HTMLImageElement>("scenes-board-img");
  const overlay = requiredElement<HTMLDivElement>("scenes-board-overlay");
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
  let leftCollection: "scenes" | "main" | "generic" | "memoriam" = "main";
  let reticuleUv = { u: 0.42, v: 0.48 };
  let debugMode = false;
  let debugFillOn = false;
  let debugNamesLocked = false;
  let debugFillBackup: DebugFillBackup | null = null;
  const nameLockPolar: Record<number, NameOffset> = {};
  const nameLockSeats: Record<string, NameOffset> = {};

  const onVisibleBoard = (clientX: number, clientY: number): boolean =>
    pointerOnVisibleBoard(boardWrap, boardFrame, clientX, clientY);

  const closeModal = (): void => {
    modalRoot.innerHTML = "";
  };

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

  const clearNameLocks = (): void => {
    debugNamesLocked = false;
    for (const key of Object.keys(nameLockPolar)) {
      delete nameLockPolar[Number.parseInt(key, 10)];
    }
    for (const key of Object.keys(nameLockSeats)) {
      delete nameLockSeats[key];
    }
  };

  const restoreDebugFill = (): void => {
    if (!draft || !debugFillOn) {
      debugFillOn = false;
      debugFillBackup = null;
      clearNameLocks();
      return;
    }
    if (debugFillBackup) {
      restoreDebugFillBackup(draft, debugFillBackup);
    }
    debugFillBackup = null;
    debugFillOn = false;
    clearNameLocks();
  };

  const applyDebugFill = (): void => {
    if (!draft || !snaps || !catalogs) {
      return;
    }
    if (!debugFillBackup) {
      debugFillBackup = captureDebugFillBackup(draft);
    }
    applyDebugFillToDraft(draft, snaps);
    debugFillOn = true;
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
    fullName = "",
    tokenId = ""
  ): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `scenes-token ${extraClass}`.trim();
    button.dataset.characterKey = characterKey;
    if (tokenId !== "") {
      button.dataset.tokenId = tokenId;
    }
    if (lit && !extraClass.includes("scenes-token-palette")) {
      button.classList.add("scenes-token-lit");
      const seed = tokenId !== "" ? tokenId : characterKey;
      let delay = 0;
      for (let i = 0; i < seed.length; i += 1) {
        delay += seed.charCodeAt(i);
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
    const scan = (root: ParentNode): void => {
      for (const el of root.querySelectorAll<HTMLElement>("[data-character-key]")) {
        if (el.classList.contains("scenes-token-ghost") || el.classList.contains("scenes-token-dragging")) {
          continue;
        }
        const key = el.dataset.characterKey;
        const id = el.dataset.tokenId ?? key;
        if (!key || !id) {
          continue;
        }
        map.set(id, el.getBoundingClientRect());
        if (el.classList.contains("scenes-token-origin") || el.classList.contains("scenes-token-palette")) {
          map.set(`from:${key}`, el.getBoundingClientRect());
        }
      }
    };
    scan(groupTrays);
    scan(overlay);
    return map;
  };

  const flipTokensFrom = (before: Map<string, DOMRect>): void => {
    for (const el of overlay.querySelectorAll<HTMLElement>("[data-character-key]")) {
      const key = el.dataset.characterKey;
      const id = el.dataset.tokenId ?? key;
      if (!key || !id) {
        continue;
      }
      const prev = before.get(id) ?? before.get(`from:${key}`);
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

  const paintWeatherIcons = (
    button: HTMLButtonElement,
    src: string,
    count: number,
    title: string,
    maxLevel: number,
    winterWind = false
  ): void => {
    const shown = Math.max(1, count);
    button.title = title;
    button.classList.toggle("lock", count > 0);
    button.classList.toggle("active", count > 0);
    button.classList.toggle("scenes-weather-winter-wind", winterWind);
    button.dataset.count = String(count);
    button.style.background = weatherIntensityFill(count, maxLevel);
    const stack = document.createElement("span");
    stack.className = "scenes-weather-stack";
    stack.dataset.count = String(shown);
    for (let i = 0; i < shown; i += 1) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      stack.append(img);
    }
    button.replaceChildren(stack);
  };

  const mergeLockedLayout = (base: TokenNameLayout, lock?: NameOffset): TokenNameLayout =>
    lock ? { ...base, ox: lock.ox, oy: lock.oy, align: lock.align } : base;

  const bindNameHoverHighlight = (tokenEl: HTMLElement, nameEl: HTMLElement): void => {
    nameEl.addEventListener("pointerenter", () => {
      tokenEl.classList.add("scenes-token-name-target");
    });
    nameEl.addEventListener("pointerleave", () => {
      if (tokenEl.dataset.nameDragging === "1") {
        return;
      }
      tokenEl.classList.remove("scenes-token-name-target");
    });
  };

  const bindNameOffsetDrag = (
    tokenEl: HTMLElement,
    nameEl: HTMLElement,
    start: TokenNameLayout,
    write: (next: NameOffset) => void
  ): void => {
    nameEl.style.pointerEvents = "auto";
    nameEl.style.cursor = "grab";
    nameEl.style.color = nameAlignColor(start.align);
    let dragging = false;
    let originX = 0;
    let originY = 0;
    let baseOx = start.ox;
    let baseOy = start.oy;
    const currentAlign = (): NameAlign =>
      tokenEl.dataset.nameAlign === "left" || tokenEl.dataset.nameAlign === "right"
        ? tokenEl.dataset.nameAlign
        : "center";
    nameEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dragging = true;
      tokenEl.dataset.nameDragging = "1";
      tokenEl.classList.add("scenes-token-name-target");
      originX = event.clientX;
      originY = event.clientY;
      baseOx = Number.parseFloat(tokenEl.style.getPropertyValue("--name-ox")) || 0;
      baseOy = Number.parseFloat(tokenEl.style.getPropertyValue("--name-oy")) || 0;
      nameEl.setPointerCapture(event.pointerId);
    });
    nameEl.addEventListener("pointermove", (event) => {
      if (!dragging) {
        return;
      }
      const ox = roundOffset(baseOx + event.clientX - originX);
      const oy = roundOffset(baseOy + event.clientY - originY);
      tokenEl.style.setProperty("--name-ox", `${ox}px`);
      tokenEl.style.setProperty("--name-oy", `${oy}px`);
      write({ ox, oy, align: currentAlign() });
    });
    nameEl.addEventListener("pointerup", (event) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      tokenEl.dataset.nameDragging = "0";
      if (nameEl.hasPointerCapture(event.pointerId)) {
        nameEl.releasePointerCapture(event.pointerId);
      }
      if (!nameEl.matches(":hover")) {
        tokenEl.classList.remove("scenes-token-name-target");
      }
    });
    nameEl.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ox = Number.parseFloat(tokenEl.style.getPropertyValue("--name-ox")) || 0;
      const oy = Number.parseFloat(tokenEl.style.getPropertyValue("--name-oy")) || 0;
      const align = nextNameAlign(currentAlign());
      applyTokenNameLayout(tokenEl, { ...start, ox, oy, align });
      nameEl.style.color = nameAlignColor(align);
      write({ ox, oy, align });
    });
  };

  const applyPlacedTokenName = (
    el: HTMLElement,
    layout: TokenNameLayout,
    polarSnapIndex?: number,
    sourceSeatKey?: string
  ): void => {
    const lock = sourceSeatKey !== undefined ? nameLockSeats[sourceSeatKey] : polarSnapIndex !== undefined
      ? nameLockPolar[polarSnapIndex]
      : undefined;
    const merged = mergeLockedLayout(layout, lock);
    applyTokenNameLayout(el, merged);
    const name = el.querySelector<HTMLElement>(".scenes-token-name");
    if (!name) {
      return;
    }
    if (debugMode) {
      name.style.pointerEvents = "auto";
    }
    bindNameHoverHighlight(el, name);
    if (!debugNamesLocked) {
      return;
    }
    el.classList.add("scenes-token-name-locked");
    bindNameOffsetDrag(el, name, merged, (next) => {
      if (sourceSeatKey !== undefined) {
        nameLockSeats[sourceSeatKey] = next;
      } else if (polarSnapIndex !== undefined) {
        nameLockPolar[polarSnapIndex] = next;
      }
    });
  };

  const placeToken = (el: HTMLElement, u: number, v: number, stack: "token" | "handle" | "ghost" | "front" = "token"): void => {
    el.classList.remove("scenes-token-dragging");
    el.style.position = "absolute";
    el.style.width = "";
    el.style.height = "";
    el.style.zIndex = "";
    el.style.visibility = "";
    el.style.left = cssLeft(u);
    el.style.top = cssTop(v);
    gsap.set(el, {
      clearProps: "width,height,zIndex,visibility",
      position: "absolute",
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0
    });
    const stackZ =
      stack === "front" ? 2500 : tokenStackZIndex(v) + (stack === "handle" ? 2 : stack === "ghost" ? 1 : 0);
    el.style.setProperty("--stack-z", String(stackZ));
  };

  const returnTokenOffBoard = (characterKey: string, polarSnapIndex?: number): void => {
    if (!draft || !catalogs) {
      return;
    }
    if (polarSnapIndex !== undefined) {
      draft.standard.polar = draft.standard.polar.filter((token) => token.snapIndex !== polarSnapIndex);
    } else {
      draft.standard.polar = draft.standard.polar.filter((token) => token.characterKey !== characterKey);
    }
    const stillOnPolar = draft.standard.polar.some((token) => token.characterKey === characterKey);
    if (stillOnPolar) {
      return;
    }
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

  const applyBoardDrop = (
    clientX: number,
    clientY: number,
    dragKind: "token" | "family" | "tray",
    dragKey: string,
    trayKeys: readonly string[] = [],
    polarSnapIndex?: number,
    sourceSeatKey?: string
  ): void => {
    if (!draft || !snaps || !catalogs) {
      return;
    }
    if (!onVisibleBoard(clientX, clientY)) {
      if (dragKind === "tray") {
        return;
      }
      if (dragKind === "family") {
        for (const token of polarTokensInFamily(draft.standard.polar, dragKey, snaps)) {
          returnTokenOffBoard(token.characterKey, token.snapIndex);
        }
        persist();
        return;
      }
      if (sourceSeatKey && !PC_BY_COLOR[sourceSeatKey]) {
        draft.standard.seatSlots[sourceSeatKey] = {
          characterKey: "",
          isPlayingNPC: false,
          isPresent: false,
          slotEmpty: true
        };
      }
      returnTokenOffBoard(dragKey, polarSnapIndex);
      persist();
      return;
    }
    const uv = boardUvFromEvent(overlay, { clientX, clientY });
    if (!uv) {
      setStatus("error", "Drop tokens on the control board.");
      return;
    }
    if (draft.placementMode === "standard") {
      if (dragKind === "family" || dragKind === "tray") {
        const dest = nearestPolarSnap(snaps, uv.u, uv.v, 0.1);
        if (!dest) {
          setStatus("error", "Drop the group handle onto a polar pack.");
          return;
        }
        if (dragKind === "tray") {
          draft.standard.polar = placeKeysOnPolarFamily(draft.standard.polar, trayKeys, dest.familyId, snaps);
        } else {
          draft.standard.polar = relocatePolarFamily(draft.standard.polar, dragKey, dest.familyId, snaps);
        }
        persist();
        return;
      }
      const seat = nearestSeatSnap(snaps, uv.u, uv.v, 0.055);
      const polar = nearestPolarSnap(snaps, uv.u, uv.v, 0.06);
      const isNpc = namedByKey().has(dragKey);
      if (seat && (!polar || Math.hypot(seat.u - uv.u, seat.v - uv.v) <= Math.hypot((polar?.u ?? 9) - uv.u, (polar?.v ?? 9) - uv.v))) {
        placeOnSeat(dragKey, seat.seatKey, polarSnapIndex, sourceSeatKey);
      } else if (polar && isNpc) {
        const destOccupant = draft.standard.polar.find(
          (token) => token.snapIndex === polar.snapIndex && token.characterKey !== dragKey
        );
        const existing = draft.standard.polar.find((token) => token.characterKey === dragKey);
        placeNpcOnPolar(
          dragKey,
          polar.snapIndex,
          existing?.npcLightMode ?? (polar.defaultLightMode === "STANDARD" ? "STANDARD" : "OFF"),
          polarSnapIndex
        );
        if (sourceSeatKey) {
          if (destOccupant) {
            const sourceSeat = snaps.seats.find((row) => row.seatKey === sourceSeatKey);
            draft.standard.seatSlots[sourceSeatKey] = {
              characterKey: destOccupant.characterKey,
              isPlayingNPC: false,
              isPresent: true,
              tableSlot: sourceSeat?.tableSlot,
              slotEmpty: false
            };
          } else {
            draft.standard.seatSlots[sourceSeatKey] = {
              characterKey: "",
              isPlayingNPC: false,
              isPresent: false,
              slotEmpty: true
            };
          }
        }
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
    placeToken(ghost, u, v, "ghost");
    overlay.append(ghost);
    ghostEls.push(ghost);
  };

  const paintTokenGhosts = (clientX: number, clientY: number, characterKey: string): void => {
    clearGhosts();
    if (!snaps || !draft || !onVisibleBoard(clientX, clientY)) {
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
    if (!snaps || !draft || !onVisibleBoard(clientX, clientY)) {
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

  const paintTrayGhosts = (clientX: number, clientY: number, keys: readonly string[]): void => {
    clearGhosts();
    if (!snaps || !draft || keys.length === 0 || !onVisibleBoard(clientX, clientY)) {
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
    const preview = placeKeysOnPolarFamily(draft.standard.polar, keys, dest.familyId, snaps);
    for (const key of keys) {
      const token = preview.find((row) => row.characterKey === key);
      if (!token) {
        continue;
      }
      const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
      if (snap) {
        showTokenGhost(key, "", snap.u, snap.v);
      }
    }
  };

  const finishBoardDrag = (
    clientX: number,
    clientY: number,
    dragKind: "token" | "family" | "tray",
    dragKey: string,
    trayKeys: readonly string[] = [],
    polarSnapIndex?: number,
    sourceSeatKey?: string
  ): void => {
    const before = snapshotTokenRects();
    clearGhosts();
    applyBoardDrop(clientX, clientY, dragKind, dragKey, trayKeys, polarSnapIndex, sourceSeatKey);
    render();
    flipTokensFrom(before);
  };

  const bindTrayHandle = (handle: HTMLElement, keys: readonly string[]): void => {
    bindBoardDrag(handle, {
      boardFrame,
      dragLayer,
      pickup: false,
      onMove: (clientX, clientY) => paintTrayGhosts(clientX, clientY, keys),
      onEnd: (clientX, clientY) => finishBoardDrag(clientX, clientY, "tray", "", keys)
    });
  };

  const bindTokenDrag = (
    el: HTMLElement,
    characterKey: string,
    fromTray = false,
    polarSnapIndex?: number,
    sourceSeatKey?: string
  ): void => {
    bindBoardDrag(el, {
      boardFrame,
      dragLayer,
      pickup: true,
      leaveOrigin: !fromTray,
      clearCue: true,
      onBoard: onVisibleBoard,
      onMove: (clientX, clientY) => paintTokenGhosts(clientX, clientY, characterKey),
      onEnd: (clientX, clientY) =>
        finishBoardDrag(clientX, clientY, "token", characterKey, [], polarSnapIndex, sourceSeatKey)
    });
  };

  const bindFamilyHandle = (handle: HTMLElement, familyId: string): void => {
    handle.addEventListener("pointerenter", () => {
      if (handle.dataset.dragging === "1") {
        return;
      }
      gsap.killTweensOf(handle);
      gsap.set(handle, { opacity: 0.95 });
    });
    handle.addEventListener("pointerleave", () => {
      if (handle.dataset.dragging === "1") {
        return;
      }
      gsap.killTweensOf(handle);
      gsap.set(handle, { opacity: 0 });
    });
    handle.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!draft || !snaps) {
        return;
      }
      const next = applyLeadLightToFamily(draft.standard.polar, familyId, snaps);
      if (!next) {
        return;
      }
      draft.standard.polar = next;
      persist();
      render();
    });
    bindBoardDrag(handle, {
      boardFrame,
      dragLayer,
      pickup: false,
      clearCue: true,
      onBoard: onVisibleBoard,
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

  const placeNpcOnPolar = (characterKey: string, snapIndex: number, light: NpcLightMode, fromSnapIndex?: number): void => {
    if (!draft) {
      return;
    }
    draft.standard.polar = swapOntoPolarSnap(draft.standard.polar, characterKey, snapIndex, fromSnapIndex, light);
    for (const npcSeat of catalogs?.npcSeats ?? []) {
      const row = draft.standard.seatSlots[npcSeat];
      if (row && row.characterKey === characterKey) {
        row.isPresent = false;
      }
    }
  };

  const stampSeatTableSlots = (): void => {
    if (!draft || !snaps) {
      return;
    }
    for (const seat of snaps.seats) {
      const row = draft.standard.seatSlots[seat.seatKey];
      if (row && seat.tableSlot !== undefined) {
        row.tableSlot = seat.tableSlot;
      }
    }
  };

  const placeOnSeat = (
    characterKey: string,
    seatKey: string,
    fromPolarSnapIndex?: number,
    sourceSeatKey?: string
  ): void => {
    if (!draft || !catalogs || !snaps) {
      return;
    }
    const seat = snaps.seats.find((row) => row.seatKey === seatKey);
    if (!seat) {
      return;
    }
    if (sourceSeatKey && sourceSeatKey !== seatKey) {
      draft.standard.seatSlots = moveSeatOccupant(draft.standard.seatSlots, sourceSeatKey, seatKey);
      stampSeatTableSlots();
      return;
    }
    const dest = draft.standard.seatSlots[seatKey];
    const destOccupant =
      dest && dest.slotEmpty !== true && dest.characterKey !== "" && dest.characterKey !== characterKey
        ? dest.characterKey
        : null;
    const destOccupantPresent = dest?.isPresent === true;
    const currentDraft = draft;
    const sourceNpcSeat = catalogs.npcSeats.find((npcSeat) => {
      const row = currentDraft.standard.seatSlots[npcSeat];
      return npcSeat !== seatKey && row?.characterKey === characterKey;
    });
    const moverPolar =
      fromPolarSnapIndex ??
      draft.standard.polar.find((token) => token.characterKey === characterKey)?.snapIndex;
    draft.standard.polar = draft.standard.polar.filter((token) => token.characterKey !== characterKey);
    for (const npcSeat of catalogs.npcSeats) {
      const row = draft.standard.seatSlots[npcSeat];
      if (row && row.characterKey === characterKey) {
        draft.standard.seatSlots[npcSeat] = { characterKey: "", isPlayingNPC: false, isPresent: false, slotEmpty: true };
      }
    }
    const onStage = draft.standard.polar.some((token) => token.characterKey === characterKey);
    draft.standard.seatSlots[seatKey] = {
      characterKey,
      isPlayingNPC: false,
      isPresent: !onStage,
      tableSlot: seat.tableSlot,
      slotEmpty: false
    };
    if (!destOccupant) {
      stampSeatTableSlots();
      return;
    }
    if (moverPolar !== undefined) {
      placeNpcOnPolar(destOccupant, moverPolar, "OFF");
      stampSeatTableSlots();
      return;
    }
    if (sourceNpcSeat) {
      const sourceSeat = snaps.seats.find((row) => row.seatKey === sourceNpcSeat);
      draft.standard.seatSlots[sourceNpcSeat] = {
        characterKey: destOccupant,
        isPlayingNPC: false,
        isPresent: destOccupantPresent,
        tableSlot: sourceSeat?.tableSlot,
        slotEmpty: false
      };
    }
    stampSeatTableSlots();
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
    const clockText = formatChronicleDateTime(
      current.clockYear,
      current.clockMonth,
      current.clockDay,
      current.clockHour,
      current.clockMinute
    );
    requiredElement<HTMLOutputElement>("scenes-clock-date-out").value = clockText.date;
    requiredElement<HTMLOutputElement>("scenes-clock-time-out").value = clockText.time;
    const maxDay = daysInMonth(current.clockYear, current.clockMonth);
    const dayInput = requiredElement<HTMLInputElement>("scenes-clock-day");
    dayInput.max = String(maxDay);
    dayInput.value = String(current.clockDay);
    requiredElement<HTMLOutputElement>("scenes-clock-day-out").value = String(current.clockDay);
    requiredElement<HTMLInputElement>("scenes-clock-month").value = String(current.clockMonth);
    requiredElement<HTMLOutputElement>("scenes-clock-month-out").value =
      MONTH_NAMES[current.clockMonth - 1] ?? String(current.clockMonth);
    requiredElement<HTMLInputElement>("scenes-clock-year").value = String(current.clockYear);
    const weather = resolveWeatherAxes(current);
    const winter = isWinterWind(current.clockMonth, weather.snow);
    paintWeatherIcons(
      requiredElement<HTMLButtonElement>("scenes-weather-rain"),
      "/icons/scenes/rain.svg",
      rainIconCount(weather.rain),
      rainLabel(weather.rain),
      2
    );
    paintWeatherIcons(
      requiredElement<HTMLButtonElement>("scenes-weather-snow"),
      "/icons/scenes/snow.svg",
      snowIconCount(weather.snow),
      snowLabel(weather.snow),
      3
    );
    paintWeatherIcons(
      requiredElement<HTMLButtonElement>("scenes-weather-wind"),
      "/icons/scenes/wind.svg",
      windIconCount(weather.wind),
      windLabel(weather.wind, winter),
      3,
      winter && weather.wind !== "none"
    );
    paintWeatherIcons(
      requiredElement<HTMLButtonElement>("scenes-weather-thunder"),
      "/icons/scenes/thunder.svg",
      thunderIconCount(weather.thunder),
      weather.thunder ? "Thunderstorm" : "No thunder",
      1
    );
    const debugToggle = requiredElement<HTMLButtonElement>("scenes-debug-toggle");
    debugToggle.classList.toggle("lock", debugMode);
    debugToggle.classList.toggle("active", debugMode);
    const fillButton = requiredElement<HTMLButtonElement>("scenes-debug-fill");
    fillButton.hidden = !debugMode;
    fillButton.classList.toggle("lock", debugFillOn && !debugNamesLocked);
    fillButton.classList.toggle("active", debugFillOn && !debugNamesLocked);
    const restorePcsButton = requiredElement<HTMLButtonElement>("scenes-debug-restore-pcs");
    restorePcsButton.hidden = !debugMode;
    const fillLockButton = requiredElement<HTMLButtonElement>("scenes-debug-fill-lock");
    fillLockButton.hidden = !debugMode;
    fillLockButton.classList.toggle("lock", debugNamesLocked);
    fillLockButton.classList.toggle("active", debugNamesLocked);
    const nameOffsetsButton = requiredElement<HTMLButtonElement>("scenes-debug-name-offsets");
    nameOffsetsButton.hidden = !debugMode;
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
      if (debugMode && !debugFillOn) {
        for (const snap of snaps.polar) {
          const dot = document.createElement("div");
          dot.className = "scenes-debug-snap";
          placeToken(dot, snap.u, snap.v);
          overlay.append(dot);
        }
      }
      for (const token of draft.standard.polar) {
        const snap = snaps.polar.find((row) => row.snapIndex === token.snapIndex);
        if (!snap) {
          continue;
        }
        const el = makeToken(
          token.characterKey,
          token.npcLightMode !== "OFF",
          "",
          false,
          characterLabel(boardCatalogs, token.characterKey),
          `polar:${token.snapIndex}`
        );
        placeToken(el, snap.u, snap.v);
        applyPlacedTokenName(el, nameLayoutForPolarSnap(boardSnaps, snap), token.snapIndex);
        el.title = characterLabel(boardCatalogs, token.characterKey);
        if (!debugNamesLocked) {
          el.addEventListener("dblclick", () => {
            token.npcLightMode = token.npcLightMode === "OFF" ? "STANDARD" : "OFF";
            persist();
            render();
          });
        }
        overlay.append(el);
        if (!debugNamesLocked) {
          bindTokenDrag(el, token.characterKey, false, token.snapIndex);
        }
      }
      const familyIds = new Set(boardSnaps.polar.map((snap) => snap.familyId));
      for (const familyId of familyIds) {
        if (debugNamesLocked) {
          continue;
        }
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
        placeToken(handle, layout.leftPct / 100, 1 - layout.topPct / 100, "handle");
        overlay.append(handle);
        bindFamilyHandle(handle, familyId);
      }
      for (const [seatIndex, seat] of snaps.seats.entries()) {
        const row = draft.standard.seatSlots[seat.seatKey];
        if (!row || row.slotEmpty === true || row.characterKey === "") {
          continue;
        }
        const lit = row.isPresent === true && row.absentFromSession !== true;
        const el = makeToken(
          row.characterKey,
          lit,
          "scenes-token-seat",
          false,
          characterLabel(catalogs, row.characterKey),
          `seat:${seat.seatKey}:${row.characterKey}`
        );
        placeToken(el, seat.u, seat.v);
        applyPlacedTokenName(el, nameLayoutForSeat(seat, snaps.seats.length, seatIndex), undefined, seat.seatKey);
        el.title = `${characterLabel(catalogs, row.characterKey)} — ${seat.seatKey}`;
        if (!debugNamesLocked) {
          el.addEventListener("dblclick", () => {
            row.isPresent = !row.isPresent;
            persist();
            render();
          });
        }
        overlay.append(el);
        if (!debugNamesLocked) {
          bindTokenDrag(el, row.characterKey, false, undefined, seat.seatKey);
        }
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
          const el = makeToken(
            displayKey,
            row.isPresent,
            "scenes-token-center",
            false,
            characterLabel(boardCatalogs, displayKey),
            `scatter-center:${areaKey}:${pcKey}`
          );
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
          const el = makeToken(
            npcKey,
            row.npcLightMode !== "OFF",
            "",
            false,
            characterLabel(boardCatalogs, npcKey),
            `scatter-orbit:${npcKey}`
          );
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

    if (debugMode) {
      const reticule = document.createElement("button");
      reticule.type = "button";
      reticule.id = "scenes-reticule";
      reticule.className = "scenes-reticule";
      reticule.title = "Drop to copy board coordinates";
      reticule.setAttribute("aria-label", reticule.title);
      placeToken(reticule, reticuleUv.u, reticuleUv.v, "front");
      overlay.append(reticule);
      bindBoardDrag(reticule, {
        boardFrame,
        dragLayer,
        pickup: false,
        leaveOrigin: false,
        onMove: () => undefined,
        onEnd: (clientX, clientY) => {
          overlay.append(reticule);
          const uv = boardUvFromEvent(overlay, { clientX, clientY });
          if (!uv) {
            placeToken(reticule, reticuleUv.u, reticuleUv.v, "front");
            return;
          }
          reticuleUv = uv;
          placeToken(reticule, uv.u, uv.v, "front");
          const text = `${uv.u.toFixed(4)}, ${uv.v.toFixed(4)}`;
          void navigator.clipboard.writeText(text).then(
            () => setStatus("success", `Copied ${text}`),
            () => setStatus("error", "Could not copy coordinates.")
          );
        }
      });
    }
  };

  const render = (): void => {
    clearGhosts();
    killBoardDrags(dragLayer);
    renderChrome();
    renderBoard();
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
    return used;
  };

  const renderGroupTrays = (): void => {
    if (!catalogs) {
      return;
    }
    const used = usedNamedKeys();
    type TrayGroup = {
      label: string;
      themeClass: string;
      theme: string;
      important: boolean;
      keys: string[];
      npcs: Array<SceneCatalogs["namedNpcs"][number]>;
    };
    const groups = new Map<string, TrayGroup>();
    for (const npc of catalogs.namedNpcs) {
      const tags = npc.pickerGroups.length > 0 ? npc.pickerGroups : ["Ungrouped"];
      for (const tag of tags) {
        const label = trayMergeLabel(pickerGroupLabel(tag));
        const existing = groups.get(label);
        if (existing) {
          existing.important = existing.important || isImportantGroup(tag);
          if (!existing.npcs.some((row) => row.characterKey === npc.characterKey)) {
            existing.npcs.push(npc);
            existing.keys.push(tag);
          }
          continue;
        }
        groups.set(label, {
          label,
          themeClass: groupThemeClass(tag),
          theme: groupThemeClass(tag).replace("group-theme-", ""),
          important: isImportantGroup(tag),
          keys: [tag],
          npcs: [npc]
        });
      }
    }
    const ordered = [...groups.values()].sort((a, b) =>
      comparePickerGroups(a.keys[0] ?? a.label, b.keys[0] ?? b.label, pickerGroupLabel)
    );
    const themeOrder = [...GROUP_THEMES];
    groupTrays.replaceChildren();
    for (const theme of themeOrder) {
      const members = ordered.filter((row) => row.theme === theme);
      if (members.length === 0) {
        continue;
      }
      const block = document.createElement("div");
      block.className = `scenes-theme-block group-theme-${theme}`;
      for (const row of members) {
        const tray = document.createElement("div");
        tray.className = `scenes-group-tray ${row.themeClass}`;
        if (row.important) {
          tray.classList.add("important-group");
        }
        if (openPickerGroup === row.label) {
          tray.classList.add("open");
        }
        const chrome = document.createElement("div");
        chrome.className = "scenes-group-tray-chrome";
        const header = document.createElement("button");
        header.type = "button";
        header.className = "scenes-group-tray-header";
        header.textContent = row.label;
        let headerClickTimer: number | null = null;
        header.addEventListener("click", () => {
          if (headerClickTimer !== null) {
            window.clearTimeout(headerClickTimer);
          }
          headerClickTimer = window.setTimeout(() => {
            headerClickTimer = null;
            openPickerGroup = openPickerGroup === row.label ? null : row.label;
            render();
          }, 280);
        });
        header.addEventListener("dblclick", (event) => {
          event.preventDefault();
          if (headerClickTimer !== null) {
            window.clearTimeout(headerClickTimer);
            headerClickTimer = null;
          }
          if (!draft) {
            return;
          }
          const keys = new Set(row.npcs.map((npc) => npc.characterKey));
          const before = snapshotTokenRects();
          for (const token of [...draft.standard.polar]) {
            if (keys.has(token.characterKey)) {
              returnTokenOffBoard(token.characterKey, token.snapIndex);
            }
          }
          persist();
          render();
          flipTokensFrom(before);
        });
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "scenes-group-tray-drag";
        handle.title = `Place ${row.label} on the stage`;
        handle.setAttribute("aria-label", handle.title);
        const visibleNpcs = row.npcs
          .slice()
          .sort((a, b) => {
            const rankA = Math.min(...row.keys.map((key) => a.groupRanks?.[key] ?? Number.POSITIVE_INFINITY));
            const rankB = Math.min(...row.keys.map((key) => b.groupRanks?.[key] ?? Number.POSITIVE_INFINITY));
            return rankA - rankB;
          })
          .filter((npc) => !used.has(npc.characterKey));
        handle.disabled = visibleNpcs.length === 0;
        if (visibleNpcs.length > 0) {
          bindTrayHandle(handle, visibleNpcs.map((npc) => npc.characterKey));
        }
        chrome.append(header, handle);
        const body = document.createElement("div");
        body.className = "scenes-group-tray-body";
        for (const npc of visibleNpcs) {
          const el = makeToken(npc.characterKey, true, "scenes-token-palette");
          const hover = document.createElement("span");
          hover.className = "scenes-token-hover-name";
          hover.textContent = npc.fullName;
          el.append(hover);
          body.append(el);
          bindTokenDrag(el, npc.characterKey, true);
        }
        tray.append(chrome, body);
        block.append(tray);
      }
      groupTrays.append(block);
    }
  };

  const openPickerModal = (
    title: string,
    renderBody: (root: HTMLDivElement) => void,
    options?: {
      cardClass?: string;
      bodyClass?: string;
      footer?: (root: HTMLDivElement) => void;
      afterOpen?: () => void;
      hideHeader?: boolean;
    }
  ): void => {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = options?.hideHeader === true ? "modal-backdrop scenes-district-map-backdrop" : "modal-backdrop";
    const card = document.createElement("div");
    card.className = options?.cardClass ? `modal-card ${options.cardClass}` : "modal-card";
    const body = document.createElement("div");
    body.className = options?.bodyClass ? `modal-body ${options.bodyClass}` : "modal-body";
    renderBody(body);
    if (options?.hideHeader !== true) {
      const header = document.createElement("div");
      header.className = "modal-header";
      const heading = document.createElement("h2");
      heading.textContent = title;
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Close";
      close.addEventListener("click", closeModal);
      header.append(heading, close);
      card.append(header);
    }
    card.append(body);
    if (options?.footer) {
      const footer = document.createElement("div");
      footer.className = "scenes-district-map-footer";
      options.footer(footer);
      card.append(footer);
    }
    backdrop.append(card);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closeModal();
      }
    });
    modalRoot.append(backdrop);
    options?.afterOpen?.();
  };

  const openDistrictMapModal = (): void => {
    if (!catalogs || !draft) {
      return;
    }
    const currentDraft = draft;
    const pins = lockedDistrictPinPositions(catalogs.districts);
    openPickerModal(
      "District",
      (root) => {
        const map = document.createElement("div");
        map.className = "scenes-district-map";
        const img = document.createElement("img");
        img.src = DISTRICT_MAP_SRC;
        img.alt = "Map of Toronto";
        img.width = DISTRICT_MAP_WIDTH;
        img.height = DISTRICT_MAP_HEIGHT;
        img.draggable = false;
        map.append(img);
        const closeX = document.createElement("button");
        closeX.type = "button";
        closeX.className = "scenes-district-map-close";
        closeX.textContent = "X";
        closeX.setAttribute("aria-label", "Close district map");
        closeX.addEventListener("click", closeModal);
        map.append(closeX);
        for (const pin of pins) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "scenes-district-pin";
          if (currentDraft.districtKey === pin.key) {
            button.classList.add("active");
          }
          button.textContent = pin.name;
          button.dataset.districtKey = pin.key;
          button.style.left = `${pin.left}px`;
          button.style.top = `${pin.top}px`;
          button.addEventListener("click", () => {
            if (!draft) {
              return;
            }
            draft.districtKey = pin.key;
            persist();
            render();
            closeModal();
          });
          map.append(button);
        }
        root.append(map);
      },
      {
        cardClass: "scenes-district-map-card",
        bodyClass: "scenes-district-map-body",
        hideHeader: true
      }
    );
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
            closeModal();
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
            closeModal();
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
  const persistWeather = (): void => {
    if (!draft) {
      return;
    }
    const next = applyThunder({
      rain: draft.weatherRain,
      wind: draft.weatherWind,
      thunder: draft.weatherThunder,
      snow: draft.weatherSnow
    });
    draft.weatherRain = next.rain;
    draft.weatherWind = next.wind;
    draft.weatherThunder = next.thunder;
    persist();
    renderChrome();
  };

  requiredElement<HTMLButtonElement>("scenes-weather-rain").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    draft.weatherThunder = false;
    draft.weatherRain = cycleRain(draft.weatherRain);
    persistWeather();
  });
  requiredElement<HTMLButtonElement>("scenes-weather-snow").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    draft.weatherSnow = cycleSnow(draft.weatherSnow);
    persistWeather();
  });
  requiredElement<HTMLButtonElement>("scenes-weather-wind").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    draft.weatherThunder = false;
    draft.weatherWind = cycleWind(draft.weatherWind);
    persistWeather();
  });
  requiredElement<HTMLButtonElement>("scenes-weather-thunder").addEventListener("click", () => {
    if (!draft) {
      return;
    }
    draft.weatherThunder = !draft.weatherThunder;
    persistWeather();
  });
  requiredElement<HTMLButtonElement>("scenes-district").addEventListener("click", () => {
    if (!catalogs || !draft) {
      return;
    }
    openDistrictMapModal();
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

  requiredElement<HTMLButtonElement>("scenes-debug-toggle").addEventListener("click", () => {
    debugMode = !debugMode;
    if (!debugMode) {
      restoreDebugFill();
      persist();
    }
    render();
  });
  requiredElement<HTMLButtonElement>("scenes-debug-fill").addEventListener("click", () => {
    if (!debugMode || !draft) {
      return;
    }
    if (debugFillOn) {
      restoreDebugFill();
    } else {
      applyDebugFill();
    }
    persist();
    render();
  });
  requiredElement<HTMLButtonElement>("scenes-debug-fill-lock").addEventListener("click", () => {
    if (!debugMode || !draft) {
      return;
    }
    if (debugNamesLocked) {
      debugNamesLocked = false;
    } else {
      applyDebugFill();
      debugNamesLocked = true;
    }
    persist();
    render();
  });
  requiredElement<HTMLButtonElement>("scenes-debug-name-offsets").addEventListener("click", () => {
    const polar: Record<string, NameOffset> = {};
    const seats: Record<string, NameOffset> = {};
    for (const el of overlay.querySelectorAll<HTMLElement>("[data-token-id]")) {
      const id = el.dataset.tokenId ?? "";
      const ox = roundOffset(Number.parseFloat(el.style.getPropertyValue("--name-ox")) || 0);
      const oy = roundOffset(Number.parseFloat(el.style.getPropertyValue("--name-oy")) || 0);
      const align: NameAlign =
        el.dataset.nameAlign === "left" || el.dataset.nameAlign === "right" ? el.dataset.nameAlign : "center";
      const offset = { ox, oy, align };
      if (id.startsWith("polar:")) {
        polar[id.slice("polar:".length)] = offset;
      } else if (id.startsWith("seat:")) {
        const seatKey = id.slice("seat:".length).split(":")[0] ?? "";
        if (seatKey !== "") {
          seats[seatKey] = offset;
        }
      }
    }
    const text = formatNameOffsetsClipboard(polar, seats);
    void navigator.clipboard.writeText(text).then(
      () => {
        setStatus("success", "Name offsets copied to the clipboard.");
      },
      () => {
        setStatus("error", "Could not copy name offsets.");
      }
    );
  });
  requiredElement<HTMLButtonElement>("scenes-debug-restore-pcs").addEventListener("click", () => {
    if (!debugMode || !draft || !catalogs || !snaps) {
      return;
    }
    restoreDefaultPcSeats(draft, catalogs, snaps);
    persist();
    render();
  });

  copyButton.addEventListener("click", () => void copyJson());
  importButton.addEventListener("click", () => void importInTts());

  const syncLeftCollection = (): void => {
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-scenes-left-tab]")) {
      const id = button.dataset.scenesLeftTab;
      const on = id === leftCollection;
      button.classList.toggle("lock", on);
      button.classList.toggle("active", on);
      button.setAttribute("aria-selected", on ? "true" : "false");
    }
    groupTrays.hidden = leftCollection !== "main";
    requiredElement<HTMLDivElement>("scenes-left-panel-scenes").hidden = leftCollection !== "scenes";
    requiredElement<HTMLDivElement>("scenes-left-panel-generic").hidden = leftCollection !== "generic";
    requiredElement<HTMLDivElement>("scenes-left-panel-memoriam").hidden = leftCollection !== "memoriam";
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-scenes-left-tab]")) {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      const id = button.dataset.scenesLeftTab;
      if (id === "scenes" || id === "main" || id === "generic" || id === "memoriam") {
        leftCollection = id;
        syncLeftCollection();
      }
    });
  }
  syncLeftCollection();

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
        const parsed = JSON.parse(saved) as Partial<SceneDraft>;
        draft = { ...createDefaultDraft(catalogs, snaps), ...parsed };
        draft.standard = { ...createDefaultDraft(catalogs, snaps).standard, ...draft.standard };
        draft.scatter = { ...createDefaultDraft(catalogs, snaps).scatter, ...draft.scatter };
        if (parsed.weatherRain == null) {
          const axes = axesFromLegacyWeatherKey(typeof parsed.weatherKey === "string" ? parsed.weatherKey : "none");
          draft.weatherRain = axes.rain;
          draft.weatherWind = axes.wind;
          draft.weatherThunder = axes.thunder;
          draft.weatherSnow = axes.snow;
        }
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

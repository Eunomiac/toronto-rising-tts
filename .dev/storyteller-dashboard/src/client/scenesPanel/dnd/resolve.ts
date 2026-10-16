import { HOVER_BIN_ATTR, PANEL_BIN_ATTR, PANEL_EDGE_ATTR, rollCardAt } from "./mime";
import { matrixCell } from "./matrix";
import type { ClientPoint, DragKind, DropKind, DropTarget, MatrixCell, PanelEdge } from "./types";

const panelEdgeFrom = (element: Element | null): PanelEdge | null => {
  const root = element?.closest<HTMLElement>(`[${PANEL_EDGE_ATTR}]`);
  const edge = root?.getAttribute(PANEL_EDGE_ATTR);
  return edge === "A" || edge === "B" || edge === "C" ? edge : null;
};

const binTarget = (element: Element | null): DropTarget | null => {
  const bin = element?.closest<HTMLElement>(`[${PANEL_BIN_ATTR}]`);
  if (!bin) {
    return null;
  }
  const edge = panelEdgeFrom(bin);
  if (!edge) {
    return null;
  }
  const dropKind = edge === "A" ? "panelA" : edge === "B" ? "panelB" : "panelC";
  return { dropKind, binId: bin.getAttribute(PANEL_BIN_ATTR) ?? undefined };
};

const hoverBinTarget = (element: Element | null): DropTarget | null => {
  const bin = element?.closest<HTMLElement>(`[${HOVER_BIN_ATTR}]`);
  if (!bin) {
    return null;
  }
  const dropKind = (bin.getAttribute("data-tr-dnd-hover-drop") as DropKind | null) ?? "out";
  return { dropKind, binId: bin.getAttribute(HOVER_BIN_ATTR) ?? undefined };
};

/** Hit-test order from the plan: bins → roll → drawer → seat → pack → token → roster → deck → scene → stage → out. */
export const hitTestDrop = (point: ClientPoint): DropTarget => {
  const stack = document.elementsFromPoint(point.x, point.y);
  for (const element of stack) {
    const hover = hoverBinTarget(element);
    if (hover) {
      return hover;
    }
    const panel = binTarget(element);
    if (panel) {
      return panel;
    }
    const drawer = element.closest<HTMLElement>("[data-tr-dnd-drawer]");
    if (drawer) {
      const slot = Number(drawer.getAttribute("data-tr-dnd-drawer") ?? "0");
      return { dropKind: "rollDrawer", slot };
    }
    const seat = element.closest<HTMLElement>("[data-chair]");
    if (seat) {
      const chair = Number(seat.getAttribute("data-chair"));
      const holder = seat.getAttribute("data-chair-holder") ?? undefined;
      const seatKey = seat.getAttribute("data-seat-key") ?? undefined;
      if (!holder) {
        return { dropKind: "emptySeat", chair, seatKey };
      }
      const isPc = seat.getAttribute("data-chair-kind") === "pc";
      return {
        dropKind: isPc ? "pcSeated" : "npcSeated",
        chair,
        seatKey,
        holderKey: holder
      };
    }
    const pack = element.closest<HTMLElement>("[data-tr-dnd-pack]");
    if (pack) {
      return { dropKind: "pack", packId: pack.getAttribute("data-tr-dnd-pack") ?? undefined };
    }
    const staged = element.closest<HTMLElement>("[data-tr-dnd-staged]");
    if (staged) {
      return { dropKind: "npcStaged", characterKey: staged.getAttribute("data-tr-dnd-staged") ?? undefined };
    }
    const roster = element.closest<HTMLElement>("[data-tr-dnd-roster]");
    if (roster) {
      return { dropKind: "npcRoster", characterKey: roster.getAttribute("data-tr-dnd-roster") ?? undefined };
    }
    const deck = element.closest<HTMLElement>("[data-tr-dnd-deck]");
    if (deck) {
      const status = deck.getAttribute("data-tr-dnd-deck-status");
      const sceneKey = deck.getAttribute("data-tr-dnd-deck") ?? undefined;
      if (status === "ongoing") {
        return { dropKind: "sceneOnDeckOngoing", sceneKey };
      }
      return { dropKind: "sceneOnDeckNew", sceneKey };
    }
    const active = element.closest<HTMLElement>("[data-tr-dnd-scene-active]");
    if (active) {
      return { dropKind: "sceneActive", sceneKey: active.getAttribute("data-tr-dnd-scene-active") ?? undefined };
    }
    const stage = element.closest<HTMLElement>("[data-tr-dnd-stage]");
    if (stage) {
      return { dropKind: "stage" };
    }
  }

  const roll = rollCardAt(point.x, point.y);
  if (roll) {
    const kind = roll.getAttribute("data-tr-dnd-roll") as DropKind | null;
    const color = roll.getAttribute("data-tr-dnd-roll-color") ?? undefined;
    if (kind === "pcRollPreroll" || kind === "pcRollPostroll") {
      return { dropKind: kind, color: color ?? "" };
    }
    if (kind === "npcRollPreroll" || kind === "npcRollPostrollRevealed" || kind === "npcRollPostrollSecret") {
      return { dropKind: kind };
    }
  }

  return { dropKind: "out" };
};

export const cellForDrop = (drag: DragKind, target: DropTarget): MatrixCell => matrixCell(drag, target.dropKind);

export const resolveBinAction = (
  drag: DragKind,
  target: DropTarget
): { readonly action: string; readonly secretSafe?: boolean } | null => {
  const cell = cellForDrop(drag, target);
  if (cell.kind === "panel" || cell.kind === "hover") {
    const binId = "binId" in target ? target.binId : undefined;
    const found = cell.bins.find((bin) => bin.id === binId);
    return found ? { action: found.action, secretSafe: found.secretSafe } : null;
  }
  if (cell.kind === "action") {
    return { action: cell.action, secretSafe: cell.secretSafe };
  }
  if (cell.kind === "noop" || cell.kind === "impossible") {
    return { action: cell.kind };
  }
  return null;
};

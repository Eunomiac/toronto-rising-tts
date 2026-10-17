import { HOVER_BIN_ATTR, PANEL_BIN_ATTR, PANEL_EDGE_ATTR } from "./mime";
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

/** Hit-test order from the plan: bins → roll → drawer → seat → token → pack → roster → deck → scene → stage → out. */
export const hitTestDrop = (point: ClientPoint): DropTarget => {
  const stack = document.elementsFromPoint(point.x, point.y);
  // Inspect each class across the entire stack before considering broader containers.
  // A stage ancestor must never mask a roll card or bin higher in the stack.
  for (const element of stack) {
    const bin = hoverBinTarget(element) ?? binTarget(element);
    if (bin) return bin;
  }
  for (const element of stack) {
    const panel = panelEdgeFrom(element);
    if (panel) return { dropKind: panel === "A" ? "panelA" : panel === "B" ? "panelB" : "panelC" };
  }
  for (const element of stack) {
    const roll = element.closest<HTMLElement>("[data-tr-dnd-roll]");
    if (!roll) continue;
    const dropKind = roll.getAttribute("data-tr-dnd-roll") as DropKind;
    if (dropKind === "pcRollPreroll" || dropKind === "pcRollPostroll") {
      return { dropKind, color: roll.getAttribute("data-tr-dnd-roll-color") ?? "" };
    }
    return { dropKind };
  }
  const closestAt = (selector: string): HTMLElement | undefined => {
    for (const element of stack) {
      const match = element.closest<HTMLElement>(selector);
      if (match) return match;
    }
    return undefined;
  };
  const drawer = closestAt("[data-tr-dnd-drawer]");
  if (drawer) return { dropKind: "rollDrawer", slot: Number(drawer.getAttribute("data-tr-dnd-drawer")) };
  const seat = closestAt("[data-chair]");
  if (seat) {
    const chair = Number(seat.getAttribute("data-chair"));
    const holder = seat.getAttribute("data-chair-holder") ?? undefined;
    const seatKey = seat.getAttribute("data-seat-key") ?? undefined;
    if (!holder) return { dropKind: "emptySeat", chair, seatKey };
    const isPc = seat.getAttribute("data-chair-kind") === "pc";
    return { dropKind: isPc ? "pcSeated" : "npcSeated", chair, seatKey, holderKey: isPc ? seatKey : holder };
  }
  // Tokens remain targets even when a decorative pack handle sits above/behind them.
  const staged = closestAt("[data-tr-dnd-staged]");
  if (staged) return { dropKind: "npcStaged", characterKey: staged.getAttribute("data-tr-dnd-staged") ?? undefined };
  const pack = closestAt("[data-tr-dnd-pack]");
  if (pack) return { dropKind: "pack", packId: pack.getAttribute("data-tr-dnd-pack") ?? undefined };
  const roster = closestAt("[data-tr-dnd-roster]");
  if (roster) return { dropKind: "npcRoster", characterKey: roster.getAttribute("data-tr-dnd-roster") ?? undefined };
  const deck = closestAt("[data-tr-dnd-deck]");
  if (deck) return {
    dropKind: deck.getAttribute("data-tr-dnd-deck-status") === "ongoing" ? "sceneOnDeckOngoing" : "sceneOnDeckNew",
    sceneKey: deck.getAttribute("data-tr-dnd-deck") ?? undefined
  };
  const active = closestAt("[data-tr-dnd-scene-active]");
  if (active) return { dropKind: "sceneActive", sceneKey: active.getAttribute("data-tr-dnd-scene-active") ?? undefined };
  if (closestAt("[data-tr-dnd-stage]")) return { dropKind: "stage" };

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
  if (cell.kind === "conditional") return { action: cell.action };
  if (cell.kind === "action") {
    return { action: cell.action, secretSafe: cell.secretSafe };
  }
  if (cell.kind === "noop" || cell.kind === "impossible") {
    return { action: cell.kind };
  }
  return null;
};

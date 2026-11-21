import type { DragKind } from "./types";

/** Category labels in the NPC roster. A group drop here is filed by the header, not the stage matrix. */
export const ROSTER_CATEGORY_DROP_ATTR = "data-tr-roster-category";

export const isRosterCategoryFilingTarget = (dragKind: DragKind | undefined, target: EventTarget | null): boolean =>
  dragKind === "npcRosterGroup"
  && target instanceof Element
  && target.closest(`[${ROSTER_CATEGORY_DROP_ATTR}]`) !== null;

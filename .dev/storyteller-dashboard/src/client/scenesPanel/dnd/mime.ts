/** MIME / DOM bridge constants for Scenes DnD (re-exported from stage for a single import surface). */

export {
  GROUP_DRAG_TYPE,
  NPC_DRAG_TYPE,
  NPC_ROLL_DROP_ATTR,
  NPC_ROLL_DROP_EVENT,
  SEAT_DRAG_TYPE,
  rollCardAt
} from "../stage";

/** PC or NPC roll card dragged from the Rolls column. */
export const ROLL_DRAG_TYPE = "application/x-tr-roll";

/** On-deck or active scene chip. */
export const SCENE_DRAG_TYPE = "application/x-tr-scene";

/** Marks a slide-out drop bin. */
export const PANEL_BIN_ATTR = "data-tr-dnd-bin";

/** Marks a HOVER ring bin. */
export const HOVER_BIN_ATTR = "data-tr-dnd-hover-bin";

/** Marks an edge panel root (A|B|C). */
export const PANEL_EDGE_ATTR = "data-tr-dnd-panel";

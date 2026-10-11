import type { LibraryScene } from "../../shared/sceneLibrary";
import type { SeatRow } from "../worldState";
import { isSeatColor, NPC_SEATS } from "../catalogVocab";
import { applyToDraft, draftSeatSlots, holderOfChair, npcOf } from "./library";

/**
 * The seating strip shown before a scene switch: the next scene's seats, starting from the table's. The
 * destination's library seating is the base and wins every clash; NPCs seated at the table carry over into the
 * chair they hold when it is free there, and otherwise wait as orphans (left behind unless placed on a chair).
 * PCs keep their destination chairs and presence; only their presence is toggled.
 */
export type TransitionSeating = {
  /** The destination row with the strip's seating edits. */
  readonly row: LibraryScene;
  /** NPCs without a chair in the next scene, in the order they were left out. */
  readonly orphans: readonly string[];
};

/** The strip's seating, laid onto the row that is played (a template's dated copy, or the scene itself). */
export type SeatingEdit = (row: LibraryScene) => LibraryScene;

type Row = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);

const npcSeatOf = (row: LibraryScene, characterKey: string): string | undefined =>
  NPC_SEATS.find((seat) => npcOf(draftSeatSlots(row)[seat]) === characterKey);

const onStage = (row: LibraryScene, characterKey: string): boolean => {
  const world = row.sessionScene.npcWorld;
  return isRecord(world) && isRecord(world.placements) && characterKey in world.placements;
};

const emptySeat = (row: LibraryScene, seat: string): LibraryScene => {
  const slots = draftSeatSlots(row);
  const prior = slots[seat];
  const { characterKey: _gone, ...kept } = isRecord(prior) ? prior : {};
  return { ...row, sessionScene: { ...row.sessionScene, seatSlots: { ...slots, [seat]: { ...kept, slotEmpty: true } } } };
};

/** The strip's starting state: the destination's seating, plus the table's seated NPCs it does not already place. */
export const carryOverSeating = (destination: LibraryScene, table: readonly SeatRow[]): TransitionSeating => {
  let row = destination;
  const orphans: string[] = [];
  const seated = table
    .filter((seat) => seat.kind === "npc" && seat.slotEmpty !== true && seat.characterKey && typeof seat.tableSlot === "number")
    .sort((a, b) => (a.tableSlot ?? 0) - (b.tableSlot ?? 0));
  for (const seat of seated) {
    const characterKey = seat.characterKey!;
    if (npcSeatOf(row, characterKey) !== undefined || onStage(row, characterKey)) {
      continue;
    }
    const next = applyToDraft(row, { op: "seatNpc", characterKey, chair: seat.tableSlot! });
    if (next === row) {
      orphans.push(characterKey);
      continue;
    }
    const placed = npcSeatOf(next, characterKey)!;
    row = seat.isPresent ? next : applyToDraft(next, { op: "seatPresence", seat: placed, present: false });
  }
  return { row, orphans };
};

/** A seated NPC dragged off the strip: their chair empties and they join the orphans. */
export const orphanNpc = (state: TransitionSeating, characterKey: string): TransitionSeating => {
  const seat = npcSeatOf(state.row, characterKey);
  return seat === undefined
    ? state
    : { row: emptySeat(state.row, seat), orphans: [...state.orphans.filter((key) => key !== characterKey), characterKey] };
};

/** An orphan dropped on a chair; an NPC already there swaps out to the orphans. PC chairs refuse the drop. */
export const seatOrphan = (state: TransitionSeating, characterKey: string, chair: number): TransitionSeating => {
  const holder = holderOfChair(draftSeatSlots(state.row), chair);
  if (isSeatColor(holder)) {
    return state;
  }
  const held = holder === undefined ? undefined : npcOf(draftSeatSlots(state.row)[holder]);
  const cleared = held === undefined ? state : orphanNpc(state, held);
  const row = applyToDraft(cleared.row, { op: "seatNpc", characterKey, chair });
  return row === cleared.row ? state : { row, orphans: cleared.orphans.filter((key) => key !== characterKey) };
};

/** `target` with the seating (seat rows, presence mirror, stage placements) of `edited`. */
export const withSeatingOf = (target: LibraryScene, edited: LibraryScene): LibraryScene => {
  const { seatSlots, seatPresent, npcWorld } = edited.sessionScene;
  const ownWorld = isRecord(target.sessionScene.npcWorld) ? target.sessionScene.npcWorld : {};
  const placements = isRecord(npcWorld) ? npcWorld.placements : undefined;
  return {
    ...target,
    sessionScene: {
      ...target.sessionScene,
      ...(seatSlots !== undefined ? { seatSlots } : {}),
      ...(seatPresent !== undefined ? { seatPresent } : {}),
      npcWorld: { ...ownWorld, ...(placements !== undefined ? { placements } : {}) }
    }
  };
};

/** Whether the strip changed the destination's seating at all. */
export const seatingChanged = (destination: LibraryScene, edited: LibraryScene): boolean =>
  JSON.stringify(withSeatingOf(destination, edited).sessionScene) !== JSON.stringify(withSeatingOf(destination, destination).sessionScene);

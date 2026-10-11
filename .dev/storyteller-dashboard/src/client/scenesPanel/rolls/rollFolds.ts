import type { RollsSlice } from "../../worldState";

/** Fold key for the live NPC roll (PC rolls fold by seat colour). */
export const NPC_FOLD = "npc";
export const slotFold = (index: number): string => `drawer-${index}`;

/**
 * Which roll cards have been shown to the table: a PC roll once it is done, a finished drawer once it is no
 * longer held. Cards still in play map to false.
 */
export const broadcastStates = (rolls: RollsSlice): ReadonlyMap<string, boolean> => {
  const states = new Map<string, boolean>();
  for (const roll of rolls.pcs) {
    states.set(roll.color, roll.done === true);
  }
  const liveSlot = rolls.storyteller.live?.slot;
  for (const slot of rolls.storyteller.slots) {
    const finished = slot.result !== undefined && liveSlot !== slot.index;
    states.set(slotFold(slot.index), finished && slot.pendingBroadcast !== true);
  }
  return states;
};

/**
 * Cards fold when their roll is broadcast and unfold when a new roll starts in the same seat or drawer, so a
 * fold never carries over into the next roll.
 */
export const foldChanges = (
  before: ReadonlyMap<string, boolean>,
  after: ReadonlyMap<string, boolean>
): { readonly fold: readonly string[]; readonly unfold: readonly string[] } => {
  const fold: string[] = [];
  const unfold: string[] = [];
  for (const [key, broadcast] of after) {
    const was = before.get(key);
    if (broadcast && was !== true) {
      fold.push(key);
    } else if (!broadcast && was === true) {
      unfold.push(key);
    }
  }
  return { fold, unfold };
};

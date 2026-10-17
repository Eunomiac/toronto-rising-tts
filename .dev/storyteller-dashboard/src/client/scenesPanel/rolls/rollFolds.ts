import type { RollsSlice } from "../../worldState";

export const NPC_FOLD = "npc";
export const slotFold = (index: number): string => `drawer-${index}`;

/** Manual folds follow one roll only. Broadcasts never fold cards automatically. */
export const rollCardKeys = (rolls: RollsSlice): ReadonlyMap<string, string> => {
  const keys = new Map<string, string>();
  for (const roll of rolls.pcs) keys.set(roll.color, roll.rollId ?? `${roll.name}:${roll.rollType}`);
  const live = rolls.storyteller.live;
  if (live) keys.set(NPC_FOLD, live.rollId ?? `${live.npcCharacterKey}:${live.label}:${live.slot}`);
  for (const slot of rolls.storyteller.slots) {
    keys.set(slotFold(slot.index), `${slot.label}:${slot.rollType}:${slot.live}`);
  }
  return keys;
};

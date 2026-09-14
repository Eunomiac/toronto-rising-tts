import type { NpcLightMode, PolarToken, SeatSlotRow } from "./types.js";

export const swapOntoPolarSnap = (
  tokens: PolarToken[],
  characterKey: string,
  destSnapIndex: number,
  sourceSnapIndex: number | undefined,
  light: NpcLightMode
): PolarToken[] => {
  if (sourceSnapIndex === destSnapIndex) {
    const existing = tokens.find((token) => token.characterKey === characterKey);
    if (existing) {
      return tokens;
    }
  }
  const occupant = tokens.find((token) => token.snapIndex === destSnapIndex && token.characterKey !== characterKey);
  const withoutMover = tokens.filter((token) => token.characterKey !== characterKey);
  let next = withoutMover;
  if (occupant && sourceSnapIndex !== undefined) {
    next = withoutMover.map((token) =>
      token.characterKey === occupant.characterKey ? { ...token, snapIndex: sourceSnapIndex } : token
    );
  } else if (occupant) {
    next = withoutMover.filter((token) => token.characterKey !== occupant.characterKey);
  }
  return [...next, { characterKey, snapIndex: destSnapIndex, npcLightMode: light }];
};

const cloneSeat = (row: SeatSlotRow): SeatSlotRow => ({ ...row });

const emptySeat = (): SeatSlotRow => ({
  characterKey: "",
  isPlayingNPC: false,
  isPresent: false,
  slotEmpty: true
});

export const swapSeatOccupants = (
  seats: Record<string, SeatSlotRow>,
  sourceKey: string,
  destKey: string
): Record<string, SeatSlotRow> => {
  if (sourceKey === destKey) {
    return seats;
  }
  const source = seats[sourceKey];
  const dest = seats[destKey];
  if (!source || !dest) {
    return seats;
  }
  return {
    ...seats,
    [sourceKey]: { ...cloneSeat(dest), tableSlot: source.tableSlot },
    [destKey]: { ...cloneSeat(source), tableSlot: dest.tableSlot }
  };
};

export const moveSeatOccupant = (
  seats: Record<string, SeatSlotRow>,
  sourceKey: string,
  destKey: string
): Record<string, SeatSlotRow> => {
  if (sourceKey === destKey) {
    return seats;
  }
  const source = seats[sourceKey];
  const dest = seats[destKey];
  if (!source || !dest) {
    return seats;
  }
  const destTaken = dest.slotEmpty !== true && dest.characterKey !== "" && dest.characterKey !== source.characterKey;
  if (destTaken) {
    return swapSeatOccupants(seats, sourceKey, destKey);
  }
  return {
    ...seats,
    [destKey]: { ...cloneSeat(source), tableSlot: dest.tableSlot, slotEmpty: false },
    [sourceKey]: { ...emptySeat(), tableSlot: source.tableSlot }
  };
};


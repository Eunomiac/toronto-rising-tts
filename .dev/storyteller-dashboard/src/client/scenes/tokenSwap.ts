import type { NpcLightMode, PolarToken } from "./types.js";

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

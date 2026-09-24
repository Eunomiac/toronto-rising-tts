/** Banked XP = newTotal of the highest session key in an Experience Log object. */
export const bankedXpFromLog = (xp: unknown): number => {
  if (typeof xp === "number" && Number.isFinite(xp)) {
    return Math.floor(xp);
  }
  if (typeof xp !== "object" || xp === null || Array.isArray(xp)) {
    return 0;
  }
  let maxKey: number | null = null;
  let banked = 0;
  for (const [key, block] of Object.entries(xp as Record<string, unknown>)) {
    const sessionNum = Number(key);
    if (!Number.isFinite(sessionNum)) {
      continue;
    }
    if (typeof block !== "object" || block === null || Array.isArray(block)) {
      continue;
    }
    if (maxKey === null || sessionNum > maxKey) {
      maxKey = sessionNum;
      const total = (block as { newTotal?: unknown }).newTotal;
      banked = typeof total === "number" && Number.isFinite(total) ? Math.floor(total) : 0;
    }
  }
  return banked;
};

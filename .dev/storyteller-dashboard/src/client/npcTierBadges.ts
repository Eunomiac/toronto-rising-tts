import type { NpcTier } from "../shared/npcStats";

const badges = import.meta.glob<string>("/assets/badges/tier_*.svg", { query: "?url", import: "default", eager: true });

/** `assets/badges/tier_<tier>.svg`. */
export const tierBadgeSrc = (tier: NpcTier): string => {
  const src = badges[`/assets/badges/tier_${tier}.svg`];
  if (!src) {
    throw new Error(`Missing tier badge assets/badges/tier_${tier}.svg.`);
  }
  return src;
};

export const TIER_LABELS: Record<NpcTier, string> = { weak: "Weak", average: "Average", gifted: "Gifted", deadly: "Deadly" };

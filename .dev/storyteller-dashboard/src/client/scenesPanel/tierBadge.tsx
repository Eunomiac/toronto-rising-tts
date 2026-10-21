import type { ReactElement } from "react";
import type { MemoriamYear } from "../../shared/memoriamNpc";
import type { NpcTier } from "../../shared/npcStats";
import { useMemoriamCatalog } from "../memoriamCatalog";
import { TIER_LABELS, tierBadgeSrc } from "../npcTierBadges";

const yearBadges = import.meta.glob<string>("/assets/badges/year_*.svg", { query: "?url", import: "default", eager: true });
const yearBadgeSrc = (year: MemoriamYear): string => {
  const filename = year === "Modern" ? "year_Modern.svg" : `year_${year}.svg`;
  const src = yearBadges[`/assets/badges/${filename}`];
  if (!src) throw new Error(`Missing year badge assets/badges/${filename}.`);
  return src;
};

export const TokenBadges = ({ characterKey, tier, where }: {
  characterKey: string;
  tier?: NpcTier | undefined;
  where: "stage" | "bin" | "seat";
}): ReactElement | null => {
  const memoriam = useMemoriamCatalog().find((npc) => npc.key === characterKey);
  const years = memoriam?.years ?? [];
  if (!tier && years.length === 0) return null;
  return (
    <span className={`npc-token-badges ${where}`}>
      {tier && <img src={tierBadgeSrc(tier)} alt={TIER_LABELS[tier]} title={`${TIER_LABELS[tier]} tier`} draggable={false} />}
      {years.map((year) => <img key={year} src={yearBadgeSrc(year)} alt={year} title={`Memoriam: ${year}`} draggable={false} />)}
    </span>
  );
};

export const TierBadge = ({ tier, where }: { tier: NpcTier; where: "stage" | "bin" | "seat" }): ReactElement => (
  <span className={`npc-token-badges ${where}`}>
    <img src={tierBadgeSrc(tier)} alt={TIER_LABELS[tier]} title={`${TIER_LABELS[tier]} tier`} draggable={false} />
  </span>
);

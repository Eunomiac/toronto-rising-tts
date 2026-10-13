import type { ReactElement } from "react";
import type { NpcTier } from "../../shared/npcStats";
import { TIER_LABELS, tierBadgeSrc } from "../npcTierBadges";

/** A generic NPC's stat tier, pinned to the corner of its token (`where` picks the corner rules). */
export const TierBadge = ({ tier, where }: { tier: NpcTier; where: "stage" | "bin" | "seat" }): ReactElement => (
  <img className={`npc-tier-badge ${where}`} src={tierBadgeSrc(tier)} alt={TIER_LABELS[tier]} title={`${TIER_LABELS[tier]} tier`} draggable={false} />
);

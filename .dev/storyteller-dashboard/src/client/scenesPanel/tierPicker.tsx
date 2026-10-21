import type { ReactElement } from "react";
import type { NpcTier } from "../../shared/npcStats";
import { TIER_LABELS, tierBadgeSrc } from "../npcTierBadges";
import { CANVAS_H, CANVAS_W, Overlay } from "./sketch";

const PICKER_WIDTH = 330;

/** Which of a generic type's configured tiers a new figurine gets; opens where the roster token was clicked. */
export const TierPicker = ({ at, title, tiers, onPick, onClose }: {
  at: { readonly x: number; readonly y: number };
  title: string;
  tiers: readonly NpcTier[];
  onPick: (tier: NpcTier) => void;
  onClose: () => void;
}): ReactElement => {
  const width = Math.min(CANVAS_W - 16, Math.max(PICKER_WIDTH, tiers.length * 84 + 30));
  const left = Math.max(8, Math.min(at.x, CANVAS_W - width - 8));
  const top = Math.max(8, Math.min(at.y, CANVAS_H - 140));
  return (
  <Overlay onClose={onClose}>
    <div className="lab-modal npc-tier-picker" style={{ left, top, width }}>
      <span className="lab-modal-title">{title}: which tier?</span>
      <div className="npc-tier-picker-row">
        {tiers.map((tier) => (
          <button key={tier} type="button" className="lab-btn npc-tier-pick" onClick={() => onPick(tier)}>
            <img src={tierBadgeSrc(tier)} alt="" draggable={false} />
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>
    </div>
  </Overlay>
  );
};

import { useMemo, useState, type ReactElement } from "react";
import type { NpcTier } from "../../shared/npcStats";
import { Overlay } from "./sketch";
import type { PlayAsNpcAsk, PlayAsNpcConfirm } from "./playAsNpc";

const TIER_LABEL: Record<NpcTier, string> = {
  weak: "Weak",
  average: "Average",
  gifted: "Gifted",
  deadly: "Deadly",
  superhuman: "Superhuman",
};

/**
 * Confirm Play-as-NPC after dropping an NPC token on a seated PC.
 * Generics: pick a tier that has stats (when any), set a display name, edit Roleplay Notes.
 */
export const PlayAsNpcModal = ({
  ask,
  onClose,
  onConfirm,
}: {
  ask: PlayAsNpcAsk;
  onClose: () => void;
  onConfirm: (confirm: PlayAsNpcConfirm) => void;
}): ReactElement => {
  const [notes, setNotes] = useState(ask.seedRoleplayNotes);
  const [displayName, setDisplayName] = useState(ask.seedDisplayName ?? ask.npcLabel);
  const [tier, setTier] = useState<NpcTier | undefined>(
    ask.seedTier ?? ask.availableTiers[0]
  );
  const canConfirm = useMemo(() => {
    if (!ask.isGeneric) return true;
    if (ask.availableTiers.length === 0) return displayName.trim() !== "";
    return tier !== undefined && displayName.trim() !== "";
  }, [ask.isGeneric, ask.availableTiers.length, displayName, tier]);

  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal play-as-npc-modal" role="dialog" aria-label="Assign Play as NPC">
        <h2>Play as NPC</h2>
        <p className="lab-note">
          {ask.pcName} ({ask.color}) will portray <strong>{ask.npcLabel}</strong>.
        </p>
        {ask.isGeneric && (
          <>
            <label className="lab-field">
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoFocus
              />
            </label>
            {ask.availableTiers.length > 0 && (
              <div className="lab-field" role="group" aria-label="Tier">
                <span>Tier</span>
                <div className="lab-btn-row">
                  {ask.availableTiers.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`lab-btn${tier === value ? " on" : ""}`}
                      onClick={() => setTier(value)}
                    >
                      {TIER_LABEL[value] ?? value}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <label className="lab-field">
          <span>Roleplay Notes</span>
          <textarea
            rows={8}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes for the player while portraying this NPC"
          />
        </label>
        <div className="lab-btn-row">
          <button type="button" className="lab-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="lab-btn gold"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                color: ask.color,
                npcKey: ask.npcKey,
                roleplayNotes: notes,
                ...(ask.isGeneric
                  ? {
                      displayName: displayName.trim(),
                      ...(tier !== undefined ? { tier } : {}),
                    }
                  : {}),
              })
            }
          >
            Confirm
          </button>
        </div>
      </div>
    </Overlay>
  );
};

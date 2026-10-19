import { useState, type ReactElement, type ReactNode } from "react";
import { parseNpcDifficulty, type NpcRollMetadata } from "../../shared/npcCustomRolls";

/** Open from the name field and stay open while focus moves into either editing bar. */
export const NpcCustomRollFields = ({ label, metadata, onChange, children }: {
  label: string;
  metadata: NpcRollMetadata;
  onChange: (patch: Partial<NpcRollMetadata>) => void;
  children: ReactNode;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const rule = parseNpcDifficulty(metadata.difficulty ?? "");
  const trait = (at: 0 | 1, value: string): void => {
    const pair: [string, string] = [metadata.traits?.[0] ?? "", metadata.traits?.[1] ?? ""];
    pair[at] = value;
    onChange({ traits: pair });
  };
  return (
    <div className={`npc-custom-roll${open ? " editing" : ""}`}
      onFocusCapture={(event) => { if (event.target.hasAttribute("data-roll-name")) setOpen(true); }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <div className="npc-roll-bar pools" aria-hidden={!open} inert={!open}>
        <div className="npc-roll-bar-inner">
          <span className="npc-roll-bar-label">Pools</span>
          <input aria-label={`${label} first trait`} placeholder="Attribute / trait" maxLength={80}
            value={metadata.traits?.[0] ?? ""} onChange={(event) => trait(0, event.target.value)} />
          <span>+</span>
          <input aria-label={`${label} second trait`} placeholder="Skill / trait" maxLength={80}
            value={metadata.traits?.[1] ?? ""} onChange={(event) => trait(1, event.target.value)} />
        </div>
      </div>
      {children}
      <div className="npc-roll-bar difficulties" aria-hidden={!open} inert={!open}>
        <div className="npc-roll-bar-inner">
          <label className="npc-roll-bar-label">Difficulty
            <input aria-label={`${label} difficulty rule`} placeholder="3, 2-5, 4+" maxLength={20}
              aria-invalid={rule === null} value={metadata.difficulty ?? ""}
              onChange={(event) => onChange({ difficulty: event.target.value })} />
          </label>
          <span className={`npc-roll-rule-hint${rule === null ? " invalid" : ""}`} role={rule === null ? "alert" : undefined}>
            {rule === null ? "Use 0–15, a range, or a minimum +" : rule?.kind === "fixed" ? `Starts at ${rule.min}`
              : rule?.kind === "range" ? `Only ${rule.min}–${rule.max}` : rule ? `${rule.min}+ or –` : "Optional"}
          </span>
        </div>
      </div>
    </div>
  );
};

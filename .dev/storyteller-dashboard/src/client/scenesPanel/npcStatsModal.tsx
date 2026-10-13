import { useState, type ReactElement, type ReactNode } from "react";
import {
  configuredSlots,
  newStatId,
  normalizeStatBlock,
  NPC_CLANS,
  NPC_KINDS,
  NPC_RANKS,
  NPC_TIERS,
  poolOptions,
  RANGES,
  supernaturalPoolName,
  usesRouse,
  type KeptNpc,
  type NpcKind,
  type NpcStatBlock,
  type NpcStats,
  type NpcStatSlot
} from "../../shared/npcStats";
import { saveNpcStats, useNpcStats } from "../npcStats";
import { TIER_LABELS, tierBadgeSrc } from "../npcTierBadges";
import { Overlay } from "./sketch";

type Num = number | undefined;
type DraftPool = { id: string; name: string; dice?: Num };
type DraftAttack = { id: string; name: string; pool: string; bonus?: Num };
type DraftPower = { level: number; name: string; rouse?: Num; pool: string; ancilla?: boolean };
type DraftCategory = { id: string; name: string; dots?: Num; powers: DraftPower[] };
type DraftBlock = {
  kind?: NpcKind | undefined;
  generation?: Num;
  clan?: string | undefined;
  rank?: string | undefined;
  bloodPotency?: Num;
  humanity?: Num;
  difficultyStrong?: Num;
  difficultyWeak?: Num;
  health?: Num;
  willpower?: Num;
  physical?: Num;
  social?: Num;
  mental?: Num;
  supernatural?: Num;
  exceptional: DraftPool[];
  attacks: DraftAttack[];
  powers: DraftCategory[];
  notes: string;
};

const toDraft = (block: NpcStatBlock | undefined): DraftBlock => ({
  ...block,
  exceptional: (block?.exceptional ?? []).map((pool) => ({ ...pool })),
  attacks: (block?.attacks ?? []).map((attack) => ({ ...attack })),
  powers: (block?.powers ?? []).map((category) => ({ ...category, id: newStatId(), powers: category.powers.map((power) => ({ ...power })) })),
  notes: block?.notes ?? ""
});

const replaceAt = <T,>(list: readonly T[], index: number, patch: Partial<T>): T[] =>
  list.map((item, at) => (at === index ? { ...item, ...patch } : item));

const NumberBox = ({ value, range, onChange, className, title }: {
  value: Num;
  range: readonly [number, number];
  onChange: (value: Num) => void;
  className?: string;
  title?: string;
}): ReactElement => (
  <input
    className={`npc-stat-num${className ? ` ${className}` : ""}`}
    type="number"
    min={range[0]}
    max={range[1]}
    title={title}
    value={value ?? ""}
    onChange={(event) => {
      const parsed = Math.trunc(Number(event.target.value));
      onChange(event.target.value === "" || !Number.isFinite(parsed) ? undefined : Math.min(range[1], Math.max(range[0], parsed)));
    }}
  />
);

const Section = ({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }): ReactElement => (
  <section className="npc-stats-section">
    <header>
      <button type="button" className="npc-stats-add" title={`Add to ${title}`} onClick={onAdd}>+</button>
      <span>{title}:</span>
    </header>
    <div className="npc-stats-grid">{children}</div>
  </section>
);

/** A blank power under the category's last one: next level up (at most 5), no name yet. */
const blankPower = (category: DraftCategory): DraftPower => ({
  level: Math.min(RANGES.level[1], (category.powers.at(-1)?.level ?? 0) + 1),
  name: "",
  pool: ""
});

/**
 * The Stats window: one stat block for a named or kept NPC, or one per tier (Weak / Average / Gifted / Deadly)
 * for a generic type (`generic`). Clicking off (or Escape) saves to `data/npc-stats.json` under `statsKey`;
 * incomplete pools, nameless attacks and powers, and empty power categories are dropped then.
 */
export const NpcStatsModal = ({ statsKey, label, generic, onClose }: {
  statsKey: string;
  label: string;
  generic: boolean;
  onClose: () => void;
}): ReactElement => {
  const file = useNpcStats();
  return file === null ? (
    <Overlay onClose={onClose}>
      <div className="lab-modal npc-stats">
        <span className="lab-modal-title">{label}</span>
        <p className="lab-note">NPC stats are still loading (or failed to load; see the browser console).</p>
      </div>
    </Overlay>
  ) : (
    <StatsEditor statsKey={statsKey} label={label} generic={generic} saved={file[statsKey] ?? {}} onClose={onClose} />
  );
};

const StatsEditor = ({ statsKey, label, generic, saved, onClose }: {
  statsKey: string;
  label: string;
  generic: boolean;
  saved: NpcStats;
  onClose: () => void;
}): ReactElement => {
  const slots: readonly NpcStatSlot[] = generic ? NPC_TIERS : ["named"];
  const [drafts, setDrafts] = useState(() => new Map(slots.map((slot) => [slot, toDraft(saved[slot])])));
  const [slot, setSlot] = useState<NpcStatSlot>(() => (generic ? configuredSlots(saved)[0] ?? "average" : "named"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const draft = drafts.get(slot) ?? toDraft(undefined);
  const update = (patch: Partial<DraftBlock>): void =>
    setDrafts((current) => new Map(current).set(slot, { ...draft, ...patch }));

  const close = (): void => {
    if (busy) {
      return;
    }
    const next: Partial<Record<NpcStatSlot, NpcStatBlock>> & { kept?: KeptNpc } = {};
    for (const [key, block] of drafts) {
      const normalized = normalizeStatBlock(block);
      if (normalized) {
        next[key] = normalized;
      }
    }
    if (saved.kept) {
      next.kept = saved.kept;
    }
    if (JSON.stringify(next) === JSON.stringify(saved)) {
      onClose();
      return;
    }
    setBusy(true);
    saveNpcStats(statsKey, next).then(onClose, (reason: unknown) => {
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  };

  const supernatural = supernaturalPoolName(draft.kind);
  const rollPools = poolOptions(draft, false);
  const powerPools = poolOptions(draft, true);
  const filled = (key: NpcStatSlot): boolean => {
    const block = drafts.get(key);
    return block !== undefined && normalizeStatBlock(block) !== null;
  };

  return (
    <Overlay onClose={close}>
      <div className="lab-modal npc-stats">
        <div className="npc-stats-head">
          <span className="lab-modal-title">{label}</span>
          {generic && (
            <div className="npc-stats-tabs">
              {NPC_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={`npc-stats-tab${tier === slot ? " on" : ""}${filled(tier) ? " filled" : ""}`}
                  onClick={() => setSlot(tier)}
                >
                  <img src={tierBadgeSrc(tier)} alt="" />
                  {TIER_LABELS[tier]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="npc-stats-kinds">
          {NPC_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`npc-kind npc-kind-${kind}${draft.kind === kind ? " on" : ""}`}
              onClick={() => update({ kind: draft.kind === kind ? undefined : kind })}
            >
              {kind}
            </button>
          ))}
        </div>
        {draft.kind === "vampire" && (
          <div className="npc-stats-row">
            <NumberBox value={draft.generation} range={RANGES.generation} onChange={(generation) => update({ generation })} />
            <small>th Gen.</small>
            <select className="npc-stat-select" value={draft.clan ?? ""} onChange={(event) => update({ clan: event.target.value || undefined })}>
              <option value="">Clan</option>
              {NPC_CLANS.map((clan) => <option key={clan} value={clan}>{clan}</option>)}
            </select>
            <select className="npc-stat-select" value={draft.rank ?? ""} onChange={(event) => update({ rank: event.target.value || undefined })}>
              <option value="">Rank</option>
              {NPC_RANKS.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
            </select>
            <small>Blood Potency</small>
            <NumberBox value={draft.bloodPotency} range={RANGES.bloodPotency} onChange={(bloodPotency) => update({ bloodPotency })} />
            <small>Humanity</small>
            <NumberBox value={draft.humanity} range={RANGES.humanity} onChange={(humanity) => update({ humanity })} />
          </div>
        )}
        <div className="npc-stats-row">
          <span className="npc-stats-label" title="Actions against this NPC where it is well suited / everything else">Difficulty:</span>
          <NumberBox value={draft.difficultyStrong} range={RANGES.difficulty} onChange={(difficultyStrong) => update({ difficultyStrong })} />
          <span className="npc-stats-slash">/</span>
          <NumberBox value={draft.difficultyWeak} range={RANGES.difficulty} onChange={(difficultyWeak) => update({ difficultyWeak })} />
          <span className="npc-stats-label push">Health:</span>
          <NumberBox value={draft.health} range={RANGES.tracker} onChange={(health) => update({ health })} />
          <span className="npc-stats-label push">Willpower:</span>
          <NumberBox value={draft.willpower} range={RANGES.tracker} onChange={(willpower) => update({ willpower })} />
        </div>
        <div className="npc-stats-row">
          <span className="npc-stats-label">Physical:</span>
          <NumberBox value={draft.physical} range={RANGES.dice} onChange={(physical) => update({ physical })} />
          <span className="npc-stats-label push">Social:</span>
          <NumberBox value={draft.social} range={RANGES.dice} onChange={(social) => update({ social })} />
          <span className="npc-stats-label push">Mental:</span>
          <NumberBox value={draft.mental} range={RANGES.dice} onChange={(mental) => update({ mental })} />
          {supernatural !== null && (
            <>
              <span className={`npc-stats-label push npc-kind-text-${draft.kind ?? "other"}`}>{supernatural}:</span>
              <NumberBox value={draft.supernatural} range={RANGES.dice} onChange={(value) => update({ supernatural: value })} />
            </>
          )}
        </div>
        <Section title="Exceptional pools" onAdd={() => update({ exceptional: [...draft.exceptional, { id: newStatId(), name: "" }] })}>
          {draft.exceptional.map((pool, index) => (
            <div key={pool.id} className="npc-stats-entry">
              <input
                className="npc-stat-name"
                placeholder="Name (blank removes)"
                value={pool.name}
                onChange={(event) => update({ exceptional: replaceAt(draft.exceptional, index, { name: event.target.value }) })}
              />
              <NumberBox value={pool.dice} range={RANGES.dice} onChange={(dice) => update({ exceptional: replaceAt(draft.exceptional, index, { dice }) })} />
            </div>
          ))}
        </Section>
        <Section title="Attacks" onAdd={() => update({ attacks: [...draft.attacks, { id: newStatId(), name: "", pool: "" }] })}>
          {draft.attacks.map((attack, index) => (
            <div key={attack.id} className="npc-stats-entry">
              <input
                className="npc-stat-name"
                placeholder="Name (blank removes)"
                value={attack.name}
                onChange={(event) => update({ attacks: replaceAt(draft.attacks, index, { name: event.target.value }) })}
              />
              <select
                className="npc-stat-select"
                value={attack.pool}
                onChange={(event) => update({ attacks: replaceAt(draft.attacks, index, { pool: event.target.value }) })}
              >
                <option value="">Pool</option>
                {rollPools.map((option) => <option key={option.ref} value={option.ref}>{option.label}</option>)}
              </select>
              <span className="npc-attack-bonus" title="Added to the margin when the attack succeeds">
                {(attack.bonus ?? 0) >= 0 ? "+" : ""}
                <NumberBox value={attack.bonus ?? 0} range={RANGES.bonus} onChange={(bonus) => update({ attacks: replaceAt(draft.attacks, index, { bonus }) })} />
              </span>
            </div>
          ))}
        </Section>
        <Section title="Powers" onAdd={() => update({ powers: [...draft.powers, { id: newStatId(), name: "", powers: [] }] })}>
          {draft.powers.map((category, index) => {
            const setCategory = (patch: Partial<DraftCategory>): void => update({ powers: replaceAt(draft.powers, index, patch) });
            const setPower = (at: number, patch: Partial<DraftPower>): void => setCategory({
              powers: at < category.powers.length
                ? replaceAt(category.powers, at, patch)
                : [...category.powers, { ...blankPower(category), ...patch }]
            });
            return (
              <div key={category.id} className="npc-power-category">
                <div className="npc-stats-entry">
                  <input
                    className="npc-stat-name"
                    placeholder="Category (e.g. Dominate)"
                    value={category.name}
                    onChange={(event) => setCategory({ name: event.target.value })}
                  />
                  <NumberBox value={category.dots} range={RANGES.dots} title="Rating" onChange={(dots) => setCategory({ dots })} />
                </div>
                <div className="npc-power-list">
                  {[...category.powers, blankPower(category)].map((power, at) => (
                    <div key={at} className="npc-power">
                      <select
                        className="npc-power-level"
                        title="Power level"
                        value={power.level}
                        onChange={(event) => setPower(at, { level: Number(event.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
                      </select>
                      <input
                        className="npc-power-name"
                        placeholder={at === category.powers.length ? "New power" : "Name (blank removes)"}
                        value={power.name}
                        onChange={(event) => setPower(at, { name: event.target.value })}
                      />
                      {usesRouse(draft.kind) && (
                        <NumberBox
                          className="npc-power-rouse"
                          title="Rouse checks to activate"
                          value={power.rouse}
                          range={RANGES.rouse}
                          onChange={(rouse) => setPower(at, { rouse })}
                        />
                      )}
                      <select
                        className="npc-stat-select npc-power-pool"
                        value={power.pool}
                        onChange={(event) => setPower(at, { pool: event.target.value })}
                      >
                        <option value="">—</option>
                        {powerPools.map((option) => <option key={option.ref} value={option.ref}>{option.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
        <textarea
          className="npc-stats-notes"
          placeholder="Notes (shown when configuring this NPC's rolls)"
          value={draft.notes}
          onChange={(event) => update({ notes: event.target.value })}
        />
        {error && <p className="lab-note">{error}</p>}
      </div>
    </Overlay>
  );
};

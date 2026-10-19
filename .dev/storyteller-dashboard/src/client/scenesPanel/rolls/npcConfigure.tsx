import { rollTraits } from "../../../shared/npcCustomRolls";
import { useContext, useState, type MouseEvent, type ReactElement } from "react";
import { applyNpcConditions, npcResolveRating, npcTraitChoices, withNpcTraitChoices } from "../../../shared/npcConditions";
import { NpcLiveContext } from "../npcTrackers";
import { bloodPotencyRow, ROLL_TYPE_RULES } from "../../catalogVocab";
import {
  isTrackerSeedRollType,
  npcRollMetadata,
  planNpcRoll,
  planNpcTypeSeed,
  type NpcRollEntry,
  type NpcRollLevels,
  type NpcRollPlan
} from "../../../shared/npcRollPlan";
import { poolOptions, type NpcStatBlock } from "../../../shared/npcStats";
import type { StLiveRoll } from "../../worldState";
import { Overlay } from "../sketch";
import type { RollsSend } from "./commands";
import { PoolDiamonds } from "./dice";

/**
 * The live NPC roll's Configure pop-up: the manual dice, every pool, attack and power from the NPC's stat block
 * (each button shows the dice it would roll), the Blood Surge toggle and the NPC's Notes. Picking an entry sends
 * `npcStatRoll`, or for a passive power `npcAnnounce` and then cancels the roll. Blood Surge is a live toggle on
 * TTS's side (`npcSurge`): its dice stay in the pool across a pick, so the pop-up stays open when it is clicked.
 *
 * Willpower / Frenzy / Humanity rolls use the same preliminary pools as PCs (undamaged Willpower, plus
 * floor(Humanity/3) for Frenzy) and show one Apply button instead of the trait grid. Discipline rolls add
 * the NPC's Blood Potency Discipline Bonus to each pool or power pick.
 */

export type ConfigureAt = { readonly x: number; readonly y: number };

type Planned = { readonly plan: NpcRollPlan } | { readonly error: string };

const tryPlan = (build: () => NpcRollPlan): Planned => {
  try {
    return { plan: build() };
  } catch (reason) {
    return { error: reason instanceof Error ? reason.message : String(reason) };
  }
};

const summary = (plan: NpcRollPlan): string => {
  const rouse = plan.rouse.length > 0 ? `${plan.rouse.length} rouse` : "";
  if (plan.kind === "passive") {
    return "passive";
  }
  if (plan.kind === "rouseOnly") {
    return rouse;
  }
  const dice = plan.normal + plan.hunger + plan.rage;
  const parts = [`${dice}`, plan.hunger > 0 ? `${plan.hunger}H` : "", plan.rage > 0 ? `${plan.rage}R` : "", rouse];
  return parts.filter((part) => part !== "").join(" · ");
};

const describe = (plan: NpcRollPlan): string => {
  const lines = [plan.line];
  if (plan.kind === "roll") {
    lines.push(`Dice: ${plan.poolDice}${plan.discBonus > 0 ? ` + ${plan.discBonus} discipline` : ""}`);
  }
  if (plan.difficultyRule) lines.push(`Difficulty: ${plan.difficultyRule}`);
  plan.rouse.forEach((check, index) => {
    lines.push(`Rouse check ${index + 1}: ${check.dice === 2 ? "2 dice (reroll)" : "1 die"}${check.oblivion ? ", Oblivion" : ""}`);
  });
  if (plan.marginBonus > 0) {
    lines.push(`On a success: ${plan.marginLabel} +${plan.marginBonus}`);
  }
  return lines.join("\n");
};

const EntryButton = ({ label, planned, onPick }: { label: string; planned: Planned; onPick: (plan: NpcRollPlan) => void }): ReactElement =>
  "plan" in planned ? (
    <button type="button" className="roll-toggle npc-config-entry" title={describe(planned.plan)} onClick={() => onPick(planned.plan)}>
      {label}
      <span className="npc-config-dice">{summary(planned.plan)}</span>
    </button>
  ) : (
    <button type="button" className="roll-toggle npc-config-entry broken" disabled title={planned.error}>
      {label}
      <span className="npc-config-dice">{planned.error.startsWith("Set Resolve") ? "set Resolve" : "fix in Stats"}</span>
    </button>
  );

export const NpcConfigure = ({ at, live, block: baseBlock, levels, send, onPool, onClose }: {
  at: ConfigureAt;
  live: StLiveRoll;
  block: NpcStatBlock;
  levels: NpcRollLevels;
  send: RollsSend;
  onPool: (event: MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}): ReactElement => {
  const npcLive = useContext(NpcLiveContext);
  const effects = live.npcCharacterKey ? npcLive?.conditions?.[live.npcCharacterKey] : undefined;
  const choices = npcTraitChoices(effects);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const sourceBlock = live.npcCharacterKey ? npcLive?.sourceBlockFor(live.npcCharacterKey) : undefined;
  const [resolveOverride, setResolveOverride] = useState<number | undefined>();
  const [poolUsesResolve, setPoolUsesResolve] = useState(false);
  const resolveRating = resolveOverride ?? (sourceBlock ? npcResolveRating(sourceBlock) : undefined);
  const conditionedBlock = sourceBlock ? applyNpcConditions(sourceBlock, effects, {
    ...(resolveRating === undefined ? {} : { rating: resolveRating }), selectedPoolUsesResolve: poolUsesResolve
  }) : baseBlock;
  const block = withNpcTraitChoices(conditionedBlock, choices, selected);
  const name = live.label ?? "NPC";
  const rollType = live.rollType ?? "standard";
  const bloodPotency = bloodPotencyRow(block.bloodPotency);
  const vampire = block.kind === "vampire";
  const surgeAllowed = vampire && !effects?.rollFeatures.noBloodSurge && ROLL_TYPE_RULES.bloodSurge.includes(rollType);
  const surgePreview = bloodPotency.bloodSurge * (effects?.rollFeatures.doubleBloodSurge ? 2 : 1);
  const rules = effects?.hungerDiceAllowed === false
    ? { ...ROLL_TYPE_RULES, withoutHunger: [...ROLL_TYPE_RULES.withoutHunger, rollType] } : ROLL_TYPE_RULES;
  const trackerSeed = isTrackerSeedRollType(rollType);
  const seedPlanned = trackerSeed
    ? tryPlan(() => {
      const seed = planNpcTypeSeed({ name, block, levels, rollType, bloodPotency, rules });
      if (seed === null) {
        throw new Error(`No preliminary pool for ${rollType}.`);
      }
      return seed;
    })
    : null;
  const planFor = (entry: NpcRollEntry): Planned =>
    tryPlan(() => {
      const ref = entry.kind === "pool" ? entry.ref
        : entry.kind === "attack" ? block.attacks.find((attack) => attack.id === entry.id)?.pool
        : block.powers[entry.category]?.powers[entry.power]?.pool;
      const label = poolOptions(block, false).find((option) => option.ref === ref)?.label;
      if (effects?.rollFeatures.resolveHalved && resolveRating === undefined
          && rollTraits(npcRollMetadata(sourceBlock ?? block, entry)).length === 0 && /\bresolve\b/i.test(label ?? "")) {
        throw new Error("Set Resolve before halving to adjust this pool's attribute contribution.");
      }
      return planNpcRoll({ name, block, levels, rollType, entry, bloodPotency, rules,
        ...(sourceBlock ? { conditionSource: sourceBlock } : {}), ...(effects ? { conditions: effects } : {}) });
    });
  const pick = (plan: NpcRollPlan): void => {
    if (plan.kind === "passive") {
      send({ op: "npcAnnounce", label: name, ...(live.npcCharacterKey ? { characterKey: live.npcCharacterKey } : {}), heading: plan.heading, line: plan.line });
      send({ op: "npcCancel" });
    } else {
      send({
        op: "npcStatRoll",
        kind: plan.kind,
        rollType: plan.rollType,
        normal: plan.normal,
        hunger: plan.hunger,
        rage: plan.rage,
        rouse: plan.rouse,
        hungerOnFail: plan.hungerOnFail,
        heading: plan.heading,
        line: plan.line,
        marginBonus: plan.marginBonus,
        marginLabel: plan.marginLabel,
        ...(plan.difficultyRule ? { difficultyRule: plan.difficultyRule } : {})
      });
    }
    onClose();
  };
  const pools = poolOptions(block, false).filter((option) => option.dice !== undefined);
  const attacks = block.attacks.filter((attack) => attack.name.trim() !== "");
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal roll-options npc-config" style={{ left: at.x, top: at.y }}>
        <span className="lab-modal-title">{name}: roll from stats</span>
        {effects?.rollFeatures.resolveHalved && (
          <div className="npc-resolve-condition">
            <label>
              Resolve before halving
              <input type="number" min={0} max={10} step={1} value={resolveRating ?? ""}
                aria-label="Resolve before halving"
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  setResolveOverride(Number.isInteger(value) && value >= 0 && value <= 10 ? value : undefined);
                }} />
            </label>
            <label>
              <input type="checkbox" checked={poolUsesResolve} disabled={resolveRating === undefined}
                onChange={(event) => setPoolUsesResolve(event.target.checked)} />
              The chosen pool uses Resolve
            </label>
            <p className="lab-note">
              {resolveRating === undefined
                ? "Associated traits are adjusted automatically. For a pool without associations, set its Resolve attribute rating here."
                : `For unassociated pools, Resolve ${resolveRating} becomes ${Math.floor(resolveRating / 2)}. Named Resolve pools include this penalty; check the box for other pools that use it.`}
              {" "}Willpower separately loses one quarter of its capacity.
            </p>
          </div>
        )}
        {choices.map((choice) => (
          <label key={choice.key}>
            <input type="checkbox" checked={selected.has(choice.key)} onChange={(event) => {
              const next = new Set(selected);
              if (event.target.checked) next.add(choice.key); else next.delete(choice.key);
              setSelected(next);
            }} />
            {choice.exceptionalOnly ? "Exceptional pool uses" : "This pool includes"} {choice.key} ({choice.delta > 0 ? "+" : ""}{choice.delta})
          </label>
        ))}
        <div className="npc-config-manual">
          <span className="roll-options-head">Dice</span>
          <PoolDiamonds pool={live.pool} onClick={onPool} />
          {(vampire || live.bloodSurge) && (
            <button
              type="button"
              className={`roll-toggle${live.bloodSurge ? " on" : ""}`}
              disabled={!live.bloodSurge && !surgeAllowed}
              title={live.bloodSurge
                ? "Blood Surge is on: click to take its dice back out of the pool"
                : surgeAllowed ? `Adds ${surgePreview} dice and a rouse check to the pool` : "Blood Surge is blocked by this roll's type or conditions"}
              onClick={() => send({ op: "npcSurge", on: !live.bloodSurge, dice: bloodPotency.bloodSurge })}
            >
              Blood Surge +{surgePreview}
            </button>
          )}
        </div>
        {seedPlanned && (
          <>
            <span className="roll-options-head">Preliminary pool</span>
            <div className="roll-options-grid">
              <EntryButton
                label={rollType === "willpowerRoll" ? "Willpower" : rollType === "frenzy" ? "Frenzy" : "Humanity"}
                planned={seedPlanned}
                onPick={pick}
              />
            </div>
          </>
        )}
        {!trackerSeed && pools.length > 0 && (
          <>
            <span className="roll-options-head">Pools</span>
            <div className="roll-options-grid">
              {pools.map((option) => <EntryButton key={option.ref} label={option.label} planned={planFor({ kind: "pool", ref: option.ref })} onPick={pick} />)}
            </div>
          </>
        )}
        {!trackerSeed && attacks.length > 0 && (
          <>
            <span className="roll-options-head">Attacks</span>
            <div className="roll-options-grid">
              {attacks.map((attack) => <EntryButton key={attack.id} label={attack.name} planned={planFor({ kind: "attack", id: attack.id })} onPick={pick} />)}
            </div>
          </>
        )}
        {!trackerSeed && block.powers.map((category, categoryIndex) => category.powers.length > 0 && (
          <div key={`${category.name}-${categoryIndex}`} className="npc-config-powers">
            <span className="roll-options-head">{category.name}{category.dots ? ` ${"•".repeat(category.dots)}` : ""}</span>
            <div className="roll-options-grid">
              {category.powers.map((power, powerIndex) => (
                <EntryButton
                  key={`${power.name}-${powerIndex}`}
                  label={`${"•".repeat(power.level)} ${power.name}`}
                  planned={planFor({ kind: "power", category: categoryIndex, power: powerIndex })}
                  onPick={pick}
                />
              ))}
            </div>
          </div>
        ))}
        {block.notes && block.notes.trim() !== "" && (
          <>
            <span className="roll-options-head">Notes</span>
            <div className="npc-config-notes">{block.notes}</div>
          </>
        )}
      </div>
    </Overlay>
  );
};

import type { MouseEvent, ReactElement } from "react";
import { bloodPotencyRow, ROLL_TYPE_RULES } from "../../catalogVocab";
import {
  isTrackerSeedRollType,
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
      <span className="npc-config-dice">fix in Stats</span>
    </button>
  );

export const NpcConfigure = ({ at, live, block, levels, send, onPool, onClose }: {
  at: ConfigureAt;
  live: StLiveRoll;
  block: NpcStatBlock;
  levels: NpcRollLevels;
  send: RollsSend;
  onPool: (event: MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}): ReactElement => {
  const name = live.label ?? "NPC";
  const rollType = live.rollType ?? "standard";
  const bloodPotency = bloodPotencyRow(block.bloodPotency);
  const vampire = block.kind === "vampire";
  const surgeAllowed = vampire && ROLL_TYPE_RULES.bloodSurge.includes(rollType);
  const trackerSeed = isTrackerSeedRollType(rollType);
  const seedPlanned = trackerSeed
    ? tryPlan(() => {
      const seed = planNpcTypeSeed({ name, block, levels, rollType, bloodPotency, rules: ROLL_TYPE_RULES });
      if (seed === null) {
        throw new Error(`No preliminary pool for ${rollType}.`);
      }
      return seed;
    })
    : null;
  const planFor = (entry: NpcRollEntry): Planned =>
    tryPlan(() => planNpcRoll({ name, block, levels, rollType, entry, bloodPotency, rules: ROLL_TYPE_RULES }));
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
        marginLabel: plan.marginLabel
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
                : surgeAllowed ? `Adds ${bloodPotency.bloodSurge} dice and a rouse check to the pool` : "Blood Surge is not allowed on this roll type"}
              onClick={() => send({ op: "npcSurge", on: !live.bloodSurge, dice: bloodPotency.bloodSurge })}
            >
              Blood Surge +{bloodPotency.bloodSurge}
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

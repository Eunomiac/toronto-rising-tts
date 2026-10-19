import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactElement } from "react";
import { applyNpcConditions, npcConditionRatings, type NpcConditionView } from "../../shared/npcConditions";
import { sheetArtUrl } from "../pcSheet/layout";
import { paintDamageTrack, type BoxSlot } from "../pcSheet/paint";
import { TraitRing } from "../pcSheet/TraitRing";
import type { RingAction } from "../pcSheet/types";
import { useNpcStats } from "../npcStats";
import { statBlockFor, type NpcKind, type NpcStatBlock, type NpcTier } from "../../shared/npcStats";
import { inheritedNamedBlock, memoriamStem } from "../../shared/memoriamNpc";
import type { GenericNpc, NpcTrackerRecord } from "../worldState";
import { bloodPotencyRow } from "../catalogVocab";
import { useMemoriamCatalog } from "../memoriamCatalog";
import type { NpcTrackerMode, NpcTrackerWhich, ScenesCommand } from "./commands";
import { useGenericCatalog } from "./genericCatalog";
import { Icon } from "./icons";
import { RollsCommandContext, type RollsCommand } from "./rolls/commands";

/**
 * Live NPC trackers on the Scenes tab: TTS owns the values (`core/npc_trackers.ttslua`, pushed in the seats slice);
 * the NPC's stat block (dashboard `npc-stats.json`) gives the Health / Willpower maximums and whether it has Hunger
 * (vampires) or Rage (werewolves).
 */

/** Hunger and Rage this high show a droplet badge on the NPC's tokens and seat. */
export const LEVEL_BADGE_FROM = 3;
const LEVEL_MAX = 5;

export type NpcLive = {
  readonly conditions?: Readonly<Record<string, NpcConditionView>>;
  readonly trackers: Readonly<Record<string, NpcTrackerRecord>>;
  /** The stat block a live NPC uses: its own, its generic type's tier, or a kept character's. */
  readonly blockFor: (characterKey: string) => NpcStatBlock | undefined;
  /** Saved ratings before live conditions; used when the ST identifies an attribute contribution. */
  readonly sourceBlockFor: (characterKey: string) => NpcStatBlock | undefined;
  /** The block's kind; NPCs with no block but flagged Werewolf in the NPC data count as werewolves. */
  readonly kindOf: (characterKey: string) => NpcKind | undefined;
};

/** The table's live NPCs; null in scene drafts (no trackers, no tracker pop-up). */
export const NpcLiveContext = createContext<NpcLive | null>(null);

export const useNpcLive = (
  trackers: Readonly<Record<string, NpcTrackerRecord>> | undefined,
  generics: readonly GenericNpc[],
  tiers: Readonly<Record<string, NpcTier>>,
  werewolves: readonly string[],
  conditions?: Readonly<Record<string, NpcConditionView>>,
  send?: (command: ScenesCommand) => void
): NpcLive => {
  const stats = useNpcStats();
  const catalog = useGenericCatalog();
  const memoriam = useMemoriamCatalog();
  const raw = useMemo(() => {
    const labels = new Map((catalog ?? []).map((entry) => [entry.key, entry.label]));
    const memoriamByKey = new Map(memoriam.map((npc) => [npc.key, npc]));
    const inScene = new Map(generics.map((npc) => [npc.characterKey, npc]));
    const wolves = new Set(werewolves);
    const blockFor = (characterKey: string): NpcStatBlock | undefined => {
      if (!stats) {
        return undefined;
      }
      const generic = inScene.get(characterKey);
      const mem = memoriamByKey.get(characterKey);
      if (mem?.isGeneric) {
        return statBlockFor(stats, {
          characterKey,
          genericLabel: memoriamStem(characterKey),
          tier: tiers[characterKey],
          keptId: generic?.keptId
        });
      }
      if (generic) {
        return statBlockFor(stats, { characterKey, genericLabel: labels.get(characterKey), tier: tiers[characterKey], keptId: generic.keptId });
      }
      return inheritedNamedBlock(
        (key) => statBlockFor(stats, { characterKey: key }),
        (key) => memoriamByKey.get(key)?.variantOfUnique ?? "",
        characterKey
      );
    };
    return {
      trackers: trackers ?? {},
      blockFor,
      kindOf: (characterKey: string) => blockFor(characterKey)?.kind ?? (wolves.has(characterKey) ? "werewolf" : undefined)
    };
  }, [stats, catalog, memoriam, trackers, generics, tiers, werewolves]);
  const pending = JSON.stringify([...new Set([...Object.keys(trackers ?? {}), ...Object.keys(conditions ?? {})])].sort().flatMap((key) => {
    const block = raw.blockFor(key);
    if (!block) return [];
    const ratings = npcConditionRatings(block);
    return JSON.stringify(ratings) === JSON.stringify(npcConditionRatings(conditions?.[key]?.base ?? {}))
      ? [] : [{ op: "npcConditionStats" as const, key, stats: ratings }];
  }));
  useEffect(() => {
    const commands = JSON.parse(pending) as ScenesCommand[];
    if (send) commands.forEach(send);
  }, [pending, send]);
  return useMemo(() => ({
    ...raw,
    sourceBlockFor: raw.blockFor,
    conditions,
    blockFor: (key: string) => {
      const block = raw.blockFor(key);
      return block ? applyNpcConditions(block, conditions?.[key]) : undefined;
    }
  }), [raw, conditions]);
};

/** Character sheet box art; Humanity shows all ten boxes, unfilled ones faint. */
export const BoxRow = ({ boxes, showEmpty = false }: { boxes: readonly BoxSlot[]; showEmpty?: boolean }): ReactElement => (
  <>
    {boxes.map((box, index) => box.active && box.image ? (
      <span key={index} className="lab-track-box" style={{ backgroundImage: `url("${sheetArtUrl(box.image)}")` }} />
    ) : showEmpty ? (
      <span key={index} className="lab-track-box off" style={{ backgroundImage: `url("${sheetArtUrl("box_white")}")` }} />
    ) : null)}
  </>
);

export const HUNGER_DOT = { "--lab-dot": `url("${sheetArtUrl("dot_red")}")` } as CSSProperties;

type Level = { readonly which: "hunger" | "rage"; readonly value: number };

/** The NPC's Hunger (vampires) or Rage (werewolves), when it has a record. */
const levelOf = (live: NpcLive, characterKey: string): Level | null => {
  const record = live.trackers[characterKey];
  const kind = live.kindOf(characterKey);
  if (!record) {
    return null;
  }
  if (kind === "vampire") {
    return { which: "hunger", value: record.hunger };
  }
  if (kind === "werewolf") {
    return { which: "rage", value: record.rage };
  }
  return null;
};

/** A blood droplet with the NPC's Hunger or Rage, once it reaches 3. */
export const NpcLevelBadge = ({ characterKey, where }: { characterKey: string; where: "stage" | "bin" | "seat" }): ReactElement | null => {
  const live = useContext(NpcLiveContext);
  const level = live ? levelOf(live, characterKey) : null;
  if (!level || level.value < LEVEL_BADGE_FROM) {
    return null;
  }
  const label = level.which === "hunger" ? "Hunger" : "Rage";
  return (
    <span className={`npc-level-badge ${where} ${level.which}`} title={`${label} ${level.value}`}>
      <Icon name="hunger" />
      <span className="npc-level-badge-value">{level.value}</span>
    </span>
  );
};

type DamageWhich = "health" | "willpower";

const trackerCommand = (key: string, which: NpcTrackerWhich, mode: NpcTrackerMode, block: NpcStatBlock | undefined): ScenesCommand => {
  const max = {
    ...(block?.health !== undefined ? { health: block.health } : {}),
    ...(block?.willpower !== undefined ? { willpower: block.willpower } : {})
  };
  return { op: "npcTracker", key, which, mode, ...(Object.keys(max).length > 0 ? { max } : {}) };
};

/** Ring buttons send tracker changes to the Scenes queue, except Mend, which is a Storyteller roll. */
type NpcRingCommand = { readonly scenes: ScenesCommand } | { readonly roll: RollsCommand };

/**
 * Same buttons as a PC's damage ring: left-click adds, right-click removes; Clear clears superficial / aggravated.
 * A vampire's Health ring adds Mend (`mend` = its Blood Potency mending, absent when it cannot Mend).
 */
const damageActions = (key: string, name: string, which: DamageWhich, block: NpcStatBlock | undefined, mend: number | undefined): readonly RingAction<NpcRingCommand>[] => {
  const mode = (value: NpcTrackerMode): NpcRingCommand => ({ scenes: trackerCommand(key, which, value, block) });
  const actions: RingAction<NpcRingCommand>[] = [
    { id: "sup", label: "Superficial", image: "buttons/tracker_sup.webp", left: mode("addSuper"), right: mode("removeSuper") },
    { id: "agg", label: "Aggravated", image: "buttons/tracker_agg.webp", left: mode("addAgg"), right: mode("removeAgg") },
    { id: "clear", label: "Clear", image: "buttons/tracker_clear.webp", left: mode("clearSuper"), right: mode("clearAgg") }
  ];
  if (which === "health" && mend !== undefined) {
    const command: NpcRingCommand = { roll: { op: "npcMend", key, label: name, heal: mend } };
    actions.push({ id: "mend", label: `Mend +${mend} (rouse)`, image: "buttons/tracker_mend.webp", left: command, right: command, closeOnPick: true });
  }
  return actions;
};

const DAMAGE_LABEL: Record<DamageWhich, string> = { health: "Health", willpower: "Willpower" };

const DamageRow = ({ which, sup, agg, max, onRing }: {
  which: DamageWhich;
  sup: number;
  agg: number;
  max: number | undefined;
  onRing: (event: MouseEvent<HTMLElement>) => void;
}): ReactElement => (
  <button
    type="button"
    className="lab-track"
    title={max === undefined ? `${DAMAGE_LABEL[which]}: no maximum set in Stats, so damage is not capped` : `${DAMAGE_LABEL[which]} ${max}`}
    onClick={onRing}
  >
    <Icon name={which} className={`lab-track-icon ${which}`} title={DAMAGE_LABEL[which]} />
    <BoxRow boxes={paintDamageTrack({ base: max ?? 0, temp: 0, disabled: 0, superficial: sup, aggravated: agg, stains: 0 }, max ?? sup + agg)} />
    {max === undefined && sup + agg === 0 && <span className="npc-tracker-none">no damage</span>}
  </button>
);

const LevelRow = ({ which, value, onStep }: { which: "hunger" | "rage"; value: number; onStep: (mode: "up" | "down") => void }): ReactElement => (
  <button
    type="button"
    className={`lab-track npc-tracker-level ${which}`}
    title={`Left-click to raise ${which === "hunger" ? "Hunger" : "Rage"}, right-click to lower it`}
    onClick={() => onStep("up")}
    onContextMenu={(event) => {
      event.preventDefault();
      onStep("down");
    }}
  >
    <Icon name="hunger" className={`lab-track-icon ${which}`} title={which === "hunger" ? "Hunger" : "Rage"} />
    {Array.from({ length: LEVEL_MAX }, (_, index) => (
      <span key={index} className={`lab-hunger-dot${index < value ? " on" : ""}`} style={HUNGER_DOT} />
    ))}
  </button>
);

/**
 * An NPC's trackers as controls, like a PC's seat pop-up: click Health or Willpower for that tracker's ring
 * (left-click a button to add, right-click to remove); left-click Hunger / Rage to raise it, right-click to lower it.
 * Every click goes straight to TTS (`npcTracker`); the pop-up shows the pushed values. Render it inside an `Overlay`.
 */
export const NpcTrackerPopup = ({ characterKey, name, at, send }: {
  characterKey: string;
  name: string;
  /** Canvas point it opens from; it opens upward in the lower half of the canvas. */
  at: { readonly x: number; readonly y: number; readonly up: boolean };
  send: (command: ScenesCommand) => void;
}): ReactElement => {
  const live = useContext(NpcLiveContext);
  const rollsSend = useContext(RollsCommandContext);
  const [ring, setRing] = useState<{ x: number; y: number; which: DamageWhich } | null>(null);
  if (!live) {
    throw new Error("NPC trackers need the live table (NpcLiveContext).");
  }
  const record = live.trackers[characterKey];
  const block = live.blockFor(characterKey);
  const kind = live.kindOf(characterKey);
  const mend = kind === "vampire" && rollsSend ? bloodPotencyRow(block?.bloodPotency).mending : undefined;
  const pickRing = (command: NpcRingCommand): void => {
    if ("scenes" in command) {
      send(command.scenes);
    } else if (rollsSend) {
      rollsSend(command.roll);
    } else {
      throw new Error("Mend needs the live roll transport.");
    }
  };
  const openRing = (which: DamageWhich) => (event: MouseEvent<HTMLElement>): void => {
    const canvas = event.currentTarget.closest(".lab-canvas");
    if (!canvas) {
      throw new Error("NPC tracker ring opened outside the Scenes canvas.");
    }
    const rect = canvas.getBoundingClientRect();
    setRing({ x: event.clientX - rect.left, y: event.clientY - rect.top, which });
  };
  return (
    <>
      <div
        className={`lab-seat-pop npc-tracker-pop${at.up ? " up" : ""}`}
        style={{ left: at.x, top: at.y }}
        role="dialog"
        aria-label={`${name} trackers`}
      >
        <span className="lab-seat-pop-head">
          <span className="lab-seat-pop-name">{name}</span>
          {!block && <span className="npc-tracker-none" title="Right-click the NPC in the roster → Stats to set its maximums">no stats</span>}
        </span>
        {live.conditions?.[characterKey]?.conditions.map((condition) => (
          <div key={condition.id} className="npc-tracker-none">{condition.label}</div>
        ))}
        {record ? (
          <>
            <DamageRow which="health" sup={record.healthSup} agg={record.healthAgg} max={block?.health} onRing={openRing("health")} />
            <DamageRow which="willpower" sup={record.wpSup} agg={record.wpAgg} max={block?.willpower} onRing={openRing("willpower")} />
            {kind === "vampire" && (
              <div className="npc-condition-status">
                <span>Stains: {record.stains ?? 0}</span>
                <button type="button" aria-label="Add Stain" onClick={() => send({ op: "npcTracker", key: characterKey, which: "stains", mode: "up" })}>+</button>
                <button type="button" aria-label="Remove Stain" onClick={() => send({ op: "npcTracker", key: characterKey, which: "stains", mode: "down" })}>−</button>
              </div>
            )}
            {(["compulsion", "corruptAmbition", "desirePending"] as const).filter((field) => record[field]).map((field) => (
              <button key={field} type="button" className="lab-btn"
                onClick={() => send({ op: "npcConditionResolved", key: characterKey, field })}>
                {field === "compulsion" ? "Compulsion chosen / resolved" : field === "corruptAmbition" ? "Corrupt Ambition resolved" : "Replacement Desire chosen"}
              </button>
            ))}
            {kind === "vampire" && (
              <LevelRow which="hunger" value={record.hunger} onStep={(mode) => send(trackerCommand(characterKey, "hunger", mode, block))} />
            )}
            {kind === "werewolf" && (
              <LevelRow which="rage" value={record.rage} onStep={(mode) => send(trackerCommand(characterKey, "rage", mode, block))} />
            )}
          </>
        ) : (
          <span className="lab-note">TTS has no trackers for this NPC yet.</span>
        )}
        <details className="npc-manual-conditions">
          <summary>Set conditions</summary>
          {live.conditions?.[characterKey]?.manual.map((condition) => (
            <label key={condition.id}>
              <input type="checkbox" checked={condition.on}
                onChange={(event) => send({ op: "npcCondition", key: characterKey, id: condition.id, on: event.target.checked })} />
              {condition.label}
            </label>
          ))}
        </details>
      </div>
      {ring && (
        <div className="lab-trait-ring-host">
          <TraitRing
            x={ring.x}
            y={ring.y}
            actions={damageActions(characterKey, name, ring.which, block, mend)}
            onPick={(action, button) => pickRing(button === "right" ? (action.right ?? action.left) : action.left)}
            onClose={() => setRing(null)}
          />
        </div>
      )}
    </>
  );
};

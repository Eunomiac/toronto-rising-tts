import type { PoolKind, RollPool } from "../../worldState.js";
import type { RollOptionsApply } from "./commands.js";
import type { RollOptionsView } from "./bridge.js";

/** Short roll type names for rows, rings and the options pop-up (`C.RollType` keys). */
export const ROLL_TYPE_LABEL: Readonly<Record<string, string>> = {
  standard: "Standard",
  discipline: "Discipline",
  simpleCheck: "Simple check",
  rouse: "Rouse",
  rouseOblivion: "Oblivion Rouse",
  remorse: "Remorse",
  willpowerRoll: "Willpower",
  humanityRoll: "Humanity",
  frenzy: "Frenzy",
  werewolf: "Werewolf",
  launch: "Launch",
  goal: "Goal"
};

export const rollTypeLabel = (rollType: string | undefined): string => (rollType ? ROLL_TYPE_LABEL[rollType] ?? rollType : "");

/** `C.RollPhase` as the Storyteller reads it. */
export const ROLL_PHASE_LABEL: Readonly<Record<string, string>> = {
  setup: "Awaiting approval",
  preRoll: "Ready to roll",
  rolling: "Rolling",
  postRoll: "Rolled",
  resolved: "Done"
};

export const rollPhaseLabel = (phase: string | undefined): string => (phase ? ROLL_PHASE_LABEL[phase] ?? phase : "");

/** Result classes the Storyteller may override to (`C.ResultClass`), best first. */
export const RESULT_CLASSES: readonly { readonly key: string; readonly label: string }[] = [
  { key: "criticalWin", label: "Critical win" },
  { key: "messyCritical", label: "Messy critical" },
  { key: "win", label: "Win" },
  { key: "failure", label: "Failure" },
  { key: "bestialFailure", label: "Bestial failure" },
  { key: "totalFailure", label: "Total failure" },
  { key: "totalBestialFailure", label: "Total bestial failure" }
];

const POOL_PARTS: readonly (readonly [keyof RollPool, string])[] = [
  ["normal", ""],
  ["hunger", "H"],
  ["bloodSurgeRouse", "SR"],
  ["rouse", "R"],
  ["oblivRouse", "O"],
  ["werewolf", "W"],
  ["rage", "Rg"]
];

/** Compact pool text, as on the in-game roll dashboard ("4 + 2H", "—"). */
export const poolText = (pool: RollPool): string => {
  const parts = POOL_PARTS.flatMap(([kind, suffix]) => {
    const count = pool[kind] ?? 0;
    return count > 0 ? [`${count}${suffix}`] : [];
  });
  return parts.length > 0 ? parts.join(" + ") : "—";
};

export type RingChoice = { readonly rollType: string; readonly label: string };

/**
 * Roll types on a character's right-click ring: one per dice bag (Normal → Standard, Hunger → Discipline,
 * Werewolf bag → Willpower, Rage → Frenzy, Rouse, Oblivion-Rouse → Oblivion Rouse, or Remorse in the End phase).
 * A Werewolf-tagged NPC only rolls Werewolf; a PC without an Oblivion-Rouse bag has no Oblivion choice.
 */
export const ringChoices = (opts: { readonly werewolf: boolean; readonly oblivion: boolean; readonly endPhase: boolean }): readonly RingChoice[] => {
  if (opts.werewolf) {
    return [{ rollType: "werewolf", label: "Werewolf" }];
  }
  const choices: RingChoice[] = ["standard", "discipline", "willpowerRoll", "frenzy", "rouse"].map((rollType) => ({
    rollType,
    label: rollTypeLabel(rollType)
  }));
  if (opts.oblivion) {
    const rollType = opts.endPhase ? "remorse" : "rouseOblivion";
    choices.push({ rollType, label: rollTypeLabel(rollType) });
  }
  return choices;
};

/** The options pop-up's working copy. */
export type RollOptionsDraft = RollOptionsApply & { readonly rollType: string };

export const draftFromView = (view: RollOptionsView): RollOptionsDraft => ({
  rollType: view.rollType,
  permanent: view.permanent,
  structural: view.structural,
  conditions: Object.fromEntries(view.conditions.map((condition) => [condition.id, condition.on])),
  rerolls: view.rerolls,
  diceRerolled: view.diceRerolled
});

/** A structural rule and the roll condition that negates it always disagree (the TTS modal keeps them in step). */
export const toggleStructural = (draft: RollOptionsDraft, key: string, negating: Readonly<Record<string, string>>): RollOptionsDraft => {
  const on = draft.structural[key] !== true;
  const condition = negating[key];
  return {
    ...draft,
    structural: { ...draft.structural, [key]: on },
    ...(condition !== undefined && condition in draft.conditions ? { conditions: { ...draft.conditions, [condition]: !on } } : {})
  };
};

export const toggleCondition = (draft: RollOptionsDraft, id: string, negating: Readonly<Record<string, string>>): RollOptionsDraft => {
  const on = draft.conditions[id] !== true;
  const structuralKey = Object.keys(negating).find((key) => negating[key] === id);
  return {
    ...draft,
    conditions: { ...draft.conditions, [id]: on },
    ...(structuralKey !== undefined ? { structural: { ...draft.structural, [structuralKey]: !on } } : {})
  };
};

export const PERMANENT_OPTIONS: readonly { readonly key: string; readonly label: string }[] = [
  { key: "autoApplyRouseOutcomes", label: "Auto-Rouse" },
  { key: "autoWp", label: "Auto-WP" },
  { key: "autoRemorse", label: "Auto-Remorse" },
  { key: "autoHunger", label: "Auto-Hunger" }
];

export const STRUCTURAL_OPTIONS: readonly { readonly key: string; readonly label: string }[] = [
  { key: "takeHalf", label: "Take Half" },
  { key: "wpReroll", label: "WP Reroll" },
  { key: "hungerDice", label: "Hunger Dice" },
  { key: "crits", label: "Criticals" }
];

const ROUSE_KINDS: readonly PoolKind[] = ["oblivRouse", "rouse", "bloodSurgeRouse"];
const MAIN_KINDS: readonly PoolKind[] = ["hunger", "rage", "normal", "werewolf"];
const DIAMOND_RUN = 5;

/**
 * A pool as the in-game roll controls draw it: one diamond per die, Rouse dice on their own, then the main pool
 * (Hunger, Rage, normal, Werewolf) split into runs of five counted across kinds.
 */
export const poolDiamonds = (pool: RollPool): { readonly rouse: readonly PoolKind[]; readonly runs: readonly (readonly PoolKind[])[] } => {
  const expand = (kinds: readonly PoolKind[]): PoolKind[] => kinds.flatMap((kind) => Array.from({ length: pool[kind] ?? 0 }, () => kind));
  const main = expand(MAIN_KINDS);
  const runs: PoolKind[][] = [];
  for (let start = 0; start < main.length; start += DIAMOND_RUN) {
    runs.push(main.slice(start, start + DIAMOND_RUN));
  }
  return { rouse: expand(ROUSE_KINDS), runs };
};

/** Dice drawn with the red (Hunger) art; the rest use the standard art. */
const RED_DICE = new Set(["hunger", "rage", "rouse", "bloodSurgeRouse", "oblivRouse"]);

/** The face art for a rolled die (`public/icons/dice/`); a die TTS has not read yet shows a blank face. */
export const dieFaceSrc = (kind: string, value: number | undefined): string => {
  const red = RED_DICE.has(kind);
  const band = value === undefined ? (red ? "2-5" : "1-5")
    : value >= 10 ? "10"
      : value >= 6 ? "6-9"
        : red ? (value === 1 ? "1" : "2-5") : "1-5";
  return `/icons/dice/${red ? "hunger" : "standard"}_${band}.svg`;
};

/** One spoke of the pool's dice ring: left-click adds a die of this kind, right-click removes one. */
export type PoolRingChoice = { readonly kind: PoolKind; readonly label: string };

/** Dice the Storyteller may add or remove: Rage and Werewolf dice on a Werewolf roll, else Hunger and normal. */
export const poolRingChoices = (rollType: string | undefined): readonly PoolRingChoice[] =>
  rollType === "werewolf"
    ? [{ kind: "rage", label: "Rage" }, { kind: "werewolf", label: "Werewolf" }]
    : [{ kind: "hunger", label: "Hunger" }, { kind: "normal", label: "Normal" }];

/** Hunt result headline, as the TTS banner shows it. */
export const huntHeadline = (flavor: string | null, intensity: string): string =>
  intensity === "none" || !flavor ? "NO RESONANCE" : `${intensity} ${flavor}`.toUpperCase();

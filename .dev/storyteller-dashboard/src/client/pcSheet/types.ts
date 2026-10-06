export const SEAT_COLORS = ["Brown", "Orange", "Red", "Pink", "Purple"] as const;

export type SeatColor = (typeof SEAT_COLORS)[number];

export type Rating = {
  readonly base: number;
  readonly temp: number;
  readonly disabled: number;
};

export type Tracker = Rating & {
  readonly superficial: number;
  readonly aggravated: number;
  readonly stains: number;
};

export type Specialty = {
  readonly skill: string;
  readonly type: "standard" | "archaic" | string;
  readonly name: string;
  readonly decade?: number;
};

export type SeatSnapshot = {
  readonly color: SeatColor;
  readonly playerId?: string;
  readonly charKey: string;
  readonly charName: string;
  readonly playerName: string;
  readonly clan: string;
  readonly bloodline: string;
  readonly titles: readonly string[];
  readonly generation: string;
  readonly birthPlace: string;
  readonly birthYear: number;
  readonly embracePlace: string;
  readonly embraceYear: number;
  readonly convictions: readonly string[];
  readonly desire: string;
  readonly ambition: string;
  /** Unoccupied seat (PC disconnected at a checkpoint). Read-only: connection is the sole authority. */
  readonly absentFromSession: boolean;
  /** Steam connection, or the simulated value in Assume Connected debug mode. */
  readonly connected: boolean;
  readonly deferAutoSeat: boolean;
  readonly deferConnect: boolean;
  readonly attributes: Record<string, Rating>;
  readonly skills: Record<string, Rating>;
  readonly specialties: readonly Specialty[];
  readonly health: Tracker;
  readonly willpower: Tracker;
  readonly humanity: Tracker;
  readonly bloodPotency: Rating;
  /** Raw `gameState.playerData.<pid>` for the JSON modal (dump + merge target). */
  readonly playerData: Record<string, unknown>;
  /** Latest current-session Experience Log entry (the Undo target). */
  readonly lastXpEntry?: XpEntryRef;
  readonly hunger: number;
  readonly hungerMax: number;
  readonly resolvedStatChanges: Record<string, number>;
  readonly badges: Record<string, number>;
  readonly bloodSurge: number;
  readonly mending: number;
  readonly healthMax: number;
  readonly willpowerMax: number;
  readonly humanityMax: number;
  readonly torpor: boolean;
  readonly hudFrenzy: boolean;
  readonly hudBlindfold: boolean;
  /** Advantage dots held by holding-phase projects, keyed `${name}|${focus}`. */
  readonly projectStakes: Record<string, number>;
  /** Page 4 entries from `gameState.relationships` linked to this PC, sorted by key. */
  readonly relationships: readonly RelationshipRow[];
};

/** `gameState.relationships[key]`; `pcLinks` maps PC charKey -> link type (touchstone, sire, childe, thrall, …). */
export type RelationshipDraft = {
  pcLinks: Record<string, string>;
  portrait: string;
  headerLeft: string;
  headerRight: string;
  subheaderLeft: string;
  subheaderRight: string;
  body: string[];
  bondStrength?: number;
};

export type RelationshipRow = { readonly key: string; readonly entry: RelationshipDraft };

export type XpEntryRef = { readonly kind: "gain" | "spend"; readonly amount: number; readonly description: string };

export type SheetSnapshot = {
  readonly ok: boolean;
  readonly error?: string;
  /** TTS refused because the save has not finished loading (S.isReady false); retry shortly. */
  readonly loading?: boolean;
  readonly seats: readonly SeatSnapshot[];
  /** `gameState.sessionNum`: new XP entries land in this session's block. */
  readonly sessionNum?: number;
};

export type DamageMode =
  | "addSuper"
  | "addAgg"
  | "removeSuper"
  | "removeAgg"
  | "clearSuper"
  | "clearAgg"
  | "mend"
  | "refresh";

export type PowerDraft = { name: string; level: number; notes: string };

export type AdvantageType = "backgrounds" | "merits" | "flaws";

export type AdvantageDraft = {
  name: string;
  focus: string;
  base: number;
  max: number;
  temp: number;
  disabled: number;
  description: string[];
  rules: string[];
  source?: { book: string; page: number };
  sheetDisplay: boolean;
};

export type ApplyCommand =
  | { op: "dotDelta"; color: SeatColor; family: "attributes" | "skills" | "bloodPotency" | "disciplines"; key: string; field: "base" | "temp" | "disabled"; delta: number }
  | { op: "disciplineAdd"; color: SeatColor; key: string }
  | { op: "disciplineRemove"; color: SeatColor; key: string }
  | { op: "disciplinePowerUpsert"; color: SeatColor; key: string; index?: number; power: PowerDraft }
  | { op: "disciplinePowerRemove"; color: SeatColor; key: string; index: number }
  | { op: "ritualUpsert"; color: SeatColor; kind: "rituals" | "ceremonies"; index?: number; entry: PowerDraft }
  | { op: "ritualRemove"; color: SeatColor; kind: "rituals" | "ceremonies"; index: number }
  | { op: "advantageUpsert"; color: SeatColor; type: AdvantageType; index?: number; fromType?: AdvantageType; expectName?: string; entry: AdvantageDraft }
  | { op: "advantageDelete"; color: SeatColor; type: AdvantageType; index: number; expectName: string }
  | { op: "advantageDotDelta"; color: SeatColor; type: AdvantageType; index: number; expectName: string; field: "base" | "temp" | "disabled"; delta: number }
  | { op: "badgeDelta"; color: SeatColor; key: string; delta: number }
  | { op: "damage"; color: SeatColor; which: "health" | "willpower"; mode: DamageMode }
  | { op: "humanity"; color: SeatColor; kind: "stain" | "base" | "remorse"; delta?: number; remorse?: "pass" | "fail" }
  | { op: "xpAppend"; color: SeatColor; amount: number; description: string }
  | { op: "xpAppendAll"; color: SeatColor; amount: number; description: string }
  | { op: "xpUndo"; color: SeatColor; expect?: XpEntryRef }
  | { op: "xpUndoAll"; color: SeatColor; expect: XpEntryRef; colors: readonly SeatColor[] }
  | { op: "relationshipUpsert"; color: SeatColor; key?: string; expectHeader?: string; entry: RelationshipDraft }
  | { op: "relationshipDelete"; color: SeatColor; key: string; expectHeader: string }
  | { op: "hunger"; color: SeatColor; delta: number }
  | { op: "desire"; color: SeatColor; text: string }
  | { op: "torporClear"; color: SeatColor }
  | { op: "toggleFrenzy"; color: SeatColor }
  | { op: "toggleBlindfold"; color: SeatColor }
  | { op: "deferAutoSeat"; color: SeatColor; value: boolean }
  | { op: "deferConnect"; color: SeatColor; value: boolean }
  | { op: "autoSeat"; color: SeatColor }
  | { op: "connect"; color: SeatColor }
  | { op: "initiateRoll"; color: SeatColor; rollType: string }
  | { op: "mergePlayerData"; color: SeatColor; patch: Record<string, unknown>; deleteKeys?: readonly string[] };

export type RingTarget =
  | { kind: "trait"; family: "attributes" | "skills"; key: string }
  | { kind: "bloodPotency" }
  | { kind: "discipline"; key: string }
  | { kind: "advantage"; type: AdvantageType; index: number; name: string }
  | { kind: "damage"; which: "health" | "willpower" }
  | { kind: "humanity" };

export type RingAction = {
  readonly id: string;
  readonly label: string;
  readonly image?: string;
  readonly badgeText?: string;
  readonly left: ApplyCommand;
  readonly right?: ApplyCommand;
  readonly closeOnPick?: boolean;
};

export type Identity = {
  readonly charKey: string;
  readonly fullName: string;
  readonly clan: string;
  readonly bloodline: string;
  readonly titles: readonly string[];
  readonly generation: string;
  readonly birthPlace: string;
  readonly birthYear: number;
  readonly embracePlace: string;
  readonly embraceYear: number;
  readonly ambition: string;
  readonly convictions: readonly string[];
};

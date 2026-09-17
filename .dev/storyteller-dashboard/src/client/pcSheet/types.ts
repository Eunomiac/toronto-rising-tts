export const SEAT_COLORS = ["Brown", "Orange", "Red", "Pink", "Purple"] as const;

export type SeatColor = (typeof SEAT_COLORS)[number];

export type Rating = {
  readonly base: number;
  readonly temp: number;
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
  readonly desire: string;
  readonly absentFromSession: boolean;
  readonly deferAutoSeat: boolean;
  readonly deferConnect: boolean;
  readonly attributes: Record<string, Rating>;
  readonly skills: Record<string, Rating>;
  readonly specialties: readonly Specialty[];
  readonly health: Tracker;
  readonly willpower: Tracker;
  readonly humanity: Tracker;
  readonly bloodPotency: Rating;
  readonly xp: number;
  readonly hunger: number;
  readonly hungerMax: number;
  readonly resolvedStatChanges: Record<string, number>;
  readonly bloodSurge: number;
  readonly mending: number;
  readonly healthMax: number;
  readonly willpowerMax: number;
  readonly humanityMax: number;
  readonly torpor: boolean;
  readonly hudFrenzy: boolean;
  readonly hudBlindfold: boolean;
};

export type SheetSnapshot = {
  readonly ok: boolean;
  readonly error?: string;
  readonly seats: readonly SeatSnapshot[];
};

export type ApplyCommand =
  | { op: "dotDelta"; color: SeatColor; family: "attributes" | "skills" | "bloodPotency"; key: string; field: "base" | "temp"; delta: number }
  | { op: "damage"; color: SeatColor; which: "health" | "willpower"; superficialDelta: number; aggravatedDelta: number }
  | { op: "humanity"; color: SeatColor; kind: "stain" | "clearStains" | "base"; delta?: number }
  | { op: "xp"; color: SeatColor; delta: number }
  | { op: "hunger"; color: SeatColor; delta: number }
  | { op: "desire"; color: SeatColor; text: string }
  | { op: "torporClear"; color: SeatColor }
  | { op: "toggleFrenzy"; color: SeatColor }
  | { op: "toggleBlindfold"; color: SeatColor }
  | { op: "absent"; color: SeatColor; value: boolean }
  | { op: "deferAutoSeat"; color: SeatColor; value: boolean }
  | { op: "deferConnect"; color: SeatColor; value: boolean }
  | { op: "autoSeat"; color: SeatColor }
  | { op: "connect"; color: SeatColor }
  | { op: "initiateRoll"; color: SeatColor; rollType: string };

export type RingAction = {
  readonly id: string;
  readonly label: string;
  readonly command: ApplyCommand;
};

export type Identity = {
  readonly charKey: string;
  readonly fullName: string;
  readonly clan: string;
  readonly titles: readonly string[];
  readonly generation: string;
  readonly birthPlace: string;
  readonly birthYear: number;
  readonly embracePlace: string;
  readonly embraceYear: number;
  readonly ambition: string;
  readonly convictions: readonly string[];
};

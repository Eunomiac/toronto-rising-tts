export type RollType =
  | "launch"
  | "goal"
  | "standard"
  | "willpowerRoll"
  | "discipline";

export type Rarity = "Very Common" | "Common" | "Uncommon" | "Rare";

export type GameMode = "stop" | "select" | "confirm" | "ended";

export type Zone = "deck" | "discard" | "slot";

export interface RollTypes {
  standard: boolean;
  discipline: boolean;
  willpowerRoll: boolean;
  launch: boolean;
  goal: boolean;
}

export interface CatalogCard {
  index: number;
  name: string;
  category: string;
  rarity: Rarity | string;
  value: number | "X";
  requiresPause: boolean;
  rollTypes: RollTypes;
  imageStem: string;
}

export interface CatalogFile {
  version: number;
  generatedAt: string;
  cards: CatalogCard[];
}

export interface TargetRoll {
  color: string;
  rollId: string;
  rollType: RollType;
  playerLabel: string;
  margin: number;
}

export interface CardInstance {
  id: string;
  index: number;
  name: string;
  category: string;
  rarity: string;
  /** Printed / overridden numeric contribution; X counts as 0 unless overridden. */
  value: number;
  printedValue: number | "X";
  rollTypes: RollTypes;
  imageStem: string;
  zone: Zone;
  up: boolean;
  enhanced: boolean;
  negated: boolean;
  /** True when value was changed from the printed face. */
  revalued: boolean;
}

export interface GameState {
  version: 1;
  id: string;
  target: TargetRoll;
  cards: Record<string, CardInstance>;
  /** Slot 1..10 → card id */
  slots: Record<number, string | undefined>;
  adjust: number;
  autoDiscard: boolean;
  mode: GameMode;
  /** Face-up cards the Storyteller has multi-selected (yellow outline). */
  selectedIds: string[];
  /** Brief Pick Random winner flash; cleared on next unrelated mutation if desired. */
  highlightId: string | null;
  last: string | null;
  exhausted: boolean;
  /** Next flip should be enhanced (conservation of enhancement). */
  enhanceNext: boolean;
  ended: boolean;
  finalTotal: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PublicTotals {
  complicationsTotal: number;
  adjustedMargin: number;
  buzzkillCapped: boolean;
  originalMargin: number;
}

export type ClientRole = "storyteller" | "player";

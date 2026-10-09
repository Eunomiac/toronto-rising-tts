import { createContext } from "react";

/**
 * Roll commands for `GlobalDashboardRollsApply` (`dashboard/rolls.ttslua`). They never wait in the Send queue:
 * dice are live play, so each click goes to TTS at once.
 */

export type PoolDieAction = "addDie" | "remDie" | "addHungerDie" | "remHungerDie" | "addStandardDie" | "remStandardDie";

export type HuntIntensity = "none" | "fleeting" | "intense" | "acute";

export type RollChoice = "hunger" | "stain" | "fail" | "violence";

export type RollOptionsApply = {
  readonly permanent: Readonly<Record<string, boolean>>;
  readonly structural: Readonly<Record<string, boolean>>;
  readonly conditions: Readonly<Record<string, boolean>>;
  readonly rerolls: number;
  readonly diceRerolled: number;
};

export type RollsCommand =
  | { readonly op: "initiate"; readonly color: string; readonly rollType: string }
  | { readonly op: "difficulty"; readonly color: string; readonly value: number }
  | { readonly op: "rollType"; readonly color: string; readonly rollType: string }
  | ({ readonly op: "options"; readonly color: string } & RollOptionsApply)
  | { readonly op: "poolDie"; readonly color: string; readonly action: PoolDieAction }
  | { readonly op: "override"; readonly color: string; readonly resultClass: string }
  | { readonly op: "confirm"; readonly color: string }
  | { readonly op: "cancel"; readonly color: string }
  | { readonly op: "broadcast"; readonly color: string }
  | { readonly op: "npcInitiate"; readonly label: string; readonly rollType: string; readonly characterKey?: string }
  | { readonly op: "npcPool"; readonly kind: "hunger" | "normal"; readonly count: number }
  | { readonly op: "npcDifficulty"; readonly value: number }
  | { readonly op: "npcRoll"; readonly secret?: boolean }
  | { readonly op: "npcHalf"; readonly quiet?: boolean }
  | { readonly op: "npcWp" }
  | { readonly op: "npcDie"; readonly index: number }
  | { readonly op: "npcReroll" }
  | { readonly op: "npcRecalc" }
  | { readonly op: "npcConfirm"; readonly quiet?: boolean }
  | { readonly op: "npcCancel" }
  | { readonly op: "slotCancel"; readonly slot: number }
  | { readonly op: "slotBroadcast"; readonly slot: number }
  | { readonly op: "choice"; readonly color: string; readonly choice: RollChoice }
  | { readonly op: "hunt"; readonly color: string; readonly flavor: string | null; readonly intensity: HuntIntensity; readonly margin: number };

export type RollsSend = (command: RollsCommand) => void;

/** The Scenes tab provides the live roll transport; the Lab sketch leaves it unset (nothing is sent). */
export const RollsCommandContext = createContext<RollsSend | null>(null);

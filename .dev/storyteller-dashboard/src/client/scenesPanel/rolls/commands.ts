import { createContext } from "react";
import type { RouseCheck } from "../../../shared/npcRollPlan";

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
  | { readonly op: "npcPool"; readonly kind: "hunger" | "normal"; readonly delta: 1 | -1 }
  | { readonly op: "npcDifficulty"; readonly value: number }
  | { readonly op: "npcRoll"; readonly secret?: boolean }
  | { readonly op: "npcHalf"; readonly quiet?: boolean }
  | { readonly op: "npcSurge"; readonly on: boolean; readonly dice: number }
  | { readonly op: "npcWp" }
  | { readonly op: "npcReroll"; readonly indices: readonly number[] }
  | { readonly op: "npcRecalc" }
  | { readonly op: "npcConfirm"; readonly quiet?: boolean }
  | { readonly op: "npcCancel" }
  | {
      readonly op: "npcStatRoll";
      readonly kind: "roll" | "rouseOnly";
      readonly rollType: string;
      readonly normal: number;
      readonly hunger: number;
      readonly rage: number;
      readonly rouse: readonly RouseCheck[];
      readonly hungerOnFail: boolean;
      readonly heading: string;
      readonly line: string;
      readonly marginBonus: number;
      readonly marginLabel: string;
    }
  | { readonly op: "npcAnnounce"; readonly label: string; readonly characterKey?: string; readonly heading: string; readonly line: string }
  | { readonly op: "npcMend"; readonly key: string; readonly label: string; readonly heal: number }
  | { readonly op: "slotCancel"; readonly slot: number }
  | { readonly op: "slotBroadcast"; readonly slot: number }
  | { readonly op: "choice"; readonly color: string; readonly choice: RollChoice }
  | { readonly op: "hunt"; readonly color: string; readonly flavor: string | null; readonly intensity: HuntIntensity; readonly margin: number };

export type RollsSend = (command: RollsCommand) => void;

/** The Scenes tab provides the live roll transport; a scene draft's preview leaves it unset (it offers no rolls). */
export const RollsCommandContext = createContext<RollsSend | null>(null);

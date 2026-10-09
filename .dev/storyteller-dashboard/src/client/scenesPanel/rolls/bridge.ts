import { executeLua, luaJsonArg, luaLongString } from "../../ttsBridge.js";
import { parseApplyReply, type ScenesReply } from "../bridge.js";
import type { RollsCommand } from "./commands.js";

export const sendRollsCommands = async (commands: readonly RollsCommand[]): Promise<ScenesReply> => {
  const payload = commands.length === 1 ? commands[0] : commands;
  const result = await executeLua(`return GlobalDashboardRollsApply(${luaJsonArg(payload)})`);
  return parseApplyReply(result, "Rolls");
};

/** What the roll options pop-up opens with (`GlobalDashboardRollOptions`, the TTS options modal's draft). */
export type RollOptionsView = {
  readonly color: string;
  readonly rollType: string;
  readonly rollTypes: readonly { readonly key: string; readonly label: string }[];
  readonly permanent: Readonly<Record<string, boolean>>;
  readonly structural: Readonly<Record<string, boolean>>;
  readonly locked: { readonly takeHalf: boolean; readonly hungerDice: boolean };
  readonly conditions: readonly { readonly id: string; readonly label: string; readonly on: boolean }[];
  /** Structural option → the roll condition that switches it off (`takeHalf` → `noTakeHalf`). */
  readonly negating: Readonly<Record<string, string>>;
  readonly rerolls: number;
  readonly diceRerolled: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asList = <T>(value: unknown): readonly T[] => (Array.isArray(value) ? (value as T[]) : []);

const asFlags = (value: unknown): Readonly<Record<string, boolean>> => (isRecord(value) ? (value as Record<string, boolean>) : {});

/** Parse a `GlobalDashboardRollOptions` reply; throws with TTS's reason when it refuses. */
export const parseRollOptions = (returnValue: unknown): RollOptionsView => {
  const parsed: unknown = typeof returnValue === "string" ? JSON.parse(returnValue) : undefined;
  if (!isRecord(parsed)) {
    throw new Error("TTS returned nothing for the roll options.");
  }
  if (parsed.ok !== true) {
    throw new Error(typeof parsed.error === "string" ? parsed.error : "TTS refused the roll options.");
  }
  const locked = isRecord(parsed.locked) ? parsed.locked : {};
  return {
    color: String(parsed.color),
    rollType: String(parsed.rollType),
    rollTypes: asList(parsed.rollTypes),
    permanent: asFlags(parsed.permanent),
    structural: asFlags(parsed.structural),
    locked: { takeHalf: locked.takeHalf === true, hungerDice: locked.hungerDice === true },
    conditions: asList(parsed.conditions),
    negating: isRecord(parsed.negating) ? (parsed.negating as Record<string, string>) : {},
    rerolls: Number(parsed.rerolls),
    diceRerolled: Number(parsed.diceRerolled)
  };
};

export const loadRollOptions = async (color: string): Promise<RollOptionsView> => {
  const result = await executeLua(`return GlobalDashboardRollOptions(${luaLongString(color)})`);
  if (result.timedOut) {
    throw new Error("TTS did not answer. Keep External Editor on; with Cursor open the Dashboard uses the TTS Tools gateway.");
  }
  if (result.error) {
    throw new Error(/nil value/.test(result.error) ? "TTS has not loaded the Rolls commands yet. Save & Play once." : result.error);
  }
  return parseRollOptions(result.returnValue);
};

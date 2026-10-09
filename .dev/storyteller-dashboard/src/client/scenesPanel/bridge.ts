import type { ApplyReply } from "../applyQueue.js";
import { executeLua, luaJsonArg } from "../ttsBridge.js";
import { coalesceCommands, type ScenesCommand } from "./commands.js";

export type ScenesReply = ApplyReply & { readonly loading?: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/**
 * The dashboard apply entries (`GlobalDashboardScenesApply`, `GlobalDashboardRollsApply`) return `{ ok, error? }` as a
 * JSON string (or a refusal while TTS loads the save). `what` names the commands in error text.
 */
export const parseApplyReply = (result: { returnValue?: unknown; error?: string; timedOut?: boolean }, what: string): ScenesReply => {
  if (result.timedOut) {
    return { ok: false, error: "TTS did not answer. Keep External Editor on; with Cursor open the Dashboard uses the TTS Tools gateway." };
  }
  if (typeof result.returnValue === "string") {
    const parsed: unknown = JSON.parse(result.returnValue);
    if (isRecord(parsed) && typeof parsed.ok === "boolean") {
      return {
        ok: parsed.ok,
        ...(typeof parsed.error === "string" ? { error: parsed.error } : {}),
        ...(parsed.loading === true ? { loading: true } : {})
      };
    }
  }
  if (result.error) {
    return { ok: false, error: /nil value/.test(result.error) ? `TTS has not loaded the ${what} commands yet. Save & Play once.` : result.error };
  }
  return { ok: false, error: `TTS returned nothing for the ${what} command.` };
};

export const parseScenesReply = (result: { returnValue?: unknown; error?: string; timedOut?: boolean }): ScenesReply =>
  parseApplyReply(result, "Scenes");

export const sendScenesCommands = async (commands: readonly ScenesCommand[]): Promise<ScenesReply> => {
  const batch = coalesceCommands(commands);
  const payload = batch.length === 1 ? batch[0] : batch;
  const result = await executeLua(`return GlobalDashboardScenesApply(${luaJsonArg(payload)})`);
  return parseScenesReply(result);
};

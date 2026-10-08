import type { ApplyReply } from "../applyQueue.js";
import { executeLua, luaLongString } from "../ttsBridge.js";
import { coalesceCommands, type ScenesCommand } from "./commands.js";

export type ScenesReply = ApplyReply & { readonly loading?: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** `GlobalDashboardScenesApply` returns `{ ok, error? }` as a JSON string (or a refusal while TTS loads the save). */
export const parseScenesReply = (result: { returnValue?: unknown; error?: string; timedOut?: boolean }): ScenesReply => {
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
    return { ok: false, error: /nil value/.test(result.error) ? "TTS has not loaded the Scenes commands yet. Save & Play once." : result.error };
  }
  return { ok: false, error: "TTS returned nothing for the Scenes command." };
};

export const sendScenesCommands = async (commands: readonly ScenesCommand[]): Promise<ScenesReply> => {
  const batch = coalesceCommands(commands);
  const payload = batch.length === 1 ? batch[0] : batch;
  const result = await executeLua(`return GlobalDashboardScenesApply(${luaLongString(JSON.stringify(payload))})`);
  return parseScenesReply(result);
};

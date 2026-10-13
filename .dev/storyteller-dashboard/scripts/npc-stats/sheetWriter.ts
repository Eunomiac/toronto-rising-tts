import { loadEnvFile } from "../../src/server/loadEnv.ts";

/**
 * Client for the Apps Script web app bound to the Toronto Rising sheet (`apps-script/Code.gs`), which writes stat
 * edits into the CHARACTERS tab. Needs NPC_SHEET_WRITE_URL and NPC_SHEET_WRITE_SECRET in the dashboard's `.env`.
 */

export type PingReply = { readonly ok: boolean; readonly tab: string; readonly keys: number; readonly missingHeaders: readonly string[] };

const settings = (): { url: string; secret: string } => {
  loadEnvFile();
  const url = process.env.NPC_SHEET_WRITE_URL?.trim() ?? "";
  const secret = process.env.NPC_SHEET_WRITE_SECRET?.trim() ?? "";
  if (!url.startsWith("https://script.google.com/") || secret === "") {
    throw new Error(
      "Set NPC_SHEET_WRITE_URL (the Apps Script web app URL, https://script.google.com/…/exec) and " +
      "NPC_SHEET_WRITE_SECRET in .dev/storyteller-dashboard/.env."
    );
  }
  return { url, secret };
};

const post = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { url, secret } = settings();
  const response = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, secret })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Sheet write-back: HTTP ${response.status} from the Apps Script web app`);
  }
  let reply: unknown;
  try {
    reply = JSON.parse(text);
  } catch {
    throw new Error(
      "Sheet write-back: the web app answered with a web page, not JSON. Check that it is deployed with " +
      "\"Who has access: Anyone\" and that NPC_SHEET_WRITE_URL ends in /exec."
    );
  }
  const record = reply as { ok?: unknown; error?: unknown };
  if (record.ok === false && typeof record.error === "string") {
    throw new Error(`Sheet write-back: ${record.error}`);
  }
  return reply as T;
};

export const pingSheet = (): Promise<PingReply> => post<PingReply>({ action: "ping" });

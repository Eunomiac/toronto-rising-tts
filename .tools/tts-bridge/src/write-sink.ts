/**
 * Persists TTS External Editor `messageID: 4` payloads where `customMessage.type === "write"`.
 * Agent guidance: .dev/TTS_MCP.md; .dev/DEBUG_FILE_LOGGING.md.
 */
import fs from "node:fs/promises";
import path from "node:path";

/** Env override for the directory that receives `type: "write"` files (default: `<cwd>/.dev/.debug`). */
const WRITE_ROOT_ENV = "TTS_WORKSPACE_WRITE_ROOT";

/**
 * Resolves the absolute directory under which relative `name` paths from Lua are written.
 *
 * @param workspaceRoot - Typically `process.cwd()` (repo root when MCP/npm scripts run).
 */
export function resolveWriteRoot(workspaceRoot: string): string {
  const env = process.env[WRITE_ROOT_ENV];
  if (env != null && env.trim() !== "") {
    const trimmed = env.trim();
    return path.isAbsolute(trimmed) ? path.normalize(trimmed) : path.resolve(workspaceRoot, trimmed);
  }
  return path.resolve(workspaceRoot, ".dev", ".debug");
}

function asMessageId(msg: Record<string, unknown>): number | undefined {
  const id = msg["messageID"];
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }
  if (typeof id === "string" && /^\d+$/.test(id)) {
    return Number(id);
  }
  return undefined;
}

export type SafePathResult =
  | { ok: true; fullPath: string }
  | { ok: false; reason: string };

/**
 * Joins `rootAbs` with relative `name` from the game (forward slashes). Rejects escapes and absolute names.
 *
 * @param rootAbs - Absolute normalized root from {@link resolveWriteRoot}.
 * @param name - Relative path such as `debug_logs/foo.txt`.
 */
export function resolveSafeWritePath(rootAbs: string, name: string): SafePathResult {
  if (typeof name !== "string" || name.trim() === "") {
    return { ok: false, reason: "name must be a non-empty string" };
  }
  if (path.win32.isAbsolute(name) || path.posix.isAbsolute(name)) {
    return { ok: false, reason: "name must be relative" };
  }
  if (/^[a-zA-Z]:[\\/]/.test(name)) {
    return { ok: false, reason: "name must not include a drive letter" };
  }

  const normalizedName = name.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalizedName.split("/").filter((s) => s !== "" && s !== ".");
  if (segments.length === 0) {
    return { ok: false, reason: "name resolves to empty path" };
  }
  if (segments.some((s) => s === "..")) {
    return { ok: false, reason: "name must not contain .. segments" };
  }

  const rootResolved = path.resolve(rootAbs);
  const fullPath = path.resolve(rootResolved, ...segments);
  const rel = path.relative(rootResolved, fullPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return { ok: false, reason: "path escapes write root" };
  }
  return { ok: true, fullPath };
}

function isWritePayload(
  customMessage: Record<string, unknown>
): customMessage is { type: string; name: string; content: string; format?: string } {
  return (
    customMessage["type"] === "write" &&
    typeof customMessage["name"] === "string" &&
    typeof customMessage["content"] === "string"
  );
}

/**
 * Handles one inbound TTS message: if `messageID` 4 with `type: "write"`, writes UTF-8 text under the write root.
 * Errors are logged; never throws.
 *
 * @param workspaceRoot - Passed through to {@link resolveWriteRoot}.
 */
export function handleInboundWriteMessage(msg: Record<string, unknown>, workspaceRoot: string): void {
  if (asMessageId(msg) !== 4) {
    return;
  }
  const raw = msg["customMessage"];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return;
  }
  const customMessage = raw as Record<string, unknown>;
  if (!isWritePayload(customMessage)) {
    return;
  }

  const root = resolveWriteRoot(workspaceRoot);
  const resolved = resolveSafeWritePath(root, customMessage.name);
  if (!resolved.ok) {
    console.error(`[tts-bridge] write sink: rejected path (${resolved.reason}): ${JSON.stringify(customMessage.name)}`);
    return;
  }

  const format = customMessage.format;
  if (format != null && format !== "none" && format !== "auto") {
    console.error(
      `[tts-bridge] write sink: unknown format ${JSON.stringify(String(format))} for ${customMessage.name}; writing UTF-8 anyway`
    );
  }

  void (async (): Promise<void> => {
    try {
      await fs.mkdir(path.dirname(resolved.fullPath), { recursive: true });
      await fs.writeFile(resolved.fullPath, customMessage.content, { encoding: "utf8" });
    } catch (err) {
      console.error(
        `[tts-bridge] write sink: failed to write ${resolved.fullPath}:`,
        err instanceof Error ? err.message : err
      );
    }
  })();
}

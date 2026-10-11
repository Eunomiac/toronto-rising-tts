import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isEmptyNpcOverride,
  NPC_OVERRIDE_KEY_PATTERN,
  parseNpcOverride,
  type NpcOverride,
  type NpcOverrideFile
} from "../shared/npcOverride.js";

/**
 * Per-NPC overrides live in `data/npc-overrides.json` (tracked). The roster's token configuration window writes
 * it; `npm run npc-art:generate` draws the token art from it and writes `lib/npc_overrides.ttslua` for TTS.
 */

export class NpcOverrideError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const requireNpcOverrideKey = (key: string | null): string => {
  if (key === null || !NPC_OVERRIDE_KEY_PATTERN.test(key)) {
    throw new NpcOverrideError("Expected ?key=<characterKey>.", 400);
  }
  return key;
};

export const parseNpcOverrideBody = (body: unknown): NpcOverride => {
  const parsed = parseNpcOverride(body);
  if (typeof parsed === "string") {
    throw new NpcOverrideError(parsed, 400);
  }
  return parsed;
};

export const createNpcOverrideStore = (filePath: string) => {
  let queue: Promise<unknown> = Promise.resolve();

  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<NpcOverrideFile> => {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { overrides: {} };
      }
      throw error;
    }
    const parsed: unknown = JSON.parse(text);
    const raw = typeof parsed === "object" && parsed !== null ? (parsed as { overrides?: unknown }).overrides : undefined;
    const overrides: Record<string, NpcOverride> = {};
    if (typeof raw === "object" && raw !== null) {
      for (const [key, value] of Object.entries(raw)) {
        const override = parseNpcOverride(value);
        if (NPC_OVERRIDE_KEY_PATTERN.test(key) && typeof override !== "string" && !isEmptyNpcOverride(override)) {
          overrides[key] = override;
        }
      }
    }
    return { overrides };
  };

  const write = async (overrides: Record<string, NpcOverride>): Promise<NpcOverrideFile> => {
    const sorted: Record<string, NpcOverride> = {};
    for (const key of Object.keys(overrides).sort()) {
      const override = overrides[key];
      if (override) {
        sorted[key] = override;
      }
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify({ overrides: sorted }, null, 2)}\n`, "utf8");
    await rename(tmp, filePath);
    return { overrides: sorted };
  };

  return {
    list: (): Promise<NpcOverrideFile> => serial(read),

    /** Replaces the NPC's override; an empty one removes it. */
    put: (key: string, override: NpcOverride): Promise<NpcOverrideFile> => serial(async () => {
      const overrides = { ...(await read()).overrides };
      if (isEmptyNpcOverride(override)) {
        delete overrides[key];
      } else {
        overrides[key] = override;
      }
      return write(overrides);
    })
  };
};

export type NpcOverrideStore = ReturnType<typeof createNpcOverrideStore>;

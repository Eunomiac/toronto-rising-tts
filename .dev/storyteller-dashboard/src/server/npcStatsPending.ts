import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { NpcStatsFile } from "../shared/npcStats.js";

/**
 * Named NPCs whose stat block was edited in the dashboard and not yet written back to the Toronto Rising sheet
 * (`data/npc-stats-pending.json`, git-ignored): `{ <characterKey>: <ISO time of the last edit> }`. The server adds
 * keys when a Stats-window save changes a named block; `npm run npc-stats:push` (build time) writes them to the
 * sheet and removes them; `npm run npc-stats:import` leaves pending keys alone.
 */

export type PendingEdits = Readonly<Record<string, string>>;

export const PENDING_FILE_NAME = "npc-stats-pending.json";

let queue: Promise<unknown> = Promise.resolve();
const serial = <R>(task: () => Promise<R>): Promise<R> => {
  const next = queue.then(task);
  queue = next.catch(() => undefined);
  return next;
};

export const readPending = async (filePath: string): Promise<PendingEdits> => {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${filePath} is not an object of character keys`);
  }
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
};

const writePending = async (filePath: string, pending: PendingEdits): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
};

/** Character keys (not `generic:` / `kept:`) in `keys` whose named block differs between the two files. */
export const editedNamedKeys = (before: NpcStatsFile, after: NpcStatsFile, keys: readonly string[]): string[] =>
  keys.filter((key) => !key.includes(":") && !isDeepStrictEqual(before[key]?.named, after[key]?.named));

export const markPending = (filePath: string, keys: readonly string[], at: Date): Promise<void> =>
  serial(async () => {
    const pending = { ...(await readPending(filePath)) };
    for (const key of keys) {
      pending[key] = at.toISOString();
    }
    await writePending(filePath, pending);
  });

/** Removes the entries in `done` unless the key was edited again since (its time changed). */
export const clearPending = (filePath: string, done: PendingEdits): Promise<void> =>
  serial(async () => {
    const pending = { ...(await readPending(filePath)) };
    for (const [key, at] of Object.entries(done)) {
      if (pending[key] === at) {
        delete pending[key];
      }
    }
    await writePending(filePath, pending);
  });

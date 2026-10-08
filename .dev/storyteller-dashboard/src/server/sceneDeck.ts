import { copyFile, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeSceneDeck, type SceneDeck, type SceneDeckPatch } from "../shared/sceneDeck.js";

/**
 * `data/scene-deck.json` (git-ignored): the Scenes tab's on-deck scenes, scene notes and roster layout. Writes are
 * serial and atomic (tmp + rename). After a write, a timestamped copy goes to the backup folder at most every
 * `BACKUP_INTERVAL_MS`; the folder keeps the last `KEEP_RECENT` copies plus the first copy of each day.
 */

export const BACKUP_INTERVAL_MS = 10 * 60_000;
export const KEEP_RECENT = 50;

const BACKUP_NAME = /^scene-deck-(\d{8})-\d{6}\.json$/;

const pad = (value: number): string => String(value).padStart(2, "0");

export const backupName = (at: Date): string =>
  `scene-deck-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}.json`;

/** Backup file names to delete: everything except the newest `keepRecent` and the oldest copy of each day. */
export const backupsToPrune = (names: readonly string[], keepRecent: number): readonly string[] => {
  const sorted = names.filter((name) => BACKUP_NAME.test(name)).sort();
  const keep = new Set(sorted.slice(-keepRecent));
  const days = new Set<string>();
  for (const name of sorted) {
    const day = BACKUP_NAME.exec(name)?.[1];
    if (day && !days.has(day)) {
      days.add(day);
      keep.add(name);
    }
  }
  return sorted.filter((name) => !keep.has(name));
};

export const createSceneDeckStore = (filePath: string, backupDir: string | null, now: () => Date = () => new Date()) => {
  let queue: Promise<unknown> = Promise.resolve();
  let lastBackupMs: number | null = null;

  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<SceneDeck> => {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return normalizeSceneDeck(null);
      }
      throw error;
    }
    return normalizeSceneDeck(JSON.parse(text));
  };

  const backup = async (): Promise<void> => {
    if (!backupDir) {
      return;
    }
    const at = now();
    if (lastBackupMs !== null && at.getTime() - lastBackupMs < BACKUP_INTERVAL_MS) {
      return;
    }
    await mkdir(backupDir, { recursive: true });
    await copyFile(filePath, path.join(backupDir, backupName(at)));
    lastBackupMs = at.getTime();
    for (const name of backupsToPrune(await readdir(backupDir), KEEP_RECENT)) {
      await unlink(path.join(backupDir, name));
    }
  };

  const write = async (deck: SceneDeck): Promise<SceneDeck> => {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(deck, null, 2)}\n`, "utf8");
    await rename(tmp, filePath);
    await backup();
    return deck;
  };

  return {
    get: (): Promise<SceneDeck> => serial(read),
    patch: (patch: SceneDeckPatch): Promise<SceneDeck> => serial(async () => write({ ...(await read()), ...patch }))
  };
};

export type SceneDeckStore = ReturnType<typeof createSceneDeckStore>;

/** `<backupDir>/Dashboard Data` from the repo's `tts-assets.config.json`; null (no backups) when it has none. */
export const resolveSceneDeckBackupDir = async (repoRoot: string): Promise<string | null> => {
  let text: string;
  try {
    text = await readFile(path.join(repoRoot, "tts-assets.config.json"), "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
  const config: unknown = JSON.parse(text);
  const dir = typeof config === "object" && config !== null ? (config as { backupDir?: unknown }).backupDir : undefined;
  return typeof dir === "string" && dir.trim() !== "" ? path.join(dir, "Dashboard Data") : null;
};

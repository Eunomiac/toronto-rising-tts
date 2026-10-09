import { copyFile, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * A dashboard-owned JSON file under `data/` (git-ignored: the scene deck and the scene library). Writes are serial
 * and atomic (tmp + rename). After a write, a timestamped copy goes to the backup folder at most every
 * `BACKUP_INTERVAL_MS`; the folder keeps each file's last `KEEP_RECENT` copies plus its first copy of each day.
 */

export const BACKUP_INTERVAL_MS = 10 * 60_000;
export const KEEP_RECENT = 50;

const pad = (value: number): string => String(value).padStart(2, "0");

/** `<prefix>-YYYYMMDD-HHMMSS.json`. */
export const backupName = (prefix: string, at: Date): string =>
  `${prefix}-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}.json`;

/** This file's backup names to delete: everything except the newest `keepRecent` and the oldest copy of each day. */
export const backupsToPrune = (prefix: string, names: readonly string[], keepRecent: number): readonly string[] => {
  const pattern = new RegExp(`^${prefix}-(\\d{8})-\\d{6}\\.json$`);
  const sorted = names.filter((name) => pattern.test(name)).sort();
  const keep = new Set(sorted.slice(-keepRecent));
  const days = new Set<string>();
  for (const name of sorted) {
    const day = pattern.exec(name)?.[1];
    if (day && !days.has(day)) {
      days.add(day);
      keep.add(name);
    }
  }
  return sorted.filter((name) => !keep.has(name));
};

export type DataFileStore<T> = {
  readonly get: () => Promise<T>;
  /** Replaces the given top-level sections and keeps the rest. */
  readonly patch: (patch: Partial<T>) => Promise<T>;
};

export const createDataFileStore = <T extends object>(options: {
  readonly filePath: string;
  readonly backupDir: string | null;
  readonly backupPrefix: string;
  /** Reads whatever is on disk (null when the file does not exist yet). */
  readonly normalize: (value: unknown) => T;
  readonly now?: () => Date;
}): DataFileStore<T> => {
  const { filePath, backupDir, backupPrefix, normalize, now = () => new Date() } = options;
  let queue: Promise<unknown> = Promise.resolve();
  let lastBackupMs: number | null = null;

  const serial = <R>(task: () => Promise<R>): Promise<R> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<T> => {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return normalize(null);
      }
      throw error;
    }
    return normalize(JSON.parse(text));
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
    await copyFile(filePath, path.join(backupDir, backupName(backupPrefix, at)));
    lastBackupMs = at.getTime();
    for (const name of backupsToPrune(backupPrefix, await readdir(backupDir), KEEP_RECENT)) {
      await unlink(path.join(backupDir, name));
    }
  };

  const write = async (value: T): Promise<T> => {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tmp, filePath);
    await backup();
    return value;
  };

  return {
    get: () => serial(read),
    patch: (patch) => serial(async () => write({ ...(await read()), ...patch }))
  };
};

/** `<backupDir>/Dashboard Data` from the repo's `tts-assets.config.json`; null (no backups) when it has none. */
export const resolveDashboardBackupDir = async (repoRoot: string): Promise<string | null> => {
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

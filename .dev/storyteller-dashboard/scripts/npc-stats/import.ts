import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { backupName, resolveDashboardBackupDir } from "../../src/server/dataFileStore.ts";
import { PENDING_FILE_NAME, readPending } from "../../src/server/npcStatsPending.ts";
import { normalizeNpcStatsFile, normalizeStatBlock, type NpcStats } from "../../src/shared/npcStats.ts";
import { parseCharacters } from "./sheet.ts";
import { fetchCharactersRows } from "./sheetFetch.ts";

/**
 * npm run npc-stats:import — the Toronto Rising sheet's CHARACTERS tab is the source of truth for named NPC stats.
 * Replaces the `named` block of every statted sheet row in data/npc-stats.json (git-ignored) and keeps everything
 * else (generic tiers, kept characters, named blocks of keys not on the sheet, and dashboard edits still waiting in
 * data/npc-stats-pending.json for `npc-stats:push`). Any unreadable cell stops the import before anything is
 * written. The file is backed up first. Reload the dashboard page afterwards.
 */

const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const statsPath = path.join(dashboardDir, "data", "npc-stats.json");
const pendingPath = path.join(dashboardDir, "data", PENDING_FILE_NAME);

const readStatsFile = async (): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(statsPath, "utf8")) as unknown;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const main = async (): Promise<void> => {
  const { blocks, skipped, errors: parseErrors } = parseCharacters(await fetchCharactersRows());
  const errors = [...parseErrors];
  for (const [key, block] of blocks) {
    if (!isDeepStrictEqual(normalizeStatBlock(block), block)) {
      errors.push(`${key}: the stat block does not survive the dashboard's own checks (a value is out of range)`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`${errors.length} CHARACTERS row(s) could not be read; nothing was written:\n  ${errors.join("\n  ")}`);
  }

  const pending = await readPending(pendingPath);
  const raw = await readStatsFile();
  const current = normalizeNpcStatsFile(raw);
  const next: Record<string, NpcStats> = { ...current };
  let added = 0;
  let changed = 0;
  const waiting: string[] = [];
  for (const [key, block] of blocks) {
    if (key in pending) {
      waiting.push(key);
      continue;
    }
    const before = current[key]?.named;
    if (!before) {
      added++;
    } else if (!isDeepStrictEqual(before, block)) {
      changed++;
    }
    next[key] = { ...current[key], named: block };
  }
  const offSheet = Object.keys(current).filter((key) => current[key]?.named && !blocks.has(key) && !key.includes(":"));

  if (added + changed === 0) {
    console.log(`npc-stats:import: ${blocks.size - waiting.length} named NPCs, all unchanged.`);
  } else {
    if (raw !== null) {
      const backupDir = await resolveDashboardBackupDir(repoRoot);
      if (backupDir) {
        await mkdir(backupDir, { recursive: true });
        await copyFile(statsPath, path.join(backupDir, backupName("npc-stats-import", new Date())));
      }
    }
    await mkdir(path.dirname(statsPath), { recursive: true });
    const tmp = `${statsPath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(normalizeNpcStatsFile(next), null, 2)}\n`, "utf8");
    await rename(tmp, statsPath);
    console.log(`npc-stats:import: ${blocks.size - waiting.length} named NPCs (${added} new, ${changed} changed). Reload the dashboard page.`);
  }
  if (waiting.length > 0) {
    console.log(`npc-stats:import: kept the dashboard's stats for edits not yet written to the sheet (run npm run npc-stats:push): ${waiting.join(", ")}`);
  }
  console.log(`npc-stats:import: skipped ${skipped.length} row(s) with no stats: ${skipped.join(", ")}`);
  if (offSheet.length > 0) {
    console.log(`npc-stats:import: kept named stats not on the sheet: ${offSheet.join(", ")}`);
  }
};

await main();

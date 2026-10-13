import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { backupName, resolveDashboardBackupDir } from "../../src/server/dataFileStore.ts";
import { parseCsv } from "../../src/shared/csv.ts";
import { normalizeNpcStatsFile, normalizeStatBlock, type NpcStats } from "../../src/shared/npcStats.ts";
import { parseCharacters } from "./sheet.ts";

/**
 * npm run npc-stats:import — the Toronto Rising sheet's CHARACTERS tab is the source of truth for named NPC stats.
 * Replaces the `named` block of every statted sheet row in data/npc-stats.json (git-ignored) and keeps everything
 * else (generic tiers, kept characters, named blocks of keys not on the sheet). Any unreadable cell stops the import
 * before anything is written. The file is backed up first. Reload the dashboard page afterwards.
 */

const SHEET_ID = "10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs";
const TAB = "CHARACTERS";
const USER_AGENT = "toronto-rising-npc-stats-import/1.0";

const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const statsPath = path.join(dashboardDir, "data", "npc-stats.json");

const fetchText = async (url: string, what: string): Promise<string> => {
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": USER_AGENT } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${what}: HTTP ${response.status} from ${url}`);
  }
  return text;
};

/** The tab's gid, from the sheet's public HTML view (the tab list there carries each tab's gid). */
const resolveGid = async (): Promise<string> => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;
  const html = await fetchText(url, "sheet tab list");
  const match = new RegExp(`name: "${TAB}"[^}]*?gid: "(\\d+)"`).exec(html);
  if (!match) {
    throw new Error(`No "${TAB}" tab in ${url} (renamed, or the sheet is no longer public?)`);
  }
  return match[1]!;
};

/** The whole tab, headers included (the gviz CSV endpoint drops text cells in numeric columns). */
const fetchTab = async (gid: string): Promise<string> => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const text = await fetchText(url, TAB);
  const head = text.trimStart();
  if (head.startsWith("<!DOCTYPE") || head.startsWith("<html") || head.includes("Sign in to your Google Account")) {
    throw new Error(`${TAB}: got an HTML page, not CSV. Check the sheet's sharing. URL: ${url}`);
  }
  return text;
};

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
  const { blocks, skipped, errors: parseErrors } = parseCharacters(parseCsv(await fetchTab(await resolveGid())));
  const errors = [...parseErrors];
  for (const [key, block] of blocks) {
    if (!isDeepStrictEqual(normalizeStatBlock(block), block)) {
      errors.push(`${key}: the stat block does not survive the dashboard's own checks (a value is out of range)`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`${errors.length} CHARACTERS row(s) could not be read; nothing was written:\n  ${errors.join("\n  ")}`);
  }

  const raw = await readStatsFile();
  const current = normalizeNpcStatsFile(raw);
  const next: Record<string, NpcStats> = { ...current };
  let added = 0;
  let changed = 0;
  for (const [key, block] of blocks) {
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
    console.log(`npc-stats:import: ${blocks.size} named NPCs, all unchanged.`);
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
    console.log(`npc-stats:import: ${blocks.size} named NPCs (${added} new, ${changed} changed). Reload the dashboard page.`);
  }
  console.log(`npc-stats:import: skipped ${skipped.length} row(s) with no stats: ${skipped.join(", ")}`);
  if (offSheet.length > 0) {
    console.log(`npc-stats:import: kept named stats not on the sheet: ${offSheet.join(", ")}`);
  }
};

await main();

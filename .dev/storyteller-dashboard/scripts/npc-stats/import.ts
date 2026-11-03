import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { backupName, resolveDashboardBackupDir } from "../../src/server/dataFileStore.ts";
import { loadMemoriamNpcCatalog, type MemoriamNpc } from "../../src/server/memoriamNpcCatalog.ts";
import { PENDING_FILE_NAME, readPending } from "../../src/server/npcStatsPending.ts";
import {
  genericStatsKey, normalizeNpcStatsFile, normalizeStatBlock, preserveNpcRollMetadata,
  type KeptNpc, type NpcStatBlock, type NpcStats, type NpcStatSlot
} from "../../src/shared/npcStats.ts";
import { memoriamStem } from "../../src/shared/memoriamNpc.ts";
import { blank, parseStatRecord, parseTier, sheetRecords, type SheetRecord } from "./sheet.ts";


const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const statsPath = path.join(dashboardDir, "data", "npc-stats.json");
const pendingPath = path.join(dashboardDir, "data", PENDING_FILE_NAME);
const memoriamPath = path.join(dashboardDir, "data", "memoriam-npcs.json");

type Imported = Map<string, Partial<Record<NpcStatSlot, NpcStatBlock>>>;
// The shared loader is CommonJS because the TTS build scripts also consume it.
const require = createRequire(import.meta.url);
const { loadSnapshot, dataOf, list } = require("../../../scripts/lib/sheet_exports.js") as {
  loadSnapshot: () => Promise<unknown>;
  dataOf: (snapshot: unknown, name: string) => Record<string, string>[];
  list: (value: string) => string[];
};
const hasStats = (row: SheetRecord): boolean => ["Difficulty", "Health", "Willpower", "Phy", "Soc", "Men", "Pow", "Exceptional Pools", "Attacks", "Powers"].some(header => !blank(row[header]));
const collectImports = async (): Promise<{ imported: Imported; skipped: string[]; errors: string[]; aliasGroups: string[][] }> => {
  const snapshot = await loadSnapshot();
  const imported: Imported = new Map(), skipped: string[] = [], errors: string[] = [], aliasGroups: string[][] = [];
  const add = (key: string, slot: NpcStatSlot, block: NpcStatBlock): void => {
    const slots = imported.get(key) ?? {};
    if (slots[slot] && !isDeepStrictEqual(slots[slot], block)) { errors.push(`${key}/${slot}: conflicting profile rows`); return; }
    slots[slot] = block; imported.set(key, slots);
  };
  for (const row of dataOf(snapshot, "CHARACTERS_UNIQUE")) {
    const key = row["API Key"]!;
    const keys = [key, ...list(row["Legacy API Keys"] ?? "")];
    aliasGroups.push(keys);
    if (row.Type === "PC" || !hasStats(row)) { skipped.push(key); continue; }
    try {
      const block = parseStatRecord({ ...row, Tags: row["Stat Tags"] ?? row.Tags ?? "" }, key, true);
      keys.forEach(k => add(k, "named", block));
    } catch (reason) { errors.push(`${key}: ${String(reason)}`); }
  }
  for (const row of dataOf(snapshot, "CHARACTERS_GENERIC")) {
    const key = row["API Key"]!, tier = parseTier(row.Tier ?? "");
    if (!tier) { errors.push(`${key}: unsupported Tier ${row.Tier}`); continue; }
    try {
      const block = parseStatRecord(row, row["Stat Key"]!, false);
      // Preserve existing stat keys; repeated figures share their supplied profile tiers.
      const legacy = row["Source Group"] === "Memoriam" ? memoriamStem(key) : row.Label!;
      add(genericStatsKey(legacy), tier, block);
    } catch (reason) { errors.push(`${key}/${tier}: ${String(reason)}`); }
  }
  return { imported, skipped, errors, aliasGroups };
};

const readStatsFile = async (): Promise<unknown> => {
  try { return JSON.parse(await readFile(statsPath, "utf8")) as unknown; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
};

const main = async (): Promise<void> => {
  const { imported, skipped, errors, aliasGroups } = await collectImports();
  for (const [key, slots] of imported) for (const [slot, block] of Object.entries(slots)) {
    if (!isDeepStrictEqual(normalizeStatBlock(block), block)) errors.push(`${key}/${slot}: block does not survive dashboard validation`);
  }
  if (errors.length > 0) throw new Error(`${errors.length} Sheet row(s) could not be imported; nothing was written:\n  ${errors.join("\n  ")}`);

  const pending = { ...await readPending(pendingPath) };
  for (const keys of aliasGroups) {
    const waiting = keys.find(key => key in pending);
    if (waiting) for (const key of keys) pending[key] = pending[waiting]!;
  }
  const raw = await readStatsFile();
  const current = normalizeNpcStatsFile(raw);
  const next: Record<string, NpcStats> = { ...current };
  for (const keys of aliasGroups) {
    const waiting = keys.find(key => key in pending && current[key]);
    if (waiting) for (const key of keys) next[key] = current[waiting]!;
  }
  let added = 0;
  let changed = 0;
  const waiting: string[] = [];
  for (const [key, slots] of imported) {
    if (key in pending) { waiting.push(key); continue; }
    // The export snapshot owns all imported stat slots. Keep only a character record attached to the same key;
    // otherwise a tier removed from the Sheet would survive forever as a stale dashboard-only block.
    const merged = (current[key]?.kept ? { kept: current[key].kept } : {}) as Partial<Record<NpcStatSlot, NpcStatBlock>> & { kept?: KeptNpc };
    for (const [slot, block] of Object.entries(slots) as [NpcStatSlot, NpcStatBlock][]) {
      const siblings = aliasGroups.find(keys => keys.includes(key)) ?? [];
      const before = current[key]?.[slot] ?? siblings.map(k => current[k]?.[slot]).find(Boolean);
      const value = preserveNpcRollMetadata(block, before);
      if (!before) added++; else if (!isDeepStrictEqual(before, value)) changed++;
      merged[slot] = value;
    }
    for (const slot of ["named", "weak", "average", "gifted", "deadly", "superhuman"] as const) {
      if (current[key]?.[slot] && !slots[slot]) changed++;
    }
    next[key] = merged;
  }
  const output = normalizeNpcStatsFile(next);
  if (!isDeepStrictEqual(current, output)) {
    if (raw !== null) {
      const backupDir = await resolveDashboardBackupDir(repoRoot);
      if (backupDir) { await mkdir(backupDir, { recursive: true }); await copyFile(statsPath, path.join(backupDir, backupName("npc-stats-import", new Date()))); }
    }
    await mkdir(path.dirname(statsPath), { recursive: true });
    const tmp = `${statsPath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    await rename(tmp, statsPath);
  }
  console.log(`npc-stats:import: ${imported.size} NPC types (${added} new blocks, ${changed} changed blocks; ${skipped.length} PC/generic/unstatted character rows skipped).`);
  if (waiting.length > 0) console.log(`npc-stats:import: preserved ${waiting.length} pending dashboard edit(s): ${waiting.join(", ")}`);
};

await main();

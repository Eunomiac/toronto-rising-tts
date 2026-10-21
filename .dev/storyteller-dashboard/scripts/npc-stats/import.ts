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
import { fetchNpcStatTabs } from "./sheetFetch.ts";

const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const repoRoot = path.resolve(dashboardDir, "..", "..");
const statsPath = path.join(dashboardDir, "data", "npc-stats.json");
const pendingPath = path.join(dashboardDir, "data", PENDING_FILE_NAME);
const memoriamPath = path.join(dashboardDir, "data", "memoriam-npcs.json");

type Imported = Map<string, Partial<Record<NpcStatSlot, NpcStatBlock>>>;
const truthy = (value: string | undefined): boolean => /^(?:true|yes|1)$/i.test(value?.trim() ?? "");
const list = (value: string): readonly string[] => value.split(",").map((part) => part.trim()).filter(Boolean);
const words = (value: string): ReadonlySet<string> => new Set(value.split(/\s+/).map((part) => part.trim().toLowerCase()).filter(Boolean));

const hasStats = (row: SheetRecord): boolean => !blank(row.Difficulty)
  || ["Health", "Willpower", "Phy", "Soc", "Men", "Pow", "Exceptional Pools", "Attacks", "Powers"]
    .some((header) => !blank(row[header]));

const add = (out: Imported, key: string, slot: NpcStatSlot, block: NpcStatBlock, source: string, errors: string[]): void => {
  const slots = out.get(key) ?? {};
  if (slots[slot]) errors.push(`${source}: duplicates ${key}/${slot}`);
  else { slots[slot] = block; out.set(key, slots); }
};

const genericMemoriamTargets = (row: SheetRecord, catalog: readonly MemoriamNpc[]): readonly string[] => {
  const wantedTags = words(row.Tags ?? "");
  const matches = catalog.filter((npc) => {
    if (!npc.isGeneric || npc.label !== row.Label) return false;
    if (!blank(row.Location) && !list(npc.location).includes(row.Location ?? "")) return false;
    if (!blank(row.Year) && !list(npc.year).includes(row.Year ?? "")) return false;
    return [...words(npc.tags)].every((tag) => wantedTags.has(tag));
  });
  return [...new Set(matches.map((npc) => genericStatsKey(memoriamStem(npc.key))))];
};

const collectImports = async (): Promise<{ imported: Imported; skipped: string[]; errors: string[] }> => {
  const tabs = await fetchNpcStatTabs();
  const { npcs } = await loadMemoriamNpcCatalog(memoriamPath);
  const imported: Imported = new Map();
  const skipped: string[] = [];
  const errors: string[] = [];
  const parse = (row: SheetRecord, key: string, named: boolean, source: string): NpcStatBlock | undefined => {
    try { return parseStatRecord(row, key, named); }
    catch (reason) { errors.push(`${source}: ${reason instanceof Error ? reason.message : String(reason)}`); return undefined; }
  };

  sheetRecords(tabs.CHARACTERS, "CHARACTERS").forEach((row, index) => {
    const key = row["API key"] ?? "";
    if (!key) return;
    if (truthy(row["IS PC?"]) || truthy(row["Is Generic?"]) || !hasStats(row)) { skipped.push(`CHARACTERS:${key}`); return; }
    const block = parse(row, key, true, `CHARACTERS row ${index + 2}`);
    if (block) add(imported, key, "named", block, `CHARACTERS row ${index + 2}`, errors);
  });
  sheetRecords(tabs["GENERICS STATS"], "GENERICS STATS").forEach((row, index) => {
    const tier = parseTier(row.Tier ?? "");
    const label = row.Label ?? "";
    if (!row["Stat Key"] || !label || !tier) { errors.push(`GENERICS STATS row ${index + 2}: missing Stat Key, Label, or supported Tier`); return; }
    const block = parse(row, row["Stat Key"], false, `GENERICS STATS row ${index + 2}`);
    if (block) add(imported, genericStatsKey(label), tier, block, `GENERICS STATS row ${index + 2}`, errors);
  });
  sheetRecords(tabs["MEM NAMED STATS"], "MEM NAMED STATS").forEach((row, index) => {
    const key = row["Memoriam Key"] ?? "";
    if (!key) { errors.push(`MEM NAMED STATS row ${index + 2}: missing Memoriam Key`); return; }
    const block = parse(row, key, true, `MEM NAMED STATS row ${index + 2}`);
    if (block) add(imported, key, "named", block, `MEM NAMED STATS row ${index + 2}`, errors);
  });
  sheetRecords(tabs["MEM GENERIC STATS"], "MEM GENERIC STATS").forEach((row, index) => {
    const tier = parseTier(row.Tier ?? "");
    const source = `MEM GENERIC STATS row ${index + 2}`;
    if (!row["Stat Key"] || !tier) { errors.push(`${source}: missing Stat Key or supported Tier`); return; }
    const targets = genericMemoriamTargets(row, npcs);
    if (targets.length === 0) { errors.push(`${source}: no Memoriam generic matches ${row.Label}/${row.Location}/${row.Year}`); return; }
    const block = parse(row, row["Stat Key"], false, source);
    if (block) targets.forEach((target) => add(imported, target, tier, block, source, errors));
  });
  return { imported, skipped, errors };
};

const readStatsFile = async (): Promise<unknown> => {
  try { return JSON.parse(await readFile(statsPath, "utf8")) as unknown; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
};

const main = async (): Promise<void> => {
  const { imported, skipped, errors } = await collectImports();
  for (const [key, slots] of imported) for (const [slot, block] of Object.entries(slots)) {
    if (!isDeepStrictEqual(normalizeStatBlock(block), block)) errors.push(`${key}/${slot}: block does not survive dashboard validation`);
  }
  if (errors.length > 0) throw new Error(`${errors.length} Sheet row(s) could not be imported; nothing was written:\n  ${errors.join("\n  ")}`);

  const pending = await readPending(pendingPath);
  const raw = await readStatsFile();
  const current = normalizeNpcStatsFile(raw);
  const next: Record<string, NpcStats> = { ...current };
  let added = 0;
  let changed = 0;
  const waiting: string[] = [];
  for (const [key, slots] of imported) {
    if (key in pending) { waiting.push(key); continue; }
    // The four Sheet tabs own all imported stat slots. Keep only a character record attached to the same key;
    // otherwise a tier removed from the Sheet would survive forever as a stale dashboard-only block.
    const merged = (current[key]?.kept ? { kept: current[key].kept } : {}) as Partial<Record<NpcStatSlot, NpcStatBlock>> & { kept?: KeptNpc };
    for (const [slot, block] of Object.entries(slots) as [NpcStatSlot, NpcStatBlock][]) {
      const before = current[key]?.[slot];
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

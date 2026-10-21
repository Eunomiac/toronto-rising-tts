import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { clearPending, PENDING_FILE_NAME, readPending } from "../../src/server/npcStatsPending.ts";
import { normalizeNpcStatsFile } from "../../src/shared/npcStats.ts";
import { sheetRecords } from "./sheet.ts";
import { fetchCharactersRows } from "./sheetFetch.ts";
import { planRowWrite } from "./sheetWrite.ts";
import { writeSheet, type SheetWriteRow } from "./sheetWriter.ts";

/**
 * npm run npc-stats:push — writes named NPC stat edits made in the dashboard (data/npc-stats-pending.json) to the
 * Toronto Rising sheet's CHARACTERS tab, then clears them. Runs at build time, before `npc-stats:import`; it never
 * runs during play. With no pending edits it does nothing (no network). `--dry-run` shows the changes without
 * writing. Every written cell (with its old value) is appended to data/npc-stats-sheet-log.jsonl. An edit it cannot
 * write stays pending (the import keeps the dashboard's version) and fails the command.
 */

const dashboardDir = path.resolve(import.meta.dirname, "..", "..");
const dataDir = path.join(dashboardDir, "data");
const pendingPath = path.join(dataDir, PENDING_FILE_NAME);
const logPath = path.join(dataDir, "npc-stats-sheet-log.jsonl");
const dryRun = process.argv.includes("--dry-run");

const short = (value: unknown): string => {
  const text = String(value);
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
};

const pending = await readPending(pendingPath);
const keys = Object.keys(pending).sort();
if (keys.length === 0) {
  console.log("npc-stats:push: no dashboard edits waiting for the sheet.");
  process.exit(0);
}

const stats = normalizeNpcStatsFile(JSON.parse(await readFile(path.join(dataDir, "npc-stats.json"), "utf8")));
const rows = new Map<string, Readonly<Record<string, string>>>();
for (const row of sheetRecords(await fetchCharactersRows(), "CHARACTERS")) {
  const key = (row["API key"] ?? "").trim();
  if (key !== "" && !rows.has(key)) {
    rows.set(key, row);
  }
}

const done: Record<string, string> = {};
const writes: SheetWriteRow[] = [];
const notes: string[] = [];
const problems: string[] = [];
for (const key of keys) {
  const block = stats[key]?.named;
  const row = rows.get(key);
  if (!block) {
    notes.push(`${key}: no stats in the dashboard any more; the sheet is left as it is.`);
    done[key] = pending[key]!;
    continue;
  }
  if (!row) {
    notes.push(`${key}: not on the sheet, so its stats stay dashboard-only.`);
    done[key] = pending[key]!;
    continue;
  }
  const plan = planRowWrite(key, block, row);
  if (plan.problems.length > 0) {
    problems.push(...plan.problems.map((problem) => `${key}: ${problem}`));
    continue;
  }
  if (plan.notesDiffer) {
    notes.push(`${key}: Notes edits are not written to the Sheet (Notes come from its custom-power and Special Abilities columns); the next import replaces them.`);
  }
  if (Object.keys(plan.cells).length === 0) {
    done[key] = pending[key]!;
  } else {
    writes.push({ key, cells: plan.cells });
  }
}

// A bad pending edit must stop the whole batch before the Apps Script sees any rows. That keeps a FULL build from
// partially updating the Sheet when an older dashboard edit no longer fits the current Sheet schema.
if (problems.length > 0) {
  throw new Error(`${problems.length} edit(s) could not be written and stay waiting (the import keeps the dashboard's version):\n  ${problems.join("\n  ")}`);
}

if (writes.length > 0) {
  const reply = await writeSheet(writes, dryRun);
  for (const change of reply.changes) {
    console.log(`  ${change.key} · ${change.column}: ${short(change.before)}  →  ${short(change.after)}`);
  }
  if (!dryRun) {
    const at = new Date().toISOString();
    const lines = reply.changes.map((change) => JSON.stringify({ at, ...change }));
    if (lines.length > 0) {
      await appendFile(logPath, `${lines.join("\n")}\n`, "utf8");
    }
    for (const write of writes) {
      done[write.key] = pending[write.key]!;
    }
  }
}
if (!dryRun) {
  await clearPending(pendingPath, done);
}

const verb = dryRun ? "would write" : "wrote";
console.log(`npc-stats:push: ${verb} ${writes.length} NPC(s) to the sheet${dryRun ? " (dry run: nothing written)" : ""}.`);
for (const note of notes) {
  console.log(`npc-stats:push: ${note}`);
}

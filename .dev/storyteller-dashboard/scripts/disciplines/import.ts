import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  kindForExportDiscipline,
  normalizeDisciplinePart,
  type DisciplineEntry,
  type DisciplinesCatalogFile
} from "../../src/shared/disciplinesCatalog.ts";
import { exportDisciplineLabel, extractStyledPowersFromXlsx } from "./xlsxPowers.ts";

const scriptDir = import.meta.dirname;
const dashboardDir = path.resolve(scriptDir, "..", "..");
const dataDir = process.env.TR_DASHBOARD_DATA_DIR || path.join(dashboardDir, "data");
const catalogPath = path.join(dataDir, "disciplines-catalog.json");
const V5_XLSX_URL =
  "https://docs.google.com/spreadsheets/d/1U8Ktl4iHOwqldvikCKtEdXd56Mgt6LGukP4P_sjC0ME/export?format=xlsx";

const require = createRequire(import.meta.url);
const { dataOf, defaultSnapshotPath, fetchSnapshot } = require("../../../scripts/lib/sheet_exports.js") as {
  dataOf: (snapshot: unknown, name: string) => Record<string, string>[];
  defaultSnapshotPath: string;
  fetchSnapshot: () => Promise<unknown>;
};

/** Prefer the local cache for DISCIPLINES only; refresh the full snapshot when asked. */
const loadExportRows = async (): Promise<Record<string, string>[]> => {
  if (process.env.TR_DISCIPLINES_REFRESH_EXPORT === "1") {
    const snapshot = await fetchSnapshot();
    return dataOf(snapshot, "DISCIPLINES");
  }
  const snapshotPath = process.env.TR_EXPORT_SNAPSHOT || defaultSnapshotPath;
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as unknown;
  return dataOf(snapshot, "DISCIPLINES");
};

const blank = (value: string | undefined): boolean => {
  const text = (value ?? "").trim();
  return text === "" || text === "~" || text === "–" || text === "-";
};

const pairKey = (discipline: string, name: string): string =>
  `${normalizeDisciplinePart(discipline)}::${normalizeDisciplinePart(name)}`;

const loadXlsx = async (): Promise<{ buffer: Buffer; source: string }> => {
  if (process.env.TR_DISCIPLINES_XLSX) {
    return { buffer: readFileSync(process.env.TR_DISCIPLINES_XLSX), source: process.env.TR_DISCIPLINES_XLSX };
  }
  const response = await fetch(V5_XLSX_URL, { cache: "no-store", signal: AbortSignal.timeout(120000), redirect: "follow" });
  if (!response.ok) throw new Error(`V5: DISCIPLINES xlsx: HTTP ${response.status}`);
  return { buffer: Buffer.from(await response.arrayBuffer()), source: V5_XLSX_URL };
};

const main = async (): Promise<void> => {
  const exportRows = await loadExportRows();
  const { buffer, source: xlsxSource } = await loadXlsx();
  const { powers: styled, warnings } = extractStyledPowersFromXlsx(buffer);

  const styledByPair = new Map<string, (typeof styled)[number]>();
  const styledDupes: string[] = [];
  for (const power of styled) {
    const discipline = exportDisciplineLabel(power.sheetName);
    const key = pairKey(discipline, power.name);
    if (styledByPair.has(key)) styledDupes.push(key);
    styledByPair.set(key, power);
  }
  if (styledDupes.length) {
    throw new Error(`Duplicate styled powers in xlsx: ${styledDupes.slice(0, 10).join(", ")}`);
  }

  const entries: DisciplineEntry[] = [];
  const missing: string[] = [];
  for (const row of exportRows) {
    const discipline = (row.Discipline ?? "").trim();
    const name = (row.Name ?? "").trim();
    const level = Number(row.Level);
    if (!discipline || !name || !Number.isInteger(level)) {
      throw new Error(`EXPORT_DISCIPLINES: invalid row ${discipline} / ${name}`);
    }
    const key = pairKey(discipline, name);
    const rich = styledByPair.get(key);
    if (!rich) {
      missing.push(`${discipline} / ${name}`);
      continue;
    }
    entries.push({
      discipline,
      level,
      name,
      kind: kindForExportDiscipline(discipline),
      description: row.Description ?? "",
      rouseChecks: row["Rouse Checks"] ?? "",
      ingredients: blank(row.Ingredients) ? "" : (row.Ingredients ?? "").trim(),
      process: blank(row.Process) ? "" : (row.Process ?? "").trim(),
      source: row.Source ?? "",
      systemHtml: rich.systemHtml,
      durationHtml: rich.durationHtml
    });
    styledByPair.delete(key);
  }

  if (missing.length) {
    throw new Error(
      `EXPORT_DISCIPLINES rows missing styled System/Duration (${missing.length}): ${missing.slice(0, 15).join("; ")}`
    );
  }

  const unused = [...styledByPair.values()].map((p) => `${exportDisciplineLabel(p.sheetName)} / ${p.name}`);
  if (unused.length) {
    console.warn(`Styled xlsx powers not in EXPORT_DISCIPLINES (${unused.length}): ${unused.slice(0, 10).join("; ")}`);
  }
  for (const warning of warnings) console.warn(warning);

  const catalog: DisciplinesCatalogFile = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    sourceExport: "EXPORT_DISCIPLINES",
    sourceXlsx: xlsxSource,
    entries
  };

  await mkdir(dataDir, { recursive: true });
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Wrote ${entries.length} discipline powers to ${catalogPath}`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

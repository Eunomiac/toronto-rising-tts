import { listZipEntryNames, readZipEntries } from "./zipEntries.ts";
import { collectFontWarnings, parseSharedStringsXml } from "./richTextHtml.ts";

export type StyledPowerCells = {
  readonly sheetName: string;
  readonly name: string;
  readonly systemHtml: string;
  readonly durationHtml: string;
  readonly systemPlain: string;
  readonly durationPlain: string;
};

type Cell = { readonly col: string; readonly row: number; readonly shared?: number; readonly inline?: string };

const parseCells = (rowXml: string, rowNumber: number): Cell[] => {
  const cells: Cell[] = [];
  for (const match of rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>(?:[\s\S]*?<v>([^<]*)<\/v>)?/g)) {
    const col = match[1] ?? "";
    const attrs = match[3] ?? "";
    const value = match[4];
    if (value === undefined) {
      cells.push({ col, row: rowNumber });
      continue;
    }
    if (/\bt="s"/.test(attrs)) {
      cells.push({ col, row: rowNumber, shared: Number(value) });
    } else if (/\bt="inlineStr"/.test(attrs)) {
      const isMatch = rowXml.match(new RegExp(`<c r="${col}${rowNumber}"[^>]*>[\\s\\S]*?<t(?:\\s[^>]*)?>([\\s\\S]*?)</t>`));
      cells.push({ col, row: rowNumber, inline: isMatch?.[1] ?? "" });
    } else {
      cells.push({ col, row: rowNumber, inline: value });
    }
  }
  return cells;
};

const decodeCell = (
  cell: Cell | undefined,
  shared: ReturnType<typeof parseSharedStringsXml>
): { readonly plain: string; readonly html: string } => {
  if (!cell) return { plain: "", html: "" };
  if (cell.shared !== undefined) {
    const item = shared[cell.shared];
    if (!item) throw new Error(`Shared string index ${cell.shared} out of range`);
    return { plain: item.plain, html: item.html };
  }
  const plain = cell.inline ?? "";
  return { plain, html: plain === "" ? "" : plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r\n|\n|\r/g, "<br>") };
};

/** Tabs that feed EXPORT_DISCIPLINES (skip Alchemy copy tabs and the export sheet). */
export const DISCIPLINE_SHEET_NAMES = [
  "ANIMALISM",
  "AUSPEX",
  "BLOOD SORCERY",
  "RITUALS",
  "CELERITY",
  "DOMINATE",
  "FORTITUDE",
  "OBFUSCATE",
  "OBLIVION",
  "CEREMONIES",
  "POTENCE",
  "PRESENCE",
  "PROTEAN"
] as const;

export const exportDisciplineLabel = (sheetName: string): string => {
  if (sheetName === "RITUALS") return "Rituals";
  if (sheetName === "CEREMONIES") return "Ceremonies";
  if (sheetName === "BLOOD SORCERY") return "Blood Sorcery";
  return sheetName.charAt(0) + sheetName.slice(1).toLowerCase();
};

export const extractStyledPowersFromXlsx = (
  buffer: Buffer
): { readonly powers: StyledPowerCells[]; readonly warnings: string[] } => {
  const names = listZipEntryNames(buffer);
  const workbookPath = "xl/workbook.xml";
  const relsPath = "xl/_rels/workbook.xml.rels";
  const sharedPath = "xl/sharedStrings.xml";
  const base = readZipEntries(buffer, [workbookPath, relsPath, sharedPath]);
  const workbook = base.get(workbookPath)!.toString("utf8");
  const rels = base.get(relsPath)!.toString("utf8");
  const shared = parseSharedStringsXml(base.get(sharedPath)!.toString("utf8"));

  const ridToTarget = new Map<string, string>();
  for (const match of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    ridToTarget.set(match[1] ?? "", (match[2] ?? "").replace(/^\//, ""));
  }
  // Some exports put Target before Id
  for (const match of rels.matchAll(/Target="([^"]+)"[^>]*Id="([^"]+)"/g)) {
    ridToTarget.set(match[2] ?? "", (match[1] ?? "").replace(/^\//, ""));
  }

  const sheetFiles: { readonly name: string; readonly path: string }[] = [];
  for (const match of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const tag = match[0];
    const name = tag.match(/\bname="([^"]+)"/)?.[1];
    const rid = tag.match(/\br:id="([^"]+)"/)?.[1];
    if (!name || !rid) continue;
    if (!(DISCIPLINE_SHEET_NAMES as readonly string[]).includes(name)) continue;
    const target = ridToTarget.get(rid);
    if (!target) throw new Error(`Workbook relationship missing for sheet ${name} (${rid})`);
    const path = target.startsWith("worksheets/") ? `xl/${target}` : `xl/worksheets/${target.replace(/^.*\//, "")}`;
    if (!names.includes(path)) throw new Error(`Worksheet file missing: ${path} for ${name}`);
    sheetFiles.push({ name, path });
  }

  const sheetBuffers = readZipEntries(buffer, sheetFiles.map((s) => s.path));
  const powers: StyledPowerCells[] = [];
  const warnings: string[] = [];
  const warnSeen = new Set<string>();

  for (const sheet of sheetFiles) {
    const xml = sheetBuffers.get(sheet.path)!.toString("utf8");
    let nameCol: string | undefined;
    let systemCol: string | undefined;
    let durationCol: string | undefined;

    for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const rowNumber = Number(rowMatch[1]);
      const cells = parseCells(rowMatch[2] ?? "", rowNumber);
      const byCol = new Map(cells.map((cell) => [cell.col, cell]));
      const labels = new Map<string, string>();
      for (const cell of cells) {
        const plain = decodeCell(cell, shared).plain.trim();
        if (plain !== "") labels.set(plain, cell.col);
      }

      if (labels.has("Name") && labels.has("System") && labels.has("Duration")) {
        nameCol = labels.get("Name");
        systemCol = labels.get("System");
        durationCol = labels.get("Duration");
        continue;
      }

      if (!nameCol || !systemCol || !durationCol) continue;
      const nameCell = byCol.get(nameCol);
      const name = decodeCell(nameCell, shared).plain.trim();
      // Level banners ("Oblivion ●●") and blank name cells — keep column map for following rows.
      if (name === "" || name === "Name" || /●/.test(name)) continue;

      const system = decodeCell(byCol.get(systemCol), shared);
      const duration = decodeCell(byCol.get(durationCol), shared);
      if (system.plain.trim() === "" && duration.plain.trim() === "") continue;

      for (const warning of collectFontWarnings([
        ...(shared[byCol.get(systemCol)?.shared ?? -1]?.runs ?? []),
        ...(shared[byCol.get(durationCol)?.shared ?? -1]?.runs ?? [])
      ])) {
        if (!warnSeen.has(warning)) {
          warnSeen.add(warning);
          warnings.push(warning);
        }
      }

      powers.push({
        sheetName: sheet.name,
        name,
        systemHtml: system.html,
        durationHtml: duration.html,
        systemPlain: system.plain,
        durationPlain: duration.plain
      });
    }
  }

  return { powers, warnings };
};

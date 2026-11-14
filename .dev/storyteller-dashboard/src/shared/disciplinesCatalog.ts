/**
 * Shared Disciplines catalog types and tooltip HTML for Power / Ritual / Ceremony tips.
 * Plain fields are escaped; systemHtml / durationHtml come from the importer (trusted).
 */

export type DisciplineKind = "power" | "ritual" | "ceremony";

export type DisciplineEntry = {
  readonly discipline: string;
  readonly level: number;
  readonly name: string;
  readonly kind: DisciplineKind;
  readonly description: string;
  readonly rouseChecks: string;
  readonly ingredients: string;
  readonly process: string;
  readonly source: string;
  readonly systemHtml: string;
  readonly durationHtml: string;
};

export type DisciplinesCatalogFile = {
  readonly version: 1;
  readonly fetchedAt: string;
  readonly sourceExport: string;
  readonly sourceXlsx: string;
  readonly entries: readonly DisciplineEntry[];
};

export const DISCIPLINE_CATALOG_KINDS = new Set<string>(["power", "ritual", "ceremony"]);

export const isDisciplineCatalogKind = (kind: string): kind is DisciplineKind =>
  DISCIPLINE_CATALOG_KINDS.has(kind);

export const normalizeDisciplinePart = (value: string): string =>
  value.normalize("NFC").trim().toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ");

export const disciplineKindNameKey = (kind: DisciplineKind, name: string): string =>
  `${kind}:${normalizeDisciplinePart(name)}`;

export const disciplinePairKey = (discipline: string, name: string): string =>
  `${normalizeDisciplinePart(discipline)}:${normalizeDisciplinePart(name)}`;

export const kindForExportDiscipline = (discipline: string): DisciplineKind => {
  const key = normalizeDisciplinePart(discipline);
  if (key === "rituals") return "ritual";
  if (key === "ceremonies") return "ceremony";
  return "power";
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const blank = (value: string): boolean => {
  const text = value.trim();
  return text === "" || text === "~" || text === "–" || text === "-";
};

/** Build the shared tooltip DOM string from a catalog entry. */
export const disciplineTooltipHtml = (entry: DisciplineEntry): string => {
  const dots = "●".repeat(Math.max(0, Math.min(5, entry.level)));
  const ingredients = blank(entry.ingredients)
    ? ""
    : `<div class="discipline_ingredients"><strong>Ingredients:</strong> ${escapeHtml(entry.ingredients)}</div>`;
  const process = blank(entry.process)
    ? ""
    : `<div class="discipline_process"><strong>Process:</strong> ${escapeHtml(entry.process)}</div>`;
  return [
    `<div class="discipline_tooltip">`,
    `<h1 class="discipline_title">${escapeHtml(entry.name)}</h1>`,
    `<h2 class="discipline_subtitle">${escapeHtml(entry.discipline)} ${dots}</h2>`,
    `<p class="discipline_flavor">${escapeHtml(entry.description)}</p>`,
    `<div class="discipline_body">`,
    `<div class="discipline_rouse_checks">Rouse Check(s): <strong>${escapeHtml(entry.rouseChecks)}</strong></div>`,
    ingredients,
    process,
    `<div class="discipline_system">${entry.systemHtml}</div>`,
    `<div class="discipline_duration">${entry.durationHtml}</div>`,
    `</div>`,
    `<p class="discipline_source">${escapeHtml(entry.source)}</p>`,
    `</div>`
  ].join("");
};

export type DisciplineLookup = {
  readonly byKindName: ReadonlyMap<string, DisciplineEntry>;
  readonly byDisciplineName: ReadonlyMap<string, DisciplineEntry>;
};

export const buildDisciplineLookup = (entries: readonly DisciplineEntry[]): DisciplineLookup => {
  const byKindName = new Map<string, DisciplineEntry>();
  const byDisciplineName = new Map<string, DisciplineEntry>();
  for (const entry of entries) {
    byKindName.set(disciplineKindNameKey(entry.kind, entry.name), entry);
    byDisciplineName.set(disciplinePairKey(entry.discipline, entry.name), entry);
  }
  return { byKindName, byDisciplineName };
};

export const lookupDisciplineEntry = (
  lookup: DisciplineLookup,
  opts: { readonly kind?: string; readonly name: string; readonly discipline?: string }
): DisciplineEntry | undefined => {
  const name = opts.name.trim();
  if (name === "") return undefined;
  if (opts.discipline?.trim()) {
    const byPair = lookup.byDisciplineName.get(disciplinePairKey(opts.discipline, name));
    if (byPair) return byPair;
  }
  if (opts.kind && isDisciplineCatalogKind(opts.kind)) {
    return lookup.byKindName.get(disciplineKindNameKey(opts.kind, name));
  }
  for (const kind of ["power", "ritual", "ceremony"] as const) {
    const hit = lookup.byKindName.get(disciplineKindNameKey(kind, name));
    if (hit) return hit;
  }
  return undefined;
};

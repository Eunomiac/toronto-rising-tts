import type { RelationshipDraft, RelationshipRow } from "./types.js";

/** Link types with their own Page 4 section; any other word lands in "Other Relationships". */
export const SECTION_LINK_TYPES = ["touchstone", "sire", "childe", "thrall", "regnant"] as const;

/** Suggestions for the link-type picker (free text is allowed too). */
export const LINK_TYPE_SUGGESTIONS = [...SECTION_LINK_TYPES, "enemy", "contact", "mawla", "victim", "criseDeLwa"] as const;

export const MAX_BOND_STRENGTH = 6;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === "string" ? value : "");

export const parseRelationshipEntry = (value: unknown): RelationshipDraft | null => {
  if (!isRecord(value)) {
    return null;
  }
  const pcLinks: Record<string, string> = {};
  if (isRecord(value.pcLinks)) {
    for (const [charKey, linkType] of Object.entries(value.pcLinks)) {
      if (typeof linkType === "string" && linkType !== "") {
        pcLinks[charKey] = linkType;
      }
    }
  }
  const body = Array.isArray(value.body) ? value.body.filter((line): line is string => typeof line === "string") : [];
  return {
    pcLinks,
    portrait: text(value.portrait),
    headerLeft: text(value.headerLeft),
    headerRight: text(value.headerRight),
    subheaderLeft: text(value.subheaderLeft),
    subheaderRight: text(value.subheaderRight),
    body,
    ...(typeof value.bondStrength === "number" ? { bondStrength: value.bondStrength } : {})
  };
};

export const parseRelationshipRows = (value: unknown): RelationshipRow[] =>
  Array.isArray(value)
    ? value.flatMap((row) => {
      if (!isRecord(row) || typeof row.key !== "string") {
        return [];
      }
      const entry = parseRelationshipEntry(row.entry);
      return entry ? [{ key: row.key, entry }] : [];
    })
    : [];

export type RelationshipSections = {
  readonly touchstones: RelationshipRow[];
  readonly sires: RelationshipRow[];
  readonly childer: RelationshipRow[];
  /** Thralls first, then regnants (same order as the TTS sheet). */
  readonly bloodBonds: RelationshipRow[];
  readonly others: RelationshipRow[];
};

const byKeyThenHeader = (a: RelationshipRow, b: RelationshipRow): number =>
  a.key === b.key ? a.entry.headerLeft.localeCompare(b.entry.headerLeft) : a.key < b.key ? -1 : 1;

/** Groups rows by this PC's link type, mirroring `lib/csheet_page4_xml.ttslua` `loadSectionsForPcLink`. */
export const relationshipSections = (rows: readonly RelationshipRow[], charKey: string): RelationshipSections => {
  const bucket = (linkType: string) => rows.filter((row) => row.entry.pcLinks[charKey] === linkType).sort(byKeyThenHeader);
  return {
    touchstones: bucket("touchstone"),
    sires: bucket("sire"),
    childer: bucket("childe"),
    bloodBonds: [...bucket("thrall"), ...bucket("regnant")],
    others: rows
      .filter((row) => {
        const linkType = row.entry.pcLinks[charKey];
        return linkType !== undefined && !(SECTION_LINK_TYPES as readonly string[]).includes(linkType);
      })
      .sort(byKeyThenHeader)
  };
};

/** Same weights as `lib/csheet_page4_xml.ttslua` (title 10, each subheader 2, each body line 3). */
export const relationshipWeight = (entry: RelationshipDraft): number =>
  10 + (entry.subheaderLeft !== "" ? 2 : 0) + (entry.subheaderRight !== "" ? 2 : 0)
  + entry.body.filter((line) => line.trim() !== "").length * 3;

/** Heaviest first into the lighter of two columns (ties go left), like the TTS builder. */
export const packTwoColumns = (rows: readonly RelationshipRow[]): readonly [RelationshipRow[], RelationshipRow[]] => {
  const columns: [RelationshipRow[], RelationshipRow[]] = [[], []];
  const totals = [0, 0];
  const sorted = [...rows].sort((a, b) => relationshipWeight(b.entry) - relationshipWeight(a.entry));
  for (const row of sorted) {
    const best = (totals[1] ?? 0) < (totals[0] ?? 0) ? 1 : 0;
    columns[best].push(row);
    totals[best] = (totals[best] ?? 0) + relationshipWeight(row.entry);
  }
  return columns;
};

/** Link types that carry Bond Strength boxes. */
export const isBondLink = (linkType: string | undefined): boolean => linkType === "thrall" || linkType === "regnant";

export const emptyRelationship = (charKey: string, linkType: string): RelationshipDraft => ({
  pcLinks: { [charKey]: linkType },
  portrait: "",
  headerLeft: "",
  headerRight: "",
  subheaderLeft: "",
  subheaderRight: "",
  body: [],
  ...(isBondLink(linkType) ? { bondStrength: 1 } : {})
});

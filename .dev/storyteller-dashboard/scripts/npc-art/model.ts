import { createHash } from "node:crypto";

/**
 * Pure rules for NPC art: which NPCs exist, what name and ring colour each token carries, how a name wraps
 * onto the token, and the fingerprints that version every hosted link. No file or image I/O here.
 */

export type NpcFolder = "Catalogued" | "Generic" | "Memoriam";

export type HeadCrop = { readonly cx: number; readonly cy: number; readonly size: number };

export type RosterCategory = { readonly id: string; readonly color: string };

export type Roster = {
  readonly categories: readonly RosterCategory[];
  readonly assigned: Readonly<Record<string, string>>;
  readonly groupColors: Readonly<Record<string, string>>;
};

export type NamedCatalogEntry = { readonly characterKey: string; readonly fullName: string; readonly pickerGroups: readonly string[] };

/** Everything the generator needs about one NPC, before any image work. */
export type NpcArtSubject = {
  readonly key: string;
  readonly folder: NpcFolder;
  readonly name: string;
  readonly color: string;
  /** Hand-set head crop from the dashboard; null means the automatic crop is measured from the figurine. */
  readonly manualCrop: HeadCrop | null;
};

export type NameSources = {
  readonly named: ReadonlyMap<string, NamedCatalogEntry>;
  readonly genericLabels: ReadonlyMap<string, string>;
  readonly memoriamNames: ReadonlyMap<string, string>;
};

export const DEFAULT_RING_COLOR = "#77706a";

/** Leading honorifics skipped when a token shows one word, so "Prince Doran" reads "Doran". */
const MEMORIAM_TITLES: ReadonlySet<string> = new Set([
  "prince",
  "princess",
  "lord",
  "lady",
  "sir",
  "father",
  "mother",
  "sister",
  "brother",
  "the",
  "pre-embrace",
  "pre-death"
]);

/** `jeanDucheskiIPreDeath` → `Jean Ducheski I Pre Death`; used only for figurines missing from every catalog. */
export const humanizeKey = (key: string): string =>
  key
    .replace(/^mem_/, "")
    .replace(/_\d+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (first) => first.toUpperCase());

const firstNonTitleWord = (fullName: string): string => {
  const words = fullName.trim().split(/\s+/);
  const named = words.find((word) => !MEMORIAM_TITLES.has(word.toLowerCase()));
  return named ?? words[0] ?? "";
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The roster's own colour for a group, else its category's colour (same rule as the dashboard roster). */
export const groupColor = (roster: Roster, groupKey: string): string | undefined =>
  roster.groupColors[groupKey] ?? roster.categories.find((category) => category.id === roster.assigned[groupKey])?.color;

const ringColor = (roster: Roster, groupKey: string | undefined): string => {
  const color = groupKey === undefined ? undefined : groupColor(roster, groupKey);
  if (color === undefined) {
    return DEFAULT_RING_COLOR;
  }
  if (!HEX_COLOR.test(color)) {
    throw new Error(`Roster colour for group "${groupKey}" is not a #rrggbb hex colour: "${color}".`);
  }
  return color.toLowerCase();
};

export type SubjectReport = { readonly subject: NpcArtSubject; readonly uncatalogued: boolean };

/**
 * One NPC per figurine file. Named NPCs show the first non-title word of their full name and take their first
 * picker group's roster colour; generic NPCs show their catalog label and take the `generic:<label>` group
 * colour; Memoriam NPCs show their first non-title word and the default colour. Figurines missing from every catalog
 * still get art (name from the file key) and are flagged so the build can report them.
 */
export const buildSubject = (
  folder: NpcFolder,
  key: string,
  sources: NameSources,
  roster: Roster,
  crops: Readonly<Record<string, HeadCrop>>
): SubjectReport => {
  const manualCrop = crops[key] ?? null;
  if (folder === "Catalogued") {
    const entry = sources.named.get(key);
    const name = firstNonTitleWord(entry?.fullName ?? humanizeKey(key));
    return { subject: { key, folder, name, color: ringColor(roster, entry?.pickerGroups[0]), manualCrop }, uncatalogued: entry === undefined };
  }
  if (folder === "Generic") {
    const label = sources.genericLabels.get(key);
    const name = label ?? humanizeKey(key);
    return { subject: { key, folder, name, color: ringColor(roster, `generic:${name}`), manualCrop }, uncatalogued: label === undefined };
  }
  const fullName = sources.memoriamNames.get(key);
  const name = firstNonTitleWord(fullName ?? humanizeKey(key));
  return { subject: { key, folder, name, color: DEFAULT_RING_COLOR, manualCrop }, uncatalogued: fullName === undefined };
};

export type Measure = (text: string) => number;

const ellipsize = (text: string, maxWidth: number, measure: Measure, ellipsis: string): string => {
  let cut = text.trimEnd();
  while (cut.length > 0 && measure(cut + ellipsis) > maxWidth) {
    cut = cut.slice(0, -1).trimEnd();
  }
  return cut + ellipsis;
};

/**
 * Word-wraps a name onto at most two lines. `maxWidths[0]` is the room for a single line; `maxWidths[1]` and
 * `maxWidths[2]` are the upper and lower lines when it takes two. Whatever does not fit ends in an ellipsis.
 */
export const wrapName = (
  text: string,
  maxWidths: readonly [number, number, number],
  measure: Measure,
  ellipsis: string
): readonly string[] => {
  const words = text.trim().split(/\s+/).filter((word) => word !== "");
  const whole = words.join(" ");
  if (whole === "" || measure(whole) <= maxWidths[0]) {
    return whole === "" ? [] : [whole];
  }
  const [, upperWidth, lowerWidth] = maxWidths;
  let upper = "";
  let used = 0;
  while (used < words.length) {
    const next = upper === "" ? words[used]! : `${upper} ${words[used]!}`;
    if (measure(next) > upperWidth) {
      break;
    }
    upper = next;
    used += 1;
  }
  if (used === 0) {
    return [ellipsize(whole, upperWidth, measure, ellipsis)];
  }
  const rest = words.slice(used).join(" ");
  return [upper, measure(rest) <= lowerWidth ? rest : ellipsize(rest, lowerWidth, measure, ellipsis)];
};

/** Short content hash used as the `?v=` on every hosted link, so TTS re-downloads only changed art. */
export const fingerprint = (...parts: readonly (string | Uint8Array)[]): string => {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\u0000");
  }
  return hash.digest("hex").slice(0, 12);
};

export type NpcArtLinks = {
  readonly figurineFront: string;
  readonly tokenFront: string;
  readonly tokenBack: string;
};

const luaString = (value: string): string => JSON.stringify(value);

/** `lib/npc_art_urls.ttslua`: every NPC's figurine and token links, keyed by NPC key, sorted. */
export const renderLuaModule = (
  baseUrl: string,
  figurineBack: string,
  links: ReadonlyMap<string, NpcArtLinks>,
  generatedBy: string
): string => {
  const lines = [
    `-- AUTO-GENERATED by ${generatedBy} — DO NOT EDIT BY HAND.`,
    "-- Every NPC's figurine and spotlight-token art, hosted on GitHub (master). `?v=` changes when the art does,",
    "-- so TTS re-downloads only changed images. Regenerate: npm run npc-art:generate (part of npm run build:full).",
    "",
    `local BASE = ${luaString(baseUrl)}`,
    `local FIGURINE_BACK = BASE .. ${luaString(figurineBack)}`,
    "",
    "return {"
  ];
  for (const key of [...links.keys()].sort()) {
    const art = links.get(key)!;
    lines.push(
      `  ${/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`} = {`,
      `    figurine = { front = BASE .. ${luaString(art.figurineFront)}, back = FIGURINE_BACK },`,
      `    token = { front = BASE .. ${luaString(art.tokenFront)}, back = BASE .. ${luaString(art.tokenBack)} },`,
      "  },"
    );
  }
  lines.push("}", "");
  return lines.join("\n");
};

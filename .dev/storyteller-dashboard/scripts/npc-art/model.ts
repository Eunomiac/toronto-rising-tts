import { createHash } from "node:crypto";
import type { NpcOverride } from "../../src/shared/npcOverride.ts";

/**
 * Pure rules for NPC art: which NPCs exist, what name and ring colour each token carries, how a name wraps
 * onto the token, and the fingerprints that decide when a token is redrawn. No file or image I/O here.
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

/** One Memoriam NPC from data/memoriam-npcs.json, as far as token art needs it. */
export type MemoriamArtEntry = { readonly label: string; readonly isGeneric: boolean };

export type NameSources = {
  readonly named: ReadonlyMap<string, NamedCatalogEntry>;
  readonly genericLabels: ReadonlyMap<string, string>;
  readonly memoriamNames: ReadonlyMap<string, MemoriamArtEntry>;
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

/**
 * One NPC per catalogued figurine file. Named NPCs show the first non-title word of their full name and take their
 * first picker group's roster colour; generic NPCs show their catalog label and take the `generic:<label>` group
 * colour; named Memoriam NPCs show their first non-title word and the default colour, and generic Memoriam NPCs
 * show their full catalog label. An override's `name` replaces the full name (or generic label) before that rule,
 * and its `color` replaces the ring colour. A figurine missing from its folder's catalog returns null: it gets no
 * art, and the build reports it.
 */
export const buildSubject = (
  folder: NpcFolder,
  key: string,
  sources: NameSources,
  roster: Roster,
  crops: Readonly<Record<string, HeadCrop>>,
  overrides: Readonly<Record<string, NpcOverride>> = {}
): NpcArtSubject | null => {
  const manualCrop = crops[key] ?? null;
  const override = overrides[key] ?? {};
  if (folder === "Catalogued") {
    const entry = sources.named.get(key);
    return entry === undefined
      ? null
      : {
          key,
          folder,
          name: firstNonTitleWord(override.name ?? entry.fullName),
          color: override.color ?? ringColor(roster, entry.pickerGroups[0]),
          manualCrop
        };
  }
  if (folder === "Generic") {
    const label = sources.genericLabels.get(key);
    return label === undefined
      ? null
      : { key, folder, name: override.name ?? label, color: override.color ?? ringColor(roster, `generic:${label}`), manualCrop };
  }
  const memoriam = sources.memoriamNames.get(key);
  if (memoriam === undefined) {
    return null;
  }
  const label = override.name ?? memoriam.label;
  return {
    key,
    folder,
    name: memoriam.isGeneric ? label : firstNonTitleWord(label),
    color: override.color ?? DEFAULT_RING_COLOR,
    manualCrop
  };
};

/** The text the Full build prints at its end: figurines that got no art, and catalogued NPCs that have no figurine. */
export const discrepancyReport = (uncatalogued: readonly string[], withoutFigurine: readonly string[]): string => {
  if (uncatalogued.length === 0 && withoutFigurine.length === 0) {
    return "[npc-art] No NPC art discrepancies.\n";
  }
  const lines = ["[npc-art] NPC art discrepancies:"];
  if (uncatalogued.length > 0) {
    lines.push(
      `  ${uncatalogued.length} figurine(s) are in no catalog, so they got no token or link (add the NPC to its catalog, or rename or remove the file):`,
      ...uncatalogued.map((entry) => `    ${entry}`)
    );
  }
  if (withoutFigurine.length > 0) {
    lines.push("  Catalogued NPCs with no figurine image (they have no art in TTS until one is added):", ...withoutFigurine.map((entry) => `    ${entry}`));
  }
  return `${lines.join("\n")}\n`;
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

/** Short content hash of a token's inputs, so unchanged tokens are not redrawn. */
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
  /** Generic NPCs only: the sheet's default label, which TTS shows until an override renames it. */
  readonly genericLabel?: string;
};

const luaString = (value: string): string => JSON.stringify(value);

/**
 * `lib/npc_art_urls.ttslua`: every NPC's figurine and token links, keyed by NPC key, sorted. Generic rows also carry
 * `genericLabel`; TTS offers exactly those rows as importable generic NPCs.
 */
export const renderLuaModule = (figurineBackUrl: string, links: ReadonlyMap<string, NpcArtLinks>, generatedBy: string): string => {
  const lines = [
    `-- AUTO-GENERATED by ${generatedBy} — DO NOT EDIT BY HAND.`,
    "-- Every NPC's figurine and spotlight-token art: Steam Cloud links from lib/json/cloud-assets.json (files under",
    "-- assets/NPC Art). Regenerate: npm run npc-art:urls after npm run cloud-asset-sync (both in npm run build:full).",
    "-- `genericLabel` (generic NPCs only) is the default label from data/generic-npcs.json (the Generics Export sheet).",
    "",
    `local FIGURINE_BACK = ${luaString(figurineBackUrl)}`,
    "",
    "return {"
  ];
  for (const key of [...links.keys()].sort()) {
    const art = links.get(key)!;
    lines.push(
      `  ${/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`} = {`,
      `    figurine = { front = ${luaString(art.figurineFront)}, back = FIGURINE_BACK },`,
      `    token = { front = ${luaString(art.tokenFront)}, back = ${luaString(art.tokenBack)} },`,
      ...(art.genericLabel === undefined ? [] : [`    genericLabel = ${luaString(art.genericLabel)},`]),
      "  },"
    );
  }
  lines.push("}", "");
  return lines.join("\n");
};

/**
 * `lib/npc_overrides.ttslua`: the TTS half of each NPC's override (name, card scale, seated Y), keyed by NPC key,
 * sorted. Ring colours only live in the token art, so they are left out.
 */
export const renderOverridesLuaModule = (overrides: Readonly<Record<string, NpcOverride>>, generatedBy: string): string => {
  const lines = [
    `-- AUTO-GENERATED by ${generatedBy} — DO NOT EDIT BY HAND.`,
    "-- Per-NPC overrides from the Storyteller Dashboard token configuration window (data/npc-overrides.json).",
    "-- `name` replaces the NPC's full name (generic NPCs: their default label), `cardScale` its Custom Figurine card",
    "-- scale on the stage (else D.DEFAULT_FIGURINE_SCALE), `seatedY` the world Y of its figurine at a table seat.",
    "-- Read by lib/npcs_data, core/npcs and lib/figurine_seat_layout.",
    "",
    "return {"
  ];
  for (const key of Object.keys(overrides).sort()) {
    const override = overrides[key]!;
    const fields = [
      override.name === undefined ? null : `name = ${luaString(override.name)}`,
      override.cardScale === undefined ? null : `cardScale = ${override.cardScale}`,
      override.seatedY === undefined ? null : `seatedY = ${override.seatedY}`
    ].filter((field): field is string => field !== null);
    if (fields.length > 0) {
      lines.push(`  ${/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`} = { ${fields.join(", ")} },`);
    }
  }
  lines.push("}", "");
  return lines.join("\n");
};

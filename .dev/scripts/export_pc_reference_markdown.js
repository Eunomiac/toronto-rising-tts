/**
 * Export lib/json/PCS.json + lib/json/PC_Relationships.json to PC-centric markdown.
 * Run from repo root: node .dev/scripts/export_pc_reference_markdown.js [--out <path>]
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const defaultOut = path.join(root, ".dev", "PC Data & Tracking", "PC Reference.md");
const pcsPath = path.join(root, "lib", "json", "PCS.json");
const relPath = path.join(root, "lib", "json", "PC_Relationships.json");

/** PCS charKey → pcLinks key in PC_Relationships.json (mirror lib/csheet_page4_xml.ttslua) */
const CHARKEY_TO_PCLINK = {
  lucien: "lordLucien",
};

/** Seat order from C.PlayerColors / C.PlayerData */
const PC_ORDER = ["fomorach", "rashid", "lucien", "aishe", "blackCaesar"];

const KNOWN_PCLINK_KEYS = new Set(
  PC_ORDER.map((ck) => CHARKEY_TO_PCLINK[ck] || ck)
);

const PCLINK_TO_CHARKEY = Object.fromEntries(
  PC_ORDER.map((ck) => [CHARKEY_TO_PCLINK[ck] || ck, ck])
);

const PHYSICAL_SKILLS = [
  "athletics", "brawl", "craft", "drive", "firearms", "larceny", "melee", "stealth", "survival",
];
const SOCIAL_SKILLS = [
  "animalKen", "etiquette", "insight", "intimidation", "leadership", "performance", "persuasion", "streetwise", "subterfuge",
];
const MENTAL_SKILLS = [
  "academics", "awareness", "finance", "investigation", "medicine", "occult", "politics", "science", "technology",
];

const ATTRIBUTE_KEYS = [
  "strength", "dexterity", "stamina", "charisma", "manipulation", "composure", "intelligence", "wits", "resolve",
];

const LINK_TYPE_LABELS = {
  touchstone: "Touchstone",
  sire: "Sire",
  childe: "Childe",
  thrall: "Thrall",
  regnant: "Regnant",
  enemy: "Enemy",
  contact: "Contact",
  mawla: "Mawla",
  criseDeLwa: "Crise de Lwa",
  victim: "Victim",
};

const KNOWN_LINK_TYPES = new Set(Object.keys(LINK_TYPE_LABELS));

/**
 * @param {string[]} argv
 * @returns {string}
 */
function parseOutPath(argv) {
  const idx = argv.indexOf("--out");
  if (idx !== -1 && typeof argv[idx + 1] === "string" && argv[idx + 1] !== "") {
    return path.resolve(root, argv[idx + 1]);
  }
  return defaultOut;
}

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${err.message}`);
  }
}

/**
 * @param {string} charKey
 * @returns {string}
 */
function resolvePcLinkKey(charKey) {
  return CHARKEY_TO_PCLINK[charKey] || charKey;
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function asString(v) {
  if (v === null || v === undefined) {
    return "";
  }
  return String(v);
}

/**
 * @param {unknown} lines
 * @returns {string[]}
 */
function asStringArray(lines) {
  if (Array.isArray(lines)) {
    return lines.map((l) => asString(l)).filter((l) => l.trim() !== "");
  }
  if (typeof lines === "string" && lines.trim() !== "") {
    return [lines];
  }
  return [];
}

/**
 * @param {string} s
 * @returns {string}
 */
function titleCaseKey(s) {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

/**
 * @param {string} linkType
 * @returns {string}
 */
function humanizeLinkType(linkType) {
  if (KNOWN_LINK_TYPES.has(linkType)) {
    return LINK_TYPE_LABELS[linkType];
  }
  console.warn(`[export_pc_reference] unknown linkType: ${linkType}`);
  return titleCaseKey(linkType);
}

/**
 * @param {string[]} lines
 * @returns {string}
 */
function joinLines(lines) {
  return lines.filter((l) => l !== "").join("\n");
}

/**
 * @param {string} heading
 * @param {number} level
 * @returns {string}
 */
function heading(headingText, level) {
  return `${"#".repeat(level)} ${headingText}`;
}

/**
 * @param {Record<string, { base?: number, temp?: number }>|undefined} stats
 * @param {string[]} keys
 * @returns {string[]}
 */
function formatStatGroup(stats, keys) {
  if (!stats || typeof stats !== "object") {
    return [];
  }
  const parts = [];
  for (const key of keys) {
    const row = stats[key];
    if (!row || typeof row !== "object") {
      continue;
    }
    const base = Number(row.base) || 0;
    const temp = Number(row.temp) || 0;
    if (base === 0 && temp === 0) {
      continue;
    }
    const label = titleCaseKey(key);
    if (temp !== 0) {
      parts.push(`${label} ${base}${temp > 0 ? ` (+${temp})` : ` (${temp})`}`);
    } else {
      parts.push(`${label} ${base}`);
    }
  }
  return parts;
}

/**
 * @param {Record<string, { base?: number, temp?: number }>|undefined} attrs
 * @returns {string}
 */
function formatAttributes(attrs) {
  const parts = formatStatGroup(attrs, ATTRIBUTE_KEYS);
  if (parts.length === 0) {
    return "_None._";
  }
  return parts.join(" · ");
}

/**
 * @param {Record<string, { base?: number, temp?: number }>|undefined} skills
 * @param {string} label
 * @param {string[]} keys
 * @returns {string}
 */
function formatSkillCategory(skills, label, keys) {
  const parts = formatStatGroup(skills, keys);
  if (parts.length === 0) {
    return "";
  }
  return `**${label}:** ${parts.join(" · ")}`;
}

/**
 * @param {Record<string, { base?: number, temp?: number }>|undefined} skills
 * @returns {string}
 */
function formatSkills(skills) {
  const lines = [
    formatSkillCategory(skills, "Physical", PHYSICAL_SKILLS),
    formatSkillCategory(skills, "Social", SOCIAL_SKILLS),
    formatSkillCategory(skills, "Mental", MENTAL_SKILLS),
  ].filter((l) => l !== "");
  if (lines.length === 0) {
    return "_None._";
  }
  return lines.join("\n\n");
}

/**
 * @param {{ superficial?: number, aggravated?: number, stains?: number, base?: number, temp?: number }|undefined} track
 * @param {string} name
 * @param {boolean} [hasStains]
 * @returns {string}
 */
function formatTrack(track, name, hasStains) {
  if (!track || typeof track !== "object") {
    return `**${name}:** —`;
  }
  const base = Number(track.base) || 0;
  const temp = Number(track.temp) || 0;
  const sup = Number(track.superficial) || 0;
  const agg = Number(track.aggravated) || 0;
  const stains = Number(track.stains) || 0;
  const parts = [`${base}`];
  if (temp !== 0) {
    parts.push(`temp ${temp > 0 ? `+${temp}` : temp}`);
  }
  if (sup !== 0 || agg !== 0) {
    parts.push(`dmg ${sup}S/${agg}A`);
  }
  if (hasStains && stains !== 0) {
    parts.push(`stains ${stains}`);
  }
  return `**${name}:** ${parts.join(", ")}`;
}

/**
 * @param {unknown} source
 * @returns {string}
 */
function formatSource(source) {
  if (!source || typeof source !== "object") {
    return "";
  }
  const book = asString(source.book).trim();
  const page = Number(source.page) || 0;
  if (book === "" && page === 0) {
    return "";
  }
  if (book === "") {
    return `p. ${page}`;
  }
  if (page === 0) {
    return book;
  }
  return `${book} p. ${page}`;
}

/**
 * @param {unknown[]} items
 * @param {(item: unknown) => string} render
 * @returns {string}
 */
function bulletList(items, render) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }
  return items.map((item) => `- ${render(item)}`).join("\n");
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatOverview(pc) {
  const lines = [];
  lines.push(`**Clan:** ${asString(pc.clan)}`);
  lines.push(`**Generation:** ${asString(pc.generation)}`);
  if (Array.isArray(pc.titles) && pc.titles.length > 0) {
    lines.push(`**Titles:** ${pc.titles.join(", ")}`);
  }
  lines.push(`**Predator type:** ${asString(pc.predatorType)}`);
  if (pc.birthPlace || pc.birthYear) {
    lines.push(`**Born:** ${asString(pc.birthPlace)}${pc.birthYear ? ` (${pc.birthYear})` : ""}`);
  }
  if (pc.embracePlace || pc.embraceYear) {
    lines.push(`**Embraced:** ${asString(pc.embracePlace)}${pc.embraceYear ? ` (${pc.embraceYear})` : ""}`);
  }
  if (Array.isArray(pc.languages) && pc.languages.length > 0) {
    lines.push(`**Languages:** ${pc.languages.join(", ")}`);
  }
  if (asString(pc.ambition).trim() !== "") {
    lines.push(`**Ambition:** ${pc.ambition}`);
  }
  if (pc.xp !== undefined && pc.xp !== null) {
    lines.push(`**XP:** ${pc.xp}`);
  }
  return lines.join("\n");
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatClanBanes(pc) {
  if (!Array.isArray(pc.clanBanes) || pc.clanBanes.length === 0) {
    return "_None._";
  }
  return pc.clanBanes.map((bane) => {
    const parts = [`**${asString(bane.name)}**`];
    const subLabel = asString(bane.subtitleLabel).trim();
    const subValue = asString(bane.subtitleValue).trim();
    if (subLabel !== "" || subValue !== "") {
      parts.push(`${subLabel}${subLabel && subValue ? ": " : ""}${subValue}`);
    }
    const notes = asString(bane.notes).trim();
    if (notes !== "") {
      parts.push(notes);
    }
    const src = formatSource(bane.source);
    if (src !== "") {
      parts.push(`_(${src})_`);
    }
    return parts.join(" — ");
  }).join("\n\n");
}

/**
 * @param {unknown} sire
 * @returns {string}
 */
function formatSire(sire) {
  if (!sire || typeof sire !== "object") {
    return "_Unknown._";
  }
  const lines = [`**${asString(sire.name)}**`];
  const desc = asStringArray(sire.description);
  if (desc.length > 0) {
    lines.push(bulletList(desc, (d) => d));
  }
  const notes = asStringArray(sire.notes);
  if (notes.length > 0) {
    lines.push(bulletList(notes, (n) => n));
  }
  return lines.join("\n\n");
}

/**
 * @param {unknown[]} childer
 * @returns {string}
 */
function formatChilder(childer) {
  if (!Array.isArray(childer) || childer.length === 0) {
    return "_None._";
  }
  return childer.map((ch) => {
    const lines = [`**${asString(ch.name)}**${ch.embraceYear ? ` (Embraced ${ch.embraceYear})` : ""}`];
    const desc = asStringArray(ch.description);
    if (desc.length > 0) {
      lines.push(bulletList(desc, (d) => d));
    }
    const notes = asStringArray(ch.notes);
    if (notes.length > 0) {
      lines.push(bulletList(notes, (n) => n));
    }
    return lines.join("\n");
  }).join("\n\n");
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatLineage(pc) {
  return joinLines([
    heading("Sire", 3),
    formatSire(pc.sire),
    "",
    heading("Childer", 3),
    formatChilder(pc.childer),
  ]);
}

/**
 * @param {unknown[]} specialties
 * @returns {string}
 */
function formatSpecialties(specialties) {
  if (!Array.isArray(specialties) || specialties.length === 0) {
    return "_None._";
  }
  return bulletList(specialties, (sp) => {
    const decade = sp.decade ? ` (${sp.decade})` : "";
    return `${titleCaseKey(asString(sp.skill))} — ${asString(sp.name)} [${asString(sp.type)}${decade}]`;
  });
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatTracks(pc) {
  return [
    formatTrack(pc.health, "Health"),
    formatTrack(pc.willpower, "Willpower"),
    formatTrack(pc.humanity, "Humanity", true),
    formatTrack(pc.bloodPotency, "Blood Potency"),
  ].join("\n");
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatDisciplines(pc) {
  const discs = pc.disciplines;
  if (!discs || typeof discs !== "object") {
    return "_None._";
  }
  const keys = Object.keys(discs).sort();
  if (keys.length === 0) {
    return "_None._";
  }
  return keys.map((key) => {
    const d = discs[key];
    const rating = Number(d.base) || 0;
    const temp = Number(d.temp) || 0;
    const ratingStr = temp !== 0 ? `${rating}${temp > 0 ? ` (+${temp})` : ` (${temp})`}` : `${rating}`;
    const lines = [heading(`${titleCaseKey(key)} ${ratingStr}`, 3)];
    if (Array.isArray(d.powers) && d.powers.length > 0) {
      lines.push(bulletList(d.powers, (p) => {
        const notes = asString(p.notes).trim();
        const noteStr = notes !== "" ? ` — ${notes}` : "";
        const src = formatSource(p.source);
        const srcStr = src !== "" ? ` _(${src})_` : "";
        return `**${asString(p.name)}** L${p.level}${noteStr}${srcStr}`;
      }));
    }
    return lines.join("\n");
  }).join("\n\n");
}

/**
 * @param {unknown} touchstone
 * @returns {string}
 */
function formatTouchstone(touchstone) {
  if (!touchstone || typeof touchstone !== "object") {
    return "";
  }
  const lines = [`**${asString(touchstone.name)}**`];
  const desc = asString(touchstone.description).trim();
  if (desc !== "") {
    lines.push(desc);
  }
  const notes = asStringArray(touchstone.notes);
  if (notes.length > 0) {
    lines.push(bulletList(notes, (n) => n));
  }
  return lines.join("\n");
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatConvictions(pc) {
  if (!Array.isArray(pc.convictions) || pc.convictions.length === 0) {
    return "_None._";
  }
  return pc.convictions.map((conv, i) => {
    const lines = [heading(asString(conv.description) || `Conviction ${i + 1}`, 3)];
    const notes = asStringArray(conv.notes);
    if (notes.length > 0) {
      lines.push(bulletList(notes, (n) => n));
    }
    if (conv.touchstone) {
      lines.push("");
      lines.push("**Touchstone:**");
      lines.push(formatTouchstone(conv.touchstone));
    }
    return lines.join("\n");
  }).join("\n\n");
}

/**
 * @param {unknown[]} items
 * @param {string} kind
 * @returns {string}
 */
function formatTraitList(items, kind) {
  if (!Array.isArray(items) || items.length === 0) {
    return "_None._";
  }
  return items.map((item) => {
    const focus = asString(item.focus).trim();
    const focusStr = focus !== "" ? ` (${focus})` : "";
    const max = item.max !== undefined ? ` / ${item.max}` : "";
    const lines = [
      `**${asString(item.name)}** ${item.base ?? 0}${max}${focusStr}`,
    ];
    const desc = asStringArray(item.description);
    if (desc.length > 0) {
      lines.push(bulletList(desc, (d) => d));
    }
    const rules = asStringArray(item.rules);
    if (rules.length > 0) {
      lines.push(bulletList(rules, (r) => `_Rule:_ ${r}`));
    }
    const src = formatSource(item.source);
    if (src !== "") {
      lines.push(`_Source: ${src}_`);
    }
    return lines.join("\n");
  }).join("\n\n");
}

/**
 * @param {unknown} sheet
 * @returns {string}
 */
function formatLoresheetBlock(sheet) {
  if (!sheet || typeof sheet !== "object") {
    return "_None._";
  }
  const lines = [`**${asString(sheet.name)}**`];
  const desc = asString(sheet.description).trim();
  if (desc !== "") {
    lines.push(desc);
  }
  if (Array.isArray(sheet.merits) && sheet.merits.length > 0) {
    lines.push("");
    lines.push(bulletList(sheet.merits, (m) => {
      const purchased = m.purchased ? "✓" : "○";
      const rules = asString(m.rules).trim();
      const rulesStr = rules !== "" ? ` — _${rules}_` : "";
      return `${purchased} **${asString(m.name)}** (${m.base})${rulesStr}`;
    }));
  }
  return lines.join("\n");
}

/**
 * @param {unknown} pc
 * @returns {string}
 */
function formatTimeline(pc) {
  if (!Array.isArray(pc.timeline) || pc.timeline.length === 0) {
    return "_None._";
  }
  return pc.timeline.map((era) => {
    const years = `${era.startYear ?? "?"}–${era.endYear ?? "?"}`;
    const aff = asString(era.affiliation).trim();
    const locs = Array.isArray(era.locations) ? era.locations.join(", ") : "";
    const meta = [years, aff !== "" && aff !== "nil" ? aff : "", locs].filter(Boolean).join(" · ");
    const lines = [heading(`${asString(era.era)} (${meta})`, 3)];
    const details = asString(era.details).trim();
    if (details !== "") {
      lines.push(details);
    }
    return lines.join("\n\n");
  }).join("\n\n");
}

/**
 * @param {Record<string, unknown>} relationships
 * @returns {Map<string, Array<{ relKey: string, linkType: string, entry: unknown }>>}
 */
function buildRelationshipIndex(relationships) {
  const index = new Map();
  for (const pcLinkKey of KNOWN_PCLINK_KEYS) {
    index.set(pcLinkKey, []);
  }

  for (const [relKey, entry] of Object.entries(relationships)) {
    if (!entry || typeof entry !== "object" || !entry.pcLinks) {
      continue;
    }
    for (const [pcLinkKey, linkType] of Object.entries(entry.pcLinks)) {
      if (!KNOWN_PCLINK_KEYS.has(pcLinkKey)) {
        throw new Error(
          `PC_Relationships.json: unknown pcLinks key "${pcLinkKey}" on entry "${relKey}"`
        );
      }
      if (typeof linkType !== "string" || linkType === "") {
        continue;
      }
      index.get(pcLinkKey).push({ relKey, linkType, entry });
    }
  }
  return index;
}

/**
 * @param {{ relKey: string, linkType: string, entry: unknown }} a
 * @param {{ relKey: string, linkType: string, entry: unknown }} b
 * @returns {number}
 */
function sortRelationshipRows(a, b) {
  if (a.relKey !== b.relKey) {
    return a.relKey < b.relKey ? -1 : 1;
  }
  const ah = asString(a.entry && a.entry.headerLeft);
  const bh = asString(b.entry && b.entry.headerLeft);
  return ah < bh ? -1 : ah > bh ? 1 : 0;
}

/**
 * @param {Array<{ relKey: string, linkType: string, entry: unknown }>} rows
 * @returns {{ touchstone: unknown, sire: unknown, childer: unknown[], bloodBonds: unknown[], others: unknown[] }}
 */
function loadSectionsForPcLink(rows) {
  let touchstone = null;
  let sire = null;
  const childer = [];
  const thralls = [];
  const regnants = [];
  const others = [];

  for (const row of rows) {
    const { linkType } = row;
    if (linkType === "touchstone") {
      touchstone = row;
    } else if (linkType === "sire") {
      sire = row;
    } else if (linkType === "childe") {
      childer.push(row);
    } else if (linkType === "thrall") {
      thralls.push(row);
    } else if (linkType === "regnant") {
      regnants.push(row);
    } else {
      others.push(row);
    }
  }

  childer.sort(sortRelationshipRows);
  thralls.sort(sortRelationshipRows);
  regnants.sort(sortRelationshipRows);
  others.sort(sortRelationshipRows);

  const bloodBonds = [...thralls, ...regnants];
  return { touchstone, sire, childer, bloodBonds, others };
}

/**
 * @param {{ relKey: string, linkType: string, entry: unknown }} row
 * @returns {string}
 */
function formatRelationshipEntry(row) {
  const { linkType, entry } = row;
  const e = entry;
  const label = humanizeLinkType(linkType);
  const title = asString(e.headerLeft) || row.relKey;
  const lines = [heading(`${title} — ${label}`, 3)];

  const headerRight = asString(e.headerRight).trim();
  if (headerRight !== "") {
    lines.push(`**Role:** ${headerRight}`);
  }
  const subLeft = asString(e.subheaderLeft).trim();
  if (subLeft !== "") {
    lines.push(`**${subLeft.startsWith("\"") ? "Motto" : "Detail"}:** ${subLeft}`);
  }
  const subRight = asString(e.subheaderRight).trim();
  if (subRight !== "") {
    lines.push(`**Affiliation:** ${subRight}`);
  }
  if (linkType === "thrall" || linkType === "regnant") {
    const bond = Number(e.bondStrength);
    if (!Number.isNaN(bond) && bond > 0) {
      lines.push(`**Bond:** ${bond}/6`);
    }
  }
  const body = asStringArray(e.body);
  if (body.length > 0) {
    lines.push("");
    lines.push(body.join("\n\n"));
  }
  return lines.join("\n");
}

/**
 * @param {string} groupTitle
 * @param {Array<{ relKey: string, linkType: string, entry: unknown }>|null|undefined} rows
 * @param {boolean} [singleton]
 * @returns {string}
 */
function formatRelationshipGroup(groupTitle, rows, singleton) {
  if (singleton) {
    if (!rows) {
      return "";
    }
    return joinLines([heading(groupTitle, 3), formatRelationshipEntry(rows)]);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return "";
  }
  return joinLines([
    heading(groupTitle, 3),
    rows.map((row) => formatRelationshipEntry(row)).join("\n\n"),
  ]);
}

/**
 * @param {Array<{ relKey: string, linkType: string, entry: unknown }>} rows
 * @returns {string}
 */
function formatRelationships(rows) {
  const sections = loadSectionsForPcLink(rows);
  const parts = [
    formatRelationshipGroup("Touchstone", sections.touchstone, true),
    formatRelationshipGroup("Sire", sections.sire, true),
    formatRelationshipGroup("Childer", sections.childer, false),
    formatRelationshipGroup("Blood Bonds", sections.bloodBonds, false),
    formatRelationshipGroup("Other Relationships", sections.others, false),
  ].filter((p) => p !== "");

  if (parts.length === 0) {
    return "_None._";
  }
  return parts.join("\n\n");
}

/**
 * @param {string} charKey
 * @param {unknown} pc
 * @param {Array<{ relKey: string, linkType: string, entry: unknown }>} relationshipRows
 * @returns {string}
 */
function renderPcSection(charKey, pc, relationshipRows) {
  const name = asString(pc.name) || charKey;
  const blocks = [
    heading(name, 1),
    "",
    heading("Overview", 2),
    formatOverview(pc),
    "",
    heading("Clan Bane", 2),
    formatClanBanes(pc),
    "",
    heading("Lineage", 2),
    formatLineage(pc),
    "",
    heading("Attributes", 2),
    formatAttributes(pc.attributes),
    "",
    heading("Skills", 2),
    formatSkills(pc.skills),
    "",
    heading("Specialties", 2),
    formatSpecialties(pc.specialties),
    "",
    heading("Tracks", 2),
    formatTracks(pc),
    "",
    heading("Disciplines", 2),
    formatDisciplines(pc),
    "",
    heading("Convictions", 2),
    formatConvictions(pc),
    "",
    heading("Backgrounds", 2),
    formatTraitList(pc.backgrounds, "background"),
    "",
    heading("Merits & Flaws", 2),
    joinLines([
      heading("Merits", 3),
      formatTraitList(pc.merits, "merit"),
      "",
      heading("Flaws", 3),
      formatTraitList(pc.flaws, "flaw"),
    ]),
    "",
    heading("Bloodline", 2),
    formatLoresheetBlock(pc.bloodline),
    "",
    heading("Loresheet", 2),
    formatLoresheetBlock(pc.loresheet),
    "",
    heading("Timeline", 2),
    formatTimeline(pc),
    "",
    heading("Relationships", 2),
    formatRelationships(relationshipRows),
  ];
  return blocks.join("\n");
}

function main() {
  const outPath = parseOutPath(process.argv.slice(2));
  const pcsRoot = loadJson(pcsPath);
  const relationships = loadJson(relPath);

  const pcs = pcsRoot.PCs || pcsRoot.pcs;
  if (!pcs || typeof pcs !== "object") {
    throw new Error("PCS.json: missing PCs root object");
  }

  const pcKeys = Object.keys(pcs);
  if (pcKeys.length !== 5) {
    console.warn(`[export_pc_reference] expected 5 PCs, found ${pcKeys.length}`);
  }

  for (const ck of PC_ORDER) {
    if (!pcs[ck]) {
      throw new Error(`PCS.json: missing expected PC key "${ck}"`);
    }
  }

  const relIndex = buildRelationshipIndex(relationships);

  const header = [
    "<!-- AUTO-GENERATED — do not edit by hand -->",
    "<!-- Regenerate: VS Code task \"Export PC reference markdown\" or node .dev/scripts/export_pc_reference_markdown.js -->",
    "",
    "# Player Character Reference",
    "",
    "_Generated from `lib/json/PCS.json` and `lib/json/PC_Relationships.json`._",
    "",
  ].join("\n");

  const sections = PC_ORDER.map((charKey) => {
    const pcLinkKey = resolvePcLinkKey(charKey);
    const rows = relIndex.get(pcLinkKey) || [];
    return renderPcSection(charKey, pcs[charKey], rows);
  });

  const content = header + sections.join("\n\n---\n\n") + "\n";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`Wrote ${outPath} (${kb} KB)`);
}

main();

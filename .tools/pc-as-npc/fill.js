"use strict";

/**
 * Pure PC-as-NPC sheet fill engine (no TTS).
 * Returns { elements: { [id]: { text?, active?, image?, tooltip?, warn? } }, warnings: string[] }
 */

const { loadTemplate, defaultTrackerImages } = require("./load-template.js");

const EMPTY = new Set(["", "~", "0"]);
const HIDE_Y = -200;
const HUNGER_SLOTS = 5;
const BOX_SLOTS = 10;

function blank(v) {
  return v == null || EMPTY.has(String(v).trim());
}

function normalizeRow(row) {
  const out = { ...(row || {}) };
  if (blank(out.Name) && !blank(out.Label)) out.Name = out.Label;
  return out;
}

function isEmptyVal(value, emptyVals) {
  const list = emptyVals || ["", "~", "0"];
  return list.includes(value == null ? "" : String(value));
}

function rept(n, ch) {
  const count = Math.max(0, Number(n) || 0);
  return String(ch || "•").repeat(count);
}

function splitPipe(value) {
  if (blank(value)) return [];
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, " ")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitAtDepth(text, sep, open = "(", close = ")") {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    const c = i < text.length ? text[i] : sep;
    if (i < text.length) {
      if (c === open) depth += 1;
      else if (c === close) depth -= 1;
    }
    if ((i === text.length || c === sep) && depth === 0) {
      const seg = text.slice(start, i).trim();
      if (seg) parts.push(seg);
      start = i + 1;
    }
  }
  return parts;
}

function powerDisplayName(raw) {
  const custom = /^(\d+)(?:-(\d+))?:([^=_:]+?)(?:=([^_:]+))?(?::([^_]+))?(?:_(.+))?$/.exec(raw.trim());
  if (custom) return custom[3].trim();
  return raw.trim();
}

function parseAncillaMap(raw) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const entry of splitPipe(raw)) {
    const nameMatch = /^([^(]+?)(?:\s*\(|$)/.exec(entry);
    const name = nameMatch ? nameMatch[1].trim() : entry.trim();
    const rulesMatch = /\(([\s\S]*)\)\s*$/.exec(entry);
    let rules = rulesMatch ? rulesMatch[1] : entry;
    rules = rules.replace(/^\s*[^.]+\.\s*/, "");
    if (name) map.set(name, rules);
  }
  return map;
}

function parsePowersHierarchy(powersRaw) {
  const groups = [];
  for (const group of splitAtDepth(String(powersRaw || ""), "|")) {
    const m = /^(.+?)\s+(\d+)\s*\(([\s\S]*)\)$/.exec(group);
    if (!m) continue;
    const discipline = m[1].trim();
    const dots = Number(m[2]);
    const names = splitAtDepth(m[3], ",").map(powerDisplayName).filter(Boolean);
    groups.push({ discipline, dots, names });
  }
  return groups;
}

/**
 * @returns {(string|null)[]} length slotCount; null = inactive slot past max
 */
function paintBoxSlots(max, superficial, aggravated, images, slotCount = BOX_SLOTS) {
  const size = Math.max(0, Math.min(slotCount, Number(max) || 0));
  const agg = Math.min(size, Math.max(0, Number(aggravated) || 0));
  const sup = Math.min(size - agg, Math.max(0, Number(superficial) || 0));
  /** @type {(string|null)[]} */
  const out = [];
  for (let i = 0; i < slotCount; i++) {
    if (i >= size) out.push(null);
    else if (i < agg) out.push(images.boxAggravated);
    else if (i < agg + sup) out.push(images.boxSuperficial);
    else out.push(images.boxEmpty);
  }
  return out;
}

/** @returns {string[]} length 5 — Custom UI asset names */
function paintHungerSlots(current, images) {
  const filled = Math.min(HUNGER_SLOTS, Math.max(0, Number(current) || 0));
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < HUNGER_SLOTS; i++) {
    out.push(i < filled ? images.hungerFilled : images.hungerEmpty);
  }
  return out;
}

function setEl(elements, id, patch) {
  elements[id] = { ...(elements[id] || {}), ...patch };
}

function hide(elements, id) {
  setEl(elements, id, { active: false, text: "", image: undefined });
}

function showText(elements, id, text, extra = {}) {
  setEl(elements, id, { active: true, text: text == null ? "" : String(text), ...extra });
}

function showImage(elements, id, image) {
  setEl(elements, id, { active: true, image: String(image), text: "" });
}

function applyImageSlots(elements, prefix, slotImages) {
  for (let i = 0; i < slotImages.length; i++) {
    const id = `${prefix}_${i + 1}`;
    const image = slotImages[i];
    if (image == null) hide(elements, id);
    else showImage(elements, id, image);
  }
}

function hideImageSlots(elements, prefix, count) {
  for (let i = 1; i <= count; i++) hide(elements, `${prefix}_${i}`);
}

/**
 * @param {object} row export-shaped row
 * @param {object} [opts]
 * @param {object} [opts.template]
 * @param {object} [opts.tracker] { healthMax?, willpowerMax?, healthSuperficial?, healthAggravated?, willpowerSuperficial?, willpowerAggravated?, hunger?, kind? }
 * @param {Array<{Discipline:string,Name:string,Description?:string,System?:string,Duration?:string}>} [opts.disciplines]
 */
function fillNpcSheet(row, opts = {}) {
  const template = opts.template || loadTemplate();
  const images = { ...defaultTrackerImages(), ...(template.trackerImages || {}) };
  const data = normalizeRow(row);
  const warnings = [];
  /** @type {Record<string, { text?: string, active?: boolean, image?: string, tooltip?: string }>} */
  const elements = {};

  const disciplines = opts.disciplines || [];
  const discTip = (discipline, name) => {
    const hit = disciplines.find(
      (d) =>
        String(d.Discipline).toLowerCase() === String(discipline).toLowerCase() &&
        String(d.Name).toLowerCase() === String(name).toLowerCase()
    );
    if (!hit) return "";
    return [hit.Description, hit.System, hit.Duration].filter((x) => x && String(x).trim()).join("\n\n");
  };

  // --- Trackers (Custom UI Images + tracker/export) ---
  const kind = String((opts.tracker && opts.tracker.kind) || data.Kind || "").toLowerCase();
  const healthMax = Number((opts.tracker && opts.tracker.healthMax) ?? data.Health) || 0;
  const willMax = Number((opts.tracker && opts.tracker.willpowerMax) ?? data.Willpower) || 0;
  const hasTrackers = healthMax > 0 || willMax > 0 || kind === "vampire" || kind === "werewolf";

  if (!hasTrackers || (blank(data.Health) && blank(data.Willpower) && kind !== "vampire" && kind !== "werewolf")) {
    hide(elements, "npc_trackers_label");
    hide(elements, "npc_hunger_label");
    hide(elements, "npc_hunger");
    hideImageSlots(elements, "npc_hunger", HUNGER_SLOTS);
    hide(elements, "npc_health_label");
    hide(elements, "npc_health");
    hideImageSlots(elements, "npc_health", BOX_SLOTS);
    hide(elements, "npc_willpower_label");
    hide(elements, "npc_willpower");
    hideImageSlots(elements, "npc_willpower", BOX_SLOTS);
  } else {
    showText(elements, "npc_trackers_label", "Trackers");
    if (kind === "vampire") {
      showText(elements, "npc_hunger_label", "Hunger");
      setEl(elements, "npc_hunger", { active: true });
      applyImageSlots(
        elements,
        "npc_hunger",
        paintHungerSlots((opts.tracker && opts.tracker.hunger) ?? 1, images)
      );
    } else {
      hide(elements, "npc_hunger_label");
      hide(elements, "npc_hunger");
      hideImageSlots(elements, "npc_hunger", HUNGER_SLOTS);
    }
    if (healthMax > 0) {
      showText(elements, "npc_health_label", "Health");
      setEl(elements, "npc_health", { active: true });
      applyImageSlots(
        elements,
        "npc_health",
        paintBoxSlots(
          healthMax,
          (opts.tracker && opts.tracker.healthSuperficial) || 0,
          (opts.tracker && opts.tracker.healthAggravated) || 0,
          images
        )
      );
    } else {
      hide(elements, "npc_health_label");
      hide(elements, "npc_health");
      hideImageSlots(elements, "npc_health", BOX_SLOTS);
    }
    if (willMax > 0) {
      showText(elements, "npc_willpower_label", "Willpower");
      setEl(elements, "npc_willpower", { active: true });
      applyImageSlots(
        elements,
        "npc_willpower",
        paintBoxSlots(
          willMax,
          (opts.tracker && opts.tracker.willpowerSuperficial) || 0,
          (opts.tracker && opts.tracker.willpowerAggravated) || 0,
          images
        )
      );
    } else {
      hide(elements, "npc_willpower_label");
      hide(elements, "npc_willpower");
      hideImageSlots(elements, "npc_willpower", BOX_SLOTS);
    }
  }

  // --- Identity joins ---
  const joinFields = (keys, emptyLists, delim) => {
    const parts = [];
    keys.forEach((k, i) => {
      const v = data[k];
      if (isEmptyVal(v, emptyLists[i] || ["", "~", "0"])) return;
      parts.push(String(v));
    });
    return parts.join(delim);
  };

  {
    const text = joinFields(["Title", "Name"], [["", "~", "0"], ["", "~", "0"]], " ◆ ");
    if (!text) hide(elements, "npc_name_title");
    else showText(elements, "npc_name_title", text);
  }
  {
    const text = joinFields(["Clan", "Sect", "Rank"], [["", "~", "0"], ["", "~", "0"], ["", "~", "0"]], " ◆ ");
    if (!text) hide(elements, "npc_clan_sect_rank");
    else showText(elements, "npc_clan_sect_rank", text);
  }
  {
    const text = joinFields(
      ["Kind", "Subkind", "Coterie / Pack"],
      [["", "~", "0"], ["", "~", "0"], ["", "~", "0"]],
      " ◆ "
    );
    if (!text) hide(elements, "npc_kind_subkind_coterie");
    else showText(elements, "npc_kind_subkind_coterie", text);
  }

  if (blank(data["Sect Status"])) hide(elements, "npc_sect_status");
  else showText(elements, "npc_sect_status", `${data.Sect || ""} Status ${rept(data["Sect Status"], "•")}`.trim());

  if (blank(data["Clan Status"])) hide(elements, "npc_clan_status");
  else showText(elements, "npc_clan_status", `${data.Clan || ""} Status ${rept(data["Clan Status"], "•")}`.trim());

  // --- Standard pools ---
  const stdKeys = ["Phy", "Soc", "Men", "Pow"];
  const allStdEmpty = stdKeys.every((k) => blank(data[k]));
  if (allStdEmpty) hide(elements, "npc_standardPools_label");
  else showText(elements, "npc_standardPools_label", "Standard Pools");

  const stdMap = [
    ["npc_phy", "Phy", "PHYSICAL", "TEXT:PHYSICAL ~"],
    ["npc_soc", "Soc", "SOCIAL", "TEXT:SOCIAL ~"],
    ["npc_men", "Men", "MENTAL", "TEXT:MENTAL ~"],
    ["npc_pow", "Pow", "POWER", "HIDE"],
  ];
  for (const [id, key, label, ifEmpty] of stdMap) {
    if (blank(data[key])) {
      if (ifEmpty === "HIDE") hide(elements, id);
      else showText(elements, id, ifEmpty.replace(/^TEXT:/, ""));
    } else {
      showText(elements, id, `${label} ${rept(data[key], "•")}`);
    }
  }

  // --- Exceptional pools ---
  if (blank(data["Exceptional Pools"])) {
    hide(elements, "npc_exceptionalPools_label");
    for (let i = 1; i <= 9; i++) hide(elements, `npc_exceptional_pool_${i}`);
  } else {
    showText(elements, "npc_exceptionalPools_label", "Exceptional Pools");
    const diff = /^(\d+)\s*\/\s*\d+/.exec(String(data.Difficulty || ""));
    const exceptional = diff ? Number(diff[1]) : 0;
    const dots = rept(exceptional, "•") + " " + rept(exceptional, "•");
    const names = splitPipe(data["Exceptional Pools"]).map((e) => e.split(":")[0].trim()).filter(Boolean);
    for (let i = 1; i <= 9; i++) {
      const name = names[i - 1];
      if (!name) hide(elements, `npc_exceptional_pool_${i}`);
      else showText(elements, `npc_exceptional_pool_${i}`, `${name} ${dots}`.trim());
    }
  }

  // --- Attacks ---
  if (blank(data.Attacks)) {
    hide(elements, "npc_attacks_label");
    for (let i = 1; i <= 9; i++) hide(elements, `npc_attack_${i}`);
  } else {
    showText(elements, "npc_attacks_label", "Attacks");
    const attacks = splitPipe(data.Attacks);
    for (let i = 1; i <= 9; i++) {
      const raw = attacks[i - 1];
      if (!raw) {
        hide(elements, `npc_attack_${i}`);
        continue;
      }
      const m = /^([^=]+)=(?:Phy|Soc|Men|Pow|[^=|:]+)([+-]\d+)/i.exec(raw);
      const name = m ? m[1].trim() : raw.split("=")[0].trim();
      const signed = m ? m[2] : "+0";
      const zero = signed === "0" || signed === "+0" || signed === "-0";
      const display = zero ? name : `${name} (${signed.startsWith("-") ? signed : `+${String(signed).replace(/^\+/, "")}`})`;
      showText(elements, `npc_attack_${i}`, display);
    }
  }

  // --- Powers discipline rows ---
  const groups = blank(data.Powers) ? [] : parsePowersHierarchy(data.Powers);
  const ancilla = parseAncillaMap(data["Ancilla Power(s)"]);
  if (ancilla.size > 0) {
    const allNames = new Set(groups.flatMap((g) => g.names));
    for (const name of ancilla.keys()) {
      if (!allNames.has(name)) warnings.push(`Ancilla Power(s) "${name}" does not match any Powers display name`);
    }
  }
  if (groups.length === 0) {
    hide(elements, "npc_powers_label");
  } else {
    showText(elements, "npc_powers_label", "Powers");
  }
  for (let r = 1; r <= 8; r++) {
    const g = groups[r - 1];
    if (!g) {
      hide(elements, `npc_power_row_${r}`);
      hide(elements, `npc_power_row_${r}_label`);
      hide(elements, `npc_power_row_${r}_close`);
      for (let p = 1; p <= 6; p++) {
        hide(elements, `npc_power_row_${r}_p${p}`);
        if (p < 6) hide(elements, `npc_power_row_${r}_sep${p}`);
      }
      continue;
    }
    setEl(elements, `npc_power_row_${r}`, { active: true });
    showText(elements, `npc_power_row_${r}_label`, `${g.discipline} ${rept(g.dots, "•")} (`);
    showText(elements, `npc_power_row_${r}_close`, ")");
    for (let p = 1; p <= 6; p++) {
      const name = g.names[p - 1];
      if (!name) {
        hide(elements, `npc_power_row_${r}_p${p}`);
        if (p < 6) hide(elements, `npc_power_row_${r}_sep${p}`);
        continue;
      }
      const tip = ancilla.has(name) ? ancilla.get(name) : discTip(g.discipline, name);
      showText(elements, `npc_power_row_${r}_p${p}`, name, { tooltip: tip || "" });
      if (p < 6) {
        if (g.names[p]) showText(elements, `npc_power_row_${r}_sep${p}`, ", ");
        else hide(elements, `npc_power_row_${r}_sep${p}`);
      }
    }
  }

  // --- Elder / Methuselah / Advantages / Special ---
  const noteBlock = (labelId, itemPrefix, max, raw, labelText) => {
    const parts = splitPipe(raw);
    if (parts.length === 0) {
      hide(elements, labelId);
      for (let i = 1; i <= max; i++) hide(elements, `${itemPrefix}${i}`);
      return;
    }
    showText(elements, labelId, labelText);
    for (let i = 1; i <= max; i++) {
      const entry = parts[i - 1];
      if (!entry) {
        hide(elements, `${itemPrefix}${i}`);
        continue;
      }
      const nameMatch = /^([^(]+?)(?:\s*\(|$)/.exec(entry);
      const name = nameMatch ? nameMatch[1].trim() : entry;
      showText(elements, `${itemPrefix}${i}`, name, { tooltip: entry });
    }
  };
  noteBlock("npc_elder_label", "npc_elder_", 3, data["Elder Power(s)"], "Elder Powers");
  noteBlock("npc_methuselah_label", "npc_methuselah_", 3, data["Methuselah Power(s)"], "Methuselah Powers");
  noteBlock("npc_specialAbilities_label", "npc_special_ability_", 3, data["Special Abilities"], "Special Abilities");

  const roleplay =
    (opts.tracker && typeof opts.tracker.roleplayNotes === "string" && opts.tracker.roleplayNotes) ||
    data["Roleplay Notes"] ||
    "";
  if (blank(roleplay)) {
    hide(elements, "npc_roleplay_notes_label");
    hide(elements, "npc_roleplay_notes");
  } else {
    showText(elements, "npc_roleplay_notes_label", "Roleplay Notes");
    showText(elements, "npc_roleplay_notes", String(roleplay).trim());
  }

  const adv = splitPipe(data.Advantages);
  if (adv.length === 0) {
    hide(elements, "npc_advantages_label");
    for (let i = 1; i <= 15; i++) hide(elements, `npc_advantage_${i}`);
  } else {
    showText(elements, "npc_advantages_label", "Advantages");
    for (let i = 1; i <= 15; i++) {
      if (!adv[i - 1]) hide(elements, `npc_advantage_${i}`);
      else showText(elements, `npc_advantage_${i}`, adv[i - 1]);
    }
  }

  // Ancilla never has its own sheet section — overlay only (no npc_ancilla_* ids).

  return { elements, warnings, trackerImages: images, hideY: HIDE_Y };
}

function listXmlIds(xmlText) {
  const ids = new Set();
  const re = /\bid\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(xmlText))) ids.add(m[1]);
  return ids;
}

module.exports = {
  fillNpcSheet,
  loadTemplate,
  parsePowersHierarchy,
  powerDisplayName,
  paintBoxSlots,
  paintHungerSlots,
  listXmlIds,
  blank,
  HUNGER_SLOTS,
  BOX_SLOTS,
};

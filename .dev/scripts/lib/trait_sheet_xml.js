"use strict";

/**
 * Build-time port of lib/trait_sheet_xml.ttslua — keep weights and packing in sync with Lua.
 */

const { applyTemplate } = require("./ui_xml_template_apply");

const MAX_TITLE_DOTS = 6;
const W_TITLE = 10;
const W_DESC_LINE = 3;
const W_RULE_LINE = 2;
const W_SOURCE = 2;

/**
 * @param {string|undefined|null} s
 * @returns {string}
 */
function trimWhitespace(s) {
  if (typeof s !== "string" || s === "") {
    return "";
  }
  return s.replace(/^\s+/, "").replace(/\s+$/, "");
}

/**
 * @param {object} entry
 * @returns {string}
 */
function entryTitleUpper(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  const nameStr = typeof entry.name === "string" ? entry.name : "";
  const focusStr = typeof entry.focus === "string" ? trimWhitespace(entry.focus) : "";
  if (focusStr !== "") {
    return (nameStr + ": " + focusStr).toUpperCase();
  }
  return nameStr.toUpperCase();
}

/**
 * @param {number} n
 * @returns {string}
 */
function titleBarDotClass(n) {
  let N = Math.floor(Number(n) || 1);
  if (N < 1) {
    N = 1;
  }
  if (N === 1) {
    return "1_dot";
  }
  return `${N}_dots`;
}

/**
 * @param {object} entry
 * @returns {[number, number]}
 */
function slotAndBase(entry) {
  if (!entry || typeof entry !== "object") {
    return [1, 0];
  }
  let slot = Number(entry.max);
  if (Number.isNaN(slot)) {
    slot = Number(entry.base);
  }
  if (Number.isNaN(slot) || slot < 1) {
    slot = 1;
  }
  slot = Math.min(MAX_TITLE_DOTS, Math.floor(slot));
  let base = Math.floor(Number(entry.base) || 0);
  base = Math.max(0, Math.min(base, slot));
  return [slot, base];
}

/**
 * @param {object} entry
 * @returns {[number, number, number]}
 */
function slotBaseAndTemp(entry) {
  const [slotCount, baseCount] = slotAndBase(entry);
  let tempCount = 0;
  if (entry && typeof entry === "object") {
    tempCount = Math.floor(Number(entry.temp) || 0);
  }
  tempCount = Math.max(0, tempCount);
  tempCount = Math.min(tempCount, Math.max(0, slotCount - baseCount));
  return [slotCount, baseCount, tempCount];
}

/**
 * @param {number} i 1-based slot index (left to right)
 * @param {number} slotCount
 * @param {number} baseCount
 * @param {number} tempCount
 * @param {string} filledImg
 * @returns {string}
 */
function dotImageForTraitSlot(i, slotCount, baseCount, tempCount, filledImg) {
  let temp = tempCount;
  let totalFilled = baseCount + temp;
  if (totalFilled > slotCount) {
    temp = Math.max(0, slotCount - baseCount);
    totalFilled = baseCount + temp;
  }
  if (totalFilled <= 0 || i < slotCount - totalFilled + 1) {
    return "dot_blank";
  }
  if (i <= slotCount - baseCount) {
    return "dot_white";
  }
  return filledImg;
}

/**
 * @param {unknown} lines
 * @returns {string[]}
 */
function coerceStringLines(lines) {
  if (typeof lines === "string") {
    return trimWhitespace(lines) === "" ? [] : [lines];
  }
  if (!Array.isArray(lines)) {
    return [];
  }
  return lines.filter((line) => typeof line === "string");
}

/**
 * @param {unknown} lines
 * @returns {string|null}
 */
function joinMultilineField(lines) {
  const arr = coerceStringLines(lines);
  if (arr.length === 0) {
    return null;
  }
  return arr.join("\n");
}

/**
 * @param {string|null|undefined} text
 * @returns {number}
 */
function countDisplayLines(text) {
  if (typeof text !== "string" || text === "") {
    return 0;
  }
  const n = text.split("\n").filter((line) => line.length > 0).length;
  return n === 0 ? 1 : n;
}

/**
 * @param {object|null|undefined} entry
 * @param {object} opts
 * @returns {boolean}
 */
function isEntryIncluded(entry, opts) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const mode = opts.visibilityMode || "sheetDisplay";
  if (mode === "active") {
    return true;
  }
  return entry.sheetDisplay !== false;
}

/**
 * @param {Record<string, string>} params
 * @param {object} entry
 * @param {string|null} flavor
 * @param {string|null} rules
 * @param {object} opts
 */
function applyTraitBodyTextParams(params, entry, flavor, rules, opts) {
  const isBlankRuntimeTarget = opts.visibilityMode === "active" && entry.blank === true;
  if (flavor !== null || rules !== null || isBlankRuntimeTarget) {
    params.HAS_BODY_TEXT = "1";
    params.FLAVOR_TEXT = flavor ?? "";
    params.RULES_TEXT = rules ?? "";
  }
}

/**
 * @param {object} entry
 * @param {string} sectionKey
 * @param {number} entryIndex
 * @param {boolean} isFlaw
 * @param {object} opts
 * @returns {[Record<string, string>, number]}
 */
function buildTraitBlockParams(entry, sectionKey, entryIndex, isFlaw, opts) {
  const pageNum = opts.pageNum || 3;
  const [slotCount, baseCount, tempCount] = slotBaseAndTemp(entry);
  const filledImg = isFlaw ? "dot_red" : "dot_yellow";
  /** @type {Record<string, string>} */
  const params = {
    TITLE_BAR_DOT_CLASS: titleBarDotClass(slotCount),
    TITLE_TEXT: entryTitleUpper(entry),
    PAGE_NUM: String(pageNum),
    INDEX: String(entryIndex),
    SECTION: sectionKey,
  };
  for (let i = 1; i <= slotCount; i += 1) {
    params[`DOT_IMG_${i}`] = dotImageForTraitSlot(i, slotCount, baseCount, tempCount, filledImg);
  }

  const flavor = joinMultilineField(entry.description);
  const rules = joinMultilineField(entry.rules);
  applyTraitBodyTextParams(params, entry, flavor, rules, opts);

  if (opts.visibilityMode === "active") {
    params.BLOCK_ACTIVE = entry.active === false ? "false" : "true";
  }

  let w =
    W_TITLE +
    countDisplayLines(flavor) * W_DESC_LINE +
    countDisplayLines(rules) * W_RULE_LINE;
  if (entry.blank === true && entry.active === false) {
    w = 1;
  }
  return [params, w];
}

/**
 * @param {object} entry
 * @param {string} sectionKey
 * @param {number} entryIndex
 * @param {boolean} isFlaw
 * @param {object} opts
 * @param {Record<string, string>} templates
 * @returns {[string, number]}
 */
function buildTraitBoxXml(entry, sectionKey, entryIndex, isFlaw, opts, templates) {
  if (!entry || typeof entry !== "object") {
    return ["", 0];
  }
  if (!isEntryIncluded(entry, opts)) {
    return ["", 0];
  }
  const templateKeyBySection = opts.templateKeyBySection;
  const templateKey = templateKeyBySection[sectionKey];
  if (!templateKey) {
    throw new Error(`[trait_sheet_xml] Unknown sectionKey: ${sectionKey}`);
  }
  const templateBody = templates[templateKey];
  if (!templateBody) {
    throw new Error(`[trait_sheet_xml] Missing template: ${templateKey}`);
  }
  const [params, w] = buildTraitBlockParams(entry, sectionKey, entryIndex, isFlaw, opts);
  if (w <= 0) {
    return ["", 0];
  }
  const xml = applyTemplate(templateKey, templateBody, params);
  return [xml, w];
}

/**
 * @param {object[]} items
 * @returns {[string, string, string]}
 */
function packItemsGreedy(items) {
  if (items.length === 0) {
    return ["", "", ""];
  }
  items.sort((a, b) => b.w - a.w);
  const cols = [
    { w: 0, chunks: [] },
    { w: 0, chunks: [] },
    { w: 0, chunks: [] },
  ];
  for (const it of items) {
    let best = 0;
    for (let c = 1; c < 3; c += 1) {
      if (cols[c].w < cols[best].w) {
        best = c;
      }
    }
    cols[best].w += it.w;
    cols[best].chunks.push(it.xml);
  }
  return [
    cols[0].chunks.join(""),
    cols[1].chunks.join(""),
    cols[2].chunks.join(""),
  ];
}

/**
 * @param {object[]|undefined|null} entries
 * @param {string} sectionKey
 * @param {boolean} isFlaw
 * @param {object} opts
 * @param {Record<string, string>} templates
 * @returns {[string, string, string]}
 */
function buildBalancedColumnContents(entries, sectionKey, isFlaw, opts, templates) {
  const packOpts = { ...opts, sectionKey, isFlaw };
  if (!Array.isArray(entries) || entries.length === 0) {
    return ["", "", ""];
  }

  const realItems = [];
  const blankItems = [];
  let visibleIndex = 0;
  for (const entry of entries) {
    if (entry && typeof entry === "object" && isEntryIncluded(entry, packOpts)) {
      const isBlank = entry.blank === true;
      const [xml, w] = buildTraitBoxXml(
        entry,
        sectionKey,
        visibleIndex,
        isFlaw,
        packOpts,
        templates
      );
      visibleIndex += 1;
      if (w > 0 && xml !== "") {
        const item = { w, xml };
        if (isBlank && packOpts.pinBlanksToColumn3 === true) {
          blankItems.push(item);
        } else {
          realItems.push(item);
        }
      }
    }
  }

  let [c1, c2, c3] = packItemsGreedy(realItems);
  if (packOpts.pinBlanksToColumn3 === true && blankItems.length > 0) {
    c3 += blankItems.map((it) => it.xml).join("");
  }
  return [c1, c2, c3];
}

const PRINCES_COURT_SECTIONS = {
  coterie: {
    pageNum: 2,
    bgKey: "coterieBackgrounds",
    meritKey: "coterieMerits",
    flawKey: "coterieFlaws",
    prefix: "COTERIE",
  },
  domain: {
    pageNum: 3,
    bgKey: "domainBackgrounds",
    meritKey: "domainMerits",
    flawKey: "domainFlaws",
    prefix: "DOMAIN",
  },
  haven: {
    pageNum: 4,
    bgKey: "havenBackgrounds",
    meritKey: "havenMerits",
    flawKey: "havenFlaws",
    prefix: "HAVEN",
  },
};

const PRINCES_COURT_TRAIT_OPTS = {
  visibilityMode: "active",
  pinBlanksToColumn3: true,
  templateKeyBySection: {
    bg: "princes_court/partials/bg_block",
    merit: "princes_court/partials/merit_block",
    flaw: "princes_court/partials/flaw_block",
  },
};

/**
 * @param {object|null|undefined} coterieData
 * @param {Record<string, string>} templates
 * @returns {Record<string, string>}
 */
function buildTraitPlaceholderMap(coterieData, templates) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const section of Object.values(PRINCES_COURT_SECTIONS)) {
    const prefix = section.prefix;
    const data = coterieData && typeof coterieData === "object" ? coterieData : {};
    const opts = { ...PRINCES_COURT_TRAIT_OPTS, pageNum: section.pageNum };

    const bgEntries = Array.isArray(data[section.bgKey]) ? data[section.bgKey] : [];
    const [bg1, bg2, bg3] = buildBalancedColumnContents(bgEntries, "bg", false, opts, templates);
    out[`${prefix}_BACKGROUNDS_COLUMN_1`] = bg1;
    out[`${prefix}_BACKGROUNDS_COLUMN_2`] = bg2;
    out[`${prefix}_BACKGROUNDS_COLUMN_3`] = bg3;

    const meritEntries = Array.isArray(data[section.meritKey]) ? data[section.meritKey] : [];
    const [m1, m2, m3] = buildBalancedColumnContents(meritEntries, "merit", false, opts, templates);
    out[`${prefix}_MERITS_COLUMN_1`] = m1;
    out[`${prefix}_MERITS_COLUMN_2`] = m2;
    out[`${prefix}_MERITS_COLUMN_3`] = m3;

    const flawEntries = Array.isArray(data[section.flawKey]) ? data[section.flawKey] : [];
    const [f1, f2, f3] = buildBalancedColumnContents(flawEntries, "flaw", true, opts, templates);
    out[`${prefix}_FLAWS_COLUMN_1`] = f1;
    out[`${prefix}_FLAWS_COLUMN_2`] = f2;
    out[`${prefix}_FLAWS_COLUMN_3`] = f3;
  }
  return out;
}

module.exports = {
  buildTraitPlaceholderMap,
  PRINCES_COURT_SECTIONS,
  buildTraitBlockParams,
  slotAndBase,
  slotBaseAndTemp,
  dotImageForTraitSlot,
  entryTitleUpper,
  titleBarDotClass,
  joinMultilineField,
};

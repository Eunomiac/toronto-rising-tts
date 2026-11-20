"use strict";

const fs = require("fs");
const path = require("path");

/** Strip // and block comments from JSONC (string values must not contain comment-like //). */
function stripJsonc(text) {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\" && i + 1 < text.length) {
        out += text[i + 1];
        i += 2;
        continue;
      }
      if (c === "\"") inStr = false;
      i += 1;
      continue;
    }
    if (c === "\"") {
      inStr = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i + 1 < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function loadTemplate(templatePath) {
  const file =
    templatePath ||
    path.join(__dirname, "../../lib/json/pc-as-npc-template.jsonc");
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(stripJsonc(raw));
  if (Array.isArray(parsed)) {
    return { trackerImages: defaultTrackerImages(), elements: parsed };
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.elements)) {
    throw new Error(
      "pc-as-npc-template.jsonc must be { trackerImages, elements } or a legacy elements array"
    );
  }
  const legacyGlyphs = parsed.trackerGlyphs && typeof parsed.trackerGlyphs === "object" ? parsed.trackerGlyphs : {};
  const images = parsed.trackerImages && typeof parsed.trackerImages === "object" ? parsed.trackerImages : {};
  return {
    trackerImages: { ...defaultTrackerImages(), ...legacyGlyphs, ...images },
    elements: parsed.elements,
  };
}

/** Custom UI asset names on CSHEET_NPC_* (assets/CSheets/Shared via cloud sync). */
function defaultTrackerImages() {
  return {
    hungerEmpty: "dot_blank",
    hungerFilled: "dot_red",
    boxEmpty: "box_white",
    boxSuperficial: "box_grey_slash",
    boxAggravated: "box_red_x",
  };
}

module.exports = {
  loadTemplate,
  stripJsonc,
  defaultTrackerImages,
  /** @deprecated use defaultTrackerImages */
  defaultGlyphs: defaultTrackerImages,
};

"use strict";

/**
 * Minimal port of lib/ui_xml_template.ttslua for build-time Prince's Court trait expansion.
 */

/**
 * @param {string|number|boolean|null|undefined} s
 * @returns {string}
 */
function xmlEscapeAttr(s) {
  if (s === null || s === undefined) {
    return "";
  }
  let t = String(s);
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
  t = t.replace(/&/g, "&amp;");
  t = t.replace(/</g, "&lt;");
  t = t.replace(/>/g, "&gt;");
  t = t.replace(/"/g, "&quot;");
  return t;
}

/**
 * @param {string} haystack
 * @param {string} needle
 * @param {string} replacement
 * @returns {string}
 */
function replaceAllPlain(haystack, needle, replacement) {
  if (needle === "") {
    return haystack;
  }
  const parts = [];
  let start = 0;
  while (true) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) {
      parts.push(haystack.slice(start));
      break;
    }
    parts.push(haystack.slice(start, idx));
    parts.push(replacement);
    start = idx + needle.length;
  }
  return parts.join("");
}

/**
 * @param {string} template
 * @param {Record<string, string|number|boolean>} params
 * @returns {string}
 */
function processConditionals(template, params) {
  let result = template;
  const headerPattern = /##IF\s+@@([A-Za-z0-9_]+)@@\s*##/g;
  const endifMarker = "##ENDIF##";
  while (true) {
    const match = headerPattern.exec(result);
    if (!match) {
      break;
    }
    headerPattern.lastIndex = 0;
    const startIdx = result.search(/##IF\s+@@([A-Za-z0-9_]+)@@\s*##/);
    if (startIdx === -1) {
      break;
    }
    const headerMatch = result.slice(startIdx).match(/^##IF\s+@@([A-Za-z0-9_]+)@@\s*##/);
    if (!headerMatch) {
      break;
    }
    const key = headerMatch[1];
    const headerEnd = startIdx + headerMatch[0].length;
    const endIdx = result.indexOf(endifMarker, headerEnd);
    if (endIdx === -1) {
      throw new Error(`[ui_xml_template_apply] Missing ${endifMarker} for ##IF @@${key}@@##`);
    }
    const inner = result.slice(headerEnd, endIdx);
    const replacement = params[key] !== undefined ? inner : "";
    result = result.slice(0, startIdx) + replacement + result.slice(endIdx + endifMarker.length);
  }
  return result;
}

/**
 * @param {string} template
 * @param {Record<string, string|number|boolean>} params
 * @param {Record<string, boolean>} [rawKeys]
 * @returns {string}
 */
function substituteTokens(template, params, rawKeys = {}) {
  const keys = Object.keys(params).sort((a, b) => b.length - a.length);
  let out = template;
  for (const key of keys) {
    const token = `@@${key}@@`;
    const raw = params[key];
    const val = rawKeys[key] ? String(raw) : xmlEscapeAttr(raw);
    out = replaceAllPlain(out, token, val);
  }
  return out;
}

/**
 * @param {string} template
 * @param {string} templateName
 * @returns {string}
 */
function assertNoUnfilledTokens(template, templateName) {
  const allowed = new Set(["color"]);
  const unfilled = template.match(/@@([A-Za-z0-9_]+)@@/g);
  if (unfilled) {
    for (const token of unfilled) {
      const key = token.slice(2, -2);
      if (!allowed.has(key)) {
        throw new Error(
          `[ui_xml_template_apply] Unfilled token @@${key}@@ after apply (template ${templateName})`
        );
      }
    }
  }
  return template;
}

/**
 * @param {string} templateName
 * @param {string} templateBody
 * @param {Record<string, string|number|boolean>} params
 * @param {{ rawKeys?: Record<string, boolean> }} [opts]
 * @returns {string}
 */
function applyTemplate(templateName, templateBody, params, opts = {}) {
  const afterIf = processConditionals(templateBody, params);
  const out = substituteTokens(afterIf, params, opts.rawKeys || {});
  return assertNoUnfilledTokens(out, templateName);
}

module.exports = {
  applyTemplate,
  processConditionals,
  xmlEscapeAttr,
};

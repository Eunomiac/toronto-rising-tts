"use strict";

/**
 * Build-time port of lib/ui_xml_template.ttslua semantics:
 * @@KEY@@ substitution and ##IF @@KEY@@## ... ##ENDIF## conditionals.
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
    if (idx < 0) {
      parts.push(haystack.slice(start));
      break;
    }
    parts.push(haystack.slice(start, idx), replacement);
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
    const startIdx = match.index;
    const headerEnd = match.index + match[0].length;
    const key = match[1];
    const innerStart = headerEnd;
    const endIdx = result.indexOf(endifMarker, innerStart);
    if (endIdx < 0) {
      throw new Error(
        `[ui_xml_template_engine] Missing ${endifMarker} for ##IF @@${key}@@##`
      );
    }
    const inner = result.slice(innerStart, endIdx);
    const replacement = params[key] !== undefined ? inner : "";
    const afterEnd = endIdx + endifMarker.length;
    result = result.slice(0, startIdx) + replacement + result.slice(afterEnd);
    headerPattern.lastIndex = 0;
  }
  return result;
}

/**
 * @param {string} template
 * @param {Record<string, string|number|boolean>} params
 * @param {Record<string, boolean>|undefined} rawKeys
 * @returns {string}
 */
function substituteTokens(template, params, rawKeys) {
  const raw = rawKeys || {};
  const keys = Object.keys(params).sort((a, b) => b.length - a.length);
  let out = template;
  for (const key of keys) {
    const token = `@@${key}@@`;
    const val = raw[key] ? String(params[key]) : xmlEscapeAttr(params[key]);
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
  const m = template.match(/@@([A-Za-z0-9_]+)@@/);
  if (m) {
    throw new Error(
      `[ui_xml_template_engine] Unfilled token @@${m[1]}@@ after apply (template ${templateName})`
    );
  }
  return template;
}

/**
 * @param {string} fileText
 * @returns {string}
 */
function stripLeadingParametersComment(fileText) {
  const trimmed = fileText.trimStart();
  if (!trimmed.startsWith("<!--")) {
    return fileText.trim();
  }
  const end = trimmed.indexOf("-->");
  if (end < 0) {
    return fileText.trim();
  }
  return trimmed.slice(end + 3).trim();
}

/**
 * @param {string} template
 * @param {string} templateName
 * @param {Record<string, string|number|boolean>|null|undefined} params
 * @param {{ rawKeys?: Record<string, boolean> }|null|undefined} opts
 * @returns {string}
 */
function apply(template, templateName, params, opts) {
  const p = params && typeof params === "object" ? params : {};
  const rawKeys = opts && opts.rawKeys ? opts.rawKeys : {};
  const afterIf = processConditionals(template, p);
  const out = substituteTokens(afterIf, p, rawKeys);
  return assertNoUnfilledTokens(out, templateName);
}

module.exports = {
  apply,
  stripLeadingParametersComment,
  xmlEscapeAttr,
  processConditionals,
  substituteTokens,
};

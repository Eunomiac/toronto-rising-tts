/**
 * Queries TTS (External Editor) for objects tagged *Object per seat color,
 * then writes a markdown bullet list (nickname + GUID) grouped by color.
 * Run from repo root: node .tools/tts-bridge/scripts/export-color-object-tags-to-markdown.mjs
 *
 * Agent note: this script parses `return JSON.encode` + `print` fallback per `.dev/TTS_MCP.md`.
 * New mod-side probes can instead use `U.mcpEmitResult` / `U.emitForAgent` (`TR_AGENT_V1` lines).
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TtsExternalEditorBridge } from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const luaScript = `
local tags = { "BrownObject", "OrangeObject", "RedObject", "PinkObject", "PurpleObject" }
local result = {}
for _, tag in ipairs(tags) do
  local objs = getObjectsWithTag(tag)
  local items = {}
  if type(objs) == "table" then
    for _, obj in ipairs(objs) do
      if obj ~= nil then
        table.insert(items, {
          name = obj.getName(),
          guid = obj.getGUID()
        })
      end
    end
  end
  table.sort(items, function(a, b)
    return tostring(a.name) < tostring(b.name)
  end)
  table.insert(result, { tag = tag, items = items })
end
if JSON == nil or JSON.encode == nil then
  error("JSON.encode is required for External Editor return serialization")
end
local encoded = JSON.encode(result)
print(encoded)
return encoded
`;

/** @param {unknown} v */
function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

/** @param {unknown} v */
function isTagRow(v) {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return false;
  }
  const o = /** @type {Record<string, unknown>} */ (v);
  if (!isNonEmptyString(o.tag) || !Array.isArray(o.items)) {
    return false;
  }
  for (const item of o.items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return false;
    }
    const row = /** @type {Record<string, unknown>} */ (item);
    if (!isNonEmptyString(row.name) || !isNonEmptyString(row.guid)) {
      return false;
    }
  }
  return true;
}

/** @param {unknown} v */
function parseTagRows(v) {
  if (!Array.isArray(v)) {
    return null;
  }
  const rows = [];
  for (const el of v) {
    if (!isTagRow(el)) {
      return null;
    }
    rows.push(el);
  }
  return rows;
}

/**
 * TTS may omit table return payloads; prefer JSON string return or last print line.
 * @param {{ prints: string[], returnValue?: unknown }} result
 */
function extractRowsFromExecuteResult(result) {
  const rv = result.returnValue;
  if (typeof rv === "string") {
    try {
      return parseTagRows(JSON.parse(rv));
    } catch {
      return null;
    }
  }
  const fromReturn = parseTagRows(rv);
  if (fromReturn !== null) {
    return fromReturn;
  }
  for (let i = result.prints.length - 1; i >= 0; i -= 1) {
    const line = result.prints[i]?.trim();
    if (!line || line[0] !== "[") {
      continue;
    }
    try {
      const parsed = parseTagRows(JSON.parse(line));
      if (parsed !== null) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** @param {string} tag */
function headingFromTag(tag) {
  if (tag.endsWith("Object")) {
    return tag.slice(0, -"Object".length);
  }
  return tag;
}

/** @param {Array<{ tag: string, items: Array<{ name: string, guid: string }> }>} rows */
function toMarkdown(rows) {
  const lines = [
    "# TTS objects by seat color tag",
    "",
    "Generated from live Tabletop Simulator state via External Editor (`getObjectsWithTag`).",
    "",
    "Tags: `BrownObject`, `OrangeObject`, `RedObject`, `PinkObject`, `PurpleObject`.",
    "",
 ];
  for (const { tag, items } of rows) {
    const title = headingFromTag(tag);
    lines.push(`## ${title} (\`${tag}\`)`, "");
    if (items.length === 0) {
      lines.push("- _(no objects)_", "");
      continue;
    }
    for (const { name, guid } of items) {
      lines.push(`- **${name}** — \`${guid}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const defaultOut = path.join(__dirname, "..", "..", "..", ".dev", "tts-color-object-tags-by-seat.md");
const outPath = process.argv[2] ?? defaultOut;

const bridge = new TtsExternalEditorBridge();

try {
  const result = await bridge.executeWithOutput({
    script: luaScript,
    guid: "-1",
    maxWaitMs: 30_000,
    idleTimeoutMs: 5000,
  });

  if (result.error) {
    console.error("TTS execute error:", result.error);
    process.exitCode = 1;
  } else if (result.timedOut) {
    console.error("Timed out waiting for TTS response.");
    process.exitCode = 1;
  } else {
    const rows = extractRowsFromExecuteResult(result);
    if (rows === null) {
      console.error("Could not parse tag rows. returnValue:", result.returnValue);
      console.error("prints:", result.prints);
      process.exitCode = 1;
    } else {
      writeFileSync(outPath, toMarkdown(rows), "utf8");
      console.log("Wrote", outPath);
    }
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await bridge.close();
}

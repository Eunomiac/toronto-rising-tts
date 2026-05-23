/**
 * Embeds lib/json/PC_Relationships.json into lib/pc_relationships_data.ttslua for TTS (no filesystem at runtime).
 * Run from repo root: node .dev/scripts/generate_pc_relationships_lua.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const jsonPath = path.join(root, "lib", "json", "PC_Relationships.json");
const outPath = path.join(root, "lib", "pc_relationships_data.ttslua");

const raw = fs.readFileSync(jsonPath, "utf8");
JSON.parse(raw);

const bracket = "=".repeat(50);
const open = `[${bracket}[`;
const close = `]${bracket}]`;

const header = `--[[
    Relationship blocks for character sheet page 4 — embedded from lib/json/PC_Relationships.json
    DO NOT EDIT BY HAND — regenerate: node .dev/scripts/generate_pc_relationships_lua.js
]]

---@diagnostic disable: undefined-global
local PC_REL = {}

PC_REL.RAW_JSON = ${open}
`;

const footer = `
${close}

function PC_REL.getDecoded()
  if PC_REL._cache == nil then
    if JSON == nil or type(JSON.decode) ~= "function" then
      error("PC_REL.getDecoded: JSON.decode unavailable")
    end
    local data = JSON.decode(PC_REL.RAW_JSON)
    if type(data) ~= "table" then
      error("PC_REL.getDecoded: decode did not return a table")
    end
    PC_REL._cache = data
  end
  return PC_REL._cache
end

return PC_REL
`;

fs.writeFileSync(outPath, header + raw + footer, "utf8");
console.log("Wrote", outPath, "(" + (fs.statSync(outPath).size / 1024).toFixed(1) + " KB)");

/**
 * Embeds lib/json/PC_Relationships.json into lib/pc_relationships_data.ttslua for TTS (no filesystem at runtime).
 * The embedded copy only seeds gameState.relationships on a save that has none (core/state.ttslua);
 * after that, edit relationships in-game (core/relationships.ttslua), not this JSON.
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
    Seed for gameState.relationships (character sheet page 4) — embedded from lib/json/PC_Relationships.json
    DO NOT EDIT BY HAND — regenerate: node .dev/scripts/generate_pc_relationships_lua.js
]]

---@diagnostic disable: undefined-global
local PC_REL = {}

PC_REL.RAW_JSON = ${open}
`;

const footer = `
${close}

--- Fresh decoded copy (callers may store and mutate it).
function PC_REL.decodeSeed()
  local data = JSON.decode(PC_REL.RAW_JSON)
  if type(data) ~= "table" then
    error("PC_REL.decodeSeed: decode did not return a table")
  end
  return data
end

return PC_REL
`;

fs.writeFileSync(outPath, header + raw + footer, "utf8");
console.log("Wrote", outPath, "(" + (fs.statSync(outPath).size / 1024).toFixed(1) + " KB)");

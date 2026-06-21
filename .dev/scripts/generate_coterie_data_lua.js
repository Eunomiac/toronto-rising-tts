/**
 * Embeds lib/json/Coterie.json into lib/coterie_data.ttslua for TTS (no filesystem reads at runtime).
 * Run from repo root: node .dev/scripts/generate_coterie_data_lua.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const jsonPath = path.join(root, "lib", "json", "Coterie.json");
const outPath = path.join(root, "lib", "coterie_data.ttslua");

const raw = fs.readFileSync(jsonPath, "utf8");
JSON.parse(raw);

const bracket = "=".repeat(50);
const open = `[${bracket}[`;
const close = `]${bracket}]`;

const header = `--[[
    Coterie chronicle data embedded from lib/json/Coterie.json
    DO NOT EDIT BY HAND — regenerate: node .dev/scripts/generate_coterie_data_lua.js
    Agent guidance: .dev/Projects/Project System Overview.md (coterieData in gameState)
]]

---@diagnostic disable: undefined-global
local CoterieData = {}

CoterieData.RAW_JSON = ${open}
`;
const footer = `
${close}

function CoterieData.getDecoded()
  if CoterieData._cache == nil then
    if JSON == nil or type(JSON.decode) ~= "function" then
      error("CoterieData.getDecoded: JSON.decode unavailable")
    end
    local data = JSON.decode(CoterieData.RAW_JSON)
    if type(data) ~= "table" then
      error("CoterieData.getDecoded: invalid JSON")
    end
    CoterieData._cache = data
  end
  return CoterieData._cache
end

return CoterieData
`;

fs.writeFileSync(outPath, header + raw + footer, "utf8");
console.log("Wrote", outPath, "(" + (fs.statSync(outPath).size / 1024).toFixed(1) + " KB)");

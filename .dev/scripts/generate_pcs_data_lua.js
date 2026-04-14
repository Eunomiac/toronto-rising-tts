/**
 * Embeds data/PCS.json into lib/pcs_data.ttslua for TTS (no filesystem reads at runtime).
 * Run from repo root: node dev/scripts/generate_pcs_data_lua.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const jsonPath = path.join(root, "data", "PCS.json");
const outPath = path.join(root, "lib", "pcs_data.ttslua");

const raw = fs.readFileSync(jsonPath, "utf8");
// Validate JSON
JSON.parse(raw);

const bracket = "=".repeat(50);
const open = `[${bracket}[`;
const close = `]${bracket}]`;

const header = `--[[
    Player character definitions embedded from data/PCS.json
    DO NOT EDIT BY HAND — regenerate: node dev/scripts/generate_pcs_data_lua.js
    Agent guidance: dev/TTS_BUNDLING_SETUP.md; dev/PC Data & Tracking/PC Tracking & State Behavior.md
]]

---@diagnostic disable: undefined-global
local PCS = {}

PCS.RAW_JSON = ${open}
`;
const footer = `
${close}

function PCS.getDecoded()
  if PCS._cache == nil then
    if JSON == nil or type(JSON.decode) ~= "function" then
      error("PCS.getDecoded: JSON.decode unavailable")
    end
    local ok, data = pcall(function()
      return JSON.decode(PCS.RAW_JSON)
    end)
    if not ok or type(data) ~= "table" then
      error("PCS.getDecoded: invalid JSON — " .. tostring(data))
    end
    PCS._cache = data
  end
  return PCS._cache
end

--- @param charKey string e.g. "fomorach"
--- @return table|nil
function PCS.getPC(charKey)
  if type(charKey) ~= "string" or charKey == "" then
    return nil
  end
  local rootTbl = PCS.getDecoded()
  local pcs = rootTbl.PCs or rootTbl.pcs
  if type(pcs) ~= "table" then
    return nil
  end
  return pcs[charKey]
end

return PCS
`;

fs.writeFileSync(outPath, header + raw + footer, "utf8");
console.log("Wrote", outPath, "(" + (fs.statSync(outPath).size / 1024).toFixed(1) + " KB)");

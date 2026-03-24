---@diagnostic disable: lowercase-global
--[[
  Copy this entire file into each spotlight object script in TTS / .tts/objects.

  Real implementation: lib/object_spotlight_persist.ttslua (inlined by TTS Tools when you Save & Play).
]]
local P = require("lib.object_spotlight_persist")
function onSave() return P.onSave(self) end
function onLoad(script_state) P.onLoad(self, script_state) end
function apply() P.apply(self) end

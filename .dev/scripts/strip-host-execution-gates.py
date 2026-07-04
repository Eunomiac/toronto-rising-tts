#!/usr/bin/env python3
"""One-off: strip host-execution gates from global_script.ttslua (TOR-284)."""
import re
from pathlib import Path

path = Path("core/global_script.ttslua")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r"\n    if not U\.requireHostForWorldMutation\([^)]+\) then\n        return(?:[^\n]+)?\n    end",
    "",
    text,
)

text = re.sub(
    r"\n        if U\.requireHostForWorldMutation\([^)]+\) then\n            M\.onPlayerChangeColor\(color\)\n        end",
    "\n        M.onPlayerChangeColor(color)",
    text,
)

text = re.sub(
    r"\n    if not U\.isHostClient\(\) then\n        return[^\n]+\n    end",
    "",
    text,
)

join_block = """    if not U.isHostClient() then
        setStartupAction("join-client-ui-bootstrap")
        M.onLoadJoinClient()
        if GameStateOverlay and type(GameStateOverlay.ensureTicker) == "function" then
            GameStateOverlay.ensureTicker()
        end
        Sync.full({ reason = "onLoad_join_client" })
        setStartupAction("join-client-bootstrap-complete")
        print(U.loadElapsedPrefix() .. "Joining client: skipped Host world bootstrap.")
        return
    end

    -- Host client only below: emitters, reconcilers, object moves, setup.
"""
text = text.replace(join_block, "    -- Mod Lua runs on host only; full bootstrap below.\n")

text = re.sub(
    r"local function trEarlySilenceSoundscapeEmitters\(phaseLabel\)\n"
    r"    if not U\.isHostClient\(\) then\n"
    r"        if trEarlySilenceNonHostSkipLogged ~= true then\n"
    r"            trEarlySilenceNonHostSkipLogged = true\n"
    r'            print\(U\.loadElapsedPrefix\(\) \.\. "Join client: skipped soundscape emitter silence \(host-only\)\."\)\n'
    r"        end\n"
    r"        return\n"
    r"    end\n",
    "local function trEarlySilenceSoundscapeEmitters(phaseLabel)\n",
    text,
)

text = re.sub(
    r"local function trScheduleEarlySoundscapeSilenceDeferred\(schedulerLabel\)\n"
    r"    if not U\.isHostClient\(\) then\n"
    r"        return false\n"
    r"    end\n",
    "local function trScheduleEarlySoundscapeSilenceDeferred(schedulerLabel)\n",
    text,
)

text = text.replace(
    'if U.isHostClient() and SS ~= nil and type(SS.bootstrapSilenceStrayEmitterLoops) == "function" then',
    'if SS ~= nil and type(SS.bootstrapSilenceStrayEmitterLoops) == "function" then',
)

text = text.replace("requireStorytellerHostForMutation", "requireStorytellerForMutation")

old_helper = """--- Storyteller XmlUI: steam identity + host machine before state/world mutation.
--- @param player Player|nil
--- @param context string
--- @return boolean
local function requireStorytellerForMutation(player, context)
    if player ~= nil and not isStorytellerSteamPlayer(player) then
        return false
    end
    return U.requireHostForWorldMutation(context)
end"""

new_helper = """--- Storyteller XmlUI: steam identity before ST-only state/world mutation.
--- @param player Player|nil
--- @param context string|nil unused; kept for call-site labels
--- @return boolean
local function requireStorytellerForMutation(player, context)
    if player ~= nil and not isStorytellerSteamPlayer(player) then
        return false
    end
    return true
end"""

text = text.replace(old_helper, new_helper)

text = re.sub(
    r"\n--- Bundle-safe host gate for object scripts \(`Global\.call`\)\.\n"
    r"--- @param params table\|nil `\{ context\?: string \}`\n"
    r"--- @return boolean\n"
    r"function GlobalRequireHostForWorldMutation\(params\)\n"
    r"    local ctx = type\(params\) == \"table\" and params\.context or nil\n"
    r"    return U\.requireHostForWorldMutation\(ctx\) == true\n"
    r"end\n",
    "\n",
    text,
)

text = text.replace(
    "-- Host-only: join clients must not duplicate emitter mutes (see onLoad join branch).",
    "-- Host runs all mod Lua; silence stray emitter loops at chunk load.",
)
text = text.replace(
    "-- Chunk phase: host-only (join clients no-op inside trEarlySilence*); objects often 0/9 until onLoad.",
    "-- Chunk phase: objects often 0/9 until onLoad.",
)

path.write_text(text, encoding="utf-8")
pat = re.compile(
    r"isHostClient|requireHostForWorldMutation|GlobalRequireHostForWorldMutation|"
    r"requireStorytellerHostForMutation|onLoadJoinClient"
)
print(f"global_script remaining matches: {len(pat.findall(text))}")

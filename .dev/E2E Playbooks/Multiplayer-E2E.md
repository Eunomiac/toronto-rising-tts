# Multiplayer E2E checklist (TOR-144)

## Agent Routing

Read this when:
- validating whether a change needs multiclient proof
- looking up coverage / console probes for TOR-144
- updating agent-facing multiplayer verification (not the live friend script)

**Author runbook (run during the friend call):** [Multiclient Session Script](Multiplayer-Session.md) — Phases A–E, P10 scoring, friend briefing, outcomes (**TOR-249**).

**Policy:** [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — P1–P10, solo audits, high-risk paths.

Also: [Phases Overview](../Phases/Phases%20Overview.md), [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md), Dice/Gameboard/Scenes E2E for solo prerequisites.

Verification:
- two real TTS clients via [Multiclient Session Script](Multiplayer-Session.md)
- solo Host regression when the multiclient matrix is not required for the touched behavior

**Prerequisites:** Solo Host suites pass ([Dice-E2E](Dice-E2E.md), [Gameboard-E2E](Gameboard-E2E.md), [Scenes-E2E](Scenes-E2E.md)). **TOR-284**, **TOR-345**, **TOR-143** / **TOR-319** shipped.

Status: agent checklist; step tables live only in Multiclient Session Script (avoid dual scripts).

## Multiclient validation gates

Mechanical sync work is **not fully validated** until [Multiclient Session Script](Multiplayer-Session.md) runs with **two or more connected clients**. Solo Host / hotseat alone is insufficient.

**Pass criteria** (same as the session script): no duplicate world mutations; ST-only steam gates; auto-seat; connect blindfold policy; **P10** stale Lua/HUD with matching world = document, not fail.

## Coverage checklist

Maps scenarios → session step ids. **Do not** treat this as a second runbook — execute [Multiclient Session Script](Multiplayer-Session.md).

| Scenario | Session step | Pass if |
| --- | --- | --- |
| Join mid-session | A1–A3, A5 | Layout/audio match; no orphan bootstrap moves |
| Steam auto-seat (TOR-345) | A1–A2, E2 | Chronicle color (or White); ST stays Black |
| Connect blindfold (TOR-319) | A4 | Up in Intermission; lower otherwise |
| ST Advance → Play | B0 | Single transition; no stacked audio/lights |
| ST Apply / Clear gameboard | B1–B2 | Single stage layout / clear |
| ST token drop | B3 | Token settles once |
| ST scene change | B4 | World matches; HUD lag → document P10 |
| Signal candle | B5 | One light transition |
| ST soundscape mood | B6 | One fade |
| PC roll (join client) | C1–C4 | One die set; drawer once |
| Phase HUD | D1 | Table OK; label lag → document P10 |
| Placements probe | D2 | Figurines match; count mismatch → P10 log |
| PC-only UI | D3 | No ST-only controls exposed |
| Rejoin | E2 | Auto-seat; no bootstrap thrash |

## Console probes (Host — hotseat or multiclient)

On **Host** with two seats occupied (hotseat regression for TOR-284):

```lua
local U = require("lib.util")
print("isStorytellerSteamPlayer(Black)=" .. tostring(U.isStorytellerSteamPlayer("Black")))
print("currentPhase=" .. tostring(S.getStateVal("currentPhase")))
print("playSubPhase=" .. tostring(S.getStateVal("playSubPhase")))
```

**Pass if:** ST actions (phase Advance, scene apply, gameboard Apply, dice spawn) succeed — no silent no-ops.

After ST Apply (session **D2**; optional on join client):

```lua
print("npc placements=" .. tostring(#(U.getKeys(S.getStateVal("sessionScene", "npcWorld", "placements") or {}))))
```

If figurines match and counts differ → `P10 D2: Host=N, Friend=M; world matched` — not a fail.

After friend join (Host):

```lua
for _, p in ipairs(Player.getPlayers()) do
  print(tostring(p.steam_name) .. " -> " .. tostring(p.color))
end
```

**Pass if:** Friend color matches `C.PlayerData` (or White if unregistered).

## Regression (solo Host)

Re-run Gameboard smoke Apply/Clear and one Dice suite step after multiplayer-related changes. Hotseat with **2+ seats** is the minimum when touching ST panels, phases, seat assign, or `Sync.*`. Solo cannot fully prove TOR-345 join-client assign or Intermission connect blindfold on a second machine.

## Related

- [Multiclient Session Script](Multiplayer-Session.md) — author runbook
- [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — P1–P10
- [Phases Overview](../Phases/Phases%20Overview.md)
- [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md)
- **TOR-249** — human gate to run the session

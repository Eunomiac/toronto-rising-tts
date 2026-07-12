# Multiplayer E2E checklist (TOR-144)

## Agent Routing

Read this when:
- validating host/join-client behavior, authority boundaries, replication, or multiplayer-sensitive workflows
- touching `Sync.*`, event listener dispatch, player identity gates, Storyteller-only controls, seat auto-assign, or phase Advance/connect

Source of truth:
- `.dev/Multiplayer Functionality/Preparing For Multiplayer.md` (§1 policies, §2 Phases A–E script)
- `.dev/Phases/Phases Overview.md` (TOR-143 sequence + TOR-319 connect blindfold)
- `.dev/Sychronizing Game Functionality/Event Listener Policy.md`
- relevant Dice/Gameboard/Scenes E2E playbooks for domain-specific flows

Verification:
- two real TTS clients: Host plus at least one join client (**TOR-249** human gate)
- solo Host regression only after the multiclient matrix is not required for the touched behavior

**Prerequisites:** Solo Host suites pass ([Dice-E2E](Dice-E2E.md), [Gameboard-E2E](Gameboard-E2E.md), [Scenes-E2E](Scenes-E2E.md)). Actor-identity gates and sync contracts per [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md), [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md). Host-execution gating removed per **TOR-284**. Seat auto-assign (**TOR-345**) and phase redesign (**TOR-143** / **TOR-319**) shipped — exercise them in this pass.

**Setup:** Two real TTS clients — **Host** (Storyteller machine) + **Join client** (PC). Friend's Steam ID must be in `C.PlayerData` with the intended color. Prefer Host in **Play** (or Advance from Intermission after join). Save & Play from repo on Host; join from invite. Full step tables: Preparing §2.

## Multiclient validation gates (required pass)

Mechanical changes through **TOR-284**, **TOR-345**, **TOR-143**, and prior sync work are **not fully validated** until this playbook runs with **two or more connected clients**. Solo Host / hotseat regression alone is insufficient for replication, auto-seat on a second machine, phase connect blindfold, and HUD-state gaps.

**Pass criteria:**

- Every row in the verification matrix below is exercised with Host + at least one join client (or explicitly deferred with reason).
- No duplicate world mutations (double Apply, stacked audio fades, duplicate dice spawns, double phase enter effects).
- ST-only actions rejected when triggered from a PC seat (`isStorytellerSteamPlayer`).
- Join client auto-seats to chronicle color (or White if unregistered).
- Connect blindfold matches phase policy (Intermission keeps up; other phases lower).
- Document any `gameState` vs HUD mismatch on join client as **P10 known gap** (live state broadcast not yet implemented).

## Verification matrix

| Scenario | Host expected | Join client expected | Pass if |
| --- | --- | --- | --- |
| Join mid-session | Full bootstrap on Host load; `onPlayerConnect` auto-assign | World/objects replicate from Host; join client does **not** run mod Lua; seat changes via Host `changeColor` | Layout/audio match Host view; no orphan moves |
| Steam auto-seat (TOR-345) | `M.tryAutoAssignSeatFromChronicle` on connect; load uses `M.assignAllConnectedSeatsFromChronicle` | Lands on `C.PlayerData[steam].color` without manual pick | Expected PC color (or White if unregistered); ST stays Black |
| Connect blindfold (TOR-319) | Intermission: leave blindfold; else `Phases.lowerBlindfoldForConnectingPlayer` | Blindfold up only in Intermission | Matches phase at join time |
| ST Advance → Play (B0) | `Phases.advanceNext` / enter Play once (lights, theme, blindfolds, optional heal broadcast) | Replicated transition | Single transition; no stacked audio/lights |
| ST Apply gameboard | Tokens → state → figurines move once | Replicated state | Single stage layout; no fight/jitter |
| ST Clear gameboard | Placements cleared once | Replicated clear | Palette/board state matches Host |
| ST token drop (palette/anchor) | Snap/light coroutine once | Replicated token pose | Token settles once |
| ST scene change | `Sync.full` reconcile once; may silent-promote to Play | Scene/light/audio replicate | Join HUD updates or document P10 gap |
| PC roll (join client clicks) | Host spawns/releases dice via `Global.call` | Roll UI on auto-assigned seat; replicated dice | One die set on table; drawer once |
| Signal candle | Light toggles once | Replicated light | Single light transition |
| ST soundscape mood | Audio fade once | Replicated audio | No stacked audio |
| Phase HUD (D1) | Advance or Play subphase switch | Phase / session overlay update | Updates or documented P10 gap |
| Rejoin (E2) | Host stable | Auto-reassign same chronicle color | No duplicate bootstrap world I/O |

## Console probes (Host — hotseat or multiclient)

On **Host** with two seats occupied (hotseat regression for TOR-284):

```lua
local U = require("lib.util")
print("isStorytellerSteamPlayer(Black)=" .. tostring(U.isStorytellerSteamPlayer("Black")))
print("currentPhase=" .. tostring(S.getStateVal("currentPhase")))
print("playSubPhase=" .. tostring(S.getStateVal("playSubPhase")))
```

**Pass if:** ST actions (phase Advance, scene apply, gameboard Apply, dice spawn) succeed — no silent no-ops.

On **Host** after ST Apply:

```lua
print("npc placements=" .. tostring(#(U.getKeys(S.getStateVal("sessionScene", "npcWorld", "placements") or {}))))
```

Join client should read the same count only after save/reload until live state broadcast exists — document mismatch as known gap if observed.

After friend join (Host):

```lua
for _, p in ipairs(Player.getPlayers()) do
  print(tostring(p.steam_name) .. " -> " .. tostring(p.color))
end
```

**Pass if:** Friend color matches chronicle `C.PlayerData` entry (or White if unregistered).

## Regression (solo Host)

Re-run Gameboard smoke Apply/Clear and one Dice suite step after multiplayer-related changes. Hotseat with **2+ seats** is the minimum regression when touching ST panels, phases, seat assign, or `Sync.*`. Solo cannot fully prove TOR-345 join-client assign or Intermission connect blindfold on a second machine.

## Related

- [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — P1–P10, §2 Phases A–E script, seat + phase notes
- [Phases Overview](../Phases/Phases%20Overview.md) — Intermission→Play→Spotlight→End
- [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) — `onPlayerConnect`, phase HUD handlers
- TOR-284 execution-model remediation — hotseat console probe + corrected policies
- TOR-249 — human gate to run this pass with a friend

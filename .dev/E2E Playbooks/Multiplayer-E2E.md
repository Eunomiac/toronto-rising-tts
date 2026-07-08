# Multiplayer E2E checklist (TOR-144)

**Prerequisites:** Solo Host suites pass ([Dice-E2E](Dice-E2E.md), [Gameboard-E2E](Gameboard-E2E.md), [Scenes-E2E](Scenes-E2E.md)). Actor-identity gates and sync contracts per [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md), [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md). Host-execution gating removed per **TOR-284** (2026-07-04).

**Setup:** Two real TTS clients — **Host** (Storyteller machine) + **Join client** (PC). Save & Play from repo on Host; join from invite.

## Multiclient validation gates (required pass)

Mechanical changes through **TOR-284** and prior sync work are **not fully validated** until this playbook runs with **two or more connected clients**. Solo Host / hotseat regression alone is insufficient for replication and HUD-state gaps.

**Pass criteria:**

- Every row in the verification matrix below is exercised with Host + at least one join client.
- No duplicate world mutations (double Apply, stacked audio fades, duplicate dice spawns).
- ST-only actions rejected when triggered from a PC seat (`isStorytellerSteamPlayer`).
- Document any `gameState` vs HUD mismatch on join client as **P10 known gap** (live state broadcast not yet implemented).

## Verification matrix

| Scenario | Host expected | Join client expected | Pass if |
| --- | --- | --- | --- |
| Join mid-session | Full bootstrap on Host load | World/objects replicate from Host; join client does **not** run mod Lua | Layout/audio match Host view; no orphan moves |
| ST Apply gameboard | Tokens → state → figurines move once | Replicated state | Single stage layout; no fight/jitter |
| ST Clear gameboard | Placements cleared once | Replicated clear | Palette/board state matches Host |
| ST token drop (palette/anchor) | Snap/light coroutine once | Replicated token pose | Token settles once |
| ST scene change | `Sync.full` reconcile once | Scene/light/audio replicate | Join HUD updates or document P10 gap |
| PC roll (join client clicks) | Host spawns/releases dice via `Global.call` | Roll UI; replicated dice | One die set on table; drawer once |
| Signal candle | Light toggles once | Replicated light | Single light transition |
| ST soundscape mood | Audio fade once | Replicated audio | No stacked audio |

## Console probes (Host — hotseat or multiclient)

On **Host** with two seats occupied (hotseat regression for TOR-284):

```lua
local U = require("lib.util")
print("isStorytellerSteamPlayer(Black)=" .. tostring(U.isStorytellerSteamPlayer("Black")))
```

**Pass if:** ST actions (scene apply, gameboard Apply, dice spawn) succeed — no silent no-ops.

On **Host** after ST Apply:

```lua
print("npc placements=" .. tostring(#(U.getKeys(S.getStateVal("sessionScene", "npcWorld", "placements") or {}))))
```

Join client should read the same count only after save/reload until live state broadcast exists — document mismatch as known gap if observed.

## Regression (solo Host)

Re-run Gameboard smoke Apply/Clear and one Dice suite step after multiplayer-related changes. Hotseat with **2+ seats** is the minimum regression when touching ST panels or `Sync.*`.

## Related

- [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — P1–P10, tiers A/B/C, actor identity
- [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) — handler inventory
- [Execution Model Correction — Remediation Plan](../Multiplayer%20Functionality/Execution%20Model%20Correction%20%E2%80%94%20Remediation%20Plan.md) — TOR-284

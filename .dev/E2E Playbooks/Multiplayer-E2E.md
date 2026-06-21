# Multiplayer E2E checklist (TOR-144)

**Prerequisites:** Solo Host suites pass ([Dice-E2E](Dice-E2E.md), [Gameboard-E2E](Gameboard-E2E.md), [Scenes-E2E](Scenes-E2E.md)). Host authority guards shipped (see [Bootstrap Authority](../Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md), [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md)).

**Setup:** Two real TTS clients — **Host** (Storyteller machine) + **Join client** (PC). Save & Play from repo on Host; join from invite.

## Host authority gates (required multi-client pass)

Mechanical host guards shipped in commit `34215a5` (extends TOR-221 bootstrap audit) are **not validated** until this playbook runs with **two or more connected clients**. Solo Host regression alone is insufficient.

**Pass criteria for the gate:**

- Every row in the verification matrix below is exercised with Host + at least one join client.
- Join client console shows `U.isHostClient() == false` while connected.
- No scenario produces duplicate world mutations (double Apply, stacked audio fades, duplicate dice spawns, join-client figurine moves on load).
- Document any `gameState` vs world mismatch on join client as a known gap (live state broadcast not yet implemented).

Do not treat host authority work as fully closed until this section passes.

## Verification matrix

| Scenario | Host expected | Join client expected | Pass if |
| --- | --- | --- | --- |
| Join mid-session | Full bootstrap on prior Host load | `onLoad` join branch: UI-only, console shows "Joining client: skipped Host world bootstrap." | No figurine/light moves on join load |
| ST Apply gameboard | Tokens → state → figurines move once | No duplicate reconcile; objects replicate from Host | Single stage layout; no fight/jitter |
| ST Clear gameboard | Placements cleared once | Early return on fan-out paths | Palette/board state matches Host |
| ST token drop (palette/anchor) | Snap/light coroutine once | `onObjectDrop` host guard no-op | Token settles once; no lag spike on join |
| ST scene change | `Sync.full` reconcile once | `Sync.ui` delta only | Scene/light/audio match; join HUD updates |
| PC roll (join client clicks) | Host spawns/releases dice via `Global.call` | Roll UI local; no duplicate spawns | One die set on table; drawer once |
| Signal candle | Light toggles once | `GlobalToggleSignalFireState` no-op on join | Single light transition |
| ST soundscape mood | Audio fade once | No second fade from join | No stacked audio |

## Console probes (Join client)

Paste on **join client** Global (`~`):

```lua
print("isHostClient=" .. tostring(U.isHostClient()))
```

**Pass if:** `false` when a second human is connected and Host is identifiable.

On **Host** after ST Apply:

```lua
print("npc placements=" .. tostring(#(U.getKeys(S.getStateVal("sessionScene", "npcWorld", "placements") or {}))))
```

Join client should read the same count only after save/reload until live state broadcast exists — document mismatch as known gap if observed.

## Regression (solo Host)

Re-run Gameboard smoke Apply/Clear and one Dice suite step after any host-authority change — solo must remain unchanged (`U.isHostClient()` true when alone).

## Related

- [Bootstrap Authority](../Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md) — tiers A/B/C, fan-out vs clicker
- [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) — Host Authority Inventory

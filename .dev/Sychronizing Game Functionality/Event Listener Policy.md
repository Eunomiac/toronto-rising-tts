# Event Listener Policy (TTS)

**Linear:** TOR-197 (event listener early-return audit + policy)
**Related:** [Performance Audit](Performance%20Audit.md), [Reconciler Contract](Reconciler%20Contract.md), TOR-201 (Clear / token-drop lag)

TTS invokes Global and object event handlers on **every** matching world event. Handlers that run heavy logic (module `require`, state scans, reconcile, coroutine polls) on unrelated objects cause session lag — especially `onObjectDrop` during NPC control-board editing.

## Rule: one cheap guard before any work

Every high-frequency handler must be able to **reject unrelated events in one O(1) step** (typical: tag, GUID, object type, or a single `hasTag` / `getGUID` compare) before:

- `require()` of heavy modules
- Iterating `gameState` or NPC instance tables
- Starting `U.waitForCondition` / coroutines
- Calling `Sync.*` or domain reconcilers

If the guard fails, **return immediately** — no logging in the hot path unless `DEBUG` gated.

## Global handlers (inventory)

| Handler | File | Frequency | Guard status | Notes |
| --- | --- | --- | --- | --- |
| `onObjectDrop` | `core/global_script.ttslua` | **Very high** | **Fixed 2026-06-06** — figurine path gated on `npc_figurine` tag; token path gated on `npc_control_token` | Was calling `NPCS.onObjectDropped` on every drop |
| `onObjectPickUp` | `core/global_script.ttslua` | High | OK — tag gate before `Gameboard` | Only `npc_control_token` |
| `onObjectEnterZone` | `core/zones.ttslua` via Global | Medium | OK — `zones.allLocked` then (future) zone type | Stub; minimal work today |
| `onObjectLeaveZone` | `core/zones.ttslua` via Global | Medium | OK — same as enter | Stub |
| `onObjectRandomize` | `core/global_script.ttslua` | High (rolls) | OK — die tag + numeric value + owner color | Roll FSM only |
| `onObjectLeaveContainer` | `core/global_script.ttslua` | Medium | OK — die tag + owner + active roll | Dice pool assembly |

## Module handlers (called from Global)

| Entry | Module | Guard | Notes |
| --- | --- | --- | --- |
| `NPCS.onObjectDropped` | `core/npcs.ttslua` | **Fixed 2026-06-06** — `isPooledFigurineObject` before resolve | Avoids O(n) instance scan for non-figurines |
| `Gameboard.onNpcControlTokenDropped` | `core/npc_gameboard.ttslua` | OK — `isNpcControlToken` + palette/anchor flags | `waitForCondition` only when flags set |
| `Gameboard.onNpcControlTokenPickUp` | `core/npc_gameboard.ttslua` | OK — token tag | Sets palette/anchor eligibility flags |

## Object-script handlers

Per-object scripts (`objects/*.ttslua`, `ui/ui_*.ttslua`) run in **isolated chunks** — guards must be local to that object (bag color/kind tags, candle color, etc.). Prefer tag/GUID checks at the top of `click_*` handlers before `Global.call`.

| Script | Events | Guard pattern |
| --- | --- | --- |
| `objects/dice_bag.ttslua` | `click_roll`, spawn | `getDieType()` / `getBagColor()` from tags |
| `objects/npc_control_board.ttslua` | `click_apply`, `click_clear` | Host color `Black` only |
| `objects/npc_control_board_palette.ttslua` | onLoad | One-time install |
| `ui/ui_signal_candle.ttslua` | click | Object GUID / color from name |
| `ui/ui_tarot_button.ttslua` | click | Pink tarot GUID |

## Forbidden patterns

1. **Unconditional Global fan-out** — e.g. calling `NPCS.*` or `Sync.full` from `onObjectDrop` without tag/type guard.
2. **`require()` inside hot handlers** without guard — cache module locals at chunk load when the handler lives in Global; object scripts may `require` at top of file only.
3. **Full table scans** (`pairs(getInstances())`, all snap catalog rebuilds) on every drop — use tag/GUID fast path first; cache indexes when scans are unavoidable.
4. **Synchronous reconcile on drop** — drops may schedule work; Apply/Clear owns bulk reconcile via `Sync.npcs`.
5. **Unbounded `waitForCondition`** on common drops — only when eligibility flags were set on pick-up (see Gameboard token path).

## Required pattern (Global drop example)

```lua
function onObjectDrop(playerColor, object)
    if object == nil or object.hasTag == nil then
        return
    end
    if object.hasTag("npc_figurine") == true and NPCS and NPCS.onObjectDropped then
        NPCS.onObjectDropped(object)
    end
    if object.hasTag("npc_control_token") == true then
        local Gameboard = require("core.npc_gameboard")
        if Gameboard.onNpcControlTokenDropped then
            Gameboard.onNpcControlTokenDropped(object, playerColor)
        end
    end
end
```

## Adding a new listener

1. Prefer **object script** or **zone** scope so Global is not invoked for unrelated objects.
2. Document the handler in this file (table above).
3. Implement **guard first**, handler body second — PR review checks guard line count ≤ 3 before any `require` / loop / sync.
4. If the handler mutates world state, follow [Reconciler Contract](Reconciler%20Contract.md): mutate state, then narrow sync — never hide reconcile in a drop handler unless explicitly spec'd (Gameboard pick-up flags are ephemeral runtime context, not `gameState`).

## Audit follow-ups (TOR-197 / TOR-201)

- [ ] Zone handlers: add zone GUID/type guard before any future card/scene logic (`core/zones.ttslua`).
- [ ] `resolveNpcNameFromFigurine`: optional `figurineGuid → npcName` cache to avoid instance scan on GMNotes miss.
- [ ] `Sync.full` / `Sync.npcs` call-site pass — see TOR-168, Performance Audit rank 1.
- [ ] Agent review Prompt 2 — dual-apply on drop paths (TOR-102).

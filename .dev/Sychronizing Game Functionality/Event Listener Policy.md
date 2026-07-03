# Event Listener Policy (TTS)

**Linear:** TOR-197 (event listener early-return audit + policy)
**Related:** [Bootstrap Authority](Bootstrap%20Authority.md) (TOR-221 load/bootstrap guards), [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) §1 (P1–P10), [Performance Audit](Performance%20Audit.md), [Reconciler Contract](Reconciler%20Contract.md), TOR-201 (Clear / token-drop lag)

> **Agents:** Any new or changed handler listed below (or added to the codebase) must be registered here with **delivery** (fan-out vs clicker) and **tier** (A/B/C). Until **TOR-144 (multiplayer E2E)** passes, apply [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc) on every edit.

TTS invokes Global and object event handlers on **every** matching world event. Handlers that run heavy logic (module `require`, state scans, reconcile, coroutine polls) on unrelated objects cause session lag — especially `onObjectDrop` during NPC control-board editing.

## Rule: one cheap guard before any work

Every high-frequency handler must be able to **reject unrelated events in one O(1) step** (typical: player color for Storyteller-only paths, tag, GUID, object type, or a single `hasTag` / `getGUID` compare) before:

- `require()` of heavy modules
- Iterating `gameState` or NPC instance tables
- Starting `U.waitForCondition` / coroutines
- Calling `Sync.*` or domain reconcilers

If the guard fails, **return immediately** — no logging in the hot path unless `DEBUG` gated.

**GM vs Host client:** Storyteller **interaction** gates use **`U.isStorytellerSteamPlayer(playerRef)`**. **World / reconcile** gates use **`U.requireHostForWorldMutation(context)`** (alias: **`U.isHostClient()`**). See [Bootstrap Authority](Bootstrap%20Authority.md) for tiers A/B/C and fan-out vs clicker delivery.

## Host Authority Inventory (TOR-144 audit)

Columns: **Delivery** = fan-out (all clients) vs clicker-only. **Tier** = A UI / B state / C world. **Phase** = fix phase from host-authority plan.

### TTS built-in Global handlers

| Handler | File | Delivery | Tier | Guards | World I/O | Risk | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `onLoad` | `global_script` | All | B+C | Host branch L1345 | bootstrap | Low | Done |
| `onSave` | `global_script` | Save | B | Host sanitize | lights state | Med | 4 |
| `onObjectPickUp` | `global_script` | Fan-out | C | Steam + host | Gameboard flags | High | 4 |
| `onObjectDrop` | `global_script` | Fan-out | C | Steam + host | Gameboard/NPCS | High | 4 |
| `onObjectRandomize` | `global_script` | Fan-out | B | d10 tag | roll FSM | High | 4 split |
| `onObjectLeaveContainer` | `global_script` | Fan-out | B | d10 tag | GM Notes | Med | 4 |
| `onPlayerConnect` | `global_script` | Fan-out | B | Host | seat assign | Med | 4 |
| `onPlayerChangeColor` | `global_script` | Fan-out | B | Host | state row | Med | 4 |
| `addHotkey` (`Spotlight NPC (hold)`) | `global_script` | Clicker (per player) | C | ST steam + host in callee | transient spotlights | Low | — |

### `Global.call` targets (mutating → host guard)

| Function | Tier | Phase | Notes |
| --- | --- | --- | --- |
| `GlobalGameboardApply/Clear/ClearClick/Save/Load/ToggleLayoutLock/ToggleControlBoardSnaps/TokenDroppedOnDiceBag/StageLerpOrchestrator` | C | 5 | Gameboard; Save is state-only (B) but host-guarded |
| `GlobalGameboardInstallPaletteSnaps` | C | Done | already guarded |
| `GlobalGameboardSyncSnapsToggleLabel` | A | — | snaps + layout-lock toolbar labels |
| `GlobalToggleSignalFireState` | C | 5 | signal lights |
| `GlobalApplyTarotState` | C | — | Pink tarot drawer/deck/button poses (TOR-144 W2) |
| `GlobalDiceBagClick/RightClick/StorytellerDiceBagClick` | B+C | 5 | rolls |
| `GlobalSpawn*` / `GlobalDestroy*` / `GlobalRelease*` / `GlobalTagDie*` / `GlobalOnBagDie*` | C | 5 | dice |
| `GlobalInitiateRoll` / `GlobalRollSpawnDieRequest` / `GlobalAdjustStorytellerPoolKind` | B+C | 5 | rolls |
| `GlobalRollSeatCamera` | A | — | per-seat camera |
| `GlobalIsStorytellerSteamPlayer` / `GlobalRequireHostForWorldMutation` | — | 2 | bundle-safe gates |
| `GlobalPostRollModifyPool` / `GlobalPostRollAddDie` / `GlobalPostRollRemoveDie` | B+C | W4 | ST post-roll pool |
| `GlobalStRerollDiceByGuids` | B+C | W4 | ST roll panel selective dice reroll (TOR-224) |
| `GlobalGetRollPhase`, `GlobalResolveSheetPlayerID`, `GlobalGetMergedPlayerData`, `GlobalGetSeatLayoutCenterPoint`, `GlobalIsPlayerDiceBagEnabled`, `GlobalCollectSheetImageUpdates` | A | — | read-only |

### Sync orchestrator

| API | Host guard | Non-host behavior |
| --- | --- | --- |
| `Sync.full` | Yes | UI delta only |
| `Sync.npcs` / `Sync.lighting` | Yes | no-op |
| `Sync.soundscape` / `Sync.lightRef` / `Sync.npcCutouts` | Yes | no-op |
| `Sync.player` | Split | lights host-only; UI all clients |
| `Sync.ui` | No | all clients |

### Object scripts

| Script | Delivery | Guards | Phase |
| --- | --- | --- | --- |
| `npc_control_board.ttslua` | clicker → Global.call fan-out | Steam via Global | 6 |
| `npc_control_board_palette.ttslua` | onLoad fan-out | Host install | Done |
| `dice_bag.ttslua` | clicker + onLoad fan-out | Host spawn via Global; onLoad destroy host-gated | W2 |
| `ui_signal_candle.ttslua` | clicker → Global.call | Host in Global | 5 |
| `ui_tarot_button.ttslua` | clicker → `GlobalApplyTarotState` | Host in Global | W2 |
| `ui_csheet_core.ttslua` | clicker → Global.call; onLoad layout | Host on mutators + alignment onLoad | W4 |

### HUD handlers (summary)

| Group | Examples | Tier | ST+host gate | TOR-144 |
| --- | --- | --- | --- | --- |
| UI-only | `HUD_togglePanel`, `HUD_selectStorytellerPanel`, modals, `HUD_show`/`hide`, roll opts open/cancel | A | — | — |
| ST state+world | `HUD_changeScene`, soundscape, scenes apply, `HUD_resetGame`, `HUD_syncAll`, `HUD_pcPanel` | B+C | Yes | D |
| Roll | `HUD_roll*` | B (+ `Global.call` for C) | Partial (P6) | C |
| Debug world | `HUD_debugLightActivate/Enabled/ResetRow/Slider`, `HUD_toggleAllAnchors/Spotlights` | C | Yes | — |
| Debug read/UI | `HUD_debugLightGuidInput`, `HUD_debugLightDone/Snapshot`, camera capture | A/B | No | — |

**TOR-144 column:** multiclient verification target from [Preparing §2](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — blank until friend session passes.

Full handler list: `grep '^function HUD_' core/global_script.ttslua`.

### HUD handlers (appendix — mechanical audit 2026-06-25)

| Handler | Tier | ST+host | Notes |
| --- | --- | --- | --- |
| `HUD_selectStorytellerPanel` | A | — | panel visibility |
| `HUD_pcPanel` | B+C | Yes | PCs tracker apply |
| `HUD_togglePanel` | A | — | XmlUI collapse |
| `HUD_changeScene` | B+C | Yes | |
| `HUD_selectAdminLightingScene` | B+C | Yes | |
| `HUD_soundscape*` (mutators) | B+C | Yes | inspect read-only |
| `HUD_scenesPanel` / apply / lib / ctor / clock | B+C | Yes | modal opens Tier A |
| `HUD_statsTarget` / `HUD_statsBack` | A | — | Stats panel navigation |
| `HUD_statsAdd` / `HUD_statsEdit` / `HUD_statsEditRating` / `HUD_statsEditorConfirm` / `HUD_statsEditorDelete` | B+C | Yes | advantage mutations |
| `HUD_statsEditorField` / `HUD_statsEditorCancel` | A | — | draft stash / close |
| `HUD_advancePhase` | B | Yes | |
| `HUD_resetGame` / `HUD_syncAll` | B+C | Yes | |
| `HUD_saveState` / `HUD_logState` / `HUD_printState` | A/B | — | encode/log |
| `HUD_toggleAllAnchors` / `HUD_toggleAllSpotlights` | C | Yes | |
| `HUD_debugLightActivate/Enabled/ResetRow/Slider` | C | Yes | |
| `HUD_debugLightGuidInput/Done/Snapshot` | A | — | |
| `HUD_debugCamera*` / `HUD_debugCaptureCameraPreset` | A | — | local camera |
| `HUD_rollInitiate/RollButton/Confirm/Cancel/…` | B (+C via Global) | Partial | P6 intentional |
| `HUD_rollStDieClick` | B | — | ST selective reroll toggle (`RC.toggleStSelectiveDie`) |
| `HUD_rollStRerollSelected` | B+C | — | → `GlobalStRerollDiceByGuids` (host Tier C) |
| `HUD_postRollCellMouseUp` | B+C | Yes | → `GlobalPostRollModifyPool` |
| `HUD_debugRollTest/CancelAll` | B+C | Yes | |
| `HUD_gridStrip*` / `HUD_postRollCellMouseEnter/Exit/Down` | A | — | hover UI |

## Global handlers (inventory)

| Handler | File | Frequency | Guard status | Notes |
| --- | --- | --- | --- | --- |
| `onObjectDrop` | `core/global_script.ttslua` | **Very high** | **Pass** | Steam + `requireHostForWorldMutation`; tag gates |
| `onObjectPickUp` | `core/global_script.ttslua` | High | **Pass** | Steam + host; `npc_control_token` tag |
| `onObjectRandomize` | `core/global_script.ttslua` | High (rolls) | **Pass** | `hasTag("d10")` before `getTags` / roll FSM |
| `onObjectLeaveContainer` | `core/global_script.ttslua` | Medium | **Pass** | `hasTag("d10")` before bag-spawn path |
| `addHotkey` → `Spotlight NPC (hold)` | `core/global_script.ttslua` | Low (ST hold) | **Pass** | `isStorytellerSteamPlayer` before `require`; host world I/O in `Gameboard.onControlBoardSpotlightHotkey` |

## Module handlers (called from Global)

| Entry | Module | Guard | Notes |
| --- | --- | --- | --- |
| `NPCS.onObjectDropped` | `core/npcs.ttslua` | **Pass** | Global `npc_figurine` tag only (seated figurines use seat `*Object` tag, not drop path) |
| `NPCS.isPooledFigurineObject` | `core/npcs.ttslua` | **Pass** | `npc_figurine` **or** seat `*Object` tag + `Figurine_Custom` + (`npcInstance:` GM Notes **or** instance `figurineGuid` registry when seated) |
| `NPCS.resolveNpcNameFromFigurine` | `core/npcs.ttslua` | **Pass** | GM Notes, then O(1) `figurineGuidToNpcName` cache (rebuilt on bulk instance replace) |
| `Gameboard.onNpcControlTokenDropped` | `core/npc_gameboard.ttslua` | **Pass** | `isNpcControlToken` + palette/anchor flags before `waitForCondition` |
| `Gameboard.tryNpcControlTokenDroppedOnStorytellerDiceBag` | `core/npc_gameboard.ttslua` | **Pass** | Host/Black + `dieKindNearStorytellerDiceBag` before restore/roll |
| `Gameboard.tryPcControlTokenDroppedOnStorytellerDiceBag` | `core/npc_gameboard.ttslua` | **Pass** | `isPcControlToken` + Host/Black + `dieKindNearStorytellerDiceBag` before restore; Normal/Hunger → returns `rollColor` |
| `GlobalGameboardTokenDroppedOnDiceBag` / `GlobalGameboardPcTokenDroppedOnDiceBag` | `core/global_script.ttslua` | **Pass** | tag + steam-ST + `requireHostForWorldMutation` before `require("core.npc_gameboard")`; PC wrapper owns `RC.initiateRoll` |
| `Gameboard.onNpcControlTokenPickUp` | `core/npc_gameboard.ttslua` | **Pass** | `isNpcControlToken` |
| `Gameboard.onControlBoardSpotlightHotkey` | `core/npc_gameboard.ttslua` | **Pass** | ST steam in Global hotkey callback; `U.requireHostForWorldMutation` on key-down; transient lights via `L.applyTransientLightMode` (no `gameState` spotlight writes) |

## Object-script handlers

Per-object scripts (`objects/*.ttslua`, `ui/ui_*.ttslua`) run in **isolated chunks** — guards must be local to that object (bag color/kind tags, candle color, etc.). Prefer tag/GUID checks at the top of `click_*` handlers before `Global.call`.

| Script | Events | Guard pattern |
| --- | --- | --- |
| `objects/dice_bag.ttslua` | `click_roll`, spawn, onLoad | tags; host gate on spawn + onLoad destroy |
| `objects/npc_control_board.ttslua` | `click_apply`, `click_clear` | Steam via `GlobalIsStorytellerSteamPlayer`; host via Global mutators |
| `objects/npc_control_board_palette.ttslua` | onLoad | One-time install |
| `ui/ui_signal_candle.ttslua` | click | Object GUID / color from name |
| `ui/ui_tarot_button.ttslua` | click | Pink/Black → `GlobalApplyTarotState` |
| `ui/ui_csheet_core.ttslua` | click, onLoad | Global mutators; layout onLoad host-gated |

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
    if not U.isStorytellerSteamPlayer(playerColor) then
        return
    end
    if not U.requireHostForWorldMutation("onObjectDrop") then
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

1. Prefer **object script** scope so Global is not invoked for unrelated objects.
2. Document the handler in this file (table above).
3. Implement **guard first**, handler body second — PR review checks guard line count ≤ 3 before any `require` / loop / sync.
4. If the handler mutates world state, follow [Reconciler Contract](Reconciler%20Contract.md): mutate state, then narrow sync — never hide reconcile in a drop handler unless explicitly spec'd (Gameboard pick-up flags are ephemeral runtime context, not `gameState`).

## Follow-ups (outside TOR-197 scope)

- [x] TOR-221 — Bootstrap Authority doc + `U.isHostClient` / join-client `onLoad` branch + `Sync.full|npcs|lighting` non-Host guards
- [x] Host authority audit — inventory + `U.requireHostForWorldMutation` + fan-out / Global.call / Sync.player split (TOR-144 prep)
- [ ] `Sync.full` / `Sync.npcs` call-site pass — see TOR-168, Performance Audit rank 1.
- [ ] Agent review Prompt 2 — dual-apply on drop paths (TOR-102).

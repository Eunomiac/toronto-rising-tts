# Event Listener Policy (TTS)

## Agent Routing

Read this when:
- adding or changing a TTS event handler, `HUD_*` handler, object click, or `Global.call` mutator
- reviewing hot-path guards for drops, randomize events, or object callbacks

Source of truth:
- `core/global_script.ttslua`
- `objects/`
- `ui/ui_*.ttslua`
- `.dev/Multiplayer Functionality/Preparing For Multiplayer.md`

Verification:
- `npm run build`
- relevant TTS smoke or multiplayer playbook when event behavior changes

Status: current event-handler inventory and policy; update when handlers are added or changed.

**Linear:** TOR-197 (event listener early-return audit + policy)
**Related:** [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) §1 (P1–P10), [Execution Model Correction — Remediation Plan](../Multiplayer%20Functionality/Execution%20Model%20Correction%20%E2%80%94%20Remediation%20Plan.md), [Performance Audit](Performance%20Audit.md), [Reconciler Contract](Reconciler%20Contract.md), TOR-201 (Clear / token-drop lag)

> **Agents:** Any new or changed handler listed below (or added to the codebase) must be registered here with **delivery** (host-executed event vs clicker) and **tier** (A/B/C). Until **TOR-144 (multiplayer E2E)** passes, apply [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc) on every edit.

**Execution model:** TTS runs all mod Lua on the host only. Clients transmit interactions; host handlers execute once. Handlers that run heavy logic (module `require`, state scans, reconcile, coroutine polls) on unrelated objects cause session lag — especially `onObjectDrop` during NPC control-board editing.

## Rule: one cheap guard before any work

Every high-frequency handler must be able to **reject unrelated events in one O(1) step** (typical: player color for Storyteller-only paths, tag, GUID, object type, or a single `hasTag` / `getGUID` compare) before:

- `require()` of heavy modules
- Iterating `gameState` or NPC instance tables
- Starting `U.waitForCondition` / coroutines
- Calling `Sync.*` or domain reconcilers

If the guard fails, **return immediately** — no logging in the hot path unless `DEBUG` gated.

**Actor identity:** Storyteller **interaction** gates use **`U.isStorytellerSteamPlayer(playerRef)`** on the event's player param. See [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) for tiers A/B/C and delivery types.

## Host Authority Inventory (TOR-144 audit)

Columns: **Delivery** = host-executed event vs clicker-only. **Tier** = A UI / B state / C world. **Phase** = fix phase from sync audit.

### TTS built-in Global handlers

| Handler | File | Delivery | Tier | Guards | World I/O | Risk | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `onLoad` | `global_script` | Host | B+C | — | bootstrap | Low | Done |
| `onSave` | `global_script` | Save | B | — | lights state | Med | 4 |
| `onObjectPickUp` | `global_script` | Host | C | Steam + tag | Gameboard flags | High | 4 |
| `onObjectDrop` | `global_script` | Host | C | Steam + tag | Gameboard/NPCS | High | 4 |
| `onObjectRandomize` | `global_script` | Host | B+C | d10 tag | roll FSM + lights | High | 4 |
| `onObjectLeaveContainer` | `global_script` | Host | B | d10 tag | GM Notes | Med | 4 |
| `onPlayerConnect` | `global_script` | Host | B | — | seat assign | Med | 4 |
| `onPlayerChangeColor` | `global_script` | Host | B | UI refresh (`UI.setXml` + `UpdateUIDisplays`) on PC/Black seat | state row | Med | 4 |
| `addHotkey` (`Spotlight NPC (hold)`) | `global_script` | Clicker (per player) | C | ST steam in callee | transient spotlights | Low | — |

### `Global.call` targets (mutating)

| Function | Tier | Phase | Notes |
| --- | --- | --- | --- |
| `GlobalGameboardApply/Clear/ClearClick/Save/Load/ToggleLayoutLock/ToggleControlBoardSnaps/TokenDroppedOnDiceBag/StageLerpOrchestrator` | C | 5 | Gameboard; Save is state-only (B) |
| `GlobalGameboardInstallPaletteSnaps` | C | Done | palette snap install |
| `GlobalGameboardSyncSnapsToggleLabel` | A | — | snaps + layout-lock toolbar labels |
| `GlobalToggleSignalFireState` | C | 5 | signal lights |
| `GlobalApplyTarotState` | C | — | Pink tarot drawer/deck/button poses (TOR-144 W2) |
| `GlobalDiceBagClick/RightClick/StorytellerDiceBagClick` | B+C | 5 | rolls |
| `GlobalSpawn*` / `GlobalDestroy*` / `GlobalRelease*` / `GlobalTagDie*` / `GlobalOnBagDie*` | C | 5 | dice |
| `GlobalInitiateRoll` / `GlobalRollSpawnDieRequest` / `GlobalAdjustStorytellerPoolKind` | B+C | 5 | rolls |
| `GlobalRollSeatCamera` | A | — | per-seat camera |
| `GlobalIsStorytellerSteamPlayer` | — | 2 | bundle-safe actor-identity gate |
| `GlobalPostRollModifyPool` / `GlobalPostRollAddDie` / `GlobalPostRollRemoveDie` | B+C | W4 | ST post-roll pool |
| `GlobalStRerollDiceByGuids` | B+C | W4 | ST roll panel selective dice reroll (TOR-224) |
| `GlobalApplySecretRollDiceInvisibility` | C | W4 | Secret ST roll — hide dice from PCs (`setInvisibleTo`) |
| `GlobalRestoreSecretRollDiceVisibility` | C | W4 | Slot clear / cancel — restore dice visibility |
| `GlobalGetRollPhase`, `GlobalResolveSheetPlayerID`, `GlobalGetMergedPlayerData`, `GlobalGetSeatLayoutCenterPoint`, `GlobalIsPlayerDiceBagEnabled`, `GlobalCollectSheetImageUpdates` | A | — | read-only |

### Sync orchestrator

| API | Behavior |
| --- | --- |
| `Sync.full` | Full reconcile (state → world) |
| `Sync.npcs` / `Sync.lighting` | Domain reconcilers |
| `Sync.soundscape` / `Sync.lightRef` / `Sync.npcCutouts` | Domain reconcilers |
| `Sync.player` | Per-player: lights + HUD/overlays |
| `Sync.ui` | UI-only refresh |

### Object scripts

| Script | Delivery | Guards | Phase |
| --- | --- | --- | --- |
| `npc_control_board.ttslua` | clicker → Global.call | Steam via Global | 6 |
| `npc_control_board_palette.ttslua` | onLoad | Global install | Done |
| `dice_bag.ttslua` | clicker + onLoad | Spawn via Global.call | W2 |
| `ui_signal_candle.ttslua` | clicker → Global.call | Global callee | 5 |
| `ui_tarot_button.ttslua` | clicker → `GlobalApplyTarotState` | Global callee | W2 |
| `ui_csheet_core.ttslua` | clicker → Global.call; onLoad layout | Global mutators | W4 |

### HUD handlers (summary)

| Group | Examples | Tier | ST steam gate | TOR-144 |
| --- | --- | --- | --- | --- |
| UI-only | `HUD_togglePanel`, `HUD_selectStorytellerPanel`, modals, `HUD_show`/`hide`, roll opts open/cancel | A | — | — |
| ST state+world | `HUD_changeScene`, soundscape, scenes apply, `HUD_resetGame`, `HUD_syncAll`, `HUD_pcPanel` | B+C | Yes | D |
| Roll | `HUD_roll*` | B (+ `Global.call` for C) | Partial | C |
| Debug world | `HUD_debugLightActivate/Enabled/ResetRow/Slider`, `HUD_toggleAllAnchors/Spotlights` | C | Yes | — |
| Debug read/UI | `HUD_debugLightGuidInput`, `HUD_debugLightDone/Snapshot`, camera capture | A/B | No | — |

**TOR-144 column:** multiclient verification target from [Preparing §2](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — blank until friend session passes.

Full handler list: `grep '^function HUD_' core/global_script.ttslua`.

### HUD handlers (appendix — mechanical audit 2026-06-25)

| Handler | Tier | ST steam | Notes |
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
| `HUD_rollInitiate/RollButton/Confirm/Cancel/…` | B (+C via Global) | Partial | |
| `HUD_rollBroadcast` | B | — | ST dashboard slot **B** → `RC.broadcastHeldResult` (manual secret-roll reveal) |
| `HUD_rollRollButton/Confirm/TakeHalf` (Black, value `-2`) | B | — | Sets `active.meta.secretDice` / `suppressBroadcast` on ST roll panel only |
| `HUD_rollStDieClick` | B | — | ST selective reroll toggle (`RC.toggleStSelectiveDie`) |
| `HUD_rollStRerollSelected` | B+C | — | → `GlobalStRerollDiceByGuids` (Tier C) |
| `HUD_postRollCellMouseUp` | B+C | Yes | → `GlobalPostRollModifyPool` |
| `HUD_debugRollTest/CancelAll` | B+C | Yes | |
| `HUD_gridStrip*` / `HUD_postRollCellMouseEnter/Exit/Down` | A | — | hover UI |

## Global handlers (inventory)

| Handler | File | Frequency | Guard status | Notes |
| --- | --- | --- | --- | --- |
| `onObjectDrop` | `core/global_script.ttslua` | **Very high** | **Pass** | Steam + tag gates |
| `onObjectPickUp` | `core/global_script.ttslua` | High | **Pass** | Steam + tag; `npc_control_token` tag |
| `onObjectRandomize` | `core/global_script.ttslua` | High (rolls) | **Pass** | `hasTag("d10")` before `getTags` / roll FSM |
| `onObjectLeaveContainer` | `core/global_script.ttslua` | Medium | **Pass** | `hasTag("d10")` before bag-spawn path |
| `addHotkey` → `Spotlight NPC (hold)` | `core/global_script.ttslua` | Low (ST hold) | **Pass** | `isStorytellerSteamPlayer` before `require`; world I/O in `Gameboard.onControlBoardSpotlightHotkey` |

## Module handlers (called from Global)

| Entry | Module | Guard | Notes |
| --- | --- | --- | --- |
| `NPCS.onObjectDropped` | `core/npcs.ttslua` | **Pass** | Global `npc_figurine` tag only (seated figurines use seat `*Object` tag, not drop path) |
| `NPCS.isPooledFigurineObject` | `core/npcs.ttslua` | **Pass** | `npc_figurine` **or** seat `*Object` tag + `Figurine_Custom` + (`npcInstance:` GM Notes **or** instance `figurineGuid` registry when seated) |
| `NPCS.resolveNpcNameFromFigurine` | `core/npcs.ttslua` | **Pass** | GM Notes, then O(1) `figurineGuidToNpcName` cache (rebuilt on bulk instance replace) |
| `Gameboard.onNpcControlTokenDropped` | `core/npc_gameboard.ttslua` | **Pass** | `isNpcControlToken` + palette/anchor flags before `waitForCondition` |
| `Gameboard.tryNpcControlTokenDroppedOnStorytellerDiceBag` | `core/npc_gameboard.ttslua` | **Pass** | Black/ST + `dieKindNearStorytellerDiceBag` before restore/roll |
| `Gameboard.tryPcControlTokenDroppedOnStorytellerDiceBag` | `core/npc_gameboard.ttslua` | **Pass** | `isPcControlToken` + Black/ST + `dieKindNearStorytellerDiceBag` before restore; returns `rollColor, rollType` via `STR.rollTypeForStorytellerBagDrop` |
| `GlobalGameboardTokenDroppedOnDiceBag` / `GlobalGameboardPcTokenDroppedOnDiceBag` | `core/global_script.ttslua` | **Pass** | tag + steam-ST before `require("core.npc_gameboard")`; PC wrapper owns `RC.initiateRoll` |
| `GlobalRepositionStorytellerTrayDice` | `core/global_script.ttslua` | **Pass** | Tier C tray layout across all ST bags |
| `Gameboard.onNpcControlTokenPickUp` | `core/npc_gameboard.ttslua` | **Pass** | `isNpcControlToken` |
| `Gameboard.onControlBoardSpotlightHotkey` | `core/npc_gameboard.ttslua` | **Pass** | ST steam in Global hotkey callback; transient lights via `L.applyTransientLightMode` (no `gameState` spotlight writes) |

## Object-script handlers

Per-object scripts (`objects/*.ttslua`, `ui/ui_*.ttslua`) run in **isolated chunks** on the host — guards must be local to that object (bag color/kind tags, candle color, etc.). Prefer tag/GUID checks at the top of `click_*` handlers before `Global.call`.

| Script | Events | Guard pattern |
| --- | --- | --- |
| `objects/dice_bag.ttslua` | `click_roll`, spawn, onLoad | tags; spawn via Global.call |
| `objects/npc_control_board.ttslua` | `click_apply`, `click_clear` | Steam via `GlobalIsStorytellerSteamPlayer`; mutators via Global.call |
| `objects/npc_control_board_palette.ttslua` | onLoad | One-time install via Global.call |
| `ui/ui_signal_candle.ttslua` | click | Object GUID / color from name |
| `ui/ui_tarot_button.ttslua` | click | Pink/Black → `GlobalApplyTarotState` |
| `ui/ui_csheet_core.ttslua` | click, onLoad | Global mutators; layout onLoad |

## Forbidden patterns

1. **Unconditional Global hot-path work** — e.g. calling `NPCS.*` or `Sync.full` from `onObjectDrop` without tag/type guard.
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

- [x] Sync audit — inventory + actor-identity gates + Global.call routing (TOR-144 prep)
- [ ] `Sync.full` / `Sync.npcs` call-site pass — see TOR-168, Performance Audit rank 1.
- [ ] Agent review Prompt 2 — dual-apply on drop paths (TOR-102).

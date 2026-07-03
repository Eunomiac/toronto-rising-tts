# Bootstrap & Load Authority (TTS multiplayer)

**Linear:** TOR-221 (Non-Host onLoad Host-only guard audit)
**Related:** [Event Listener Policy](Event%20Listener%20Policy.md), [Reconciler Contract](Reconciler%20Contract.md), [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) §1, TOR-144 (multiplayer E2E playbook)

> **Agents:** Chunk load, `onLoad`, fan-out handlers, and `Global.call` mutators must follow this doc and **P1–P10** in Preparing §1 until TOR-144 passes. Rule: [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc).

Toronto Rising has been developed and tested **solo Host** (Storyteller seated at **Black**). When real clients join, TTS runs **Global `onLoad` and object `onLoad` on every client**. World mutations and reconcilers must run on the **Host client only**; joining clients hydrate `gameState` and refresh **UI**.

## Authority model: identity axes + outcome tiers

### Identity axes (who / which machine)

| Axis | Check | Use for |
| --- | --- | --- |
| **Storyteller identity (interaction)** | `U.isStorytellerSteamPlayer(playerRef)` | Who triggered an ST-only action — any seat |
| **Storyteller seat alias (XmlUI)** | `U.isStorytellerPlayerColor(color)` — `Black` / `Host` | Legacy object XmlUI; prefer steam when Player is available |
| **Storyteller machine (execution)** | `U.isHostClient()` or `U.requireHostForWorldMutation(context)` | Which client runs bootstrap, reconcile, and world I/O |

**Do not conflate them.** Steam gate alone is **not** enough on fan-out events: when the Storyteller drops a token, `onObjectDrop` runs on **every** client and steam checks pass on all of them.

### Outcome tiers (what the handler does)

| Tier | Examples | Rule |
| --- | --- | --- |
| **A — UI only** | `Sync.ui`, `UpdateUIDisplays`, panel toggles, modal open | Any client |
| **B — State mutation** | `S.setStateVal`, roll FSM (`RC.*`) | Host for ST panel + `Global.call` fan-out; clicker-only PC HUD may mirror state until live broadcast exists (see roll split) |
| **C — World / reconcile** | `Sync.full`, `Sync.npcs`, `setPosition`, `L.SetLightMode`, spawns | **Host only** — `U.requireHostForWorldMutation` |

### Event delivery (TTS)

| Delivery | Handlers | Host guard |
| --- | --- | --- |
| **Fan-out (all clients)** | `onObjectDrop`, `onObjectRandomize`, `Global.call`, `onPlayerConnect`, `onLoad` | Required before Tier C; steam first when ST-only |
| **Clicker-only** | Global XmlUI `HUD_*`, object `click_*` | Host before Tier C; ST steam for panel mutations |

### Roll / fan-out state split

- **Tier C on fan-out** (e.g. `onObjectRandomize` → eventual `Sync.player` lights): host only (`Sync.player` runs `L.reconcileForPlayer` on host; UI/overlays on all clients).
- **Tier B on fan-out** (roll debounce FSM): may run on all clients when inputs are engine-synced; do **not** host-guard the entire `onObjectRandomize` body if that breaks local roll UI on join clients.
- **PC roll clicks**: route spawns/releases through **`Global.call`** so the Host executes Tier C even when a join client clicked.

### Live `gameState` broadcast (follow-up)

Join clients load `gameState` from save on `onLoad` but do not receive runtime Lua table updates from the Host between saves. Full multiplayer state parity may need a future bridge; this audit focuses on **duplicate world I/O**.

## Callback `playerRef` shapes (TTS)

| Handler | Activating player arg | Gate with |
| --- | --- | --- |
| `onPlayerAction(player, …)` | **Player** instance | `U.isStorytellerSteamPlayer(player)` |
| `onPlayerPing(player, …)` | **Player** instance | same |
| HUD `function HUD_*(player, …)` | **Player** instance | same |
| `onObjectDrop(playerColor, object)` | **seat color** string | `U.isStorytellerSteamPlayer(playerColor)` |
| `onObjectPickUp(player_color, object)` | **seat color** string | same |
| Control board `click_*` | `player.color` (often Black-only) | object script + optional steam check |

## TTS behavior (summary)

- **Global script** and **bundled object scripts** load on **each client** when that client finishes loading the save.
- **World writes** (`setPosition`, `spawnObject`, `SetLightMode`, AssetBundle audio, NPC figurine reconcile, table layout sync) must originate from the **Host client** once per intent; the engine replicates results to peers.
- **`gameState`** is loaded from save JSON on every client via `S.InitializeGameState` so HUD, sheets, and overlays can read persisted state on joiners.
- **UI refresh** (`Sync.ui`, `UpdateUIDisplays`, phase sync) is safe on all clients; it does not move world objects.

## Global chunk load (before `onLoad`)

The Global script chunk runs on **every** client when the save loads. Tier C soundscape bootstrap must be **host-only** here as well as in `onLoad`:

| Step | Host only? | Notes |
| --- | --- | --- |
| `trEarlySilenceSoundscapeEmitters` (chunk + deferred) | Host | `U.isHostClient()` at entry; join client logs once and returns |
| `trScheduleEarlySoundscapeSilenceDeferred("chunk-load")` | Host | No-op on join client (no deferred mute timers) |
| `SS.bootstrapSilenceStrayEmitterLoops` (chunk, after `require`) | Host | Host `onLoad` repeats when emitters exist |

## Global `onLoad` inventory

| Step | Host only? | Notes |
| --- | --- | --- |
| `S.InitializeGameState(saved_data)` | All clients | Read persisted state for UI |
| Join branch (`M.onLoadJoinClient`, `Sync.full` UI-only) | Non-Host | Early return before world bootstrap |
| Soundscape early silence (`trEarlySilence*`) | Host | Mutes emitter AudioSources |
| `DEBUG.clearAllLogs` | Host | Session log reset |
| Conditions validate / derived / location reconcile | Host | May touch state + derived rows |
| `SS.bootstrapSilenceStrayEmitterLoops` | Host | World audio |
| `M.onLoad` / `M.setupPlayers` | Host | Promote players, GM table `setInvisibleTo`, table-key inference |
| `NPCS.flushDeferredSeatLayoutCommit` (startup gate) | Host | Single seat layout object moves after bootstrap |
| `Sync.full` (`onLoad_initial`, startup gate) | Host | Full reconciler fan-out |
| Locked/hidden objects at startup gate | Host | `O.ApplyLockedAndHidden*` |
| Loading overlay hide sequence | Host | Host drives readiness gate |

## `Sync.*` guards (non-Host)

| API | Non-Host behavior |
| --- | --- |
| `Sync.full` | `Sync.ui` incremental delta only; returns `false` |
| `Sync.npcs` | No-op |
| `Sync.lighting` | No-op |
| `Sync.soundscape` / `Sync.lightRef` / `Sync.npcCutouts` | No-op |
| `Sync.ui` | Allowed (all clients) |
| `Sync.player` | `L.reconcileForPlayer` host-only; HUD/overlays/`UpdateUIDisplays` on all clients |

Host remains the **sole mutator** for bootstrap reconcilers; joiners must not leave the world out of sync with `gameState` by running duplicate reconcile passes.

## Object `onLoad` scripts

| Script | Host guard | Notes |
| --- | --- | --- |
| `objects/npc_control_board_palette.ttslua` | Via `GlobalGameboardInstallPaletteSnaps` → `U.isHostClient()` | Sparse snap install |
| `objects/npc_control_board.ttslua` | Label sync only | XmlUI toolbar is Black-only in XML |
| `core/soundscape_emitter_object.ttslua` | None (local AudioSource mute) | Per-emitter; low risk |
| `objects/dice_bag.ttslua` | Click handlers use seat color | Roll spawn uses Host-side flow |

## Storyteller interaction pattern (steam identity)

Use **`U.isStorytellerSteamPlayer(playerRef)`** at the top of Global hot paths — pass the **Player** from the callback when available, otherwise the **seat color** string:

```lua
function onObjectDrop(playerColor, object)
    if not U.isStorytellerSteamPlayer(playerColor) then
        return
    end
    if not U.requireHostForWorldMutation("onObjectDrop") then
        return
    end
    -- ...
end

function onPlayerAction(player, action, targets)
    if not U.isStorytellerSteamPlayer(player) then
        return false
    end
    -- ...
end
```

Object XmlUI handlers (control board): **`player.color == "Black"`** before `Global.call` — see TOR-176. Prefer adding **`U.isStorytellerSteamPlayer(player)`** when the handler receives a Player instance.

## Adding bootstrap or load hooks

1. Decide **Storyteller machine** (`U.isHostClient`) vs **Storyteller steam** (`U.isStorytellerSteamPlayer`) vs **all clients**.
2. Prefer **early return** at the entry point — do not hide reconcile inside state setters (see workspace synchronization conventions).
3. Document new handlers in this file and [Event Listener Policy](Event%20Listener%20Policy.md) when they are event-driven.
4. Multiplayer verification belongs in **TOR-144** after this audit ships.

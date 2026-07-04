# Bootstrap & Load Authority (TTS multiplayer)

**Linear:** TOR-221 (Non-Host onLoad guard audit — **superseded** by execution model correction, 2026-07)
**Related:** [Event Listener Policy](Event%20Listener%20Policy.md), [Reconciler Contract](Reconciler%20Contract.md), [Preparing For Multiplayer](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) §1, [Execution Model Correction — Remediation Plan](../Multiplayer%20Functionality/Execution%20Model%20Correction%20%E2%80%94%20Remediation%20Plan.md), TOR-144 (multiplayer E2E playbook)

> **Agents:** Chunk load, `onLoad`, event handlers, and `Global.call` mutators must follow this doc and **P1–P10** in Preparing §1 until TOR-144 passes. Rule: [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc).

Toronto Rising has been developed and tested **solo Host** (Storyteller seated at **Black**). **All mod Lua runs on the host only** — connected clients do not run the Global script or object scripts. Clients transmit interactions to the host; the host's Lua executes once; the engine replicates resulting world/object state to every client.

## Authority model: one Lua brain + identity + outcome tiers

### Actor identity (who triggered this?)

| Check | Use for |
| --- | --- |
| `U.isStorytellerSteamPlayer(playerRef)` | ST-only **interaction** — pass the event's player param (`Player` instance preferred, or seat color string) |
| `U.isStorytellerPlayerColor(color)` | Legacy XmlUI alias: `Black` / `Host`. Prefer steam when `Player` is available |
| XmlUI `visibility` = `Black`/`Admin`/`<Color>` | Per-client UI rendering — engine-level, not Lua gating |

**Do not conflate actor identity with execution location.** There is only one Lua brain (the host). Steam gate answers "*who* triggered this ST-only action?"

### Outcome tiers (what the handler does)

| Tier | Examples | Rule |
| --- | --- | --- |
| **A — UI only** | `Sync.ui`, `UpdateUIDisplays`, panel toggles, modal open | Safe in any handler |
| **B — State mutation** | `S.setStateVal`, roll FSM (`RC.*`) | Mutate `gameState`; then narrow sync |
| **C — World / reconcile** | `Sync.full`, `Sync.npcs`, `setPosition`, `L.SetLightMode`, spawns | Runs on host because TTS runs mod Lua on host only |

### Event delivery (TTS)

Clients send interactions to the host; the host's Lua handlers execute once.

| Delivery | Handlers | Notes |
| --- | --- | --- |
| **Host-executed events** | `onObjectDrop`, `onObjectRandomize`, `Global.call`, `onPlayerConnect`, `onLoad` | All run on host; tag/GUID guard first; steam when ST-only |
| **Clicker-only** | Global XmlUI `HUD_*`, object `click_*` | Routed to host Lua; ST steam for panel mutations |

### Roll path

- **`onObjectRandomize`:** Tier B roll FSM + Tier C lights via `Sync.player` — all in one Lua brain on host.
- **PC roll clicks:** route spawns/releases through **`Global.call`** (bundle-size routing from object scripts, not execution location).

### Live `gameState` broadcast (follow-up)

Join clients load `gameState` from save on connect but do not receive runtime Lua table updates from the Host between saves. Full multiplayer state parity may need a future sync bridge (P10); do not address with execution gates.

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

- **Global script** and **bundled object scripts** run on the **host only**. Clients transmit interactions; host Lua executes once.
- **World writes** (`setPosition`, `spawnObject`, `SetLightMode`, AssetBundle audio, NPC figurine reconcile, table layout sync) originate from host mod Lua; the engine replicates results to peers.
- **`gameState`** is loaded from save JSON via `S.InitializeGameState` on host load.
- **UI refresh** (`Sync.ui`, `UpdateUIDisplays`, phase sync) reads state and updates XmlUI.

## Global chunk load (before `onLoad`)

The Global script chunk runs on the host when the save loads:

| Step | Notes |
| --- | --- |
| `trEarlySilenceSoundscapeEmitters` (chunk + deferred) | Mutes stray emitter AudioSources |
| `trScheduleEarlySoundscapeSilenceDeferred("chunk-load")` | Deferred mute timers |
| `SS.bootstrapSilenceStrayEmitterLoops` (chunk, after `require`) | Repeated in `onLoad` when emitters exist |

## Global `onLoad` inventory

| Step | Notes |
| --- | --- |
| `S.InitializeGameState(saved_data)` | Read persisted state |
| Soundscape early silence (`trEarlySilence*`) | Mutes emitter AudioSources |
| `DEBUG.clearAllLogs` | Session log reset |
| Conditions validate / derived / location reconcile | May touch state + derived rows |
| `SS.bootstrapSilenceStrayEmitterLoops` | World audio |
| `M.onLoad` / `M.setupPlayers` | Promote players, GM table `setInvisibleTo`, table-key inference |
| `R.SyncTable` (deferred) | Seat layout object moves |
| `Sync.full` (`onLoad_initial`, startup gate) | Full reconciler fan-out |
| Locked/hidden objects at startup gate | `O.ApplyLockedAndHidden*` |
| Loading overlay hide sequence | Drives readiness gate |

## `Sync.*` orchestrator

| API | Behavior |
| --- | --- |
| `Sync.full` | Full reconcile (state → world) |
| `Sync.npcs` | NPC figurine reconcile |
| `Sync.lighting` | Light mode reconcile |
| `Sync.soundscape` / `Sync.lightRef` / `Sync.npcCutouts` | Domain reconcilers |
| `Sync.ui` | UI-only refresh |
| `Sync.player` | Per-player: `L.reconcileForPlayer` + HUD/overlays/`UpdateUIDisplays` |

## Object `onLoad` scripts

| Script | Notes |
| --- | --- |
| `objects/npc_control_board_palette.ttslua` | Via `GlobalGameboardInstallPaletteSnaps` — sparse snap install |
| `objects/npc_control_board.ttslua` | Label sync only; XmlUI toolbar is Black-only in XML |
| `core/soundscape_emitter_object.ttslua` | Local AudioSource mute; per-emitter; low risk |
| `objects/dice_bag.ttslua` | Click handlers use seat color; roll spawn via Global.call |

## Storyteller interaction pattern (steam identity)

Use **`U.isStorytellerSteamPlayer(playerRef)`** at the top of Global hot paths — pass the **Player** from the callback when available, otherwise the **seat color** string:

```lua
function onObjectDrop(playerColor, object)
    if not U.isStorytellerSteamPlayer(playerColor) then
        return
    end
    -- tag/GUID guards, then handler body
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

1. Decide **Storyteller steam** (`U.isStorytellerSteamPlayer`) vs **all players** vs **per-client UI visibility**.
2. Prefer **early return** at the entry point — do not hide reconcile inside state setters (see workspace synchronization conventions).
3. Document new handlers in this file and [Event Listener Policy](Event%20Listener%20Policy.md) when they are event-driven.
4. Multiplayer verification belongs in **TOR-144** after this audit ships.

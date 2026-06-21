# Bootstrap & Load Authority (TTS multiplayer)

**Linear:** TOR-221 (Non-Host onLoad Host-only guard audit)  
**Related:** [Event Listener Policy](Event%20Listener%20Policy.md), [Reconciler Contract](Reconciler%20Contract.md), TOR-144 (multiplayer E2E playbook)

Toronto Rising has been developed and tested **solo Host** (Storyteller seated at **Black**). When real clients join, TTS runs **Global `onLoad` and object `onLoad` on every client**. World mutations and reconcilers must run on the **Host client only**; joining clients hydrate `gameState` and refresh **UI**.

## Two authority axes

| Axis | Check | Use for |
| --- | --- | --- |
| **GM / Storyteller interaction** | `U.isStorytellerPlayerColor(color)` — **`Black`** (`C.StorytellerColor`) or TTS **`Host`** spectator alias | Clicks, drops, picks, Apply/Clear, scene import, ST panel mutations |
| **Host client (server)** | `U.isHostClient()` — local seated `steam_id` matches the session Host player | `onLoad` bootstrap, `Sync.full`, `Sync.npcs`, `Sync.lighting`, object moves, snap install |

**Do not conflate them.** The GM may be seated at Black on the Host machine; a joining PC is neither Host client nor Black. A promoted guest is not the GM unless they are seated at Black (or Host alias for spectator GM).

## TTS behavior (summary)

- **Global script** and **bundled object scripts** load on **each client** when that client finishes loading the save.
- **World writes** (`setPosition`, `spawnObject`, `SetLightMode`, AssetBundle audio, NPC figurine reconcile, table layout sync) must originate from the **Host client** once per intent; the engine replicates results to peers.
- **`gameState`** is loaded from save JSON on every client via `S.InitializeGameState` so HUD, sheets, and overlays can read persisted state on joiners.
- **UI refresh** (`Sync.ui`, `UpdateUIDisplays`, phase sync) is safe on all clients; it does not move world objects.

## Global `onLoad` inventory

| Step | Host only? | Notes |
| --- | --- | --- |
| `S.InitializeGameState(saved_data)` | All clients | Read persisted state for UI |
| Join branch (`M.onLoadJoinClient`, `Sync.full` UI-only) | Non-Host | Early return before world bootstrap |
| Soundscape early silence (`trEarlySilence*`) | Host | Mutes emitter AudioSources |
| `DEBUG.clearAllLogs` | Host | Session log reset |
| Conditions validate / derived / location reconcile | Host | May touch state + derived rows |
| `SS.bootstrapSilenceStrayEmitterLoops` | Host | World audio |
| `Z.onLoad` | Host | Zone state default + `DeactivateZones` |
| `M.onLoad` / `M.setupPlayers` | Host | Promote players, GM table `setInvisibleTo`, table-key inference |
| `R.SyncTable` (deferred) | Host | Seat layout object moves |
| `Sync.full` (`onLoad_initial`, startup gate) | Host | Full reconciler fan-out |
| Locked/hidden objects at startup gate | Host | `O.ApplyLockedAndHidden*` |
| Loading overlay hide sequence | Host | Host drives readiness gate |

## `Sync.*` guards (non-Host)

| API | Non-Host behavior |
| --- | --- |
| `Sync.full` | `Sync.ui` incremental delta only; returns `false` |
| `Sync.npcs` | No-op |
| `Sync.lighting` | No-op |
| `Sync.ui` / `Sync.player` | Allowed (UI-only) |

Host remains the **sole mutator** for bootstrap reconcilers; joiners must not leave the world out of sync with `gameState` by running duplicate reconcile passes.

## Object `onLoad` scripts

| Script | Host guard | Notes |
| --- | --- | --- |
| `objects/npc_control_board_palette.ttslua` | Via `GlobalGameboardInstallPaletteSnaps` → `U.isHostClient()` | Sparse snap install |
| `objects/npc_control_board.ttslua` | Label sync only | XmlUI toolbar is Black-only in XML |
| `core/soundscape_emitter_object.ttslua` | None (local AudioSource mute) | Per-emitter; low risk |
| `objects/dice_bag.ttslua` | Click handlers use seat color | Roll spawn uses Host-side flow |

## GM interaction pattern (player color)

Use **`U.isStorytellerPlayerColor(player_color)`** at the top of Global hot paths (same as legacy `isStorytellerPlayerColor` in `global_script.ttslua`):

```lua
function onObjectDrop(playerColor, object)
    if not U.isStorytellerPlayerColor(playerColor) then
        return
    end
    -- ...
end
```

Object XmlUI handlers (control board): **`player.color == "Black"`** before `Global.call` — see TOR-176.

## Adding bootstrap or load hooks

1. Decide **Host client** vs **GM color** vs **all clients**.
2. Prefer **early return** at the entry point — do not hide reconcile inside state setters (see workspace synchronization conventions).
3. Document new handlers in this file and [Event Listener Policy](Event%20Listener%20Policy.md) when they are event-driven.
4. Multiplayer verification belongs in **TOR-144** after this audit ships.

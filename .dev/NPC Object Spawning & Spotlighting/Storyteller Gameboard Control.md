<!-- markdownlint-disable -->

# Storyteller Gameboard Control

## Agent Routing

Read this when:
- changing how stage NPC placements are written, animated, or spotlit
- touching the Stage Control board (CONTROL_BOARD) spotlight tokens or the stage playfield (STAGE_BOARD) u,v maths
- generic NPC import: [`Generic NPCs.md`](Generic%20NPCs.md)

Source of truth:
- `core/npc_stage_apply.ttslua` — Storyteller Dashboard stage edits → `sessionScene.npcWorld.placements` → `Sync.npcs`
- `core/stage_tokens.ttslua` — spotlight tokens on CONTROL_BOARD (spawn in rows / flip / destroy from placements)
- `core/npc_gameboard_spotlight.ttslua` — Storyteller hold-to-spotlight hotkey (TOR-238)
- `core/npc_gameboard.ttslua` — thin `Gameboard` facade (u,v maths + hotkey entry)
- `core/npc_gameboard_board.ttslua` — board accessors, u,v ↔ world
- `core/npc_gameboard_snaps.ttslua` — polar + seat-row **catalog geometry** (no physical snap points are installed)
- `core/npc_stage_lerp.ttslua` — animated stage moves
- `lib/npc_gameboard_data.ttslua` — snap rings, seat row, Scatter group geometry, lerp tunables, token scale

Verification:
- `npm run build`
- `npm run dashboard:scene-catalogs` (dashboard reads `CONTROL_BOARD_SNAP` from `lib/npc_gameboard_data.ttslua` for the stage slot catalog)
- Save & Play, then move an NPC on the Dashboard stage and hold the spotlight hotkey over its token

Status: current (TOR-687 retired control-board Apply, the token palette, PC tokens, minimap markers, and HERE/THERE preview).

## Contract

| Surface | Role |
| --- | --- |
| **Stage authority** | `sessionScene.npcWorld.placements` — `{ characterKey = { u, v, yaw, npcLightMode } }` in 0–1 stage-map coordinates. Written only by `StageApply.applyStageChanges` (Dashboard) and by scene activation. |
| **Dashboard edit** | `dashboard/scenes.ttslua` → `StageApply.applyStageChanges(changes)` → `Sync.npcs({ animateStageMoves = true })`. Bundled edits animate together (one lerp batch). Homeland seats stay dark while their NPC stands on the stage. |
| **Spotlight tokens** | `StageTokens.reconcileFromState` runs from the NPC reconcile. One `Custom_Tile` per stage NPC, tagged `stage_token`, GM notes `npcToken:<characterKey>`, scale `D.STAGE_TOKEN_SCALE` (1.5), yaw 0, face down when the NPC stands dark. Spawned in horizontal rows across the board, read from the Storyteller's seat starting in the top-left corner, left to right, then down (world +X → −X along the −Z edge, rows stepping toward +Z): 3 world units apart, grouped by stage area in `C.Scatter.POLAR_FAMILY_ORDER` (`ScatterOccupancy.polarAreaNameAt`; in Scatter that is scatter-group order) with 1 extra unit between areas. Position is set **only at spawn** — a later stage move leaves the token in place, a light change only flips it, and a newcomer whose sorted slot is held by an older token takes the next free spare slot past the end. Saved tokens at another scale are respawned on load. Hidden from PC seats. Moving a token does nothing. |
| **Spotlight hotkey** | Only purpose of the tokens — see § Hold-to-spotlight. |

Reconcile uses **`placements` only**. Legacy **`byArea`** in an old save or library row is not converted: `S.validateState` drops it (`lib/npc_placements_convert.ttslua`) and prints each NPC it held, so the Storyteller can place them on the stage again.

Seating NPCs at the table and setting PC seat presence are **not** stage-token actions; they go through scene activation and the Scenes panel / Dashboard. Scatter Mode is world layout + HUD only: [`Scatter Mode.md`](../Revision%20of%20Player%20Positioning/Scatter%20Mode.md).

## Coordinate mapping (STAGE ↔ CONTROL)

Both boards are **different objects** (position, rotation, scale). Map coordinates are **not** shared world XZ between boards.

| Step | API | Meaning |
| --- | --- | --- |
| Map → world figurine | `Gameboard.worldFromUv(u, v, { groundLevel })` | **STAGE_BOARD** `positionToWorld` at that `u,v`; Y from ring `groundLevel` when set (absolute world Y). Fallback: `D.DEFAULT_STAGE_WORLD` when STAGE_BOARD is missing. |
| Map → control board | `Board.worldOnControlBoard(board, u, v, opts)` | Same `u,v` on **CONTROL_BOARD** via `positionToWorld` (`stage_tokens` reads only the board's surface height from it). |

**UV frame:** Custom_Tile boards use `positionToLocal` / `positionToWorld` in **object-local** units (≈ ±0.5 on X/Z for a unit tile). Do **not** multiply or divide UV by `getBounds().size` (world units). Half-extents are derived by projecting world bound corners through `positionToLocal`.

**Stage figurine yaw:** `Gameboard.stageFigurineWorldYawDeg` = STAGE_BOARD Y + board-relative placement yaw + **`D.STAGE_FIGURINE_YAW_OFFSET_DEG` (180)** for `Figurine_Custom` cutout orientation.

## Snap catalog (geometry only)

`D.CONTROL_BOARD_SNAP` defines elliptical rings in board u/v (`snapGroups`: `num`, `angleDelta`, `rays`, optional per-ring `origin`, `groundLevel`, `radialStagger`, `validSnaps`, `defaultLightMode`). `Snaps.buildControlBoardSnapCatalog` turns them into catalog entries (`ringIndex`, `rayIndex`, `familyId`, `familyK`, `u`, `v`, `yawDeg`, `groundLevel`). The catalog is used for:

- placement yaw / ground level (`Snaps.placementBoardRelYawDeg`, `Snaps.groundLevelForSnapUv`)
- lerp batching by anchor family (`resolvePlacementSnapCatalogEntry`, `orderFamilySnapsForAnchorSpread`, `stageLerpFamilyGroupSortKey`)
- Scatter orbit-light polar lookups (`lib/scatter_occupancy.ttslua`)
- the Dashboard stage snap overlay (`.dev/scripts/generate_dashboard_scene_catalogs.js` → `data/control-board-snaps.json`)

`D.CONTROL_BOARD_SEAT_ROW` (nine numbered chairs in a row) feeds seat-kind catalog entries and the Dashboard seat strip. No snap points are installed on CONTROL_BOARD. See [Generating Snap Points For Control Board.md](./Generating%20Snap%20Points%20For%20Control%20Board.md) for ring tuning.

## Stage placement lerp (TOR-173 / TOR-416)

Dashboard stage applies pass `animateStageMoves` into `NPCS.reconcileAllFromState` Step Five. Eligible stage→stage moves (and same-snap light toggles involving `STANDARD` / `SPOTLIGHT`) commit instance + `gameState.lights` to the target, then animate via a **single** `GlobalStageLerpOrchestrator` coroutine (`core/npc_stage_lerp.ttslua`). Position + yaw use `sineInOut`. **Lit** moves lock the pooled spotlight to the live figurine each frame via `NPCS.resolveFigurineLightPose`. Light timing: `STANDARD`→`OFF` linear fade from the start; `OFF`→`STANDARD` holds off until **75%** then springs on. Batches group by anchor-family `familyId`; the leader anchor moves first, siblings stagger in `orderFamilySnapsForAnchorSpread` order; multiple families order center-out on destination anchor distance; `betweenFamilyStaggerSec` offsets families on one shared timeline. Not used on load, blindfold, fresh spawns, seat paths, or `Sync.full`. A mid-scene stage add first spawns the newcomer hidden and waits for its image (`NPCS.prewarmNpcs`, up to a few seconds) before the placement is committed. Tunables: `D.STAGE_PLACEMENT_LERP`.

## Hold-to-spotlight (TOR-238)

Transient "who's speaking" cue — **not** game-phase Spotlight (TOR-98), **not** persisted `npcLightMode`. On load, Global registers `addHotkey("Spotlight NPC (hold)", …, triggerOnKeyUp=true)`; bind it under **Options → Game → Game Keys**. **Storyteller steam player only** (`isStorytellerSteamPlayer` in the callback). While held, poll `Player[color].getHoverObject()` every 80 ms; when the hover is a `stage_token` (`StageTokens.characterKeyForToken`) whose NPC has a row in `sessionScene.npcWorld.placements`, apply:

| Target | Behavior |
| --- | --- |
| Stage figurine pooled spotlight | `NPCS.buildResolvedLightModeTable(characterKey, "SPOTLIGHT")` via `L.applyTransientLightMode` (restores prior `gameState.lights[ref]` — preview does not save) |
| Storyteller board indicator (`G.GUIDS.STORYTELLER_SPOTLIGHT`, registry `storytellerSpotlight`) | Moves to token **X/Z** (Y unchanged); `STANDARD` while previewing, **OFF** otherwise |

Key-up or hovering off the tokens clears both previews. Entry: `Gameboard.onControlBoardSpotlightHotkey`. **Multiclient:** solo host verified; join-client ST hotkey is the P10 gap.

## Token art

`StageTokens` reads front/back art from `lib/npc_art_urls.ttslua` (`ART[key].token`), generated for every NPC by `npm run build:full` ([NPC Art Pipeline](NPC%20Art%20Pipeline.md)). Tokens are circle `Custom_Tile` (`type = 2`, thickness 0.1); face down = NPC stands dark. When indexing saved tokens, any token whose images differ from the current links is destroyed so it respawns with the new art. Missing art prints `[StageTokens] no token art for …` and that NPC gets no token.

GUIDs: `G.GUIDS.STAGE_BOARD`, `G.GUIDS.CONTROL_BOARD` in `lib/guids.ttslua`.

Debug: `DEBUG.dumpNpcPlacements()` in the TTS console.

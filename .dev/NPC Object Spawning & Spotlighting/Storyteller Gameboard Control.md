<!-- markdownlint-disable -->

# Storyteller Gameboard Control

## Agent Routing

Read this when:
- changing CONTROL_BOARD/STAGE_BOARD token workflows, Apply/Clear behavior, token palette behavior, or NPC/PC control-token contracts
- debugging minimap marker mirroring, stage placement lerps, homeland seat retention, or Storyteller token-to-dice-bag rolls

Source of truth:
- `core/npc_gameboard.ttslua`
- `lib/npc_gameboard_data.ttslua`
- `objects/npc_control_board.ttslua`
- `objects/npc_control_board_ui.ttslua`
- `ui/objects/npc_control_board.xml`
- `core/npcs.ttslua`
- `core/storyteller_rolls.ttslua`

Verification:
- `npm run build`
- `npm run npc-control-board-ui:generate`
- `.dev/E2E Playbooks/Gameboard-E2E.md`

Physical **STAGE_BOARD** (hidden world floor) + **CONTROL_BOARD** (GM table minimap) replace XML area placement for NPC staging. Code: `core/npc_gameboard.ttslua`, `lib/npc_gameboard_data.ttslua`, `objects/npc_control_board.ttslua`.

## Contract

| Surface | Role |
| --- | --- |
| `sessionScene.npcWorld.placements` | Authority: `{ characterKey = { u, v, yaw, npcLightMode } }` (0–1 on stage board). **`yaw` is derived** from master `origin` at `u,v` (`Gameboard.placementBoardRelYawDeg`); token Y rotation is ignored. |
| **Apply** | Scan polar snaps → `placements` (u,v, yaw, `npcLightMode` from flip). Scan **seat row** (TOR-180) → `seatLayout.occupiedNPCSlots` + `seatSlots.isPresent` (face-up = present; face-down = absent). → `Sync.npcs` |
| **Clear** | First click: recover stray tokens; arm 5s confirm. Second click → snapshot pre-clear `placements`, apply **TOR-281** homeland seat rules (disabled seat → activate when staged light was visible; enabled seat unchanged), empty `placements`, park stage tokens on palette (**seat-row tokens stay**), `relocateHomelandSeatTokensAfterClear`, `Sync.npcs` (Step Three re-seats) |
| Reconcile | `NPCS.reconcileAllFromState` → figurines face **master `origin`** at u,v (`CONTROL_BOARD_SNAP.origin`); CONTROL_BOARD markers always; **token mirror** pulls tagged tokens from palette/board to exact placement u,v (not snap-only) when `layoutLock` is false. The mirror also **parks orphaned NPC tokens** still on the minimap that no longer map to an occupied seat (`occupiedNPCSlots`) or a stage placement — keeps the control board aligned to scene config after a scene change reduces active NPC seats (`mirrorControlBoardTokensFromPlacements` → `parkNpcTokenOnPalette`). |

Legacy **`byArea` in import JSON** is converted to **`placements` on import** (`lib/npc_placements_convert.ttslua`). Reconcile uses **`placements` only**; `byArea` in live state is normalized on `S.validateState` or via `npm run npc-placements:migrate-byarea`.

## Token contract — `npc_control_token` vs `pc_control_token` (TOR-236)

Two distinct control-token tags share the CONTROL_BOARD minimap. Minimap snaps are **untagged** (any object can snap); only NPC/PC control tokens are expected near the board. The two token kinds drive **different** state and are handled by **disjoint** code paths. A `pc_control_token` must carry **only** `pc_control_token` (never also `npc_control_token`), so the NPC handlers — all gated on `isNpcControlToken` (tag `npc_control_token`) — skip it automatically.

| Identity | `npc_control_token` | `pc_control_token` |
| --- | --- | --- |
| GM Notes | `npcToken:<characterKey>` (`npcToken:myleneHamelin`) | `pcToken:<Color>` (`pcToken:Red`) — color-bound to one PC seat |
| Roster source | `npcs_data` NPCs (`D.getNpcCharacters()` — excludes `isPC`) | one per PC player color (`C.PlayerColors`) |
| Home | palette group slot / polar placement / homeland seat-row column | its PC seat-row column (`Purple/Pink/Red/Orange/Brown`), always pinned |

| Handler / path | `npc_control_token` | `pc_control_token` |
| --- | --- | --- |
| Polar/stage scan → `placements` (`scanControlBoardTokens`) | scanned (u,v,yaw,`npcLightMode` from flip) | **ignored** (scan iterates `npc_control_token` only) |
| Seat-row scan (NPC columns) | `scanSeatRowTokensBySeatKey` → `occupiedNPCSlots` + presence | n/a |
| Seat-row scan (PC columns) | n/a | `scanSeatRowPcTokensByColor` → `applyPcSeatRowFromControlBoard` → `seatSlots[color].isPresent` (face-up = present, face-down = absent) on **Apply** |
| Flip meaning | stage light mode (`STANDARD` face-up / `OFF` face-down) | PC seat **presence** (no stage light) |
| Reconcile pin | placement rows + homeland seat mirror | each color-bound PC token pinned to its column; flip set to **match** current `seatSlots[color].isPresent` (state authoritative) |
| Scale | seat 0.7 / polar 0.2 (TOR-199) | seat-row scale (0.7) on its column |
| ST dice-bag drop → roll | `tryNpcControlTokenDroppedOnStorytellerDiceBag` (restore home + roll type from bag + `Werewolf` tag via `STR.rollTypeForStorytellerBagDrop`) | `tryPcControlTokenDroppedOnStorytellerDiceBag` — **always** return token to its column home (present/absent flip); roll type from bag + `Werewolf` tag via `STR.rollTypeForStorytellerBagDrop` (caller `RC.initiateRoll`) |
| Anchor-family spread / pick-up light | NPC-only (`onNpcControlTokenDropped` / `onNpcControlTokenPickUp`) | **no-op** |
| Palette / preload generation | one token + preload figurine per NPC | none (PCs excluded by `D.getNpcCharacters()`; PC tokens authored in workshop) |

**Scope of the current contract (Apply-time + mirror):** Apply reads PC columns and sets `seatSlots[color].isPresent` from the token flip; reconcile keeps each PC token pinned to its column with the flip mirroring state. PCs **without** a token on their column are left untouched, so connection-driven presence is not clobbered. Making the `pc_control_token` the **sole** presence authority (force-absent when no face-up token, snap stray tokens face-down) is deferred to **TOR-247** (rotational seat-index layout / PC seat decoupling). Play-as-NPC role swap is **TOR-95** (`blockedBy` TOR-247).

## Coordinate mapping (STAGE ↔ CONTROL)

Both boards are **different objects** (position, rotation, scale). Map coordinates are **not** shared world XZ between boards.

| Step | API | Meaning |
| --- | --- | --- |
| World playfield → map | `Gameboard.uvFromWorld(worldPos)` | Project through **STAGE_BOARD** (`positionToLocal` → normalized `u,v` in 0–1 using **local** half-extents from bound corners, not `getBounds().size`). Fallback: `C` table extents when stage board is missing. |
| Map → world figurine | `Gameboard.worldFromUv(u, v)` | **STAGE_BOARD** `positionToWorld` at that `u,v`. |
| Map → control minimap | `Gameboard.worldOnControlBoard(board, u, v)` | Same `u,v` on **CONTROL_BOARD** via `positionToWorld` (TTS transform handles rotation/scale). |

**UV frame:** Custom_Tile boards use `positionToLocal` / `positionToWorld` in **object-local** units (≈ ±0.5 on X/Z for a unit tile). Do **not** multiply or divide UV by `getBounds().size` (world units) — that placed snaps/markers in a huge arc off the minimap. Half-extents are derived by projecting world bound corners through `positionToLocal`.

**Do not** call `positionToLocal` on CONTROL_BOARD with a playfield world position (e.g. `C.Tables[].centerPoint` at z≈50). That produced markers in a huge arc off the minimap and placed the table marker at the real table instead of on the control board.

Table markers: active table only on minimap (`centerPoint` → `uvFromWorld` → `worldOnControlBoard`). NPC tokens on the control board use the same `u,v` as stage figurines after Apply.

**Table markers (`gameboard_table`):** Exactly one minimap table mesh is on the control tile — the marker whose GM Notes key matches `seatLayout.currentTableKey`. All other table markers are **locked** and parked at world **Y = -200** (`MARKER_STASH_WORLD_Y`, slight X offset per table key). Component and seat markers use the same stash pattern when inactive.

**NPC seat markers:** Always stashed at **Y = -200** (not shown on minimap; TOR-268).

**Table leaf / component markers (`gameboard_table_component`):** Shown on the minimap when the parent table is active and the leaf is active on the playfield (same `usedBy` / `alsoEnable` rules as `applyTableComponentsState` in `lib.rotational-seat-layout.ttslua`). Inactive leaves and components for other tables are **locked** and parked at world **Y = -200** (`MARKER_STASH_WORLD_Y`). Leaf markers use the parent table's CONTROL_BOARD transform (models are authored table-relative).

**Marker scale:** For each minimap marker, read `getScale()` on the playfield object it mimics (`C.Tables` table/leaf GUID, or `G.GetThroneGUID` seat chair for PC/NPC seats), then set marker scale to **source ÷ 40** on all three axes (`DATA.MINIMAP_SCALE_DIVISOR`). Do not use nearest `*Object` tag scan for scale — that often hits a scale-1 helper instead of `SEAT_CHAIR_*`.

**Marker rotation:** `marker.setRotation(source.getRotation() + board.getRotation())` per euler axis (playfield mimic + CONTROL_BOARD). Table uses `C.Tables[tableKey].guid`; seats use `G.GetThroneGUID`. Workshop stash euler on markers is overwritten every `reconcileControlBoardFromState` — if rotation still matches the save default, the bundled script was not Save & Play’d.

**Marker height:** `MINIMAP_SURFACE_LOCAL_Y` (default 0.18) + optional `MINIMAP_TABLE_EXTRA_LOCAL_Y` (0.06) for `gameboard_table` markers so thick table meshes sit on the control tile, not clipped inside it.

**Player visibility:** All `gameboard_*` markers and `npc_control_token` tiles use `setInvisibleTo(C.PlayerColors)` — hidden from every seated PC (Brown–Purple); Storyteller (Black) and spectators (White/Grey) still see them. CONTROL_BOARD toolbar XmlUI uses `visibility="Black|Host"` on `gb_root` (`ui/objects/npc_control_board.xml`). Reconcile and spawn paths call `Gameboard.setHiddenFromPlayerColors`.

**Marker lock:** `gameboard_table`, `gameboard_table_component`, `gameboard_pc_seat`, and `gameboard_npc_seat` objects are `setLock(true)` on reconcile so minimap pieces do not collide and drift. `npc_control_token` tiles stay unlocked for drag-to-snap + Apply.

**Layout lock:** When `sessionScene.npcWorld.layoutLock` is true, **token** positions on CONTROL_BOARD are not overwritten from state; **table markers** still reconcile (active table only on minimap).

**Seat ↔ stage (TOR-178):** Homeland seat (`seatLayout.occupiedNPCSlots`) is retained only while the character's control token is on the **CONTROL_BOARD minimap** (seat-row or polar/stage snap). **Palette and off-board tokens are out of play** — Apply unassigns when the seat snap is empty and the token is not on a polar snap; **Clear** calls `releaseHomelandSeatsForOffBoardTokens` before parking tokens, then unassigned NPCs stay on the palette with chair/lights off. While on-board stage-bound (placement row in state), Apply keeps the homeland seat; Clear empties `placements` and Step Three re-seats the figurine at the table (token returns to the seat-row snap). Figurine `image_scalar` uses `figurine.scale` at stage and table alike. Stage-bound: homeland **chair** and **table leaves** (playfield + minimap) stay visible; both homeland **seat spotlights** (`npcLight1NPC*`, `npcLight2NPC*`) go OFF via `NPCS.reconcileHomelandSeatSpotlightsForStageBound` / `NPCS.isNpcSeatOccupantStageBound`.

**NPC token → ST dice bag (TOR-174):** Host/Black drops an `npc_control_token` on a Storyteller dice bag → token immediately returns to **committed** home from state (`placements` polar row, else homeland seat-row mirror, else palette snap) via `Gameboard.restoreNpcControlTokenHome`; `STR.initiateFromBagLabel(fullName, bagKind, characterKey, opts)` opens the ST roll. Roll type comes from `STR.rollTypeForStorytellerBagDrop` (same mapping for bag-click name modal): **Normal** → Standard, **Hunger** → Discipline, **Werewolf bag** → Willpower, **Rage** → Frenzy, **Rouse** → Rouse, **Oblivion-Rouse** → Remorse at `End` else Oblivion-Rouse. Tokens tagged **`Werewolf`** always start a **Werewolf** roll regardless of bag. Pick-up does no extra work; `onObjectDrop` gates tag + Host/Black + bag proximity before the board drop handler. Entry: `GlobalGameboardTokenDroppedOnDiceBag` → `Gameboard.tryNpcControlTokenDroppedOnStorytellerDiceBag`.

**PC token → ST dice bag (TOR-236):** Host/Black drops a `pc_control_token` on a Storyteller dice bag → token is **always** re-pinned to its color seat-row column with the present/absent flip mirroring `seatSlots[color].isPresent` (`Gameboard.restorePcControlTokenHome`, same as reconcile). Roll type comes from `STR.rollTypeForStorytellerBagDrop` (same mapping as NPC tokens and bag modal): **Normal** → Standard, **Hunger** → Discipline, **Werewolf bag** → Willpower, **Rage** → Frenzy, **Rouse** → Rouse, **Oblivion-Rouse** → Remorse at `End` else Oblivion-Rouse. Tokens tagged **`Werewolf`** always start a **Werewolf** roll regardless of bag. `GlobalGameboardPcTokenDroppedOnDiceBag` calls `RC.initiateRoll(color, { rollType, initiator = "storyteller" })` + `GlobalSpawnDefaultPoolDiceForActive` — same path as `HUD_rollInitiate`. `onObjectDrop` gates tag + Host/Black + bag proximity. Entry: `GlobalGameboardPcTokenDroppedOnDiceBag` → `Gameboard.tryPcControlTokenDroppedOnStorytellerDiceBag` (returns `consumed, rollColor, rollType`).

## Workshop tags

| Tag | GM notes example |
| --- | --- |
| `npc_control_token` | `npcToken:myleneHamelin` |
| `pc_control_token` | `pcToken:Red` — color-bound to a PC seat-row column (snaps accept both token tags). Must **not** also carry `npc_control_token`. |
| `gameboard_table` | `gameboardTable:Table A` |
| `gameboard_table_component` | `gameboardComponent:Table A\|Table Leaf Near Left` |
| `gameboard_pc_seat` | `gameboardPcSeat:Red` |
| `gameboard_npc_seat` | `gameboardNpcSeat:NPC2` |

GUIDs: `G.GUIDS.STAGE_BOARD`, `G.GUIDS.CONTROL_BOARD`, `G.GUIDS.CONTROL_BOARD_PALETTE` (`ee686e`) in `lib/guids.ttslua`.

## Control-board snaps (CONTROL_BOARD)

Snap points are installed by `Gameboard.installPolarSnaps` (alias `installControlBoardSnaps`) from **`reconcileControlBoardFromState`** (every `Sync.npcs` / load) — the CONTROL_BOARD object does **not** need a bundled script in the save for snaps to appear.

## Control-board UI (Apply / Clear / …)

**Repo sources (attach on CONTROL_BOARD in TTS Editor):**

| Source | Role |
| --- | --- |
| `objects/npc_control_board.ttslua` | Object script: `onLoad` → XmlUI toolbar + polar snaps; `click_*` → Global |
| `objects/npc_control_board_ui.ttslua` | `installObjectUi` (embedded XML via `UI.setXml`, clears legacy 3D buttons) |
| `lib/npc_control_board_ui_xml.ttslua` | **Generated** — embedded copy of `ui/objects/npc_control_board.xml` for runtime `UI.setXml` |
| `ui/objects/npc_control_board.xml` | **Source of truth** for toolbar XmlUI (csheet-style scale/rotation) |

**TTS Editor — Script** (one line):

```lua
require("objects.npc_control_board")
```

**TTS Editor — XML**:

```xml
<Include src="ui/objects/npc_control_board.xml" />
```

The extension may mirror these under `.tts/objects/CONTROL_BOARD.bea29a.*` (gitignored) when the object is named with GUID `bea29a`. **`npm run build`** (via `fix_tts_object_stubs.js`) normalizes scrambled extension stubs:

| Object | `.tts/objects` Lua stub | `.tts/objects` XML stub |
| --- | --- | --- |
| `CONTROL_BOARD.*` | `require("objects.npc_control_board")` | `<Include src="ui/objects/npc_control_board.xml" />` |
| `CONTROL_BOARD_PALETTE.*` | `require("objects.npc_control_board_palette")` | `<Panel />` (no toolbar) |

Manual repair: `npm run tts-objects:fix-stubs` or VS Code task **Fix TTS object stubs (.tts/objects XML + Lua)**.

**Workshop:** tag the tile `npc_control_board` (optional). GUID `bea29a` in `lib/guids.ttslua`.

**In-game toolbar (XmlUI only):** Same crisp pattern as character sheets (`ui/player/csheets/csheet_defaults.xml` `page_root`): large pixel sizes (`width`/`fontSize`), then **`scale="0.1 0.1 0.1"`** and **`rotation="0 0 180"`** on the root `Panel`. Do **not** use `createButton` on CONTROL_BOARD — the tile is scale **{20, 1, 10}**, so small button dimensions stretch and blur.

| Piece | Path |
| --- | --- |
| **Source of truth (edit layout here)** | [`ui/objects/npc_control_board.xml`](../../ui/objects/npc_control_board.xml) — `gb_root` position, `scale`, `rotation`, button sizes |
| **Build embed** | `npm run npc-control-board-ui:generate` → [`lib/npc_control_board_ui_xml.ttslua`](../../lib/npc_control_board_ui_xml.ttslua) (do not edit by hand) |
| **Runtime install** | [`objects/npc_control_board_ui.ttslua`](../../objects/npc_control_board_ui.ttslua) — `installObjectUi` applies embedded XML via `UI.setXml` (skips when unchanged) |
| **Csheet reference** | [`ui/player/csheets/csheet_defaults.xml`](../../ui/player/csheets/csheet_defaults.xml) — same embed pattern via `npm run csheet-defaults:generate` |

**Workflow:** edit `ui/objects/npc_control_board.xml` → `npm run npc-control-board-ui:generate` (or `npm run build`) → **Save & Play** → reconcile installs toolbar from embedded XML. Console: **`XmlUI installed from ui/objects/npc_control_board.xml`** after first install each session.

**Apply click error (`click_apply` is not a function):** The save often has **empty** `LuaScript` on `bea29a` while Global still installs 3D buttons that reference `click_apply` on the board object. After **Save & Play** with the bundled stub, handlers live in the object script. Until then, the first `Sync.npcs` / reconcile injects a minimal `click_*` script via `setLuaScript` (`Gameboard.ensureControlBoardObjectCallbacks`). **XmlUI toolbar** passes `(player, value, id)` to `click_*` — use `player.color`, not createButton’s `(_, player_color)` signature. Console: `lua GlobalGameboardApply()` / `lua GlobalGameboardClearClick({ player_color = "Black" })` (double-click Clear confirm).

**Palette vs activated:** Tokens on **CONTROL_BOARD_PALETTE** are inactive storage; **Apply** ignores them until a token is on a CONTROL_BOARD polar snap. **Clear** runs `Palette.syncTokensToPalette` (group order from `lib/npcs_data` `characters[].groups`, minus `PALETTE_GROUP_BLACKLIST` e.g. `princesCourt`). **On-board detection:** drop handlers and scans use `isTokenOnControlBoardSurface` (2.5× tile XZ, no Y — snap settle / seat scale). Clear parking and stray recovery use `isTokenOnControlBoardFace` (same XZ band + surface Y) so tokens fallen below the board are parked.

**Console fallback:** `lua GlobalGameboardApply()` / `lua GlobalGameboardClearClick({ player_color = "Black" })` (Storyteller only; first Clear click arms 5s confirm only; second click within 5s runs Clear). Manual stray recovery: `lua print(require("core.npc_gameboard").recoverStrayNpcTokensToPalette())`.

**Apply performance:** When scanned token placements match persisted `sessionScene.npcWorld.placements` and the seat row is unchanged, Apply skips figurine reconcile (logs `placements unchanged`). Placement-only edits run `Sync.npcs` steps **1 + 5** only. **Seat-row** edits (assign / vacate / presence) run steps **1–5** (includes seat teardown, layout commit, presence). `reconcileControlBoardFromState` skips marker/token mirror when its fingerprint is unchanged (invalidated on seat vacate). CONTROL_BOARD XmlUI install no longer calls `clearButtons()` every reconcile when XML is already loaded.

**Stage placement lerp (TOR-173, Apply only):** `gameboard_apply` passes `animateStageMoves` into `NPCS.reconcileAllFromState` Step Five. Eligible stage→stage moves (and same-snap light toggles involving `STANDARD`) commit instance + `gameState.lights` to the target, then animate via a **single** `GlobalStageLerpOrchestrator` coroutine (`core/npc_stage_lerp.ttslua`). Position + yaw use `sineInOut`; light world pose is baked and lerped in the same loop (no per-frame `deferNpcSpotlightAlignedToFigurine`). Light mode timing: `STANDARD`→`OFF` — linear fade over full duration at start; `OFF`→`STANDARD` — hold off until **75%** then short spring on. Batches group by anchor-family `familyId` (`Gameboard.resolvePlacementSnapCatalogEntry` — same rows as anchor spread); leader anchor snap moves first, siblings stagger in `orderFamilySnapsForAnchorSpread` order. Multiple families order center-out on destination anchor distance. `betweenFamilyStaggerSec` offsets the next family's first start on one shared timeline (motions overlap). Outer `num=6, rays=1` rings are one family per ring; inner `num=5` rings have one family per ray anchor. Not used on load, blindfold, preload/seat paths, Clear, or `Sync.full`. Tunables: `D.STAGE_PLACEMENT_LERP` in `lib/npc_gameboard_data.ttslua`.

**Stage figurine yaw:** `Gameboard.stageFigurineWorldYawDeg` = STAGE_BOARD Y + board-relative token yaw + **`D.STAGE_FIGURINE_YAW_OFFSET_DEG` (180)** for `Figurine_Custom` cutout orientation vs control-board tiles.

**Apply figurine placement (debug):** Figurines move via `Gameboard.worldFromUv`: **X/Z** from **STAGE_BOARD** u,v; **Y** from ring `groundLevel` when set (**absolute world Y**). World Y rotation uses `Gameboard.stageFigurineWorldYawDeg(placement.yaw)` = **STAGE_BOARD** Y + board-relative token yaw + **180°** figurine cutout offset (`D.STAGE_FIGURINE_YAW_OFFSET_DEG`).

Config: `D.CONTROL_BOARD_SNAP` in `lib/npc_gameboard_data.ttslua` — elliptical rings with **absolute** `innerRingMaxU/V` and `outerRingMaxU/V`, and per-ring `snapGroups` (`num`, `angleDelta`, `rays`, optional per-ring `origin`, optional `groundLevel`, optional `radialStagger` in **STAGE** world XZ inches, optional `validSnaps = { minU, maxU, minV, maxV }` to drop candidates outside that u/v box, optional **`defaultLightMode`** `"OFF"` or `"STANDARD"`). Snaps whose `(u,v)` fall outside `[0,1]` are omitted. Per-ring `validSnaps` further trims dense rings (e.g. center/mid bands only). **Satellite rings** (per-ring `origin` ≠ master `origin`) rotate so the anchor snap (`familyK = 0`) lies on the u/v line from the ring origin toward the master origin (outskirts six-packs face inward, not a fixed board direction). `DEBUG.previewControlBoardSnapCount()` prints the filtered total. Each snap yaws toward the master `origin` and is tagged **`npc_control_token`** and **`pc_control_token`** (`D.CONTROL_BOARD_SNAP_TAGS`) so NPC or PC control tiles can snap anywhere on the minimap (including seat row and polar rings).

**Seat-assignment row (TOR-180):** `D.CONTROL_BOARD_SEAT_ROW` adds nine snaps at **`v = 0.12`**, **`u` from 0.05 to 0.35** (center ≈ 0.2; L→R: NPC4, NPC2, Purple, Pink, Red, Orange, Brown, NPC1, NPC3). Catalog entries use `snapKind = "seat"`. **CONTROL_BOARD** is workshop-rotated **Y=180°**; seat-row snap rotation is **board-local**, so **`snapYawOffsetDeg = 180`** on those nine snaps (not polar toward-origin yaw) yields upright tokens in world space — manual drops rely on **`rotation_snap` only** (TOR-200). **PC columns** (`Purple`…`Brown`) also use **`pcSnapZDeg = 180`** on **Z** so `rotation_snap` is not upside-down; **NPC columns** stay Z=0. **Seat-row scale (TOR-199):** tokens on seat snaps use **`D.NPC_CONTROL_TOKEN_SCALE_SEAT_ROW`** `{0.7, 1, 0.7}`; polar/palette/off-board revert to **`D.NPC_CONTROL_TOKEN_SCALE_POLAR`** `{0.2, 1, 0.2}` on pick-up, off-board drop, polar placement, and palette park. Homeland token mirror/reconcile uses `mirrorSeatRowControlToken` (catalog `yawDeg` + narrative Z flip). **NPC columns** drive `occupiedNPCSlots` and narrative presence on Apply (token **face-up** = present, **face-down** = absent — not `npcLightMode`). **PC columns** pin a color-bound `pc_control_token` (`pcToken:<Color>`); its flip drives `seatSlots[color].isPresent` on Apply, and reconcile mirrors the flip back to match state (TOR-236; see § Token contract). Polar scan / `placements` ignore seat snaps. **Empty seat snap + token on a polar snap:** Apply **does not** clear `occupiedNPCSlots` (homeland retained for Clear / Step Three re-seat — see NPC Reconciler Procedure Step Two case 4). **True unassign:** empty seat snap and **no** polar placement for that character on the same Apply (token must be on the minimap face at a polar snap — off-board / in-air tokens do not count). **Vacate off-board:** drag token completely off CONTROL_BOARD (not palette), Apply → `unseatNpc`, drop stale `placements` for that character, park token on **CONTROL_BOARD_PALETTE**, `Sync.npcs` steps **1–5** (seat teardown + layout/components). Clear parks stage tokens but **preserves** tokens on seat snaps and runs `Gameboard.relocateHomelandSeatTokensAfterClear`. Reconcile mirrors assigned homeland tokens onto their seat snap with presence flip.

**Palette-drop `defaultLightMode` (TOR-172):** `onObjectPickUp` → `Gameboard.onNpcControlTokenPickUp` records tokens picked up on **CONTROL_BOARD_PALETTE**. On the next drop onto **CONTROL_BOARD**, after snap settle, `Gameboard.applySnapGroupDefaultLightOnPaletteDrop` reads the matched ring’s `defaultLightMode`, sets token Z flip (`STANDARD` = face-up, `OFF` = face-down; re-applied after `rotation_snap` settle), and if that character is already on **STAGE_BOARD**, calls `NPCS.applyControlTokenLightMode` for a live spotlight preview. **Anchor spread:** siblings moved from the **palette** onto family snaps get the same ring flip immediately after programmatic placement (console: `[Gameboard] anchor spread palette light: …`). **Does not** run on ring-to-ring moves, state sync, or `reconcileControlBoardFromState`. **Apply** still derives `npcLightMode` from flip via `scanControlBoardTokens` / `tokenLightModeFromFlip`. Console: `[Gameboard] palette drop: ring N defaultLightMode …` or `palette drop defaultLightMode skipped: …`.

**Hold-to-sweep stage spotlight preview (TOR-238):** Transient “who’s speaking” cue — **not** game-phase Spotlight (TOR-98), **not** persisted `npcLightMode` / `spotlightPress`. On load, Global registers `addHotkey("Spotlight NPC (hold)", …, triggerOnKeyUp=true)`; bind the key under **Options → Game → Game Keys**. **Storyteller steam player only** (`isStorytellerSteamPlayer` in the hotkey callback). TTS executes the world preview in host mod Lua. While the key is held, poll `Player[color].getHoverObject()` every 80ms; when hover is an `npc_control_token` on the CONTROL_BOARD minimap face with a row in `sessionScene.npcWorld.placements` (on-stage, not seated at table), apply:

| Target | Behavior |
| --- | --- |
| Stage figurine pooled spotlight | `NPCS.buildResolvedLightModeTable(characterKey, "SPOTLIGHT")` via `L.applyTransientLightMode` (restores prior `gameState.lights[ref]` immediately — preview does not save) |
| Storyteller board indicator (`G.GUIDS.STORYTELLER_SPOTLIGHT`, registry `storytellerSpotlight`) | Moves to token **X/Z** (Y unchanged); `STANDARD` with `enabled = true`; default **OFF** when not previewing |

Key-up or hover leaving tokens clears both previews (figurine returns to live `rec.npcLightMode` appearance). Reconcile / other lighting may stomp the preview mid-hold (intentional). Entry: `Gameboard.onControlBoardSpotlightHotkey`. **Multiclient:** solo host verified; join-client ST hotkey → host fan-out not implemented (P10 gap).

**Anchor snap group spread:** When a grouped `npc_control_token` is dropped on CONTROL_BOARD, Global `onObjectDrop` → `Gameboard.onNpcControlTokenDropped` (waits up to 1s until the token’s **nearest** catalog snap within fuzziness is the **anchor** of a ray family — avoids firing on a sibling snap while the token is still settling). If **all** of: (1) token resolves to a non-blacklisted palette group via `Palette.resolveGroupForCharacterKey`, (2) drop lands on the **anchor** snap of a ray family (`familyK == 0`, center of `num`/`angleDelta` cluster — **rings with `num = 1` have no sibling snaps**), (3) every **other** snap in that family is empty — then remaining group members **not on CONTROL_BOARD** (palette tokens count as off-board) are snapped onto sibling family slots in **slotIndex** order (lowest first), with snaps assigned **center-out on the minimap** (nearest sibling ring first, then **screen-left before screen-right** at each distance — uses board-local XZ vs the anchor, not raw `familyK` sign, which can invert on the tile) until the family is full. With `fiveKeys` data, left-to-right on the board should be slot indices **4, 2, 1, 3, 5** (farLeft, nearLeft, anchor, nearRight, farRight). Snap match uses **nearest** world XZ distance in the snap catalog (not first snap in install order). Console: `[Gameboard] anchor spread: placed N…` or `anchor spread skipped: <reason>` (with `snap=` / `familyK=` on `not_anchor`). Manual test: `lua print(require("core.npc_gameboard").tryAnchorFamilyGroupSpread(getObjectFromGUID("…")))`.

## Token palette (CONTROL_BOARD_PALETTE)

Workshop object **CONTROL_BOARD_PALETTE** (typical scale `{5, 1, 10}` — wide on X, tall on Z). Parking uses a **20×40** logical grid; **physical snaps** are installed only at token parking slots (one per rostered character on the palette), not all 800 cells. Object script:

```lua
require("objects.npc_control_board_palette")
```

`lib/npc_control_board_palette.ttslua` installs snaps on palette `onLoad`; **`syncTokensToPalette`** is explicit (Clear, debug spawn) — it parks only tokens **without** a row in `sessionScene.npcWorld.placements`. On-stage keys are mirrored onto CONTROL_BOARD by `reconcileControlBoardFromState`. **Parking positions** map columns across the tile width and **rows** use the live layout row count from `buildTokenSnapAssignments`, evenly spaced on v — not the full 40-row logical grid. **`parkingEdgePadding`** (default **0.06**, plus `uMargin`/`vMargin`) insets snap centers from the marble edges so token discs do not overhang corners; tune in `D.CONTROL_BOARD_PALETTE_SNAP` if chips still clip. **`parkingSnapLocalZOffset`** (default **0.1** board-local +Z, ≈ half polar token diameter) nudges parking snaps toward vMax so group labels can sit beneath tokens. Half-extents come from bounds (same projection as the control-board minimap). If vertical spacing is too wide, shorten palette **Z** scale; **Save & Play** then `lua require("core.npc_gameboard").syncTokensToPalette()`. Snap yaw uses `snapYawOffsetDeg` (default **180**). Minimap polar snaps use **toward-origin** yaw + `D.CONTROL_BOARD_SNAP.snapYawOffsetDeg` (default **0**). **`syncTokensToPalette`** and **`parkNpcTokenOnPalette`** set token rotation **face-up** (board-local Z=0, matching palette snap rotation) so parked tokens show **lights-on** art; rotation is re-applied after snap settle when `rotation_snap` overrides the first pass. Groups in `D.PALETTE_GROUP_BLACKLIST` (currently `princesCourt`) are skipped when picking a character’s palette group. One surviving group → that group; several survivors → lexicographically smallest non-blacklisted `groupId`. Layout: members adjacent in slot order, whole group moves to the next row when a row would wrap, **one empty snap** between groups (not a full blank row), first token at top-left. Token keys from GM notes use the same `npcToken:<key>` capture as the control board (stops at comma or newline).

Manual refresh / IDE tuning (after Save & Play):

```lua
lua DEBUG.previewControlBoardSnapCount()
lua DEBUG.installNpcControlBoardSnaps()
lua DEBUG.installNpcControlBoardSnaps({ config = { ... full CONTROL_BOARD_SNAP table ... } })
```

See [Generating Snap Points For Control Board.md](./Generating%20Snap%20Points%20For%20Control%20Board.md).

## Buttons

- **Apply** / **Clear** — scan board → state → `Sync.npcs` (or clear + palette park); Storyteller / Black only
- **Snaps** — toggle `controlBoardSnapsEnabled` (polar snap grid on/off)
- **Save** — scan CONTROL_BOARD token UV layout → `sessionScene.npcWorld.placements` only (no `Sync.npcs` / no figurine moves); board → state, paired with **Load**
- **Lock** — toggle `sessionScene.npcWorld.layoutLock`; when true, automatic reconcile skips token mirror (markers still reconcile); XmlUI shows **Locked** / **Unlocked**
- **Load** — mirror persisted placements (+ seat-row tokens) onto CONTROL_BOARD tokens; bypasses layout lock (explicit restore from state)

Debug: `DEBUG.dumpNpcPlacements()` in TTS console.

## Token images (Custom UI upload)

Gameboard control tokens are **Custom_Tile** objects — **circle** shape (`Type = 2`), **thickness 0.1**, two-sided (`image` + `image_bottom` / save `ImageURL` + `ImageSecondaryURL`). `DEBUG.spawnNpcControlBoardTokens` sets these in spawn data **and** calls `setCustomObject` + `reload` after spawn (TTS often ignores `CustomTile` on `spawnObjectData` alone). `DEBUG.applyNpcControlTokenHostedImages` applies the same shape to existing tokens. They flip with the normal **Flip** key (`Object.flip()`); there is no `is_face_up` on tiles — OFF vs STANDARD is inferred from **Z rotation** (0 = face up / STANDARD, 180 = face down / OFF). Board-plane orientation is **Y rotation** only and is independent of flip.

**Palette spawn:** Save & Play → `lua DEBUG.spawnNpcControlBoardTokens()` — spawns tokens then `Gameboard.syncTokensToPalette()` to group slots on **CONTROL_BOARD_PALETTE**.

**Upload batch only** uses **Custom_Token** (single `image` per object — correct for Cloud upload, not for the minimap).

Source WEBPs:

**`assets/images/NPCs/`** — per character: `<characterKey>.webp`, `<characterKey>Back.webp`, `tokenFront_<characterKey>.webp`, `tokenBack_<characterKey>.webp` (see `.dev/custom-ui-assets/README.md` § NPC unified groups). Legacy split folder: `assets/images/NPC Tokens/` with `tokenFront_*` / `tokenBack_*` only.

Pipeline (full detail: [`.dev/custom-ui-assets/README.md`](../custom-ui-assets/README.md)):

**Preferred (NPC unified groups):** `npm run custom-ui-assets:pipeline-npc-groups` — inject → manifest → TTS upload → merge → extract → **`apply-npc-hosted-world`** (patches figurines + creates/updates control-board tokens in save JSON with hosted URLs). Reload save in TTS.

**Legacy token-only folder:**

1. `npm run custom-ui-assets:manifest-npc-tokens`
2. Cloud upload temps → merge → extract → `npm run custom-ui-assets:apply-npc-hosted-world` (or `lua DEBUG.spawnNpcControlBoardTokens()` + `applyNpcControlTokenHostedImages()`)

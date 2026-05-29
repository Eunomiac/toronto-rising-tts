<!-- markdownlint-disable -->

# Storyteller Gameboard Control

Physical **STAGE_BOARD** (hidden world floor) + **CONTROL_BOARD** (GM table minimap) replace XML area placement for NPC staging. Code: `core/npc_gameboard.ttslua`, `lib/npc_gameboard_data.ttslua`, `objects/npc_control_board.ttslua`.

## Contract

| Surface | Role |
| --- | --- |
| `sessionScene.npcWorld.placements` | Authority: `{ characterKey = { u, v, yaw, npcLightMode } }` (0–1 on stage board) |
| **Apply** | Scan `npc_control_token` on CONTROL_BOARD minimap only (**not** on `CONTROL_BOARD_PALETTE`) → write `placements` → `Sync.npcs` |
| **Clear** | Double-click → empty `placements`, `Gameboard.syncTokensToPalette()` (group layout from `npcs_data`), `Sync.npcs` |
| Reconcile | `NPCS.reconcileAllFromState` → figurines; mirror board unless `layoutLock` |

Legacy `byArea` still reconciles when `placements` does not claim a character (until Phase C retires areas).

## Coordinate mapping (STAGE ↔ CONTROL)

Both boards are **different objects** (position, rotation, scale). Map coordinates are **not** shared world XZ between boards.

| Step | API | Meaning |
| --- | --- | --- |
| World playfield → map | `Gameboard.uvFromWorld(worldPos)` | Project through **STAGE_BOARD** (`positionToLocal` → normalized `u,v` in 0–1 using **local** half-extents from bound corners, not `getBounds().size`). Fallback: `C` table extents when stage board is missing. |
| Map → world figurine | `Gameboard.worldFromUv(u, v)` | **STAGE_BOARD** `positionToWorld` at that `u,v`. |
| Map → control minimap | `Gameboard.worldOnControlBoard(board, u, v)` | Same `u,v` on **CONTROL_BOARD** via `positionToWorld` (TTS transform handles rotation/scale). |

**UV frame:** Custom_Tile boards use `positionToLocal` / `positionToWorld` in **object-local** units (≈ ±0.5 on X/Z for a unit tile). Do **not** multiply or divide UV by `getBounds().size` (world units) — that placed snaps/markers in a huge arc off the minimap. Half-extents are derived by projecting world bound corners through `positionToLocal`.

**Do not** call `positionToLocal` on CONTROL_BOARD with a playfield world position (e.g. `C.Tables[].centerPoint` at z≈50). That produced markers in a huge arc off the minimap and placed the table marker at the real table instead of on the control board.

Table/seat markers: compute playfield world XZ (table `centerPoint`; components via `activePosition`; seats via **1-based** segment index from `playerToPositionMap` and `angleSegmentOne` — same azimuth as `rotational-seat-layout` — × radius from `referenceHandPosition`), convert with `uvFromWorld`, place with `worldOnControlBoard`. NPC tokens on the control board use the same `u,v` as stage figurines after Apply.

**NPC seat markers:** Shown on the minimap only when `seatLayout.occupiedNPCSlots[npcSeat]` is a character key (not `false`) and the active table defines that seat in `playerToPositionMap`. Empty slots are **locked** and parked at world **Y = -200** (`MARKER_STASH_WORLD_Y`, slight X offset per slot so stashes do not stack).

**Marker scale:** For each minimap marker, read `getScale()` on the playfield object it mimics (`C.Tables` table/leaf GUID, or `G.GetThroneGUID` seat chair for PC/NPC seats), then set marker scale to **source ÷ 40** on all three axes (`DATA.MINIMAP_SCALE_DIVISOR`). Do not use nearest `*Object` tag scan for scale — that often hits a scale-1 helper instead of `SEAT_CHAIR_*`.

**Marker rotation:** `marker.setRotation(source.getRotation() + board.getRotation())` per euler axis (playfield mimic + CONTROL_BOARD). Table uses `C.Tables[tableKey].guid`; seats use `G.GetThroneGUID`. Workshop stash euler on markers is overwritten every `reconcileControlBoardFromState` — if rotation still matches the save default, the bundled script was not Save & Play’d.

**Marker height:** `MINIMAP_SURFACE_LOCAL_Y` (default 0.18) + optional `MINIMAP_TABLE_EXTRA_LOCAL_Y` (0.06) for `gameboard_table` markers so thick table meshes sit on the control tile, not clipped inside it.

**Player visibility:** All `gameboard_*` markers and `npc_control_token` tiles use `setInvisibleTo(C.PlayerColors)` — hidden from every seated PC (Brown–Purple); Storyteller (Black) and spectators (White/Grey) still see them. Reconcile and spawn paths call `Gameboard.setHiddenFromPlayerColors`.

**Marker lock:** `gameboard_table`, `gameboard_table_component`, `gameboard_pc_seat`, and `gameboard_npc_seat` objects are `setLock(true)` on reconcile so minimap pieces do not collide and drift. `npc_control_token` tiles stay unlocked for drag-to-snap + Apply.

## Workshop tags

| Tag | GM notes example |
| --- | --- |
| `npc_control_token` | `npcToken:myleneHamelin` |
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
| `objects/npc_control_board.ttslua` | Object script: `onLoad` → 3D buttons + polar snaps; `click_apply` / `click_clear` → Global |
| `ui/objects/npc_control_board.xml` | Object XmlUI (same `click_*` handlers) |

**TTS Editor — Script** (one line):

```lua
require("objects.npc_control_board")
```

**TTS Editor — XML**:

```xml
<Include src="ui/objects/npc_control_board.xml" />
```

The extension may mirror these under `.tts/objects/CONTROL_BOARD.bea29a.*` (gitignored) when the object is named with GUID `bea29a`.

**Workshop:** tag the tile `npc_control_board` (optional). GUID `bea29a` in `lib/guids.ttslua`.

**In-game buttons:** Five small **3D** `createButton` labels in one row along the **bottom-left** of the tile (Apply → Clear → Read → Lock → Load), coplanar with the minimap (`MINIMAP_SURFACE_LOCAL_Y` + small lift). Label rotation is object-local `{180, 0, 0}` (trial for readable text on a yaw≈180° tile; `{0, 180, 0}` tilted edge-on). XmlUI is the object’s XML panel when selected. After pulling repo stubs, **Save & Play** so the save bundles script + XML onto `bea29a`. `reconcileControlBoardFromState` calls `Gameboard.ensureControlBoardObjectCallbacks` then `ensureControlBoardObjectUi` each sync (layout version in `objects/npc_control_board_ui.ttslua` forces reinstall).

**Apply click error (`click_apply` is not a function):** The save often has **empty** `LuaScript` on `bea29a` while Global still installs 3D buttons that reference `click_apply` on the board object. After **Save & Play** with the bundled stub, handlers live in the object script. Until then, the first `Sync.npcs` / reconcile injects a minimal `click_*` script via `setLuaScript` (`Gameboard.ensureControlBoardObjectCallbacks`). Console: `lua GlobalGameboardApply()` / `lua GlobalGameboardClearClick({ player_color = "Black" })` (double-click Clear confirm).

**Palette vs activated:** Tokens on **CONTROL_BOARD_PALETTE** are inactive storage; **Apply** ignores them until a token is on a CONTROL_BOARD polar snap. **Clear** runs `Palette.syncTokensToPalette` (group order from `lib/npcs_data` `characters[].groups`, minus `PALETTE_GROUP_BLACKLIST` e.g. `princesCourt`).

**Console fallback:** `lua GlobalGameboardApply()` / `lua GlobalGameboardClearClick({ player_color = "Black" })` (Storyteller only; Clear needs two calls within 5s, same as the button).

Config: `D.CONTROL_BOARD_SNAP` in `lib/npc_gameboard_data.ttslua` — elliptical rings with **absolute** `innerRingMaxU/V` and `outerRingMaxU/V`, and per-ring `snapGroups` (`num`, `angleDelta`, `rays`). Default install prints **136** snaps (`4×1 + 12×3 + 16×5 + 20×1`). Each snap yaws toward `origin` and is tagged `npc_control_token`.

## Token palette (CONTROL_BOARD_PALETTE)

Workshop object **CONTROL_BOARD_PALETTE** (typical scale `{5, 1, 10}` — wide on X, tall on Z). **20×40** snap grid (`800` points). Object script:

```lua
require("objects.npc_control_board_palette")
```

`lib/npc_control_board_palette.ttslua` installs snaps and parks tokens by **coterie group** from `lib/npcs_data` (`groups.fiveKeys = 1`, etc.). Groups in `D.PALETTE_GROUP_BLACKLIST` (currently `princesCourt`) are skipped when picking a character’s palette group. One surviving group → that group; several survivors → first non-blacklisted entry from `pairs()`. Layout: members adjacent in slot order, whole group moves to the next row when a row would wrap, one empty snap between groups, first token at top-left.

Manual refresh / IDE tuning (after Save & Play):

```lua
lua DEBUG.previewControlBoardSnapCount()
lua DEBUG.installNpcControlBoardSnaps()
lua DEBUG.installNpcControlBoardSnaps({ config = { ... full CONTROL_BOARD_SNAP table ... } })
```

See [Generating Snap Points For Control Board.md](./Generating%20Snap%20Points%20For%20Control%20Board.md).

## Buttons (Phase A wired)

- **Apply** / **Clear** — live (3D buttons + XmlUI; Storyteller / Black only)
- **Read** / **Lock** / **Load** — Phase B (stubs broadcast “not wired yet”)

Debug: `DEBUG.dumpNpcPlacements()` in TTS console.

## Token images (Custom UI upload)

Gameboard control tokens are **Custom_Tile** objects — **circle** shape (`Type = 2`), **thickness 0.1**, two-sided (`image` + `image_bottom` / save `ImageURL` + `ImageSecondaryURL`). `DEBUG.spawnNpcControlBoardTokens` sets these in spawn data **and** calls `setCustomObject` + `reload` after spawn (TTS often ignores `CustomTile` on `spawnObjectData` alone). `DEBUG.applyNpcControlTokenHostedImages` applies the same shape to existing tokens. They flip with the normal **Flip** key (`Object.flip()`); there is no `is_face_up` on tiles — OFF vs STANDARD is inferred from X rotation.

**Palette spawn:** Save & Play → `lua DEBUG.spawnNpcControlBoardTokens()` — spawns tokens then `Gameboard.syncTokensToPalette()` to group slots on **CONTROL_BOARD_PALETTE**.

**Upload batch only** uses **Custom_Token** (single `image` per object — correct for Cloud upload, not for the minimap).

Source WEBPs:

**`assets/images/NPC Tokens/`** — `tokenFront_<characterKey>.webp`, `tokenBack_<characterKey>.webp`

Pipeline (full detail: [`.dev/custom-ui-assets/README.md`](../custom-ui-assets/README.md)):

1. `npm run custom-ui-assets:manifest-npc-tokens`
2. **Gameboard tokens (61, paired front/back):** Save & Play → `lua DEBUG.spawnNpcControlBoardTokens()` — spawns flip tiles with tag `npc_control_token` and GM notes `npcToken:<characterKey>`, then parks on **CONTROL_BOARD_PALETTE**. Uses `file:///` from the manifest until hosted URLs exist.
3. **Cloud upload (122 single-face temp tokens):** `lua DEBUG.spawnNpcTokenUploadBatch({ columns = 12, gap = 2, startY = 3 })` → Cloud Manager → **Upload All Loaded Files** → save game → `lua DEBUG.clearCustomUiUploadTokens()`
4. Merge with `npc-token-manifest.json`, then `npm run custom-ui-assets:extract-npc-token-urls`
5. Save & Play → `lua DEBUG.applyNpcControlTokenHostedImages()` — refreshes existing control-board tokens from `lib/npc_token_hosted_urls` (or re-run `spawnNpcControlBoardTokens` after extract)

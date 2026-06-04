<!-- markdownlint-disable -->

# Storyteller Gameboard Control

Physical **STAGE_BOARD** (hidden world floor) + **CONTROL_BOARD** (GM table minimap) replace XML area placement for NPC staging. Code: `core/npc_gameboard.ttslua`, `lib/npc_gameboard_data.ttslua`, `objects/npc_control_board.ttslua`.

## Contract

| Surface | Role |
| --- | --- |
| `sessionScene.npcWorld.placements` | Authority: `{ characterKey = { u, v, yaw, npcLightMode } }` (0–1 on stage board). **`yaw` is derived** from master `origin` at `u,v` (`Gameboard.placementBoardRelYawDeg`); token Y rotation is ignored. |
| **Apply** | Scan polar snaps → `placements` (u,v, yaw, `npcLightMode` from flip). Scan **seat row** (TOR-180) → `seatLayout.occupiedNPCSlots` + `seatSlots.isPresent` (face-up = present; face-down = absent). → `Sync.npcs` |
| **Clear** | First click: recover stray tokens; arm 5s confirm. Second click → empty `placements`, park stage tokens on palette (**seat-row tokens stay**), `relocateHomelandSeatTokensAfterClear`, `Sync.npcs` (Step Three re-seats) |
| Reconcile | `NPCS.reconcileAllFromState` → figurines face **master `origin`** at u,v (`CONTROL_BOARD_SNAP.origin`); CONTROL_BOARD markers always; **token mirror** pulls tagged tokens from palette/board to exact placement u,v (not snap-only) when `layoutLock` is false |

Legacy **`byArea` in import JSON** is converted to **`placements` on import** (`lib/npc_placements_convert.ttslua`). Reconcile uses **`placements` only**; `byArea` in live state is normalized on `S.validateState` or via `npm run npc-placements:migrate-byarea`.

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

**Table leaf / component markers (`gameboard_table_component`):** Same activation rule as playfield leaves in `lib.rotational-seat-layout` — shown only when the active table matches **and** `occupiedNPCSlots[component.usedBy]` is a character key. Inactive leaves are stashed at **Y = -200**. When active, each leaf marker gets the **same CONTROL_BOARD position, rotation, and scale** as the parent **`gameboard_table`** marker (models are authored table-relative on the playfield). Table A mapping in `C.Tables`: **NPC1 → Table Leaf Near Right**, **NPC2 → Table Leaf Near Left**, **NPC3 → Table Leaf Far Right**, **NPC4 → Table Leaf Far Left**.

**Marker scale:** For each minimap marker, read `getScale()` on the playfield object it mimics (`C.Tables` table/leaf GUID, or `G.GetThroneGUID` seat chair for PC/NPC seats), then set marker scale to **source ÷ 40** on all three axes (`DATA.MINIMAP_SCALE_DIVISOR`). Do not use nearest `*Object` tag scan for scale — that often hits a scale-1 helper instead of `SEAT_CHAIR_*`.

**Marker rotation:** `marker.setRotation(source.getRotation() + board.getRotation())` per euler axis (playfield mimic + CONTROL_BOARD). Table uses `C.Tables[tableKey].guid`; seats use `G.GetThroneGUID`. Workshop stash euler on markers is overwritten every `reconcileControlBoardFromState` — if rotation still matches the save default, the bundled script was not Save & Play’d.

**Marker height:** `MINIMAP_SURFACE_LOCAL_Y` (default 0.18) + optional `MINIMAP_TABLE_EXTRA_LOCAL_Y` (0.06) for `gameboard_table` markers so thick table meshes sit on the control tile, not clipped inside it.

**Player visibility:** All `gameboard_*` markers and `npc_control_token` tiles use `setInvisibleTo(C.PlayerColors)` — hidden from every seated PC (Brown–Purple); Storyteller (Black) and spectators (White/Grey) still see them. CONTROL_BOARD toolbar XmlUI uses `visibility="Black|Host"` on `gb_root` (`ui/objects/npc_control_board.xml`). Reconcile and spawn paths call `Gameboard.setHiddenFromPlayerColors`.

**Marker lock:** `gameboard_table`, `gameboard_table_component`, `gameboard_pc_seat`, and `gameboard_npc_seat` objects are `setLock(true)` on reconcile so minimap pieces do not collide and drift. `npc_control_token` tiles stay unlocked for drag-to-snap + Apply.

**Layout lock:** When `sessionScene.npcWorld.layoutLock` is true, **token** positions on CONTROL_BOARD are not overwritten from state; **table/seat/component markers** still reconcile (Table A leaves follow `occupiedNPCSlots` for their `usedBy` seat).

**Seat ↔ stage (TOR-178):** Apply with a placement for a seated NPC keeps `seatLayout.occupiedNPCSlots` (homeland seat). Clear / empty `placements` re-seats via `NPCS.reconcileAllFromState` Step Three — not palette/preload as the end state. Figurine uses `figurine.scale` on stage and `figurine.seatedScale` at the table (`image_scalar`). Table leaf markers still follow `occupiedNPCSlots` until phase C (hide leaves while stage-bound).

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

**Palette vs activated:** Tokens on **CONTROL_BOARD_PALETTE** are inactive storage; **Apply** ignores them until a token is on a CONTROL_BOARD polar snap. **Clear** runs `Palette.syncTokensToPalette` (group order from `lib/npcs_data` `characters[].groups`, minus `PALETTE_GROUP_BLACKLIST` e.g. `princesCourt`).

**Console fallback:** `lua GlobalGameboardApply()` / `lua GlobalGameboardClearClick({ player_color = "Black" })` (Storyteller only; first Clear call recovers stray tokens + arms confirm; second call within 5s completes Clear). Manual stray recovery: `lua print(require("core.npc_gameboard").recoverStrayNpcTokensToPalette())`.

**Apply performance:** When scanned token placements match persisted `sessionScene.npcWorld.placements`, Apply skips figurine reconcile (logs `placements unchanged`). Changed Apply runs a narrow `Sync.npcs` pass (steps **1 + 5** only, skips bulk area/preload repark and seat steps **2–4**). `reconcileControlBoardFromState` skips marker/token mirror when its fingerprint is unchanged. CONTROL_BOARD XmlUI install no longer calls `clearButtons()` every reconcile when XML is already loaded.

**Stage figurine yaw:** `Gameboard.stageFigurineWorldYawDeg` = STAGE_BOARD Y + board-relative token yaw + **`D.STAGE_FIGURINE_YAW_OFFSET_DEG` (180)** for `Figurine_Custom` cutout orientation vs control-board tiles.

**Apply figurine placement (debug):** Figurines move via `Gameboard.worldFromUv`: **X/Z** from **STAGE_BOARD** u,v; **Y** from ring `groundLevel` when set (**absolute world Y**). World Y rotation uses `Gameboard.stageFigurineWorldYawDeg(placement.yaw)` = **STAGE_BOARD** Y + board-relative token yaw + **180°** figurine cutout offset (`D.STAGE_FIGURINE_YAW_OFFSET_DEG`).

Config: `D.CONTROL_BOARD_SNAP` in `lib/npc_gameboard_data.ttslua` — elliptical rings with **absolute** `innerRingMaxU/V` and `outerRingMaxU/V`, and per-ring `snapGroups` (`num`, `angleDelta`, `rays`, optional per-ring `origin`, optional `groundLevel`, optional `radialStagger` in **STAGE** world XZ inches, optional `validSnaps = { minU, maxU, minV, maxV }` to drop candidates outside that u/v box, optional **`defaultLightMode`** `"OFF"` or `"STANDARD"`). Snaps whose `(u,v)` fall outside `[0,1]` are omitted. Per-ring `validSnaps` further trims dense rings (e.g. center/mid bands only). **Satellite rings** (per-ring `origin` ≠ master `origin`) rotate so the anchor snap (`familyK = 0`) lies on the u/v line from the ring origin toward the master origin (outskirts six-packs face inward, not a fixed board direction). `DEBUG.previewControlBoardSnapCount()` prints the filtered total. Each snap yaws toward the master `origin` and is tagged `npc_control_token`.

**Seat-assignment row (TOR-180):** `D.CONTROL_BOARD_SEAT_ROW` adds nine snaps at **`v = 0.15`** (L→R: NPC4, NPC2, Purple, Pink, Red, Orange, Brown, NPC1, NPC3). Catalog entries use `snapKind = "seat"`. **NPC columns** drive `occupiedNPCSlots` and narrative presence on Apply (token **face-up** = present, **face-down** = absent — not `npcLightMode`). **PC columns** are layout-only. Polar scan / `placements` ignore seat snaps. Clear parks stage tokens but **preserves** tokens on seat snaps and runs `Gameboard.relocateHomelandSeatTokensAfterClear`. Reconcile mirrors assigned homeland tokens onto their seat snap with presence flip.

**Palette-drop `defaultLightMode` (TOR-172):** `onObjectPickUp` → `Gameboard.onNpcControlTokenPickUp` records tokens picked up on **CONTROL_BOARD_PALETTE**. On the next drop onto **CONTROL_BOARD**, after snap settle, `Gameboard.applySnapGroupDefaultLightOnPaletteDrop` reads the matched ring’s `defaultLightMode`, sets token Z flip (`STANDARD` = face-up, `OFF` = face-down; re-applied after `rotation_snap` settle), and if that character is already on **STAGE_BOARD**, calls `NPCS.applyControlTokenLightMode` for a live spotlight preview. **Anchor spread:** siblings moved from the **palette** onto family snaps get the same ring flip immediately after programmatic placement (console: `[Gameboard] anchor spread palette light: …`). **Does not** run on ring-to-ring moves, state sync, or `reconcileControlBoardFromState`. **Apply** still derives `npcLightMode` from flip via `scanControlBoardTokens` / `tokenLightModeFromFlip`. Console: `[Gameboard] palette drop: ring N defaultLightMode …` or `palette drop defaultLightMode skipped: …`.

**Anchor snap group spread:** When a grouped `npc_control_token` is dropped on CONTROL_BOARD, Global `onObjectDrop` → `Gameboard.onNpcControlTokenDropped` (waits up to 1s until the token’s **nearest** catalog snap within fuzziness is the **anchor** of a ray family — avoids firing on a sibling snap while the token is still settling). If **all** of: (1) token resolves to a non-blacklisted palette group via `Palette.resolveGroupForCharacterKey`, (2) drop lands on the **anchor** snap of a ray family (`familyK == 0`, center of `num`/`angleDelta` cluster — **rings with `num = 1` have no sibling snaps**), (3) every **other** snap in that family is empty — then remaining group members **not on CONTROL_BOARD** (palette tokens count as off-board) are snapped onto sibling family slots in **slotIndex** order (lowest first), with snaps assigned **center-out on the minimap** (nearest sibling ring first, then **screen-left before screen-right** at each distance — uses board-local XZ vs the anchor, not raw `familyK` sign, which can invert on the tile) until the family is full. With `fiveKeys` data, left-to-right on the board should be slot indices **4, 2, 1, 3, 5** (farLeft, nearLeft, anchor, nearRight, farRight). Snap match uses **nearest** world XZ distance in the snap catalog (not first snap in install order). Console: `[Gameboard] anchor spread: placed N…` or `anchor spread skipped: <reason>` (with `snap=` / `familyK=` on `not_anchor`). Manual test: `lua print(require("core.npc_gameboard").tryAnchorFamilyGroupSpread(getObjectFromGUID("…")))`.

## Token palette (CONTROL_BOARD_PALETTE)

Workshop object **CONTROL_BOARD_PALETTE** (typical scale `{5, 1, 10}` — wide on X, tall on Z). Parking uses a **20×40** logical grid; **physical snaps** are installed only at token parking slots (one per rostered character on the palette), not all 800 cells. Object script:

```lua
require("objects.npc_control_board_palette")
```

`lib/npc_control_board_palette.ttslua` installs snaps on palette `onLoad`; **`syncTokensToPalette`** is explicit (Clear, debug spawn) — it parks only tokens **without** a row in `sessionScene.npcWorld.placements`. On-stage keys are mirrored onto CONTROL_BOARD by `reconcileControlBoardFromState`. **Parking positions** map columns across the tile width and **rows** use the live layout row count from `buildTokenSnapAssignments`, evenly spaced on v — not the full 40-row logical grid. **`parkingEdgePadding`** (default **0.06**, plus `uMargin`/`vMargin`) insets snap centers from the marble edges so token discs do not overhang corners; tune in `D.CONTROL_BOARD_PALETTE_SNAP` if chips still clip. Half-extents come from bounds (same projection as the control-board minimap). If vertical spacing is too wide, shorten palette **Z** scale; **Save & Play** then `lua require("core.npc_gameboard").syncTokensToPalette()`. Snap yaw uses `snapYawOffsetDeg` (default **180**). Minimap polar snaps use **toward-origin** yaw + `D.CONTROL_BOARD_SNAP.snapYawOffsetDeg` (default **0**). **`syncTokensToPalette`** and **`parkNpcTokenOnPalette`** set token rotation **face-down** (board-local Z=180, matching palette snap rotation) so board `tokenLightModeFromFlip` reads **OFF** until the token is placed on CONTROL_BOARD; rotation is re-applied after snap settle when `rotation_snap` overrides the first pass. Groups in `D.PALETTE_GROUP_BLACKLIST` (currently `princesCourt`) are skipped when picking a character’s palette group. One surviving group → that group; several survivors → lexicographically smallest non-blacklisted `groupId`. Layout: members adjacent in slot order, whole group moves to the next row when a row would wrap, **one empty snap** between groups (not a full blank row), first token at top-left. Token keys from GM notes use the same `npcToken:<key>` capture as the control board (stops at comma or newline).

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

Gameboard control tokens are **Custom_Tile** objects — **circle** shape (`Type = 2`), **thickness 0.1**, two-sided (`image` + `image_bottom` / save `ImageURL` + `ImageSecondaryURL`). `DEBUG.spawnNpcControlBoardTokens` sets these in spawn data **and** calls `setCustomObject` + `reload` after spawn (TTS often ignores `CustomTile` on `spawnObjectData` alone). `DEBUG.applyNpcControlTokenHostedImages` applies the same shape to existing tokens. They flip with the normal **Flip** key (`Object.flip()`); there is no `is_face_up` on tiles — OFF vs STANDARD is inferred from **Z rotation** (0 = face up / STANDARD, 180 = face down / OFF). Board-plane orientation is **Y rotation** only and is independent of flip.

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

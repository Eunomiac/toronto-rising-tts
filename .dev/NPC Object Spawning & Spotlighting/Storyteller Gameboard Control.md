<!-- markdownlint-disable -->

# Storyteller Gameboard Control

Physical **STAGE_BOARD** (hidden world floor) + **CONTROL_BOARD** (GM table minimap) replace XML area placement for NPC staging. Code: `core/npc_gameboard.ttslua`, `lib/npc_gameboard_data.ttslua`, `objects/npc_control_board.ttslua`.

## Contract

| Surface | Role |
| --- | --- |
| `sessionScene.npcWorld.placements` | Authority: `{ characterKey = { u, v, yaw, npcLightMode } }` (0–1 on stage board) |
| **Apply** | Scan `npc_control_token` on CONTROL_BOARD → write `placements` → `Sync.npcs` |
| **Clear** | Double-click → empty `placements`, park tokens to palette, `Sync.npcs` |
| Reconcile | `NPCS.reconcileAllFromState` → figurines; mirror board unless `layoutLock` |

Legacy `byArea` still reconciles when `placements` does not claim a character (until Phase C retires areas).

## Coordinate mapping (STAGE ↔ CONTROL)

Both boards are **different objects** (position, rotation, scale). Map coordinates are **not** shared world XZ between boards.

| Step | API | Meaning |
| --- | --- | --- |
| World playfield → map | `Gameboard.uvFromWorld(worldPos)` | Project through **STAGE_BOARD** (`positionToLocal` + bounds → normalized `u,v` in 0–1). Fallback: `C` table extents when stage board is missing. |
| Map → world figurine | `Gameboard.worldFromUv(u, v)` | **STAGE_BOARD** `positionToWorld` at that `u,v`. |
| Map → control minimap | `Gameboard.worldOnControlBoard(board, u, v)` | Same `u,v` on **CONTROL_BOARD** (TTS transform handles 180° Y rotation and smaller scale). |

**Do not** call `positionToLocal` on CONTROL_BOARD with a playfield world position (e.g. `C.Tables[].centerPoint` at z≈50). That produced markers in a huge arc off the minimap and placed the table marker at the real table instead of on the control board.

Table/seat markers: compute playfield world XZ (table `centerPoint`; seats via segment angle × radius from `referenceHandPosition`), convert with `uvFromWorld`, place with `worldOnControlBoard`. NPC tokens on the control board use the same `u,v` as stage figurines after Apply.

## Workshop tags

| Tag | GM notes example |
| --- | --- |
| `npc_control_token` | `npcToken:myleneHamelin` |
| `gameboard_table` | `gameboardTable:Table A` |
| `gameboard_table_component` | `gameboardComponent:Table A\|Table Leaf Near Left` |
| `gameboard_pc_seat` | `gameboardPcSeat:Red` |
| `gameboard_npc_seat` | `gameboardNpcSeat:NPC2` |

GUIDs: `G.GUIDS.STAGE_BOARD`, `G.GUIDS.CONTROL_BOARD` in `lib/guids.ttslua`.

## Buttons (Phase A wired)

- **Apply** / **Clear** — live
- **Read** / **Lock** / **Load** — Phase B

Debug: `DEBUG.dumpNpcPlacements()` in TTS console.

## Token images (Custom UI upload)

Gameboard control tokens are **Custom_Tile** objects — **circle** shape (`Type = 2`), **thickness 0.1**, two-sided (`image` + `image_bottom` / save `ImageURL` + `ImageSecondaryURL`). They flip with the normal **Flip** key (`Object.flip()`); there is no `is_face_up` on tiles — OFF vs STANDARD is inferred from X rotation.

**Upload batch only** uses **Custom_Token** (single `image` per object — correct for Cloud upload, not for the minimap).

Source WEBPs:

**`assets/images/NPC Tokens/`** — `tokenFront_<characterKey>.webp`, `tokenBack_<characterKey>.webp`

Pipeline (full detail: [`.dev/custom-ui-assets/README.md`](../custom-ui-assets/README.md)):

1. `npm run custom-ui-assets:manifest-npc-tokens`
2. **Gameboard tokens (61, paired front/back):** Save & Play → `lua DEBUG.spawnNpcControlBoardTokens()` — spawns flip tiles on **CONTROL_BOARD** with tag `npc_control_token` and GM notes `npcToken:<characterKey>`. Uses `file:///` from the manifest until hosted URLs exist.
3. **Cloud upload (122 single-face temp tokens):** `lua DEBUG.spawnNpcTokenUploadBatch({ columns = 12, gap = 2, startY = 3 })` → Cloud Manager → **Upload All Loaded Files** → save game → `lua DEBUG.clearCustomUiUploadTokens()`
4. Merge with `npc-token-manifest.json`, then `npm run custom-ui-assets:extract-npc-token-urls`
5. Save & Play → `lua DEBUG.applyNpcControlTokenHostedImages()` — refreshes existing control-board tokens from `lib/npc_token_hosted_urls` (or re-run `spawnNpcControlBoardTokens` after extract)

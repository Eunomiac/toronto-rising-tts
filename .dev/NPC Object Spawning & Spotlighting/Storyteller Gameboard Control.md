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

# Gameboard E2E - Guide

## Agent Routing

Read this when:
- running, regenerating, or modifying the Gameboard E2E playbook or `RunTest("Gameboard")`
- validating Storyteller gameboard, stage placement, control-token, NPC seating, or palette behavior
- changing `core/npc_gameboard.ttslua`, `core/npcs.ttslua`, or control-board object/UI scripts

Source of truth:
- `.dev/E2E Playbooks/Gameboard-E2E.md`
- `lib/e2e_playbook_gameboard.ttslua`
- `lib/e2e_gameboard.ttslua`
- `core/npc_gameboard.ttslua`
- `core/npcs.ttslua`
- `.dev/NPC Object Spawning & Spotlighting/Storyteller Gameboard Control.md`
- `.dev/NPC Object Spawning & Spotlighting/NPC Reconciler Procedure.md`

Verification:
- `npm run e2e-playbook:generate`
- `npm run build`
- TTS `RunTest("Gameboard")`
- TTS `gbE2ePrereqCheck()`
- TTS `gbE2eRunSmoke()` / `gbE2eRunFull()`

Reference for the lean test playbook `Gameboard-E2E.md`. Run tests from Suite 0.

**TOR-141** (living E2E playbooks) - **TOR-169** (Storyteller NPC gameboard). Author: table **Host** (solo OK), seat **Black** recommended. Est. **~25 min smoke + scene Apply gate**, **~60 min full**.

## Running the playbook

`Gameboard-E2E.md` contains only fenced `U.RunSequence` Lua blocks. Context appears in the console via `printHeader`:

| Level | Meaning |
| --- | --- |
| 1 `*` | Suite open/close (`Gameboard E2E: SUITE A - ...`) |
| 2 `=` | Step open/close (`A1 - ...`) |
| 3 `-` | `[HUMAN]` stop cue |

Manual workflow: paste one `lua` block, execute it, perform the `[HUMAN]` action if the block ends with one, then paste the next block.

`RunTest` workflow:

```lua
lua RunTest("Gameboard")
lua RunTest("Gameboard", "B")
lua RunTest("Gameboard", 3)
lua RunTest()
```

Regenerate after editing the playbook:

```bash
npm run e2e-playbook:generate
```

Then **Save & Play** so TTS loads the regenerated `lib/e2e_playbook_gameboard.ttslua`.

## Solo Host

Use one client with Host privileges. Seat **Black** for Storyteller panels and gameboard controls. **Save & Play** before any macro when repo Lua or generated playbook Lua changed.

## Prereq constants

Keep these in sync with `lib/e2e_gameboard.ttslua`.

| Constant | Default | Used for |
| --- | --- | --- |
| `GB_E2E_SCENE_ROW` | `scenes_lib_slot_03` | Scene Apply gate - library row with non-empty `sessionScene.npcWorld.placements` |
| `GB_E2E_NPC_A` | `myleneHamelin` | Primary token / figurine |
| `GB_E2E_NPC_B` | `adrianVarga` | Second placement / seat conflict |
| `GB_E2E_TABLE_KEY` | `Table A` | NPC1 seat tests |
| `GB_E2E_UV_A` | `u=0.18, v=0.72` | Stable on-board snap |
| `GB_E2E_UV_B` | `u=0.42, v=0.55` | Move / layoutLock tests |
| `GB_E2E_PC_ABSENT` | `Brown` | Reload PC-token absent probe |

## Session prereqs

1. Host, seat **Black**.
2. **Save & Play** from this repo.
3. Workshop objects exist: `STAGE_BOARD`, `CONTROL_BOARD`, `CONTROL_BOARD_PALETTE`, `npc_control_token` set. Run `lua DEBUG.spawnNpcControlBoardTokens()` if NPC tokens are missing.
4. PC control tokens exist with `pcToken:<Color>` GM Notes.
5. `lua gbE2ePrereqCheck()` prints `[gbConfirm] PASS`.

## Macro helpers

| Macro | Purpose |
| --- | --- |
| `gbE2ePrereqCheck()` | Hard stop before suites |
| `gbE2eReset()` | Empty `placements`, fixture NPCs in preload |
| `gbE2eRunSmoke()` | Automated S0-S7 + scene Apply human gate |
| `gbE2eContinue()` | Continue after pending human gate (`scene_apply` or `reload`) |
| `gbE2eVerifyPcTokens()` | PC tokens pinned + flip matches `seatSlots[color].isPresent` |
| `gbE2eRunFull()` | Deep F/G/H suites, then optional reload gate |
| `gbE2eRunDeferred()` | Deferred probes; expected FAIL while linked work remains open |
| `gbConfirm(label, { ... })` | Single-step assert |

Every macro ends with `[gbConfirm] PASS` or `[gbConfirm] FAIL` plus line details. Unexpected **FAIL** in smoke or full means stop and fix that layer before continuing.

Inspection:

```lua
lua DEBUG.dumpNpcPlacements()
lua DEBUG.logNpcPlacementIntentToFile()
lua DEBUG.exportNpcSeatFigurinesToFile()
```

## Suite overview

| Suite | Scope |
| --- | --- |
| 0 | Prereq check and reset |
| A | Smoke Apply/Clear/mirror/Z flip plus scene Apply gate |
| B | Full reconcile suites |
| C | PC control-token mirror |

## Smoke details

`gbE2eRunSmoke()` proves:

| Block | Proves | Fail if |
| --- | --- | --- |
| S0 | `gbE2eReset` baseline | Placements nonempty; fixture not in preload |
| S1 | Polar snaps on `CONTROL_BOARD` | Snap count below threshold |
| S2 | Token at `GB_E2E_UV_A` | Token missing / wrong tag |
| S3 | `GlobalGameboardApply()` | State u/v/yaw drift |
| S4 | `Sync.npcs({ force = true })` | Figurine not at stage UV; duplicate figurines |
| S5 | Token mirror on board | Token only on palette |
| S6 | `GlobalGameboardClear()` | Placements or stage intent remain |
| S7 | Z flip -> `npcLightMode` OFF vs STANDARD | Mode not derived from flip |

### Scene Apply gate

When Suite A prints `[HUMAN]`:

1. Open Storyteller **Scenes** panel.
2. Apply the fixture row named by `GB_E2E_SCENE_ROW`.
3. Wait **12 seconds** for blindfold and settle.
4. Run the next block / `RunTest()`.

Pass if `gbE2eContinue:scene_apply` reports PASS:

| Check | Fail if |
| --- | --- |
| Live `placements` match library row keys | No overlapping keys |
| Figurines on stage at row u/v | Missing figurine |
| Tokens mirrored on `CONTROL_BOARD` | Token not on board |
| PC `pc_control_token` flip matches `seatSlots[color].isPresent` | Wrong column or face-up/down vs state |
| Intent `stage` per placement key | Intent seat/preload |
| Unoccupied `NPCn` has no `SEAT_FIGURE` duplicates | Duplicate pooled figure remains |

## Full details

`gbE2eRunFull()` runs smoke prereqs internally before deep reconcile probes.

| ID | Proves | Fail if |
| --- | --- | --- |
| F1 | Placement + `seatSlots.NPC1` -> intent **stage** | Figurine at NPC1 seat |
| F2 | Seat only -> intent **seat** | Figurine at stage UV |
| F3 | NPC2 on **Table B1** (no NPC2 slot) | Intent not preload; slot map wrong |
| F4 | `isPresent=false` hides NPC1 chair | Chair visible to PCs |
| H281 | Clear seat rules + library mirror | Disabled+STANDARD not active after Clear; enabled seat flipped; library `seatSlots` stale |
| TOR-311 | NPC seat disable does not vacate other seated NPCs | Other occupied slots clear |
| TOR-334 | Table B family by highest occupied NPC slot | Table B resolves by count instead of highest slot |
| TOR-333 | Empty NPC seats are not toggleable | Empty live/preview seats can toggle |
| G1 | Reconcile pulls token from palette | Token stays on palette |
| G2 | `syncTokensToPalette` skips on-stage keys | On-stage token parked |
| H1 | `layoutLock` blocks token UV overwrite | Token moved on reconcile |
| H2 | `layoutLock` still updates seat markers | All markers stashed |

### Optional reload gate

`gbE2eRunFull()` still prints an optional reload gate for direct macro users. Treat it as an ad-hoc follow-up, not part of the generated default `RunTest("Gameboard")` pass:

```lua
lua gbE2eRunFull()
-- if it asks for reload:
lua gbE2ePrereqCheck()
lua gbE2eContinue()
```

## Deferred probes

Run manually:

```lua
lua gbE2eRunDeferred()
```

Do not put deferred probes in the generated default playbook while they print expected `FAIL` lines; `RunTest` fail-abort intentionally stops on any case-sensitive `FAIL` after a suite banner.

| ID | Linear | Current expectation |
| --- | --- | --- |
| D172 | TOR-172 | Expected FAIL until palette-drop `defaultLightMode` handler + ring-1 STANDARD data ship |
| D173 | TOR-173 | Shipped API probe should pass |
| D174 | TOR-174 | Shipped API guard should pass |
| D177b | TOR-179 | Duplicate audit should pass |

When a deferred feature ships, move its probe into `gbE2eRunFull()` and expect PASS.

## Sign-off

| Suite | Pass | Notes |
| --- | --- | --- |
| 0 Prereq/reset | [ ] | |
| A Smoke + scene Apply | [ ] | |
| B Full reconcile | [ ] | |
| C PC tokens | [ ] | |
| Deferred probes | [ ] | manual only |

## Related

- [Gameboard-E2E.md](Gameboard-E2E.md) - lean RunSequence blocks
- [Scenes-E2E-Guide.md](Scenes-E2E-Guide.md) - scene Apply timing and fixtures
- [TESTING.md](../TESTING.md) - E2E output and generator contract
- [Storyteller Gameboard Control](../NPC%20Object%20Spawning%20%26%20Spotlighting/Storyteller%20Gameboard%20Control.md)
- [NPC Reconciler Procedure](../NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Reconciler%20Procedure.md)

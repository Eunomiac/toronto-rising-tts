# Scenes E2E - Guide

## Agent Routing

Read this when:
- running, regenerating, or modifying the Scenes E2E playbook or `RunTest("Scenes")`
- validating scene library Apply/End, clock behavior, map pins, seat presence, or soundscape-on-scene workflows
- changing Storyteller Scenes panel code, present-day clock logic, player HUD map/location UI, or scene constructor state shape

Source of truth:
- `.dev/E2E Playbooks/Scenes-E2E.md`
- `lib/e2e_playbook_scenes.ttslua`
- `core/storyteller_scenes_panel.ttslua`
- `core/scene_library.ttslua`
- `core/scenes.ttslua`
- `core/present_day_clock.ttslua`
- `core/game_state_overlay.ttslua`
- `core/hud_player.ttslua`
- `.dev/Scene Constructor/Scene Constructor Overview.md`
- `.dev/HUD_FUNCTIONS.md`

Verification:
- `npm run e2e-playbook:generate`
- `npm run build`
- TTS `RunTest("Scenes")`
- TTS `DEBUG.showScene()`
- TTS `DEBUG.inspectSoundscapeAudio()`

Reference for the lean test playbook `Scenes-E2E.md`. Run tests from Suite 0 unless this guide names a specific resume step.

**TOR-141** - Author: table **Host** (solo OK), seat **Black** recommended. Est. time: **~35 min smoke** (Suites 0, A-D), **~100 min full** (all suites).

## Running the playbook

`Scenes-E2E.md` contains only fenced `U.RunSequence` Lua blocks. Context appears in the console via `printHeader`:

| Level | Meaning |
| --- | --- |
| 1 `*` | Suite open/close (`Scenes E2E: SUITE A - ...`) |
| 2 `=` | Step open/close (`A1 - ...`) |
| 3 `-` | `[HUMAN]` stop cue |

Manual workflow: paste one `lua` block, execute it, perform the `[HUMAN]` action if the block ends with one, then paste the next block.

`RunTest` workflow:

```lua
lua RunTest("Scenes")
lua RunTest("Scenes", "F")
lua RunTest("Scenes", 8)
lua RunTest()
```

Regenerate after editing the playbook:

```bash
npm run e2e-playbook:generate
```

Then **Save & Play** so TTS loads the regenerated `lib/e2e_playbook_scenes.ttslua`.

## Fixture setup

Suite 0 creates deterministic Scene Library rows with `ensureSceneLibraryStub`:

| Slot | Key | Purpose |
| --- | --- | --- |
| 17 | `e2e_scene_a` | Present-day scene A, table A, site A, two NPC placements |
| 18 | `e2e_scene_b` | Present-day scene B, different table/site/placements |
| 19 | `e2e_scene_present_flags` | Present-day row with clock flags only |
| 20 | `e2e_scene_invalid_historical` | Invalid historical row with no datetime |

This intentionally overwrites those E2E fixture rows. It does not require pre-authored workshop scene rows.

Suite D includes a save/reload gate. After reload, TTS loses the active `RunTest` cursor. Resume at the post-reload block by running:

```lua
lua RunTest("Scenes", 8)
lua RunTest()
```

## Prerequisites

- **Save & Play** if repo Lua or generated playbook Lua changed.
- Host connected; solo is fine.
- Use seat **Black** for Storyteller panels and scene controls.
- Finish or cancel loose dice before library Apply or table changes; scene/table transitions intentionally block when loose `d10` dice are on the table.

## Deterministic rules

Every step in a suite you run is mandatory for that suite.

| Rule | Requirement |
| --- | --- |
| Fixture rows | Run Suite 0 before smoke/full passes; it owns slots 17-20 |
| Scene Apply wait | Wait for the full staged transition: blindfold down, heavy work, silent settle, lift/fade-in |
| Pending rows | Slot selection alone is library preview/edit mode when `activeKey ~= lastAppliedKey`; edits must not mutate live `sessionScene` until Apply |
| RT speed | Use speed `60` only where the step says so; turn RT off again in Suite G |
| Reload | Resume by explicit step after Save & Play; the RunTest cursor is not persisted across reload |
| Repair | Do not call `Sync.full({ force = true })` during normal passes except the repair step below |

## Current behavior under test

Scene Apply uses `core.hud_blindfold.runStagedTransition`: fade outgoing ambient, write live state from the selected library row, switch table, reconcile hosted conditions/NPCs/map pins, then fade in the new scene soundscape as the blindfold lifts.

Pending library rows use blue panel highlights. While pending, table, seat, location, and clock edits write to `sceneLibrary.scenes[activeKey].sessionScene` only. Live `sessionScene`, physical table, soundscape, and map pins change only after library Apply.

End scene detaches live mirroring before clearing live location keys, stops real-time clock, applies the default no-scene environment, and fades Main-only ambient back in. (`Scenes.applyDefaultNoSceneEnvironment` also detaches — same path as Play enter no-scene / TOR-362.)

## Inspection cheat sheet

```lua
print("activeKey", S.getStateVal("sceneLibrary", "activeKey"))
print("lastAppliedKey", S.getStateVal("sceneLibrary", "lastAppliedKey"))
print("site", S.getStateVal("sessionScene", "siteKey"))
print("district", S.getStateVal("sessionScene", "districtKey"))
print("table", S.getStateVal("sessionScene", "tableKey"))
print("phase", S.getStateVal("currentPhase"))
print("scene clock", JSON.encode_pretty(S.getStateVal("sessionScene", "clock")))
print("present day", JSON.encode_pretty(S.getStateVal("presentDayClock")))
print("seatPresent", JSON.encode(S.getStateVal("sessionScene", "seatPresent")))
print("seatSlots", JSON.encode(S.getStateVal("sessionScene", "seatSlots")))
DEBUG.showScene()
DEBUG.inspectSoundscapeAudio()
```

## Suite overview

| Suite | Scope |
| --- | --- |
| 0 | Create deterministic fixture rows |
| A | Select/apply row A, visual/audio smoke |
| B | Switch to row B |
| C | End scene |
| D | Save/reload restore, PC control-token mirror |
| E | Apply location + soundscape mid-session |
| F | Present-day clock bootstrap, flags-only activation, Set behavior |
| G | Real-time clock progression and stop |
| H | Scene switch does not rewind chronicle present day |
| I | Pending row preview/edit behavior |
| J | Seat presence toggles |
| K | Map pins for present/absent PCs |
| L | Invalid historical clock row fails safely |
| M | Chronicle weather/clock spot check |

## Repair step

Use only when state and world visibly diverge after a failed pass:

```lua
local Sync = require("core.sync")
Sync.full({ force = true, reason = "e2e-repair" })
```

Re-check lighting, NPCs, pins, and soundscape after about 3 seconds.

## Sign-off

| Suite | Pass | Notes |
| --- | --- | --- |
| 0 Fixture setup | [ ] | slots 17-20 |
| A Apply | [ ] | row A live |
| B Switch | [ ] | row B live |
| C End | [ ] | no-scene baseline |
| D Save/reload | [ ] | scene restore + PC token mirror |
| E Location | [ ] | site/audio update |
| F Present day | [ ] | F1-F3 |
| G RT autoprogression | [ ] | G1-G2 |
| H Switch vs present day | [ ] | no rewind |
| I Pending preview | [ ] | library-only edits, then apply |
| J Seat presence | [ ] | Brown absent/present |
| K Map pins | [ ] | present vs absent |
| L Invalid clock | [ ] | no live switch |
| M Weather + clock | [ ] | schedule spot check |

## UI control map

| Control | ID | Effect |
| --- | --- | --- |
| Library slot | `scenes_lib_slot_XX` | Select `activeKey` |
| Apply Scene Time | `scenes_lib_btn_apply_clock` | Full staged apply; library datetime → live clock |
| Apply ×5 to Now | `scenes_lib_btn_apply_x5` | Full staged apply; ×5 RT catch-up until present (TOR-142) |
| Apply SET Now | `scenes_lib_btn_apply_set_present` | Full staged apply; set present-day to scene time |
| Apply NOW | `scenes_lib_btn_apply_present` | Full staged apply; fill clock from present-day |
| Apply NOW +15/+30/+60/+120 | `scenes_lib_btn_apply_present_15` etc. | Same as NOW; advance present-day by N minutes first (TOR-401; no lerp) |
| End | `scenes_lib_btn_end` | Detach mirror, clear live scene, no-scene transition |
| Seat PC | `scenes_seat_Brown` etc. | Toggle `seatPresent` / `seatSlots.isPresent` |
| Month | `scenes_month_*` | Draft month |
| Day / Year / Time | `scenes_clock_day/year/time12` | Draft datetime |
| Set present day | `scenes_clock_setPresentDay` | Writes `presentDayClock` only |
| RT toggle | `scenes_clock_rtToggle` | Draft/live real-time flag |
| Speed | `scenes_clock_speed` | Narrative minutes per 60 wall seconds |
| Apply clock | `scenes_clock_apply` | Live or pending row clock |
| Apply location | location section | Site + soundscape, or pending row site only |

## Related

- [Scenes-E2E.md](Scenes-E2E.md) - lean RunSequence blocks
- [TESTING.md](../TESTING.md) - E2E output and generator contract
- [Scene Constructor Overview](../Scene%20Constructor/Scene%20Constructor%20Overview.md) - state shape and apply semantics
- [HUD_FUNCTIONS.md](../HUD_FUNCTIONS.md) - Scenes UI callback map
- [Gameboard-E2E.md](Gameboard-E2E.md) - `gbE2eVerifyPcTokens` and gameboard Apply gate

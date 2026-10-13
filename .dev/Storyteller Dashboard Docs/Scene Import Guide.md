# Scene Import Guide — scene library row contract

## Agent Routing

Read this when:

- changing the Storyteller Dashboard **Scenes** tab's library rows, or the ops that write them
- changing `SceneLibrary.validateRow`, `FSL.checkOccupancy`, or scene Apply
- touching `gameState.sceneLibrary`, `gameState.sessionScene`, the present-day clock, fork / unlink / End
- answering "what does a saved scene look like?"

Source of truth:

- `dashboard/scene_library.ttslua` — `upsert` / `setStatus` / `remove` / `snapshot` (ops `upsertScene`, `setSceneStatus`, `deleteScene`)
- `dashboard/scenes.ttslua` — op dispatch (`playScene`, `endScene`, `unlinkScene`, `forkScene`)
- `core/scene_library.ttslua` — `validateRow`, `validateSessionSceneClock`, `checkRowOccupancy`, mirror, status, `playableOrder`
- `lib/figurine_seat_layout.ttslua` — `FSL.checkOccupancy`
- `core/storyteller_scenes_panel.ttslua` — in-game Scenes panel (play only), `applyActiveLibraryScene`, `forkLiveScene`, `unlinkLiveMirror`, `endSceneNarrative`
- `core/scenes.ttslua`, `core/present_day_clock.ttslua`, `core/hud_blindfold.ttslua` — Apply, clock, staged transition
- `core/state.ttslua` — `S.GetDefaultGameState` (`sessionScene` defaults), `S.validateState`
- Dashboard: `.dev/storyteller-dashboard/src/client/scenesPanel/library.ts` (row building, `applyToDraft`, `mergeFromTts`), `useLibraryActions.ts` (op batches)
- Catalogs: `lib/constants.ttslua`, `lib/condition_defs.ttslua`, `lib/soundscape_catalog.ttslua`; dashboard extract `npm run dashboard:scene-catalogs` → `.dev/storyteller-dashboard/data/scene-catalogs.json` + `control-board-snaps.json`

Verification:

- `.dev/E2E Playbooks/Scenes-E2E.md` (in-game panel, read-only preview, Apply, fork, unlink, End)
- Dashboard: play a scene from the Scenes tab; a bad row comes back as an `upsertScene: …` error

Status: current (TOR-569 living doc; TOR-718 made the dashboard the only editor). Re-verify whenever `validateRow`, `FSL.checkOccupancy`, the ops, or scene Apply change.

---

## What this is

The Storyteller Dashboard keeps the master scene library in `data/scene-library.json` beside the dashboard. It is the **only editor** of saved scenes. TTS holds the rows it has been asked to play in `gameState.sceneLibrary` and keeps the one on the table up to date while it plays.

The in-game Scenes panel is a live-table fallback. It can **play** a saved scene and change the **live** scene. It cannot create, edit, fork or delete library rows.

There is no paste-in JSON importer any more. Rows reach TTS only through the dashboard bridge ops below.

---

## Who writes library rows

| Writer | What it writes |
| --- | --- |
| Dashboard `upsertScene` | A whole row (or only the title, when it is the row linked to the table) |
| Dashboard `setSceneStatus` / `deleteScene` | Status / removal |
| Dashboard `forkScene` → `forkLiveScene` | Pins the old row, adds a new linked row |
| Live mirror (`SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked`) | The linked row's `sessionScene`, copied from live play |
| Scene Apply / End Scene | `status` → `ongoing` / `ended` |
| E2E fixture (`DEBUG.ensureSceneLibraryStub`) | `e2e_*` rows, written straight into state; the dashboard snapshot leaves them out |

---

## Bridge ops

`GlobalDashboardScenesApply(jsonText)` runs one op or an array of ops in order and **stops at the first failure**, replying `{ ok, error? }`. Play from the dashboard sends `[upsertScene, playScene]` in one batch, so a refused row is never played.

| Op | Payload | Behavior |
| --- | --- | --- |
| `upsertScene` | `key`, `title`, `placementMode`, `sessionScene`, `status?` | Writes the row (see [What TTS checks](#what-tts-checks-on-upsertscene)). `status` only applies to a row TTS does not have yet; an existing row keeps TTS's status. The row linked to the table only takes the new `title` (the table keeps writing its `sessionScene`), and skips the checks. New keys are appended to `order`. |
| `playScene` | `key`, `from` (`scene` \| `present`), `plusMinutes` (whole minutes ≥ 0), `pace` (`x2` \| `x5`) | Selects the row and applies it to the table. Refuses unknown keys, `template` and `ended` rows. Needs the Storyteller in the game. See [Present day clock](#present-day-clock-clockispresentday). |
| `endScene` | — | End Scene (needs the Storyteller in the game). |
| `setSceneStatus` | `key`, `status` | `new` / `ongoing` / `ended` / `template`. Refuses `ended` for the scene on the table (use End Scene). |
| `deleteScene` | `key` | Removes the row from `scenes` and `order` (clears `activeKey` if selected). Refuses the scene on the table. Unknown keys are a no-op. |
| `unlinkScene` | — | Stops live writes into the table's row. |
| `forkScene` | `newTitle`, `oldTitle?` | The table carries on in a new linked row; the old row keeps a snapshot (optionally renamed). Refuses when no scene is on the table. |

Library writes run `S.validateState()`, refresh the in-game panel, and mark the dashboard scene slice dirty.

---

## Row shape

```jsonc
// gameState.sceneLibrary
{
  "order": ["openingCouncil", "quietMoment"],     // in-game list order (ended + template rows are hidden)
  "activeKey": "openingCouncil",                  // selected in the in-game panel
  "lastAppliedKey": "openingCouncil",             // last row applied to the table
  "scenes": {
    "openingCouncil": {
      "title": "Opening Council",
      "placementMode": "standard",                // "standard" | "scatter"
      "receivesLiveWrites": true,                 // linked: live play mirrors into this row
      "status": "ongoing",                        // "new" | "ongoing" | "ended" | "template"
      "sessionScene": { /* same shape as gameState.sessionScene */ }
    }
  }
}
```

- **Key:** `^[a-zA-Z][a-zA-Z0-9_]*$`. The dashboard derives it from the title; fork keys are `<key>_2`, `_3`, … (`SceneLibrary.allocateForkSceneKey`).
- **Title:** trimmed, non-empty.
- `S.validateState` merges `sessionScene` defaults into every row and rebuilds `npcRoleOverride` from `seatSlots`.

---

## What TTS checks on `upsertScene`

`SceneLibrary.validateRow(placementMode, sessionScene)` fails loudly with a path-named message (prefixed `upsertScene: `), in this order:

1. **Clock** (`validateSessionSceneClock`) — `clock` is an object; `clock.isPresentDay` is a boolean; `year` / `month` / `day` / `hour` / `minute` are all set or all omitted; a historical scene (`isPresentDay: false`) has all five. Datetime fields are never defaulted.
2. **Lighting** — `lightingPresetKey` is a non-empty key of `C.LightModes` (whitespace trimmed).
3. **Chairs** (standard rows only, `checkRowOccupancy` → `FSL.checkOccupancy`) — see [Chairs and occupancy](#chairs-and-occupancy).

The op also checks the key pattern, a non-empty title, `placementMode` (`standard` / `scatter`), `sessionScene` being an object, and a known `status`.

Scene Apply re-checks the clock and the chairs on the row it is about to play.

### What the dashboard must uphold (TTS does not check)

These are not refused, but break or misbehave on Apply. The dashboard builds rows from catalogs and must keep them true:

- All five PC seat rows (`Brown`, `Orange`, `Red`, `Pink`, `Purple`) are present (a missing PC row fails the chair check). Emit all four NPC seat keys too: `{ "slotEmpty": true }` for an empty seat.
- `isPlayingNPC: true` comes with a non-empty `npcCharacterKey`; `characterKey` stays the seat's real PC.
- One NPC holds at most one of `NPC1`…`NPC4`. An NPC that is both seated and on the stage (`npcWorld.placements`) has `isPresent: false` on its seat.
- A `siteKey` comes with its `districtKey`; both exist in `C.Sites` / `C.Districts`.
- `skyboxOverride` is a `C.Skyboxes` key or `"Generic"` (never a URL).
- `conditions` ids exist in `lib/condition_defs.ttslua` with `canApplyManually = true`.
- `soundscapeNarrative.wind` / `.rain` / `.thunderstorm` are all set or all omitted, and the chronicle weather flags match (see [Soundscape](#soundscape)).
- `tableKey` is a real table or the `Table B` family key; stage `u` / `v` are 0–1; character, mood and track keys exist.
- No retired keys: `rollDefaults`, `npcWorld.preload`, `npcWorld.byArea`, `lightingSeatSpotlightPreset`.

---

## `sessionScene` field catalog

Unknown keys inside `sessionScene` are cloned through. Emit only these.

### Lighting and table

| Key | Type | Notes |
| --- | --- | --- |
| `lightingPresetKey` | string | **Checked.** Key of `C.LightModes` (chronicle `IndoorBright` … `UndergroundDark`, Memoriam, Admin). Applied on Apply (`U.applyLightingPreset`); seat spotlights still follow per-player priority. Do not author `lightingSeatSpotlightPreset` — Apply derives it. |
| `isTopFogActive` | boolean | Top fog on (AssetBundle Looping Effect 2) or off. A later live location Apply overwrites it from the site (`SceneLibrary.applySiteTopFogToSessionScene`). |
| `tableKey` | string \| omitted | `Table A`, `Table B0`…`Table B5`, `Table C`, or the family key `Table B` (Apply picks B0–B5 from the occupied NPC seats — [Rotational Coordinate Generator](../Rotational%20Coordinate%20Generator.md) § Dynamic table family keys). Physical table is `seatLayout.currentTableKey`. |

### Seat slots

`seatSlots` keys: `Brown`, `Orange`, `Red`, `Pink`, `Purple`, `NPC1`…`NPC4`.

**PC rows**

| Field | Type | Meaning |
| --- | --- | --- |
| `characterKey` | string | The seat's real chronicle PC, also while they play an NPC. |
| `isPlayingNPC` | boolean | The player is portraying an NPC from this PC chair. |
| `npcCharacterKey` | string | The NPC portrayed; required when `isPlayingNPC` is true. Drives `npcRoleOverride`. |
| `isPresent` | boolean | Narrative presence (lit, in the scene). `false` = **absent**: connected, seat dark, chair kept. Wins over `seatPresent`. |
| `tableSlot` | integer | Numbered chair (1 = reference figurine; even slots walk right, odd slots above 1 walk left). Required unless `absentFromSession`. |
| `absentFromSession` | boolean | The player is **disconnected** — no chair, `tableSlot` omitted. A connection fact, not a scene fact: Apply copies the live value onto the incoming rows (`FSL.carryLiveAbsenceOnto`), so an authored value has no effect. Use `isPresent: false` to keep a connected player out of a scene. See [seat occupancy model](../../docs/solutions/seat-occupancy-and-connection.md). |

**NPC rows**

| Field | When | Meaning |
| --- | --- | --- |
| `slotEmpty` | Empty seat | `true` marks the seat unused. |
| `characterKey` | Occupied | NPC id holding that homeland seat. |
| `tableSlot` | Occupied | Required chair, same numbering as PCs. |
| `isPresent` | Optional | `false` when that NPC is also on the stage. |

No `isPlayingNPC` / `npcCharacterKey` on NPC rows.

- `seatPresent` — sparse seat → boolean map, derived from `seatSlots[*].isPresent` (`normalizeLiveSessionSceneSeatSlots`). Usually omit.
- `npcRoleOverride` — do not author; rebuilt from PC rows by `SceneLibrary.syncNpcRoleOverrideFromSeatSlots` (validate + Apply).
- **Homeland + stage (TOR-250 / TOR-281):** control-board Apply sets `isPresent = false` when a seated NPC gains a placement; leaving the stage re-seats and lights the seat. Seat presence toggles write `seatSlots.isPresent` back into the linked row (`writeSeatNarrativePresence` → mirror).

### Location and skybox

| Key | Type | Notes |
| --- | --- | --- |
| `districtKey` | string | `C.Districts` key. Required whenever `siteKey` is set. |
| `siteKey` | string | `C.Sites` key in that district. The site drives skybox, indoor/outdoor ducking and (on live location Apply) top fog. Copy its `isTopFogActive` → `isTopFogActive` and `soundscape.location.track` → `soundscapeNarrative.location` when building a row; the site's suggested `lightingPresetKey` is the LightMode column of the Districts & Sites sheet (SITES tab). |
| `skyboxOverride` | string \| omitted | `C.Skyboxes` key or `"Generic"` (random generic, ignoring the site). Omitted = site sky. |

### Clock

| Field | Type | Meaning |
| --- | --- | --- |
| `isPresentDay` | boolean | **Checked.** `true` = takes part in present-day "now"; `false` = historical, datetime required. |
| `year`, `month`, `day`, `hour`, `minute` | numbers | **Checked:** all five or none. No calendar range check. |
| `useRealTime` | boolean | Narrative time ticks while live. |
| `realTimeSpeed` | number | `1` = one fiction minute per 60 real seconds; `0` freezes. |

A new dashboard scene starts at `{ "isPresentDay": true }` (flags only — Apply fills the time from present day). Setting a time writes all five fields with `isPresentDay: false`.

### Soundscape

`soundscapeNarrative` is intent consumed **on Apply** and mapped into `gameState.soundscape` through the normal setters (`Soundscape.mergeSessionSceneNarrativeIntoContext`). `{}` or omitted = site defaults plus scheduled weather.

| Field | Apply behavior |
| --- | --- |
| `backgroundMusic` | `"none"` silences; otherwise a mood playlist key (`main`, `combat`, `intrigue`, `casaLoma`, `gioCatacombs`, `gioEstate`). |
| `location` | Location ambience track key (`silent` allowed). |
| `wind`, `rain`, `thunderstorm` | The **weather trio**: all three set (`thunderstorm: false` counts as set) or all omitted. Applied only when `chronicleWeatherManualHold` is true. |
| `isIndoors` | Ignored — ducking follows `C.Sites[siteKey].isIndoors`. |

Chronicle weather flags must agree with the trio:

| Trio | `chronicleWeatherFollowSchedule` | `chronicleWeatherManualHold` |
| --- | --- | --- |
| All three set (weather locked to the scene) | `false` | `true` |
| None set (schedule drives weather) | `true` | `false` |

The dashboard's weather override and release (`applyToDraft` `weatherOverride`) set both together.

### Conditions

`conditions` — array of registry ids with `canApplyManually = true`, hosted on **present** PCs while the scene is live (`Conditions.reconcileHostedForSession`). The Scenes tab adds a location's `C.Districts` / `C.Sites` conditions when that location is picked. Automatic ids (`impairedHealth`, `impairedWillpower`, `impairedHumanity`, `stained`) are not allowed.

### NPC world

`npcWorld.placements` is authoritative: `characterKey → { u, v, yaw?, npcLightMode?, groundLevel? }`, `u` / `v` 0–1 on STAGE_BOARD (same frame as Dashboard stage edits). `Sync.full` → `NPCS.reconcileAllFromState` places figurines; `StageTokens.reconcileFromState` puts spotlight tokens on the Stage Control board. `npcLightMode` is `OFF` / `STANDARD` / `SPOTLIGHT` (anything else → `STANDARD`). `groundLevel` omitted = snap ring height.

NPCs not on the stage or a seat are not in the world (they spawn on demand). `genericMembership` (live generic NPCs) and `controlBoardSnapsEnabled` pass through. Legacy `byArea` is not part of the contract; `S.validateState` handles it on old saves (`lib/npc_placements_convert.ttslua`).

---

## Chairs and occupancy

`FSL.checkOccupancy(seatSlots, occupiedNpcSeats, tableCfg, { forImport = true })` on standard rows:

1. Every PC row that is not `absentFromSession` has `tableSlot`.
2. A PC row with `absentFromSession` has **no** `tableSlot`.
3. Every occupied NPC row (non-empty `characterKey`) has `tableSlot`.
4. Chairs are unique among those occupants.
5. `math.floor(tableSlot)` is in `1 .. capacity`.

Capacity is the table's `slotCapacity`. `Table B` resolves to the B variant for this row's occupied NPC seats (`FSL.tableBVariantIndex`). An omitted or unknown `tableKey` allows up to 10.

| Table | Capacity |
| --- | --- |
| `Table A` | 9 |
| `Table B0` … `Table B5` | 5, 6, 7, 8, 9, 10 |
| `Table C` | 10 |

Default chairs (`C.DefaultTableSlots`): Red 1, Orange 2, Pink 3, Brown 4, Purple 5, NPC1 6, NPC2 7, NPC3 8, NPC4 9. Live saves may seed missing chairs; a library row must carry its own. Table B (`isRandomSeating`) ignores a row's chairs: each PC takes the chair drawn for the session on Intermission → Play (`seatLayout.sessionChairs`, 1..5), and seated NPCs fill chairs 6.. in the row's chair order.

---

## Scatter rows (`placementMode: "scatter"`)

Six labeled areas, no table and no chair check. `sessionScene.scatterPlacements` holds `scatter1`…`scatter6`; Apply poses figurines from it, not from `seatSlots` chairs or `npcWorld`. Each area has `centerCharacters` and `orbitCharacters` (`{}` allowed). Center keys are PC character keys (`slot`, `isPlayingNPC`, `isPresent` on each row); orbit keys are NPC keys. A character occupies at most one area. Applying a Scatter row hides the table and poses figurines from the areas.

**Dashboard scene previews** write this field: switching a draft's table to Scatter stores a fresh `scatterPlacements` (the `defaultScatterPack` rule below, with stage NPCs taking the group of their pack), dragging tokens between groups edits it, and an NPC dragged out of every group leaves the draft (stage placement, NPC chair and generic membership). Switching the draft back to a table drops `scatterPlacements`. NPCs who were only in groups go onto stage packs nobody holds, the same way TTS does when the table leaves Scatter. `seatSlots` and the original stage placements stay in the row the whole time.

**Live table switch** (not a library write), and a Scatter row authored with chairs instead of `scatterPlacements`: chairs map to groups by `((slot - 1) % 6) + 1`, but PCs spread one per group: in chair order each in-session PC takes their chair's group when no PC holds it yet, else the lowest group with no PC (same rule as the Dashboard's `defaultScatterPack`). Seated NPCs join their chair's group orbit, never a PC slot. Occupied polar packs map CENTER → Mid Center → Mid Left → Mid Right → Center Left → Center Right → Far Center-Left → Far Center-Right → Far Left → Far Right onto groups 1–6 (packs beyond 6 are cleared). Switching back restores the stashed Standard layout, except NPCs cleared while in Scatter. A Scatter scene with no stash uses default PC chairs and packs NPCs into polar families.

---

## Library and live table

**One live authority.** `gameState.sessionScene` is the live bundle every reconciler reads. Library rows are stored copies; the linked row is a passive shadow of live play.

- **Mirror:** while a row has `receivesLiveWrites == true`, `mirrorActiveLibrarySessionSceneFromLiveIfLinked` copies live `sessionScene` into it after each `Sync.full`, after each seat presence write, and once more when the scene leaves the table (start of `applyActiveLibraryScene`, and `detachLiveTableFromLibraryMirror` on End / phase transitions). The target is `SceneLibrary.resolveMirrorSceneKey()`: the linked `activeKey`, else the linked `lastAppliedKey`, so previewing another row never stops the table's row from updating. Other rows are never touched by live play.
- **Status:** Apply sets `ongoing`; End sets `ended`. `SceneLibrary.playableOrder()` hides `ended` and `template` rows from the in-game list (slot N = `playableOrder()[N]`).
- **Unlink** (`unlinkScene`, or the in-game **Unlink** button): `receivesLiveWrites = false` on the table's row; it keeps whatever the last mirror wrote.
- **Fork** (`forkScene { newTitle, oldTitle? }` → `forkLiveScene`): clones live `sessionScene` into the source row and unlinks it (so it holds the fork-time moment), then adds a new linked row (`<key>_N`, `newTitle`) that becomes `activeKey` / `lastAppliedKey`. No blindfold or world reconcile. Returning to the old row later plays that saved moment.
- **End Scene:** notify players, flush the live clock onto the mirroring row, detach the mirror (unlink, clear `lastAppliedKey`), clear `activeKey` (TOR-449), apply the no-scene default behind the staged blindfold, close the Scenes panel.

### In-game Scenes panel (play only)

Selecting a row that is not on the table (**preview**, `activeKey ~= lastAppliedKey`) shows that row's table, seats, location and scene time on the left, with blue highlights instead of green. Preview is **read-only**: table, seat, location and clock controls are not interactable, and a click alerts the Storyteller to edit on the dashboard or Apply first. In Downtime the clock controls still edit the Downtime clock. Closing the panel or switching tabs deselects a preview (TOR-449).

With the table's own row selected (or nothing selected), every control edits the **live** scene, including the location picker. The library column offers the playable rows, the Apply buttons, **Unlink** and **End Scene**.

---

## Present day clock (`clock.isPresentDay`)

In-fiction chronicle time, not wall-clock.

| State | Role |
| --- | --- |
| `gameState.presentDayClock` | Chronicle "now" (`year`…`minute`). |
| `gameState.sessionScene.clock` | Live scene clock. |
| `sceneLibrary.scenes[key].sessionScene.clock` | Each row's saved clock (the linked row mirrors live). |

1. **Bootstrap:** the first Apply of a present-day scene with a full datetime while present day is unset initializes it.
2. **Monotonic:** any scene clock set or ticked later than present day advances present day (`PresentDayClock.tryAdvance`, never rewinds).
3. **Flags-only rows:** Apply fills the datetime from present day (error if present day was never set).
4. **Historical rows** (`isPresentDay: false`) carry a full datetime.
5. **Return to a scene:** Apply uses the row's saved clock, which may be behind present day; present day does not rewind. The in-game **Set** button may overwrite present day backward (`PresentDayClock.setPresentDay`).
6. **Near present = present (TOR-682):** a live time less than `PresentDayClock.NEAR_PRESENT_MINUTES` (15) behind present day snaps onto it (Apply, clock settle, in-game clock inputs, real-time ticks except ×5 catch-up). Memoriam and library rows never snap.
7. **No flash-forwards:** scene time is never ahead of present day; rule 2 moves present day with it.

End Scene and switching scenes flush the live clock onto the row that was playing, so its exit time survives (TOR-142).

### Apply clock modes

The in-game panel's Apply buttons all run the same staged Apply and differ only in the clock (`PresentDayClock.resolveAndApplyActivationClock`):

| Button | Mode | Clock |
| --- | --- | --- |
| Scene Time | `scene` | Row datetime → live; present day only advances. |
| ×5 to Now | `x5` | As Scene Time; while behind present day, real time runs at recorded speed × 5 until it catches up. |
| SET Now | `setPresent` | Row datetime → live **and** present day (may rewind). |
| NOW | `present` | Ignore the row's datetime; use present day. |
| NOW +15 / +30 / +60 / +120 | `presentPlusN` | As NOW, starting that many minutes later (present day moves on). |

Scene Time, ×5 and SET Now stay disabled until the row has a datetime.

The dashboard's `playScene` sends `from: "scene"` or `"present"` with `plusMinutes` (start that many minutes later; `present` moves present day on) and `pace` (`x2`: real time at ×2; `x5`: ×5 until present day, then ×2 — `applyDashboardPace`). See [Listening to TTS](Listening%20to%20TTS.md) § Scene library.

---

## Switching scenes

Scene Apply runs the staged transition `core.hud_blindfold.runStagedTransition` (built on `U.chain`) so blindfold animation and heavy reconcile never compete (TOR-147 / TOR-434):

1. **Blindfold down** — close the Scenes panel; arm one random blindfold variant (plus destination District / Site cards when both keys resolve) on the parent Panel, one `UI.show` on `playerHud_overlay_blindfold`, then re-arm children (TOR-431 / TOR-425 / TOR-444). Cards fade in on XML delays (district ~4s, site ~4.5s). End / table-only / no location keep the cards clear.
2. **Lead-in (~4.0s)** — wait until the parent fade-in finishes (`HUDBF.BLINDFOLD_DOWN_COMPLETE_SEC`). No heavy work yet.
3. **Fade-out (~1s)** — `Soundscape.fadeOutTransitionAmbient` fades music, location and weather (emitters only). Weather compares outgoing vs incoming: a different track fades out; the same track at a different volume ducks to the lower one (TOR-136).
4. **Site-card gate** — wait for the site card fade-in plus a 0.25s pad (~5.75s).
5. **Heavy work** — default camera snap for seated players (TOR-368), connection checkpoint (`PlayerConnection.applyConnectionCheckpoint`), clone the row into live state, switch table, hosted reconcile, `Sync.full({ skipSoundscape = true })`.
6. **Fade-in under cover (~2s)** — `Scenes.applyActiveSceneSoundscapeFromSession()` inside `Soundscape.beginTransitionFadeWindow` (TOR-476).
7. **Settle + lift** — the remaining down time, then one `UI.hide` lifts the blindfold; child defaults restore after ~3s.

Standalone table toggles use `runTransition`, which also waits for blindfold-down. Both start with `HUDBF.beginTransition`, which collapses the whole Storyteller toolbar before the cover drops, and both run the connection checkpoint under full cover ([seat occupancy and connection](../../docs/solutions/seat-occupancy-and-connection.md)).

---

## E2E fixture rows

The Scenes playbook writes `e2e_scene_*` rows straight into state (`DEBUG.ensureSceneLibraryStub`). `Lib.snapshot` drops every `e2e_*` key (rows, `order`, and `liveKey`), so they never merge into the dashboard's master library.

---

## Worked example

A standard row sent from the dashboard, then played at its own time:

```json
[
  {
    "op": "upsertScene",
    "key": "openingCouncil",
    "title": "Opening Council",
    "placementMode": "standard",
    "status": "new",
    "sessionScene": {
      "lightingPresetKey": "IndoorBright",
      "isTopFogActive": false,
      "tableKey": "Table B1",
      "seatSlots": {
        "Brown": { "characterKey": "fomorach", "isPlayingNPC": false, "isPresent": true, "tableSlot": 4 },
        "Orange": { "characterKey": "rashid", "isPlayingNPC": false, "isPresent": true, "tableSlot": 2 },
        "Red": { "characterKey": "lordLucien", "isPlayingNPC": true, "npcCharacterKey": "myleneHamelin", "isPresent": true, "tableSlot": 1 },
        "Pink": { "characterKey": "aishe", "isPlayingNPC": false, "isPresent": true, "tableSlot": 3 },
        "Purple": { "characterKey": "blackCaesar", "isPlayingNPC": false, "isPresent": true, "tableSlot": 5 },
        "NPC1": { "characterKey": "adrianVarga", "isPresent": false, "tableSlot": 6 },
        "NPC2": { "slotEmpty": true },
        "NPC3": { "slotEmpty": true },
        "NPC4": { "slotEmpty": true }
      },
      "districtKey": "BayStFinancial",
      "siteKey": "StRegisCouncilChamber",
      "clock": { "isPresentDay": false, "year": 2026, "month": 9, "day": 14, "hour": 22, "minute": 15, "useRealTime": true, "realTimeSpeed": 1 },
      "conditions": ["bonusWPReroll"],
      "soundscapeNarrative": { "backgroundMusic": "casaLoma", "location": "library", "wind": "windMed", "rain": "rainLight", "thunderstorm": false },
      "chronicleWeatherFollowSchedule": false,
      "chronicleWeatherManualHold": true,
      "npcWorld": { "placements": { "adrianVarga": { "u": 0.18, "v": 0.72, "yaw": 0, "npcLightMode": "OFF" } } }
    }
  },
  { "op": "playScene", "key": "openingCouncil", "from": "scene", "plusMinutes": 0, "pace": "x2" }
]
```

- Red keeps `characterKey: "lordLucien"` while playing `myleneHamelin`.
- `adrianVarga` is on the stage and in `NPC1`, so `NPC1.isPresent` is `false`.
- The weather trio is complete, so the flags lock weather to the scene.
- `Table B1` holds 6 chairs; slots 1–6 fit.

---

## Related files

| Need | Where |
| --- | --- |
| Row checks | `core/scene_library.ttslua` (`validateRow`) |
| Chairs | `lib/figurine_seat_layout.ttslua` |
| Bridge ops | `dashboard/scenes.ttslua`, `dashboard/scene_library.ttslua` |
| In-game panel | `core/storyteller_scenes_panel.ttslua`, `ui/storyteller/panel_scenes*.xml` |
| `sessionScene` defaults | `core/state.ttslua` (`S.GetDefaultGameState`) |
| Apply / clock | `core/scenes.ttslua`, `core/present_day_clock.ttslua`, `core/hud_blindfold.ttslua` |
| Catalogs | `lib/constants.ttslua`, `lib/skyboxes_catalog.ttslua`, `lib/condition_defs.ttslua`, `lib/soundscape_catalog.ttslua` |
| Dashboard rows | `.dev/storyteller-dashboard/src/client/scenesPanel/library.ts`, `useLibraryActions.ts` |

Linear: [TOR-569](https://linear.app/eunomiac-dev/issue/TOR-569/storyteller-dashboard-scene-import-guide) (living doc), TOR-718 (in-game library read-only).

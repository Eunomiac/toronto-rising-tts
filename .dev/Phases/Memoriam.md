# Memoriam Play subphase

## Agent Routing

Read this when:
- changing Memoriam enter/exit, the configuration popup, overlay/clock during Memoriam, or period catalog lookup
- implementing remaining Memoriam plans (Play-as-NPC, period figurines, generic assignment, LUT)

Source of truth:
- `core/memoriam.ttslua` — enter/exit world apply (TOR-101)
- `core/memoriam_modal.ttslua` + `ui/storyteller/memoriam_modal.xml` — Host popup (does not change subphase until Advance)
- `lib/constants.ttslua` — `C.MemoriamSkyboxes`, `C.getMemoriamSkyboxesForCharacter`, `C.resolveMemoriamPanelURL`
- `lib/skyboxes_catalog.ttslua` — generated from `SKYBOXMEMORIAMCSV` (`npm run skyboxes:import`)
- `core/phases.ttslua` / `HUD_setPlaySubPhase` — Memoriam click opens the popup; Main/Downtime while active call `Memoriam.applyExit`
- `core/game_state_overlay.ttslua` — overlay while `Memoriam.isActive()`
- `core/scenes.ttslua` — `reconcileSkyboxFromState` uses panel Cloud URL while Memoriam is active
- `core/storyteller_scenes_panel.ttslua` — Scene Apply handoff / End Scene
- `core/state.ttslua` — `gameState.memoriam`

Verification:
- Save & Play → Phases **Memoriam** → configure → Advance (not Just Smoke)
- Re-open Memoriam from an already-running Memoriam and Advance again
- Exit via Main / Downtime, via Scenes Apply, and via End Scene
- Phase chrome: [Phases Overview](Phases%20Overview.md)

Status: current (TOR-101 / TOR-539–TOR-551 / TOR-564 / TOR-568). Remaining work is listed at the bottom — do not treat those items as shipped.

---

## What this is

Memoriam is a **Play subphase**, not a scene-library row. Clicking **Memoriam** on the Phases panel opens the configuration popup. The live subphase stays Main or Downtime until **Advance**. **Just Smoke** prints the payload and closes; it never calls `Memoriam.applyEnter`.

While Memoriam is active there is **no live library scene**. Applying a scene from the Scenes panel ends Memoriam first, then applies that scene. **End Scene** ends Memoriam and goes to Downtime no-scene.

---

## Modal payload

Advance (non–Just Smoke) prints and applies a table like:

```lua
{
  assignments = {
    aishe = { kind = "self" },
    lucien = { key = "jesseSharp", kind = "library", label = "Jesse Sharp" },
    rashid = { key = "myleneHamelin", kind = "library", label = "Mylene 'the Puck' Hamelin" },
  },
  date = "September 20, 1820",
  location = "Alamut, Afghanistan",
  panel = "panelA",
  periodIndex = 4,
  skyboxKey = "rashid7",
  sliderValue = 920,
  subjectKey = "rashid",
}
```

Just Smoke payloads set `justSmoke = true`, omit `skyboxKey` / `periodIndex`, and carry a copied Just Smoke `panel` table. They never reach `Memoriam.applyEnter`.

| Field | Meaning |
| --- | --- |
| `subjectKey` | Which of the five PCs is the Memoriam subject (`lucien`, `rashid`, `aishe`, `fomorach`, `blackCaesar`). Modal `lucien` maps to PlayerData `lordLucien`. |
| `skyboxKey` | Catalog key in `C.MemoriamSkyboxes` (not nested under the subject). |
| `panel` | `panelA`–`panelD` on that catalog entry. |
| `date` | Overlay/clock source string (`Month D, YYYY`). Parsed in `Memoriam.applyEnter`; overlay then shows the **formatted clock** date/time, falling back to this string only if the clock has no year/month/day. |
| `location` | Overlay district text. Site / parent-site / diamond separator / weather row are hidden. |
| `periodIndex`, `sliderValue` | Modal chronology only. Clock controls later do **not** rewrite the stored payload. |
| `assignments` | Optional per-PC rows (see below). |

The payload is stored on `gameState.memoriam.payload` after a successful enter.

### `assignments`

Optional keys for the five PCs. Kinds the modal can emit today:

| `kind` | Meaning | Runtime today |
| --- | --- | --- |
| `"self"` | Present as themselves | Seat stays active |
| `"library"` | Named NPC from the primary pool (`key` + `label`) | Stored; **not** applied as Play-as-NPC (TOR-95). Seat stays active as the PC. Host is alerted. |
| `"memoriam"` | Period NPC from this skybox’s `npcs` list (`label`; `key` may be absent) | Same as library — stored, not applied |

The subject is always included as `{ kind = "self" }` unless the modal assigned them an NPC. PCs omitted from the table are **not present** (`seatSlots[color].isPresent = false`) — deactivated, not marked Absent. PCs listed as present are seated even if they were Absent from the session (intended “ignore Absent assignees” is **not** implemented — see remaining work).

`kind = "generic"` is **not** produced by the modal yet.

---

## Catalog (not nested by character)

Do **not** look up `(data)[subjectKey][skyboxKey]`. Periods are a flat table:

- `C.MemoriamSkyboxes[skyboxKey]` — `characters` array, `startYear` / `endYear`, `location`, `splashText`, `panelA`–`panelD`, `npcs` (ten slots: `name`, `fullName`, `figurineScale`)
- `C.getMemoriamSkyboxesForCharacter(characterKey)` — ordered keys for the popup timeline
- Panel **image URL** is Cloud-only: `C.resolveMemoriamPanelURL(skyboxKey, panelKey)` (missing art errors loudly; TOR-564 / TOR-568)
- Cover image is Custom Asset **`memoriamBlindfold_<skyboxKey>`**, not a catalog `blindfoldURL` field (that field was removed)

Each panel has `display`, `isOutdoors`, `isDaytime`, `weather` (array of condition keys), `locationAudio`, and `url` (filled from Cloud at Constants load). Runtime clock **does not** read `isDaytime`; enter always picks a night hour (see Clock).

Period `npcs` exist in the catalog (and Cloud can stamp figurine/token URLs). **World figurines and tokens for those NPCs are not spawned yet.**

---

## Enter (`Memoriam.applyEnter`)

Only during Play. Staged HUD blindfold (same fade pattern as a scene Apply) using `memoriamBlindfold_<skyboxKey>`. Work under the cover (`applyWorldUnderCover`):

1. Remember `sceneLibrary.lastAppliedKey` as `returnSceneKey` and clone the live clock as `preMemoriamNowClock` (skipped on **re-enter** — see below).
2. Snapshot Health/Willpower for `"self"` assignees; flush the return scene’s library clock; `Scenes.clearLiveNarrativeForPhaseTransition`.
3. Clear live district/site/skybox override/narrative extras; `tableKey = "Table B"`; empty NPC seats (**Table B0**).
4. Seat layout: subject at **tableSlot 1**; other present PCs fill 2..n in stable key order. No NPCs at the table at start. Host may change table, seats, and NPC seating **after** enter.
5. Heal `"self"` PCs to full Health and Willpower (Hunger is left as-is). Skipped on re-enter.
6. Set Memoriam clock (below) and `SetTableTo("Table B")` without a second cover.
7. Write `gameState.memoriam`, set Play subphase to `MEMORIAM`, `Sync.full` (soundscape skipped), then skybox + soundscape + overlay reconcile.

Soundscape under cover: `Soundscape.applyContext` from the chosen panel (`isOutdoors` → indoor/outdoor ducking, first `weather[]` key or `"none"`, `locationAudio`). Empty `locationAudio` becomes **`silent`**. Weather audio and rain particles follow that weather key. Overlay weather chrome stays hidden.

### Re-selecting Memoriam

Opening the popup and Advancing again while Memoriam is already active reruns the staged cover and world apply with **`reinit = true`**: new payload, seats, clock, skybox, and audio; **original** `returnSceneKey`, `preMemoriamNowClock`, and `enterStats` are kept; Health/Willpower are **not** healed again.

---

## Clock and overlay

Enter picks a random time: either **00:00–01:59** or **21:00–23:59** (not dusk-relative yet). `useRealTime = true`, `realTimeSpeed = 1` (present-day scene rate, not ×5 catch-up), `isPresentDay = false`.

The **present-day / library** clock is not rewritten in place: the live clock at enter is flushed onto the return library row (when there is one) and cloned as `preMemoriamNowClock` for Scene Apply **NOW**.

Clock controls during Memoriam mutate `sessionScene.clock` as usual (including multi-year jumps). They must **not** change `gameState.memoriam.payload` (period, panel, skybox, assignments).

Overlay while active: district = payload `location`; datetime/time from the live clock; weather row off; location extras off.

---

## Exit (`Memoriam.applyExit`)

Always converts `"self"` tracker damage first:

1. Health and Willpower taken **during** Memoriam are measured against `enterStats`.
2. Tracks restore to the enter snapshot.
3. Memoriam Health damage (superficial + aggravated) is added to Memoriam Willpower damage and applied to the restored Willpower tracker (ordinary overflow / impaired rules).
4. **Hunger is never snapshotted or restored** — Hunger taken in Memoriam stays.
5. PCs who were assigned NPCs are not in `enterStats`, so NPC-body damage is not applied to the PC (correct even before TOR-95).

Then `gameState.memoriam` is cleared.

| How it ended | Mode | Subphase | World |
| --- | --- | --- | --- |
| Phases **Main** or **Downtime** | `restore` | **Main** if `returnSceneKey` exists, else **Downtime** | Re-applies that library scene (`applyActiveLibraryScene`, `"scene"` clock = flushed pre-Memoriam clock), or staged no-scene environment |
| Scenes **Apply** | `handoff` | **Main** | Caller continues the normal Apply. **NOW** uses `presentOverride` = `preMemoriamNowClock` (time just before Memoriam started), not the Memoriam clock |
| Scenes **End Scene** | `endScene` | **Downtime** | Caller continues End Scene (no-scene environment) |

Play-as-NPC reversal is not implemented because Play-as-NPC is not applied on enter.

---

## Remaining (do not drop)

These were specified for Memoriam and are **not** current runtime behavior. Keep them here until they ship.

- **Play-as-NPC (TOR-95):** `"library"` / `"memoriam"` (and later `"generic"`) assignees should play that NPC; `"self"` seats stay the PC. Reverse assignments on exit. Do not convert NPC-body damage onto the PC.
- **`kind = "generic"`** in assignments — modal + enter wiring (also blocked on Generic NPC seating / Play-as-NPC).
- **Period NPC world objects:** placeholder figurines/tokens (GUIDs) for catalog `npcs` that are not already in the named pool.
- **Ignore Absent PCs** listed in `assignments` — they should stay Absent; enter currently seats anyone with a color + assignment row.
- **Dusk-relative night window:** random time should be midnight–2:00 AM **or** from about one hour after dusk until midnight. Today the second window is fixed 21:00–midnight.
- **Unknown `locationAudio` key → silent.** Empty string already maps to `silent`. A key that is not in the soundscape catalog currently fails as unknown rather than falling back.
- **Memoriam LUT / sepia (TOR-321)** — not applied on enter; reverse on Spotlight/scene paths when it ships.
- **Panel `isDaytime`** is catalogued but unused by the clock picker.

# Scene Constructor Overview

## Agent Routing

Read this when:
- changing scene import, scene library, present-day clock, or saved scene activation behavior
- editing `gameState.sessionScene` or `gameState.sceneLibrary` shape
- updating the Storyteller Scenes UI import/fork/apply flows

Source of truth:
- `core/scene_library.ttslua`
- `core/storyteller_scenes_panel.ttslua`
- `core/scenes.ttslua`
- `core/present_day_clock.ttslua`
- `core/state.ttslua`
- `.dev/Scene Constructor/SchemaV2.jsonc`
- `.dev/Scene Constructor/import-template-full.jsonc`

Verification:
- `npm run build`
- `.dev/E2E Playbooks/Scenes-E2E.md`
- relevant scene-library step-by-step verification after Save & Play

Status: current scene import/library reference; verify state defaults and UI handlers against source.

The Scene Constructor lets the Host paste JSON (typically generated from a Google Sheet) to define a **saved scene**: a bundle that uses the **same shape as `gameState.sessionScene`**, plus library metadata. Saved scenes appear as activation buttons in the Storyteller Scenes UI so the Host can switch between beats without re-entering every field by hand.

## State model (single live authority)

- **`gameState.sessionScene`** is always the **live** narrative bundle that reconcilers and HUD code read. Mutations go through `S.setStateVal` / existing helpers, then the usual sync entry points (`Sync.full`, domain `reconcile*`, etc.).
- **`gameState.sceneLibrary`** holds **inactive** copies plus the active scene’s **mirror**:
  - `sceneLibrary.order` — array of scene keys for button order.
  - `sceneLibrary.scenes[sceneKey]` — `{ title, receivesLiveWrites, sessionScene }` where nested `sessionScene` matches the live table’s shape (defaults merged in `S.validateState`). **`receivesLiveWrites` defaults to `false`**; set **`true` when a scene is applied or forked** as the live mirror sink.
  - `sceneLibrary.activeKey` — which library entry is **selected** in the Scenes UI (`Apply` / `Unlink` / `Delete` target).
  - `sceneLibrary.lastAppliedKey` — which library entry was last **applied** to live `sessionScene` (clock flush on switch).

There is **no second reconciler input**: the library is persisted storage and (when linked) a **shadow copy** of the live bundle. The table always reflects `sessionScene` after sync.

## Import file shape (Google Sheet → paste)

The pasted JSON may include a small **import wrapper** (not stored inside nested `sessionScene`):

| Field | Required | Notes |
|-------|----------|--------|
| `schemaVersion` | Recommended | Integer; reject or migrate unknown versions with a clear error. |
| `sceneKey` | Yes | Stable id (`openingAudience`). Must match `^[a-zA-Z][a-zA-Z0-9_]*$` or your chosen rule. |
| `title` | Yes | Shown on the scene button. |
| `sessionScene` | Yes | Object whose keys align with **`gameState.sessionScene`** (see below). |

**Strict root keys:** The import wrapper may contain **only** `schemaVersion`, `sceneKey`, `title`, and `sessionScene`. Any other top-level key (e.g. `npcWorld`, `seatSlots`, `districtKey` pasted as a sibling of `sessionScene`) is a **validation error** with a path-specific message — the importer does **not** hoist or merge misplaced fields.

On successful import: upsert `sceneLibrary.scenes[sceneKey]`, set `title`, set **`receivesLiveWrites` to `false`** (import does **not** activate the scene or set `activeKey`), replace nested `sessionScene` from the payload (then `S.validateState` merges defaults).

### Full import JSON example (copy-paste)

**Annotated template:** [`import-template-full.jsonc`](import-template-full.jsonc) — schema v2 with every optional `sessionScene` field and inline comments (remove comments before paste). Minimal example: [`SchemaV2.jsonc`](SchemaV2.jsonc).

Below is one **complete** wrapper object valid for the Import modal: all five **PC** `seatSlots` keys are present (required). All four **NPC** keys are listed here explicitly; any **omitted** NPC key is auto-filled as `{ "slotEmpty": true }` by the importer. Replace `characterKey` values with keys that exist in your chronicle’s character data (`D.characters` / PCS). **`npcRoleOverride` is not authored in JSON** — the importer rebuilds it from PC `seatSlots` (`isPlayingNPC` + `npcCharacterKey`). **`chronicleWeatherFollowSchedule`** and **`chronicleWeatherManualHold`** are **not authored** for imports that use `soundscapeNarrative` weather — set **`wind`**, **`rain`**, and **`thunderstorm`** together or omit all three; the importer derives the two booleans (see **Soundscape**). You may omit **`seatPresent`** when every PC row sets **`isPresent`** (see **Seat slots**). `soundscapeNarrative` is optional intent applied on **scene Apply** (`Soundscape.mergeSessionSceneNarrativeIntoContext` + `applyContext`); `sessionScene` is still merged and defaults backfilled in `S.validateState`.

**Google Sheet authors:** use **`schemaVersion: 2`** and the canonical templates [`import-template-full.jsonc`](import-template-full.jsonc) (annotated) or [`import-schema-v2.json`](import-schema-v2.json) (valid JSON, no comments).

```json
{
  "schemaVersion": 1,
  "sceneKey": "openingAudience",
  "title": "Opening — St. Regis cells",
  "sessionScene": {
    "lightingPresetKey": null,
    "tableKey": "Table A",
    "seatSlots": {
      "Brown": {
        "characterKey": "fomorach",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "Orange": {
        "characterKey": "rashid",
        "isPlayingNPC": false,
        "isPresent": true
      },
  "Red": {
        "characterKey": "lordLucien",
        "isPlayingNPC": true,
        "npcCharacterKey": "myleneHamelin",
        "isPresent": true
      },
      "Pink": {
        "characterKey": "aishe",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "Purple": {
        "characterKey": "blackCaesar",
        "isPlayingNPC": false,
        "isPresent": true
      },
  "NPC1": {
        "slotEmpty": true
      },
      "NPC2": {
        "slotEmpty": true
      },
      "NPC3": {
        "slotEmpty": true
      },
      "NPC4": {
        "slotEmpty": true
      }
    },
    "districtKey": "BayStFinancial",
    "siteKey": "StRegisCells",
    "clock": {
      "hour": 3,
      "minute": 15,
      "day": 5,
      "month": 1,
      "year": 2026,
      "useRealTime": false,
      "realTimeSpeed": 1
    },
    "conditions": ["sceneBonusWpReroll"],
    "soundscapeNarrative": {
  "backgroundMusic": "casaLoma",
  "location": "silent",
  "wind": "silent",
  "rain": "silent",
  "thunderstorm": false,
      "isIndoors": true
    },
    "npcWorld": {
      "byArea": {
        "nearLeft": {
          "1": {
            "characterKey": "adrianVarga",
    "npcLightMode": "OFF"
   },
          "3": {
            "characterKey": "theAristocrat",
    "npcLightMode": "OFF"
   }
        },
        "centerForward": {},
        "nearRight": {},
        "farLeft": {},
        "farRight": {}
      }
    }
  }
}
```

### `sessionScene` fields (aligned with `core/state.ttslua`)

Use **flat** keys that already exist on live `sessionScene` (do not nest a separate `location` object in state — the Sheet may still *group* columns for humans, but the JSON applied to state should use `districtKey` / `siteKey`).

| Key | Type | Role |
|-----|------|------|
| `lightingPresetKey` | string | **Schema v2:** required; must be a key in **`C.LightModes`** (e.g. `IndoorBright`). Applied via `Scenes.reconcileFromState` → `U.applyLightingPreset`; seat spotlights still follow `L.reconcileForPlayer` priority. v1 imports may omit (null). |
| `isTopFogActive` | boolean | **Schema v2:** required. Reconciler sets `G.GUIDS.TOP_FOG` object state **2** (on) / **1** (off). |
| `tableKey` | string \| null | Table **intent** used with `RSL.SetTableTo`. May be an exact `C.Tables` key (`Table A`, `Table B4`, `Table C`) **or** a dynamic **family key** (`Table B`) that resolves to `Table B<occupied NPC seat count>` (B0–B4) at apply time — see [Rotational Coordinate Generator](../Rotational%20Coordinate%20Generator.md) § Dynamic table family keys (TOR-258). Physical table is `seatLayout.currentTableKey` (always concrete). |
| `seatPresent` | object | Sparse tri-state map (`nil` / `false` / `true`) — **derived** from `seatSlots` when `isPresent` is set (see `normalizeLiveSessionSceneSeatSlots` in `core/state.ttslua`). Imports may omit if every seat is described in `seatSlots`. |
| `seatSlots` | object | Per-seat rows (keys: `Brown`, `Orange`, `Red`, `Pink`, `Purple`, `NPC1`…`NPC4`). See **Seat slots** below. |
| `npcRoleOverride` | object | **Sparse** map: keys are **`C.PlayerColors`** only; value is an **NPC** `characterKey` string when that PC is playing as that NPC. Absent keys = no override. **Not authored in import JSON** — rebuilt from PC `seatSlots` by `SceneLibrary.syncNpcRoleOverrideFromSeatSlots` (import + `S.validateState`). |
| `districtKey` | string \| null | Chronicle district. |
| `siteKey` | string \| null | Site within district. Live location drives skybox via `Scenes.reconcileSkyboxFromState` (`C.Sites[siteKey].skyboxURL` or random `C.GenericSkyboxes`) unless `skyboxOverride` is set. |
| `skyboxOverride` | string \| null | Optional. URL for a custom table background / skybox image. When set (non-empty after trim), `Scenes.reconcileSkyboxFromState` uses this URL instead of the site or generic skybox. Omit / `null` / blank → no override. |
| `clock` | object | `hour`, `minute`, `day`, `month`, `year`, `useRealTime`, `realTimeSpeed`, **`isPresentDay`** (v2). Datetime fields may be omitted when `isPresentDay` is true (see **Present day clock**). **`realTimeSpeed`**: narrative-time multiplier when `useRealTime` is true — `1` ⇒ one in-fiction minute every 60 real seconds (not wall-calendar sync). |
| `chronicleWeatherFollowSchedule` | boolean | When `true`, clock-driven chronicle weather may feed soundscape. **Scene Constructor import:** set only by the importer from `soundscapeNarrative` — if **`wind`**, **`rain`**, and **`thunderstorm`** are all non-`null`, becomes **`false`** (weather locked to narrative); if none of those three are set, becomes **`true`**. Pasted values for these two flags are **overwritten** on import. |
| `chronicleWeatherManualHold` | boolean | When `true`, chronicle weather is not auto-applied on clock updates. **Import:** **`true`** when all three narrative weather fields are set; **`false`** when none are. |
| `conditions` | string[] | Optional. Registry condition ids with **`canApplyManually = true`** (same pattern as `C.Districts[*].conditions`). Applied to **present** PCs via `Conditions.reconcileHostedForSession` for the scene duration. Stat and roll effects use registry channels (`statChanges`, `roll`, etc.). **`rollDefaults` is removed** — import fails if present. |
| `soundscapeNarrative` | object | Optional **intent** consumed **only on scene apply**: mapped into `gameState.soundscape` with the same setters / helpers the Storyteller UI uses. Empty `{}` if unused. **Import:** `wind`, `rain`, and `thunderstorm` must be **all** non-`null` together or **all** omitted / `null` — mixed is a validation error; when all three are set, the importer sets `chronicleWeatherManualHold` / `chronicleWeatherFollowSchedule` (see table above). See **Soundscape** below. |
| `npcWorld` | object | `placements` (authoritative); optional import-only `byArea` — see **NPC world** below. |

### `npcRoleOverride` (`sessionScene.npcRoleOverride`)

Reserved for **“PC seat is playing as an NPC”** (NPC occupying a PC table seat) once the table / sheet / HUD wiring exists. **Shape:** a flat object with **at most one key per player color** (`Brown`, `Orange`, `Red`, `Pink`, `Purple`). Each value is either omitted / JSON `null` (no override for that color) or a **non-empty string**: an NPC **`characterKey`** from `npcs_data` / `D.characters`.

**Authoritative source in imports:** only **`seatSlots`**. For each PC row, keep **`characterKey`** as the **real** chronicle PC for that seat. When **`isPlayingNPC`** is **`true`**, set **`npcCharacterKey`** to the NPC being played; the Scene Constructor import path and `S.validateState` call **`SceneLibrary.syncNpcRoleOverrideFromSeatSlots`**, which sets e.g. `"npcRoleOverride": { "Red": "myleneHamelin" }` and drops any stale keys. Pasted JSON that still includes `npcRoleOverride` is **overwritten** by that sync so `seatSlots` cannot disagree with the override map.

### Seat slots (`sessionScene.seatSlots`)

Each key is a **seat id** (`C.PlayerColors` + `C.NPCSeats`). **Import** (`SceneLibrary.validateAndNormalizeImportPayload`): every **PC** key must be present or validation fails; any **missing** `NPC1`…`NPC4` key is auto-filled as `{ "slotEmpty": true }`. **Live** merges (`normalizeLiveSessionSceneSeatSlots` in `core/state.ttslua`): a key can be **omitted** to leave that seat unchanged relative to other fields. Value is an object when the key is present:

**PC seats (`Brown` … `Purple`):**

```jsonc
"Red": {
  "characterKey": "lordLucien",
  "isPlayingNPC": true,
  "npcCharacterKey": "myleneHamelin",
  "isPresent": true
}
```

- `characterKey` — optional string; the **real** chronicle PC (`pcs_data` / PCS) for this seat, regardless of whether the player is currently playing an NPC at the table.
- `isPlayingNPC` — optional boolean; when **`true`**, **`npcCharacterKey`** is **required** on import (non-empty string): NPC `characterKey` played at this PC seat; drives **`npcRoleOverride`** for this color after sync.
- `npcCharacterKey` — required when `isPlayingNPC` is true; ignored when `isPlayingNPC` is not true. Not used for NPC bench seats (`NPC1`…`NPC4`).
- `isPresent` — optional boolean or null-equivalent: when **set**, drives `sessionScene.seatPresent[seat]` and thus lighting “present” checks.

**NPC seats (`NPC1` … `NPC4`):**

```jsonc
"NPC1": {
  "characterKey": "adrianVarga",
  "isPresent": true
},
"NPC2": { "slotEmpty": true }
```

- `characterKey` — non-empty string occupies the slot (`gameState.seatLayout.occupiedNPCSlots` updated on validate when this row is present).
- `slotEmpty` — `true` marks the slot empty in **imported** / authored JSON (`occupiedNPCSlots` → `false` on validate when no live gameboard assignment exists).
- On **import**, omit an `NPC1…NPC4` key when you want that slot stored as **empty** (the importer adds `{ "slotEmpty": true }`).
- In **`normalizeLiveSessionSceneSeatSlots`** (`core/state.ttslua`), an existing `seatSlots[NPCn]` row with `slotEmpty == true` clears `occupiedNPCSlots` only when that seat has **no** live string assignment; gameboard **Apply** backfills `characterKey` from `occupiedNPCSlots` when the two drift (TOR-311). A non-empty `characterKey` always wins. A **missing** NPC key does not change `occupiedNPCSlots` in that pass.

**NPC homeland + stage (TOR-250 / TOR-281):** The same `characterKey` may appear in both `seatSlots[NPCn].characterKey` and `npcWorld.placements[characterKey]` when the figurine is on stage but retains a homeland seat — set **`isPresent`: `false`** on that NPC seat row (import validation rejects an **active** seat + stage combo). Control-board **Apply** auto-sets `isPresent = false` when a homeland character gains a placement row. **Clear** re-seats the figurine at the homeland when the token returns to the seat row; when the homeland seat was **disabled** before Clear, it **activates** only if the staged `npcLightMode` was visible (not `OFF`); an already-enabled seat stays enabled. ST seat activate/deactivate (Scenes panel or gameboard seat row) writes `seatSlots.isPresent` back into the linked library row via `writeSeatNarrativePresence` → `SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked`.

### Soundscape (`sessionScene.soundscapeNarrative`)

Optional keys (all optional; `{}` means “no narrative-driven apply” for apply-time mapping):

- `backgroundMusic`, `location`, `wind`, `rain`, `thunderstorm` — **apply** maps these into `gameState.soundscape` using the **existing** mutation paths (same as panel actions), never a duplicate weather pipeline. **`isIndoors` is not read from `soundscapeNarrative`** — indoor/outdoor ducking comes from `C.Sites[siteKey].isIndoors` when the site is applied.

**Scene Constructor import — narrative weather vs chronicle flags**

- Treat **`wind`**, **`rain`**, and **`thunderstorm`** as a single triple: after `JSON.decode`, each is either **`nil`** (key absent or JSON `null`) or **non-`nil`** (including `thunderstorm: false`).
- **Invalid:** exactly one or two of the three are non-`nil` (mixed overrides).
- **All three non-`nil`:** scene weather is **locked** to those narrative values — importer sets **`chronicleWeatherManualHold`** = **`true`** and **`chronicleWeatherFollowSchedule`** = **`false`** (any pasted `chronicleWeather*` values are **replaced**).
- **None** of the three non-`nil`:** importer sets **`chronicleWeatherManualHold`** = **`false`** and **`chronicleWeatherFollowSchedule`** = **`true`** (chronicle schedule may drive weather unless changed later in play).

Live / non-import edits still set `chronicleWeather*` with `S.setStateVal` like any other mutation when the Storyteller UI (or scene apply) does so.

### NPC world (`sessionScene.npcWorld`) — `placements` (authoritative)

**Runtime and reconcile** use **`placements` only**: a sparse map keyed by **`characterKey`** → `{ u, v, yaw?, npcLightMode?, groundLevel? }` where **`u` / `v`** are **0–1** on **STAGE_BOARD** (same frame as control-board Apply). **`Sync.full`** → `NPCS.reconcileAllFromState` places figurines and mirrors control-board tokens from `placements`.

```jsonc
"npcWorld": {
  "placements": {
    "adrianVarga": {
      "u": 0.18,
      "v": 0.72,
      "yaw": 0,
      "npcLightMode": "OFF",
      "groundLevel": -15
    }
  }
}
```

- **`groundLevel`** — optional absolute world **Y** (from legacy area `groundLevel` when converting); omitted → derived from snap ring at `u,v` in play.
- **`npcLightMode`** — `OFF` / `STANDARD` / `SPOTLIGHT`; invalid → `STANDARD`.

**Import convenience — `byArea` (converted, not stored):** You may still paste the legacy sparse area layout in import JSON. The importer converts each slot to **`placements`** via the same geometry as `lib/npcs_data` area slots (`lib/npc_placements_convert.ttslua`) and **clears `byArea`** before the scene is saved. Existing **`placements`** rows win if both define the same `characterKey`.

```jsonc
"npcWorld": {
  "byArea": {
    "nearLeft": {
      "1": { "characterKey": "adrianVarga", "npcLightMode": "OFF" }
    }
  }
}
```

Area keys: `centerForward`, `nearLeft`, `nearRight`, `farLeft`, `farRight` (must match `lib/npcs_data.ttslua`). Slot keys are string indices (`"1"`, `"3"`, …).

**Offline migration** for saves / library rows that still have `byArea`: `npm run npc-placements:migrate-byarea` (see `.dev/scripts/migrate_npc_byarea_to_placements.mjs`).

Runtime NPC instances remain under **`gameState.npcs.instances`**. **Do not author `npcWorld.preload`** — v2 import rejects it; the engine maintains the under-table preload pool automatically.

### Present day clock (`clock.isPresentDay`)

In-fiction chronicle time — **not** real-world date/time.

| State | Role |
|-------|------|
| `gameState.presentDayClock` | Monotonic chronicle “now” (`year`…`minute` only). |
| `gameState.sessionScene.clock` | Live clock for the active scene. |
| `sceneLibrary.scenes[sceneKey].sessionScene.clock` | **Each** library row’s saved clock (always maintained; active linked rows also mirror from live on `Sync.full`). |

**Rules**

1. **Bootstrap:** First activation of a scene with `isPresentDay == true` and a **full** datetime while `presentDayClock` is unset → initialize `presentDayClock` from that scene.
2. **Monotonic advance:** Whenever any path sets or ticks a scene clock to time **T**, if **T** is later than `presentDayClock`, advance `presentDayClock` (no rewind).
3. **Apply without datetime:** Present-day scene may omit datetime fields (flags only). On apply, copy datetime from `presentDayClock` (error if present day was never initialized).
4. **Historical scenes:** `isPresentDay == false` requires full datetime on import.
5. **Return to scene:** Apply uses the **library row’s saved clock** (may be behind present day). Real-time ticks advance present day only after scene time catches up. **`presentDayClock` never rewinds on activation** — returning to an earlier saved scene time does not move chronicle “now” backward; `PresentDayClock.tryAdvance` only runs forward. Storyteller **Set** (Scenes panel) may overwrite present day backward via `PresentDayClock.setPresentDay`.

**Scenes panel preview / edit-before-apply (TOR-244):** Selecting a library row whose key differs from `lastAppliedKey` (**pending**) previews that row’s **Table**, **Seat Presence**, **Location**, and **Scene Time** on the left panel. Panel “on” highlights use **blue** while pending (vs **green** when the selected row is the live on-table scene). Edits while pending:

- **Table / seats / location** write immediately into `sceneLibrary.scenes[activeKey].sessionScene` (no `SetTableTo` / soundscape / world reconcile). Location **Apply** validates and stores keys (+ top fog) on the row only.
- **Clock** still uses the in-memory `clockDraft` until **Activate scene** (same present-day rules as below).

When `activeKey == lastAppliedKey` (or no selection), the panel stays live-bound: table transitions, seat world reconcile + TOR-281 mirror, and Apply location + soundscape behave as before.

**Scenes panel clock row:** Selecting a library row previews the clock that **activation** would use. Rows with a **saved datetime** (including present-day scenes left at a specific time) preview that saved time, not current `presentDayClock`. Present-day rows **without** datetime preview current `presentDayClock`. **Set** (beside day/year/time) overwrites `presentDayClock` from the stashed inputs without changing live `sessionScene.clock`. Edits while a **different** row is selected are stored in a pending draft and apply on **Activate scene**. Clearing **any** of day / year / time on a pending **present-day** row ignores the saved row datetime and uses `presentDayClock` on activation instead. Future times on activation advance `presentDayClock` via `PresentDayClock.tryAdvance`.

**Clock “not set”:** `clock` may exist with only flags — all five datetime fields absent. Datetime fields are **never** defaulted during import validation or `S.validateState`; historical scenes without a full datetime fail validation.

Implementation: [`core/present_day_clock.ttslua`](../../core/present_day_clock.ttslua); `sceneLibrary.lastAppliedKey` flushes the previously applied row’s clock before switching. **End scene** also flushes the live clock onto the mirroring row before detach (TOR-142) so exit time survives End.

### Four clock-aware Apply buttons (TOR-142)

Library Apply is four buttons (`Scene Time` / `×5 to Now` / `SET Now` / `NOW`). All run the **same** staged full-scene Apply; they differ only in clock mode:

| Button | Mode | Clock |
| --- | --- | --- |
| Scene Time | `scene` | Library authored datetime → live; present-day advances via `tryAdvance` only |
| ×5 to Now | `x5` | Same as Scene Time; if behind present-day, temporary RT at **recorded speed × 5** until catch-up (clamp), then restore flags/speed |
| SET Now | `setPresent` | Scene datetime → live **and** `PresentDayClock.setPresentDay` (may rewind chronicle “now”) |
| NOW | `present` | Ignore library datetime; fill from `presentDayClock`; keep library flags |

Scene Time / ×5 / SET Now are **disabled** until the selected row has an authored datetime (clockless present-day import uses NOW first; live play + flush/mirror later enables the other three from exit time). Animated ease-in/out jumps remain **TOR-222**, not ×5.

## Switching scenes

Scene **Apply** uses the **staged** transition `core.hud_blindfold.runStagedTransition` (built on `U.RunSequence`) so heavy reconcile never competes with audio fade scheduling (TOR-147). Phases:

1. **Blindfold down** — close Scenes panel, show one random blindfold variant; slide-in is 1s.
2. **Fade-out (~1s, concurrent with slide-in)** — `Soundscape.fadeOutTransitionAmbient` fades BGM + location + weather toward silence (emitter-only; no `gameState` intent change). Weather compares **outgoing vs incoming** (preview from the target bundle): different track → full fade-out; same track, different volume → duck to the **lower** volume (hold without restart, TOR-136).
3. **Heavy work (settle ~0.75s)** — write **live** state from the chosen library entry’s `sessionScene`, switch table, hosted reconcile, `Sync.full({ skipSoundscape = true })`. New soundscape is **not** applied here.
4. **Silent settle** — `M.setCamera(..., "default")` for all seated players, then hold the blindfold **down in silence** for the rest of the settle window (`settleDelaySec - workSettleSec`, ~9.25s of a 10s budget). New soundscape is still **not** applied.
5. **Lift + fade-in (~2s, concurrent)** — at the **end** of the settle, `Scenes.applyActiveSceneSoundscapeFromSession()` runs inside `Soundscape.beginTransitionFadeWindow` **as the blindfold rises**, so the new scene audio fades in alongside the visual reveal (TOR-273; ~2s `TRANSITION_FADE_IN_SEC`). Blindfolds lift once via `scheduleEnd(0)`.

(Standalone table toggles still use `runTransition`; the legacy single-burst `runTransitionAfterLeadIn` remains for callers that apply everything at once.)

## Import validation (modal UX)

Validation runs **when the Host confirms import**, **before** the modal closes.

The Host’s pasted text is passed through **`U.sanitizeJsonTextRemoveTrailingCommas`** before **`JSON.decode`**, so **trailing commas** after the last property in an object or array (common spreadsheet / “JSON-like” exports) are tolerated. This is a **lightweight** fix, not full JSON5: avoid putting `,}` or `,]` inside **string values** if you ever need those literal sequences.

- If validation **fails**: keep the modal open; set a dedicated UI **text element** under the confirm control to a **short, actionable** message (one primary error first; optional “also:” second line if cheap).
- If validation **succeeds**: close the modal, write `sceneLibrary`, then `S.validateState` and refresh buttons.

**Schema v2** (`schemaVersion: 2`): requires `lightingPresetKey` (valid `C.LightModes` key), `isTopFogActive` (boolean), `clock.isPresentDay` (boolean); rejects `npcWorld.preload`. Historical scenes (`isPresentDay: false`) require full clock datetime. Present-day scenes may omit all five datetime fields (flags only). **Datetime defaults are never applied:** partial datetime (some fields set, others missing) is rejected; `S.validateState` merges clock **flags** only, not hour/minute/day/month/year.

Messages should name the **JSON path** and the **fix** (e.g. `sessionScene.seatSlots.NPC2.characterKey: expected string or omit key; got number.`, `sessionScene.rollDefaults: removed — use sessionScene.conditions (array of registry ids with canApplyManually true).`, `sessionScene.conditions[1]: unknown condition id "foo".`, `sessionScene.conditions[1]: "torpor" has canApplyManually false — only manually applicable conditions may be listed on import.`, `sessionScene.soundscapeNarrative: set wind, rain, and thunderstorm together, or omit all three — mixed weather overrides are invalid.`, `Import root has unexpected key(s): npcWorld. Allowed root keys: schemaVersion, sceneKey, title, sessionScene only. Move npcWorld inside sessionScene — it must not be a sibling of sessionScene at the import root.`, `sceneKey: must match pattern …`, `schemaVersion: unsupported value 7; this build supports 2.`).

**`InputField` for paste / titles:** Do not read live `InputField` text with `UI.getValue` on confirm. Follow the TTS contract and in-repo reference (`rollDash_difficulty_*` + `HUD_rollSetDifficulty`): use **`onValueChanged` / `onEndEdit`** to stash the **`value`** argument, prefill with **`UI.setAttribute(id, "text", …)`**, and read from stash on confirm. See [`.dev/SOLVING ISSUES & DEBUGGING.md`](../SOLVING%20ISSUES%20%26%20DEBUGGING.md) (*Global UI `InputField` — typed text*).

## UI controls

Storyteller **Scenes** tab shows two columns (`ui/storyteller/panel_scenes_host.xml`): narrative controls + import/fork modals on the left; **Scene library** (`panel_scenes_library.xml`) on the right with fixed slot buttons and constructor actions.

For each key in `sceneLibrary.order`, activate a pre-declared dummy button (`scenes_lib_slot_01`…`40`, **three** library columns — 14/13/13) and set label from `scenes[k].title` **plus one short status suffix** (e.g. `Grand Audience · unlink`) — do **not** prefix `[sceneKey]`, and do **not** use `setXML` / `setXMLTable` for dynamic lists. Selected row: **green** when it is the live on-table scene, **blue** when pending (preview/edit library only); inactive: default; unlink grey (see below).

- **Import Scene** — opens modal with large text field + confirm; validation as above.
- **New Scene** — **fork** the live table into a new library row (see **Forking a scene** below). Does **not** blindfold or apply state: the physical table and `gameState.sessionScene` stay as they are; only `sceneLibrary` changes so future mirrors target the new row while the previous row stays pinned to the fork-time snapshot.
- **Unlink Scene** — sets `receivesLiveWrites = false` on the **active** library entry only: **stop mirroring** live `sessionScene` into that entry’s stored `sessionScene`. Does **not** snapshot-freeze; the stored bundle simply stops receiving updates until linked again.
- **Delete Scene** — arm mode → pick scene → confirm → remove from `scenes` and `order`, clear `activeKey` if deleted, then refresh.
- **Apply (four clock modes)** — see **Four clock-aware Apply buttons (TOR-142)** above.
- **End Scene** — narrative end: notify players, **flush live clock** onto the mirroring library row, then **`SceneLibrary.detachLiveTableFromLibraryMirror()`** (stop `receivesLiveWrites`, clear `lastAppliedKey`, keep `activeKey` on the ended row for pending display — TOR-365), apply default no-scene via staged blindfold (TOR-147). Closes the Scenes panel.

## Forking a scene (“New Scene”)

Use this when the Storyteller wants to **keep going** on the current table setup but **preserve a return point**: the row that was receiving live updates stops updating and stays exactly as things stood at the fork; a **new** row becomes the mirror target so later play only mutates that copy.

**Behavior (single atomic mutation pass on `sceneLibrary` + `activeKey`):**

1. **Source of truth for the fork** — Deep-clone the **live** narrative bundle from `gameState.sessionScene` (and any other slices you define as mirrored into library entries, e.g. companion fields you later add to the shadow). Call this clone `F`.

2. **Previous active row** — Let `K = sceneLibrary.activeKey`. If `K` is non-nil and `scenes[K]` exists:
   - Set `scenes[K].sessionScene = F` (so the “original” row matches the fork instant exactly — no one-frame drift vs the new row).
   - Set `scenes[K].receivesLiveWrites = false` so it **no longer** receives mirror updates after this click.

3. **New row** — Allocate a **new unique** `sceneKey` derived from `K` (e.g. `openingAudience` → `openingAudience_2`, then `_3`, … skipping collisions with any existing `scenes` key). Set `title` similarly (e.g. append ` (2)`, ` (3)`, or match the key suffix — keep it obvious in the UI).
   - `scenes[newKey] = { title = <derived>, receivesLiveWrites = true, sessionScene = U.clone(F) }`.
   - Append `newKey` to `sceneLibrary.order` (typically after `K` or at the end — product choice).
   - Set `sceneLibrary.activeKey = newKey`.

4. **No world reconcile** — Do not run scene-apply / blindfold / `Sync.full` solely because of New Scene: live state is unchanged; only which library entry is the **mirror sink** changes.

5. **Returning to the original** — The Host switches back to scene button `K`. That runs the normal **switch scene** pipeline: apply `scenes[K].sessionScene` to live state and reconcile. Because `K`’s bundle was fixed at `F` when the fork happened, the table returns to that **saved moment**, while the forked row `newKey` still holds whatever was mirrored during the “continuation” branch (for comparison or resuming later).

**Edge cases**

- **`activeKey` is nil** (no row was mirroring): still create a new row from a clone of live `sessionScene`, set `receivesLiveWrites = true`, `activeKey = newKey`, append to `order`. There is no prior row to pin.
- **Collision-safe keys** — Scan existing `scenes` keys when picking `_2`, `_3`, … so imports and prior forks never collide.

## Unlink and “always up to date” (recommended wiring)

**Goal:** While a scene is active, its library row should stay aligned with play **without** a manual “save scene” step.

**Recommended pattern (avoids dual-writer reconciler bugs):**

1. **One live writer:** All runtime mutations continue to update **`gameState.sessionScene`** (and existing companions like `soundscape`, `npcs`, etc.) exactly as they do today.
2. **At most one mirrored library row:** When a row has `receivesLiveWrites == true`, **`SceneLibrary.mirrorActiveLibrarySessionSceneFromLiveIfLinked`** deep-clones live `gameState.sessionScene` into that row’s `sessionScene` after each `Sync.full` pass **and** immediately after each `seatSlots.isPresent` write (`NPCS.writeSeatNarrativePresence`, TOR-281). The mirror target is **`SceneLibrary.resolveMirrorSceneKey()`**: linked `activeKey` when set (fork / post-apply), otherwise linked `lastAppliedKey` so selecting another row for a pending Apply does not stop mirroring the scene currently on the table.
3. **Unlink:** Flip `receivesLiveWrites` to `false` for that entry; mirroring stops. The copy is **whatever it was last time mirroring ran** — not a special freeze pass.
4. **Inactive scenes:** Other library entries are **not** updated while inactive (no N-way fan-out on every seat toggle).

This gives you “always current” for the **active** saved scene with **one** authoritative live record and a **passive shadow** for persistence, not two competing sources of truth for the table.

---

## Test Output

```json
{
  "schemaVersion": 1,
  "sceneKey": "openingAudience_3",
  "title": "Opening Audience_3",
  "sessionScene": {
    "lightingPresetKey": null,
    "tableKey": "Table A",
    "seatSlots": {
      "Red": {
        "characterKey": "lordLucien",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "Orange": {
        "characterKey": "rashid",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "Pink": {
        "characterKey": "aishe",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "Brown": {
        "characterKey": "fomorach",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "Purple": {
        "characterKey": "blackCaesar",
        "isPlayingNPC": false,
        "isPresent": true
      },
      "NPC1": {
        "characterKey": "myleneHamelin",
        "isPresent": true
      },
      "NPC2": {
        "slotEmpty": true
      },
      "NPC3": {
        "slotEmpty": true
      },
      "NPC4": {
        "slotEmpty": true
      }
    },
    "districtKey": "BayStFinancial",
    "siteKey": "StRegisCouncilChamber",
    "skyboxOverride": null,
    "clock": {
      "hour": 22,
      "minute": 15,
      "day": 14,
      "month": 9,
      "year": 2026,
      "useRealTime": true,
      "realTimeSpeed": 1
    },
    "conditions": ["sceneBonusWpReroll"],
    "soundscapeNarrative": {
      "backgroundMusic": "main",
      "location": "apothecary",
      "wind": "windMed",
      "rain": "silent",
      "thunderstorm": false
    },
    "npcWorld": {
      "byArea": {
        "farLeft": {
          "1": {
            "characterKey": "theAristocrat",
            "npcLightMode": "OFF"
          }
        },
        "nearLeft": {
          "1": {
            "characterKey": "evangelineDupont",
            "npcLightMode": "OFF"
          },
          "2": {
            "characterKey": "oliverGagnon",
            "npcLightMode": "OFF"
          }
        },
        "centerForward": {},
        "nearRight": {
          "1": {
            "characterKey": "nasirKhan",
            "npcLightMode": "OFF"
          },
          "2": {
            "characterKey": "fatherDiaz",
            "npcLightMode": "OFF"
          }
        },
        "farRight": {
          "1": {
            "characterKey": "eddie",
            "npcLightMode": "OFF"
          },
          "2": {
            "characterKey": "alexisHoltt",
            "npcLightMode": "OFF"
          },
          "3": {
            "characterKey": "lexieMadi",
            "npcLightMode": "OFF"
          },
          "4": {
            "characterKey": "averyInnis",
            "npcLightMode": "OFF"
          },
          "5": {
            "characterKey": "benedictKincaid",
            "npcLightMode": "OFF"
          }
        }
      }
    }
  }
}
```

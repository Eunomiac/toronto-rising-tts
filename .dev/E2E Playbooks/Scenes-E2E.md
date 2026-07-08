# Scenes — manual E2E playbook

## Agent Routing

Read this when:
- validating scene library Apply/End, clock behavior, map pins, seat presence, or soundscape-on-scene workflows
- changing Storyteller Scenes panel code, present-day clock logic, player HUD map/location UI, or scene constructor state shape

Source of truth:
- `core/storyteller_scenes_panel.ttslua`
- `core/present_day_clock.ttslua`
- `core/game_state_overlay.ttslua`
- `core/hud_player.ttslua`
- `.dev/Scene Constructor/Scene Constructor Overview.md`
- `.dev/HUD_FUNCTIONS.md`

Verification:
- `npm run build`
- TTS manual suites in this file
- `DEBUG.showScene()`
- `DEBUG.inspectSoundscapeAudio()`

**TOR-141** · Author: table **Host** (seat **Black** recommended) · Est. time: **~35 min smoke** (Suites 0, A–E) · **~100 min full** (F–M clocks, seats, map pins).

Solo dev: one client is enough. Storyteller panels use `visibility="Host"`, not a second player.

Ground truth: [`core/storyteller_scenes_panel.ttslua`](../../core/storyteller_scenes_panel.ttslua), [`core/present_day_clock.ttslua`](../../core/present_day_clock.ttslua), [`core/game_state_overlay.ttslua`](../../core/game_state_overlay.ttslua), [`core/hud_player.ttslua`](../../core/hud_player.ttslua), [`.dev/Scene Constructor/Scene Constructor Overview.md`](../Scene%20Constructor/Scene%20Constructor%20Overview.md), [`.dev/HUD_FUNCTIONS.md`](../HUD_FUNCTIONS.md) § Scenes.

**Deferred in code (document only):** TOR-142 (four clock-aware Apply buttons). **TOR-153** unmappable pin hide shipped in TOR-245 reconcile. **TOR-152** baseline shipped (`Scenes.reconcilePlaySessionOnEnter` on load gate + `advancePhase`).

## Deterministic test conventions

Every step in a suite you run is **mandatory** for that suite. Do not improvise row keys, site keys, click counts, or expected values.

| Rule | Requirement |
| --- | --- |
| Library rows | Name exact `scenes_lib_slot_XX` / row keys in each step (from your prereq notes) |
| Pass criteria | State exact values in console checks (`siteKey`, `activeKey`, clock fields) — no “or equivalent” |
| RT speed | Set **`realTimeSpeed` = 60** when a step says so; reset to **1** in the same suite |
| Deferred suites | **E, N, M2, M mirror** are **not** in smoke A–E; run only when listed in full pass |

---

## Solo Host (one client)

| Goal | Solo approach |
| --- | --- |
| Scenes / library / clock UI | Seat **Black**; Host-only toolbar |
| Map pin checks | Open **Map** reference panel (any seat color’s HUD); pins are per viewer seat column |
| RT clock wait tests | Use `realTimeSpeed` **60** for ~1 narrative minute per real second (reset after) |

## Prerequisites

1. **Save & Play** so bundled Lua matches repo.
2. **Phase Play** (or apply from Session Start — apply promotes Start → Play).
3. **Scene library:** at least **two** rows with **different** `siteKey` (strongly different `offsetXY` on map) and **different** saved clocks for Suite B / F / G.
4. **Present-day row:** one scene with `sessionScene.clock.isPresentDay: true` and full datetime (for chronicle bootstrap).
5. **Historical row (full pass only):** one scene with `isPresentDay: false` and full datetime — required **only** for Suite M2.
6. Record **exact** library slot keys, `siteKey` values, and `offsetXY` for rows **A** and **B** before Suite A.

## Inspection cheat sheet

```lua
-- Library ↔ live linkage
print("activeKey", S.getStateVal("sceneLibrary", "activeKey"))
print("lastAppliedKey", S.getStateVal("sceneLibrary", "lastAppliedKey"))

-- Live narrative bundle
print("site", S.getStateVal("sessionScene", "siteKey"))
print("district", S.getStateVal("sessionScene", "districtKey"))
print("table", S.getStateVal("sessionScene", "tableKey"))
print("phase", S.getStateVal("currentPhase"))

-- Clocks (two layers)
print("scene clock", JSON.encode_pretty(S.getStateVal("sessionScene", "clock")))
print("present day", JSON.encode_pretty(S.getStateVal("presentDayClock")))

-- Seat narrative presence
print("seatPresent", JSON.encode(S.getStateVal("sessionScene", "seatPresent")))
print("seatSlots", JSON.encode(S.getStateVal("sessionScene", "seatSlots")))

-- Site map offset (replace SITE_KEY)
local sk = S.getStateVal("sessionScene", "siteKey")
if sk and C.Sites[sk] then print("offsetXY", C.Sites[sk].offsetXY) end

DEBUG.showScene()
DEBUG.inspectSoundscapeAudio()
```

**Clock layers**

| State | Role |
| --- | --- |
| `sessionScene.clock` | Live scene time + flags (`useRealTime`, `realTimeSpeed`, `isPresentDay`) |
| `presentDayClock` | Chronicle “now” (Y/M/D/h/m only) — **monotonic forward** except ST **Set** |
| `sceneLibrary.scenes[K].sessionScene.clock` | Per-row saved time; flushed from live when switching away |

**RT speed:** `realTimeSpeed` adds that many **narrative minutes per 60 real seconds** (1 ⇒ ~1 min per wall minute). `0` = ticker runs but time does not advance.

**Apply scene:** blindfold ~**2 s** lead-in + **10 s** settle → `PresentDayClock.resolveAndApplyActivationClock` → `MapPins.onSceneApplied()` → `Sync.full`.

**Dice on table:** Scene Apply and Scenes-panel table toggles are blocked while any loose `d10`-tagged die exists on the table (`RSL.hasLooseDiceOnTable` — containers excluded; dice with `y < -50` are treated as under-table preload stash). Finish or cancel rolls before switching layout.

---

## Step 0 — Cleanup

**Human:** If `sessionScene.siteKey` is set, click **End scene** to clear location. Record `lastAppliedKey` from console.

```lua
print("lastAppliedKey", S.getStateVal("sceneLibrary", "lastAppliedKey"))
print("site", S.getStateVal("sessionScene", "siteKey"))
```

**Pass if:** You know library row keys to use in later suites.

---

## Smoke path (Suites A–E)

### Suite A — Apply library scene

**Goal:** Library row → live `sessionScene`; world matches after blindfold.

#### Step A1 — Select library row

**Human:** Storyteller toolbar → **Scenes** → click `scenes_lib_slot_XX` (pending `activeKey`, not on table yet).

**Pass if:** Slot highlights; metadata visible.

**Stop if:** Empty library — import via Scene Constructor first.

#### Step A2 — Apply

**Human:** **Apply** (`scenes_lib_btn_apply`) → wait full blindfold (~12 s).

**Pass if:** GM alert names scene; lighting/audio begin changing; no Lua errors.

**IDE Lua:**

```lua
print("lastAppliedKey", S.getStateVal("sceneLibrary", "lastAppliedKey"))
print("activeKey", S.getStateVal("sceneLibrary", "activeKey"))
print("site", S.getStateVal("sessionScene", "siteKey"))
print("lighting", S.getStateVal("sessionScene", "lightingPresetKey"))
print("phase", S.getStateVal("currentPhase"))
```

**Pass if:** `lastAppliedKey == activeKey` (applied row); `siteKey` / `tableKey` match row; phase **Play**.

#### Step A3 — Visual / audio

**Human:** Lighting, center-top overlay date/time, NPC stage placements (`npcWorld.placements` on gameboard u/v), BGM/location/weather without loud burst (TOR-136).

```lua
local nw = S.getStateVal("sessionScene", "npcWorld")
if type(nw) == "table" and type(nw.placements) == "table" then
  for k, row in pairs(nw.placements) do
    if type(row) == "table" then
      print("placement", k, row.u, row.v)
    end
  end
end
DEBUG.inspectSoundscapeAudio()
```

**Gameboard regression:** For a library row with **2+** `npcWorld.placements` keys, use that row as `GB_E2E_SCENE_ROW` in [Gameboard-E2E](Gameboard-E2E.md) (default `scenes_lib_slot_03`) and run `gbE2eRunSmoke()` → scene Apply gate → `gbE2eContinue()`.

---

### Suite B — Switch to a second scene

**Human:** Select **different** library row (different site preferred) → **Apply** → wait blindfold.

**Pass if:** Site/lighting/audio visibly change; keys reflect scene B.

```lua
print("lastAppliedKey", S.getStateVal("sceneLibrary", "lastAppliedKey"))
print("site", S.getStateVal("sessionScene", "siteKey"))
DEBUG.showScene()
```

**Pass if:** No obvious double-fade / weather burst on blindfold down.

---

### Suite C — End scene

**Human:** **End** (`scenes_lib_btn_end`).

**Pass if:** “Narrative scene is over” (or equivalent); ambience drops.

```lua
print("district", S.getStateVal("sessionScene", "districtKey"))
print("site", S.getStateVal("sessionScene", "siteKey"))
print("lastAppliedKey", S.getStateVal("sceneLibrary", "lastAppliedKey"))
print("useRealTime", S.getStateVal("sessionScene", "clock", "useRealTime"))
```

**Pass if:** `districtKey` / `siteKey` cleared (nil/empty); `lastAppliedKey` cleared; RT off.

**Stop if:** Cleared location written back into library row on later sync — TOR-145 regression.

---

### Suite D — Silence for save + reload

1. Re-apply any scene (Suite A).
2. Sound panel → **Silence for save**.
3. Save → reload same save.

```lua
print(JSON.encode_pretty(S.getStateVal("soundscape")))
```

**Pass if:** Emitters silent after prep; `soundscape` intent **not** wiped; after load, audio eventually matches persisted intent (TOR-138).

**Load branch (TOR-152):** Host startup gate calls `Scenes.reconcilePlaySessionOnEnter` when phase is Play/Downtime — active scene (`lastAppliedKey`) → full resync; no scene → `applyDefaultNoSceneEnvironment` (Main BGM only, map pins hidden).

#### D2 — PC control tokens after reload (TOR-152 / TOR-236)

**Goal:** After save/reload, CONTROL_BOARD `pc_control_token`s mirror persisted `seatSlots[<color>].isPresent` from scene library / live session — pinned to each PC seat-row column, face-up = present, face-down = absent.

**Setup (before step 3 Save):**

1. Live scene with table layout (Suite A row OK).
2. Toggle **Brown** absent (`scenes_seat_Brown`) — or another PC color you record.
3. Leave at least one other PC **present** (e.g. Pink).

```lua
print("seatSlots Brown", JSON.encode(S.getStateVal("sessionScene", "seatSlots", "Brown")))
print("seatPresent", JSON.encode(S.getStateVal("sessionScene", "seatPresent")))
```

**Pass if (pre-save):** `seatSlots.Brown.isPresent == false` (and/or `seatPresent.Brown == false`).

**After reload (step 3):**

```lua
lua gbE2eVerifyPcTokens()
```

Optional state check after reload:

```lua
print("Brown seatSlots", JSON.encode(S.getStateVal("sessionScene", "seatSlots", "Brown")))
print("Pink seatSlots", JSON.encode(S.getStateVal("sessionScene", "seatSlots", "Pink")))
```

**Pass if:** `[gbConfirm] PASS — gbE2eVerifyPcTokens` — every workshop `pc_control_token` is on its color column and flip matches `NPCS.resolvePlayerSeatPresence(color)`; absent Brown (or chosen color) is **face-down**.

**Reload expectation (TOR-152):** `reconcilePlaySessionOnEnter` on startup gate should run `reconcileControlBoardFromState` via `Sync.full({ force })`. If tokens disagree with `seatSlots`, file a bug — not an expected gap post-TOR-152.

**Also run after library Apply:** Re-apply a library row whose saved `seatSlots` marks a PC absent → same `gbE2eVerifyPcTokens()` after blindfold settle (~12 s).

---

### Suite E — Apply location + soundscape (full pass only)

**Human:** District/site modals → pick site → **Apply location + soundscape**.

**Pass if:** Overlay location text updates; location/weather audio follow site.

```lua
print("site", S.getStateVal("sessionScene", "siteKey"))
```

---

## Suite F — Present day clock bootstrap and activation

**Goal:** Chronicle `presentDayClock` initializes and stays in sync with present-day scene activation.

### F1 — First present-day apply

**Setup:** Fresh save or note current `presentDayClock`. Use a library row with `isPresentDay: true` and full datetime (e.g. `2026-03-15` evening).

**Human:** Apply that row.

```lua
print(JSON.encode_pretty(S.getStateVal("presentDayClock")))
print(JSON.encode_pretty(S.getStateVal("sessionScene", "clock")))
```

**Pass if:**

- `presentDayClock` Y/M/D/h/m matches applied scene datetime (bootstrap if was nil).
- `sessionScene.clock` matches same datetime + flags from row.
- Center-top overlay shows that date/time in Play.

### F2 — Present-day row with flags-only clock

**Setup:** Row with `isPresentDay: true` but **no** day/month/year/hour/minute in saved JSON (flags only).

**Human:** Apply after F1 succeeded.

**Pass if:** Live `sessionScene.clock` receives datetime from `presentDayClock`; apply succeeds with alert (not “present day not initialized”).

**Stop if:** Error when chronicle already initialized — flags-only merge bug.

### F3 — **Set** vs live scene clock

**Human:** On **live** scene, change clock fields → click **Set** (`scenes_clock_setPresentDay`) — **not** Apply clock.

```lua
local pdBefore = JSON.encode(S.getStateVal("presentDayClock"))
-- click Set with new time
local pdAfter = JSON.encode(S.getStateVal("presentDayClock"))
local sc = JSON.encode(S.getStateVal("sessionScene", "clock"))
print("pd before", pdBefore)
print("pd after", pdAfter)
print("live scene", sc)
```

**Pass if:** `presentDayClock` updates to inputs; **live** `sessionScene.clock` unchanged until **Apply clock** or library **Apply**.

**Note:** **Set** may move chronicle time **backward** (ST override). **tryAdvance** on apply/tick does not rewind.

---

## Suite G — Real-time autoprogression

**Goal:** `GameStateOverlay` 1 s ticker advances scene clock and monotonic present day.

### G1 — RT on at speed 1

**Setup:** Live scene with known start time. Scenes panel: RT toggle **ON** (`scenes_clock_rtToggle`), speed **1** → **Apply clock**.

```lua
local t0 = JSON.encode(S.getStateVal("sessionScene", "clock"))
local p0 = JSON.encode(S.getStateVal("presentDayClock"))
print("t0", t0)
print("p0", p0)
```

**Human:** Wait **≥ 65 real seconds** (watch center-top overlay).

```lua
print("t1", JSON.encode(S.getStateVal("sessionScene", "clock")))
print("p1", JSON.encode(S.getStateVal("presentDayClock")))
```

**Pass if:**

- `sessionScene.clock.minute` increased by ≥ 1 (or hour rolled).
- If scene time passed prior `presentDayClock`, `presentDayClock` advanced (not earlier than before).
- Overlay time text updated.

**Stop if:** Minutes jump >> 1 per wall minute (TOR-148 duplicate ticker) — note rate and stop.

### G2 — High speed smoke test

**Human:** Set speed **60** → **Apply clock** → wait **~3 real seconds**.

**Pass if:** Scene minute advances noticeably (~3 narrative minutes).

**Human:** Set speed back to **1** (or off) → **Apply clock**.

### G3 — RT off stops advancement

**Human:** RT toggle **OFF** → **Apply clock** → wait 30 s.

```lua
print("useRealTime", S.getStateVal("sessionScene", "clock", "useRealTime"))
```

**Pass if:** `useRealTime` false; clock fields unchanged; End scene also stops ticker (Suite C).

### G4 — Speed 0

**Human:** RT **ON**, speed **0** → **Apply clock** → wait 30 s.

**Pass if:** Time does not advance (ticker may still reconcile overlay only).

---

## Suite H — Scene switch vs present day (no rewind)

**Goal:** Applying an **earlier** saved scene does not rewind chronicle present day.

### H1 — Advance then apply earlier row

1. Apply present-day scene **A** at time **T1**.
2. **Apply clock** or RT to reach **T2** strictly after **T1** (note both in console).
3. Apply library scene **B** saved at historical/present time **T0** &lt; **T2**.

```lua
print("scene", JSON.encode(S.getStateVal("sessionScene", "clock")))
print("presentDay", JSON.encode(S.getStateVal("presentDayClock")))
```

**Pass if:**

- Live scene clock reflects **B**’s saved time (**T0**).
- `presentDayClock` still ≥ **T2** (not rewound to T0).

### H2 — RT catches up present day

**Setup:** After H1, enable RT on scene **B** until live scene time exceeds old `presentDayClock`.

**Pass if:** `presentDayClock` eventually advances again when scene clock passes it (monotonic `tryAdvance`).

### H3 — Clock flush to library on switch

1. With scene **A** live, **Apply clock** to a distinct time **TA**.
2. Apply scene **B** (different key).

```lua
local keyA = "YOUR_SCENE_A_KEY"
print("A saved clock", JSON.encode_pretty(S.getStateVal("sceneLibrary", "scenes", keyA, "sessionScene", "clock")))
```

**Pass if:** Row **A**’s stored clock persisted **TA** (flush on switch via `flushPreviousAppliedScene`).

---

## Suite I — Pending-row clock draft

**Goal:** Edits while `activeKey ≠ lastAppliedKey` apply on **library Apply**, not to live scene.

1. Scene **A** on table (`lastAppliedKey == A`).
2. Select row **B** only (`activeKey == B`, not applied).
3. Change month/day/time/speed in Scenes panel → **Apply clock** (`scenes_clock_apply`).

```lua
print("live", JSON.encode(S.getStateVal("sessionScene", "clock")))
```

**Pass if:** GM says clock saved for activation; **live** clock still **A**’s time.

4. **Apply** scene **B** → wait blindfold.

**Pass if:** Live clock matches draft, not stale **A** live clock.

---

## Suite J — Seat presence toggles (Scenes panel)

**Goal:** `scenes_seat_*` drives `seatPresent` / `seatSlots.isPresent` and lighting/HUD.

**Setup:** Live scene with table layout including Brown and Pink.

### J1 — Mark PC absent

**Human:** Toggle **Brown** seat button (`scenes_seat_Brown`) to **absent** (visual state on button).

```lua
print(JSON.encode(S.getStateVal("sessionScene", "seatPresent")))
print(JSON.encode(S.getStateVal("sessionScene", "seatSlots", "Brown")))
```

**Pass if:** `seatPresent.Brown == false` (and/or `seatSlots.Brown.isPresent == false`).

**Human:** Observe Brown seat lighting → **OFF** or absent-from-layout treatment; Brown PC objects hidden per panel behavior.

### J2 — Mark present again

**Human:** Toggle Brown back to **present**.

**Pass if:** `seatPresent.Brown` true; lighting returns to scene-appropriate mode after reconcile.

---

## Suite K — Map pins on library Apply (scene cast)

**Goal:** On **library Apply**, present PCs get `lastActiveMapPin` at the new site; absent PCs keep prior record and stay at the old site offset when the clock gate passes.

**Setup:**

1. Apply scene at **site S1** with known `C.Sites[S1].offsetXY` (note coordinates). Ensure scene clock is **after** any prior pin timestamps (or use fresh save).
2. Mark **Brown** **absent** (`scenes_seat_Brown`).
3. Ensure **Pink** **present** and in table layout.
4. Open **Map** panel; note pin positions for Brown vs Pink.
5. Apply scene **S2** (different site **S2**, different `offsetXY`).

**Pass if:**

| PC | `seatPresent` | Pin on map after Apply to S2 |
| --- | --- | --- |
| Pink (present) | true | At **S2** offset (from `lastActiveMapPin`) |
| Brown (absent, not deactivated mid-scene) | false | At **S1** offset (record unchanged) |

```lua
print("site", S.getStateVal("sessionScene", "siteKey"))
print("seatPresent", JSON.encode(S.getStateVal("sessionScene", "seatPresent")))
print("lastActiveMapPin", JSON.encode(S.getStateVal("sessionScene", "lastActiveMapPin")))
local sk = S.getStateVal("sessionScene", "siteKey")
if sk and C.Sites[sk] then print("offsetXY", C.Sites[sk].offsetXY) end
```

**Unmappable sites:** pin hidden when `C.isSiteMappable` is false for the recorded site (TOR-153 partial).

### K2 — No site hides pins

**Human:** **End scene** or apply row with no `siteKey`.

**Pass if:** Map pins hidden (no live scene on table).

### K3 — Deactivate hides pin

**Human:** With live scene at S2, toggle **Brown** absent via `scenes_seat_Brown` (or gameboard PC token flip).

**Pass if:** Brown pin **hidden** (`lastActiveMapPin.Brown` cleared).

### K4 — Clock rewind hides until time catches up

**Human:** Apply clock **earlier** than Pink's `lastActiveMapPin.Pink.activeAt`, then advance clock forward again.

**Pass if:** Pin hidden while current clock ≤ recorded `activeAt`; reappears when clock is later.

---

## Suite L — Apply location (mid-session)

**Goal:** **Apply location + soundscape** updates `lastActiveMapPin` for **narratively present** PCs (`seatSlots.isPresent`).

**Setup:**

1. Live scene at **S1**; Brown **absent** in `seatPresent` but **not** explicitly deactivated (still has old record from K).
2. Pink pin at S1 offset.
3. **Do not** library Apply. Use location picker → **Apply location + soundscape** to **S2**.

**Pass if:**

- `sessionScene.siteKey` → S2.
- **Pink** (present) pin moves to S2.
- **Brown** (absent) pin unchanged at prior record site unless deactivated (K3).

**Document:** Mid-session location uses `MapPins.onLocationChanged()` — narrative `seatSlots.isPresent`, not `L.isPlayerPresentInActiveSeatLayout`.

---

## Suite M — Clock validation and End regression

### M1 — Historical row without datetime

**Human:** Apply library row with `isPresentDay: false` and missing datetime fields.

**Pass if:** Apply **fails** with alert; `lastAppliedKey` unchanged.

### M2 — Mirror / unlink (spot check)

**Human:** With scene live and `receivesLiveWrites` on row, change overlay-facing field via panel; confirm library row updates on sync (optional deep check).

**Human:** **Unlink** live row → edit library copy → confirm live table unchanged until next Apply.

---

## Suite N — Chronicle weather vs clock (full pass only)

**Setup:** Scene with chronicle weather schedule; RT on; cross an hour boundary on overlay.

**Pass if:** Weather preset or Scenes weather summary changes when hour/day changes (no burst — TOR-136). Note message on **Apply clock** when hour changes.

---

## Repair step (only if world diverged from state)

```lua
local Sync = require("core.sync")
Sync.full({ force = true, reason = "e2e-repair" })
```

Re-check lighting, NPCs, pins, soundscape after ~3 s. Not for routine passes.

---

## Sign-off

| Suite | Pass | Notes |
| --- | --- | --- |
| 0 Cleanup | ☐ | |
| A Apply | ☐ | |
| B Switch | ☐ | |
| C End | ☐ | |
| D Save/reload | ☐ | PC tokens + scene restore (TOR-152) |
| D2 PC tokens reload | ☐ | `gbE2eVerifyPcTokens` |
| E Location (opt) | ☐ | |
| F Present day bootstrap | ☐ | F1–F3 |
| G RT autoprogression | ☐ | G1–G4 |
| H Switch vs present day | ☐ | H1–H3 |
| I Clock draft pending | ☐ | |
| J Seat presence | ☐ | |
| K Map pins scene cast | ☐ | TOR-245: K–K4 |
| L Apply location pins | ☐ | |
| M Clock validation | ☐ | |
| N Weather + clock (opt) | ☐ | |

---

## Appendix — UI control map

| Control | ID | Effect |
| --- | --- | --- |
| Library slot | `scenes_lib_slot_XX` | Select `activeKey` |
| Apply scene | `scenes_lib_btn_apply` | Full apply + blindfold |
| End | `scenes_lib_btn_end` | Clear location; stop RT; detach mirror |
| Seat PC | `scenes_seat_Brown` etc. | Toggle `seatPresent` / `seatSlots` |
| Month | `scenes_month_*` | Draft month |
| Day / Year / Time | `scenes_clock_day/year/time12` | Draft datetime |
| Set present day | `scenes_clock_setPresentDay` | Writes `presentDayClock` only |
| RT toggle | `scenes_clock_rtToggle` | Draft + live via Apply clock |
| Speed | `scenes_clock_speed` | Narrative min per 60 s wall |
| Apply clock | `scenes_clock_apply` | Live or pending draft |
| Apply location | (location section) | Site + soundscape, no scene cast |

**TOR-142 (not shipped):** Planned four Apply variants (scene clock / x5 until present / = PRESENT / Present) — still single **Apply** until implemented.

---

## Related

- [Dice-E2E](Dice-E2E.md) — roll FSM (separate from scenes)
- [Player HUD Overview](../HUDs%20&%20Overlays/Player%20HUD%20Overview.md) — map pins and location overlay rules
- [TESTING.md](../TESTING.md) — `showScene`, soundscape helpers

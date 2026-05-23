# Linear alignment inventory

**Review date:** 2026-05-22
**Git HEAD:** `ea6724334b38806124e2f9072de3288b2c26daa1`
**Linear team:** Toronto Rising (`TOR-*`)

**Ongoing:** Agents maintain parity with [RUNNING TASKLIST](../RUNNING%20TASKLIST.md) per [`.cursor/rules/toronto-rising-linear.mdc`](../../.cursor/rules/toronto-rising-linear.mdc). This inventory is a one-time alignment snapshot; live state is Linear + tasklist.

## Done-ness criteria

Mark Linear **Done** when:

1. Code exists and is exercised (not stub-only)
2. At least one of: `.dev/` doc, completed plan checklist, or commit on master
3. No open blocker in RUNNING TASKLIST for that item

---

## §Linear snapshot (TOR-1–29)

| ID | Title | Status | Project | Updated | Proposed action |
|----|-------|--------|---------|---------|-----------------|
| TOR-1 | Extract Utilities Module | Done | Phase 1 | 2026-01-01 | UPDATE → Foundation; expand evidence |
| TOR-2 | Test Utilities Module | Backlog | Phase 1 | 2026-01-01 | UPDATE → Done (debug testbed covers) |
| TOR-3 | Adapt Constants Module | Done | Phase 1 | 2026-01-01 | UPDATE → Foundation |
| TOR-4 | Test Constants Module | Backlog | Phase 1 | 2026-01-01 | UPDATE → Done (DEBUG.testConstants) |
| TOR-5 | Adapt State Module | Done | Phase 1 | 2026-01-01 | UPDATE → Foundation |
| TOR-6 | Test State Module | Backlog | Phase 1 | 2026-01-01 | UPDATE → Done (DEBUG.testState) |
| TOR-7 | Extract Zone Patterns | Done | Phase 1 | 2026-02-19 | UPDATE → Foundation |
| TOR-8 | Test Zone Management | Backlog | Phase 1 | 2026-01-01 | UPDATE → Backlog QA epic child |
| TOR-9 | Extract Lighting Control | Done | Phase 1 | 2026-01-02 | UPDATE → Lighting & Camera |
| TOR-10 | Test Lighting System | Done | Phase 1 | 2026-01-02 | UPDATE → Lighting & Camera |
| TOR-11 | Test Phase 1 Integration | Backlog | Phase 1 | 2026-01-01 | UPDATE → Agent Reviews QA |
| TOR-12 | Adapt Main Module | Backlog | Phase 2 | 2026-01-03 | CLOSE_DONE → Foundation |
| TOR-13 | Test Main Module | Backlog | Phase 2 | 2026-01-03 | UPDATE → QA backlog |
| TOR-14 | Scene Preset System | Done | Phase 2 | 2026-02-19 | UPDATE + SPLIT children (library, fog, skybox) |
| TOR-15 | Test Scene System | Backlog | Phase 2 | 2026-01-01 | UPDATE → QA backlog |
| TOR-16 | Extract UI Helpers | Todo | Phase 2 | 2026-01-01 | CLOSE_DONE (lib/ui_xml_templates, util) |
| TOR-17 | Test UI Helpers | Backlog | Phase 2 | 2026-01-01 | CLOSE_DUPLICATE → TOR-16 |
| TOR-18 | Extract UI XML Templates | Backlog | Phase 2 | 2026-01-01 | CLOSE_DONE (ui/ tree exists) |
| TOR-19 | Test UI Templates | Backlog | Phase 2 | 2026-01-01 | UPDATE → QA backlog |
| TOR-20 | Integrate Global Script | Backlog | Phase 2 | 2026-01-01 | CLOSE_DONE (core/global_script.ttslua) |
| TOR-21 | Test Full Integration | Backlog | Phase 2 | 2026-01-01 | UPDATE → QA ongoing |
| TOR-22 | Verify Animation Utilities | Backlog | Phase 3 | 2026-01-01 | CLOSE_DONE (U.Lerp, RunSequence) |
| TOR-23 | Expand Zone Functions | Backlog | Phase 3 | 2026-01-01 | UPDATE → Backlog |
| TOR-24 | Expand Lighting Modes | Backlog | Phase 3 | 2026-01-01 | UPDATE → links TOR centralize light modes |
| TOR-25 | Advanced UI Patterns | Backlog | Phase 3 | 2026-01-01 | UPDATE → Backlog |
| TOR-26 | Maintain AVAILABLE_FUNCTIONS | In Progress | Documentation | 2026-01-01 | UPDATE → Done (ongoing hygiene) |
| TOR-27 | Dev Mode UI | Backlog | Phase 2 | 2026-01-03 | UPDATE → partial Done (debug panels exist) |
| TOR-28 | Camera Angle Presets | Backlog | Phase 2 | 2026-01-03 | CLOSE_DONE (C.CameraAngles expanded) |
| TOR-29 | Dynamic Dice Roll Camera | Backlog | Phase 2 | 2026-01-03 | UPDATE → related roll baton-pass camera |

---

## §Feature inventory (by domain)

### Foundation & Tooling

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| util-module | Utilities library | shipped | lib/util.ttslua | TOR-1 |
| constants-module | Constants & districts/sites | shipped | lib/constants.ttslua | TOR-3 |
| state-module | State get/set API | shipped | core/state.ttslua | TOR-5 |
| zones-module | Zone management | shipped | core/zones.ttslua | TOR-7 |
| guids-library | GUID library separation | shipped | lib/guids.ttslua | NEW |
| sync-module | Sync.full / Sync.player | shipped | core/sync.ttslua | NEW |
| debug-module | Debug & testbed | shipped | core/debug.ttslua | NEW |
| wait-policy | U.delay Wait policy | shipped | docs/solutions/lua-wait-api-policy.md | NEW |
| tts-bundling | TTS bundling & MCP bridge | shipped | .dev/TTS_BUNDLING_SETUP.md, TTS_MCP.md | NEW |
| global-script | Global script integration | shipped | core/global_script.ttslua | TOR-20 |
| main-module | Main event handlers | shipped | core/main.ttslua | TOR-12 |
| available-functions-doc | AVAILABLE_FUNCTIONS.md | shipped | .dev/AVAILABLE_FUNCTIONS.md | TOR-26 |

### Synchronization & State

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| conditions-registry | Conditions registry system | shipped | core/conditions.ttslua, lib/condition_* | NEW |
| conditions-roll-policy | Roll policy layer | shipped | lib/condition_roll_policies.ttslua | NEW |
| location-conditions | Location-hosted conditions | shipped | Conditions.reconcileLocationHostedForScene | NEW |
| reconciler-contract | Reconciler contract doc | shipped | .dev/.../Reconciler Contract.md | NEW |
| performance-audit | Sync performance audit | shipped | .dev/.../Performance Audit.md | NEW |
| dual-apply-survey | Dual-apply survey | shipped | .dev/.../Dual_apply_survey.md | NEW |
| dual-apply-prompt2 | Dual-apply audit (Prompt 2) | planned | Agent Reviews Prompt 2 | NEW |
| state-access-prompt3 | State access audit (Prompt 3) | planned | Agent Reviews Prompt 3 | NEW |

### Dice & Rolls

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| roll-fsm | Roll controller FSM | shipped | core/roll_controller.ttslua | NEW |
| dice-classification | Dice result math | shipped | core/dice.ttslua | NEW |
| dice-pt2-player-bags | Player bag triggers pt.2 | shipped | dice-system-pt2 plan | NEW |
| dice-pt2-st-rolls | Storyteller roll slots | shipped | core/storyteller_rolls.ttslua | NEW |
| roll-ui-toggle-fix | ST roll option persistence | shipped | core/roll_ui.ttslua | NEW |
| roll-camera-intermediate | Roll camera lookAt fix | shipped | core/main.ttslua M.setCamera | NEW |
| roll-baton-camera | Roll baton-pass camera audit | planned | RUNNING TASKLIST | NEW |
| take-half-redesign | Take Half redesign | planned | RUNNING TASKLIST | NEW |
| extended-tests | Extended Tests (4 types) | planned | RUNNING TASKLIST | NEW |
| oblivion-rouse | Oblivion rouse checks E2E | planned | RUNNING TASKLIST | NEW |

### Scenes & Chronicle

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| scenes-reconciler | Scene reconciler | shipped | core/scenes.ttslua | TOR-14 |
| scene-library | Scene library import/fork | shipped | core/scene_library.ttslua | NEW |
| site-fog | Site top fog reconcile | shipped | Scenes.reconcileTopFogFromState | NEW |
| site-skybox | Site skybox reconcile | shipped | Scenes.reconcileSkyboxFromState | NEW |
| game-state-overlay | Center-top game state overlay | shipped | core/game_state_overlay.ttslua | NEW |
| present-day-clock | Real-time clock | shipped | core/present_day_clock.ttslua | NEW |
| district-site-labels | District/site label sync | planned | RUNNING TASKLIST | NEW |
| site-modal-overlap | Site modal overlap fix | planned | RUNNING TASKLIST | NEW |
| site-district-modifiers | Present-only location modifiers | partial | bumpBloodPotency location condition | NEW |

### Lighting & Camera

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| lighting-reconciler | Lighting reconciler + lerp | shipped | core/lighting.ttslua | TOR-9 |
| camera-presets | Camera angle presets | shipped | C.CameraAngles | TOR-28 |
| red-sheet-camera | Red sheet preset Z nudge | planned | RUNNING TASKLIST Camera | NEW |
| centralize-light-modes | Centralize C.LightModes | planned | RUNNING TASKLIST | NEW |
| scene-light-reconcile | Scene/location light via reconciler | planned | RUNNING TASKLIST | NEW |
| testbed-seat-lights | Test-bed seat light helpers | shipped | core/debug.ttslua | NEW |

### NPC & Spotlight

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| npc-preload | NPC preload pool | shipped | core/npcs.ttslua | NEW |
| npc-seat-spawn | NPC seat spawn layout | shipped | lib/rotational-seat-layout.ttslua | NEW |
| npc-seat-tags | NPC seat tag pairing | shipped | core/npcs.ttslua | NEW |
| npc-group-exclusion | Group spawn seated exclusion | planned | RUNNING TASKLIST | NEW |
| st-npc-rolls | ST dice rolls for NPCs | planned | RUNNING TASKLIST | NEW |
| rotational-layout | Rotational seat layout engine | shipped | lib/rotational-seat-layout.ttslua | NEW |

### Soundscape & Audio

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| soundscape-module | Soundscape reconciler | shipped | core/soundscape.ttslua | NEW |
| silence-for-save | Silence for save mitigation | shipped | Soundscape.prepareEmittersForSave | NEW |
| bgm-policy | Background music policy | planned | RUNNING TASKLIST | NEW |
| site-weather-ducking | Site weather ducking | planned | RUNNING TASKLIST | NEW |

### UI & HUD

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| ui-xml-templates | UI XML template system | shipped | ui/, lib/ui_xml_templates.ttslua | TOR-18 |
| st-panels-dark-bg | ST panel dark backgrounds | shipped | storyteller_* panels | NEW |
| scenes-panel | Scenes panel (site, time, location) | shipped | core/storyteller_scenes_panel.ttslua | NEW |
| hud-overlays | Condition HUD overlays | shipped | core/hud_overlays.ttslua | NEW |
| overlay-polish | Center-top overlay polish | planned | RUNNING TASKLIST | NEW |
| overlay-weather | Weather on overlay | planned | RUNNING TASKLIST | NEW |
| pcs-deactivate | PCs panel deactivate PC | planned | RUNNING TASKLIST | NEW |
| pcs-map-location | PCs map location modal | planned | RUNNING TASKLIST | NEW |
| session-buttons | Start/End Session placeholders | planned | RUNNING TASKLIST | NEW |
| scrolling-viewbox | Scrolling viewbox experiment | planned | RUNNING TASKLIST | NEW |

### Character Sheets

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| bp-decals | Blood Potency decals | shipped | lib/blood_potency_decals.ttslua | NEW |
| sheet-page4 | Page 4 relationships/bonds | blocked | partial pcs_data | NEW |
| sheet-page5 | Page 5 projects/equipment | blocked | RUNNING TASKLIST | NEW |
| sheet-page6 | Page 6 history/XP log | blocked | RUNNING TASKLIST | NEW |

### Players & Connection

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| auto-seat-color | Auto seat/color on connect | planned | RUNNING TASKLIST | NEW |
| play-as-npc | Play as NPC | planned | RUNNING TASKLIST | NEW |

### Table Objects

| feature_id | Title | Status | Evidence | linear_ref |
|------------|-------|--------|----------|------------|
| tarot-hide | Tarot hide returns cards | planned | RUNNING TASKLIST | NEW |

### New Features (pending design)

| feature_id | Title | Status | linear_ref |
|------------|-------|--------|------------|
| desires | Desires placeholder | planned | NEW |
| spotlight-phase | Spotlight phase | planned | NEW |
| memoriam-toggle | Memoriam toggle | planned | NEW |
| spotlight-npc-distinction | Spotlight NPC distinction | planned | NEW |

### Out of Scope (Workshop) — Canceled issues for traceability

| feature_id | Title | linear_ref |
|------------|-------|------------|
| ws-reference-images | Reference images | NEW |
| ws-impairment-overlays | Impairment overlay art | NEW |
| ws-face-to-face-table | Face-to-face table layout | NEW |
| ws-debug-sound-window | Debug sound window | NEW |
| ws-hunting-resonance | Hunting vs Resonance | NEW |
| ws-famulus-cutouts | Famulus & cutouts | NEW |
| ws-additional-skyboxes | Additional skyboxes | NEW |
| ws-hunger-frenzy-overlays | Hunger/frenzy overlays | NEW |
| ws-tune-seat-lights | Tune seat lights in save | NEW |
| ws-tune-audio-volumes | Tune audio volumes | NEW |
| ws-scene-constructor | Scene Constructor Google Sheets | NEW |

---

## §Reconciliation matrix (summary)

| Priority | feature_id | Action | Target project |
|----------|------------|--------|----------------|
| 1 | conditions-registry | CREATE_CHILD | Sync & State |
| 1 | roll-fsm | CREATE_CHILD | Dice & Rolls |
| 1 | scene-library | CREATE_CHILD | Scenes & Chronicle |
| 1 | soundscape-module | CREATE_CHILD | Soundscape & Audio |
| 1 | npc-preload | CREATE_CHILD | NPC & Spotlight |
| 2 | All RUNNING TASKLIST unchecked | CREATE_CHILD | domain project |
| 2 | All RUNNING TASKLIST checked | CREATE_CHILD Done | domain project |
| 3 | TOR-12,18,20,22,28 | CLOSE_DONE | Foundation & Tooling |
| 3 | TOR-2,4,6 | CLOSE_DONE | Foundation (testbed) |
| 3 | TOR-16,17 | CLOSE_DONE/DUPLICATE | UI & HUD |
| 4 | TOR-29 | UPDATE related | Lighting & Camera |
| 4 | TOR-23–25 | UPDATE backlog | respective domains |
| 5 | ws-* (11 items) | CREATE Canceled | Out of Scope |

**Estimated counts:** ~29 updates, ~70 creates (including epics, tasklist, workshop)

---

## §Proposed domain projects

1. Foundation & Tooling
2. Synchronization & State
3. Dice & Rolls
4. Scenes & Chronicle
5. Lighting & Camera
6. NPC & Spotlight
7. Soundscape & Audio
8. UI & HUD
9. Character Sheets
10. Players & Connection
11. Table Objects
12. Agent Reviews & Quality
13. Out of Scope (Workshop)

## §Proposed new labels

- `module:conditions`, `module:dice`, `module:npcs`, `module:soundscape`, `module:sync`, `module:rolls`
- `source:tasklist`, `workshop-only`, `epic`

## §Proposed parent epics

1. [Epic] Foundation & Tooling — core libraries
2. [Epic] Sync & Conditions — registry and reconcilers
3. [Epic] Dice & Rolls — roll FSM and policies
4. [Epic] Scenes & Chronicle — session scene and library
5. [Epic] Lighting & Camera — reconciler and presets
6. [Epic] NPC & Spotlight — spawn and layout
7. [Epic] Soundscape & Audio — emitters and BGM
8. [Epic] UI & HUD — panels and overlays
9. [Epic] Character Sheets — multi-page sheets
10. [Epic] Players & Connection — seat assignment
11. [Epic] Table Objects — tarot and interactables
12. [Epic] Agent Reviews & Quality — audits
13. [Epic] New Features — pending design
14. [Epic] Out of Scope — workshop-only tracking

---

## §Stage A checklist

- [x] Full TOR-1–29 snapshot table
- [x] Feature inventory (60+ rows)
- [x] Reconciliation matrix with actions
- [x] Proposed domain projects, labels, epics
- [x] Issue count estimates
- [x] Out-of-scope vs workshop Canceled list

**Stage B authorized:** user requested full plan implementation.

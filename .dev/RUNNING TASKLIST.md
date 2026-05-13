# Running Tasklist for Toronto Rising Development

This file will be continuously updated with new issues and plans for feature development.

## Dice Roller

- [x] Roll conditions set on rolls via the Storyteller control panel are not persisted and do not apply to rolls. _(Addressed: `roll_ui.ttslua` `uiToggleGet` normalizes Toggle `isOn` from string/boolean/number so Apply writes correct booleans.)_
- [x] Automatic camera repositioning during the roll sequence is inconsistent. Should be modeled off of how the camera controls are applied in the Admin Debug panel (since they work flawlessly). _(Addressed: `main.ttslua` `M.setCamera` now applies `lookAt(intermediateCameraData)` before the final preset.)_

## NPC Spawning

- [ ] Loading time for NPC cutouts is excessive. Proposed solution: Spawn in all NPC figurines in an out-of-sight area beneath the table (y ~= -100) and at small scale, so the image files are always loaded.
- [ ] _New Feature:_ Ability for NPCs, both seated at the table and spawned into areas, to roll dice from the Storyteller dice control panel.

## Soundscape

- [x] On load, emitters automatically play any tracks that were playing when the game was last saved. Proposed solution: A "silence all emitters" button the Storyteller can trigger at the end of each session, ensuring the save sets all emitters to play silence. _(Implemented: **Silence for save** on the Sound panel → `Soundscape.prepareEmittersForSave()`; Unity may still resume loops until the storyteller runs this before saving.)_

## Lighting

- [x] _New Feature:_ All reconciler lighting updates should be lerped for a gradual transition over a default of 2 seconds. _(Implemented: `core/lighting.ttslua` `L.DEFAULT_RECONCILE_LERP_SECONDS` + `reconcileForPlayer` uses it.)_
- [x] _New Feature:_ Add functions to `TEST BED.ttslua` that will allow direct control of all seat lights, for tuning lighting settings and positions. Desired behavior: Calling the function with a seat light index (1, 2 or 3), light settings, position, and rotation should apply settings to the RED player's seat light, and then apply the same settings to all other active seat lights, rotating position/rotation transforms around the table as appropriate. _(Implemented: `TestBed_applyPlayerSeatLightsFromRed` — same segment yaw step as the camera test in that file; requires this chunk live in Global.)_

## UI Panels

- [x] All Storyteller UI panels should receive a dark background: `rgba(0, 0, 0, 0.8)`. _(Class `storyteller_panel_surface` in `hud_storyteller_defaults.xml`; Scenes/Phases/Sound root layouts; PCs/NPCs via panel defaults.)_
- [x] **Scenes Panel:** Storyteller modals for setting current Site currently hide the District-unique sites behind the generic sites, which are overlayed on top, likely due to layout issues with inactive panels. Proposed solution: Create a permanently-active blank panel to occupy the necessary space, allowing room for any unique site groups to be displayed accurately. _(Addressed by reordering generated modal body: generic bucket first, district buckets after — district list draws above generic.)_
- [x] **Scenes Panel - Scene location:** Storyteller "Scene location" section includes input elements for Districts and Sites. These should be replaced by Text elements displaying the full name (not key) of the District and Site, since Districts and Sites are chosen by modal popups and not direct text entry.
- [x] **Scenes Panel - Scene time:** Current five input elements are ambiguous, unlabeled, and unintuitive. Ideal replacement would be with a dropdown to set the month, a number input to set the day, a single input to set time in the format `hh:mm AM/PM`, and an "Apply" button to save to state and trigger the reconciler.
- [x] **Scenes Panel - Scene time:** _New Feature:_ A toggle button (green for active, grey for inactive) controls whether game time advances in real time. An input to the right applies a speed multiplier for in-game time progression, defaulting to 1 (e.g. a value of "2" would result in time moving twice as fast in-game).
- [x] **Scenes Panel - Chronicle weather:** Remove. Chronicle weather is always aligned to game time.
- [x] **Scenes Panel - NPC role snapshot:** Remove as unnecessary.
- [x] **Player Game State Overlay:** _New Feature:_ A center-top panel with transparent background and red text should display the current game phase, the current date, and the current time in 12-hour format. Time (and date) should be constantly updated if real-time clock progression is active. _(See `ui/shared/game_state_overlay.xml` + `core/game_state_overlay.ttslua`.)_

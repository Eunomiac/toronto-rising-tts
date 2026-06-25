# HUD Function Reference

Reference for `HUD_*` onClick handlers wired from Storyteller and shared UI XML.

## Global UI `InputField` — reading typed text

Per the TTS **InputField** note ([Input Elements](https://api.tabletopsimulator.com/ui/inputelements/)), live typed text is only delivered on **`onValueChanged`** / **`onEndEdit`** as the **`value`** argument. **Do not read `InputField` content with `UI.getValue` or `UI.getAttribute(id, "text")`.** Stash `value` in Lua and read that on **Confirm**; prefill with **`UI.setAttribute(id, "text", ...)`** when the field may be inactive (see `core/roll_ui.ttslua` `uiSetInputField`, `rollDash_difficulty_*` + `HUD_rollSetDifficulty`, `HUD_rollOptsInputChanged`). Full checklist: [`.dev/SOLVING ISSUES & DEBUGGING.md`](SOLVING%20ISSUES%20%26%20DEBUGGING.md) (*Global UI `InputField` — typed text*).

> **Source files:**
>
> - XML triggers: `ui/storyteller/panel_*.xml`, `ui/storyteller/hud_storyteller.xml`, `ui/player/panel_overlay_camera.xml` (from `ui/.templates/panel_overlay_camera.xml`), `ui/player/panel_overlay_location.xml` (from `ui/.templates/panel_overlay_location.xml`)
> - Handler implementations: `core/global_script.ttslua`, `core/hud_player.ttslua` (loaded via stub `.tts/objects/Global.lua`)
> - Helper functions: `lib/util.ttslua` (`U.*` UI helpers), `core/storyteller_panel_ui.ttslua`, `core/light_debug.ttslua`, `core/light_debug_focus.ttslua`

---

## Storyteller admin column (`hud_storyteller.xml`)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_printState` | `Print State` button | `(player, button, id)` | Calls `DEBUG.logStateToFile("game_state")`. Writes **`.dev/.debug/debug_logs/game_state.txt`** when the tts-bridge listens on **39998**. |
| `HUD_syncAll` | `Sync All (force)` button | `(player, button, id)` | Calls `Sync.full({ force = true })` — bypass scene/soundscape fingerprints; full `UpdateUIDisplays` (overlay repair). |
| `HUD_clearLoadingOverlay` | `Clear Loading Overlay` button | `(player, button, id)` | Calls `hideStartupLoadingOverlays()` to force-hide `overlay_loadingScreen_<Color>` for all player seats (debug/manual escape hatch). Automatic hide on load uses **`U.RunSequence`** in **`core/global_script.ttslua`** `onLoad` (gates + wall-clock delay). Do not use **`U.waitForCondition`** with nested **`U.delay`** for that path — TTS can fire the timer immediately. |
| `HUD_debugLightGuidInput` | `dl_guid` `InputField` | `(player, value, id)` | Caches typed GUID (`LightDebugFocus.onGuidInput`). Per TTS docs, `InputField` text is not obtainable outside `onValueChanged`/`onEndEdit`; this handler is the primary source of truth. |
| `HUD_debugLightActivate` | `Debug Light` button | `(player, button, id)` | Reads GUID from `HUD_debugLightGuidInput` stash only (`LightDebugFocus.activate`). Trims, `getObjectFromGUID`, validates spotlight via `LightDebug.getLightComponent`. Opens `panel_debug_light_root`, syncs sliders, applies live. Broadcasts errors to the clicking player if invalid or empty. |
| `HUD_debugLightEnabled` | `dl_enabled` `Toggle` | `(player, value, id)` | `LightDebugFocus.onEnabledToggle`: sets `cache.enabled`, `L.SetLightMode(..., enabled, ...)` instant apply. |
| `HUD_debugLightResetRow` | `dl_reset_*` buttons | `(player, button, id)` | `LightDebugFocus.resetRowFromId(id)`: restores that row from session-start snapshot and reapplies. |
| `HUD_debugLightSlider` | `dl_range`, `dl_angle`, `dl_intensity`, `dl_hue`, `dl_saturation`, `dl_brightness`, `dl_rotX`, `dl_rotY`, `dl_rotZ`, `dl_distance` | `(player, value, id)` | `LightDebugFocus.onSlider`: updates cached values, applies rotation/position. **Distance** moves along the inverse of `U.lookAtRotation` (same convention as `DEBUG.setRotationLookAt`), using object rotation minus `DEBUG.getLookAtOffset(obj)` for the beam axis. `L.SetLightMode` supplies enabled/range/angle/intensity/color (`transitionTime` 0). |
| `HUD_debugLightSnapshot` | `Snapshot` button (focused panel) | `(player, button, id)` | `LightDebugFocus.snapshot`: writes **`.dev/.debug/debug_logs/focused_light.lua`** (Lua table with `Vector` / `Color`) via `DEBUG.writeWorkspaceFile`. |
| `HUD_debugLightDone` | `Done` button (focused panel) | `(player, button, id)` | Hides panel and clears session; does not revert the object. |

## Storyteller Toggle Bar

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_selectStorytellerPanel` | `toggle_scenes`, `toggle_soundscape`, `toggle_pcs`, `toggle_phases` | `(player, button, id)` | Strips `toggle_` prefix from `id`, calls `StorytellerPanelUI.selectStorytellerPanel(panelKey)` to show one storyteller panel and hide all others. Updates toggle button colors to indicate active panel. Deferred refresh for Sound (`syncSoundscapeControls`) and Scenes (`StorytellerScenesPanel.refresh` + lighting preset buttons). |
| `HUD_togglePanel` | `toggleElem_*` buttons | `(player, button, id)` | Strips `toggleElem_` prefix from `id`, calls `U.toggleXmlElement(elemID, button)` to collapse/expand the target panel. Swaps toggle button text between `►` and `▼`. |
| `HUD_debugSeatColor` | `debugSeat_Black`, `debugSeat_Red`, `debugSeat_Orange`, `debugSeat_Brown`, `debugSeat_Pink`, `debugSeat_Purple` | `(player, button, id)` | Bottom-right debug row (left of admin twirl-down). **Left-click (`"-1"`):** `player.changeColor(<Color>)`, then `hideStartupLoadingOverlays()`. **Right-click (`"-2"`):** `M.setCamera(player, "default<Color>")` (e.g. `defaultBrown`). Active Host seat button gets a **red** outline (`#FF0000`, 4px) via `syncDebugSeatColorButtons()` (`onPlayerChangeColor`, `UpdateUIDisplays`, after left-click). |

## Scenes tab (`panel_scenes_host.xml` → `panel_scenes.xml` + `panel_scenes_library.xml`)

**Authority:** `gameState.currentScene` remains the lighting preset key for `Scenes.reconcileFromState`. Narrative/table/location/seat-presence fields live under **`gameState.sessionScene`** (see `core/state.ttslua`). Applying a lighting preset also writes `sessionScene.lightingPresetKey` as a mirror.

The **Scenes** toolbar tab opens `panel_scenes_host` (**1200px** total: two **596px** columns + **8px** gap; host and `HorizontalLayout` use fixed `width`/`minWidth` so TTS does not collapse the row to a hairline). Main Scenes + **Scene library** with fixed slot buttons for `sceneLibrary.order`.

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_selectAdminLightingScene` | `adminScene_dark`, `adminScene_standard`, `adminScene_bright` | `(player, button, id)` | Sets `currentScene` (HUD highlight), `sessionScene.lightingPresetKey` to `AdminDark` / `AdminStandard` / `AdminBright` (`C.LightModes`), clears `sceneTransition`, `Sync.full()`. |
| `HUD_scenesPanel` | `scenes_tbl_*`, `scenes_seat_*` | `(player, button, id)` | `core/storyteller_scenes_panel.ttslua`: table buttons call `core.hud_blindfold.runTransition` (random blindfold variant 1..6, 10s settle) wrapping `RSL.SetTableTo(..., { skipTransitionBlindfold = true })` and `Sync.full`; seat buttons flip narrative presence (writes `seatSlots[seatKey].isPresent` + mirrored `seatPresent`), then PC hidden objects / NPC Step Four / `L.reconcileAllPlayers()`. Panel refresh reads the same presence resolution (`seatSlots` wins). |
| `HUD_scenesClockFieldChanged` | `scenes_clock_day`, `scenes_clock_year`, `scenes_clock_time12`, `scenes_clock_speed` | `(player, value, id)` | `StorytellerScenesPanel.onClockInputChanged` — stashes typed text in `clockDraft` (TTS `UI.getValue` on `InputField` is unreliable). When a **pending** library row is selected (`activeKey` ≠ `lastAppliedKey`), marks draft dirty for **Activate scene**; does not mutate live `sessionScene.clock`. `HUD_scenesPanelInput` is an alias. |
| `HUD_scenesOpenDistrictModal` | `Browse districts...` | `(player, button, id)` | Shows `scenes_modal_districts_root` (`ui/storyteller/panel_scenes_location_modals.xml`, generated from `C.Districts`). |
| `HUD_scenesOpenSiteModal` | `Browse sites...` | `(player, button, id)` | Calls `StorytellerScenesPanel.applySiteModalDistrictVisibility()` then shows `scenes_modal_sites_root`. Modal XML lays out `scenes_site_group_generic` first, then `scenes_site_group_dist_<districtKey>` panels so the active district bucket draws above the general list. Visibility toggled from `sessionScene.districtKey`. Wide modal (~1120px), 8 buttons per row (generator). |
| `HUD_scenesCloseLocationModals` | modal Close buttons | `(player, button, id)` | Hides both picker roots. |
| `HUD_scenesPickDistrict` | `scenes_pick_district_*` | `(player, button, id)` | Parses key from `id`, writes `gameState.sessionScene.districtKey`, closes modals, `StorytellerScenesPanel.refresh()` + `applySiteModalDistrictVisibility`, `Sync.ui({ gameStateOverlay = true })` → `GameStateOverlay.reconcileFromState()`. |
| `HUD_scenesPickSite` | `scenes_pick_site_*` | `(player, button, id)` | Same for `sessionScene.siteKey`, then `Sync.ui({ gameStateOverlay = true })`. |
| `HUD_scenesMonthPick` | `scenes_month_1` … `scenes_month_12` | `(player, button, id)` | `StorytellerScenesPanel.setPendingMonth` — pending activation: draft only; live on-table scene: writes `sessionScene.clock.month`. |
| `HUD_scenesToggleRealTimeClock` | `scenes_clock_rtToggle` | `(player, button, id)` | `StorytellerScenesPanel.toggleRealTimeClock` — pending activation: draft only; live scene: toggles `sessionScene.clock.useRealTime`, starts/stops overlay ticker, `Sync.ui({ gameStateOverlay = true })`. |
| `HUD_scenesApplyLocation` | `Apply location + soundscape` | `(player, button, id)` | Reads **state** `sessionScene.districtKey` / `siteKey` (district/site names are display-only). Validates keys, writes cards + `Soundscape.applyContext` + `Sync.full()`. |
| `HUD_scenesApplyClock` | `Apply clock` | `(player, button, id)` | Pending library row: validates + stashes draft for **Activate scene** only. Live on-table scene: writes `sessionScene.clock` from `clockDraft`, `PresentDayClock.tryAdvance`, weather + `Sync.full()`, ticker carry reset. |
| `HUD_scenesSetPresentDayClock` | `scenes_clock_setPresentDay` (`Set`) | `(player, button, id)` | Overwrites `gameState.presentDayClock` from stashed month + day/year/time (`clockDraft`); does not mutate live `sessionScene.clock`. |
| `HUD_scenesCtorImportOpen` | `scenes_ctor_btn_import` | `(player, button, id)` | `StorytellerScenesPanel.openImportConstructorModal` — shows import modal, clears error + JSON stash. |
| `HUD_scenesCtorImportCancel` | `scenes_ctor_import_cancel` | `(player, button, id)` | Closes import modal. |
| `HUD_scenesCtorImportConfirm` | `scenes_ctor_import_confirm` | `(player, button, id)` | Host-only: `JSON.decode` + `SceneLibrary.validateAndNormalizeImportPayload`, writes `sceneLibrary.scenes[sceneKey]` with `receivesLiveWrites = false`, appends `order` key, `S.validateState()`, closes modal. |
| `HUD_scenesCtorImportJsonChanged` | `scenes_ctor_import_json` | `(player, value, id)` | Stashes pasted JSON (`onValueChanged` — do not read with `UI.getValue` on confirm). |
| `HUD_scenesCtorForkOpen` | `scenes_ctor_btn_fork` | `(player, button, id)` | Opens fork modal; prefills title fields via `text` attribute + stash. |
| `HUD_scenesCtorForkCancel` | `scenes_ctor_fork_cancel` | `(player, button, id)` | Closes fork modal. |
| `HUD_scenesCtorForkConfirm` | `scenes_ctor_fork_confirm` | `(player, button, id)` | Host-only: pins `F` on prior `activeKey` (if any), allocates `sceneKey_N`, writes new row with `receivesLiveWrites = true`, sets `activeKey`, `S.validateState()`. |
| `HUD_scenesCtorForkTitleChanged` | `scenes_ctor_fork_title_new`, `scenes_ctor_fork_title_old` | `(player, value, id)` | Stashes fork title edits. |
| `HUD_scenesLibSlot` | `scenes_lib_slot_01` … `scenes_lib_slot_20` | `(player, button, id)` | Host: sets `sceneLibrary.activeKey` from `order[slot]`; resets clock draft to activation preview (`PresentDayClock.resolveActivationPreviewClock` for present-day rows). Does not apply live state. |
| `HUD_scenesLibUnlink` | `scenes_lib_btn_unlink` | `(player, button, id)` | Host: `receivesLiveWrites = false` on the linked mirror row (`resolveMirrorSceneKey`, else selected row). |
| `HUD_scenesLibDelete` | `scenes_lib_btn_delete` | `(player, button, id)` | Host: two-step delete (arm then confirm within 5s) removes **active** key from `scenes` + `order`, clears `activeKey`. |
| `HUD_scenesLibApply` | `scenes_lib_btn_apply` | `(player, button, id)` | Host: closes Scenes panel + transition blindfold immediately, then `HUDBF.runTransitionAfterLeadIn` (`U.waitUntil` 2s) runs flush/clone/clock/table/soundscape/`Sync.full`; 10s settle before blindfold lift. |
| `HUD_scenesLibEnd` | `scenes_lib_btn_end` | `(player, button, id)` | Host: `U.Alert` to table; clears `sessionScene.districtKey` / `siteKey`; stops real-time clock (`useRealTime = false`, overlay ticker); `Soundscape.setLocationAudio("none")`, `reapplyWeatherNaturalVolumes`, `invalidateReconcileCache`, `Sync.full`. Closes the Scenes panel. |

## Game state overlay (`ui/shared/game_state_overlay.xml`)

| Source | Behavior |
| ------ | -------- |
| `core/game_state_overlay.ttslua` | **`GameStateOverlay.reconcileFromState()`** is the only writer for the overlay (driven from `UpdateUIDisplays` when `gameStateOverlay`, `phase`, or `scenesPanel` is requested, on every incremental `Sync.full`, or via `Sync.ui({ gameStateOverlay = true })` after district/site picker mutations). **`GameStateOverlay.refresh`** is an alias for the same function. When `currentPhase` is **`Play`** or **`Downtime`**, shows `gameStateOverlay_timeAndLocation` (district/site/date/time) and toggles `gameStateOverlay_weather` per site rules. **`gameStateOverlay_root` is not hidden by Lua** — only child panels are toggled. Library scene **Apply** advances **`SessionStart` → `Play`** so the overlay appears when a scene bundle is applied. **`GameStateOverlay.reconcileWeatherFromState()`** fills `gameStateOverlay_weather*` from `ChronicleWeather.resolveHudForClock`. Sets **`gameStateOverlay_weather` `active = false`** when the current `C.Sites[siteKey]` is indoors with **`weatherDucking == 0`**. When not Play/Downtime, **`gameStateOverlay_timeAndLocation`** and weather are hidden. Real-time: `ensureTicker` runs each wall second; time-only ticks update **`gameStateOverlay_time`**; hour/day rollovers refresh weather. |

## Per-seat camera overlay (`ui/.templates/panel_overlay_camera.xml` → `ui/player/panel_overlay_camera.xml`)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_alphaControl_hoverOn` | `Image` with class `alpha_control` (popout + preset buttons) | `(player, value, id)` | `U.setAttributes(id, { color = "rgba(1, 1, 1, 1)" })` — TTS Image has no `alpha` attribute; tint uses `color` rgba. |
| `HUD_alphaControl_hoverOff` | same | `(player, value, id)` | `U.setAttributes(id, { color = "rgba(1, 1, 1, 0.15)" })` — matches XML default on `alpha_control`. |
| `HUD_popoutCameraControl_click` | `popout_cameraPanel_<Color>` | `(player, value, id)` | Toggles `active` on `playerHud_overlay_cameraControls_<Color>` (reads current `active` via `UI.getAttribute`). When the panel closes, `resetCameraOverlayAlphaTintsForSeat` sets every camera `alpha_control` on that seat back to `rgba(1, 1, 1, 0.15)` so hover state does not stick. |
| `HUD_cameraControl_click` | `cameraControl_*_<Color>` preset Images | `(player, value, id)` | Parses `id` into a `Main.setCamera` mode (`default`, `diceTray`, `sheet`, `diceTray<OtherSeat>`, `sheet<OtherSeat>`), calls `Main.setCamera(player, mode)`, then collapses the controls panel (same idle tint reset as popout close). Unknown ids: log + close panel. |

On the first `Sync.full` bootstrap only, `HUDP.reconcileCameraOverlaySelfMatchRowsFromXmlDefaults` (from `core/sync.ttslua` before `Sync.ui`) sets `active="false"` on diagonal ids `cameraControls_otherControls<Color>_<Color>` (XML defaults all other rows active for a simpler template).

`HUDP.updatePlayerUI` then sets each `cameraControls_otherControls<RowSeat>_<HudSeat>` from state: self row stays inactive; other rows active only when `S.getPlayerID(RowSeat)` resolves (occupied seat).

## Per-seat location card dock (`ui/.templates/panel_overlay_location.xml` → `ui/player/panel_overlay_location.xml`)

Root `Panel` id `gameStateOverlay_location_<Color>` uses class `playerHud_overlay_location` (defaults in `ui/player/panel_overlays_defaults.xml`) so it does not share the center HUD class name `gameStateOverlay_location` on `shared/game_state_overlay.xml`.

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_locationOverlay_hoverOn` | `popout_locationPanel_<Color>` `Image` | `(player, value, id)` | `setActive` on `gameStateOverlay_locationPanel_<Color>` to true; popout tint `rgba(1, 1, 1, 1)`. |
| `HUD_locationOverlay_hoverOff` | same `Image` | `(player, value, id)` | Hides the inner panel; popout tint back to `rgba(1, 1, 1, 0.15)`. |

## Legacy scene preset buttons (player HUD / other XML)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_changeScene` | `scene_*` ids where present | `(player, button, id)` | Strips `scene_` prefix from `id`, mutates `currentScene` state, then calls `Sync.full()` (state-first reconcile pipeline). |

## Soundscape Controls (`panel_soundscape.xml`)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_soundscapeSetMusicMood` | `soundscapeMood_main`, `soundscapeMood_intrigue`, `soundscapeMood_combat` | `(player, button, id)` | Strips `soundscapeMood_` prefix from `id`, calls `SS.setMusicMood(moodKey)`. Active styling requires `backgroundMusicEnabled` and `backgroundMusicMode == "mood"`. |
| `HUD_soundscapeSetBackgroundLocation` | `soundscapeMood_location` | `(player, button, id)` | Enabled visually only when `sessionScene.siteKey` or `soundscape.lastAppliedSiteKey` resolves to a `C.Sites` row with `soundscape.backgroundMusic.playlist`. Calls `SS.setLocationMusic(playlist)`. |
| `HUD_soundscapePlayFeatured` | `soundscapeFeatured_*` | `(player, button, id)` | Strips `soundscapeFeatured_` prefix, calls `SS.playFeaturedMusic(trackKey)`. |
| `HUD_soundscapeStopFeatured` | `Stop feat.` | `(player, button, id)` | `SS.stopFeaturedMusic()`. |
| `HUD_soundscapeLaneSlider` | `soundscapeSlider_music`, `..._location`, `..._featured`, `..._rain`, `..._wind` | `(player, value, id)` | Calls `SS.setStorytellerLaneVolume(lane, value)`. Rain/wind sliders edit **natural** volume; indoor ducking is reapplied in soundscape. |
| `HUD_soundscapeStopAll` | `Stop All` button | `(player, button, id)` | Calls `SS.stopAll()` to silence loop lanes with `silent` and invalidate scheduled background/featured/thunder callbacks. |
| `HUD_soundscapePrepareSave` | `Silence for save` | `(player, button, id)` | Calls `SS.prepareEmittersForSave()` — `bootstrapSilenceStrayEmitterLoops` + `invalidateReconcileCache` only (physical silence; does **not** mutate `gameState.soundscape`). Load resync from active scene vs Main-only is **TOR-152**. |
| `HUD_soundscapeInspect` | `Inspect` button | `(player, button, id)` | Calls `SS.inspectEmitters()`, prints JSON emitter/effect information including GUID/tag validation plus Looping and Trigger Effects, and alerts the GM. |

## Phase Controls (`panel_phases.xml`)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_advancePhase` | `phase_SessionStart`, `phase_Play`, `phase_Downtime`, `phase_Memoriam`, `phase_SessionEnd` | `(player, button, id)` | Strips `phase_` prefix, maps to `C.Phases.*`, calls `M.advancePhase`, `UpdateUIDisplays({ phase = true })`, `syncStorytellerPhaseButtons()`. Future phase reconcilers can hook from `Sync` / domain modules. |
| `HUD_resetGame` | `utility_reset` | `(player, button, id)` | Calls `S.resetGameState()`, `Scenes.resetScene(0)` (instant), updates UI, broadcasts "Game has been reset." to all players. |
| `HUD_saveState` | `utility_save` | `(player, button, id)` | Reads state via `S.getGameState()`, JSON-encodes it for verification. Broadcasts confirmation to the clicking player. Note: TTS also auto-saves via `onSave()`. |

## Debug Controls (panel_phases.xml)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_logState` | `debug_logState` | `(player, button, id)` | Prints `JSON.encode_pretty(S.getGameState())` to console. Broadcasts confirmation to player. |

## Focused Debug Light panel (`panel_debug_light.xml`)

Included from `hud_storyteller.xml`. Host-only. Sliders and Snapshot/Done are documented in the **Storyteller admin column** table above.

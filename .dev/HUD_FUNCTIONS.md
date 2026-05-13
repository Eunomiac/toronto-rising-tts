# HUD Function Reference

Reference for `HUD_*` onClick handlers wired from Storyteller and shared UI XML.

## Global UI `InputField` — reading typed text

Per the TTS **InputField** note ([Input Elements](https://api.tabletopsimulator.com/ui/inputelements/)), live typed text is only delivered on **`onValueChanged`** / **`onEndEdit`** as the **`value`** argument. **Do not rely on `UI.getValue`** (or `U.getUIValue`) as the primary read path for `InputField` content. Stash `value` in Lua and read that on **Confirm**; prefill with **`UI.setAttribute(id, "text", ...)`** when the field may be inactive (see `core/roll_ui.ttslua` `uiSetInputField`, `rollDash_difficulty_*` + `HUD_rollSetDifficulty`). Full checklist: [`.dev/SOLVING ISSUES & DEBUGGING.md`](SOLVING%20ISSUES%20%26%20DEBUGGING.md) (*Global UI `InputField` — typed text*).

> **Source files:**
>
> - XML triggers: `ui/storyteller/panel_*.xml`, `ui/storyteller/hud_storyteller.xml`
> - Handler implementations: `core/global_script.ttslua` (loaded via stub `.tts/objects/Global.lua`)
> - Helper functions: `lib/util.ttslua` (`U.*` UI helpers), `core/storyteller_panel_ui.ttslua`, `core/light_debug.ttslua`, `core/light_debug_focus.ttslua`

---

## Storyteller admin column (`hud_storyteller.xml`)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_printState` | `Print State` button | `(player, button, id)` | Calls `DEBUG.logStateToFile("game_state")`. Writes **`.dev/.debug/debug_logs/game_state.txt`** when the tts-bridge listens on **39998**. |
| `HUD_debugSeatLights` | `Debug Seat Lights` button | `(player, button, id)` | Calls `DEBUG.logSeatLightsToFile("seat_lights")`. Writes **`.dev/.debug/debug_logs/seat_lights.txt`** for per-seat desired/current mode diagnostics. |
| `HUD_syncIncremental` | `Sync (incremental)` button | `(player, button, id)` | Calls `Sync.full({ force = false })` — fingerprints + narrow UI delta; faster routine refresh. |
| `HUD_syncAll` | `Sync All (force)` button | `(player, button, id)` | Calls `Sync.full({ force = true })` — bypass scene/soundscape fingerprints; full `UpdateUIDisplays` (overlay repair). |
| `HUD_clearLoadingOverlay` | `Clear Loading Overlay` button | `(player, button, id)` | Calls `hideStartupLoadingOverlays()` to force-hide `overlay_loadingScreen_<Color>` for all player seats (debug/manual escape hatch). |
| `HUD_debugLightGuidInput` | `dl_guid` `InputField` | `(player, value, id)` | Caches typed GUID (`LightDebugFocus.onGuidInput`). Per TTS docs, `InputField` text is not obtainable outside `onValueChanged`/`onEndEdit`; this handler is the primary source of truth. |
| `HUD_debugLightActivate` | `Debug Light` button | `(player, button, id)` | Reads GUID in order: `HUD_debugLightGuidInput` cache (authoritative), then `UI.getAttribute("dl_guid","text")`, then `UI.getValue("dl_guid")` as last-resort fallbacks. Trims, `getObjectFromGUID`, validates spotlight via `LightDebug.getLightComponent`. Opens `panel_debug_light_root`, syncs sliders, applies live. Broadcasts errors to the clicking player if invalid. |
| `HUD_debugLightEnabled` | `dl_enabled` `Toggle` | `(player, value, id)` | `LightDebugFocus.onEnabledToggle`: sets `cache.enabled`, `L.SetLightMode(..., enabled, ...)` instant apply. |
| `HUD_debugLightResetRow` | `dl_reset_*` buttons | `(player, button, id)` | `LightDebugFocus.resetRowFromId(id)`: restores that row from session-start snapshot and reapplies. |
| `HUD_debugLightSlider` | `dl_range`, `dl_angle`, `dl_intensity`, `dl_hue`, `dl_saturation`, `dl_brightness`, `dl_rotX`, `dl_rotY`, `dl_rotZ`, `dl_distance` | `(player, value, id)` | `LightDebugFocus.onSlider`: updates cached values, applies rotation/position. **Distance** moves along the inverse of `U.lookAtRotation` (same convention as `DEBUG.setRotationLookAt`), using object rotation minus `DEBUG.getLookAtOffset(obj)` for the beam axis. `L.SetLightMode` supplies enabled/range/angle/intensity/color (`transitionTime` 0). |
| `HUD_debugLightSnapshot` | `Snapshot` button (focused panel) | `(player, button, id)` | `LightDebugFocus.snapshot`: writes **`.dev/.debug/debug_logs/focused_light.lua`** (Lua table with `Vector` / `Color`) via `DEBUG.writeWorkspaceFile`. |
| `HUD_debugLightDone` | `Done` button (focused panel) | `(player, button, id)` | Hides panel and clears session; does not revert the object. |

## Storyteller Toggle Bar

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_selectStorytellerPanel` | `toggle_scenes`, `toggle_soundscape`, `toggle_pcs`, `toggle_phases`, `toggle_npcs` | `(player, button, id)` | Strips `toggle_` prefix from `id`, calls `StorytellerPanelUI.selectStorytellerPanel(panelKey)` to show one storyteller panel and hide all others. Updates toggle button colors to indicate active panel. Deferred refresh for Sound (`syncSoundscapeControls`) and Scenes (`StorytellerScenesPanel.refresh` + lighting preset buttons). |
| `HUD_togglePanel` | `toggleElem_*` buttons | `(player, button, id)` | Strips `toggleElem_` prefix from `id`, calls `U.toggleXmlElement(elemID, button)` to collapse/expand the target panel. Swaps toggle button text between `►` and `▼`. |

## Scenes tab (`panel_scenes_host.xml` → `panel_scenes.xml` + `panel_scenes_library.xml`)

**Authority:** `gameState.currentScene` remains the lighting preset key for `Scenes.reconcileFromState`. Narrative/table/location/seat-presence fields live under **`gameState.sessionScene`** (see `core/state.ttslua`). Applying a lighting preset also writes `sessionScene.lightingPresetKey` as a mirror.

The **Scenes** toolbar tab opens `panel_scenes_host` (**1200px** total: two **596px** columns + **8px** gap; host and `HorizontalLayout` use fixed `width`/`minWidth` so TTS does not collapse the row to a hairline). Main Scenes + **Scene library** with fixed slot buttons for `sceneLibrary.order`.

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_selectAdminLightingScene` | `adminScene_dark`, `adminScene_standard`, `adminScene_bright` | `(player, button, id)` | Sets `currentScene`, `sessionScene.lightingPresetKey`, clears `sceneTransition`, calls `Sync.full()`. |
| `HUD_scenesPanel` | `scenes_tbl_*`, `scenes_seat_*` | `(player, button, id)` | `core/storyteller_scenes_panel.ttslua`: table buttons call `rotational-seat-layout.SetTableTo` after `sessionScene.tableKey`; seat buttons cycle `sessionScene.seatPresent` (`nil` → absent → present → neutral) and run `L.reconcileAllPlayers()`. |
| `HUD_scenesClockFieldChanged` | `scenes_clock_day`, `scenes_clock_year`, `scenes_clock_time12`, `scenes_clock_speed` | `(player, value, id)` | `StorytellerScenesPanel.onClockInputChanged` — stashes typed text for **Apply clock** (TTS `UI.getValue` on `InputField` is unreliable; same pattern as roll UI / Scene Constructor modals). `HUD_scenesPanelInput` is an alias for the same handler. |
| `HUD_scenesOpenDistrictModal` | `Browse districts...` | `(player, button, id)` | Shows `scenes_modal_districts_root` (`ui/storyteller/panel_scenes_location_modals.xml`, generated from `C.Districts`). |
| `HUD_scenesOpenSiteModal` | `Browse sites...` | `(player, button, id)` | Calls `StorytellerScenesPanel.applySiteModalDistrictVisibility()` then shows `scenes_modal_sites_root`. Modal XML lays out `scenes_site_group_generic` first, then `scenes_site_group_dist_<districtKey>` panels so the active district bucket draws above the general list. Visibility toggled from `sessionScene.districtKey`. Wide modal (~1120px), 8 buttons per row (generator). |
| `HUD_scenesCloseLocationModals` | modal Close buttons | `(player, button, id)` | Hides both picker roots. |
| `HUD_scenesPickDistrict` | `scenes_pick_district_*` | `(player, button, id)` | Parses key from `id`, writes `gameState.sessionScene.districtKey`, closes modals, `StorytellerScenesPanel.refresh()` + `applySiteModalDistrictVisibility`, `GameStateOverlay.refresh()`. |
| `HUD_scenesPickSite` | `scenes_pick_site_*` | `(player, button, id)` | Same for `sessionScene.siteKey`. |
| `HUD_scenesMonthPick` | `scenes_month_1` … `scenes_month_12` | `(player, button, id)` | `StorytellerScenesPanel.setPendingMonth` — updates `sessionScene.clock.month` and refreshes the panel. |
| `HUD_scenesToggleRealTimeClock` | `scenes_clock_rtToggle` | `(player, button, id)` | `StorytellerScenesPanel.toggleRealTimeClock` — toggles `sessionScene.clock.useRealTime`, starts/stops `GameStateOverlay` ticker. |
| `HUD_scenesApplyLocation` | `Apply location + soundscape` | `(player, button, id)` | Reads **state** `sessionScene.districtKey` / `siteKey` (district/site names are display-only). Validates keys, writes cards + `Soundscape.applyContext` + `Sync.full()`. |
| `HUD_scenesApplyClock` | `Apply clock` | `(player, button, id)` | Writes `sessionScene.clock` from month (state) + stashed or `UI.getValue` day/year/time12/speed, `ChronicleWeather.applyScheduledWeather({ force = false })`, `Sync.full()`, `GameStateOverlay.resetRealTimeCarry()` (clears fractional real-time carry), `GameStateOverlay.refresh` + `ensureTicker`. |
| `HUD_scenesCtorImportOpen` | `scenes_ctor_btn_import` | `(player, button, id)` | `StorytellerScenesPanel.openImportConstructorModal` — shows import modal, clears error + JSON stash. |
| `HUD_scenesCtorImportCancel` | `scenes_ctor_import_cancel` | `(player, button, id)` | Closes import modal. |
| `HUD_scenesCtorImportConfirm` | `scenes_ctor_import_confirm` | `(player, button, id)` | Host-only: `JSON.decode` + `SceneLibrary.validateAndNormalizeImportPayload`, writes `sceneLibrary.scenes[sceneKey]` with `receivesLiveWrites = false`, appends `order` key, `S.validateState()`, closes modal. |
| `HUD_scenesCtorImportJsonChanged` | `scenes_ctor_import_json` | `(player, value, id)` | Stashes pasted JSON (`onValueChanged` — do not read with `UI.getValue` on confirm). |
| `HUD_scenesCtorForkOpen` | `scenes_ctor_btn_fork` | `(player, button, id)` | Opens fork modal; prefills title fields via `text` attribute + stash. |
| `HUD_scenesCtorForkCancel` | `scenes_ctor_fork_cancel` | `(player, button, id)` | Closes fork modal. |
| `HUD_scenesCtorForkConfirm` | `scenes_ctor_fork_confirm` | `(player, button, id)` | Host-only: pins `F` on prior `activeKey` (if any), allocates `sceneKey_N`, writes new row with `receivesLiveWrites = true`, sets `activeKey`, `S.validateState()`. |
| `HUD_scenesCtorForkTitleChanged` | `scenes_ctor_fork_title_new`, `scenes_ctor_fork_title_old` | `(player, value, id)` | Stashes fork title edits. |
| `HUD_scenesLibSlot` | `scenes_lib_slot_01` … `scenes_lib_slot_20` | `(player, button, id)` | Host: sets `sceneLibrary.activeKey` from `order[slot]`; `StorytellerScenesPanel.refresh()`. |
| `HUD_scenesLibUnlink` | `scenes_lib_btn_unlink` | `(player, button, id)` | Host: `receivesLiveWrites = false` on active row. |
| `HUD_scenesLibDelete` | `scenes_lib_btn_delete` | `(player, button, id)` | Host: two-step delete (arm then confirm within 5s) removes **active** key from `scenes` + `order`, clears `activeKey`. |
| `HUD_scenesLibApply` | `scenes_lib_btn_apply` | `(player, button, id)` | Host: clones `sceneLibrary.scenes[activeKey].sessionScene` into live `sessionScene`, sets `currentScene` from `lightingPresetKey`, `RSL.SetTableTo` when `tableKey` is valid, district/site cards + `Soundscape.contextFromSite` / `applyContext`, optional `soundscapeNarrative` via `Soundscape.applySessionSceneNarrativeOverrides`, chronicle weather when not manual-hold, then `Sync.full`. |
| `HUD_scenesLibEnd` | `scenes_lib_btn_end` | `(player, button, id)` | Host: `U.Alert` to table, `Soundscape.setLocationAudio("none")`, `reapplyWeatherNaturalVolumes`, `invalidateReconcileCache`, `Sync.full` (does not clear `sessionScene`). |

## Game state overlay (`ui/shared/game_state_overlay.xml`)

| Source | Behavior |
| ------ | -------- |
| `core/game_state_overlay.ttslua` | `GameStateOverlay.refresh()` sets `gameStateOverlay_datetime` only when `currentPhase` is **`Play`** or **`Downtime`** (`C.Phases.PLAY` / `C.Phases.DOWNTIME`); otherwise the line is cleared. When shown, text is one line from `sessionScene.clock`: weekday, full month name, day with ordinal suffix, year, comma, then 12-hour time. When `sessionScene.clock.useRealTime` is true, `ensureTicker` runs once per wall second: narrative minutes advance by `realTimeSpeed / 60` per tick; hour/day rollovers call `ChronicleWeather.applyScheduledWeather`. |

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
| `HUD_soundscapePrepareSave` | `Silence for save` | `(player, button, id)` | Calls `SS.prepareEmittersForSave()` — `stopAll`, invalidate reconcile cache, `reconcileFromState({ force = true })` so the next table save does not resume stray Unity emitter loops. |
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
| `HUD_toggleZones` | `debug_zones` | `(player, button, id)` | Checks `S.getStateVal("zones", "allZonesLocked")`. If locked, calls `Z.activateZones()`; otherwise `Z.deactivateZones()`. Broadcasts status to player. |
| `HUD_logState` | `debug_logState` | `(player, button, id)` | Prints `JSON.encode_pretty(S.getGameState())` to console. Broadcasts confirmation to player. |

## Light Debug Panel (panel_lighting.xml)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_lightUpdate` | `lightUpdate_<guid>` (dynamically generated) | `(player, value, id)` | `value` contains the light object's GUID. Reads UI input fields `lightColor_<guid>`, `lightRange_<guid>`, `lightAngle_<guid>`, `lightIntensity_<guid>`. Calls `LightDebug.applyLightUpdate(guid, color, range, angle, intensity)`. Broadcasts success/failure. |
| `HUD_lightRefresh` | `lightDebugRefresh` | `(player, button, id)` | Calls `LightDebug.refreshLightDebugPanel()` to rescan all objects for spotlights and rebuild the light table rows. Broadcasts confirmation. |

## Focused Debug Light panel (`panel_debug_light.xml`)

Included from `hud_storyteller.xml`. Host-only. Sliders and Snapshot/Done are documented in the **Storyteller admin column** table above.

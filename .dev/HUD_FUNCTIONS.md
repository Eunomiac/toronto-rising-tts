# HUD Function Reference

Reference for `HUD_*` onClick handlers wired from Storyteller and shared UI XML.

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
| `HUD_debugLightGuidInput` | `dl_guid` `InputField` | `(player, value, id)` | Caches typed GUID (`LightDebugFocus.onGuidInput`). Required because TTS InputField text is not reliably readable with `UI.getValue` alone. |
| `HUD_debugLightActivate` | `Debug Light` button | `(player, button, id)` | Reads GUID in order: `HUD_debugLightGuidInput` cache, then `UI.getAttribute("dl_guid","text")`, then `UI.getValue("dl_guid")`. Trims, `getObjectFromGUID`, validates spotlight via `LightDebug.getLightComponent`. Opens `panel_debug_light_root`, syncs sliders, applies live. Broadcasts errors to the clicking player if invalid. |
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

## Scenes panel (`panel_scenes.xml`)

**Authority:** `gameState.currentScene` remains the lighting preset key for `Scenes.reconcileFromState`. Narrative/table/location/seat-presence fields live under **`gameState.sessionScene`** (see `core/state.ttslua`). Applying a lighting preset also writes `sessionScene.lightingPresetKey` as a mirror.

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_selectAdminLightingScene` | `adminScene_dark`, `adminScene_standard`, `adminScene_bright` | `(player, button, id)` | Sets `currentScene`, `sessionScene.lightingPresetKey`, clears `sceneTransition`, calls `Sync.full()`. |
| `HUD_scenesPanel` | `scenes_tbl_*`, `scenes_seat_*` | `(player, button, id)` | `core/storyteller_scenes_panel.ttslua`: table buttons call `rotational-seat-layout.SetTableTo` after `sessionScene.tableKey`; seat buttons cycle `sessionScene.seatPresent` (`nil` → absent → present → neutral) and run `L.reconcileAllPlayers()`. |
| `HUD_scenesPanelInput` | district/site/clock/npc note fields | `(player, value, id)` | Intentional no-op on keystroke; use Apply buttons to persist. |
| `HUD_scenesApplyLocation` | `Apply location + soundscape` | `(player, button, id)` | Validates `C.Districts` / `C.Sites` keys from inputs, writes `sessionScene.districtKey` / `siteKey`, runs `Soundscape.applyContext(Soundscape.contextFromSite(site, siteKey))`, then `Sync.full()`. |
| `HUD_scenesApplyClock` | `Apply clock` | `(player, button, id)` | Writes `sessionScene.clock` numeric fields from `scenes_clock_*` inputs (real-time ticker deferred). |
| `HUD_scenesSaveNpcNote` | `Save NPC scene note` | `(player, button, id)` | Stub: stores text in `sessionScene.npcWorld.lastNote` for future NPC spawn tracking hooks. |

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

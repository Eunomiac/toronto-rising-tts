# HUD Function Reference

Reference for `HUD_*` onClick handlers wired from Storyteller and shared UI XML.

> **Source files:**
>
> - XML triggers: `ui/storyteller/panel_*.xml`, `ui/storyteller/hud_storyteller.xml`
> - Handler implementations: `global/global_script.ttslua` (loaded via stub `.tts/objects/Global.lua`)
> - Helper functions: `lib/ui_helpers.ttslua`, `core/light_debug.ttslua`, `core/light_debug_focus.ttslua`

---

## Storyteller admin column (`hud_storyteller.xml`)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_printState` | `Print State` button | `(player, button, id)` | Calls `DEBUG.logStateToFile("game_state")`. Writes **`.tts/output/debug_logs/game_state.txt`**. |
| `HUD_debugLightGuidInput` | `dl_guid` `InputField` | `(player, value, id)` | Caches typed GUID (`LightDebugFocus.onGuidInput`). Required because TTS InputField text is not reliably readable with `UI.getValue` alone. |
| `HUD_debugLightActivate` | `Debug Light` button | `(player, button, id)` | Reads GUID in order: `HUD_debugLightGuidInput` cache, then `UI.getAttribute("dl_guid","text")`, then `UI.getValue("dl_guid")`. Trims, `getObjectFromGUID`, validates spotlight via `LightDebug.getLightComponent`. Opens `panel_debug_light_root`, syncs sliders, applies live. Broadcasts errors to the clicking player if invalid. |
| `HUD_debugLightEnabled` | `dl_enabled` `Toggle` | `(player, value, id)` | `LightDebugFocus.onEnabledToggle`: sets `cache.enabled`, `L.SetLightMode(..., enabled, ...)` instant apply. |
| `HUD_debugLightResetRow` | `dl_reset_*` buttons | `(player, button, id)` | `LightDebugFocus.resetRowFromId(id)`: restores that row from session-start snapshot and reapplies. |
| `HUD_debugLightSlider` | `dl_range`, `dl_angle`, `dl_intensity`, `dl_hue`, `dl_saturation`, `dl_brightness`, `dl_rotX`, `dl_rotY`, `dl_rotZ`, `dl_distance` | `(player, value, id)` | `LightDebugFocus.onSlider`: updates cached values, applies rotation/position. **Distance** moves along the inverse of `U.lookAtRotation` (same convention as `DEBUG.setRotationLookAt`), using object rotation minus `DEBUG.getLookAtOffset(obj)` for the beam axis. `L.SetLightMode` supplies enabled/range/angle/intensity/color (`transitionTime` 0). |
| `HUD_debugLightSnapshot` | `Snapshot` button (focused panel) | `(player, button, id)` | `LightDebugFocus.snapshot`: writes **`.tts/output/debug_logs/focused_light.lua`** (Lua table with `Vector` / `Color`) via `DEBUG.writeWorkspaceFile`. |
| `HUD_debugLightDone` | `Done` button (focused panel) | `(player, button, id)` | Hides panel and clears session; does not revert the object. |

## Storyteller Toggle Bar

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_selectStorytellerPanel` | `toggle_lighting`, `toggle_scenes`, `toggle_pcs`, `toggle_phases` | `(player, button, id)` | Strips `toggle_` prefix from `id`, calls `UIH.selectStorytellerPanel(panelKey)` to show one storyteller panel and hide all others. Updates toggle button colors to indicate active panel. |
| `HUD_togglePanel` | `toggleElem_*` buttons | `(player, button, id)` | Strips `toggleElem_` prefix from `id`, calls `UIH.toggleXmlElement(elemID, button)` to collapse/expand the target panel. Swaps toggle button text between `►` and `▼`. |

## Scene Controls (panel_scenes.xml)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_changeScene` | `scene_default`, `scene_elysium`, `scene_alley`, `scene_haven`, `scene_tension`, `scene_combat`, `scene_suspicion`, `scene_social` | `(player, button, id)` | Strips `scene_` prefix from `id`. Validates via `Scenes.getScene()`. Calls `Scenes.fadeToScene(sceneName, 2.0)` for a smooth 2-second transition. Updates UI displays. |

## Phase Controls (panel_phases.xml)

| Handler | XML Element(s) | Params | Behavior |
| ------- | ---------------- | ------ | -------- |
| `HUD_advancePhase` | `phase_play`, `phase_combat` | `(player, button, id)` | Strips `phase_` prefix from `id`. Maps to `C.Phases` constants (`play` -> `C.Phases.PLAY`, `combat` -> `C.Phases.COMBAT`). Calls `M.advancePhase(targetPhase)`. Updates UI displays. |
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

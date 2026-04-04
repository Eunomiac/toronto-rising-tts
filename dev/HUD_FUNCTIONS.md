# HUD Function Reference

Reference for `HUD_*` onClick handlers wired from Storyteller and shared UI XML.

> **Source files:**
>
> - XML triggers: `ui/storyteller/panel_*.xml`, `ui/storyteller/hud_storyteller.xml`
> - Handler implementations: `global/global_script.ttslua` (loaded via stub `.tts/objects/Global.lua`)
> - Helper functions: `lib/ui_helpers.ttslua`, `core/light_debug.ttslua`

---

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

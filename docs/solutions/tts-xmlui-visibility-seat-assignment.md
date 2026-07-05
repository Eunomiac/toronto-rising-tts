# TTS XmlUI visibility snapshotted at load (seat assignment)

## Symptom

- Player HUD / Storyteller panels missing after **connect-as-White** then auto-seat, or after **hotseat seat switch**, until Save & Play reload.
- Startup **loading blindfold** missing when connect seat ≠ load-time seat (per-color `visibility` on loading overlay).

## Cause

TTS evaluates XmlUI `visibility` against connected/seated players at UI init. Seat changes after load do not reliably re-filter panels ([Steam scripting thread](https://steamcommunity.com/app/286160/discussions/7/3051736373904766411/), BoneWhite / TTS Discord workaround: `UI.setXml(UI.getXml())` on seat change).

Per-color loading overlays inside `visibility="<Color>"` parents never show for clients not on that color at load.

## Fix (TOR-285)

1. **Global startup loading overlay** — `ui/shared/panel_overlay_loading_startup.xml`, included **last** in `ui/Global.xml` (`overlay_loadingScreen_startup`, no `visibility`). Hidden once via `hideStartupLoadingOverlays()` after startup gate.
2. **Seat-assignment UI refresh** — `refreshGlobalUiAfterSeatAssignment` in `core/global_script.ttslua`:
   - `onPlayerChangeColor` (after `M.onPlayerChangeColor`)
   - `GlobalRefreshUiAfterSeatAssignment` from `core/main.ttslua` when auto-assign skips `changeColor` (already on target seat)
   - `UI.setXml(UI.getXml())`, wait for `UI.loading`, then targeted `UpdateUIDisplays`

Scene-transition blindfolds remain per-color in `panel_overlay_blindfold.xml`.

## Verification

- Save & Play seated at Black → ST HUD visible; switch hotseat to Red → PC HUD visible without reload.
- Connect as White → auto-assign to chronicle color → PC HUD visible without reload.
- Startup loading screen visible for all clients during load gate, then hidden globally.

Multiclient join behavior: **solo/hotseat verified** until TOR-144 E2E.

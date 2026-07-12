# TTS XmlUI visibility snapshotted at load (seat assignment)

## Symptom

- Player HUD / Storyteller panels missing after **connect-as-White** then auto-seat, or after **hotseat seat switch**, until Save & Play reload.
- Startup **loading blindfold** missing when connect seat ≠ load-time seat (per-color `visibility` on loading overlay).

## Cause

TTS evaluates XmlUI `visibility` against connected/seated players at UI init. Seat changes after load do not reliably re-filter panels ([Steam scripting thread](https://steamcommunity.com/app/286160/discussions/7/3051736373904766411/), BoneWhite / TTS Discord workaround: `UI.setXml(UI.getXml())` on seat change).

Per-color loading overlays inside `visibility="<Color>"` parents never show for clients not on that color at load.

## Fix (TOR-285)

1. **Global session blindfold** — `ui/shared/panel_overlay_global_blindfold.xml`, included **last** in `ui/Global.xml` (`overlay_globalBlindfold`, no `visibility`). Visibility is **phase-owned** (shown in Intermission; hidden on Play enter / connect outside Intermission). No timed onLoad auto-hide.
2. **Seat-assignment UI refresh** — `refreshGlobalUiAfterSeatAssignment` in `core/global_script.ttslua`:
   - `onPlayerChangeColor` (after `M.onPlayerChangeColor`) for **join clients** and **first seat change after connect** (`pendingConnectSeatRefreshByPlayer`). **Host hotseat swaps** skip auto-refresh — use debug panel **Refresh UI** (`HUD_refreshUi`).
   - `GlobalRefreshUiAfterSeatAssignment` from `core/main.ttslua` when auto-assign skips `changeColor` (already on target seat)
   - **First visit only (per player, per seat, since connect):** deferred `UI.setXml(UI.getXml())` (~4s, TOR-374 join-timeout mitigation) to re-evaluate `visibility`; cache cleared on `onPlayerConnect`. Seat marked refreshed only after `UI.setXml` completes (`UI.loading` clear + post-refresh). Repeat hotseat swaps to the same seat skip `setXml` but still run targeted `UpdateUIDisplays` (HUD, overlays, loading hide).
   - Wait for `UI.loading` after `setXml` when used.

## Multiclient note (TOR-374)

Immediate `UI.setXml` on Grey→PC seat assign during join correlated with client **connection timeout** after partial join (music + global blindfold visible). Deferral keeps TOR-285 behavior while letting join sync finish first.

## Verification

- Save & Play seated at Black → ST HUD visible; switch hotseat to Red → click **Refresh UI** in debug panel → PC HUD visible without reload.
- Connect as White → auto-assign to chronicle color → PC HUD visible without reload (may take ~4s after seat land for full visibility refresh).
- Startup loading screen visible for all clients during load gate, then hidden globally.
- Multiclient: after Grey→assigned seat, friend stays connected through the deferred setXml window.

Multiclient join behavior: deferred setXml shipped; re-verify under TOR-144 E2E.

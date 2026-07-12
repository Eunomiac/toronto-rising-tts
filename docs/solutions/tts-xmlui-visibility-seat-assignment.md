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

## Multiclient note (TOR-374) — revised

**Author correction:** client stayed connected at Grey for some time before Host seated them Orange. Initial join sync had already completed. The ~4s defer after seat change therefore does **not** mitigate “overlap with join handshake.”

**Revised hypothesis:** the **cost/size of `UI.setXml(UI.getXml())` itself** (full Global XmlUI replace + redistribute to all clients) is enough to drop a connected client. Approximate static Include payload for Global UI is on the order of **~1.3+ MB** of XML source (dominated by `panel_right_sidebar_referenceLayer.xml` ~530 KB and `panel_map_core.xml` ~246 KB); runtime `getXml()` may be larger after attribute mutations.

**Chunking:** TTS does **not** support partial `setXml`. Each `setXml` / `setXmlTable` **replaces the entire UI document**. Sequential “chunk” replaces would mean N full rebuilds of incomplete trees — worse, not better.

**Next options (not yet implemented):** avoid seat-path `setXml` if a targeted workaround works; shrink Global UI (move heavy panels / object UI); test whether `UI.setAttribute(id, "visibility", …)` alone re-evaluates for the new seat in current TTS.

## Verification

- Save & Play seated at Black → ST HUD visible; switch hotseat to Red → click **Refresh UI** in debug panel → PC HUD visible without reload.
- Connect as White → auto-assign to chronicle color → PC HUD visible without reload (may take ~4s after seat land for full visibility refresh).
- Startup loading screen visible for all clients during load gate, then hidden globally.
- Multiclient: after Grey→assigned seat, friend stays connected through the deferred setXml window.

Multiclient join behavior: deferred setXml shipped; re-verify under TOR-144 E2E.

# TTS XmlUI visibility snapshotted at load (seat assignment)

## Symptom

- Player HUD / Storyteller panels missing after **connect-as-White** then auto-seat, or after **hotseat seat switch**, until Save & Play reload.
- Startup **loading blindfold** missing when connect seat ≠ load-time seat (per-color `visibility` on loading overlay).

## Cause

TTS evaluates XmlUI `visibility` against connected/seated players at UI init. Seat changes after load do not reliably re-filter panels ([Steam scripting thread](https://steamcommunity.com/app/286160/discussions/7/3051736373904766411/), BoneWhite / TTS Discord historically suggested a full UI document reload).

Per-color loading overlays inside `visibility="<Color>"` parents never show for clients not on that color at load.

## Fix (TOR-285 → TOR-375)

1. **Global session blindfold** — `ui/shared/panel_overlay_global_blindfold.xml`, included **last** in `ui/Global.xml` (`overlay_globalBlindfold`, no `visibility`). Visibility is **phase-owned** (shown in Intermission; hidden on Play enter / connect outside Intermission).
2. **Seat-assignment UI refresh** — `refreshGlobalUiAfterSeatAssignment` in `core/global_script.ttslua`:
   - `onPlayerChangeColor` (after `M.onPlayerChangeColor`) for **join clients** and **first seat change after connect** (`pendingConnectSeatRefreshByPlayer`). **Host hotseat swaps** skip auto-refresh — use debug panel **Refresh UI** (`HUD_refreshUi`).
   - `GlobalRefreshUiAfterSeatAssignment` from `core/main.ttslua` when auto-assign skips `changeColor` (already on target seat)
   - **First visit only (per player, per seat, since connect):** `revealSeatHudVisibility(seatColor)` — runtime `U.setAttribute(id, "visibility", seatColor)` on that seat’s predeclared Global HUD roots (no full UI document replace). Then targeted `UpdateUIDisplays`.
   - Host hotseat probe (`ui/shared/panel_visibility_probe.xml`) confirmed runtime visibility rebind (2026-07-12). Join-client Grey→PC still verify under TOR-144.

## Multiclient note (TOR-374 / TOR-375)

Full Global UI document reload on Grey→PC correlated with client **connection timeout** (~1.1 MB Include payload). That path is **removed**. Seat assign now only rebinds visibility attributes.

FOUC during reveal: hide under connect/global blindfold when needed (stylistic, not a security boundary).

## Verification

- Save & Play seated at Black → ST HUD visible; switch hotseat to Red → click **Refresh UI** → PC HUD visible without reload.
- Connect as White → auto-assign to chronicle color → PC HUD visible without reload (attribute reveal).
- Multiclient: Grey→assigned seat stays connected; HUD appears after reveal (TOR-144).

## Related

- [TOR-375](https://linear.app/eunomiac-dev/issue/TOR-375) eliminate runtime full UI refresh
- [TOR-376](https://linear.app/eunomiac-dev/issue/TOR-376) CSHEET max-slot migrate (Future optional; CSHEET `setXml` is an approved exception after TOR-375)
- [`lua-ui-full-xml-policy.md`](lua-ui-full-xml-policy.md)

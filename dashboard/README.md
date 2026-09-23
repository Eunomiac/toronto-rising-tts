# Dashboard Lua bridge

Execute-lua modules used by the Storyteller Dashboard (`.dev/storyteller-dashboard/`). These talk to `gameState` through Global entry points, but they are not general TTS table logic — keep them here instead of `core/`.

| Module | Require | Global entry |
| --- | --- | --- |
| `pc_sheet.ttslua` | `dashboard.pc_sheet` | `GlobalDashboardPcSheetSnapshot` / `GlobalDashboardPcSheetApply` |

Do **not** `require("dashboard.*")` from object-hosted scripts (same bundling rule as `core.*`).

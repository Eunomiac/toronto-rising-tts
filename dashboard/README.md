# Dashboard Lua bridge

Execute-lua modules used by the Storyteller Dashboard (`.dev/storyteller-dashboard/`). These talk to `gameState` through Global entry points, but they are not general TTS table logic — keep them here instead of `core/`.

| Module | Require | Global entry |
| --- | --- | --- |
| `pc_sheet.ttslua` | `dashboard.pc_sheet` | `GlobalDashboardPcSheetSnapshot` / `GlobalDashboardPcSheetApply` |
| `pc_sheet_traits.ttslua` | `dashboard.pc_sheet_traits` | none — registered in `pc_sheet.ttslua` `EXTENSIONS` (Page 2 disciplines/powers/rituals, Page 3 advantages, `projectStakes`) |
| `pc_sheet_xp.ttslua` | `dashboard.pc_sheet_xp` | none — `EXTENSIONS` (Experience Log append / Apply to All / undo, `lastXpEntry`) |
| `pc_sheet_relationships.ttslua` | `dashboard.pc_sheet_relationships` | none — `EXTENSIONS` (Page 4 `relationshipUpsert` / `relationshipDelete` via `core.relationships`, `relationships` snapshot rows) |
| `projects.ttslua` | `dashboard.projects` | `GlobalDashboardProjectsSnapshot` / `GlobalDashboardProjectsApply` — sheet Page 5 projects (own snapshot, not a seat extension: projects span owners and the coterie) |
| `world_snapshot.ttslua` | `dashboard.world_snapshot` | `GlobalDashboardWorldSnapshot` — phase, scene, clock anchor, soundscape and seats slices; the same builders feed the world push topics |
| `push.ttslua` | `dashboard.push` | none — live push (`DashPush.seat`, `DashPush.projects`, `DashPush.markWorldDirty`); see `.dev/Storyteller Dashboard Docs/Live Push Channel.md` |

## Load guard

TTS runs the Global chunk (so every `Global*` entry is callable) many seconds before `onLoad` reads the save into `gameState`. Dashboard execute-lua that lands in that gap would read an empty state, and any write would be discarded when `S.InitializeGameState` replaces `gameState`. Every dashboard entry above, plus `GlobalImportSceneJson` and `GlobalImportGenericNpcs`, therefore checks `S.isReady()` first (`dashboardLoadingRefusal` / `requireDashboardReady` in `core/global_script.ttslua`):

- JSON entries (`GlobalDashboard*Snapshot` / `*Apply`) return `{ ok = false, loading = true, error = "TTS is still loading the save…" }`. The PCs tab shows that message and retries every 3 seconds while the tab is open.
- The two import entries raise that message as a Lua error (their callers only detect failure that way).

New dashboard Global entries must start with the same guard.

## PC sheet extensions

`pc_sheet.ttslua` keeps the seat snapshot and the Page 1 ops. Each sibling module in its `EXTENSIONS` list exports:

- `ops[op] = function(color, pid, cmd) -> err|nil` — dispatched before the built-in ops; `pid` is already checked (never the Storyteller). Return a plain-English error string to reject; the dashboard shows it in the open popup.
- optional `snapshotFields(color, pid, stats) -> table` — keys merged into that seat's snapshot.

Add new sheet pages as new sibling modules rather than growing `pc_sheet.ttslua`.

Do **not** `require("dashboard.*")` from object-hosted scripts (same bundling rule as `core.*`).

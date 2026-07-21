# Skybox Google Sheet → Lua catalog import

**Date:** 2026-07-21  
**Status:** implemented (TOR-422)  
**Approach:** B — generated standalone catalog; Constants re-exports; Sheet is sole source of truth

## Agent Routing

Read this when:
- implementing or changing the skybox Sheet import task / script

Source of truth (authoring):
- Google Sheet (link-viewable): spreadsheet id `1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4`
- Named ranges: `SKYBOXCSV` (`Key,Display,URL`), `SKYBOXGENERICCSV` (`URL`)

Runtime source of truth (repo artifact):
- `lib/skyboxes_catalog.ttslua` (generated) → re-exported as `C.Skyboxes` / `C.GenericSkyboxes`

Verification:
- VS Code task / `npm run skyboxes:import` fetches CSV, writes catalog, regenerates Scenes location modals
- Spot-check: catalog keys appear in skybox picker; `C.resolveSkyboxURLFromKey` / site defaults still resolve

## Problem

Skybox catalog entries are hand-maintained in `lib/constants.ttslua`. The author already maintains Key/Display/URL (and generic URL list) in a Google Sheet. We need a one-command author workflow that refreshes the Lua catalog from that sheet without OAuth and without splicing into the mega Constants file.

## Goals

- VS Code task + npm script: fetch → validate → write generated Lua
- No credentials (sheet is “anyone with the link can view”)
- Configurable spreadsheet id / range names (defaults baked in; overrides via CLI flags and/or env)
- Preserve existing runtime shape: `C.Skyboxes[key] = { key, display, url }`, `C.GenericSkyboxes = { url, ... }`
- Keep resolve helpers (`C.SKYBOX_GENERIC_KEY`, `pickRandomGenericSkyboxURL`, `isValidSkyboxKey`, `resolveSkyboxURLFromKey`, `resolveSkyboxURLForSite`) in Constants
- After import, regenerate Scenes skybox modal XML so the picker stays in sync

## Non-goals

- OAuth / service-account Sheets API
- Checking in intermediate CSV/JSON under `lib/json/` (would create a second authority vs the Sheet)
- Renaming `lib/json/` → `lib/data/`
- Editing Sites’ `skybox` key references as part of this task (Sites stay in Constants; invalid keys remain a data/authoring concern)
- Auto-running import on every `npm run build` (network + author cadence; import is an explicit task)

## Design

### Fetch

Use the public export URL that already works for named ranges:

```text
https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&range={RANGE_NAME}
```

Defaults:

| Setting | Default |
| --- | --- |
| Spreadsheet id | `1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4` |
| Catalog range | `SKYBOXCSV` |
| Generics range | `SKYBOXGENERICCSV` |

Overrides (implementation may support any/all): `--sheet-id`, `--catalog-range`, `--generics-range`, and/or env `SKYBOX_SHEET_ID`, `SKYBOX_CATALOG_RANGE`, `SKYBOX_GENERICS_RANGE`.

Fail loudly on non-200, empty body, or HTML/login error pages.

### Parse & validate

**`SKYBOXCSV`**

- Header row must be `Key,Display,URL` (case-insensitive; trim cells)
- Data rows: non-empty Key, Display, URL
- Keys unique; Key must be a valid Lua identifier suitable as a table key (reject spaces / punctuation that would require bracket quoting — match current catalog style, e.g. `CLGreatHall`)
- Emit entry `{ key = Key, display = Display, url = URL }` under table key `Key`
- Stable sort by Key for deterministic diffs (or preserve sheet order — prefer **sheet row order** so author ordering is intentional; document which)

**`SKYBOXGENERICCSV`**

- Header `URL`; each non-empty data cell becomes one array element
- Reject empty list (at least one URL required so site-fallback random pick cannot go nil unexpectedly)

No intermediate file on disk: CSV stays in memory.

### Generated artifact: `lib/skyboxes_catalog.ttslua`

- Header comment: AUTO-GENERATED; Sheet id; range names; regenerate command
- Module shape:

```lua
local SkyboxesCatalog = {}

SkyboxesCatalog.Skyboxes = {
  SomeKey = {
    key = "SomeKey",
    display = "Human label",
    url = "https://..."
  },
}

SkyboxesCatalog.GenericSkyboxes = {
  "https://...",
}

return SkyboxesCatalog
```

- Escape Lua strings in Display/URL (`\`, `"`, newlines)
- Do not hand-edit; re-run import after Sheet changes

### Constants wiring

In `lib/constants.ttslua` (Skyboxes region):

- Keep `C.SKYBOX_GENERIC_KEY = "Generic"`
- Remove the large inline `C.Skyboxes = { ... }` and `C.GenericSkyboxes = { ... }` tables
- Add:

```lua
local SkyboxesCatalog = require("lib.skyboxes_catalog")
C.Skyboxes = SkyboxesCatalog.Skyboxes
C.GenericSkyboxes = SkyboxesCatalog.GenericSkyboxes
```

- Leave resolve helpers immediately below, unchanged in behavior
- Comment pointing agents at the import script / VS Code task

### Modal generator

`generate_scenes_location_modals_xml.js` currently reads `C.Skyboxes =` from `lib/constants.ttslua`. After the move it must read `SkyboxesCatalog.Skyboxes =` from `lib/skyboxes_catalog.ttslua` (Districts/Sites still from Constants). Update the AUTO-GENERATED header comment accordingly.

### Task / npm

- Script: `.dev/scripts/import_skyboxes_from_sheet.js` (name may vary slightly; keep npm key stable)
- `package.json`: `"skyboxes:import": "node .dev/scripts/import_skyboxes_from_sheet.js && node .dev/scripts/generate_scenes_location_modals_xml.js"`
- VS Code task label e.g. **Import skyboxes from Google Sheet** → `npm run skyboxes:import`
- Not part of default `build:all-tooling` (network-dependent)

### Docs

- Short note in `.dev/DOCS_INDEX.md` (Scenes / skybox row) and/or a brief blurb near existing skybox docs
- Comment in Constants Skyboxes region

### Linear / tasklist

- Create a Feature issue under the appropriate domain (Scenes & Chronicle or Foundation & Tooling) when implementation starts; sync RUNNING TASKLIST if a bullet is added

## Error handling

- Missing columns / duplicate keys / empty catalog → exit non-zero with clear message; **do not** write a partial catalog
- Network failure → exit non-zero; leave previous `skyboxes_catalog.ttslua` intact
- Write catalog atomically when practical (write temp + rename) so a crash mid-write does not leave a truncated file

## Success criteria

1. Running the VS Code task (or npm script) with network access refreshes `lib/skyboxes_catalog.ttslua` from the Sheet
2. `C.Skyboxes` / `C.GenericSkyboxes` behave as today for reconcile + panel
3. Skybox modal buttons match the new catalog after the chained modal generate
4. Spreadsheet id / ranges are configurable without editing script logic hardcodes only (defaults remain in script)

## Open decisions (resolved)

| Topic | Decision |
| --- | --- |
| Auth | Public CSV export (no OAuth) |
| Intermediate JSON/CSV in repo | No — Sheet is SoT |
| Output | Standalone generated `lib/skyboxes_catalog.ttslua` |
| Modal regen | Same npm/task run after successful import |
| Build pipeline | Explicit task only; not on every build |

## Out of scope follow-ups

- Similar Sheet import for Districts/Sites
- CI check that catalog keys referenced by `C.Sites[*].skybox` exist

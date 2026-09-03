# Stage NPCs — generic catalogue

## Agent Routing

Read this when:
- changing the Storyteller Dashboard **Stage NPCs** tab
- refreshing generic NPC rows from the Google Sheet
- adding that refresh to `npm run build` / `build:all-tooling`

Source of truth:
- Sheet named range `GENERICNPCCSV` (columns `filename,label,key,tags`)
- Generated catalog `.dev/storyteller-dashboard/data/generic-npcs.json`
- Cutouts already in the repo: `assets/images/NPCs/Generic/*.webp` (do not copy or duplicate)
- Import: `.dev/scripts/import_generic_npcs_from_sheet.js` (same public CSV export as skyboxes)
- Parse: `.dev/scripts/lib/generic_npcs_sheet_csv.js` (reuses `parseCsv` from `.dev/scripts/lib/skyboxes_sheet_csv.js`)
- Dashboard UI: `.dev/storyteller-dashboard/` (port 8788)

Verification:
- `npm run generic-npcs:import:test`
- `npm run generic-npcs:import` (needs a **link-viewable** sheet, same as skyboxes)
- VS Code task **STORYTELLER DASHBOARD** → Stage NPCs tab

Status: current

---

## What this is

The **Stage NPCs** tab on the existing Storyteller Dashboard lets you search the generic cutout catalogue, pick several NPCs, and copy their `key` values as a comma-separated list (for pasting into table tools). It is not a second app, and it does not talk to Tabletop Simulator.

Generate NPC (OpenAI) stays on its own tab.

---

## How the data is imported (same pattern as skyboxes)

Skyboxes already refresh from a Google Sheet at build time with **no OAuth**:

1. Named range on a spreadsheet that is **anyone with the link can view**.
2. Public export URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&range={RANGE_NAME}`
3. Node script fetches that CSV, rejects HTML/login pages, parses with the shared `parseCsv` helper, writes a generated file.

Generic NPCs use the same three steps. Design notes for skyboxes: [`docs/superpowers/specs/2026-07-21-skybox-sheet-import-design.md`](../../docs/superpowers/specs/2026-07-21-skybox-sheet-import-design.md). Script to copy: `.dev/scripts/import_skyboxes_from_sheet.js`.

| | Skyboxes | Generic NPCs |
| --- | --- | --- |
| Spreadsheet | Skyboxes sheet (`1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4`) | Toronto Rising sheet (`10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs`) |
| Named range | `SKYBOXCSV` (and others) | `GENERICNPCCSV` |
| Output | `lib/skyboxes_catalog.ttslua` | `.dev/storyteller-dashboard/data/generic-npcs.json` |
| npm | `skyboxes:import` | `generic-npcs:import` |
| In `build:all-tooling` today | Yes (that sheet is already link-viewable) | **Not yet** — the Toronto Rising sheet is private, so the same export URL returns a login/error page |

Do **not** add Drive MCP, Google OAuth, Papa Parse, or a second CSV parser. Do **not** keep a hand-edited CSV next to the dashboard as a second source of truth.

### Commands

From repo root:

```powershell
npm run generic-npcs:import:test
npm run generic-npcs:import
```

Overrides (same style as skyboxes): `--sheet-id`, `--range`, or env `GENERIC_NPC_SHEET_ID` / `GENERIC_NPC_RANGE`.

### Sharing gate (required before this can join `npm run build`)

`skyboxes:import` works because that spreadsheet is **anyone with the link can view**. The Toronto Rising spreadsheet is not. Until you share it the same way (or put `GENERICNPCCSV` on the public skyboxes sheet), `generic-npcs:import` will fail loudly with an HTML/login error — by design, matching skyboxes.

When that fetch succeeds, add `npm run generic-npcs:import` next to `skyboxes:import` in `build:all-tooling`. Do not add it earlier or every `npm run build` will fail.

The JSON currently in the repo is a snapshot of `GENERICNPCCSV` so the dashboard can run before that share is done. Re-run `generic-npcs:import` after sharing so the snapshot matches the live sheet.

---

## Columns

Header must be `filename,label,key,tags` (order can vary; names are matched after trim/lowercase).

| Column | Meaning |
| --- | --- |
| `filename` | Basename only of a file in `assets/images/NPCs/Generic` (example: `civilianChildBoy_01.webp`). Must be `.webp`. No folders. |
| `label` | Text under the thumbnail. |
| `key` | Clipboard value (Lua-style identifier, e.g. `civilianChildBoy_01`). Unique. |
| `tags` | Space-separated search words. |

Clipboard example:

```text
civilianChildBoy_01,dogAngry_02,crimePolice_03
```

---

## Dashboard behavior

- Live search: every whitespace-separated term must match (AND) against label + tags + key + filename (case-insensitive).
- Thumbnails: CSS crop (`object-fit: cover; object-position: center top`). No generated thumbnail files. Images are served from the existing Generic folder (`/generic-npc-images/…`).
- Click a tile to add/remove it from the bottom queue. Click a queue chip to remove it.
- **Copy** writes keys in queue order; does not clear the queue. Disabled when empty.
- **Clear** empties the queue.
- Escape clears the search box. Opening Stage NPCs focuses search. `/` focuses search when you are not already typing in a field. Enter does not copy.
- Missing image files log a warning and show a placeholder; they do not crash the tab.

Lua tab remains a placeholder.

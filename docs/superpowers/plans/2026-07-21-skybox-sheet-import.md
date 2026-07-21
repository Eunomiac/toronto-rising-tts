# Skybox Sheet Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch public Google Sheet CSV ranges into generated `lib/skyboxes_catalog.ttslua`, re-export via Constants, and regenerate the Scenes skybox modal from one npm/VS Code task.

**Architecture:** Sheet is sole authoring SoT. Node script fetches `export?format=csv&range=…`, validates in memory, writes catalog module. Constants requires catalog for `C.Skyboxes` / `C.GenericSkyboxes`. Modal generator reads catalog source. No intermediate JSON.

**Tech Stack:** Node.js (built-in `fs`/`path`/`fetch`), VS Code tasks, existing `generate_scenes_location_modals_xml.js` extractBlock helpers.

**Linear:** TOR-422 (Import skybox catalog from Google Sheet)

**Spec:** `docs/superpowers/specs/2026-07-21-skybox-sheet-import-design.md`

## Global Constraints

- Public CSV only — no OAuth
- Defaults: sheet id `1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4`, ranges `SKYBOXCSV` / `SKYBOXGENERICCSV`
- Preserve entry shape `{ key, display, url }` and array generics
- Fail loud; do not write partial catalog; atomic write when practical
- Not part of `npm run build`
- Preserve sheet row order for catalog entries

---

### Task 1: Parse/validate helpers + unit tests

**Files:**
- Create: `.dev/scripts/lib/skyboxes_sheet_csv.js` — pure parse/validate/emit helpers (exportable)
- Create: `.dev/scripts/import_skyboxes_from_sheet.test.js`

**Interfaces:**
- Produces: `parseCsv(text)`, `parseSkyboxCatalogRows(csv)`, `parseGenericSkyboxRows(csv)`, `escapeLuaString(s)`, `renderSkyboxesCatalogLua({ skyboxes, generics, meta })`

- [ ] **Step 1: Write failing tests** for header validation, duplicate keys, invalid Lua key, empty generics, lua escaping, and render contains `SkyboxesCatalog.Skyboxes`

- [ ] **Step 2: Implement helpers** to make tests pass

- [ ] **Step 3: Run** `node .dev/scripts/import_skyboxes_from_sheet.test.js` — expect PASS

- [ ] **Step 4: Commit** helpers + tests

---

### Task 2: Import CLI script

**Files:**
- Create: `.dev/scripts/import_skyboxes_from_sheet.js`

**Interfaces:**
- Consumes: helpers from Task 1
- CLI: `--sheet-id`, `--catalog-range`, `--generics-range`; env `SKYBOX_SHEET_ID`, `SKYBOX_CATALOG_RANGE`, `SKYBOX_GENERICS_RANGE`
- Fetch: `https://docs.google.com/spreadsheets/d/{id}/export?format=csv&range={range}`
- Writes: `lib/skyboxes_catalog.ttslua` via temp + rename

- [ ] **Step 1: Implement CLI** (fetch both ranges, validate, write)

- [ ] **Step 2: Dry-run against live sheet** (or after Task 3 wiring) — expect non-empty catalog

- [ ] **Step 3: Commit**

---

### Task 3: Wire Constants + modal generator + npm/task/docs

**Files:**
- Modify: `lib/constants.ttslua` — replace inline tables with `require("lib.skyboxes_catalog")`
- Modify: `.dev/scripts/generate_scenes_location_modals_xml.js` — read skyboxes from catalog path / `SkyboxesCatalog.Skyboxes =`
- Modify: `package.json` — `skyboxes:import`
- Modify: `.vscode/tasks.json` — Import skyboxes task
- Modify: `.dev/DOCS_INDEX.md` — one routing line
- Modify: `.dev/RUNNING TASKLIST.md` — checked bullet _(TOR-422)_
- Create: `lib/skyboxes_catalog.ttslua` via running import

- [ ] **Step 1: Constants splice** keep `C.SKYBOX_GENERIC_KEY` + helpers

- [ ] **Step 2: Modal generator path update**

- [ ] **Step 3: npm + VS Code task** (`skyboxes:import` chains modal generate)

- [ ] **Step 4: Run** `npm run skyboxes:import` — expect catalog + modal refresh

- [ ] **Step 5: Docs + tasklist + Linear Done**

- [ ] **Step 6: Commit**

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| Public CSV fetch | 2 |
| Configurable id/ranges | 2 |
| Validate Key/Display/URL + generics | 1 |
| `lib/skyboxes_catalog.ttslua` | 2–3 |
| Constants re-export | 3 |
| Modal regen chained | 3 |
| Not on every build | 3 |
| Docs / Linear | 3 |

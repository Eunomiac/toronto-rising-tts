# Cloud → CustomUIAssets sync (config-driven)

## Agent Routing

Read this when:
- designing or implementing automated Cloud Manager → save `CustomUIAssets` refresh
- extending `[Assets 1]` / `[Assets 2]` / `[Assets 3]` into a build-friendly pipeline
- adding or changing the job config schema for site cards, object CustomUIAssets, or `LuaCatalog` → `cloud_catalog.ttslua` / `Cloud`

Source of truth (today):
- `.tools/tts-cloud/` — Steam Cloud → Name/URL CSV
- `.tools/custom-ui-assets/` — purge / add-csv save editors
- `tts-assets.config.json` — local Saves folder + default save slot
- Cursor tasks: `[Assets 1]` … `[Assets 3]` in `.vscode/tasks.json`

Planned source of truth (this work):
- Job config: `.tools/cloud-asset-sync.jsonc` (committed)
- Plan (this file): `.tools/Cloud-Asset-Sync-Plan.md`
- Runner script that reads jobs and drives export → merge → confirmed stale purge / Lua catalog regen

Verification (when implemented):
- Dry-run a site-cards (`GlobalCustomUIAssets`) job against save from `tts-assets.config.json`
- Dry-run an `ObjectCustomUIAssets` job with `targetGUIDs` (missing GUID must fail before write)
- Dry-run / write a `LuaCatalog` job → regenerated `lib/cloud_catalog.ttslua` with `Cloud.<tableName>` entries
- Confirm overwrite of changed URLs and interactive stale-name prompt (save modes only)
- Confirm `npm run build:full` invokes sync; Main (`npm run build`) and XML (`npm run build:xml`) do not

Status: **implemented** — runner `.tools/cloud-asset-sync.js`; config `.tools/cloud-asset-sync.jsonc`; hooked into `build:full` / `build:all-tooling` only (`--yes-purge`).

---

## Goal

Automate refreshing hosted image URLs from TTS Cloud Manager into the correct targets, starting with **global site cards** (`CustomUIAssets` names like `siteCard_AnarchBar`).

Today that is a manual three-task loop (fetch CSV → purge → add). We want a **config file of jobs** plus a runner that can eventually hang off the build (or a dedicated npm script the build calls).

**v1 + v3 in one implementation pass:** `GlobalCustomUIAssets`, `ObjectCustomUIAssets`, `recurIntoSubfolders`, overwrite + confirmed stale purge (save targets), and `LuaCatalog` → generated `lib/cloud_catalog.ttslua` exposing global `Cloud`.

(Naming note: earlier sketches called this `LuaData` / `LuaTable`; the JSON `output` value is **`LuaCatalog`**.)

---

## Decisions (author, 2026-09-05)

### Config format

- Use **JSONC** (JSON with comments). Parser must accept `//` and `/* */` (Node `JSON.parse` alone is not enough).

### Save file resolution

Keep the save path definition in **one place**. Do not duplicate it on every job.

Resolve in this order:

1. `tts-assets.config.json` (existing search order in `.tools/custom-ui-assets/lib/tts-assets-config.js`): `savesDir` + `defaultSaveName` → absolute `TS_Save_*.json`.
2. Else require a top-level absolute `"saveFileLocation"` on the JSONC job file (only when toolkit config is missing).
3. Else fail with a clear setup message.

No per-job save path fields. Today’s toolkit config already yields an absolute save path via the `savesDir` + `defaultSaveName` pair.

### Overwrite policy

- Matching asset **Name** already on the save → **always overwrite** URL (and Type) from Cloud.
- Not configurable. Stale/wrong URLs must not be preserved.

### Stale purge (missing from Cloud)

- After building the planned Name set from Cloud + filename→name transform, find save entries that:
  1. Match this job’s **purge family** pattern(s), and
  2. Are **not** in the planned set.
- Those are **purge candidates**.
- **Do not delete automatically.** Print the candidate list and **prompt for confirmation** (Y/N) when a TTY is available.
- Non-interactive environments (no TTY): fail closed — print the list and exit non-zero unless an explicit automation flag is later defined (TBD; not required for site-cards interactive use).

#### Purge family: derive vs optional override

**Default — derive** from `filenameToNameReplacePattern` when that derivation **effectively narrows** the match (literal prefix/suffix or other fixed text beyond bare `$n` placeholders).

| Field | Example |
| --- | --- |
| `filenameToNameReplacePattern` | `siteCard_$1` |
| Derived purge family | `^siteCard_(.*)$` (exact anchors finalized in implementation) |

Rule of thumb: each `$n` in the replace string becomes `(.*)` (or equivalent); literal text stays literal.

**If derivation cannot narrow** (e.g. replace is only `$1` → would match every CustomUIAssets name): **skip purge for that job** (add/overwrite still run). Log clearly that purge was skipped because no safe family could be derived. Do **not** fail the job solely for that reason.

**Optional override — `"purgePatterns"`:** array of regexp strings. When present:

- **Replaces** dynamic derivation entirely (do not also derive).
- Each pattern is tested against save asset Names; union of matches ∩ not-in-planned → purge candidates.
- Use this when derivation is impossible but you still want stale cleanup (e.g. replace is `$1` but names live under a known prefix you spell out here).

Empty `purgePatterns: []` means “explicitly no purge” (same end state as unsafe derive → skip). Prefer omitting the key when you want default derive behavior.

Only names matching the active purge family are eligible on that target; other `CustomUIAssets` on the same target (and all other targets) stay untouched.

### Cloud folder export + `recurIntoSubfolders`

- `cloudFolder` is joined under toolkit `CLOUD_ROOT` / `cloudRoot` (same as `[Assets 1]`).
- **`recurIntoSubfolders`: `false`** (default if omitted): only files whose Cloud `Folder` equals the joined path exactly.
- **`recurIntoSubfolders`: `true` (v1):** also include files in nested Cloud folders under that path (treat as one flat Name/URL set for transform/merge). Nested path is not part of the asset Name unless the filename itself encodes it.
- Duplicate Cloud file Names (or duplicate transformed asset Names) across the filtered set → fail the job.

Folder membership alone is not enough: see **Filename filter + transform** — only Cloud file `Name`s that match `filenameToNameSearchPattern` are imported.

### Output modes

#### v1: `GlobalCustomUIAssets`

- Write save-root `CustomUIAssets` only.
- Never touch object `CustomUIAssets`.

#### v1: `ObjectCustomUIAssets`

- Requires `"targetGUIDs"`: array of at least one object GUID string.
- Same export → transform → merge → stale-purge-candidate → confirm → write flow as global, applied **independently to each listed object’s** `CustomUIAssets`.
- **Preflight:** resolve every GUID in the save before any mutation. Any missing GUID → **error and abort** (no partial write). Matches existing add-csv object mode.
- If an object has no `CustomUIAssets` array yet, create `[]` then merge (same as today’s object-mode tooling).
- Never touch save-root / global `CustomUIAssets`.
- Purge candidates should be listed **per GUID** (so it is clear which object would lose which names); one confirmation covers the whole job write plan when a TTY is available.
- `purgePatterns` / derived family apply per object the same way (planned set is shared from Cloud; each object’s existing Names are scanned separately).

#### v3: `LuaCatalog`

Writes **repo Lua**, not the TTS save.

- **Output file:** `lib/cloud_catalog.ttslua` (fixed path for v3; not per-job).
- **Global namespace:** the generated module defines / returns **`Cloud`**, intended to be exposed like other globals (e.g. `Cloud = require("lib.cloud_catalog")` from Global). Exact require wiring lands with implementation; the file itself must be the single source of `Cloud.*` catalog tables.
- Requires **`"tableName"`**: string naming the subtable under `Cloud` (e.g. `"Sites"` → `Cloud.Sites`). Must be a valid Lua identifier. Duplicate `tableName` across jobs in the config → config error.
- **Full-file regenerate:** when the run includes one or more `LuaCatalog` jobs, rewrite `cloud_catalog.ttslua` from scratch from **those jobs only** (fresh Cloud export + transform). Manual edits to that file are discarded. Each `tableName` is replaced entirely by that job’s planned set — no merge with a previous `Cloud.Sites`, etc. If the run has **no** `LuaCatalog` jobs, **do not touch** the file.
- **Does not** use `targetGUIDs`, save `CustomUIAssets`, or save-side purge / confirmation. Stale keys disappear because the subtable is rebuilt. `purgePatterns` on a `LuaCatalog` job → config error (or ignored with a warning; prefer **reject**).
- Save path resolution is **not required** for a run that only contains `LuaCatalog` jobs.

##### Row shape

Converted name (from `filenameToNameReplacePattern`) is both the **Lua table key** and the entry’s `key` field:

```lua
-- AUTO-GENERATED by cloud asset sync — do not edit by hand
Cloud = {
  Sites = {
    AnarchBar = {
      filename = "AnarchBar.webp",
      key = "AnarchBar",
      URL = "https://steamusercontent-a.akamaihd.net/ugc/...",
    },
    -- ...
  },
}

return Cloud
```

(Example assumes replace `$1` after stripping extension. With `siteCard_$1`, keys would be `siteCard_AnarchBar`, etc.)

| Field | Meaning |
| --- | --- |
| `filename` | Original Cloud file `Name` (including extension) |
| `key` | Converted name (same as the outer table key) |
| `URL` | Hosted URL from Cloud |

##### Consumer contract

Game code that needs a different shape (site card defs, HUD maps, …) **must not** expect the sync tool to emit that shape. After `require` / reading `Cloud.<tableName>`, call a **domain helper** that maps catalog rows into whatever structure that system needs. The catalog stays a thin, stable Name→URL inventory.

### Filename filter + transform
`filenameToNameSearchPattern` does **two** jobs (same regexp):

1. **Collect / filter** — when reading the Cloud folder (and nested folders if `recurIntoSubfolders`), **only import files whose `Name` matches** the pattern. Non-matching files are skipped (not an error). Log how many were skipped vs kept.
2. **Transform** — for each kept file, apply `filenameToNameReplacePattern` to produce the **converted name** (CustomUIAssets `Name`, or `LuaCatalog` table key / `key` field). Capture groups from the same match.

This is stricter than today’s `[Assets 1]` optional `--name-filter` (separate from add-csv transform). Here there is no separate whitelist field: the search pattern **is** the import filter.

| Field | Role |
| --- | --- |
| `filenameToNameSearchPattern` | RegExp on Cloud file `Name` (full filename): filter imports **and** drive replace captures |
| `filenameToNameReplacePattern` | Replacement (supports `$1`, …) → CustomUIAssets `Name` |

**Validation:** search pattern **must** start with `^` and end with `$` (full-string match). Reject otherwise.

If zero files remain after folder + pattern filtering → fail the job (nothing to sync).

Recommended extension-agnostic form (imports any single-extension filename, strips extension for the asset name):

```jsonc
"filenameToNameSearchPattern": "^(.*)\\.[^.]+$",
"filenameToNameReplacePattern": "siteCard_$1"
```

(`AnarchBar.webp` → imported → `siteCard_AnarchBar`. A file with no extension, or that otherwise fails the pattern, is not imported.)

Narrower example (webp only): `"^(.*)\\.webp$"`.
---

## Draft job shapes

Illustrative only — field names may tighten during implementation.

### Global site cards

```jsonc
{
  // Only if tts-assets.config.json is missing:
  // "saveFileLocation": "C:/Users/.../Saves/TS_Save_230.json",

  "jobs": [
    {
      "id": "siteCards",
      "cloudFolder": "Sites",
      "recurIntoSubfolders": false,
      "output": "GlobalCustomUIAssets",
      "filenameToNameSearchPattern": "^(.*)\\.[^.]+$",
      "filenameToNameReplacePattern": "siteCard_$1"
      // purge family derived → ^siteCard_(.*)$
      // Optional override when derive cannot narrow, e.g.:
      // "purgePatterns": ["^siteCard_"]
      // Overwrite: always on, not a config key
    }
  ]
}
```

### Object CustomUIAssets (same Cloud set onto several objects)

```jsonc
{
  "jobs": [
    {
      "id": "csheetDotsExample",
      "cloudFolder": "SomeCloudFolder",
      "recurIntoSubfolders": true,
      "output": "ObjectCustomUIAssets",
      "targetGUIDs": ["0bdb4a", "2cb469", "07ead9"],
      "filenameToNameSearchPattern": "^(.*)\\.[^.]+$",
      "filenameToNameReplacePattern": "$1",
      // derive cannot narrow ($1 only) → purge skipped unless override:
      "purgePatterns": ["^bp_"]
    }
  ]
}
```

### Lua catalog (v3) — regenerate `Cloud.<tableName>`

```jsonc
{
  "jobs": [
    {
      "id": "cloudSitesCatalog",
      "cloudFolder": "Sites",
      "recurIntoSubfolders": false,
      "output": "LuaCatalog",
      "tableName": "Sites",
      "filenameToNameSearchPattern": "^(.*)\\.[^.]+$",
      "filenameToNameReplacePattern": "$1"
      // → Cloud.Sites.AnarchBar = { filename, key, URL }
    }
  ]
}
```

Cloud root remains `CLOUD_ROOT` / `cloudRoot` from existing toolkit config (joined with `cloudFolder`), same as `[Assets 1]`.

Validation:

- `output: "ObjectCustomUIAssets"` without `targetGUIDs`, or with an empty array → config error.
- `output: "LuaCatalog"` without `tableName`, or with an empty/invalid identifier → config error.
- Duplicate `tableName` among `LuaCatalog` jobs → config error.
- `targetGUIDs` only allowed on `ObjectCustomUIAssets`; `tableName` only on `LuaCatalog`.
- `purgePatterns` only meaningful on save modes; reject on `LuaCatalog`.
- `output: "GlobalCustomUIAssets"` must not set `targetGUIDs` or `tableName`.

---

## Pipeline (per job)

Shared prefix for every output mode:

1. **Export + filter** — Steam Cloud folder → candidate files (`recurIntoSubfolders` as configured). Keep only rows whose file `Name` matches `filenameToNameSearchPattern`; skip the rest (log counts). Fail if none remain.
2. **Transform** — map each kept row to converted name via `filenameToNameReplacePattern`; fail on duplicate converted names.

### Save modes (`GlobalCustomUIAssets` / `ObjectCustomUIAssets`)

3. **Resolve targets** — global → save root; object → each `targetGUIDs` entry (fail if any GUID missing). Create missing object `CustomUIAssets: []` when planning writes.
4. **Plan merge** — for each planned Name on each target: add or overwrite.
5. **Plan stale purge** — if `purgePatterns` is present, use that array only; else try derive from replace. If neither yields a safe family, skip purge (log why). Else, per target, list Names in family ∉ planned set.
6. **Confirm** — if any purge candidates, print them (include GUID for object mode) and prompt Y/N (TTY). N or non-TTY without opt-in → do not write purge (policy: fail closed on non-TTY).
7. **Write** — backup save (existing toolkit backup rules), apply overwrites + confirmed removals (if any) across all targets in one atomic write.
8. Reload save in TTS remains a human step (document in verify notes when shipping).

### Catalog mode (`LuaCatalog`)

3. **Accumulate** — build `Cloud[tableName]` as a map of converted name → `{ filename, key, URL }` (`key` === converted name; `filename` === Cloud file Name).
4. **After all `LuaCatalog` jobs in this run** — if at least one such job ran, regenerate `lib/cloud_catalog.ttslua` from scratch from those jobs (header comment + `Cloud = { ... }` + `return Cloud`). If the run includes **no** `LuaCatalog` jobs, **leave the file alone**. No Y/N purge prompt (rebuild is the purge).
5. Game code loads `Cloud` and runs its own helpers to reshape catalog data as needed.
---

## Build integration

- Dedicated npm script (e.g. `cloud-asset-sync` / `custom-ui-assets:sync-from-cloud`) for standalone runs and dry-run.
- **Wire into `npm run build:full` only** (via `build:all-tooling`). Do **not** add to Main (`npm run build`) or XML (`npm run build:xml`).
- Interactive purge confirmation **is possible** when the script runs in a real terminal (VS Code/Cursor **BUILD PIPELINE (Full)** task or external terminal with stdin).
- Non-TTY / Full build: use `--yes-purge` (wired on `build:full`) so stale candidates are removed without a prompt. Interactive `npm run cloud-asset-sync` still prompts when a TTY is present.

---

## Implementation phases

| Phase | Deliverable |
| --- | --- |
| **0 — Plan** | This document (current; lives at `.tools/Cloud-Asset-Sync-Plan.md`) |
| **1 — One pass** | Config + validate + runner for save modes **and** `LuaCatalog`; site-cards (+ optional catalog) example JSONC |
| **2 — npm script** | Standalone script + optional Cursor task |
| **3 — Full build only** | Hook into `build:full` / `build:all-tooling` (not Main, not XML) |
| **4 — Global wiring** | `Cloud = require("lib.cloud_catalog")` when catalog file exists / is generated |

---

## Open questions

1. Whether intermediate CSV under `.tools/tts-cloud/out/` remains a debug artifact or stays internal-only (sync does not write CSV by default).
2. Whether `Cloud` should ever be read from object scripts (bundle rules: prefer Global.call / thin data if objects need it).

**Resolved:**

- Sync run with **no** `LuaCatalog` jobs leaves `lib/cloud_catalog.ttslua` **untouched**.
- Plan doc path: `.tools/Cloud-Asset-Sync-Plan.md`; job config: `.tools/cloud-asset-sync.jsonc`.
- v1 + v3 implemented in **one pass**.
- Build hook: **Full pipeline only** (not Main, not XML); Full runs `cloud-asset-sync -- --yes-purge`.
- `id` required on each job.
- Non-TTY without `--yes-purge`: fail if purge candidates exist; with `--yes-purge` or TTY yes: apply; TTY no: skip purge but still write merges.

---

## Related docs

- [`.tools/custom-ui-assets/README-save-editors.md`](custom-ui-assets/README-save-editors.md) — current Assets 1–3 behavior
- [`.dev/custom-ui-assets/README.md`](../.dev/custom-ui-assets/README.md) — Custom UI workflow index
- [`.dev/tts-assets-toolkit/README.md`](../.dev/tts-assets-toolkit/README.md) — public toolkit scaffold

# Chronicle Google Sheets

## Agent Routing

Read this when:
- you need chronicle content: District / Site aspects and resonance, Domain Control bonuses, characters (NPCs, PCs, coteries), weather calendar, soundscape, scenes, V5 rules text (Advantages, Disciplines)
- designing dashboard or HUD panels that show rules text (read the text from the sheets instead of cropping card art)
- touching the sheet import scripts under `.dev/scripts/import_*_from_sheet.js`

Source of truth:
- The five Google Sheets below are the author's master record for chronicle content. Repo catalogs (`data/scene-catalogs.json`, `lib/*_catalog.ttslua` including `lib/locations_catalog.ttslua` behind `C.Districts` / `C.Sites`, `lib/tr_weather_schedule.ttslua`, card art) are derived from them and can lag behind until the matching import runs.

Verification:
- Fetch the tab (either route below) and compare with the repo copy before relying on either.

Status:
- current (2026-10-11)

## The five sheets

All five are owned by the author and shared as **anyone with the link can view**.

| Sheet | Id | What lives there |
| --- | --- | --- |
| **Toronto Rising** | `10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs` | The chronicle workbook: `CHARACTERS` (every NPC: key, clan, bloodline, sect, generation, rank, title, sire / childer, coterie, PC relation, portrait URL, personal domain, quote, bio), `COTERIES`, `PCs`, `PREY`, `GM TIPS`, `SESSION ZERO`, `RUMORS`, `QUIZZES`, `MEMORIAMS` / `(memoriam export)`, `GENERICS` / `Generics Export` (generic NPC import), per-PC `… XP` ledgers, plus hidden tabs `WEATHER` (daily weather calendar: per month average temperature and per-day weather codes, with a JSON assembly column), `SITES`, `CBN STATS`. `AGENDAs (ignore)` and `AGENDA Randomizer (ignore)` are retired. |
| **Toronto Rising API** | `1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4` | Export-shaped tabs that feed TTS: `Districts.csv`, `Sites_Unique.csv`, `Sites_Generic.csv` (clean one-row-per-card exports, below), `SOUNDSCAPE` (track definitions with Lua assembly lines), `SCENES` (scene lookups and snap-group data), `PCs`, `PREY`, `GM TIPS`, `SESSION ZERO`, `DecadeRP`, `(data)` (very wide lookup tab, ~2 MB), hidden `(characters)`. Skybox and site-card imports read named ranges here. |
| **Districts & Sites of Toronto Rising** | `1ol1JOQNZER7QGsmBoeVXbKFNmCjYvKc-xibXtS3sFKk` | Authoring workbook for locations: `DISTRICTS`, `SITES` (aspects, resonance, soundscape, ambience, conditions, map positioning, validation), `RESONANCE` (resonance types, emotions, disciplines, district / site tallies), `SUGGESTIONS` (player-suggested aspects), `(data)` lookups, `(export)`, hidden `(songlist)`. Prefer the API sheet's `*.csv` tabs for reading finished values. |
| **V5: ADVANTAGES** | `1UNGiRe8n2sqj6uCm6Zv69fKD3wGDwZGpubzBQJx-fPE` | `RULES`, `BACKGROUNDS`, `MERITS`, `LORESHEETS`, `BLOODLINES`, `FLAWS`, `PREDATOR TYPES`, `DERANGEMENTS`. |
| **V5: DISCIPLINES** | `1U8Ktl4iHOwqldvikCKtEdXd56Mgt6LGukP4P_sjC0ME` | One tab per Discipline (`ANIMALISM`, `AUSPEX`, `BLOOD SORCERY`, `RITUALS`, `CELERITY`, `DOMINATE`, `FORTITUDE`, `OBFUSCATE`, `OBLIVION`, `CEREMONIES`, `POTENCE`, `PRESENCE`, `PROTEAN`) plus `RULES` and hidden `ALCHEMY`. |

### Location exports (API sheet)

| Tab | Columns |
| --- | --- |
| `Districts.csv` (36 rows) | `key`, `NAME`, `Domain Control: Minor / Major / Full`, `Resonance Plus`, `Resonance Minus` (e.g. `phlegmatic +`, `melancholic -`), Affair / Association / Clout / Utility (number + word), `Aspect Title 1–3`, `Aspect Content 1–3`, `Hunting Difficulties`, `Backgrounds`, `Minimaps` |
| `Sites_Unique.csv` | `Key`, `Title`, `Subtitle`, `Elysium`, `Resonance Plus`, `Resonance Minus`, `Resonance Frame`, `Aspect Title`, `Aspect Content`, `Backgrounds`, `Minimaps` |
| `Sites_Generic.csv` | `Key`, `Title`, `Subtitle`, `Resonance Plus`, `Resonance Minus`, `Resonance Frame`, `Aspect Title`, `Aspect Content`, `Backgrounds` |

Keys match the repo's district / site keys (`DupontByTheCastle`, `CLGreatHall`, …) and the card art file names under `assets/images/Districts/` and `assets/images/Sites/`. Sites without an aspect are left out of these exports (16 today: `CarusoResidence`, `CrimeScene`, `HockeyHallOfFame`, eight `Warrens*`, five `StRegis*`), so the dashboard's location picker cannot offer them until they get aspects. `Sites_Unique.csv` repeats its header row partway down; readers skip rows whose `Key` is `Key`.

### Districts and sites for TTS (`npm run locations:import`)

`.dev/scripts/import_locations_from_sheet.js` reads the **Districts & Sites** workbook directly (not the API exports, so every site is included) and writes `lib/locations_catalog.ttslua`; `lib/constants.ttslua` points `C.Districts` / `C.Sites` at it. The npm script then regenerates the Scenes location modals, the dashboard scene catalogs and the Global XmlUI. Both tabs put section titles in row 1 and headers in row 2; the importer finds columns by header inside a section.

| Tab | Columns read |
| --- | --- |
| `DISTRICTS` | `key` and `NAME` in "Export Range for Toronto Rising API .csv Files" (name gets a capital first letter); `Condition` (header in row 1) |
| `SITES` | `Key` in "Data Processing for CSV Export"; `Condition` in "Conditions"; in "Parsing for TTS Output": `name`, `Skybox`, `district`, `soundscape music`, `soundscape location`, `is indoors`, `Weather Ducking`, `Top Fog`, `map location` (each cell is a Lua fragment such as `isIndoors = true,`) |

Validation fails the import for unknown skybox, district, background-music or location-track keys. Warnings (import continues): accented keys are folded to ASCII (`WarrensFomórach` → `WarrensFomorach`); condition ids that are not implemented manual conditions are skipped; a few stale track keys from the sheet's `(data)` tab and the missing `nosWarrens` playlist are mapped in `TRACK_ALIASES` / `MUSIC_GAPS` (`.dev/scripts/lib/locations_sheet_csv.js`) until the sheet or soundscape catalog is fixed.

## How to read them

### Route 1 — Google Drive MCP (agents in Cursor)

Namespace `plugin-google-drive-google-drive` (the author has signed in; if the status is `needsAuth`, call `mcp_auth` once).

- `read_file` with `fileId` renders **every tab** as CSV under `## <tab>` headings. Big workbooks hit the 250 000-character cap (`maxChars`), so page with `startLine` / `endLine`. Cell text can itself contain `## ` lines (markdown inside cells), so do not treat every `## ` line as a tab boundary.
- `list_recent_files` / `search` find files; `export_file` (`xlsx`) gives all tab names at once but refuses files over Google's export limit (the API sheet is too large).
- The connection has broad Drive access. Read only; never edit, comment on, move or share these files unless the author asks.

### Route 2 — public CSV per tab (scripts and quick reads)

```text
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&headers=0&sheet=<URL-encoded tab name>
```

- Returns one tab as CSV with no sign-in. Pass `headers=0`, or Google merges the first rows into one header row.
- Hidden tabs work if you know the name. Named ranges also work via `/export?format=csv&range=<RANGE>` on the API sheet (used by the skybox and site-card imports).
- Visible tab names: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/htmlview` (look for `items.push({name: "…"`); hidden tabs are not listed there.
- Decode as UTF-8 (Node `fetch` does). PowerShell `Invoke-WebRequest` mangles accents such as "Fomórach".

Existing importers: `.dev/scripts/import_skyboxes_from_sheet.js`, `import_site_cards_from_sheet.js` (API sheet), `import_generic_npcs_from_sheet.js` (Toronto Rising sheet), `import_weather_from_sheet.js` (Toronto Rising `WEATHER` → `lib/tr_weather_schedule.ttslua`, `npm run weather:import`), `import_locations_from_sheet.js` (Districts & Sites → `lib/locations_catalog.ttslua`, `npm run locations:import`). Shared fetch helper: `.dev/scripts/lib/google_sheet_fetch.js` (sheet ids + whole-tab CSV). See [`Storyteller Dashboard Docs/Generic NPCs.md`](../Storyteller%20Dashboard%20Docs/Generic%20NPCs.md).

### Weather calendar (`WEATHER`, Toronto Rising sheet)

One row per day. The header row has `DayCodes` above the column of quoted hourly codes (column W); the three columns to its left are month, the month's average temperature in °C, and day. Each day holds 24 five-character codes decoded by `C.WEATHER` in `lib/constants.ttslua`. `npm run weather:import` validates every code and writes `lib/tr_weather_schedule.ttslua`; the dashboard reads the same columns live (`chronicleSheets.ts`). There is no repo-side JSON or CSV copy.

## Privacy

The sheets are link-viewable, but this GitHub repo is public. Existing import pipelines (skyboxes, site cards, generic NPCs, locations, weather, scene catalogs) may keep committing what they already commit. Do **not** commit new bulk chronicle content — character bios and stats, rumors, session notes, XP ledgers, player relations — without asking the author first. Prefer reading the sheet at runtime or into a git-ignored local file.

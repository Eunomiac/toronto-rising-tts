# Spreadsheet export contracts and consumer audit

## Agent routing

Read this before migrating any chronicle reader to `EXPORT_*`, changing the `(exports)` schema, or retiring compatibility tabs.

Sources of truth:
- The active Toronto Rising workbook and the authoring ranges identified below.
- Current importer/parser and runtime code, linked by path in `Spreadsheet Export Contract.json`.
- Cloud jobs and local asset files for image URLs and artwork.

Verification:
- Fetch every named range through the regular CSV endpoint with the export tab gid.
- Validate headers, keys, references, mixed values, and normalized records before changing consumers.
- Follow the repository's browser and in-game verification requirements when implementing the consumer migration.

Status: the build import contract targets the Named, Generic, and Function Calls schemas. The Cloud jobs and runtime cutover are separate work.

## Running the aligned imports

- `npm run exports:build`: fetch and validate all ten packages, then generate character catalogs, weather, locations, skyboxes, Complications metadata, Compulsion text and private NPC stats. Uses the current cloud manifest; no Steam upload or save mutation.
- `npm run exports:build -- --check`: run preflight against the live exports or an explicit snapshot without generating files.
- `npm run exports:test`: test the export contracts and verify pending edits and kept NPCs in an isolated stats import.
- `npm run exports:verify-lua`: execute the generated modules through `lib.npcs_data` and check identities, PC exclusion, Garou flags, generic figure counts, art associations, site skyboxes and weather.
- `npm run build:full`: existing backup/silence wrapper, then pending stat write-back, one validated snapshot, metadata/stats generation, other tooling, artwork/cloud jobs, and finally URL-dependent skybox/location generation. Every later importer inherits the same snapshot. New skybox files are joined after cloud sync.
- Dashboard `npm run dev` starts a fresh server, validates one batch and refreshes its character/Compulsion caches. `/api/chronicle-exports` serves weather/location detail from that batch; browser gviz reads have been removed. Refresh failures stop startup instead of using a stale file. NPC stats still refresh during the build.

For explicit offline replay, set `TR_EXPORT_SNAPSHOT` to the JSON written by `npm run exports:fetch`, or use `TR_EXPORT_CSV_DIR` with ten files named `EXPORT_<ID>.csv`. These private snapshots are ignored. A normal run fetches current data rather than loading the last cache. In this proxy-managed cloud session, live Node fetches required `NODE_USE_ENV_PROXY=1`.


## Location and transport

Active workbook: `10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs`.
Export tab: `(exports)`, gid `1673786468`.
Each horizontal package has its own named range with one header row followed by the data. Titles, migration helpers, and review checks are outside the named ranges.

```text
https://docs.google.com/spreadsheets/d/10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs/export?format=csv&gid=1673786468&range=EXPORT_CHARACTERS_NAMED
```

Substitute the named package, not column letters. Omitting gid returned HTTP 400 for the character ranges. The gid-qualified endpoint succeeded for all ten packages.

Use the regular CSV export, not gviz's majority-column typing. Parse TRUE/FALSE deliberately, preserve numeric zero, negative numbers, `X`, `~`, Unicode, commas, quotes, and multiline prose. Reject spreadsheet errors before generating outputs. Blank optional fields and `~` must retain their current parser meaning; do not turn them into literal defaults.

The machine-readable contract contains every exact header and snapshot range. The export tab has 3,001 rows. Package capacity depends on its header position. Source formulas use open-ended authoring references where local data permits; source named ranges have their own boundaries. Expand ranges with grid growth. An array overflow must remain a visible failure, and source-count checks must prevent truncated snapshots from being accepted.

## Package inventory

| Named package | Rows verified | Fields | Authoring source |
| --- | ---: | ---: | --- |
| EXPORT_CHARACTERS_NAMED | 195 | 52 | CHARACTERS with variant values resolved in the sheet |
| EXPORT_CHARACTERS_GENERIC | 2,070 | 32 | GENERICS joined to STAT PROFILES in the sheet |
| EXPORT_LOCATIONS_DISTRICTS | 36 | 21 | Districts & Sites → DISTRICTS projection |
| EXPORT_LOCATIONS_SITES | 186 | 27 | Districts & Sites → SITES and its authored audio/ducking lookups |
| EXPORT_MEMORIAM | 50 | 26 | Approved MEMORIAMS records and the existing runtime key transformations |
| EXPORT_WEATHER | 366 | 4 | WEATHER month, temperature, day, and DayCodes columns |
| EXPORT_SKYBOXES | 95 | 4 | Authored site names/availability and the API workbook's non-site keyed definitions |
| EXPORT_COMPLICATIONS | 66 | 14 | Toronto Rising Decks → [CPL] Cards, completed designs and automation keys |
| EXPORT_COMPULSIONS | 36 | 11 | Toronto Rising Decks → COM_DEFINITIONS joined to COM_VARIANTS |
| EXPORT_DISCIPLINES | 382 | 15 | V5: DISCIPLINES → normalized in the Toronto Rising export |

There are no manually maintained image URL fields in these export contracts. The legacy portrait URLs remain in the authoring source for review.

## Current import paths and runtime use

### Named and Generic characters

The Named export supplies the effective data for each row, including inherited fields. The importer requires a non-variant parent and a `<parent>_<distinction>` variant key. A PC can be a parent. PC rows remain available to the game and are excluded from the NPC roster and stats import. Named NPCs with neither Catalog membership nor a Memoriam assignment are drafts.

Named figurines use `npc_<key>.webp` when enabled. Portrait recipients and filenames come from the export. Variants can refer to an inherited portrait. The generated catalogs carry the filename or asset name used by each consumer.

The Generic export supplies one resolved stats row per figure key and tier. Figure metadata must agree across the tiers for that key. The stats import uses the figure API key as its identity and writes the supplied tiers. The profile lookup happens in the sheet.

Named power references resolve by Discipline and power name. The importer selects the first exact Exceptional Pool match in Discipline, power name, affinity 1, affinity 2 order, then uses POW. Explicit roll notation retains its own fields. Unknown references fail with the NPC, Discipline, and power names.

The shared loader rejects obsolete headers and export tables. Write-back targets current `CHARACTERS` keys and rejects pending edits that cannot be attached to a current row.

### Districts and sites

Current routes:
- `import_locations_from_sheet.js` and `lib/export_locations.js` read the two location exports and generate `lib/locations_catalog.ttslua`.
- `lib/constants.ttslua` exposes C.Districts/C.Sites for scenes, soundscape, map pins and conditions.
- The Dashboard reads aspects/resonance from `/api/chronicle-exports`; scene catalog generation also reads generated Lua.

The district schema retains its key/name/conditions plus authored domain values, resonance, and three aspect pairs. The site schema is the union of existing consumer needs: full runtime Name and card Title/Subtitle, district, map offset, resonance signs, aspect text, conditions, normalized location/music keys, outdoors state, numeric weather ducking, lighting, fog, skybox association, uniqueness, Elysium, and source audio labels. Is Silent? explicitly preserves the existing module's full ambient-silence setting from the authored TOTALSILENCE selection; the old generator did not emit that field.

Audio identifiers come from the authoring workbook's lookup table. NONE resolves to silent; TOTALSILENCE retains its full-silence flag. Existing explicit compatibility aliases are preserved. The existing nosWarrens music gap continues to use the default mood; Source Music Key retains the authored request so this exception is visible and can be retired when the playlist exists.

Source map offsets are unquoted and Unicode minus signs normalized. A Skybox Key is emitted only when the authored skybox exists. Requested Skybox Key preserves pending artwork requests separately, so unfinished artwork does not become an invalid runtime reference.

The source requests for CarusoResidence, CrimeScene, and ParkingLot currently have no corresponding managed skybox file. They continue to use the existing generic skybox behavior until their assets are supplied.

Production readers now use the prepared exports and bypass the broken API DISTRICTCSVDATA/SITECSVDATA chains. Old section-title parsers remain only for legacy parser fixtures.

### Memoriam

Current `skyboxes:import` reads EXPORT_MEMORIAM into `lib/skyboxes_catalog.ttslua`. Constants build per-character chronology, and `core/memoriam.ttslua` uses dates, location, panels, weather, audio, and splash text.

EXPORT_MEMORIAM preserves the exact current 26-field runtime schema: Key, Characters, Start/End Year, Location; Display/isOutdoors/isDaytime/Weather/Location Audio for each panel A–D; Splash Text. The 50 selected/approved records reproduce the old parser output exactly.

Human author IDs and names are transformed using the existing runtime conventions. Do not replace those keys with the displayed author IDs or rename PC aliases incidentally. Empty optional C/D panels and the Two-panel skybox marker retain their current meaning. Weather lists retain their pipe-separated runtime form.

Image links belong to cloud skybox, panel, and transition jobs. Character identities and stats belong in the character packages.

During export validation, each Memoriam location audio key without a soundscape track produces a warning listing its periods and panels. The authored key remains in the generated data.

### Weather

`import_weather_from_sheet.js` generates `lib/tr_weather_schedule.ttslua`. `lib/chronicle_weather.ttslua` decodes five-character hourly codes through C.WEATHER and applies/exposes weather. The Dashboard receives the same four export fields through its server.

The four headers are Month, Average Temperature, Day, and DayCodes. One row contains all 24 quoted hourly codes. All 366 days and 8,784 hours reproduce the old parser output exactly, including its existing temperature handling.

### Skyboxes

`import_skyboxes_from_sheet.js` joins sheet Key/Display/isShown metadata to the cloud manifest and generates `lib/skyboxes_catalog.ttslua`. Scenes and pickers use those records.

The fourth export field is Filename, not a URL. All 95 keys match the checked-in manifest. Labels are rebuilt from authored site names and the four non-site definitions, repairing 91 existing API #N/A labels. Hidden non-site entries keep their visibility setting.

Random generic panoramas remain cloud-owned: genericSkyboxes currently supplies ten images. They do not need a duplicate spreadsheet URL list. Memoriam panel metadata remains in EXPORT_MEMORIAM.

### Complications

`import_complications_from_sheet.js` currently selects completed designs and emits runtime metadata into `lib/complications_catalog.ttslua`. `core/complications.ttslua`, the model, and existing effect modules use card index/name/category/rarity/value and five roll eligibility flags.

The 15 export fields also preserve Standard/Enhanced/Active Enhanced wording and Necessary Automations. Effect text is data, not executable code. All 66 completed records reproduce the current runtime parser output exactly. Numeric zero, negatives, X, and booleans survive transport.

Physical deck sheets, image quantities, ordered settings sidecars, cloud sync, and save assembly remain separate asset workflows. Export completion does not authorize regenerating private artwork or changing the effect implementation.

### Compulsions

The Dashboard reads its generated private compulsions.jsonc cache for names/clan associations, Influence, and four numbered variants with Burden and Catharsis. TTS currently identifies physical cards by GM Notes type/variant in `core/compulsions.ttslua`; it does not consume a new Lua text catalog.

The authoring source is now Toronto Rising Decks → [COM] Cards, with COM_DEFINITIONS and COM_VARIANTS. The export joins those into 11 fields with one row per Compulsion/card number. All nine Compulsions and 36 variants reproduce the existing parser output from the uploaded JSONC exactly. Source row order is not card identity; use the explicit key and Card number.

The shared importer generates the existing Dashboard shape from this package at build time and server startup. Do not introduce new Compulsion mechanics or a new Lua text system as part of source consolidation.

## Validation performed

### Sheet preparation (2026-11-02)

- Downloaded and parsed all nine gid-qualified named-range CSVs.
- Checked exact, unique, nonblank headers and scanned exported cells for spreadsheet errors.
- Compared 94,934 cells with the live authoring-source projections.
- Verified all 196 named NPC stat blocks with authored stats and all 613 generic stat rows through the existing stat parser. The five PCs and five metadata-only Garou forms are intentionally not imported as named NPC blocks.
- Confirmed figure/profile/tier constraints, unique keys, variant references/cycles, location/district/audio/skybox references, map coordinates, and numeric ducking bounds.
- Confirmed every static TTS identity is represented by an exported identity or an explicit legacy alias.
- Verified skybox keys against the checked-in manifest and golden parser equivalence for Memoriam, Weather, Complications, and Compulsions.
- Read back formula anchors and formatting through the Sheets API. A Google-rendered browser preview was not available.
- Preserved author migration helpers, original character flags/data, compatibility views, and original portrait URLs. No asset, live save, pending-edit file, audit log, or generated runtime catalog was rewritten.

The visible review area begins at IN1. Counts, duplicate/profile/tier checks, and export formula errors are live. Six portrait reviews and two assignments to unavailable periods remain. A separate table shows the eleven collisions that would result from removing mem_; no such key renames were made.

## Implementation verification and remaining local checks

Live downloads and data generation pass for 206 unique source identities plus three aliases, 531 generic figures, 196 named stat blocks, 613 profile tiers, 36 districts, 186 sites, 50 Memoriam periods, 8,784 weather hours, 95 keyed skyboxes, 66 Complications and 36 Compulsion variants. The Lua routing smoke, eight export regressions, existing parser suites, Complications Lua tests, Dashboard type checks, production Dashboard build and 401 Dashboard tests pass. The production build reports unresolved local fonts/textures and its existing large client bundle warning; these require the local asset setup. A fresh dev server passed the drag/drop smoke and focused real-API/Catalog visibility checks at 1920×1080, with TTS replies mocked in the browser.

The existing `check:pcall-gate` fails because the local baseline allows zero `setXmlTable` sites while current code has one. The same failure and counts reproduce at base commit b0822ae7 with the same baseline file. No baseline was increased. Other bundle/local-limit/stub/effective-stat gates pass. This prevents a clean end-to-end FULL result in this environment, independently of the missing assets.

Your local checkout still needs its existing `assets/` tree (figurines, tokens, panoramas and deck image/settings files), `tts-assets.config.json`, Steam cloud state and current TTS save. Retain private Dashboard roster/layout/overrides/stats/pending/log files and its `.env` write-back URL/secret. This session used the checked-in cloud manifest, an older `.dev/TS_Save_230.json` snapshot, and reconstructed only the existing public roster groups for cloud browser verification. Those private test inputs are not committed. Actual Steam uploads, live Apps Script writes and Save & Play were not run.

For local verification (TOR-750), run FULL with TTS closed, reopen TTS and Save & Play. Check a named NPC, an old Daeva key, a Garou form, a multi-tier generic, a district/site's skybox/audio/fog/weather, a Complication and the Compulsion badge text; save/reload and confirm existing references remain valid. In the Dashboard, check that Catalog? false excludes an identity from Main while historical records remain available in Memoriam.

Six portrait differences and the two unapproved `blackCaesar11`/`blackCaesar12` assignments remain visible for author review. The build warns about unexported period assignments and preserves them. No mem_ keys, saved state or asset filenames were renamed. Compatibility tabs still feed sheet formulas and have not been deleted.

These nine packages do not replace every local input. FULL still embeds PCS.json, Coterie.json and PC_Relationships.json; the complete PC attributes/skills/Disciplines/XP model is larger than this roster/stat projection. Soundscape definitions and layout/override inputs also remain code/local-data owned. Compulsion card artwork and GM Notes keep their existing TTS workflow; text is generated for the existing Dashboard consumer, without adding new mechanics or a Lua text catalog.

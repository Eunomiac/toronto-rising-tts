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

Status: spreadsheet preparation completed and verified on 2026-11-02. Existing build and Dashboard consumers have **not** been switched. This document describes the prepared contract and the remaining migration work; it does not claim FULL currently consumes these names.

## Location and transport

Active workbook: `10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs`.
Export tab: `(exports)`, gid `1673786468`.
Every package is horizontal on this tab, has one header row at row 4, and starts its generated data at row 5. Titles, migration helpers, and review checks are outside the named ranges.

```text
https://docs.google.com/spreadsheets/d/10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs/export?format=csv&gid=1673786468&range=EXPORT_CHARACTERS_UNIQUE
```

Substitute the named package, not column letters. Omitting gid returned HTTP 400 for the character ranges. The gid-qualified endpoint succeeded for all nine packages.

Use the regular CSV export, not gviz's majority-column typing. Parse TRUE/FALSE deliberately, preserve numeric zero, negative numbers, `X`, `~`, Unicode, commas, quotes, and multiline prose. Reject spreadsheet errors before generating outputs. Blank optional fields and `~` must retain their current parser meaning; do not turn them into literal defaults.

The machine-readable contract contains every exact header and snapshot range. Named export ranges currently end at row 3001, giving 2,997 data rows each. Source formulas use open-ended authoring references where local data permits; source named ranges have their own boundaries. Expand ranges with grid growth. An array overflow must remain a visible failure, and source-count checks must prevent truncated snapshots from being accepted.

## Package inventory

| Named package | Rows verified | Fields | Authoring source |
| --- | ---: | ---: | --- |
| EXPORT_CHARACTERS_UNIQUE | 206 | 61 | CHARACTERS; MEM NAMED STATS; Memoriam NPC Export assignments |
| EXPORT_CHARACTERS_GENERIC | 2,070 | 37 | GENERICS joined to STAT PROFILES |
| EXPORT_LOCATIONS_DISTRICTS | 36 | 21 | Districts & Sites → DISTRICTS projection |
| EXPORT_LOCATIONS_SITES | 186 | 27 | Districts & Sites → SITES and its authored audio/ducking lookups |
| EXPORT_MEMORIAM | 50 | 26 | Approved MEMORIAMS records and the existing runtime key transformations |
| EXPORT_WEATHER | 366 | 4 | WEATHER month, temperature, day, and DayCodes columns |
| EXPORT_SKYBOXES | 95 | 4 | Authored site names/availability and the API workbook's non-site keyed definitions |
| EXPORT_COMPLICATIONS | 66 | 15 | Toronto Rising Decks → [CPL] Cards, completed designs |
| EXPORT_COMPULSIONS | 36 | 11 | Toronto Rising Decks → COM_DEFINITIONS joined to COM_VARIANTS |

There are no manually maintained image URL fields in these export contracts. The legacy portrait URLs remain in the authoring source for review.

## Current import paths and runtime use

### Unique characters

Current routes:
- `.dev/storyteller-dashboard/scripts/npc-stats/sheetFetch.ts` fetches four whole stat tabs.
- `npc-stats/import.ts` parses named blocks into private Dashboard `data/npc-stats.json`.
- `.dev/scripts/import_memoriam_npcs_from_sheet.js` imports historical identities into Dashboard JSON and `lib/memoriam_npc_catalog.ttslua`.
- Present-day names, PC flags, and werewolf flags are currently authored in `lib/npcs_data.ttslua`, rather than refreshed from the unique export.
- `core/npcs.ttslua`, `core/npc_spawn.ttslua`, and `dashboard/rolls.ttslua` use those identities and flags. Art comes from `lib/npc_art_urls.ttslua`.
- Named NPC stat blocks currently belong to the Dashboard roll/stat workflow. They are not all baked into a new Lua stats catalog by the existing pipeline.

The prepared table includes all 152 original CHARACTERS identities, 49 named historical identities, and five existing Garou figure forms migrated into CHARACTERS. The form rows preserve existing runtime keys, filenames, kind, and a Variant Of link; they have no invented stat values and start with Catalog? false.

Three existing possession aliases are retained in `Legacy API Keys`. Their canonical records retain the existing artwork filenames. The future importer must emit aliases or explicitly migrate saved references; removing an alias or renaming a file is not an incidental cleanup.

`Catalog?` is an author choice for the roster's main Catalog tab. It is not scene/session presence. CHARACTERS retains its existing values. MEM NAMED STATS now has an editable Catalog? checkbox; historical records initially remain excluded. Locations, Time Periods, and Memoriam Periods are independent metadata. Historical Variant Of links come from the current catalog; the separate Inherits From field is retained rather than conflated with that link.

Shared stat headers preserve the existing notation consumed by `scripts/npc-stats/sheet.ts`: Kind, Clan, Generation, Rank, Blood Potency, Humanity, Difficulty, Health, Willpower, Phy/Soc/Men/Pow, Exceptional Pools, Attacks, Powers, Advantages, and higher-tier/special-ability note sections. Discipline Expression, descriptions, tags, and identity metadata are also retained. Bio prose is not flattened.

`Authoring Tab` and `Authoring Key` identify the source record. Write-back must continue targeting authoring cells through its deliberate field mapping, never a formula-generated export or an assumed export row number. Keep pending edits, audit logs, stable roll IDs, and existing roll metadata when switching readers.

Portrait identifiers were resolved by managed file content hash when possible. Six legacy images differ from the currently managed portraits. Their original links remain untouched in CHARACTERS and their candidate managed identifiers are marked for review in Portrait Review.

### Generic characters

Current routes:
- `import_generic_npcs_from_sheet.js` reads Generics Export for the Dashboard catalog.
- `npc-stats/import.ts` separately reads generic compatibility stat tabs.
- `scripts/npc-art/generate.ts` combines catalog identities and artwork; cloud sync and `npc-art:urls` generate `lib/npc_art_urls.ttslua`.
- `lib/npcs_data.ttslua` builds the generic roster from generated art metadata. `core/generic_npcs.ttslua` and `core/npcs.ttslua` resolve/spawn it.

The contract joins one editable figure definition to the tier rows actually supplied by its Stat Profile. Repeated figure keys across tiers are intentional. Group by figure key, then store separate tier blocks; do not duplicate roster figures. Figure/tier pairs and profile/tier pairs must be unique, references must exist, and Kind/Tier combinations must match the rule table.

There are 531 figures and 613 source stat blocks. Mortals, Animals, Spirits, and Ghouls currently supply Weak/Average/Gifted/Deadly; Vampires supply Average/Gifted/Deadly/Superhuman. Do not impose a fixed count of tiers on future profiles.

The original Filename field is preserved. Figurine Filename provides the actual npc_<key>.webp naming convention; consumers must not accidentally keep using the older generic basename as an asset path. Source Group is transitional provenance, not a character type or the primary availability rule. Stat Profile and Stat Key must survive the migration from the old label-based stat storage.

### Districts and sites

Current routes:
- `import_locations_from_sheet.js` and `lib/locations_sheet_csv.js` read authoring tabs and generate `lib/locations_catalog.ttslua`.
- `lib/constants.ttslua` exposes C.Districts/C.Sites.
- `core/scenes.ttslua`, `core/scene_library.ttslua`, `core/soundscape.ttslua`, `core/map_pins.ttslua`, and conditions use those records.
- The Dashboard browser independently reads API district and unique/generic site tabs for aspects and resonance; scene catalog generation also reads generated Lua.

The district schema retains its key/name/conditions plus authored domain values, resonance, and three aspect pairs. The site schema is the union of existing consumer needs: full runtime Name and card Title/Subtitle, district, map offset, resonance signs, aspect text, conditions, normalized location/music keys, outdoors state, numeric weather ducking, lighting, fog, skybox association, uniqueness, Elysium, and source audio labels. Is Silent? explicitly preserves the existing module's full ambient-silence setting from the authored TOTALSILENCE selection; the old generator did not emit that field.

Audio identifiers come from the authoring workbook's lookup table. NONE resolves to silent; TOTALSILENCE retains its full-silence flag. Existing explicit compatibility aliases are preserved. The existing nosWarrens music gap continues to use the default mood; Source Music Key retains the authored request so this exception is visible and can be retired when the playlist exists.

Source map offsets are unquoted and Unicode minus signs normalized. A Skybox Key is emitted only when the authored skybox exists. Requested Skybox Key preserves pending artwork requests separately, so unfinished artwork does not become an invalid runtime reference.

The source requests for CarusoResidence, CrimeScene, and ParkingLot currently have no corresponding managed skybox file. They continue to use the existing generic skybox behavior until their assets are supplied.

The old parsers expect section titles that the author has changed. The API workbook also has broken DISTRICTCSVDATA/SITECSVDATA imports. The prepared exports bypass those broken chains and read the authoring source directly; the old readers still need their coordinated migration.

### Memoriam

Current `skyboxes:import` reads API SKYBOXMEMORIAMCSV into `lib/skyboxes_catalog.ttslua`. Constants build per-character chronology, and `core/memoriam.ttslua` uses dates, location, panels, weather, audio, and splash text.

EXPORT_MEMORIAM preserves the exact current 26-field runtime schema: Key, Characters, Start/End Year, Location; Display/isOutdoors/isDaytime/Weather/Location Audio for each panel A–D; Splash Text. The 50 selected/approved records reproduce the old parser output exactly.

Human author IDs and names are transformed using the existing runtime conventions. Do not replace those keys with the displayed author IDs or rename PC aliases incidentally. Empty optional C/D panels and the Two-panel skybox marker retain their current meaning. Weather lists retain their pipe-separated runtime form.

Image links belong to cloud skybox, panel, and transition jobs. Character identities and stats belong in the character packages.

Two existing assignments on mem_jeanDucheskiIPreDeath refer to blackCaesar11 and blackCaesar12. Both authoring periods are unselected and lack panel definitions. The assignments are preserved and shown in the review area; do not invent panels, approve periods, or silently remove associations to make a check pass.

### Weather

`import_weather_from_sheet.js` generates `lib/tr_weather_schedule.ttslua`. `lib/chronicle_weather.ttslua` decodes five-character hourly codes through C.WEATHER and applies/exposes weather. The Dashboard browser has an independent reader.

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

The Dashboard currently reads its private local compulsions.jsonc for names/clan associations, Influence, and four numbered variants with Burden and Catharsis. TTS currently identifies physical cards by GM Notes type/variant in `core/compulsions.ttslua`; it does not consume a new Lua text catalog.

The authoring source is now Toronto Rising Decks → [COM] Cards, with COM_DEFINITIONS and COM_VARIANTS. The export joins those into 11 fields with one row per Compulsion/card number. All nine Compulsions and 36 variants reproduce the existing parser output from the uploaded JSONC exactly. Source row order is not card identity; use the explicit key and Card number.

Generate the existing Dashboard shape from this package during the next reader migration. Do not introduce new Compulsion mechanics or a new Lua text system as part of source consolidation.

## Validation performed

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

## Next implementation boundary

Migrate FULL and Dashboard startup/browser/runtime readers together to one fetched and validated snapshot. Preserve write-back to authoring records. Include generic refresh in FULL and refresh historical identities before stats that depend on them. Remove stale-cache fallback behavior deliberately rather than accepting partially refreshed catalogs. Compatibility tabs can be flagged unused only after their readers and formula dependencies are gone.

These nine packages do not replace every existing local input. FULL still embeds PCS.json, Coterie.json, and PC_Relationships.json; the complete PC attributes/skills/Disciplines/XP model is larger than the roster/stat projection. Soundscape definitions and several layout/override inputs also remain code/local-data owned. Keep those existing paths until their own explicit source migration is designed; do not claim the character export already replaces the full PC bootstrap model.

End-to-end FULL, Steam Cloud reconciliation, original-vs-managed portrait review, current-save reference migration, and game/browser verification of changed consumers require the author's local asset/configuration/private data. This spreadsheet preparation used only the available repo, connected sheets, uploaded Compulsions JSONC, and checked-in manifest.

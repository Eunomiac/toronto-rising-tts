# Chronicle Google Sheets

## Export consolidation status — 2026-11-03

All nine `EXPORT_*` ranges on Toronto Rising → `(exports)` now feed FULL and Dashboard readers through the validated loader in `.dev/scripts/lib/sheet_exports.js`. Read [Spreadsheet Exports.md](Spreadsheet%20Exports.md) for commands, runtime routes and local verification requirements, and the [exact schema](Spreadsheet%20Export%20Contract.json) before changing importers. Regular named-range CSV requires both `gid=1673786468` and the range name; gviz loses mixed values.

`Catalog?` controls the main roster catalog, independently of scene/session presence or historical applicability. Complications and Compulsions authoring share **Toronto Rising Decks** (`11kcsl9vAqWeEBEFFmadMs65xpDqMNV8SkCaCNM_09bU`) on `[CPL] Cards` and `[COM] Cards`.

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

## Chronicle workbooks

All five are owned by the author and shared as **anyone with the link can view**.

| Sheet | Id | What lives there |
| --- | --- | --- |
| **Toronto Rising** | `10Ehs7cMR7016QYYW5TzT0mfmrc8XoGmfDlwz_Zh15Gs` | The chronicle workbook: `CHARACTERS` (named present-day NPC stats and character data), `GENERICS STATS`, `MEM NAMED STATS`, `MEM GENERIC STATS` (compatibility views), `STAT PROFILES`, `(exports)` (the nine production named ranges), `COTERIES`, `PCs`, `PREY`, `GM TIPS`, `SESSION ZERO`, `RUMORS`, `QUIZZES`, `MEMORIAMS` / `(memoriam export)`, `GENERICS` / `Generics Export` (figure authoring and compatibility view), `Memoriam NPC Export` (named range `MEMORIAMNPCCSV`), per-PC `… XP` ledgers, plus hidden tabs `WEATHER` (daily weather calendar: per month average temperature and per-day weather codes, with a JSON assembly column), `SITES`, `CBN STATS`. `AGENDAs (ignore)` and `AGENDA Randomizer (ignore)` are retired. |
| **Toronto Rising API** | `1mzgMSivCYvTfYAQNL61oApAvTHUbEi7YoiwZFr7PPo4` | Export-shaped tabs that feed TTS: `Districts.csv`, `Sites_Unique.csv`, `Sites_Generic.csv` (clean one-row-per-card exports, below), `SOUNDSCAPE` (track definitions with Lua assembly lines), `SCENES` (scene lookups and snap-group data), `PCs`, `PREY`, `GM TIPS`, `SESSION ZERO`, `DecadeRP`, `(data)` (very wide lookup tab, ~2 MB), hidden `(characters)`. The skybox import reads named ranges here (site-card links come from `assets/Sites` via `npm run cloud-asset-sync`, not the sheet). |
| **Districts & Sites of Toronto Rising** | `1ol1JOQNZER7QGsmBoeVXbKFNmCjYvKc-xibXtS3sFKk` | Authoring workbook for locations: `DISTRICTS`, `SITES` (aspects, resonance, soundscape, ambience, conditions, map positioning, validation), `RESONANCE` (resonance types, emotions, disciplines, district / site tallies), `SUGGESTIONS` (player-suggested aspects), `(data)` lookups, `(export)`, hidden `(songlist)`. Read finished location values from Toronto Rising `(exports)`. |
| **Toronto Rising Decks** | `11kcsl9vAqWeEBEFFmadMs65xpDqMNV8SkCaCNM_09bU` | `[CPL] Cards` owns Complications; `[COM] Cards` owns the shared Compulsion definitions and numbered variants. |
| **V5: ADVANTAGES** | `1UNGiRe8n2sqj6uCm6Zv69fKD3wGDwZGpubzBQJx-fPE` | `RULES`, `BACKGROUNDS`, `MERITS`, `LORESHEETS`, `BLOODLINES`, `FLAWS`, `PREDATOR TYPES`, `DERANGEMENTS`. |
| **V5: DISCIPLINES** | `1U8Ktl4iHOwqldvikCKtEdXd56Mgt6LGukP4P_sjC0ME` | One tab per Discipline (`ANIMALISM`, `AUSPEX`, `BLOOD SORCERY`, `RITUALS`, `CELERITY`, `DOMINATE`, `FORTITUDE`, `OBFUSCATE`, `OBLIVION`, `CEREMONIES`, `POTENCE`, `PRESENCE`, `PROTEAN`) plus `RULES` and hidden `ALCHEMY`. |

### Finished location data

Use EXPORT_LOCATIONS_DISTRICTS and EXPORT_LOCATIONS_SITES in the active Toronto Rising workbook. They include every site and the union of runtime settings, card/aspect/resonance fields and source audio metadata. The old API location tabs have broken import references and are no longer production inputs. `npm run locations:import` generates Lua, modals, Dashboard catalogs and embedded XML from these ranges.

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
- Hidden tabs work if you know the name. Named ranges also work via `/export?format=csv&range=<RANGE>` on the API sheet (used by the skybox and site-card imports). For the consolidated Toronto Rising ranges, always include `gid=1673786468` as well as `range=EXPORT_<ID>`.
- **gviz drops text in number columns.** In a column Google types as numeric, text cells come back empty, including the header label (CHARACTERS `Blood Potency`, `Health`, … read as blank headers). When you need every cell exactly as typed, use `/export?format=csv&gid=<gid>`.
- Visible tab names: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/htmlview` (look for `items.push({name: "…"`, which also carries each tab's `gid`); hidden tabs are not listed there.
- Decode as UTF-8 (Node `fetch` does). PowerShell `Invoke-WebRequest` mangles accents such as "Fomórach".

Production importers use `.dev/scripts/lib/sheet_exports.js` with the exact nine header contracts. Whole-tab reads are reserved for authoring inspection and the controlled CHARACTERS write-back channel. Variant links resolve against the full unique roster, including Catalog? false records.

### Weather calendar (`WEATHER`, Toronto Rising sheet)

One row per day. The header row has `DayCodes` above the column of quoted hourly codes (column W); the three columns to its left are month, the month's average temperature in °C, and day. Each day holds 24 five-character codes decoded by `C.WEATHER` in `lib/constants.ttslua`. `npm run weather:import` validates every code and writes `lib/tr_weather_schedule.ttslua`; the Dashboard reads EXPORT_WEATHER through `/api/chronicle-exports`. Explicit replay snapshots are private and git-ignored.

### NPC stats (the two character exports)

`npm run npc-stats:import` reads EXPORT_CHARACTERS_UNIQUE and EXPORT_CHARACTERS_GENERIC into private Dashboard `data/npc-stats.json`. It excludes PCs and metadata-only forms, groups repeated figures by supplied profile/tier, preserves existing generic label/stem keys, keeps pending edits and kept characters, and carries roll metadata across imports. Canonical identities and legacy aliases share pending-edit protection. Domain preflight rejects invalid/conflicting records before replacing outputs. Source snapshots, bulk stats and bios remain git-ignored.

Columns are found by their row-1 header (first occurrence; `*` ignored). Common stat fields are `Kind`, `Clan`, `Generation`, `Rank`, `Blood Potency`, `Humanity`, `Difficulty`, `Health`, `Willpower`, `Phy`, `Soc`, `Men`, `Pow`, `Exceptional Pools`, `Attacks`, `Powers`, and, on the named tabs, `Advantages`, `Ancilla Power(s)`, `Elder Power(s)`, `Methuselah Power(s)`, and `Special Abilities`. Blank and `~` cells are empty. Parser and exact validation: `.dev/storyteller-dashboard/scripts/npc-stats/sheet.ts` (tests in `sheet.test.ts`).

- **Difficulty:** `<exceptional>/<general>`. Every Exceptional pool's dice are derived as twice the exceptional number; no dice value is stored in the Sheet notation.
- **Exceptional Pools:** pipe-separated `<name>[:<trait1>[+<trait2>]]`.
- **Attacks:** pipe-separated `<name>=<pool><signed bonus>[:<trait1>[+<trait2>]]`, for example `Feral Claws=Brawl+2:Strength+Brawl`.
- **Pools** in attacks and powers must be `Phy` / `Soc` / `Men` / `Pow`, the exact name of one of the row's Exceptional pools, or, for powers, one of its attacks; matching ignores case.
- **Powers:** pipe-separated `<category> <dots> (<level>[-<rouse>]:<name>[=<pool>][:<traits>][_<difficulty>], …)`. A power's Difficulty may be fixed (`3`), a range (`2-5`), a minimum (`4+`), or a comma list. A blank pool is passive. Vampire and Ghoul powers include their Rouse cost.
- **Advantages:** pipe-separated names, imported for named present-day and named Memoriam NPCs. They are editable display lines, not rolls.
- **Notes:** Ancilla, Elder and Methuselah powers and Special Abilities become separate rich-text lines with bold names. Discipline Expression is ignored.
- Ids for pools, attacks and Advantages are stable hashes of their names. When a Sheet metadata field is blank, an existing local trait association or roll Difficulty is preserved for the matching roll.

**Write-back (dashboard edits → `CHARACTERS`, at build time only).** When a Stats-window save changes a present-day named NPC, the dashboard server records the key in `data/npc-stats-pending.json` (git-ignored, `src/server/npcStatsPending.ts`); nothing is sent during play. `npm run npc-stats:push` (before FULL takes its export snapshot) re-reads the Sheet, computes only the changed writable cells, and proves every edited block imports back identically. If any pending edit fails that check, the entire push aborts before sending any rows. A successful push appends every changed cell and its old value to `data/npc-stats-sheet-log.jsonl`, then clears the pending key. `--dry-run` performs the checks without writing. Notes are not written because their source is the Sheet's higher-tier power and Special Abilities columns. With nothing pending the push makes no network call.

**Write-back channel (setup done once by the author, 2026-10-13).** The writer is an Apps Script web app bound to the sheet: source `.dev/storyteller-dashboard/scripts/npc-stats/apps-script/Code.gs`, pasted into the sheet's **Extensions → Apps Script**, with a script property `SECRET` equal to `NPC_SHEET_WRITE_SECRET` in the dashboard's git-ignored `.env`, deployed as a web app (Execute as: Me; Who has access: Anyone). Its `/exec` URL goes in `.env` as `NPC_SHEET_WRITE_URL`. It accepts only requests carrying the secret, writes only the stat columns it lists, only on rows whose API key exists, and sets written text cells to plain-text format (so `6/4` never becomes a date). `npm run npc-stats:check-sheet` pings it without writing. After editing `Code.gs`, paste it again and use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## Privacy

The sheets are link-viewable, but this GitHub repo is public. Existing import pipelines (skyboxes, site cards, generic NPCs, locations, weather, scene catalogs) may keep committing what they already commit. Do **not** commit new bulk chronicle content — character bios and stats, rumors, session notes, XP ledgers, player relations — without asking the author first. Prefer reading the sheet at runtime or into a git-ignored local file.

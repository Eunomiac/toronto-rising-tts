# TTS save tooling

Node scripts that read or patch the live save named in `tts-assets.config.json` (`savesDir` + `defaultSaveName`). Writes back up the save first (`backupBeforeWrite`, into `backupDir`).

## Agent Routing

Read this when:
- touching `.tools/tts-save/**` or the `tts-save:*` npm scripts

Source of truth:
- `resolve-save-path.js` and `../custom-ui-assets/lib/tts-assets-config.js` (config lookup: cwd, then `.tools/tts-cloud/`, then `~/.tts-assets/config.json`; `npm run tts-assets:configure` writes it)

Status:
- current

## Asset review inventory

Refresh the raw input for the asset review sheet with `node .tools/tts-save/export-join-assets.js --source "<full-save.json>" --output ".dev/build-logs/join-assets-latest.csv"`. This read-only export includes save and object URL fields, Global and per-object UI assets, nested objects, and alternate states. It joins the current Cloud job manifest and ledger, reports known sizes and conflicting sizes, and lists mirror paths only when the files exist locally. Embedded Lua, saved script state, and XML are excluded from the direct-download inventory. Batch and Decision columns are left blank for review.

Keep review decisions in the sheet's static area. When refreshing that area, match current URLs first and use a unique identical SHA-1 only for confirmed file-content matches. Preserve manual decisions, paths, labels, and notes together. Keep historical records explicitly marked when their URLs disappear from the current save. A new image with different contents needs review even when its filename resembles an older image.

## Between-session start save

Save the main game in Intermission with the latest scripts. FULL downloads the static **AA:BI** review area from **Integrated assets** in [the asset review sheet](https://docs.google.com/spreadsheets/d/1lldquR2mq6_a2F8yJ5ygwPylzHJ5MOVYTUJ7y-rG26U/edit). Keep that workbook shared as **Anyone with the link — Viewer** so the build can read it. Edit **Manual decision** in the static review area before building. No CSV download is needed.

Preflight downloads and validates the review before any save or Cloud work starts. The FULL wrapper gives that invocation its own temporary snapshot, reused by the final generation step and removed when the build exits. A download, access, or validation failure stops the build. The old `.dev/session-start-decisions.local.csv` is never read automatically. The report records the review source and fetch time.

As its last step, FULL regenerates `TS_Save_9001.json` in the configured Saves folder from the freshly built main save. The build replaces its own previous copy only after the new file is ready. It refuses to replace an unrelated save in slot 9001. The report is at `.dev/build-logs/session-start-report.json`.

Unfinished onboarding no longer prevents FULL from running its imports and asset tooling. Preflight reports that session-start preparation is skipped, and the final step writes a `status: "skipped"` report. The existing `TS_Save_9001.json` stays unchanged. The source's deferred objects and onboarding flags are preserved; this does not turn a partial save into a full one. A direct one-off session-start generation still rejects an incomplete source.

The stage floor is a black built-in `BlockSquare` with GUID `3d2aef` and nickname `STAGE_BOARD`. It has no CustomImage or download dependency. The repaired footprint uses position `(0, -200, 62.0977)`, rotation `(0, 0, 0)`, and scale `(1600, 1, 577.809692)`, retaining the calibrated half-extents `(800, 288.904846)`. The Dashboard generator uses the block's full size divided by two and rejects the obsolete Custom_Tile. Changing its footprint also changes the mapping; regenerate catalogs after saving a deliberate resize.

The current `SkyURL` is always retained automatically, regardless of the selected skybox or its review decision. The report records it as `retainedSkybox` and excludes that use from missing decisions. Other uses of the same image, including Custom UI Assets and object textures, still require review.

For a one-off preview or a different output file, run the generator directly. It also reads the live review by default. Use a new filename for a one-off save. An explicit `--decisions` file is available for deliberate offline inspection.

```powershell
npm run tts-save:session-start -- --dry-run
npm run tts-save:session-start -- --output "TS_Save_9002.json" --report "session-start-report.json"
npm run tts-save:session-start -- --decisions "Integrated assets.csv" --dry-run
```

The source defaults to the configured save. `--source` accepts a separate full save. Generation removes reviewed top-level Unity bundle objects from the session-start copy and preserves their GUIDs and data for staged restore. A `Prune` URL that moved, appears in another kind of field, or shares an object with an asset outside the prune list stops generation for review. The log gives the number of distinct bundle URLs, the number of objects removed, and the known download size separately.

`ForcePurge` clears the reviewed URL from direct save fields and removes its Global/object UI, music-library, decal, and custom-deck registrations. Host aliases for the same Steam UGC identity match. FULL applies these removals permanently to the main save after making a backup, and to the session-start copy; there is no staged restore for them. A one-off output changes only that output, and a dry run writes neither save. Embedded Lua/XML and script state remain under their own source tooling. The active skybox allowance still applies.

`Resolve` is an author-directed task described in **Author Resolution Instructions**, not a command for the build to interpret. Any remaining Resolve decision stops preflight until the task is completed and its decision is updated. `Purge` entries with current references require dependency cleanup; absent Purge URLs do not generate pending-review noise. Historical saves and old folder records do not veto removal of obsolete files or registrations. Distinguish the obsolete asset from its current replacement; an old path can share a URL with a retained asset. Preserve the current asset and its active registrations. `Investigate` and unreviewed assets remain reported separately.

Load the new slot in TTS. The host sees the onboarding bar in the center of the screen, and players get their assigned colors as they join. Once they are connected, click **1 Load Bundles**, then **2 Refresh HUD**, then **3 Seat Players**. Each button becomes available when the preceding work finishes. The bar disappears after seating and the final game update. An ordinary TTS save can resume at the next unfinished step. Finish onboarding before using **Save & Play**, which replaces the generated Global script that holds the deferred objects. Later connections seat normally with automatic full XML rebuilds deferred. The host can still use **Refresh XML** in Phase tools if needed.

### Removing completed review records

`RemoveFromSheet` requests agent cleanup of the static review area, and stops build preflight until that cleanup is completed. Verify against the latest **main-save** inventory, not only the minimized copy. If the obsolete asset is absent and cleanup is complete, remove its entire static record with all manual columns aligned. Leave raw input tabs and dynamic formulas intact. If it is still present, change its decision to `Purge` and alert the author. Old saves and old folder history are not blockers. The build reads the sheet; sheet edits are performed through the agent's authenticated connection. A purged asset returning after its review record is removed appears as unreviewed in a fresh inventory.

## Complications decks (Full build hook)

`npm run build:full` assembles the Standard and Enhanced Complications decks after cloud asset sync and consolidation. It rebuilds only variants with changed image/settings/URL fingerprints, defers pending uploads, and refuses to rebuild an active saved game or loose cards. Setup, exact filenames, save behavior, and verification: [`../complications/decks/README.md`](../complications/decks/README.md). Direct command: `npm run complications:decks -- --dry-run`.

## Daily save snapshot (build hook)

`npm run build` runs `tts-save:backup-daily` first. It copies the live save into `backupDir` (or `<savesDir>/tts-assets-backups/`) as `TS_Save_<id>_YYYY_MM_DD.json`, at most once per 24 hours (stamp file `.last-daily-backup` in that folder). Missing config/save soft-fails so codegen still runs. If `_a`/`_b` variants for that date already exist, the build hard-fails. First same-day collision renames the existing dated file to `_a` and writes the new copy as `_b`. Skip with `SKIP_SAVE_BACKUP=1` or `npm run tts-save:backup-daily -- --skip`; force with `npm run tts-save:backup-daily:force`. Retention is unbounded — prune the backup folder manually.

## Silence soundscape emitters (build hook)

`npm run build`, `build:xml`, and `build:full` run `tts-save:silence-emitters` right after the daily snapshot (`silence-soundscape-emitters.js`). It sets `CustomAssetbundle.LoopingEffectIndex` to `0` (the `silent` looping effect) on every `Custom_Assetbundle` whose GMNotes start with `SOUNDSCAPE_`, so a cold load does not restart whatever track an emitter was playing at save time at full volume before Lua can mute it. The save stores no emitter volume, so the clip index is the only lever. Writes only when an index changes, after the usual backup. Missing config/save soft-fails; a save with no emitters hard-fails. `npm run tts-save:silence-emitters -- --dry-run` reports without writing.

Limits: Save & Play reverts to the save TTS last loaded or wrote, not the disk file, so it benefits only after File → Load of the patched save. An in-game save while a track plays records that track again until the next build. Soundscape context: [`SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md`](../../.dev/Soundscape%20&%20Audio/SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md).

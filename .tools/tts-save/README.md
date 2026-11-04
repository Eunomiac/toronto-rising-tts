# TTS save tooling

Node scripts that read or patch the live save named in `tts-assets.config.json` (`savesDir` + `defaultSaveName`). Writes back up the save first (`backupBeforeWrite`, into `backupDir`).

## Agent Routing

Read this when:
- touching `.tools/tts-save/**` or the `tts-save:*` npm scripts

Source of truth:
- `resolve-save-path.js` and `../custom-ui-assets/lib/tts-assets-config.js` (config lookup: cwd, then `.tools/tts-cloud/`, then `~/.tts-assets/config.json`; `npm run tts-assets:configure` writes it)

Status:
- current

## Between-session start save

After FULL, save the source game in Intermission with the latest scripts. Download the **Integrated assets** tab as CSV. The command reads the static URL column beside **Manual decision**. Use a new TTS slot filename such as `TS_Save_9001.json`.

```powershell
npm run tts-save:session-start -- --decisions "Integrated assets.csv" --dry-run
npm run tts-save:session-start -- --decisions "Integrated assets.csv" --output "TS_Save_9001.json" --report "session-start-report.json"
```

The source defaults to the configured save. `--source` accepts a separate full save. The command writes only to new output paths. It defers reviewed top-level Unity bundle objects and preserves their GUIDs and data for restore. A `Prune` URL that moved, appears in another kind of field, or shares an object with an asset outside the prune list stops generation for review. `Purge`, `Investigate`, and URLs without a decision stay in the copy and are accounted for separately in the report.

Load the new slot in TTS and wait for the host table to finish starting. Players get their assigned colors as they join. Once they are connected, open **Phase tools**, click **1 Load Bundles**, then wait for the status to show **bundles ready to finish**. Click **2 Finish Join** to seat connected players and refresh the HUD. Play or advance the phase after that step finishes. A saved copy can resume at either stage.

## Complications decks (Full build hook)

`npm run build:full` assembles the Standard and Enhanced Complications decks after cloud asset sync and consolidation. It rebuilds only variants with changed image/settings/URL fingerprints, defers pending uploads, and refuses to rebuild an active saved game or loose cards. Setup, exact filenames, save behavior, and verification: [`../complications/decks/README.md`](../complications/decks/README.md). Direct command: `npm run complications:decks -- --dry-run`.

## Daily save snapshot (build hook)

`npm run build` runs `tts-save:backup-daily` first. It copies the live save into `backupDir` (or `<savesDir>/tts-assets-backups/`) as `TS_Save_<id>_YYYY_MM_DD.json`, at most once per 24 hours (stamp file `.last-daily-backup` in that folder). Missing config/save soft-fails so codegen still runs. If `_a`/`_b` variants for that date already exist, the build hard-fails. First same-day collision renames the existing dated file to `_a` and writes the new copy as `_b`. Skip with `SKIP_SAVE_BACKUP=1` or `npm run tts-save:backup-daily -- --skip`; force with `npm run tts-save:backup-daily:force`. Retention is unbounded — prune the backup folder manually.

## Silence soundscape emitters (build hook)

`npm run build`, `build:xml`, and `build:full` run `tts-save:silence-emitters` right after the daily snapshot (`silence-soundscape-emitters.js`). It sets `CustomAssetbundle.LoopingEffectIndex` to `0` (the `silent` looping effect) on every `Custom_Assetbundle` whose GMNotes start with `SOUNDSCAPE_`, so a cold load does not restart whatever track an emitter was playing at save time at full volume before Lua can mute it. The save stores no emitter volume, so the clip index is the only lever. Writes only when an index changes, after the usual backup. Missing config/save soft-fails; a save with no emitters hard-fails. `npm run tts-save:silence-emitters -- --dry-run` reports without writing.

Limits: Save & Play reverts to the save TTS last loaded or wrote, not the disk file, so it benefits only after File → Load of the patched save. An in-game save while a track plays records that track again until the next build. Soundscape context: [`SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md`](../../.dev/Soundscape%20&%20Audio/SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md).

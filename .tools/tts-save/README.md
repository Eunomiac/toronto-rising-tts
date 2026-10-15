# TTS save tooling

Node scripts that read or patch the live save named in `tts-assets.config.json` (`savesDir` + `defaultSaveName`). Writes back up the save first (`backupBeforeWrite`, into `backupDir`).

## Agent Routing

Read this when:
- touching `.tools/tts-save/**` or the `tts-save:*` npm scripts

Source of truth:
- `resolve-save-path.js` and `../custom-ui-assets/lib/tts-assets-config.js` (config lookup: cwd, then `.tools/tts-cloud/`, then `~/.tts-assets/config.json`; `npm run tts-assets:configure` writes it)

Status:
- current

## Daily save snapshot (build hook)

`npm run build` runs `tts-save:backup-daily` first. It copies the live save into `backupDir` (or `<savesDir>/tts-assets-backups/`) as `TS_Save_<id>_YYYY_MM_DD.json`, at most once per 24 hours (stamp file `.last-daily-backup` in that folder). Missing config/save soft-fails so codegen still runs. If `_a`/`_b` variants for that date already exist, the build hard-fails. First same-day collision renames the existing dated file to `_a` and writes the new copy as `_b`. Skip with `SKIP_SAVE_BACKUP=1` or `npm run tts-save:backup-daily -- --skip`; force with `npm run tts-save:backup-daily:force`. Retention is unbounded — prune the backup folder manually.

## Silence soundscape emitters (build hook)

`npm run build`, `build:xml`, and `build:full` run `tts-save:silence-emitters` right after the daily snapshot (`silence-soundscape-emitters.js`). It sets `CustomAssetbundle.LoopingEffectIndex` to `0` (the `silent` looping effect) on every `Custom_Assetbundle` whose GMNotes start with `SOUNDSCAPE_`, so a cold load does not restart whatever track an emitter was playing at save time at full volume before Lua can mute it. The save stores no emitter volume, so the clip index is the only lever. Writes only when an index changes, after the usual backup. Missing config/save soft-fails; a save with no emitters hard-fails. `npm run tts-save:silence-emitters -- --dry-run` reports without writing.

Limits: Save & Play reverts to the save TTS last loaded or wrote, not the disk file, so it benefits only after File → Load of the patched save. An in-game save while a track plays records that track again until the next build. Soundscape context: [`SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md`](../../.dev/Soundscape%20&%20Audio/SOUNDSCAPE_ASSETBUNDLE_AUDIO_INIT.md).

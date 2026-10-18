# Cloud Assets — Step by Step

Every image, sound, and model the mod loads by link lives in your Steam Cloud. The folder `assets/` in this repo is a copy of the Cloud folder **Vampire the Masquerade 5E**, one-to-one. **`assets/` is the source of truth:** you change files there, and the build copies your changes up to Cloud and rewrites every link in the save, the Lua, and the Storyteller Dashboard.

You never paste a Cloud link by hand.

## Before anything: Steam on, TTS closed

- Steam must be running and logged in.
- **Close Tabletop Simulator** before any build or `cloud:` command that changes Cloud. If TTS is open, the build skips the upload, warns you, and builds from what is already in Cloud. Run `npm run cloud:push` later with TTS closed to catch up.

## Everyday work

### Add or replace an asset

1. Put the file in the right folder under `assets/`, named the way that folder's job expects (for example, Page 5 project art must start with `project_`). The job list is `.tools/cloud-asset-sync.jsonc`; each job names its folder and filename pattern.
2. Close TTS and run **`npm run build:full`**.
3. Open TTS and load the save. The new art is in place.

Replacing a file (same name, new content) uploads the new version and deletes the old Cloud copy once nothing uses it.

### Remove an asset

1. Delete the file from `assets/`.
2. Close TTS and run **`npm run build:full`**.

The build removes the asset's rows from the save and the generated Lua, then deletes the Cloud copy. It keeps the Cloud copy and warns you if:

- **The current save still uses the link** (for example in its saved script). The next build tries again.
- **A save from another mod uses it.** The warning names that save. Old Toronto Rising saves are only listed, not protected.

### Move or rename an asset

- **Move to another folder, same name:** the link stays the same; Cloud just files it differently.
- **Rename:** the file uploads under the new name (a new link), and the old copy is deleted once nothing uses it.

### NPC art

`npm run build:full` draws the NPC figurine, token, and banner art from the roster, uploads it, and writes the links. Nothing extra to run.

## The build command

| Command | When |
| --- | --- |
| `npm run build:full` | After any asset change. Draws NPC art, uploads, gathers save-only Cloud art into `Save Only/`, and rebuilds every output. |
| `npm run build` | Code-only changes. Does not touch Cloud. |
| `npm run cloud-asset-sync:dry-run` | Preview what the asset step would do, without writing anything. |

After the upload step, Full build also runs **`cloud:consolidate --apply`**: any Cloud file the current save uses that no job owns (for example an image you uploaded in TTS onto a custom object) is moved into `Vampire the Masquerade 5E/Save Only/<kind>/` and downloaded into `assets/Save Only/`. Links do not change. If TTS is still open, that step is skipped with a warning — close TTS and run Full again (or `npm run cloud:consolidate -- --apply`).

### What the build warnings mean

- **SKIP job**: a job's filename pattern must have fixed text outside its brackets, such as `^token_(.*)\.webp$`, not `^(.*)\.webp$`. Fix the pattern; that job's outputs are left as they were until you do.
- **HOLD job**: a job has files that have not reached Cloud yet (TTS was open, for example). Its old rows are kept. Run `npm run cloud:push` with TTS closed, then build again.
- **STRAY**: a file sits in a job's folder but matches no job's pattern. Rename it to fit a job, or move it out.
- **DUPLICATE LOCAL**: the same file (same name and content) is in two folders. Cloud can hold it in only one. Keep one copy, delete the other.
- **KEPT**: a file you deleted is still used somewhere; see "Remove an asset" above.
- **NO PURGE**: a new job shares a target with another job that has not run yet, so nothing is cleaned from that target this time. It clears on the next build.

## Cloud commands

| Command | What it does |
| --- | --- |
| `npm run cloud:push` | Upload, move, and delete to match `assets/`. Add `-- --dry-run` to preview. The build runs this for you. |
| `npm run cloud:pull` | Download Cloud into `assets/`. Used on a new computer or after losing files. Never overwrites a local edit. Add `-- --restore-deleted` to bring back files you deleted locally but have not pushed yet. |
| `npm run cloud:backup` | Copy every Cloud file and the Cloud index into your backup folder. Run it before any clean-up below (they refuse to delete without a backup less than a week old). |
| `npm run cloud:restore-index -- "<file>"` | Put back a saved copy of the Cloud index (undoes moves and deletes in the index). |
| `npm run cloud:restore-files -- --backup <date folder> --folder "<Cloud folder>"` | Re-upload files from a backup. Restored files get **new links**; run `npm run build:full` afterwards. |

`assets/Save Only/` is a read-only copy pulled from Cloud. Push never uploads from it.

## Clean-up (occasional)

Run these in this order, with TTS closed. Each shows a report first; nothing is deleted or moved without the extra flag.

1. **`npm run cloud:backup`**: a fresh backup first.
2. **`npm run cloud:audit`**: a read-only overview: files and space per folder, what is in use, what a job owns.
3. **`npm run cloud:consolidate`**: lists art the save uses that no job owns and that sits outside `assets/` (Cloud top level, the old **Toronto Rising** folder). `-- --apply` gathers them into `Save Only/<kind>` (Objects, Decals, Object UI, Global UI). Links do not change. **Full build already runs this with `--apply`**; use the standalone command only when you want a preview or a one-off pass without a full rebuild.
4. **`npm run cloud:dedupe`**: finds duplicate files (same content, or same name in one folder). `-- --delete` removes the unused extras.
5. **`npm run cloud:strays`**: lists files nothing owns: files in `assets/` that match no job, and Cloud files not in `assets/`. After step 3, everything left in the old **Toronto Rising** folder shows here as safe to delete. `-- --delete` removes the unused ones.

For `-- --delete` / `-- --delete --yes` (and the same on `cloud:dedupe`), Steam must be on, TTS closed, and a backup less than a week old. Without `--yes` you type `DELETE` to confirm; with `--yes` the script deletes after printing the list (for an author-requested cleanup run).

If something goes wrong, `cloud:restore-index` with the snapshot printed by the command puts the index back.

## Where things live

| Path | What |
| --- | --- |
| `assets/` | Your copy of Cloud. Edit here. Not in git. |
| `assets/.cloud-ledger.json` | What has been synced. Do not edit. |
| `.tools/cloud-asset-sync.jsonc` | The job list: folder, filename pattern, and where each asset's link goes. |
| `lib/cloud_*.ttslua`, `lib/json/cloud-assets.json` | Generated link tables. Do not edit; rebuild instead. |
| `tts-assets.config.json` | Save file, saves folder, and backup folder paths. |

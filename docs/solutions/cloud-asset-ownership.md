# Cloud asset ownership (Toronto Rising TTS + Storyteller Dashboard)

## Agent Routing

Read this when:
- adding, renaming, or removing any image, AssetBundle, or other file TTS or the dashboard loads by URL
- touching `.tools/cloud-asset-sync.jsonc`, `.tools/cloud-asset-sync.js`, `.tools/tts-cloud/`, or a generated `lib/cloud_*.ttslua` module
- writing XmlUI `image="…"` names or Lua that sets an image attribute

Source of truth:
- local files in `assets/` (gitignored mirror of Steam Cloud `Vampire the Masquerade 5E/`)
- job config `.tools/cloud-asset-sync.jsonc`; engine reference `.tools/Cloud-Asset-Sync-Plan.md`

Verification:
- `npm run check:asset-ownership`, `npm run check:asset-references` (both run at the end of `npm run build:full`)
- `npm run cloud-asset-sync:test`

Status: current

## The contract

1. **`assets/` is the only source.** A file exists for TTS when it is in `assets/` and `npm run cloud-asset-sync` (or `build:full`) has pushed it. Removing it locally removes it from Cloud after its references are purged.
2. **Every link comes from a job.** Save rows, object images, Lua URL tables, and dashboard catalogs are written by a job from the Cloud link of a local file. Never paste a `steamusercontent` or GitHub raw link into code, XML, or data.
3. **One name, one owner.** A row name is produced by exactly one job. No repo copy, GitHub fallback, or second folder may shadow a job-owned name.
4. **File names carry their row name.** Job patterns need a literal prefix or suffix (`^toggle_(.*)\.webp$`), so stray files are never adopted. Jobs without one are skipped with a warning.
5. **Purging is automatic.** A job removes rows in its name family that no job owns any more. A row a job should keep must have its file in that job's folder.
6. **TTS closed for Cloud writes.** The push is skipped (with a warning) while TTS is open; never edit the Cloud index or save by hand while a sync runs.

## Adding art

1. Put the file in the job folder under the name the UI uses (`assets/HUD/Reference_Panels/refPanel_Threats.webp` → row `refPanel_Threats`).
2. No job reads that folder or prefix yet → add a job to `.tools/cloud-asset-sync.jsonc` (several jobs may read one folder).
3. Run `npm run build:full` with Steam on and TTS closed, then reload the save in TTS.

## Exceptions

`check:asset-ownership` allows hand-typed links only in its `EXTERNAL` list, each with a reason (for example the NPC light AssetBundle, hosted on a Workshop creator's Cloud). Add a reason when you add an entry.

## Author guide

Step-by-step commands and warning meanings: [`.dev/!! User Guides/Cloud Assets — Step by Step.md`](../../.dev/!!%20User%20Guides/Cloud%20Assets%20%E2%80%94%20Step%20by%20Step.md).

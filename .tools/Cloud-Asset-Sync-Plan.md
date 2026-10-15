# Cloud asset sync

`assets/` (gitignored) mirrors the Steam Cloud folder **Vampire the Masquerade 5E/** one-to-one and is the source of truth for every asset link the mod and the Storyteller Dashboard use. `npm run cloud-asset-sync` (part of `npm run build:full`) pushes `assets/` to Cloud, then rewrites every output from the resulting links. No link is typed by hand.

## Agent Routing

Read this when:
- adding, renaming, or removing an asset, or a job in `.tools/cloud-asset-sync.jsonc`
- touching `.tools/cloud-asset-sync.js`, `.tools/tts-cloud/**`, generated `lib/cloud_*.ttslua`, or `lib/json/cloud-assets.json`
- code needs an image/model/audio URL (never paste a `steamusercontent` link; add a job and read the generated module or manifest)

Source of truth:
- `assets/` + `assets/.cloud-ledger.json` (what was synced: relPath → Cloud key, URL, size)
- `.tools/cloud-asset-sync.jsonc` (jobs), `.tools/cloud-asset-sync.js` (engine), `.tools/tts-cloud/lib/push.js` (push plan, deletes)

Verification:
- `npm run cloud-asset-sync:test`, `npm run cloud-asset-sync:dry-run`, `npm run cloud:push -- --dry-run`

Author guide: [`.dev/!! User Guides/Cloud Assets — Step by Step.md`](../.dev/!!%20User%20Guides/Cloud%20Assets%20%E2%80%94%20Step%20by%20Step.md). Cloud tooling: [`tts-cloud/README.md`](tts-cloud/README.md).

Status:
- current

## Run order

1. **Push** (`push.js`): uploads new/changed files, index-moves relocated ones (same name and content in another folder keeps the URL), plans deletes for files removed locally. Skipped with a warning while TTS is open (TTS keeps its own index copy). Ignores `assets/Save Only/` (read-only pull of save-authored art) and `assets/images/` (old repo art, untracked; safe to delete).
2. **Jobs**: each job scans its folder (non-recursive unless `recurIntoSubfolders`), maps file names through its pattern, and reads URLs from the ledger.
3. **Save write** (global/object Custom UI rows, object image fields), after `backupSaveBeforeWrite`.
4. **Lua modules** and the **manifest** `lib/json/cloud-assets.json` (`jobs[id].rows[{path, name, sha1, url, size}]`, every job).
5. **Deletes**: Cloud copies of removed files go only when the current save (including its embedded Lua), repo code, and other mods' saves no longer use them. Otherwise **KEPT** with a warning naming what still uses it; the ledger keeps the entry so a later build retries. Older Toronto Rising saves are listed, not protected.

## Job fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Unique id; manifest key. |
| `folder` | yes | Path under `assets/` (= under the Cloud root). |
| `output` | yes | `GlobalCustomUIAssets`, `ObjectCustomUIAssets`, `ObjectImage`, `LuaModule`, or `Manifest`. |
| `filenameToNameSearchPattern` | yes | `^…$` regexp on the file name. Must contain a literal outside its capture groups beyond the extension (`^token_(.*)\.webp$`, not `^(.*)\.webp$`); otherwise the job is **skipped** with a warning and its outputs are left alone. |
| `filenameToNameReplacePattern` | yes | Asset name (`siteCard_$1`). Its literal prefix is the job's purge family. |
| `recurIntoSubfolders` | no | Include subfolders. |
| `targets` | ObjectCustomUIAssets | Target group name, GUID, or a list mixing both. |
| `ownsAllRows` | no (ObjectCustomUIAssets) | Purge every row on the target that no job wrote. |
| `purgePatterns` | no (save-row jobs) | Extra regexps of names this job owns. `[]` is rejected. |
| `field` + `objects` | ObjectImage | Dotted save field (`CustomImage.ImageURL`) and `{ assetName: GUID \| list \| group }`. |
| `module` | LuaModule | `lib/cloud_<name>.ttslua`, returning `{ [name] = { filename, URL } }`. |

`targetGroups` (top of the config) names reusable GUID lists, such as `csheetPage1` and `pcSeatFigurines`.

## Ownership and purge

- A save-row job purges, on each target: names in its family, names it wrote last run, and `purgePatterns` matches. With `ownsAllRows`, every name no job writes.
- Names any job writes on the same target are never purged by another job.
- **HOLD**: a job with files not yet in the ledger (push skipped) keeps its previous manifest rows and counts them as owned.
- **NO PURGE**: while a held job on a target has never run, nothing is purged on that target.
- **DUPLICATE LOCAL**: one Cloud key (SHA1 + name) can live in one folder only. A second identical file gets no ledger entry and holds its job forever; shared art needs one home folder (for example `CSheets/Shared`).
- **STRAY**: a file in a job folder that matches no job's pattern.
- Fallback sources never override job-owned names.

## Consumers

| Output | Read by |
| --- | --- |
| `lib/cloud_memoriam_panels.ttslua` | `lib/constants.ttslua` (`C.MemoriamSkyboxes[*].panelA–D.url`) |
| `lib/cloud_dice.ttslua` | `core/st_dice.ttslua` (`DIE_ART`) |
| `lib/cloud_companion_toggle.ttslua` | `lib/companion_toggle.ttslua` |
| `lib/cloud_blood_potency.ttslua` | `lib/blood_potency_constants.ttslua` (thin; safe for CSHEET object scripts) |
| `lib/json/cloud-assets.json` | `npm run npc-art:urls` → `lib/npc_art_urls.ttslua`; dashboard |
| Save rows / object images | TTS directly (sheet pages, dice in bags, PC seat figurines, HUD) |

Object scripts may only `require` thin generated modules (`lib.cloud_*`), never `lib.constants` or `core.*`.

## Dashboard

The dashboard server serves art straight from `assets/`: `/sheet-art/<name>` (sheet folders), `/api/sheet-portraits`, `/figurine-images/` (NPC art). No copies under the dashboard tree.

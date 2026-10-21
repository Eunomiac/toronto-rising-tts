# TTS Steam Cloud tooling

Node helpers that read and write Tabletop Simulator's Steam Cloud (app 286160) and its Cloud Manager
index (`CloudInfo.bson`). The local `assets/` folder mirrors the Cloud root
(`cloudRoot` in `tts-assets.config.json`, "Vampire the Masquerade 5E") and is the source of truth.

## Agent Routing

Read this when:
- touching `.tools/tts-cloud/**`, `.tools/cloud-asset-sync.js`, or the `cloud:*` npm scripts

Source of truth:
- `lib/cloud_config.js` (paths from `tts-assets.config.json`), `lib/steam_session.js` (koffi → `steam_api64.dll`),
  `lib/cloud_index.js` (index read / verified edit / snapshots), `lib/cloud_ops.js` (upload, move, delete),
  `lib/assets_tree.js` (local scan + ledger), `lib/push.js` (push plan, deletes, Save Only), `lib/in_use.js` (save / repo links)

Verification:
- `npm run cloud:push -- --dry-run` (no writes), `npm run cloud-asset-sync:test`

Status:
- current

## Setup

Steam must be running and logged into the account that owns the uploads.

```powershell
cd .tools/tts-cloud
npm install
```

## Commands (repo root)

| Command | What it does |
| --- | --- |
| `npm run cloud:pull` | Mirror Cloud into `assets/` (one-time setup or recovery). Never overwrites local edits; `--restore-deleted` brings back files you deleted locally. |
| `npm run cloud:push` | Upload new or changed files, move relocated ones (link kept), delete Cloud copies of files you removed. `--dry-run` previews. |
| `npm run cloud:backup` | Copy every Cloud file plus the index into `backupDir/Cloud Backup/`. |
| `npm run cloud:restore-index -- <file>` | Put back an index snapshot from `backupDir/Cloud Index/`. |
| `npm run cloud:restore-files -- --backup <stamp> --folder <Cloud folder>` | Re-upload files from a backup (new links). |
| `npm run cloud-asset-sync` | The build step: push, then rebuild save rows, object images, Lua modules, and `lib/json/cloud-assets.json`. |
| `npm run cloud:consolidate -- --apply` | Move save-used Cloud orphans into `Save Only/<kind>/` and download them into `assets/Save Only/`. Full build runs this after sync. |

## Safety rules

- Writes are refused while Tabletop Simulator is open (TTS keeps its own copy of the index). The build skips the push and warns instead.
- Every index write snapshots first, re-reads, and checks that no untouched entry changed; on a mismatch it restores the snapshot and stops.
- `assets/.cloud-ledger.json` records what was synced. Only ledger files are deleted from Cloud, and only when the current save, repo code, and saves of other mods no longer use them.
- `assets/Save Only/` is a read-only copy of art authored in the save.
- `assets/Protected Cloud Files/` is a read-only inspection mirror of retired files that a build wanted to delete but retained because a save or repository file still references them. Its `index.json` records the original Cloud path and every protecting reference.
- `npm run cloud:protected-usage` traces every URL from that index through the current save and writes `usage-report.md` plus full JSON evidence beside it. The report identifies Global or object Custom UI, decals, image fields, serialized script state, containing object names/GUIDs, and exact JSON paths.
- Push ignores both read-only mirrors. It also ignores `assets/images/`, the old repo art folder (no longer tracked or read; safe to delete).

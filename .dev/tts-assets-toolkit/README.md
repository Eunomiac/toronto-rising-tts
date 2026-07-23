# TTS Assets Toolkit

## Agent Routing

Read this when:
- preparing the public release of Steam Cloud → CustomUIAssets tooling
- explaining the standalone script set (export / purge / add) outside Toronto Rising

Source of truth (today):
- `.tools/tts-cloud/` — Steam Cloud Manager → Name/URL CSV
- `.tools/custom-ui-assets/` — save editors (purge / add / configure / clear cache)
- Root `package.json` scripts: `tts-cloud:*`, `custom-ui-assets:purge`, `custom-ui-assets:add-csv`, `tts-assets:configure`
- Cursor/VS Code tasks in `.vscode/tasks.json` (`[Assets 1]` … `[Assets 3]`)

Status: **scaffold** — this folder is the intended future workspace root for a separate public package. Scripts still live in the Toronto Rising monorepo; they will be copied or extracted here before release. Toronto Rising–specific NPC/CSHEET pipelines are **out of scope** for v1.

---

Node helpers for Tabletop Simulator modders who keep UI images in **Steam Cloud Manager** and want those URLs on a save’s **CustomUIAssets** (global HUD assets and/or per-object assets).

Typical loop:

1. Upload or update images in TTS Cloud Manager.
2. **Export** a cloud subfolder to a `Name,URL` CSV.
3. **Purge** stale CustomUIAssets names from the save (optional).
4. **Add** CSV rows into the save with a Name transform (`file.webp` → `siteCard_file`, etc.).
5. Reload the save in TTS (clear the image cache if the client still shows old art).

## What v1 includes

| Tool | Purpose |
| --- | --- |
| Cloud export | Read Steam `CloudInfo.bson` for a Cloud Manager folder → CSV |
| Configure | Interactive `tts-assets.config.json` (Saves dir, default save, cloud root, backups) |
| Purge by pattern | Delete CustomUIAssets whose `Name` matches a regexp |
| Add from CSV | Merge Name/URL rows into CustomUIAssets (create object arrays if missing) |
| Clear image cache | Wipe local TTS image cache so refreshed URLs reload |

## What v1 does not include

- Toronto Rising NPC token / figurine / group upload pipelines
- Manifest generators tied to chronicle Lua/constants
- The full Toronto Rising build pipeline or Storyteller dashboard

Those remain private to the Toronto Rising repo.

## Requirements

- **Node.js** (LTS fine)
- **Steam** running and logged into the account that owns the Cloud uploads (export only)
- A writable TTS **Saves** directory (`Documents/My Games/Tabletop Simulator/Saves` on Windows)

Cloud export uses native Steamworks bindings (`steamworks.js` + helpers). Install deps under the cloud package folder once:

```powershell
cd .tools/tts-cloud
npm install
```

(From this monorepo root you can also use the npm scripts below.)

## One-time config

Save editors look for `tts-assets.config.json` (cwd, then `.tools/tts-cloud/`, then `~/.tts-assets/config.json`). On first use they offer interactive setup, or run:

```powershell
npm run tts-assets:configure
```

Example shape (`tts-assets.config.example.json`):

```json
{
  "savesDir": "C:/Users/YOU/Documents/My Games/Tabletop Simulator/Saves",
  "defaultSaveName": "230",
  "cloudRoot": "My Mod Cloud Folder",
  "backupBeforeWrite": true,
  "backupDir": null
}
```

Set cloud export root in `.tools/tts-cloud/config.js` (`CLOUD_ROOT`) to your Cloud Manager top-level folder name. CLI subfolders are joined under that root (`Sites` → `My Mod Cloud Folder/Sites`).

Before any save **write**, a timestamped backup goes to `<Saves>/tts-assets-backups/` (disable with `--no-backup` or `"backupBeforeWrite": false`).

## Scripts

Paths below are the **current monorepo** locations. After the public package lands, the same commands will run from this toolkit root with a local `package.json`.

### 1. Export Cloud Manager folder → CSV

Columns: `Name` (filename including extension), `URL`.

```powershell
# from Toronto Rising repo root
npm run tts-cloud:export -- Sites
npm run tts-cloud:export -- Sites --out "Site Cards"
# → .tools/tts-cloud/out/Site Cards.csv

npm run tts-cloud:export -- Sites --name-filter "\.webp$"
npm run tts-cloud:export -- --list-folders
```

| Flag | Meaning |
| --- | --- |
| `--out` | Output path or basename (auto `.csv` under `.tools/tts-cloud/out/`) |
| `--name-filter` / `--whitelist` / `-f` | Regexp whitelist on cloud file **Name** |
| `--list-folders` | List folders under `CLOUD_ROOT` (no export) |

Smoke / connectivity: `npm run tts-cloud:smoke`

### 2. Purge CustomUIAssets by Name regexp

```powershell
npm run custom-ui-assets:purge -- --pattern "^siteCard_" --dry-run
npm run custom-ui-assets:purge -- --pattern "^siteCard_"
npm run custom-ui-assets:purge -- --pattern "^bp_" --guids 0bdb4a,2cb469 --dry-run
```

Pattern forms: bare `^siteCard_` or slash `/^siteCard_/i`.

| Flag | Meaning |
| --- | --- |
| `--pattern` | Regexp tested against each asset `Name` |
| `--guids` | Object mode: only these object GUIDs (never touches global) |
| `--saveName` / `--save` | Save number/name or full path |
| `--dry-run` | List matches only |
| `--yes` | Skip Y/N (automation only) |

### 3. Add CSV rows into CustomUIAssets

Reads `Name,URL` CSV (usually from export), transforms each CSV **Name** into the Custom UI asset name via regexp replace, then merges. Duplicates (same asset Name already present) are listed; one **Y/N** confirms the whole plan.

```powershell
npm run custom-ui-assets:add-csv -- `
  --csv .tools/tts-cloud/out/Sites.csv `
  --name-match '^(.*)\.webp$' `
  --name-replace 'siteCard_$1' `
  --dry-run
```

Object mode:

```powershell
npm run custom-ui-assets:add-csv -- `
  --csv path\to\assets.csv `
  --name-match '^(.*)\.webp$' `
  --name-replace '$1' `
  --guids 0bdb4a,2cb469 `
  --dry-run
```

PowerShell: use **single quotes** around `--name-replace` so `$1` is not expanded.

Each written entry is `{ Type: 0, Name, URL }`. Object mode creates `CustomUIAssets: []` when missing. Missing GUIDs fail **before** mutation.

### 4. Clear TTS image cache

```powershell
node .tools/custom-ui-assets/clear-tts-image-cache.js
```

Use after URL changes when TTS still shows cached art.

## Global vs object mode

- **Global** (default): edits the save-root `CustomUIAssets` array (HUD overlays, site cards, etc.).
- **Object** (`--guids a,b,c`): walks the save for those GUIDs only and edits each object’s `CustomUIAssets`. Global is never touched.

Prefer **`--dry-run`** first. Write mode still asks **Y/N** in the terminal unless `--yes`.

## Cursor / VS Code Run Tasks (monorepo)

While developing inside Toronto Rising:

| Task | Role |
| --- | --- |
| **[Assets 1] Fetch URLs from Cloud** | Export adapter |
| **[Assets 2] Purge Assets from Save** | Purge adapter |
| **[Assets 3] Add Cloud Assets to Save** | Add-from-CSV adapter |
| **Clear TTS Image Cache** | Cache wipe |

Prompt order for purge/add: pattern or CSV fields → save name → **write mode** (dry-run / write) → **target** (Global / Specific object GUIDs) → GUID list (keep `-` for Global; do not submit a blank field — empty `promptString` cancels the whole task).

Public release may ship a slim `tasks.json` with the same Asset tasks only.

## Example: refresh global site cards

1. Upload images under Cloud Manager: `<CLOUD_ROOT>/Sites`.
2. Export: `npm run tts-cloud:export -- Sites`
3. Purge: `npm run custom-ui-assets:purge -- --pattern "^siteCard_" --dry-run` then write
4. Add: CSV + `--name-match '^(.*)\.webp$'` → `--name-replace 'siteCard_$1'`
5. Reload the save in TTS; clear image cache if needed

## Deeper docs (monorepo)

- [`.tools/tts-cloud/README.md`](../../.tools/tts-cloud/README.md)
- [`.tools/custom-ui-assets/README-save-editors.md`](../../.tools/custom-ui-assets/README-save-editors.md)

## Packaging notes (for maintainers)

Intended public tree (not yet extracted):

```text
tts-assets-toolkit/          ← this folder becomes the repo root
  README.md                  ← this file
  package.json               ← scripts + deps (to be added)
  config / example config
  cloud/                     ← from .tools/tts-cloud
  save-editors/              ← purge, add-csv, configure, clear-cache, shared libs
  .vscode/tasks.json         ← optional Asset tasks only
```

Keep v1 dependency surface small: Steam cloud read + JSON save mutate + backups + dry-run. Do not drag Toronto Rising NPC or build tooling into the public package.

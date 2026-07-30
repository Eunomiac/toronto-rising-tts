# Custom UI assets — save editors

Scripts that edit **CustomUIAssets** on a TTS save (`TS_Save_*.json`):

- **Global mode** (default): save-root `CustomUIAssets` (HUD overlays, site/district cards, …)
- **Object mode** (`--guids`): only the listed objects’ `CustomUIAssets` — never touches global

## VS Code / Cursor tasks

**Terminal → Run Task…** (or Command Palette → “Tasks: Run Task”):

| Task | Prompts |
| --- | --- |
| **[Assets 1] Fetch URLs from Cloud** | Subfolder, optional out path, optional Name whitelist regexp |
| **[Assets 2] Purge Assets from Save** | Pattern, save name, optional GUIDs, dry-run vs write |
| **[Assets 3] Add Cloud Assets to Save** | CSV path, name-match, name-replace, save name, optional GUIDs, dry-run vs write |
| **Clear TTS Image Cache** | (none) |
| **BUILD PIPELINE** | Full `npm run build` (includes skyboxes Sheet import, UI/PCS generate, stubs, …) |

Leave **GUIDs** blank for global mode. Prefer **Dry run** first; write mode still asks **Y/N** in the terminal.

## Config + backups

Purge/add look for `tts-assets.config.json` (cwd, then `.tools/tts-cloud/`, then `~/.tts-assets/config.json`).
If missing, they walk you through setup (or run `npm run tts-assets:configure`).

Example: `tts-assets.config.example.json`.

Before any save write, a timestamped copy is written to `<Saves>/tts-assets-backups/` (override with `backupDir`, disable with `--no-backup` or `"backupBeforeWrite": false`).

NPC world apply after a new upload batch (not a Run Task): `npm run custom-ui-assets:apply-npc-hosted-world`.

## Purge by Name regexp

Lists matching assets (per target), asks **Y/N** before write, then deletes.

```powershell
# dry-run first
npm run custom-ui-assets:purge -- --pattern "^siteCard_" --dry-run

# interactive confirm (global)
npm run custom-ui-assets:purge -- --pattern "^siteCard_"

# object mode (CSHEET / etc.)
npm run custom-ui-assets:purge -- --pattern "^bp_" --guids 0bdb4a,2cb469,07ead9 --dry-run
```

Pattern forms: bare `^siteCard_` or slash `/^siteCard_/i`.

Options: `--guids <csv>`, `--saveName 230`, `--save <path>`, `--dry-run`, `--yes` (skip confirm; automation only).

## Probe URL Content-Type / size

After `lua DEBUG.dumpCustomAssetsToFile()` (or against a save):

```powershell
npm run custom-ui-assets:probe-urls
npm run custom-ui-assets:probe-urls -- --dump .dev/.debug/debug_logs/custom_ui_assets.json --out .dev/.debug/custom_ui_assets_probe.csv
npm run custom-ui-assets:probe-urls -- --saveName 230 --jsonOut .dev/.debug/custom_ui_assets_probe.json
```

HEAD/Range-GET each URL; prints a size-sorted summary plus optional CSV/JSON.

## Add from Name/URL CSV

Reads a CSV with `Name,URL` columns (e.g. from `npm run tts-cloud:export`), transforms
each file Name into a Custom UI asset Name via regexp replace, then merges.

Duplicates (same asset Name already present) are listed; one **Y/N** confirms the whole
write plan (new + overwrites across all targets).

```powershell
# Site cards (global)
npm run tts-cloud:export -- Sites

npm run custom-ui-assets:add-csv -- `
  --csv .tools/tts-cloud/out/Sites.csv `
  --name-match '^(.*)\.webp$' `
  --name-replace 'siteCard_$1' `
  --dry-run

# Same CSV onto several objects
npm run custom-ui-assets:add-csv -- `
  --csv path\to\assets.csv `
  --name-match '^(.*)\.webp$' `
  --name-replace '$1' `
  --guids 0bdb4a,2cb469,07ead9 `
  --dry-run
```

PowerShell CLI: use **single quotes** around `--name-replace` so `$1` is not expanded. VS Code tasks use `cmd.exe` and pass `$1` literally.

Each written entry is `{ Type: 0, Name, URL }`. Object mode creates `CustomUIAssets: []` when missing. Any missing GUID fails **before** mutation.

## Typical site-card refresh (global)

1. Upload/update images in TTS Cloud Manager under `Vampire the Masquerade 5E/Sites`.
2. Run task **[Assets 1] Fetch URLs from Cloud** (or `npm run tts-cloud:export -- Sites`)
3. Run task **[Assets 2] Purge Assets from Save** with `^siteCard_` (dry-run, then write)
4. Run task **[Assets 3] Add Cloud Assets to Save** with the Sites CSV + `^(.*)\.webp$` → `siteCard_$1`
5. Reload the save in TTS

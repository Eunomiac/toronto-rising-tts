# TTS Steam Cloud tooling

Isolated Node helpers that read Tabletop Simulator Cloud Manager indexes via Steamworks
(`CloudInfo.bson` → Name/URL CSV by folder).

## Setup

Steam must be running and logged into the account that owns the Cloud uploads.

```powershell
cd .tools/tts-cloud
npm install
```

## Config

Edit **`config.js`**:

```js
CLOUD_ROOT: "Vampire the Masquerade 5E"
```

CLI subfolders are joined under that root (`Sites` → `Vampire the Masquerade 5E/Sites`).

## Export a subfolder to CSV

Columns: `Name` (full filename including extension), `URL`.

```powershell
# from repo root
npm run tts-cloud:export -- Sites
npm run tts-cloud:export -- Sites --out "Site Cards"
# → .tools/tts-cloud/out/Site Cards.csv
npm run tts-cloud:export -- Sites --name-filter "\.webp$"
npm run tts-cloud:export -- --list-folders
```

`--name-filter` / `--whitelist` / `-f` is an optional regexp whitelist on the cloud file **Name** (filename). Omit or leave blank to include every file in the folder.

Default output: `.tools/tts-cloud/out/<Subfolder>.csv`

Run Task: **[Assets 1] Fetch URLs from Cloud**.

## Smoke check

Same as exporting `Sites` (connectivity + folder listing):

```powershell
npm run tts-cloud:smoke
```

## Next: merge into save CustomUIAssets

After export, Run Task **[Assets 2]** / **[Assets 3]** (or CLI):

- Purge: `npm run custom-ui-assets:purge -- --pattern "^siteCard_"`
- Add CSV: `npm run custom-ui-assets:add-csv -- --csv .tools/tts-cloud/out/Sites.csv --name-match '^(.*)\.webp$' --name-replace 'siteCard_$1'`
- Object mode: add `--guids <guid,guid,…>` (never touches global)

See [`.tools/custom-ui-assets/README-save-editors.md`](../custom-ui-assets/README-save-editors.md).

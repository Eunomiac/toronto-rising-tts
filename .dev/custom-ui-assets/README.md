# Custom UI assets (TTS upload / merge)

Generated outputs in this folder (`manifest.json`, `manifest.lua`, `generated-assets.json`) are produced by scripts under `.tools/custom-ui-assets/`.

## VS Code / Cursor task

**Tasks: Run Task** → **Custom UI Assets: Build Manifest from Image Files** runs `.tools/custom-ui-assets/build-manifest-from-task.js`. You are prompted for **mode** (`folder` or `sites`), then for a **folder path** (used only in `folder` mode; in `sites` mode you can accept the default). The task panel prints step banners and what to do next in TTS (Save & Play, spawn batch, merge task, clear tokens). For batched or `--skipMissing` site manifests, use the `npm` / `node` commands below instead of the task’s default `sites` run.

## Site cards from `C.Sites` (recommended for Toronto Rising sites)

Each row in `lib/constants.ttslua` → `C.Sites` should define:

- **`image`** — Custom UI asset name after upload (e.g. `siteCard_StRegisGrandSalon`). Spawned upload tokens use this as the object name; merge matches it to Steam URLs in the save file. If omitted, the manifest builder derives `siteCard_<C.Sites table key>`.
- **`localImage`** — `file:///.../YourFile.webp` or an absolute OS path to the WEBP on disk. If you already use a `file:` URL, the manifest copies that string **verbatim** (TTS expects literal spaces and `&`, not `%20` / encoded segments). Bare paths are emitted as `file:///` plus forward slashes only, with the same no-encoding rule.

By default the builder **validates every** `localImage` path and **aborts** if any file is missing (no silent partial data). Use **`--skipMissing`** only for intentional partial manifests.

### Batched manifests (many sites)

Uploading ~168 tokens at once is heavy. The builder can emit a **slice** of sites sorted alphabetically by **C.Sites table key** (e.g. `CLGrounds`, `ROMC5Lounge`):

- **`--batch`** — use the default batch size of **40** (unless `--batchMax` is also set).
- **`--batchMax N`** — cap this manifest at `N` sites after the start key (`0` = all sites in one manifest, default for `npm run custom-ui-assets:manifest-sites`).
- **`--batchStart <SiteKey>`** — first key to include (inclusive), using `localeCompare` order on the table keys. If `--batchMax` is positive, more sites exist than fit in one file, and you omit `--batchStart`, an **interactive terminal** prompts for the key; non-TTY runs must pass `--batchStart` explicitly.

```text
npm run custom-ui-assets:manifest-sites:batch
```

```text
node .tools/custom-ui-assets/build-upload-manifest-from-sites-constants.js --batchMax 40 --batchStart ROMC5Lounge
```

The script prints a suggested **`--batchStart`** for the next run when the slice does not reach the last key. Run **Save & Play**, spawn upload, merge, clear tokens, then regenerate the next batch.

**Manifest only** (writes `manifest.json`, `manifest.lua`, and `lib/custom_ui_upload_manifest.ttslua`):

```text
npm run custom-ui-assets:manifest-sites
```

Optional flags (forward to the builder):

```text
node .tools/custom-ui-assets/build-upload-manifest-from-sites-constants.js --constants lib/constants.ttslua --skipMissing
```

Use **`--skipMissing`** when some machines lack the image files: those sites are omitted from the manifest with warnings instead of failing the run.

**Full pipeline** (manifest → pause for manual TTS upload → merge URLs into your save’s `CustomUIAssets`):

```text
npm run custom-ui-assets:pipeline -- --mode sites-from-constants --saveName <saveId>
```

Optional: `--constants <path>`, `--skipMissing`, and batch flags (`--batch`, `--batchMax`, `--batchStart`) are forwarded the same way as the manifest script.

After the manifest step, use **Save & Play**, then in the TTS console: `lua DEBUG.spawnCustomUiUploadBatch()`. Spawned upload tokens are **locked** to avoid physics scatter. For large batches you may prefer:

```text
lua DEBUG.spawnCustomUiUploadBatchFromManifest(customUiUploadManifest, { columns = 12, gap = 2, startY = 3 })
```

Then Cloud Manager → **Upload All Loaded Files**, save the game, press Enter in the terminal to run merge, and finally `lua DEBUG.clearCustomUiUploadTokens()`.

## Folder mode (legacy)

Scans a directory of images (PNG→WEBP conversion, then manifest from filenames):

```text
npm run custom-ui-assets:pipeline -- --mode directory --input <relativeFolder> --saveName <saveId>
```

`--mode directory` is the default when `--mode` is omitted.

## Direct script usage

See `--help`-style comments at the top of:

- `.tools/custom-ui-assets/build-upload-manifest.js`
- `.tools/custom-ui-assets/build-upload-manifest-from-sites-constants.js`
- `.tools/custom-ui-assets/run-custom-ui-assets-pipeline.js`
- `.tools/custom-ui-assets/merge-custom-ui-assets.js`

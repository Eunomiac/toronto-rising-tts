# Custom UI assets (TTS upload / merge)

Generated outputs in this folder (`manifest.json`, `manifest.lua`, `generated-assets.json`) are produced by scripts under `.tools/custom-ui-assets/`.

## Save inventory (prune planning)

### Custom UI assets (`CustomUIAssets`)

These are **hosted image URLs** for HUD XML (`image="assetName"`). They are **not** 3D table objects, but TTS still loads them during the **Loading** progress — typically **579** entries in `TS_Save_230.json`.

To list every `CustomUIAssets` / `CustomAssets` entry (Name, URL, category, reference sources, prune hints):

```text
npm run tts-save:extract-assets
```

Or point at any save file:

```text
node .tools/tts-save/extract-categorize-save-assets.js --save .dev/TS_Save_230.json --outBasename save-assets-latest
```

Writes JSON, CSV, and Markdown under `.dev/build-logs/`. Cross-checks repo `ui/*.xml`, `lib/constants.ttslua` (`image = "…"`), and manifest files. **`candidate_prune`** means no reference was detected — verify before removing. Site cards often show **`dynamic_only`** (used at runtime via `C.Sites`, not static HUD XML).

After editing names to remove, use **Custom UI Assets: Prune** (`prune-custom-ui-assets-from-save-name.js`) with `.dev/custom-ui-assets/prune-custom-ui-assets.txt` (one `Name` per line).

### World entities (`ObjectStates`)

The **1000+** loading count is mostly **`CustomUIAssets` + every node in `ObjectStates`** (including cards inside bags via `ContainedObjects`). Workshop objects, dice, figurines, soundscape AssetBundles, and character sheets all live there — **not** in `CustomAssets`.

```text
npm run tts-save:extract-entities
```

Writes `.dev/build-logs/save-entities-latest.{json,csv,md}` with per-object GUID, name, category, lock state, AssetBundle URL, **`gGuidsKey` / `gGuidsKeys`** (from `lib/guids.ttslua` `G.GUIDS` when the GUID matches), **`gmNotes`** (full in JSON; newlines flattened to ` | ` in CSV for Sheets), and a loading breakdown. Both inventories: `npm run tts-save:extract-save-inventory`.

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

**Committed stubs:** `lib/custom_ui_upload_manifest.ttslua`, `lib/npc_token_upload_manifest.ttslua`, `lib/npc_group_upload_manifest.ttslua`, and `lib/npc_token_hosted_urls.ttslua` are always present in git (empty data). Global `require()` at load must not fail on a fresh clone; manifest scripts **overwrite** these files when you generate assets.

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

## NPC unified groups (figurine + control-board tokens)

**Preferred** workflow for NPC images. Place all four WEBPs per character in:

**`assets/images/NPCs/`**

| File | Custom UI asset `Name` after upload |
| --- | --- |
| `<characterKey>.webp` | `<characterKey>` (figurine front) |
| `<characterKey>Back.webp` | `<characterKey>Back` (figurine back) |
| `tokenFront_<characterKey>.webp` | `tokenFront_<characterKey>` (board token front) |
| `tokenBack_<characterKey>.webp` | `tokenBack_<characterKey>` (board token back) |

The scanner **requires complete 4-file groups**; any orphan or missing file aborts with an error.

**Build manifest** (skips groups already hosted in save `CustomUIAssets`; writes `.dev/custom-ui-assets/npc-group-manifest.json` and `lib/npc_group_upload_manifest.ttslua`):

```text
npm run custom-ui-assets:manifest-npc-groups
```

Batched upload (default **15 characters** = 60 upload temps per manifest):

```text
npm run custom-ui-assets:manifest-npc-groups:batch -- --batchStart adrianVarga
```

Flags: `--dir <path>`, `--save` / `--saveName`, `--skipSaveCheck`, `--warnUnknownKeys`, `--batch`, `--batchMax`, `--batchStart`.

**Full pipeline** (manifest → pause for TTS upload → merge → extract token pairs → registry gap report):

```text
npm run custom-ui-assets:pipeline-npc-groups
```

Or with batch flags forwarded:

```text
npm run custom-ui-assets:pipeline -- --mode npc-groups --saveName 230 --batch
```

**TTS — Cloud upload:** Save & Play → `lua DEBUG.spawnNpcGroupUploadBatch({ columns = 12, gap = 2, startY = 3 })` → Cloud Manager **Upload All Loaded Files** → save game.

**Merge / extract / report:**

```text
npm run custom-ui-assets:merge-npc-groups
npm run custom-ui-assets:extract-npc-token-urls
npm run custom-ui-assets:report-npc-registry-gaps
```

After extract: Save & Play → `lua DEBUG.applyNpcControlTokenHostedImages()` (or re-run `spawnNpcControlBoardTokens`).

**Registry gap report:** lists character keys uploaded in the manifest but missing from `D.characters` in `lib/npcs_data.ttslua`, with figurine front/back hosted URLs for copy-paste. Written to `.dev/custom-ui-assets/npc-registry-gap-report.txt`.

VS Code task **Custom UI Assets: Build Manifest from Image Files** → mode **`npc-groups`**.

## NPC gameboard tokens (`tokenFront_*` / `tokenBack_*`) — legacy split folder

**Legacy:** token-only manifest from split folder. Prefer **NPC unified groups** above (`assets/images/NPCs/`).

For **TOR-169** control-board tokens only, paired WEBPs may still live in:

**`assets/images/NPC Tokens/`**

| File | Custom UI asset name after upload |
| --- | --- |
| `tokenFront_<characterKey>.webp` | `tokenFront_<characterKey>` (face-up / STANDARD) |
| `tokenBack_<characterKey>.webp` | `tokenBack_<characterKey>` (face-down / OFF) |

`<characterKey>` must match `D.characters` keys in `lib/npcs_data.ttslua` (e.g. `myleneHamelin`).

**Build manifest** (default dir is `assets/images/NPC Tokens`; writes `.dev/custom-ui-assets/npc-token-manifest.json` and `lib/npc_token_upload_manifest.ttslua`):

```text
npm run custom-ui-assets:manifest-npc-tokens
```

Override folder: `--dir <other-path>`

Batched upload (default **20 characters** = 40 upload tokens per manifest):

```text
npm run custom-ui-assets:manifest-npc-tokens:batch -- --batchStart myleneHamelin
```

**TTS — control-board tokens (61 paired tiles, not upload temps):** Save & Play → `lua DEBUG.spawnNpcControlBoardTokens()` — places round flip tiles (`type=2`, `thickness=0.1`) on **CONTROL_BOARD_PALETTE** (`npc_control_token`, `npcToken:<key>`), grouped via `lib/npcs_data` (`PALETTE_GROUP_BLACKLIST` excludes `princesCourt`). Optional: `{ scale = 0.38 }`.

**TTS — Cloud upload (122 single-face temps):** Save & Play → `lua DEBUG.spawnNpcTokenUploadBatch({ columns = 12, gap = 2, startY = 3 })` → Cloud Manager **Upload All Loaded Files** → save game.

**Merge** (required before extract — copies hosted URLs from spawned upload tokens into the save + `npc-generated-assets.json`):

```text
npm run custom-ui-assets:merge-npc-tokens
```

If your save file is not `.dev/TS_Save_230.json`, pass `--save` on the underlying merge command (see `package.json` script).

**Extract paired Steam URLs** (per-character `front` + `back`):

```text
npm run custom-ui-assets:extract-npc-token-urls
```

After extract: Save & Play → `lua DEBUG.applyNpcControlTokenHostedImages()` (or re-run `spawnNpcControlBoardTokens`).

**Patch save file** (persists hosted URLs on existing `npc_control_token` objects in `ObjectStates` — use when tokens still have `file:///…/NPC Tokens/` after upload):

```text
npm run custom-ui-assets:patch-npc-token-urls-in-save:dry-run
npm run custom-ui-assets:patch-npc-token-urls-in-save
```

Reads `.dev/custom-ui-assets/npc-token-hosted-urls.json` (or `npc-generated-assets.json` / save `CustomUIAssets` as fallback). Reload the save in TTS after patching.

Outputs:

- `.dev/custom-ui-assets/npc-token-hosted-urls.json`
- `lib/npc_token_hosted_urls.ttslua` — `require("lib.npc_token_hosted_urls")[characterKey].front` / `.back`

VS Code task **Custom UI Assets: Build Manifest from Image Files** → mode **`npc-tokens`**.

## NPC figurine cutouts (`npc_figurine` → character key) — legacy

**Legacy:** figurine-object merge from save. Prefer **NPC unified groups** (upload figurine front/back via `npm run custom-ui-assets:manifest-npc-groups`).

For pooled NPC figurines already in the save (`npc_figurine` tag, `Figurine_Custom`, Nickname = `D.characters.fullName`), copy each figurine’s **front** `CustomImage.ImageURL` into the save root **`CustomUIAssets`** with **`Name`** = the character key from `lib/npcs_data.ttslua` (e.g. `rashid`, `lordLucien`).

Use after figurines have been uploaded in TTS (Steam-hosted URLs) or while they still point at repo `raw.githubusercontent.com` URLs.

```text
npm run custom-ui-assets:merge-npc-figurines:dry-run
npm run custom-ui-assets:merge-npc-figurines
```

Live save (TTS Saves folder):

```text
npm run custom-ui-assets:merge-npc-figurines:live
```

Override paths: `--save <path>`, `--saveName <id>`, `--npcsData lib/npcs_data.ttslua`, `--assetsOut .dev/custom-ui-assets/npc-figurine-generated-assets.json`.

Writes `.dev/custom-ui-assets/npc-figurine-generated-assets.json` (merged entries only). Reload the save in TTS after merging.

## Folder mode (legacy)

Scans a directory of images (PNG→WEBP conversion, then manifest from filenames):

```text
npm run custom-ui-assets:pipeline -- --mode directory --input <relativeFolder> --saveName <saveId>
```

`--mode directory` is the default when `--mode` is omitted.

## Direct script usage

See `--help`-style comments at the top of:

- `.tools/custom-ui-assets/build-upload-manifest.js`
- `.tools/custom-ui-assets/build-upload-manifest-from-npc-tokens.js`
- `.tools/custom-ui-assets/build-upload-manifest-from-npc-groups.js`
- `.tools/custom-ui-assets/report-npc-upload-registry-gaps.js`
- `.tools/custom-ui-assets/run-custom-ui-assets-pipeline.js`
- `.tools/custom-ui-assets/merge-custom-ui-assets.js`

# Custom UI assets (TTS upload / merge)

## Agent Routing

Read this when:
- extracting, pruning, uploading, or merging TTS Custom UI assets
- changing `.tools/custom-ui-assets/` scripts or manifest outputs
- updating site-card image names or hosted URL manifests

Source of truth:
- `.tools/custom-ui-assets/`
- `.dev/custom-ui-assets/prune-custom-ui-assets.txt`
- `lib/constants.ttslua` (`C.Sites`)
- generated manifest stubs in `lib/custom_ui_upload_manifest.ttslua`, `lib/npc_token_upload_manifest.ttslua`, `lib/npc_group_upload_manifest.ttslua`, `lib/npc_token_hosted_urls.ttslua`

Generated/dependent files:
- `.dev/build-logs/save-assets-latest.*`
- ignored `.dev/custom-ui-assets/*.json`, `*.lua`, and reports

Verification:
- `npm run tts-save:extract-assets`
- `npm run custom-ui-assets:manifest-sites`
- `npm run build`

Status: current workflow guide; generated manifests are ignored unless a task explicitly updates them.

This folder tracks workflow guidance and the manual prune list only. Generated manifests, merge outputs, hosted-URL extracts, and reports are produced by scripts under `.tools/custom-ui-assets/` and are ignored by git.

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

The scanner **requires complete 4-file groups**; any orphan or missing file aborts with an error. Only groups whose `characterKey` exists in `D.characters` are injected and uploaded; unregistered disk folders are **skipped** and listed at the end of the run.

**Inject workshop objects** (patches/creates `npc_figurine` + `npc_control_token` `CustomImage` URLs with local `file:///` paths; runs automatically before manifest when `--save` / `--saveName` is set):

```text
npm run custom-ui-assets:inject-npc-world
npm run custom-ui-assets:inject-npc-world:dry-run
```

**Build manifest** (runs inject first unless `--skipInject`; skips groups already hosted in save `CustomUIAssets`; writes `.dev/custom-ui-assets/npc-group-manifest.json` and `lib/npc_group_upload_manifest.ttslua`):

```text
npm run custom-ui-assets:manifest-npc-groups
```

Batched upload (default **15 characters** = 60 upload temps per manifest):

```text
npm run custom-ui-assets:manifest-npc-groups:batch -- --batchStart adrianVarga
```

Flags: `--dir <path>`, `--save` / `--saveName`, `--skipSaveCheck`, `--skipInject`, `--batch`, `--batchMax`, `--batchStart`.

**Full pipeline** (inject → manifest → pause for TTS upload → merge → extract token pairs → registry gap report):

```text
npm run custom-ui-assets:pipeline-npc-groups
```

Or with batch flags forwarded:

```text
npm run custom-ui-assets:pipeline -- --mode npc-groups --saveName 230 --batch
```

**TTS — Cloud upload:** Save & Play → `lua DEBUG.spawnNpcGroupUploadBatch({ columns = 12, gap = 2, startY = 3 })` → Cloud Manager **Upload All Loaded Files** → save game. Figurine fronts/backs spawn as **Figurine_Custom** pairs (`<name>.webp` + `<name>Back.webp`); token sides still use flat upload temps. Figurines/tokens already in the save with `file:///` URLs are converted to Steam URLs on save as well.

**Merge / extract / apply world / report:**

```text
npm run custom-ui-assets:merge-npc-groups
npm run custom-ui-assets:extract-npc-token-urls
npm run custom-ui-assets:apply-npc-hosted-world
npm run custom-ui-assets:report-npc-registry-gaps
```

**Save path:** `merge-npc-groups`, `extract-npc-token-urls`, and `apply-npc-hosted-world` default to the live TTS save via `--saveName 230` (`D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves/TS_Save_230.json`). Override with `--save <path>` or `--saveName <id>` on the underlying Node scripts if needed.

The **full pipeline** runs merge → extract → **apply hosted world** automatically after you finish the manual Cloud upload step. `apply-npc-hosted-world` patches figurine `CustomImage` URLs and creates or updates `npc_control_token` tiles in the save JSON using hosted Steam URLs — no `DEBUG.spawnNpcControlBoardTokens` or `DEBUG.applyNpcControlTokenHostedImages` required for newly uploaded batches.

Dry-run: `npm run custom-ui-assets:apply-npc-hosted-world:dry-run`

**Registry gap report:** disk groups skipped (not in `D.characters`), registry keys missing disk groups, and tokens missing from save. Written to `.dev/custom-ui-assets/npc-registry-gap-report.txt`.

**Runtime:** Lua no longer spawns figurines or calls `setCustomObject`/`reload()` on placement — images are workshop-baked only.

**Fallback:** `merge-npc-figurines` copies figurine URLs into `CustomUIAssets` for one-off harvesting; the preload pool does not require it.

VS Code task **Custom UI Assets: Build Manifest from Image Files** → mode **`npc-groups`**.

## NPC gameboard tokens (`tokenFront_*` / `tokenBack_*`) — split-folder fallback

Use this token-only manifest path when working from a split token folder. Prefer **NPC unified groups** above (`assets/images/NPCs/`) for normal NPC uploads.

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

**TTS — control-board tokens:** Prefer `npm run custom-ui-assets:apply-npc-hosted-world` after upload merge (pipeline runs this automatically for **npc-groups**). Manual fallback: Save & Play → `lua DEBUG.spawnNpcControlBoardTokens()` — round flip tiles on **CONTROL_BOARD_PALETTE** (`npc_control_token`, `npcToken:<key>`).

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

After extract: `npm run custom-ui-assets:apply-npc-hosted-world` or Save & Play → `lua DEBUG.applyNpcControlTokenHostedImages()`.

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

## NPC figurine cutouts (`npc_figurine` → character key) — fallback

Use this figurine-object merge from save when harvesting existing uploaded figurine fronts. Prefer **NPC unified groups** for normal uploads (figurine front/back via `npm run custom-ui-assets:manifest-npc-groups`).

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

## Folder mode fallback

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

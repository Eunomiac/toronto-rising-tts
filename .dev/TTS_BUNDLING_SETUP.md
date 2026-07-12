# TTS Tools Extension - Bundling Setup Guide

## Agent Routing

Read this when:
- changing Save & Play, bundling, object-script, or custom UI asset workflows
- debugging TTS extension path/module resolution
- editing scripts that read or write `.dev/TS_Save_230.json`

Source of truth:
- `package.json`
- `.tools/`
- `.vscode/settings.json`
- `.tts/objects/Global.lua` stub behavior
- `core/global_script.ttslua`

Verification:
- `npm run build`
- `npm run check:bundle-size-gate`
- Save & Play in TTS for runtime bundling behavior

Status: current workflow guide; generated outputs and save snapshots are local/ignored unless a script writes committed stubs.

## Overview

Based on the [TTS Tools documentation](https://sebaestschjin.github.io/tts-tools/editor/latest/bundling.html), here's how bundling works and how to troubleshoot issues.

## How Bundling Works

**Important**: The TTS Tools extension works with files in the `.tts/objects/` directory. This is the "output directory" where the extension stores scripts it reads from TTS.

### Global script source of truth (read this)

- **TTS may overwrite** `.tts/objects/Global.lua` when you reload the game or sync from TTS. Treat that file as **volatile**.
- It should stay a **stub** only: `require("core.global_script")`.
- **All global game logic** lives in **`core/global_script.ttslua`** (same `require()` roots as `lib/` and `core/`). Edit that file, not the stub, when adding `onLoad`, HUD handlers, etc.
- **Local function order (top recurring runtime bug):** In **every** `.ttslua` file you edit (especially `core/global_script.ttslua`), declare each **`local function`** **before** any `Global.*` / `HUD_*` / `local function` / callback that calls it — or **forward-declare** (`local foo` at top, assign later). Otherwise Lua treats the name as a global → **`attempt to call a nil value`** at Save & Play. **`npm run build` does not catch this.** Agents: grep helper vs caller line numbers before marking work done. See [`docs/solutions/lua-local-function-order.md`](../docs/solutions/lua-local-function-order.md) and `.cursor/rules/toronto-rising-lua-local-function-order.mdc`.

See also [`README.md`](../README.md) at the repo root (Global script overview).

**Rolandostar / `Global.-1.lua` in Temp:** The synced file under e.g. `%LocalAppData%\Temp\TabletopSimulator\Tabletop Simulator Lua\` is **not** where `require()` looks. Module names like `core.global_script` resolve against your **project workspace** (`core/global_script.ttslua`, `lib/…`). Prefer **`require("core.global_script")`** in the stub. If a save or old stub still says **`require("global.global_script")`**, the repo provides a one-line shim at [`global/global_script.ttslua`](../global/global_script.ttslua) so that id keeps working; **edit game logic only in `core/global_script.ttslua`.** In a **multi-root** VS Code/Cursor window, put **this repo first** (or use a single-folder window) so the extension’s include path finds `core/` and `global/`.

1. **Entry Point (stub)**: `.tts/objects/Global.lua` is what the extension bundles first; it should only `require("core.global_script")`.
2. **Module Files**: Your module files (e.g., `lib/util.ttslua`, `core/state.ttslua`, `core/global_script.ttslua`) are in the workspace directory
3. **Require Syntax**: Use dot notation: `require("lib.util")` for `lib/util.lua` or `lib/util.ttslua`
4. **Bundling Process**: When you use "Save and Play":
   - Extension reads `.tts/objects/Global.lua`
   - For each `require()` call, it looks for the file in the workspace directory (based on `ttsEditor.includePath`)
   - It bundles everything into one script
   - Sends the bundled version to TTS
   - Saves a copy to `.tts/bundled/Global.lua`

## Rolandostar (`tabletopsimulator-lua`): Temp folder vs this repo

Official reference: [Module resolution](https://github.com/rolandostar/tabletopsimulator-lua-vscode/blob/main/docs/content/extension/moduleResolution/index.md) (same content as [tts-vscode.rolandostar.com — Module resolution](https://tts-vscode.rolandostar.com/extension/moduleResolution)).

**Symptom:** Save & Play / catalog errors like **Could not catalog `<Include />` — file not found: `defaults_classes`** (or similar), and the error or tooltip mentions **`...\AppData\Local\Temp\TabletopSimulator\Tabletop Simulator Lua`**.

**Why:** Pulling scripts from TTS writes copies under that **Temp** tree. **`require`** and **`<Include src="...">`** are **not** resolved from “the folder where `Global.-1.lua` lives” as a project root. The extension uses an **ordered search** per the doc above: **Documents/Tabletop Simulator** first, then **`ttslua.fileManagement.includePaths`**, then **folders opened in the workspace**. In practice (rolandostar with this repo), **`<Include src>`** is resolved from the **workspace folder root**: use paths like **`ui/defaults_tags.xml`**, **`ui/storyteller/panel_camera.xml`**, not bare **`defaults_tags.xml`** (which would look next to the repo root). If catalog runs only against **Temp** while your real **`ui/*.xml`** lives in the **repo**, also ensure the repo is the Save & Play working directory and on the search path.

**Repo defaults (committed):** [`.vscode/settings.json`](../.vscode/settings.json) sets:

- **`ttslua.fileManagement.includePaths`:** `["${workspaceFolder}"]` — adds this clone as an **additional** search root (priority2 in the doc), so `require` / `<Include>` can find **`core/`**, **`lib/`**, **`ui/`** regardless of Temp.
- **`ttslua.fileManagement.luaSearchPattern`:** `["?", "?.lua", "?.ttslua"]` — the extension default is **`?.lua`** only; this project uses **`.ttslua`** modules, so **`?.ttslua`** must be listed per [Lua search-path patterns](https://www.lua.org/pil/8.1.html) as described in the module-resolution doc.

**What to do if errors persist:**

1. **Open this folder as the workspace** — **File → Open Folder…** → `toronto-rising-tts` (single-folder is simplest). For **multi-root**, open the **repo** folder, not only Temp.
2. **Change working directory for Save & Play** — Command **“TTS Lua: Change working directory where scripts will be saved to and loaded from.”** (`ttslua.changeWorkDir`). Point it at **`toronto-rising-tts`** so the extension loads/bundles from **`ui/Global.xml`** and the rest of the tree (see [issue #20](https://github.com/rolandostar/tabletopsimulator-lua-vscode/issues/20)).
3. **Debug resolution** — `"ttslua.misc.debugSearchPaths": true` and **Developer Tools** (**Ctrl+Shift+I**); see [Debugging module resolution](https://tts-vscode.rolandostar.com/support/debugModuleResolution).

**Settings note:** Sebaestschjin uses **`ttsEditor.*`**. Rolandostar uses **`ttslua.*`**. This repo’s layout expects **`core/`**, **`lib/`**, **`ui/`** at the **repository root**.

## Workflow

### Recommended Workflow

1. **Edit global logic**: Use **`core/global_script.ttslua`** (not the `.tts/objects/Global.lua` stub).
2. **Edit other modules**: Edit files in `lib/` and `core/` directly.
3. **Keep the stub**: If TTS overwrote the synced Global entry script, set it back to only `require("core.global_script")` (one line). The stub is **not** tracked in git (see [`.gitignore`](../.gitignore)).
4. **Bundle and send**: Use "Save and Play" - extension will:
   - Read `.tts/objects/Global.lua`
   - Resolve all `require()` calls from workspace directory (including `core.global_script`)
   - Bundle everything together
   - Send to TTS

### Working with Bundled Only

1. Edit `.tts/bundled/Global.lua` directly
2. Use "Save and Play (Bundled)" to send as-is (no bundling)

### Inject bundled Global into save JSON (no External Editor send)

When extension **Save & Play** hangs on “Sending Scripts” (often due to ~150 MB of duplicated object bundles), you can patch **Global only** directly into the on-disk save file — same pattern as [custom UI merge](../.tools/custom-ui-assets/merge-custom-ui-assets.js).

**Prerequisites**

1. Bundle Global first (extension bundle step, or any flow that writes `.tts/bundled/Global.lua` and `Global.xml`).
2. Know your TTS save slot (e.g. `123` → `TS_Save_123.json`).
3. **Close TTS** or load a different slot before patching (avoid writing while the game holds the file open).

**Cursor task**

**Tasks: Run Task** → **TTS: Inject Bundled Global into Save JSON** — prompts for save id, then writes root `LuaScript`, `XmlUI`, and clears `LuaScriptState`.

**CLI**

```text
npm run tts-save:inject-global -- --saveName 123
```

Optional: `--savesDir <path>` (override Saves folder), `--lua`, `--xml`, `--dryRun`, `--noBackup`.

Default Saves folder resolution: `--savesDir` → env `TTS_SAVES_DIR` → `D:/OneDrive/Documents/My Games/Tabletop Simulator/Saves` if present → `%USERPROFILE%/Documents/My Games/Tabletop Simulator/Saves`.

**After inject**

1. Load the patched save from the TTS menu.
2. Save in-game if you want the slot persisted.

A timestamped backup is written beside the save (`TS_Save_<n>.pre-inject-global.<timestamp>.json`) unless `--noBackup`.

**Scope:** Global Lua + Global UI only. Object scripts (character sheets, dice bags, etc.) are unchanged.


### Issue 0: Connection Refused (ECONNREFUSED 127.0.0.1:39999)

**Symptom**: Error in Extension Host: `Error: connect ECONNREFUSED 127.0.0.1:39999`

- "Save & Play" doesn't work
- "Load Objects" doesn't work
- Extension can't communicate with TTS

**Root Cause**: The extension connects to TTS on port **39999** (External Editor API). Get Lua Scripts can work while Save & Play hangs — often because Save sends **all modified object bundles** (~150 MB for this mod), not because External Editor is “disabled” in a menu (there is no such toggle in current TTS builds).

**Solution**:

1. **Ensure TTS is Running** with your save loaded when using the extension.
2. **Verify port 39999** while TTS has a table open: `netstat -ano | findstr ":39999"` should show `LISTENING`.
3. **Avoid port 39998 conflicts** — only one listener (extension or repo tts-bridge/MCP). See Issue 0b.
4. **Prefer Global-only deploy** when object scripts did not change — use **Inject bundled Global into save JSON** (above) or in-game paste of `.tts/bundled/Global.lua` + `Global.xml`.
5. **Alternative: Manual Script Loading** — paste bundled Global into the in-game Scripting editor and Save & Play there.

**Note**: External Editor is built into TTS when a game is loaded; no in-game checkbox is required.

### Issue 0b: Port 39998 already in use (EADDRINUSE)

**Symptom**: Local tooling (for example the [TTS MCP server](TTS_MCP.md)) fails with `listen EADDRINUSE` on `127.0.0.1:39998`, or the MCP logs mention that **port 39998** is already in use.

**Root cause**: In the External Editor protocol, **your editor** (or bridge process) must listen on **39998** so Tabletop Simulator can open **outbound** connections to deliver `print` output, errors, return values, etc. Only **one** process at a time can bind that port.

**What to do**:

1. Quit or disable other External Editor integrations that listen on **39998** (e.g. another VS Code / Cursor extension talking to TTS at the same time).
2. Or stop the other tool, then start the MCP / bridge again.

See [TTS_MCP.md](TTS_MCP.md) for setup and Cursor configuration.

### Issue 1: Extension Not Reading Your Script

**Symptom**: Changes don't appear in TTS

**Root Cause**: The extension reads from `.tts/objects/Global.lua` for the bundle **entry**, but TTS may have replaced that file. Logic belongs in `core/global_script.ttslua`.

**Solution**:

- Restore the Global entry script the extension uses (often under `.tts/objects/`) to only `require("core.global_script")` if TTS replaced it with bundled code.
- Edit **`core/global_script.ttslua`** for global script changes.
- Module files in `lib/` and `core/` are resolved automatically during bundling.

**Important**: The `.tts/objects/` directory is the extension’s sync target; **`core/global_script.ttslua`** is the source of truth for global Lua logic.

### Issue 2a: Module only used inside functions → missing from bundle

**Symptom**: Console shows `DEBUG.workspaceNdjsonBegin: lib.workspace_ndjson_log unavailable` (or `require failed: ...`) while other `sendExternalMessage` writes (e.g. `Print State` / `game_state.txt`) still work.

**Cause**: Some bundlers only pull in modules reachable from **top-level** `require("...")` on the dependency graph. A module loaded **only** via `pcall(require, ...)` inside a function may never be embedded, so it is missing at runtime.

**Solution**: Add a **module-level** `require("lib_that_must_ship")` once from an entry module (e.g. `core/debug.ttslua` already preloads `lib.workspace_ndjson_log`). Do the same for any other “lazy” dependency you need in TTS.

**Generated manifests** (`lib/custom_ui_upload_manifest.ttslua`, `lib/npc_token_upload_manifest.ttslua`, `lib/npc_group_upload_manifest.ttslua`, `lib/npc_token_hosted_urls.ttslua`): keep **committed stubs** in git (empty `assets` / `{}`) when possible. `core/debug.ttslua` uses module-level `require("lib.…")` (same pattern as `lib.workspace_ndjson_log`) so luabundle embeds the stubs with no init console noise. `npm run custom-ui-assets:manifest-*` overwrites stub content; invoke `DEBUG.loadCustomUiUploadManifest()` or spawn/upload DEBUG helpers for guidance when manifests are empty.

**Object scripts** (e.g. character sheet `ui/ui_csheet.ttslua`): stubs are only `require("ui.ui_csheet")`. Anything you `require` **inside** a function may be **missing at runtime**. Keep **`require("lib.workspace_ndjson_log")`** (and similar) at **file top level**.

### Issue 2: Require Path Errors

**Symptom**: `Tried to require "lib.util", but no such module has been registered`

**Solution**:

- Ensure files exist: `lib/util.ttslua` or `lib/util.lua`
- Check require path uses dots: `require("lib.util")` not `require("lib/util")`
- Verify workspace root is correct (extension searches from workspace directory)
- Check if "include path" setting needs adjustment

### Issue 3: Special Characters in Filenames

**Symptom**: Files with `++` or other special chars in names

**Solution**:

- The bundler handles `console++.lua` correctly
- Use `require("lib.Console.console++")` as-is
- If issues persist, consider renaming to `console_plus_plus.lua`

### Issue 4: Extension Settings

**Correct Settings** (for TTS Tools extension):

```json
{
  "ttsEditor.includePath": ".",
  "ttsEditor.enableMessages": true
}
```

**Explanation**:

- `ttsEditor.includePath`: Relative path from workspace root where modules are located. Default is `"src"`, but since our files are in the root (`lib/`, `core/`), we use `"."` (current directory).
- `ttsEditor.enableMessages`: Enables handling of custom messages from TTS (for external command support).

**Old Settings** (for older extension - remove these):

- `TTSLua.includeOtherFiles` - Not used by TTS Tools
- `TTSLua.bundleSearchPattern` - Not used by TTS Tools
- `TTSLua.includeOtherFilesPaths` - Not used by TTS Tools

## Player character data (`lib/json/PCS.json`)

- **Authoring**: Edit chronicle PC definitions in **`lib/json/PCS.json`** (source of truth in git).
- **TTS runtime**: Lua cannot read arbitrary files on disk. After changing the JSON, regenerate the embedded module:
  - From repo root: `node .dev/scripts/generate_pcs_data_lua.js`
  - This rewrites **`lib/pcs_data.ttslua`** (large file, committed) so `require("lib.pcs_data")` decodes the JSON inside Tabletop Simulator.
- Game code uses `PCS.getPC(charKey)`; player seats and `charKey` come from **`lib/constants.ttslua`** (`C.PlayerData`).

## Character sheet defaults (`ui/player/csheets/csheet_defaults.xml`)

- **Authoring**: Edit shared character sheet UI defaults in **`ui/player/csheets/csheet_defaults.xml`**.
- **TTS runtime**: `UI.setXml(...)` cannot resolve `<Include>` from runtime strings, so dynamic character sheet pages use generated Lua defaults:
  - From repo root: `node .dev/scripts/generate_csheet_defaults_lua.js`
  - This rewrites **`lib/csheet_defaults_xml.ttslua`** (committed) so dynamic XML builders can embed the same defaults while XML remains the source of truth.
- The default VS Code build task runs `npm run csheet-defaults:generate` as part of `npm run build`.

## Character sheet pages 1–8 (object UI)

Every `CSHEET_PAGE_<n>_<COLOR>` object has a one-line stub under **`.tts/objects/`** (normalized by `npm run tts-objects:fix-stubs`):

```lua
require("ui.ui_csheet")
```

**NPC gameboard objects** (same script / build task):

| Object prefix | Lua stub | XML stub |
| --- | --- | --- |
| `CONTROL_BOARD.*` | `require("objects.npc_control_board")` | `<Include src="ui/objects/npc_control_board.xml" />` |
| `CONTROL_BOARD_PALETTE.*` | `require("objects.npc_control_board_palette")` | `<Panel />` |
| `DICEBAG_*` | `require("objects.dice_bag")` | **none** (invisible `createButton` roll target — no Custom UI file). **Thin bundle only** (~3 modules / ~54 KB): `lib.dice_kinds`, `lib.guids`. Tray Y offset during live rolls: `Global.call("GlobalGetPcRollTrayYOffset")` — **never** `require("lib.pc_roll_tray_lower")` (pulls `core.state` → ~2.6 MB × 22 bags; broke Save & Play 2026-07-03). |
| `COMPANION_TOGGLE_*` | `require("ui.ui_companion_toggle")` | **none** (invisible `createButton` like dice bags; clicks → `GlobalApplyCompanionToggleClick`). GMNotes roles: `COMPANION_TOGGLE_A_RED` / `_A_BROWN` (Purple tiles use same stub; handler deferred). |
| `SIGNAL_CANDLE_*` | `require("ui.ui_signal_candle")` | **none** |
| `SOUNDSCAPE_*` / `TAROT_BUTTON_*` | matching `require(...)` in fix script | **none** |

The TTS extension often scrambles these (e.g. pasting a csheet `<Include>` or the Global-injected fallback `click_*` script onto the board object). Run **`npm run tts-objects:fix-stubs`** after Save & Play if stub **content** drifts; the build task also **deletes** stray `.xml` stubs on Lua-only objects when the extension copies csheet UI onto dice bags, candles, etc.

**Stub filenames vs GUIDs:** TTS Tools syncs `.tts/objects/{displayNickname}.{guid}.lua` (and `.xml`, `.data.json`). Display nicknames are free-form (e.g. `Aishe - p.1.c4abec.lua`); **role identity** for build tooling comes from the companion `.data.json` → **`GMNotes`** (e.g. `CSHEET_PAGE_1_PINK`). `fix_tts_object_stubs` normalizes stub **content** from that role; **`check:tts-object-stub-guids`** verifies the filename `{guid}` suffix matches `lib/guids.ttslua` for that role. After workshop edits or a partial sync, the wrong GUID can land on a nickname — Save & Play then never repairs the broken object. **`npm run build`** runs the stub GUID gate **first** (then pcall/effective-stats gates; skips when `.tts/objects` is absent). On failure: **Get Lua Scripts** from TTS to refresh from the save, then `npm run tts-objects:fix-stubs`, then Save & Play.

**Pages 3–6** (`CSHEET_PAGE_3_*` … `CSHEET_PAGE_6_*`) use separate entries so each page’s XML builder (and embedded templates when shipped) is **not** bundled into all ~80 sheet objects:

```lua
require("ui.ui_csheet_page3")   -- backgrounds / merits / flaws (live)
require("ui.ui_csheet_page4")   -- relationships / bonds (placeholder builder today)
require("ui.ui_csheet_page5")   -- projects / equipment (placeholder)
require("ui.ui_csheet_page6")   -- history / XP log (placeholder)
```

Each entry loads `ui/ui_csheet_pageN_local.ttslua` (registers `lib/csheet_pageN_xml` on `_G`) then `ui/ui_csheet_core.ttslua`. Default pages (1–2, 7–8) must **not** pull another page’s template chain. Page 3 adds ~+30 KB vs the default entry; pages 4–6 placeholders add only a few KB until real templates land.

Object scripts run in a **separate Lua VM** from Global. They must not pull the full game stack (`lib.pc_stats` → `core.sync`, etc.). **Agents:** treat every object-script `require()` as high risk — import **piecemeal** (thin object-only modules) or **`Global.call`**; never entire libraries or anything that transitively requires `core.*`. Each object is bundled separately, so cost multiplies by object count (22 dice bags, ~37 CSHEET pages). See [`.cursor/rules/toronto-rising-object-script-bundling.mdc`](../.cursor/rules/toronto-rising-object-script-bundling.mdc). Thin modules and `Global.call` keep each CSHEET bundle small (~tens of KB vs ~1.4 MB before slimming). **Signal candles** use `GlobalToggleSignalFireState`; **NPC CONTROL_BOARD / PALETTE** use `GlobalGameboardApply`, `GlobalGameboardToggleControlBoardSnaps`, `GlobalGameboardInstallPaletteSnaps` (no `require("core.npc_gameboard")` on objects); **tarot** uses `lib/object_positions_object.ttslua` (not `lib/object_positions.ttslua`); **dice bags** use `GlobalGetPcRollTrayYOffset` (not `lib.pc_roll_tray_lower`).

| Layer | Module | Role |
| ----- | ------ | ---- |
| Object UI (shared) | `ui/ui_csheet_core.ttslua` via `ui/ui_csheet.ttslua` or `ui/ui_csheet_pageN.ttslua` | Page/seat from GM Notes `CSHEET_PAGE_<n>_<COLOR>` (`lib/csheet_identity.ttslua`); navigation; applies UI from Global payloads |
| Sheet diffs (Global) | `GlobalCollectSheetImageUpdates({ playerID, pageNum })` → resolves registry effects → `lib/pc_sheet_collect.ttslua` | Dot/box `setAttribute` list |
| Dynamic page XML (pages 3–6 objects) | `require("ui.ui_csheet_pageN")` → `ui/ui_csheet_pageN_local.ttslua` → `lib/csheet_pageN_xml.ttslua` | `self.UI.setXml` in object VM; page 3 live, 4–6 placeholder until templates ship |
| BP decals (object) | `lib/blood_potency_decals.ttslua` bundled into CSHEET object script | `self.getDecals` / `self.setDecals` — uses `lib/blood_potency_derived.ttslua` + `lib/blood_potency_constants.ttslua` (not `lib.constants` or `lib.effective_stats`) |
| Object-only | `lib/csheet_constants.ttslua`, `lib/csheet_util.ttslua`, `lib/csheet_pose.ttslua`, `lib/blood_potency_constants.ttslua`, `lib/blood_potency_derived.ttslua`, `lib/object_positions_object.ttslua` | CSHEET poses, delay, BP tables/decals, tarot pose — no `core.*`, no full `lib.constants` |

**Verify bundle size**

```powershell
npm run check:bundle-size-gate          # build gate: luabundle object entries + spike baseline
npm run check:bundle-size-gate -- --write-baseline   # approve intentional size growth
npm run tts-save:bundle-csheet-sample   # local luabundle without Save & Play
npm run tts-save:measure-bundles        # sizes + regression checks
npm run tts-save:measure-bundles -- --estimate   # require-tree only
```

Baseline: `.dev/build-logs/bundle-size-gate.json` (updated on each passing `npm run build`). Fails on hard byte ceilings, `core.*` / `lib.constants` in thin object bundles, or **>20% / >8 KB** growth vs baseline (catches dice-bag-style regressions without Save & Play).

Without `.tts/bundled/` output, the script prints a **require-tree estimate** from `ui.ui_csheet` and flags heavy modules (`core.*`, `lib.pc_stats`, `lib.constants`, …). `lib.blood_potency_constants` is allowed on the CSHEET path. After Save & Play bundles one CSHEET object, it also reports `.tts/bundled/CSHEET_*.lua` sizes and regression checks. NPC Control Board bundles must stay under 10 KB with no `core.*` modules.

**Save loading asset inventory (in-game “Loading (N/M)” bar)**

When TTS opens a save it reports how many assets it is loading (e.g. **1020** for `TS_Save_230.json`). To export a CSV aligned with that progress bar:

```powershell
npm run tts-save:list-loading-assets
# or
node .tools/tts-save/list-save-loading-assets.js --save .dev/TS_Save_230.json --outBasename save-loading-assets-latest
```

**Model:** global `CustomUIAssets` registry (**579** in save 230) plus every `ObjectStates` node (recursive) **except** `HandTrigger`, `Block*`, and `Custom_Assetbundle` / `CustomAssetbundle` objects (**443** → **1022** total from JSON; in-game may show **1020** due to engine-side dedup).

Outputs under `.dev/build-logs/`:

| File | Contents |
| --- | --- |
| `save-loading-assets-latest.csv` | One row per loading-bar asset (header + N data rows) |
| `save-loading-assets-latest-extras.csv` | Asset bundles (meshes), sky URL, decal pallet — loaded in-engine but excluded from the progress total |
| `save-loading-assets-latest.json` | Full structured report |

Columns include `customAssetName`, `objectGuid`, `primaryUrl`, `gGuidsKey` (from `lib/guids.ttslua`), `saveJsonPath`, `category`, and `gmNotes` (object `GMNotes` from the save JSON). The `notes` column is script extraction metadata, not GM Notes. Pair with `npm run tts-save:extract-assets` for prune/reference-source analysis of Custom UI only.

**Object tag usage (prune ComponentTags registry)**

To list tags **actually assigned** on table objects (ignores `ComponentTags.labels` registry and save-level Workshop `Tags`):

```powershell
npm run tts-save:list-object-tags
```

Outputs under `.dev/build-logs/`:

| File | Contents |
| --- | --- |
| `save-object-tags-latest.csv` | `tag`, `objectCount` — every unique tag on `ObjectStates` / `ContainedObjects` |
| `save-object-tags-latest-registry-unused.csv` | Registry labels never assigned to any object (prune candidates) |

Pass `--noPruneCandidates` to skip the registry-unused file.

**Prune unused registry labels (mutates save JSON)**

Removes `ComponentTags.labels` entries whose `displayed` name is not on any object. Object `Tags` are unchanged. Timestamped backup beside the save unless `--noBackup`.

```powershell
npm run tts-save:prune-component-tags          # dry-run on .dev/TS_Save_230.json
npm run tts-save:prune-component-tags:apply    # write (349 → 32 labels for save 230)
```

Optional: `--keepFile path/to/tags.txt` (one tag per line) to retain registry names not currently on objects.

**Smoke checklist (after re-bundle)**

1. Page 1: dot/box refresh when ST panel or conditions change (`obj.call("refreshFromGameState")`).
2. Page 2: discipline dots update.
3. Page 3: `setXml` when backgrounds/merits/flaws change; fingerprint skips redundant rebuilds.
4. Spread navigation (on/off y poses).
5. Roll clicks (humanity / willpower / rouse / frenzy) via `GlobalInitiateRoll`.

Shipped XML per page (object Custom UI asset):

```xml
<Include src="ui/player/csheets/page<n>.xml" />
```

TTS resolves that path on **Save & Play** before object Lua runs. You always need a file at **`ui/player/csheets/page<n>.xml`** for each page index in use.

| Pages | Mode today | What to edit |
| ----- | ---------- | ------------- |
| **1–2** | Static shipped XML | `ui/player/csheets/page1.xml`, `page2.xml` — dot/box updates via `UI.setAttribute` from `GlobalCollectSheetImageUpdates` |
| **3** | **Dynamic** (`UI.setXml`) | Layout: **`ui/.templates/csheet/page3.xml`** + partials; builder: **`lib/csheet_page3_xml.ttslua`**. Shipped **`ui/player/csheets/page3.xml`** is only a minimal Include placeholder. |
| **4** | **Dynamic** (`UI.setXml`) | **`lib/json/PC_Relationships.json`** → **`lib/csheet_page4_xml.ttslua`**; templates **`ui/.templates/csheet/page4.xml`** + partials. Regenerate data: `node .dev/scripts/generate_pc_relationships_lua.js`. |
| **5–6** | **Dynamic entry** (placeholder builders) | Object stub `require("ui.ui_csheet_pageN")`; builders still placeholders until templates ship. |
| **7–8** | Static shipped XML (scaffolding / WIP) | `ui/player/csheets/page7.xml`, `page8.xml` — default csheet entry only |

**Do not** bundle dynamic template chains on the default csheet entry. When a page needs PCS-driven layout like page 3: (1) add templates under `ui/.templates/csheet/`, (2) replace **`lib/csheet_pageN_xml.ttslua`** placeholder with a real builder (entry + `_local` shims already exist for pages 4–6), (3) run `npm run ui-xml-templates:embed`, (4) **replace** the shipped `ui/player/csheets/pageN.xml` with a thin placeholder (keep the file so Includes still resolve). Pages 7–8 remain static until you add `ui.ui_csheet_page7` stubs the same way.

## Runtime UI XML templates (`ui/.templates/`)

Some panels are assembled at runtime via `UI.setXml` (character sheet **pages 3–4** today). Lua cannot read the repo filesystem in TTS, so template XML is **embedded at build time**:

- **Authoring**: Edit templates under **`ui/.templates/csheet/`** only (for example `page3.xml` and `partials/*.xml`). The embed script does not read top-level `ui/.templates/*.xml` (those are color-expansion sources).
- **Parameters**: `@@NAME@@` tokens substituted by `lib/ui_xml_template.ttslua` at runtime.
- **Conditionals**: `##IF @@NAME@@##` … `##ENDIF##` — inner XML is kept only when the caller included `NAME` in the params table (omit keys you do not want rendered).
- **Build**: `npm run ui-xml-templates:embed` (also in `npm run build`) writes **`lib/ui_xml_templates.ttslua`**.
- **Consumers**: Domain modules map data → params and call `require("lib.ui_xml_template").apply(templateKey, params, opts)`; use `opts.rawKeys` for values that are already XML fragments (column slot concatenations).
- **Not the same as color templates**: Top-level `ui/.templates/*.xml` files with `<!-- TARGET: ui/... -->` are processed by `xml_color_template_generator.js` into shipped per-color UI files. Nested folders such as `ui/.templates/csheet/` are **embed-only** (no `TARGET` line). **`ui/.templates/roll/`** is a **build-time composer** (partials + `dash_body.xml` → `ui/shared/roll_dash_generated.xml` via `npm run roll-dashboard:generate`); not embedded in Lua and not expanded by the color generator.

## File Structure

```text
workspace/
├── global/
│   ├── global_script.ttslua   # Global game logic (edit this)
│   └── README.md
├── lib/
│   ├── util.ttslua
│   ├── constants.ttslua
│   ├── console.lua
│   └── Console/
│       ├── console.lua
│       └── console++.lua
├── core/
│   ├── state.ttslua
│   ├── main.ttslua
│   └── ...
└── .tts/
    ├── objects/
    │   └── Global.lua     # Stub only: require("core.global_script") — may be overwritten by TTS
    └── bundled/
        └── Global.lua     # Bundled output (generated, not edited)
```

## Debugging Steps

1. **Check Bundled Output**: Look at `.tts/bundled/Global.lua` to see if all modules are included
2. **Check TTS Console**: Look for Lua errors in TTS (press `` ` `` for system console)
3. **Check Extension Logs**: Look for bundling errors in VS Code/Cursor output panel
4. **Verify File Paths**: Ensure all `require`d files exist in the workspace
5. **Test Simple Require**: Try a minimal test to verify bundling works

## Testing Bundling

Create a simple test:

**test.lua**:

```lua
local Test = {}
Test.message = "Hello from test module"
return Test
```

**`core/global_script.ttslua`** (add temporarily at end of file, then remove after test):

```lua
local Test = require("test")
print(Test.message)
```

Or keep the stub and add the same two lines to a scratch module required from `global_script`. If bundling works, TTS receives the full tree. If not, check extension configuration (and that `core/` is on the include path like `lib/`).

---

## XML UI template generator

Helper script for player (and other) UI XML that is generated from templates.

### What it does

- Templates live in `ui/.templates/*.xml`.
- The first non-empty line of each template must be `<!-- TARGET: path/from/repo/root.xml -->`.
- If the template root contains `@@color@@`, it is duplicated once per `C.PlayerColors` value (from `lib/constants.ttslua`); otherwise a single root is written (pass-through).
- Each output file begins with a banner pointing back to the template source.
- Tag parsing for finding the single root element ignores matches inside `<!-- ... -->` comments, so placeholders like `<Color>` in prose comments do not corrupt the tag stack (see `listXmlCommentRanges` in `.dev/scripts/xml_color_template_generator.js`).

### Where it writes outputs

- Whatever path is declared in the template `TARGET` line (for example `ui/player/panel_map_core_generated.xml`).

### How to run it

From repo root:

```bash
node .dev/scripts/xml_color_template_generator.js
```

Optional: `--templateDir` (defaults to `ui/.templates`), `--token` (defaults to `@@color@@`).

### How generated XML is included

- Include the output file directly from other `ui/**/*.xml` files (for example `ui/player/panel_right_sidebar_layers.xml`).

If you change templates, re-run the generator before using TTS Tools "Save and Play".

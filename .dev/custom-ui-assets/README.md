# Custom UI assets (save inventory)

## Agent Routing

Read this when:
- auditing what `CustomUIAssets` / object assets the save loads (counts, unreferenced names)

Asset links themselves (adding, renaming, removing art) are owned by `npm run cloud-asset-sync`: see [`.tools/Cloud-Asset-Sync-Plan.md`](../../.tools/Cloud-Asset-Sync-Plan.md) and the author guide [`!! User Guides/Cloud Assets — Step by Step.md`](../!!%20User%20Guides/Cloud%20Assets%20%E2%80%94%20Step%20by%20Step.md). Every way TTS and the dashboard got URLs before the migration: [`Asset URL Survey.md`](Asset%20URL%20Survey.md).

Source of truth:
- `.tools/tts-save/extract-categorize-save-assets.js`, `.tools/tts-save/extract-save-entities.js`
- `.dev/custom-ui-assets/prune-custom-ui-assets.txt` (names flagged as prune candidates in the report)

Generated/dependent files:
- `.dev/build-logs/save-assets-latest.*`, `.dev/build-logs/save-entities-latest.*`

Verification:
- `npm run tts-save:extract-assets`

Status: current.

## Custom UI assets (`CustomUIAssets`)

Hosted image URLs for HUD XML (`image="assetName"`). They are not table objects, but TTS still loads them during the Loading progress.

```text
npm run tts-save:extract-assets
```

Writes JSON, CSV, and Markdown under `.dev/build-logs/` with every `CustomUIAssets` / `CustomAssets` entry (Name, URL, category, reference sources, prune hints). **`candidate_prune`** means no reference was detected — verify before removing. Site cards show **`dynamic_only`** (used at runtime as `siteCard_<siteKey>`, not static HUD XML). To remove a row for good, delete its file from `assets/` (job-owned) or narrow the owning job; hand-deleting rows from the save is undone by the next build.

## World entities (`ObjectStates`)

The 1000+ loading count is mostly `CustomUIAssets` plus every node in `ObjectStates` (including bag contents). Workshop objects, dice, figurines, soundscape AssetBundles, and character sheets all live there.

```text
npm run tts-save:extract-entities
```

Writes `.dev/build-logs/save-entities-latest.{json,csv,md}` with per-object GUID, name, category, lock state, AssetBundle URL, `gGuidsKey` / `gGuidsKeys` (from `lib/guids.ttslua`), `gmNotes`, and a loading breakdown. Both inventories: `npm run tts-save:extract-save-inventory`.

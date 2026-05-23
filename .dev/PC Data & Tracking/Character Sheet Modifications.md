# Character Sheet Modifications

## General/Quick Changes

* Each page has a full-height transparent **inner-edge** button (`id="pageInner"`), similar to outer page-turn buttons. Odd pages use `page_inner_right` (spine on the right); even pages use `page_inner_left`.
* Clicking `pageInner` calls `GlobalSetSheetCamera` → `M.setCamera(clicker, "sheet" .. ownerSeat)` (e.g. Brown viewing Red's sheet → `sheetRed`).

## Blood Potency Decals

Blood Potency corresponds to several derived statistics and bonuses, as defined in `C.BloodPotency`.

### Workshop layout (static slot names)

Each derived stat is one **AttachedDecal** on the listed page. The decal **`name` is the stat key** and does not change at runtime:

| Stat key (`AttachedDecal.name`) | CSHEET Page |
| :-- | :-- |
| `bloodSurge` | `CSHEET_PAGE_1_<COLOR>` |
| `mending` | `CSHEET_PAGE_1_<COLOR>` |
| `baneSeverity` | `CSHEET_PAGE_2_<COLOR>` |
| `discBonus` | `CSHEET_PAGE_2_<COLOR>` |
| `discReroll` | `CSHEET_PAGE_2_<COLOR>` |

Slot lists: `C.BloodPotencyDecalSlots.page1` / `.page2`.

### Image variants (URL catalog)

At reconcile time, only the decal **`url`** changes. The image variant key is `"<statKey><value>"` (e.g. `"bloodSurge3"`), looked up in `C.BloodPotencyDecalUrls`. URLs are extracted from the mod save’s **`DecalPallet`** array (`{ Name, ImageURL }` per entry — not `CustomUIAssets`):

```text
node .tools/custom-ui-assets/extract-bp-decal-urls-from-save.js --saveName 230 --luaOut .dev/custom-ui-assets/bp-decal-urls.lua
node .tools/custom-ui-assets/merge-bp-decals-into-csheet-custom-ui-assets.js --save .dev/TS_Save_230.json
```

Symlink or copy: `.dev/TS_Save_230.json` → `%USERPROFILE%/OneDrive/Documents/My Games/Tabletop Simulator/Saves/TS_Save_230.json` (refresh after each TTS save).

### Reconcile pipeline

On load and whenever `PCST.refreshCharacterSheetsForColor` runs, `ui/ui_csheet.ttslua` → `applyBloodPotencyDecals` (pages 1–2 only) calls **`self.getDecals`**, builds the payload with **`lib/blood_potency_decals.ttslua`**, and calls **`self.setDecals`** in the **same object script VM** (TTS rejects decal tables built or returned via `Global.call`). Variant URLs must be registered on that object’s **`CustomUIAssets`** — merge from `DecalPallet` with `.tools/custom-ui-assets/merge-bp-decals-into-csheet-custom-ui-assets.js`. Missing slots, unexpected decal names, or invalid URLs **error loudly** — no legacy name shims.

Effective Blood Potency for decals matches sheet dots: `stats.bloodPotency.base + stats.bloodPotency.temp + resolvedStatChanges.bloodPotency` (via `GlobalGetResolvedStatChangesForPlayer` — location conditions such as `bumpBloodPotency` apply through `statChanges`, not persisted `temp`). Decals live on **pages 1–2 only**; refreshing page 3 alone does not update them — use `PCST.refreshCharacterSheetsForColor` or reload pages 1/2. After location reconcile with `{ skipPresentation = true }`, callers must run `PCST.refreshAllCharacterSheets()` (via `StorytellerScenesPanel` helpers) so page 1 dots and BP decals catch resolved condition statChanges — `Sync.full` alone does not refresh sheets.

### Dynamic page XML (pages 3–6)

Pages with PCS-driven layout use a **separate object entry** so template builders are not bundled on every sheet:

| Page | Object stub | Builder module | Status |
| :-- | :-- | :-- | :-- |
| 3 | `require("ui.ui_csheet_page3")` | `lib/csheet_page3_xml.ttslua` | Live (`self.UI.setXml`) |
| 4 | `require("ui.ui_csheet_page4")` | `lib/csheet_page4_xml.ttslua` | Live (`self.UI.setXml` from `lib/json/PC_Relationships.json`) |
| 5 | `require("ui.ui_csheet_page5")` | `lib/csheet_page5_xml.ttslua` | Placeholder |
| 6 | `require("ui.ui_csheet_page6")` | `lib/csheet_page6_xml.ttslua` | Placeholder |

Pages **1–2** and **7–8** use `require("ui.ui_csheet")`. Dynamic pages must not use the default entry — core errors if the matching `_G.CSHEET_PAGEN_LOCAL` module was not loaded via `ui/ui_csheet_pageN_local.ttslua`. Stubs are normalized by `npm run tts-objects:fix-stubs`.

Runtime `UI.setXml` strings cannot resolve editor `<Include>`; pages 3–4 prepend `lib/csheet_defaults_xml` via Lua and must not embed `<Include src="csheet_defaults.xml" />` in `ui/.templates/csheet/pageN.xml`. Page 4 relationship portraits and dividers must exist on each `CSHEET_PAGE_4_*` object (`npm run custom-ui-assets:merge-object-assets` from `lib/json/PC_Relationship_Images.json`).

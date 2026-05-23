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
```

Symlink or copy: `.dev/TS_Save_230.json` → `%USERPROFILE%/OneDrive/Documents/My Games/Tabletop Simulator/Saves/TS_Save_230.json` (refresh after each TTS save).

### Reconcile pipeline

On load and whenever `PCST.refreshCharacterSheetsForColor` runs, `ui/ui_csheet.ttslua` → `applyBloodPotencyDecals` (pages 1–2 only) reads merged stats via Global, resolves derived values and URLs via `lib/blood_potency_decals.ttslua`, and calls `setDecals` (preserving transform). Missing slots, unexpected decal names, or invalid URLs **error loudly** — no legacy name shims.

Object → Global calls must pass **one params table** per `Global.call()` (TTS ignores extra arguments), e.g. `Global.call("GlobalResolveBloodPotencyDecals", { stats = stats, pageNum = pageNum })`.

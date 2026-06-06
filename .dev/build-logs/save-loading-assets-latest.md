# TTS save loading asset inventory
## Summary
- Save: **Toronto Rising** (v14.2.1)
- Formula: `CustomUIAssets.length + ObjectStates nodes (recursive) excluding HandTrigger, Block*, Custom_Assetbundle`
- Global Custom UI: **579**
- ObjectStates (in loading bar model): **443**
- **Total loading rows: 1022** (expected ~1020; 2 more row(s) than expected — save may differ slightly from in-game snapshot, or TTS dedupes 1–2 entries at runtime.)
### Excluded from loading bar model
| Kind | Count |
| --- | ---: |
| HandTrigger | 6 |
| Block* | 34 |
| Custom_Assetbundle | 209 |
- Supplemental rows (asset bundles, sky, decal pallet): **239** in `*-extras.csv`
TTS reports engine-side Loading (N/M). This save-file model usually matches within a few rows; small drift is normal across TTS versions.
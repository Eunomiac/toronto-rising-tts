# TTS save loading asset inventory
## Summary
- Save: **Toronto Rising** (v14.2.1)
- Formula: `CustomUIAssets.length + ObjectStates nodes (recursive) excluding HandTrigger, Block*, Custom_Assetbundle`
- Global Custom UI: **586**
- ObjectStates (in loading bar model): **381**
- **Total loading rows: 967** (expected ~1020; 53 fewer row(s) than expected — check save path / version.)
### Excluded from loading bar model
| Kind | Count |
| --- | ---: |
| HandTrigger | 6 |
| Block* | 34 |
| Custom_Assetbundle | 209 |
- Supplemental rows (asset bundles, sky, decal pallet): **239** in `*-extras.csv`
TTS reports engine-side Loading (N/M). This save-file model usually matches within a few rows; small drift is normal across TTS versions.
# TTS save world entities

## Loading estimate

The in-game **Loading** bar counts work the engine does at spawn time. For this mod it aligns with:

| Bucket | Count | Where in save JSON |
| --- | ---: | --- |
| Custom UI images | 579 | `CustomUIAssets` (not 3D objects) |
| Table objects (total) | 693 | `ObjectStates` + nested `ContainedObjects` |
| — root objects only | 539 | top-level `ObjectStates[]` |
| — nested (bags/decks) | 154 | `ContainedObjects` children |
| Decal library | 29 | `DecalPallet` |
| **Estimated total** | **1272** | UI assets + all object nodes |

Snap points installed by scripts (control board, palette) are **not** in the save JSON until written back — they do not inflate this count.

### Objects by category

| Category | Count |
| --- | ---: |
| assetBundle | 210 |
| cardOrDeck | 200 |
| tile | 105 |
| figurine | 72 |
| block | 34 |
| diceBag | 22 |
| dice | 22 |
| other | 20 |
| handTrigger | 6 |
| board | 1 |
| token | 1 |

- Locked objects: 411
- Matched `lib/guids.ttslua` `G.GUIDS`: 186 / 693 (186 registry entries)
- Soundscape emitters (GUID in `lib/guids.ttslua`): 9
- Tab metadata keys: 12

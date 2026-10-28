# Complications deck assembly

## Agent routing

Read this when changing the card sheets, their sidecars, deck assembly, or the Full build hook.

Source of truth:
- PNGs in the configured assets directory, under `Deck of Complications/` (private, ignored by Git).
- `settings/*-settings.txt`: the original ordered sidecars, checked into this directory.
- `build-decks.js`: copy weights, source deck GUIDs and save patching.
- `.tools/cloud-asset-sync.jsonc`: `complicationsDeckSheets` manifest job.

Verification: `npm run complications:decks:test`, `npm run cloud-asset-sync:test`, `npm run complications:test`, asset ownership/reference gates, then load the patched save in TTS.

Status: implemented; Steam upload and TTS cold-load verification require the author's Windows/Steam environment.

## Install the private images

Put all eight PNGs into `assets/Deck of Complications/` (or the equivalent folder under your configured `assetsDir`). The local filenames add a `complicationsDeck_` prefix to the original Drive filenames:

```text
complicationsDeck_Very Common-Standard.png
complicationsDeck_Very Common-Enhanced.png
complicationsDeck_Common-Standard.png
complicationsDeck_Common-Enhanced.png
complicationsDeck_Uncommon-Standard.png
complicationsDeck_Uncommon-Enhanced.png
complicationsDeck_Rare-Standard.png
complicationsDeck_Rare-Enhanced.png
```

The prefix follows the cloud sync rule that every job has a distinctive filename prefix or suffix. The PNG bytes are unchanged. Sidecars retain their original `Face` filenames; the generator applies the prefix when locating the local PNG. Keep sidecars in this tool's `settings/` directory, outside `assets/`, so they are not uploaded to Steam Cloud. The private image ZIP supplied with this implementation can be extracted at the repository root when `assetsDir` uses its default location. The Drive originals remain untouched. Images and full saves are not committed to the public repository.

## Build and load

Finish any active Complications game and return any loose Complications cards to their source decks, then save in TTS. Close TTS, leave Steam running, and run:

```sh
npm run build:full
```

The Full pipeline runs cloud sync, Cloud consolidation, and then `complications:decks`. Main and XML builds do not upload or assemble decks. To run the two relevant steps directly:

```sh
npm run cloud-asset-sync
npm run complications:decks -- --dry-run
npm run complications:decks
```

Reload the patched save from TTS's Games menu. Save & Play alone uses TTS's in-memory objects and does not load disk changes. Standard contains 257 cards: 1×12 Very Common, 28×6 Common, 20×3 Uncommon and 17×1 Rare. Enhanced contains one each of all 66 identities. Both retain the existing shared card back and the source deck's GUID, pose and object settings (`11e747` Standard, `2d57f2` Enhanced).

The settings list's left-hand number is a one-based sheet position. The number in the filename is the card identity. Each `CardID` is `sheet ID * 100 + zero-based position`; GM Notes use the identity and name, with `:Enhanced` on Enhanced cards. Every Standard card has `deckOfComplications`; every Enhanced card also has `enhancedComplication`. Sheet IDs avoid existing definitions anywhere in the save, including object states; new card GUIDs avoid all existing objects. The 2×2 Very Common sheet contributes direct card records to each combined deck, without creating a single-card intermediate deck.

## Incremental and failure behavior

Each deck's GM Notes retain existing notes and add a `[complications-deck-build:v1:…]` fingerprint. It covers that variant's four PNG hashes, parsed sidecar settings/identities, copy counts, resolved face URLs and existing back URL. Unchanged fingerprints produce no save write or backup, even when playing has shuffled, drawn or cloned cards. A changed variant rebuilds only that source deck. Sidecar/URL changes also invalidate it, because those affect correct rendering or identity without necessarily changing PNG bytes.

Before assembly, all eight local PNGs must match both the manifest and the Cloud ledger's uploaded content key/URL. Missing or stale uploads print `WARN HOLD` and leave both decks untouched. Cloud sync also holds a job when the bytes at a previously uploaded path change but cannot be uploaded yet. It does not publish a fresh hash paired with an old URL.

Malformed settings, missing PNGs, dimension mismatches, duplicate/mismatched identities, missing/ambiguous source decks, or ambiguous existing backs fail the build before any deck write. A rebuild also fails while the save contains an active Complications game or tagged objects outside the two source decks. Finish/clean up and save from TTS, then retry. An unchanged build remains allowed during play.

Writes use the shared backup policy in `tts-assets.config.json` and atomic file replacement. All changes are prepared before writing; a concurrent disk-save change is detected before the backup/write. No Global state or unrelated objects are patched. The fingerprint is stored in the save rather than a machine-local cache, so TTS saves and copied saves retain it.

For offline review of a copied save (no Steam/TTS writes), use explicit paths:

```sh
npm run complications:decks -- --save work/TS_Save_230.json --assets-dir assets --manifest work/cloud-assets.json --dry-run
```

The manifest and assets ledger must describe actual uploaded images for a real build. Test-only URLs must never be installed into the live save.

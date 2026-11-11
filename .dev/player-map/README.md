# Toronto Rising Player Map

Public, player-facing interactive map for the Toronto Rising chronicle.

Public address: <https://toronto-rising-player-map.toronto-rising-player-map.workers.dev>

## Local development

```powershell
cd .dev/player-map
npm install
npm run data:build
npm run dev
```

`npm run data:build` reuses the production Sheet loader and exact export
contract. During the normal FULL pipeline it consumes the shared
`TR_EXPORT_SNAPSHOT`; during local work it uses the validated Dashboard cache
when available and otherwise fetches a fresh snapshot. Use `npm run
data:refresh` when you deliberately want to bypass the cache.

The canonical district and region geometry lives in
`data/source/toronto-rising-map.svg`. Generated GeoJSON in
`public/generated/` is reproducible and must not be edited by hand.
`data/district-priority.json` records the reviewed top-to-bottom winner order
used to close tiny gaps and cut district overlaps during every data build.
`data/diagnostics/normalization.json` records the resulting area changes and
must report zero remaining overlap.

`data/public-data-policy.json` is the explicit player-data privacy boundary.
The current public district facts are name, hunting difficulty, and positive
and negative resonance. `public/generated/sites.geojson` is intentionally
empty until individual player-visible sites and their allowed fields are
reviewed. Generated district, region, site, and provenance files must not be
edited by hand.

`public/generated/labels.geojson` supplies one deliberate point for each
district and region. Map labels render from those points rather than directly
from multipart polygons, preventing the same name from appearing once per
visible polygon or map tile.

The local development server also shows a **Debug notes** control. It lets the
author pin numbered feedback directly to a map location or interface surface.
Notes persist in `agent/debug-notes.json` for the next agent session. The
controls, comments, JSON data, and API do not exist in production builds. See
[`agent/Debug Notes.md`](agent/Debug%20Notes.md) for the shared workflow.

The **Map layers** control toggles districts and the three broad region
overlays. Revealed sites will use the same control, but it remains disabled
while the reviewed public site collection is empty. Non-default layer choices
are encoded in the `layers` URL parameter so a shared link restores the same
view.

## Visual calibration

Open `/?calibrate=1` to replace the district panel with the author-only visual
calibration controls. Width, height, east/west position, and north/south
position update live over the street map. The temporary result is stored in the
current browser and can be copied as JSON for promotion into the tracked
calibration data. These browser values are additional adjustments on top of the
published calibration; they do not change the public geometry by themselves.

## Verification

```powershell
npm run check
npm run test:browser
npm run test:debug-notes:browser
```

See `agent/Architecture.md`, `agent/Map Data Pipeline.md`, and
`agent/Running Tasklist.md` for accepted decisions and the phased plan.

## Cloudflare deployment

The application is deployed to Cloudflare Workers Free. Future releases use:

```powershell
cd .dev/player-map
npm run deploy
```

`npm run deploy` reruns data validation, type checking, unit tests, the
production build, and the desktop/mobile browser test before publishing.

To exercise the already-deployed application rather than a local preview:

```powershell
$env:PLAYER_MAP_BASE_URL='https://toronto-rising-player-map.toronto-rising-player-map.workers.dev'
npm run test:browser
```

The Worker reserves `/api/health` as the first server boundary. No persistent
storage is configured yet.

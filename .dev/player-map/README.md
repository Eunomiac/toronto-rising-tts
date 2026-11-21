# Toronto Rising Player Map

Public, player-facing interactive map for the Toronto Rising chronicle.

Public address: <https://toronto-rising-player-map.toronto-rising-player-map.workers.dev>

## Local development

**From Cursor / VS Code:** Run Task → **PLAYER MAP**. Checks map data, starts the local server at `http://127.0.0.1:5173`, and opens the **Cursor** Chrome profile (`npm run player-map:dev` from the repo root). That local server is the one with **Debug notes**. The public map on Cloudflare does not include them. A Full build already regenerates this map data from the same Sheet snapshot as the rest of the chronicle; the local task only checks that those files are still current.

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

Run `npm run diagnostics:view` to open the generated geometry review map over
the live basemap. Its controls compare source and final boundaries and can show
area added during gap repair, removed boundary area, every sequential overlap
cut, any remaining enclosed gap or overlap, and the calibration control and
validation residuals. Whole-city, downtown, and island camera presets make the
same report useful at several scales. Both diagnostic files are derived and
must not be edited by hand.

`data/public-data-policy.json` is the explicit player-data privacy boundary.
The current public district facts are name, hunting difficulty, and positive
and negative resonance. A site is public only when the export gives it a map
icon and X/Y coordinates. The generated site then carries its name, district,
icon, and whether it is a hub. Generated district, region, site, and provenance
files must not be edited by hand.

PATH uses the reviewed extraction configuration in `data/path-network.json`
and the dated OpenStreetMap response in
`data/source/osm-path-snapshot.json`. The normal build is deterministic and
never contacts Overpass. Run `npm run path:refresh` only when deliberately
updating that snapshot; review the resulting network and generated provenance
before committing it. The browser receives only the allowlisted route facts,
entrance points, interaction corridors, and one label—not raw OSM tags.

`public/generated/labels.geojson` supplies one deliberate point for each
district and region. Map labels render from those points rather than directly
from multipart polygons, preventing the same name from appearing once per
visible polygon or map tile. While the map moves, district labels are
throttled to a valid point in the largest visible part of their district and
finalized when movement stops; the generated point remains the fallback.

The local development server also shows a **Debug notes** control. It lets the
author pin numbered feedback directly to a map location or interface surface.
Notes persist in `agent/debug-notes.json` for the next agent session. The
controls, comments, JSON data, and API do not exist in production builds. See
[`agent/Debug Notes.md`](agent/Debug%20Notes.md) for the shared workflow.

The left **icon rail** opens Map Layers, Domains, and Sites. Map Layers lists
the four region overlays and the selectable districts (including PATH; Sewers
and Subway stay disabled until implemented). Orientation streets are always on
and follow `data/orientation-streets.json` (Primary first, then Orientation),
not the basemap's automatic road labels. PATH uses a fixed yellow legend over
the lake when that layer is on. Mapped sites are listed in the Sites menu and
drawn with their icons. Domains stays empty for now. Non-default layer choices
use the `layers` URL parameter so a shared link restores the same view.

Zooming out shows the distant city markers from `data/provincial-cities.json`
as red dots, the same treatment as Toronto, Kingston, and Montréal. The
chronicle-edge blur hides once the view is wide enough; there is no separate
Province button.

Rare fictional basemap changes use reviewed masks in `data/basemap-masks.json`
(polygon masks and georeferenced image overlays such as Giovanni Estate).
Generated mask GeoJSON must not be edited by hand.

Author GSAP experiments live in `src/gsap-effects.ts`. See `agent/GSAP Effects.md`.

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
From the repository root, `npm run player-map:deploy` performs the same
intentional map-only release. The normal `npm run build:full` path consumes its
single temporary Sheet snapshot, validates and builds the map before TTS save
bundling, and calls the unchecked `publish` command only as FULL's final step.
`TR_SKIP_PLAYER_MAP_PUBLISH=1` skips only that last external action for an
intentional offline diagnostic.

To exercise the already-deployed application rather than a local preview:

```powershell
$env:PLAYER_MAP_BASE_URL='https://toronto-rising-player-map.toronto-rising-player-map.workers.dev'
npm run test:browser
```

The Worker reserves `/api/health` and session pin routes:

- `GET /api/session/:code/pins` — public allowlisted pin snapshot for `?session=` on the map
- `POST /api/session/:code/pins` — Dashboard relay only (`Authorization: Bearer` + `PLAYER_MAP_PUSH_SECRET`)

Optional KV binding `SESSION_PINS` stores snapshots; without it the Worker keeps them in memory for that isolate. Configure the Dashboard `.env` with `PLAYER_MAP_ENDPOINT`, `PLAYER_MAP_SESSION_CODE`, and `PLAYER_MAP_PUSH_SECRET` to publish during play.

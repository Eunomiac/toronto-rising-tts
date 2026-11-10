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

The canonical district and region geometry lives in
`data/source/toronto-rising-map.svg`. Generated GeoJSON in
`public/generated/` is reproducible and must not be edited by hand.

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

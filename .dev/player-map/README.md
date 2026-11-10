# Toronto Rising Player Map

Public, player-facing interactive map for the Toronto Rising chronicle.

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

## Verification

```powershell
npm run check
npm run test:browser
```

See `agent/Architecture.md`, `agent/Map Data Pipeline.md`, and
`agent/Running Tasklist.md` for accepted decisions and the phased plan.

## Cloudflare deployment

The Worker package is ready and its static assets plus `/api/health` route pass
locally and in Wrangler's dry run. The first real publication needs a one-time
Cloudflare sign-in:

```powershell
cd .dev/player-map
npx wrangler login
npm run deploy
```

`wrangler login` opens Cloudflare's authorization page in your browser. A free
Cloudflare account is sufficient. `npm run deploy` reruns data validation,
type checking, unit tests, the production build, and the desktop/mobile browser
test before publishing. Wrangler prints the resulting `workers.dev` address.

# Deck of Complications (web)

Player-facing Toronto Rising minigame. Chronicle-table UI, GSAP motion, subtle SFX, Cloudflare Durable Object rooms.

## Local

```bash
cd .dev/deck-of-complications/web
npm install
npm run assets
npm run catalog
npm test
npm run dev          # Vite at http://127.0.0.1:5173  — open /solo
```

Multiplayer locally:

1. Copy `.dev.vars.example` → `.dev.vars` and set `HOST_SECRET`.
2. `npm run build && npm run dev:worker` (serves API + built assets on :8787).
3. `POST /api/create` with header `x-host-secret` and JSON body `{ "target": { "color":"Red","rollId":"r1","rollType":"launch","playerLabel":"Test","margin":-3 } }`.

## Live URL

https://toronto-rising-complications.toronto-rising-player-map.workers.dev

- Solo practice: `/solo`
- Dashboard needs `COMPLICATIONS_API_URL` + `COMPLICATIONS_HOST_SECRET` in `.dev/storyteller-dashboard/.env`

## Deploy (Cloudflare)

From this folder:

```bash
npx wrangler login
npx wrangler secret put HOST_SECRET
# PUBLIC_ORIGIN is set in wrangler.jsonc
npm run deploy          # assets + catalog + build + wrangler deploy
```

From the repo root (preferred):

```bash
npm run complications:web:assets    # sync ../assets → public/assets (gitignored)
npm run complications:web:build     # catalog + assets + vite build
npm run complications:web:deploy    # build + publish
npm run complications:web:publish   # wrangler deploy only (dist already built)
```

`npm run build:full` runs `complications:web:build` during tooling and
`complications:web:publish` at the end (after Player Map publish). Skip with
`TR_SKIP_COMPLICATIONS_WEB_PUBLISH=1`.

Linear: **TOR-796**.

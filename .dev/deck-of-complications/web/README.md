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

## Deploy (Cloudflare)

```bash
npx wrangler login
npx wrangler secret put HOST_SECRET
# set PUBLIC_ORIGIN var to your worker URL after first deploy
npm run deploy
```

Linear: **TOR-796**.

# Player Map Architecture

## Agent Routing

Read this when:
- choosing or changing the Player Map's application stack, hosting, state ownership, privacy boundary, or verification policy
- adding a dependency that affects the whole Player Map

Sources of truth:
- this document for accepted architectural decisions
- `Map Data Pipeline.md` for geometry and Google Sheet ingestion
- current Player Map code once implementation exists

Verification:
- keep architectural claims consistent with the actual package, build, deployment workflow, and browser behavior

Status:
- planning; core front-end stack accepted, hosting and server-side needs still to be decided

## Product Boundary

The Player Map is a public player-facing web application built around an interactive map of Toronto. It is not an extension of the Storyteller Dashboard and must not expose Dashboard data, Storyteller-only state, unrevealed sites, hidden NPC activity, secrets, or private chronicle notes.

The source stays in this repository under `.dev/player-map`. Being under `.dev` does not prevent web deployment: Vite can build from this directory, and a deployment workflow can publish only its generated `dist` directory.

## Accepted Front-End Stack

| Concern | Decision | Notes |
| --- | --- | --- |
| UI | React with TypeScript | Use strict TypeScript and typed domain models. |
| Development/build | Vite | The Player Map gets its own `package.json`, lockfile, TypeScript configuration, and Vite configuration, like the Storyteller Dashboard. It must not inherit the root CommonJS package implicitly. |
| Styling | SCSS only | Use nesting for related descendants, pseudo-classes, state classes, and media queries. Do not add parallel hand-authored CSS sources. |
| Animation | GSAP | Use for deliberate sequences, map-panel transitions, SVG effects, and other motion that benefits from a timeline. Use CSS for simple hover/focus transitions. |
| Map renderer | MapLibre GL JS | Render the street map and interactive GeoJSON layers without tying the application to Google Maps. The basemap/tile provider is a separate decision. |
| District/region geometry | GeoJSON generated from the canonical SVG | The browser must not interpret the Illustrator export directly as application data. |
| Automated checks | Vitest, React Testing Library, and Playwright | Unit-test data/state logic and exercise the real built map in a browser. |

GSAP's current standard licence permits this application, including commercial use. Keep motion optional under `prefers-reduced-motion` and clean up animation contexts when React components unmount.

MapLibre supports a real zoomable and pannable street map, bounded to the chronicle's play area, with districts, regions, domains, sites, and future activity layers as independently styled and clickable sources. The initial implementation should use `maxBounds`, an intentional minimum and maximum zoom, and no map pitch or rotation unless a later design needs them.

## SCSS Policy

Follow the repository's established nesting preference:

- Nest descendants, pseudo-classes, state classes, and media queries inside their component block.
- Use `&-part` or `&__part` consistently for elements that belong to the same component family.
- Keep genuinely separate components as separate top-level blocks.
- A depth of three or four levels is normal. Split a component into a partial instead of creating a deeply coupled selector tree.
- Put colours, spacing, type, layer order, and motion values in shared design tokens rather than repeating literal values.
- Keep focus styles and touch targets first-class; the visual design must remain usable without a mouse.

## Single Source of Truth

"Single source of truth" means that every fact has exactly one authoritative owner. It does not mean forcing unlike data into one file.

| Kind of fact | Authoritative source |
| --- | --- |
| District names, hunting difficulty, resonance, aspects, conditions, domain-control values, and other authored location content | `EXPORT_LOCATIONS_DISTRICTS` in the Toronto Rising Google Sheet |
| Site content already represented by the production export | `EXPORT_LOCATIONS_SITES` in the same Sheet |
| District and region boundaries | the canonical Illustrator-exported SVG |
| Which source fields are safe and intended for players | an explicit, reviewed public projection in the Player Map build scripts |
| UI-only state such as an open panel, selected overlay, or current filter | the running React application |
| Persistent player or shared campaign state, if introduced | the future server/database, not the browser bundle |

Generated JSON, GeoJSON, TypeScript types, and map diagnostics are derived products. They must be reproducible and must never become alternate hand-edited sources.

The Player Map should reuse `.dev/scripts/lib/sheet_exports.js` and the exact spreadsheet export contract rather than fetching and parsing a second informal view of the Sheet. The details are in `Map Data Pipeline.md`.

## Public/Private Security Boundary

Everything downloaded by the browser is public, even if React never displays it. Hiding a feature, removing it from a menu, obscuring it on the map, or encoding it in a bundle does not protect it.

Therefore:

- The build publishes an allowlisted player-safe projection, never raw Sheet rows.
- Browser-visible map-provider tokens must be public, origin-restricted tokens. No private API credential belongs in Vite environment variables exposed to client code.
- Storyteller-only facts and unrevealed activity must remain behind a server authorization check or stay out of the deployment entirely.
- A public build must fail on an unexpected field rather than quietly shipping it.

## Hosting Recommendation

GitHub Pages can host the first version. Vite officially supports a GitHub Actions deployment, and keeping the app in `.dev/player-map` is not a problem. Without a custom domain the Vite base path would be `/toronto-rising-tts/`. GitHub Pages is, however, static hosting: it cannot itself run an API, authenticate players, protect hidden data, or save shared campaign state.

Because the planned scope may include persistent minigame results, player-specific visibility, and hidden NPC activity, the recommended production host is **Cloudflare Workers with static assets**, not GitHub Pages. It can serve the same Vite build now and add API routes and storage later without moving the public application to a second platform. Cloudflare now recommends Workers as its primary platform for new projects; Pages remains viable but is no longer the preferred starting point for this shape of application.

This is not a lock-in at the application level. Keep the React/Vite client host-neutral:

- no provider-specific code in React components
- all server calls behind a small typed API client
- all deployment configuration outside domain and presentation code

**Decision still required:** use GitHub Pages for a deliberately static first release, or begin on Cloudflare Workers to reserve a clean path to authenticated and persistent features.

References:
- [Vite static deployment and GitHub Pages](https://vite.dev/guide/static-deploy.html)
- [GitHub Pages site and custom build guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [GSAP pricing and current free-use statement](https://gsap.com/pricing/)

## Application State

Do not interpret "single source of truth" as "put everything in one global store." Keep ownership narrow:

- MapLibre owns camera movement while the map is active; React receives only state that affects the rest of the interface or needs a shareable URL.
- React owns transient interface state.
- Loaded public data is immutable and validated before it reaches components.
- Domain operations live in typed modules rather than inside map click handlers.
- If a global client store becomes useful, select it after the first interaction spike. Do not add Redux or Zustand only to hold a selected district and two toggles.

Selected district/site and visible overlay choices should be representable in the URL, so a player can share a useful view. Prefer query parameters for the initial single-page map; this also avoids deep-link routing problems on static hosting.

## Performance and Accessibility Baseline

- Design for current desktop and tablet browsers first; confirm whether phones are a supported primary surface before layout work.
- Load map layers and large artwork on demand where practical.
- Prefer MapLibre style expressions and feature state over rebuilding full GeoJSON sources for hover/selection effects.
- Honour keyboard navigation, visible focus, sufficient contrast, screen-reader names, and reduced motion from the first component.
- Never make colour the only indication of domain ownership, conflict, difficulty, or resonance.
- Keep map controls usable with mouse, keyboard, and touch.

## Verification Policy

Every implementation should run, at minimum:

1. TypeScript type checking.
2. Unit tests for changed data/state behavior.
3. A production Vite build.
4. A focused Playwright pass against the built or development application at a desktop viewport and a supported small viewport.
5. Browser console and failed-network-request inspection during the exercised path.

Map-data changes additionally follow the validation and visual diagnostic checks in `Map Data Pipeline.md`.

## Decisions Still Needed

Before the first public deployment, determine:

1. Hosting: GitHub Pages for static-only scope, or Cloudflare Workers for a ready server boundary.
2. Public address: provider subdomain or a custom domain.
3. Basemap and tile provider, including attribution, rate limits, token restrictions, and visual styling rights.
4. Supported devices: desktop/tablet only, or a fully useful phone layout as well.
5. Whether any first-release feature needs login, persistent player identity, shared state, or Storyteller-controlled reveals.
6. How a Sheet edit triggers publication: manual deployment, scheduled build, or an explicit release command.
7. Whether the first release needs a faithful raster "chronicle map" overlay in addition to the live street basemap.

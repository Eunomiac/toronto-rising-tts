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
- current; Phase 1 application published and verified on Cloudflare Workers Free

## Product Boundary

The Player Map is a public player-facing web application built around an interactive map of Toronto. It is not an extension of the Storyteller Dashboard and must not expose Dashboard data, Storyteller-only state, unrevealed sites, hidden NPC activity, secrets, or private chronicle notes.

No player login is planned. Treat the address and everything it serves as public even though it will normally be shared only with the chronicle's players. This is safe as long as the deployed app contains only player-safe information.

The source stays in this repository under `.dev/player-map`. Being under `.dev` does not prevent web deployment: Vite can build from this directory, and a deployment workflow can publish only its generated `dist` directory.

## Accepted Front-End Stack

| Concern | Decision | Notes |
| --- | --- | --- |
| UI | React with TypeScript | Use strict TypeScript and typed domain models. |
| Development/build | Vite | The Player Map gets its own `package.json`, lockfile, TypeScript configuration, and Vite configuration, like the Storyteller Dashboard. It must not inherit the root CommonJS package implicitly. |
| Styling | SCSS only | Use nesting for related descendants, pseudo-classes, state classes, and media queries. SCSS owns static styling and responsive layout; do not add parallel hand-authored CSS sources. |
| Animation | GSAP | GSAP owns all authored UI motion and animated style changes. Do not add CSS transitions or keyframe animations that can compete with it. |
| Map renderer | MapLibre GL JS | Render the street map and interactive GeoJSON layers without tying the application to Google Maps. The basemap/tile provider is a separate decision. |
| Surface district/region geometry | GeoJSON generated from the canonical SVG | The browser must not interpret the Illustrator export directly as application data. |
| PATH network geometry | Generated OpenStreetMap snapshot | Extract broadly tagged indoor/underground pedestrian routes within a reviewed downtown catchment; official branding and perfect real-world accuracy are not required. |
| Automated checks | Vitest, React Testing Library, and Playwright | Unit-test data/state logic and exercise the real built map in a browser. |

GSAP's current standard licence permits this application, including commercial use. Keep motion optional under `prefers-reduced-motion` and clean up animation contexts when React components unmount.

### Animation ownership

Use one animation owner for each surface:

- SCSS defines the resting appearance, layout, responsive rules, hover/focus appearance where no interpolation is required, and accessibility fallbacks.
- GSAP performs all authored UI interpolation: transforms, opacity, colours, panel movement, SVG effects, and transitions between React states.
- MapLibre owns camera movement and animation inside its rendered map. Use its camera and style APIs rather than trying to animate its WebGL canvas with GSAP.

Do not put a CSS `transition` or `@keyframes` animation on a property that GSAP may control. GSAP caches transform state and applies animated CSS as inline styles; two systems writing the same property can produce jumps or stale values. This is an application policy rather than a claim that GSAP requires all static styling to be written in JavaScript.

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

GitHub Pages is fully adequate if the application remains player-safe and any saved preferences or progress may remain local to each browser. Omitting unrevealed information from the published data is the correct protection; there is no requirement that a player-facing application carry Storyteller data at all.

Because the planned scope may include persistent minigame results, player-specific visibility, or shared activity state, the recommended production host is **Cloudflare Workers with static assets**, not GitHub Pages. It can serve the same Vite build now and add API routes and storage later without moving the public application to a second platform. Cloudflare now recommends Workers as its primary platform for new projects; Pages remains viable but is no longer the preferred starting point for this shape of application.

The Workers Free plan is sufficient for the expected player count. Static asset requests are free and unlimited; the free dynamic allowance is currently 100,000 Worker requests per day. If structured shared storage becomes useful, D1 is available on the free plan with limits far above this chronicle's expected use. Exceeding a free-tier limit stops the affected dynamic requests rather than silently moving the project onto usage billing.

Cloudflare supplies a free `workers.dev` address. A custom domain is optional and is the only expected hosting-related purchase for this scale of application; its annual registration fee depends on the chosen name and top-level domain.

**Current public address:** <https://toronto-rising-player-map.toronto-rising-player-map.workers.dev>. Keep this free address unless a custom domain becomes worth its registration cost.

This is not a lock-in at the application level. Keep the React/Vite client host-neutral:

- no provider-specific code in React components
- all server calls behind a small typed API client
- all deployment configuration outside domain and presentation code

**Accepted decision:** begin on the Cloudflare Workers Free plan. The first release may remain entirely static while reserving a free server/database boundary, so later feature ideas do not need to be decided now.

References:
- [Vite static deployment and GitHub Pages](https://vite.dev/guide/static-deploy.html)
- [GitHub Pages site and custom build guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers static-asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Cloudflare Workers and D1 pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [GSAP pricing and current free-use statement](https://gsap.com/pricing/)
- [GSAP CSS property and transform handling](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/)

## Application State

Do not interpret "single source of truth" as "put everything in one global store." Keep ownership narrow:

- MapLibre owns camera movement while the map is active; React receives only state that affects the rest of the interface or needs a shareable URL.
- React owns transient interface state.
- Loaded public data is immutable and validated before it reaches components.
- Domain operations live in typed modules rather than inside map click handlers.
- If a global client store becomes useful, select it after the first interaction spike. Do not add Redux or Zustand only to hold a selected district and two toggles.

Selected district/site and visible overlay choices should be representable in the URL, so a player can share a useful view. Prefer query parameters for the initial single-page map; this also avoids deep-link routing problems on static hosting.

## Author Debug Notes

Duplicate the Storyteller Dashboard's note-pin workflow for Player Map design
and debugging. This is an author-and-agent development tool, not a player
feature.

The local development server provides a **Debug notes** toggle with **Add note**
and **Show notes** controls. While adding, clicking the map, a control, a panel,
or a popup places a numbered pin and opens its comment editor without allowing
that click to trigger the underlying application action. Escape or toggling the
control exits placement mode.

Use two anchor types:

- Map pins store longitude/latitude and remain attached to the same geographic
  location while the map pans and zooms.
- Interface pins store a stable surface identifier and normalized coordinates
  relative to the relevant panel, popup, or control surface.

Each note also records enough context to reproduce what the author saw: current
URL state, selected district/site, visible layers, map centre and zoom, viewport
size, comment, optional agent reply, and creation/update timestamps. Store notes
in a tracked file under `agent/` through a development-only API, following the
Dashboard's `agent/lab-notes.json` and `/api/lab-notes` model. Stable numbered
IDs allow the author and agents to discuss individual pins unambiguously.

Agents process the note file in one pass: inspect each pin in context, implement
clear requests, write a concise `reply` where clarification or explanation is
needed, and remove resolved pins. Preserve unresolved pins. The UI must support
showing/hiding all pins without deleting them.

The notes, controls, API, and stored comments must be absent from production
builds and Cloudflare deployments. Comments may contain spoilers, private design
discussion, or Storyteller-only information and therefore must never enter the
public browser bundle.

### What persistence and shared state mean

GitHub Pages does not prevent the application from using browser storage:

- `localStorage` or IndexedDB can remember preferences, progress, or minigame results on the same browser profile and device.
- That data is not automatically available on another phone/computer or in another browser.
- It is not shared with other players or the Storyteller.
- A player can clear or edit it, so it cannot be authoritative for secret or rules-enforced state.

"Shared state" means information that several players should see consistently, such as a common investigation result, the current revealed sites, a city-wide activity board, or a Storyteller-triggered change. "Persistent server state" means that information survives browser changes and is stored somewhere the players cannot casually alter. Those capabilities need an API and storage such as a Cloudflare Worker with D1; they do not need to be built until a feature actually requires them.

An NPC-activity system needs a server only if its inputs must stay hidden—for example, secret NPC locations, plans, or detection probabilities from which the app reveals partial clues. A fully client-side version is safe when the browser receives only player-visible inputs and outputs, or when its locally stored result is not intended to be authoritative.

## Basemap Decision

Use **OpenFreeMap** for the first implementation. Its public instance currently requires no registration or API key and states that it has no map-view or request limits. It uses OpenStreetMap data, permits commercial use, provides several ready-made styles, and allows a customized style JSON to be hosted with the application.

Start from its `Dark` or `Fiord` style and create the chronicle palette in Maputnik if the data coverage and label quality around Toronto are satisfactory. Keep the style URL isolated in configuration so changing providers later does not affect map components.

The tradeoff is that the free public instance has no service-level guarantee or personalized support. If reliability ever becomes a concern, the compatible fallback is a paid provider or a Toronto-only self-hosted PMTiles archive; MapLibre and the application's GeoJSON overlays would remain unchanged.

References:
- [OpenFreeMap service, terms, attribution, and limits](https://openfreemap.org/)
- [OpenFreeMap MapLibre and custom-style setup](https://openfreemap.org/quick_start/)

## Performance and Accessibility Baseline

- Treat phones as a primary supported surface alongside desktop and tablets. Controls and panels must be designed mobile-first rather than merely scaled down after desktop implementation.
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

Before adding features that require private or durable server data, determine:

1. Whether any first-release feature needs persistent player identity, cross-device state, shared state, or Storyteller-controlled reveals.
2. Whether a custom domain is worth purchasing later. The free `workers.dev` address is the accepted current address.

Confirmed product decisions:

- Phones are a primary supported surface.
- The app has no planned login and publishes only player-safe information.
- Host the application on the Cloudflare Workers Free plan.
- Use OpenFreeMap as the basemap provider, subject to the implementation spike confirming Toronto coverage and visual suitability.
- Generate, validate, and publish Player Map data through the existing TTS FULL build pipeline using its shared Sheet snapshot.
- The original illustrated map will not be shipped as a raster overlay unless a later need emerges; the live basemap and generated vector overlays should replace it.

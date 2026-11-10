# Player Map Running Tasklist

This is the working plan for the public Player Map. It is not the Storyteller Dashboard tasklist and does not use the Dashboard's verification queue.

## Current Status

The Phase 1 application is implemented and publicly deployed. It renders the live OpenFreeMap
basemap, all 32 district vectors, district hover/click/keyboard selection, a
mobile-first details panel, shareable district URLs, and a reserved Worker API
health route. The public address is
<https://toronto-rising-player-map.toronto-rising-player-map.workers.dev>.
The deployed homepage, health route, desktop interaction path, and Pixel 7-sized
interaction path were verified after publication.

## Decisions Recorded

- [x] Keep the application in this repository under `.dev/player-map`.
- [x] Use React and strict TypeScript.
- [x] Use Vite for development and production builds.
- [x] Use SCSS with the repository's nesting-first policy.
- [x] Use GSAP for all authored UI motion and animated style changes; SCSS owns static styling and responsive layout, with no competing CSS transitions or keyframes.
- [x] Use MapLibre GL JS as the interactive map renderer.
- [x] Treat the Toronto Rising production exports as the sole source for authored district/site facts.
- [x] Treat the Illustrator SVG as the sole source for surface district/region geometry.
- [x] Treat PATH as a network District generated from a broad, dated OpenStreetMap indoor/underground pedestrian extraction rather than an SVG surface polygon.
- [x] Generate validated public JSON/GeoJSON; do not make generated data a hand-edited source.
- [x] Keep Storyteller-only and unrevealed information out of the browser bundle.
- [x] Do not require player authentication; treat the shared address as public and publish only player-safe data.
- [x] Use Cloudflare Workers Free as the first public host; begin with static assets while preserving the option to add a Worker API and D1 later.
- [x] Use OpenFreeMap as the initial basemap/tile provider and verify Toronto coverage, attribution, reliability, and style customization during the first spike.
- [x] Treat phone-sized screens as a primary supported surface alongside desktop and tablets.
- [ ] Decide whether the first release needs cross-device/shared state or Storyteller-controlled reveals. Same-browser persistence can use local storage without a server.
- [x] Use Cloudflare's generated `workers.dev` address initially; a paid custom domain remains an optional later upgrade.
- [x] Do not ship the original illustrated map as a raster overlay unless a later need emerges.
- [x] Publish updated player-safe data through the existing TTS FULL build pipeline using its single validated Sheet snapshot.

## Source Assets

- [x] Prepare named `DISTRICTS` and `REGIONS` groups in Illustrator.
- [x] Repair the reported open paths and remove stray points.
- [x] Export the full-artboard SVG with stable district and region keys.
- [x] Confirm paths and polygons are both valid inputs.
- [x] Confirm mixed explicit `evenodd` and default nonzero fill rules are valid and must be preserved.
- [x] Inspect the corrected export: 32 geographical district features, three region features, no transforms, and no blank or duplicate IDs.
- [x] Copy the approved SVG into the Player Map's tracked `data/source` directory when implementation begins.
- [ ] Record the four non-geographical Sheet district exceptions in a reviewed coverage manifest.

## Phase 1 — Technical Spikes

- [x] Create the isolated Player Map package and lockfile.
- [x] Add React, TypeScript, Vite, Sass, GSAP, MapLibre, Vitest, Testing Library, and Playwright.
- [x] Render a bounded Toronto basemap with the intended visual style.
- [x] Establish SVG-to-map ground-control points and measure georeferencing error. The rectangle-preserving fit has roughly 14-metre control RMS and a 27-metre independent checkpoint; expand the control set before final geometry approval.
- [x] Parse all district and region SVG features while preserving holes and fill rules.
- [x] Prototype narrow-gap and overlap normalization with diagnostic output. This is deliberately not the runtime geometry until Phase 2 adds a reviewed winner manifest.
- [x] Load generated district GeoJSON and prove hover, keyboard selection, click selection, shareable URL state, and a details panel.
- [x] Deploy the spike to Cloudflare Workers Free and confirm its public address, homepage, `/api/health` route, and desktop/mobile browser behavior.

## Phase 2 — Data Pipeline

- [ ] Reuse the production Sheet loader and exact export contract.
- [ ] Define and review the first player-safe district field allowlist.
- [ ] Create a typed public-data schema and fail on unexpected fields.
- [ ] Join Sheet facts to geometry by exact key.
- [ ] Generate districts, regions, sites, and provenance manifest outputs.
- [ ] Add the broad downtown PATH extraction rules, bounds, optional false-positive exclusions, and OpenStreetMap provenance to the build pipeline.
- [ ] Generate PATH route, entrance/vertical-connection, interaction-corridor, and single-label-point outputs.
- [ ] Give PATH network geometry dedicated validity, bounds, provenance, and non-empty checks instead of surface-polygon topology checks.
- [ ] Add key, schema, topology, bounds, privacy, and count validation.
- [ ] Add visual diagnostics for gaps, removed overlaps, boundary movement, and georeferencing.
- [ ] Add Player Map data generation to FULL using the existing `TR_EXPORT_SNAPSHOT` rather than a second Sheet fetch.
- [ ] Add Player Map checks and its production Vite build before TTS save bundling.
- [ ] Add Cloudflare publication as FULL's final stage so failed builds never publish.
- [ ] Add a separate `player-map:deploy` command for intentional map-only releases and troubleshooting.

## Phase 3 — First Useful Release

- [ ] Build the full-screen map shell and responsive controls.
- [ ] Add district selection and player-safe district details.
- [ ] Add layer controls for districts, regions, and revealed sites.
- [ ] Add a toggleable PATH layer with selectable tunnel routes, entrance markers at closer zooms, and one intentional map label.
- [ ] Add shareable URL state for selection and visible overlays.
- [ ] Add loading, empty, error, keyboard, touch, and reduced-motion behavior.
- [ ] Add unit, component, and Playwright coverage for the release path.
- [ ] Deploy to the selected host and verify the public address on desktop and the supported smaller viewport.

## Later Features — Not Yet Designed

- [ ] Hunting difficulty and resonance visualization.
- [ ] Domain ownership and conflict overlays.
- [ ] Rich site-of-interest details and reveal rules.
- [ ] NPC-activity detection/minigame design.
- [ ] Persistent player or campaign state, if required.
- [ ] Storyteller-controlled reveals, if required.

Do not turn these placeholders into implementation assumptions. Each feature needs a short rules, visibility, persistence, and source-of-truth decision before development.

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
An author-only visual calibration panel is available through `/?calibrate=1`.
The first reviewed result has been promoted to tracked calibration data: an
additional `0.996` horizontal scale, `1.0025` vertical scale, 9-metre eastward
shift, and 11-metre northward shift anchored at the west and north edges. The
panel now starts from a fresh identity baseline for any further refinement.
The runtime geometry is canonicalized, expanded by the reviewed one-pixel
tolerance, and cut in the explicit Illustrator top-to-bottom priority order.
The latest generated diagnostic reports zero remaining district overlap.

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
- [x] Keep the first release stateless and free of Storyteller-controlled reveals. Same-browser author tooling may use local storage; shared campaign state remains a later feature decision.
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
- [x] Record `PATH`, `Sewers`, `Streets`, and `Subway` as the four reviewed non-geographical Sheet district exceptions in the public-data policy.

## Phase 1 — Technical Spikes

- [x] Create the isolated Player Map package and lockfile.
- [x] Add React, TypeScript, Vite, Sass, GSAP, MapLibre, Vitest, Testing Library, and Playwright.
- [x] Render a bounded Toronto basemap with the intended visual style.
- [x] Establish SVG-to-map ground-control points and measure georeferencing error. The rectangle-preserving fit has roughly 25-metre control RMS and a 50-metre independent checkpoint after the reviewed visual correction; expand the control set before final geometry approval.
- [x] Add a browser-persistent visual calibration panel for live scale and position refinement without skewing the rectangular geometry.
- [x] Parse all district and region SVG features while preserving holes and fill rules.
- [x] Prototype narrow-gap and overlap normalization with diagnostic output.
- [x] Promote the reviewed priority manifest and sequential overlap cuts into the runtime district GeoJSON.
- [x] Load generated district GeoJSON and prove hover, keyboard selection, click selection, shareable URL state, and a details panel.
- [x] Deploy the spike to Cloudflare Workers Free and confirm its public address, homepage, `/api/health` route, and desktop/mobile browser behavior.

## Known Geometry Defects — Resolve Before Final Approval

- [x] Promote overlap normalization from diagnostic-only output into the runtime district GeoJSON using the reviewed district-priority manifest. Generated diagnostics account for every cut and report zero remaining overlap.
- [x] Repair Yorkville's malformed geometry. Polygon canonicalization removes its self-intersection before priority cutting; the live map no longer shows the diagonal wedge.
- [x] Repair the Bay Street Financial District's malformed geometry through the same canonicalization stage and verify it in the live map.

## Phase 2 — Data Pipeline

- [x] Reuse the production Sheet loader and exact export contract.
- [x] Define and review the first player-safe district field allowlist: key, name, hunting difficulty, positive resonance, and negative resonance.
- [x] Create a typed public-data schema and fail on unexpected fields in both the generator and browser loader.
- [x] Join Sheet facts to geometry by exact key, requiring all 32 surface districts and the four reviewed Sheet-only exceptions.
- [x] Generate districts, regions, sites, and provenance manifest outputs. Sites are intentionally an empty collection until individual public sites and fields are reviewed.
- [ ] Add the broad downtown PATH extraction rules, bounds, optional false-positive exclusions, and OpenStreetMap provenance to the build pipeline.
- [ ] Generate PATH route, entrance/vertical-connection, interaction-corridor, and single-label-point outputs.
- [ ] Give PATH network geometry dedicated validity, bounds, provenance, and non-empty checks instead of surface-polygon topology checks.
- [x] Add key, schema, topology, bounds, privacy, and count validation for the current surface-district, region, and empty-site package.
- [ ] Add visual diagnostics for gaps, removed overlaps, boundary movement, and georeferencing.
- [ ] Add Player Map data generation to FULL using the existing `TR_EXPORT_SNAPSHOT` rather than a second Sheet fetch.
- [ ] Add Player Map checks and its production Vite build before TTS save bundling.
- [ ] Add Cloudflare publication as FULL's final stage so failed builds never publish.
- [ ] Add a separate `player-map:deploy` command for intentional map-only releases and troubleshooting.

## Phase 3 — First Useful Release

- [x] Build the full-screen map shell and responsive controls.
- [x] Add district selection and player-safe district details, including Sheet-backed hunting difficulty and resonance.
- [ ] Add layer controls for districts, regions, and revealed sites.
- [ ] Add a toggleable PATH layer with selectable tunnel routes, entrance markers at closer zooms, and one intentional map label.
- [ ] Add shareable URL state for selection and visible overlays.
- [ ] Add loading, empty, error, keyboard, touch, and reduced-motion behavior.
- [x] Add the development-only Debug notes toggle with Add note and Show notes controls, matching the Storyteller Dashboard workflow.
- [x] Anchor map pins by longitude/latitude and interface pins by stable surface plus normalized coordinates.
- [x] Persist numbered notes, reproduction context, comments, and agent replies through a tracked `agent/` file and development-only API.
- [x] Exclude debug-note controls, API routes, data, and comments from every production build and Cloudflare deployment.
- [x] Document the one-pass agent workflow for replying to, preserving unresolved, and clearing resolved pins.
- [x] Add unit, component, and Playwright coverage for the current release path on desktop and a Pixel 7-sized viewport.
- [x] Deploy the Phase 1 release to Cloudflare and verify the public address on desktop and the supported smaller viewport. Later slices still require their own deployment verification.

## Map Presentation Backlog — Captured, Not Scheduled

These are accepted presentation directions, but they are not yet scheduled into
a release phase. Verify their visual behavior, mobile performance, accessibility,
and data ownership during implementation.

- [ ] De-emphasize the basemap outside the established square chronicle setting boundary with a pointer-transparent CSS overlay using `backdrop-filter` blur and brightness. Prefer an inverse rectangular mask or four screen-space panels whose projected edges follow the map while panning and zooming. Provide a simple dimmed-overlay fallback and verify the blur on supported phones.
- [ ] Explore a very distant provincial-scale zoom level where story-relevant cities such as Montreal and Kingston appear as simple point markers rather than detailed playable map areas.
- [ ] Replace or supplement the selected-district opacity treatment with a less obscuring edge treatment, such as an outline glow that leaves streets and labels readable.
- [ ] Add a custom orientation-street layer with bold white labels driven by an explicit allow list of the major streets used to help players locate themselves. Keep its routes and labels independent of the basemap's automatic road-label selection so their styling, repetition, and zoom visibility remain under app control.
- [ ] Support rare fictional basemap changes with small custom polygon masks rather than a general-purpose basemap editor. The only currently known case is the comparatively barren Giovanni Estate in Wychwood: cover the unwanted building and house detail at an appropriate layer depth, then add replacement geometry or a label only if needed.
- [ ] Guarantee exactly one visible label per District at every zoom level with a dedicated one-point-per-District label source. Recalculate each point from the largest part of the District intersecting the visible map viewport so a partially visible District keeps its label onscreen; choose a valid interior point, throttle recalculation while the map moves, finalize it when movement stops, and retain a fixed preferred anchor as a fallback. Verify the approach on mobile rather than relying on automatic labels from tiled multipart polygons.

## Later Features — Not Yet Designed

- [ ] Hunting difficulty and resonance visualization.
- [ ] Domain ownership and conflict overlays.
- [ ] Rich site-of-interest details and reveal rules.
- [ ] NPC-activity detection/minigame design.
- [ ] Persistent player or campaign state, if required.
- [ ] Storyteller-controlled reveals, if required.

Do not turn these placeholders into implementation assumptions. Each feature needs a short rules, visibility, persistence, and source-of-truth decision before development.

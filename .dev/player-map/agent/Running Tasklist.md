# Player Map Running Tasklist

This is the working plan for the public Player Map. It is not the Storyteller Dashboard tasklist and does not use the Dashboard's verification queue.

## Current Status

Architecture discussion and source-asset preparation are in progress. No application package or public deployment exists yet.

## Decisions Recorded

- [x] Keep the application in this repository under `.dev/player-map`.
- [x] Use React and strict TypeScript.
- [x] Use Vite for development and production builds.
- [x] Use SCSS with the repository's nesting-first policy.
- [x] Use GSAP for all authored UI motion and animated style changes; SCSS owns static styling and responsive layout, with no competing CSS transitions or keyframes.
- [x] Use MapLibre GL JS as the interactive map renderer.
- [x] Treat the Toronto Rising production exports as the sole source for authored district/site facts.
- [x] Treat the Illustrator SVG as the sole source for district/region geometry.
- [x] Generate validated public JSON/GeoJSON; do not make generated data a hand-edited source.
- [x] Keep Storyteller-only and unrevealed information out of the browser bundle.
- [x] Do not require player authentication; treat the shared address as public and publish only player-safe data.
- [ ] Accept Cloudflare Workers Free as the first public host, or deliberately choose GitHub Pages. Workers is recommended because its static hosting, optional API, and optional database can all remain within the free tier at this scale.
- [ ] Choose the basemap/tile provider and confirm attribution, reliability, cost, and styling rights. OpenFreeMap is recommended for the first spike.
- [x] Treat phone-sized screens as a primary supported surface alongside desktop and tablets.
- [ ] Decide whether the first release needs cross-device/shared state or Storyteller-controlled reveals. Same-browser persistence can use local storage without a server.
- [ ] Choose the public address and whether to use a custom domain.
- [x] Do not ship the original illustrated map as a raster overlay unless a later need emerges.

## Source Assets

- [x] Prepare named `DISTRICTS` and `REGIONS` groups in Illustrator.
- [x] Repair the reported open paths and remove stray points.
- [x] Export the full-artboard SVG with stable district and region keys.
- [x] Confirm paths and polygons are both valid inputs.
- [x] Confirm mixed explicit `evenodd` and default nonzero fill rules are valid and must be preserved.
- [x] Inspect the corrected export: 32 geographical district features, three region features, no transforms, and no blank or duplicate IDs.
- [ ] Copy the approved SVG into the Player Map's tracked `data/source` directory when implementation begins.
- [ ] Record the four non-geographical Sheet district exceptions in a reviewed coverage manifest.

## Phase 1 — Technical Spikes

- [ ] Create the isolated Player Map package and lockfile.
- [ ] Add React, TypeScript, Vite, Sass, GSAP, MapLibre, Vitest, Testing Library, and Playwright.
- [ ] Render a bounded Toronto basemap with the intended visual style.
- [ ] Establish SVG-to-map ground-control points and measure georeferencing error.
- [ ] Parse all district and region SVG features while preserving holes and fill rules.
- [ ] Prototype narrow-gap and overlap normalization with diagnostic output.
- [ ] Load one generated district GeoJSON layer and prove hover, keyboard selection, click selection, and a details panel.
- [ ] Deploy the spike to Cloudflare Workers Free and confirm static hosting, a placeholder API route, and mobile loading before making the hosting decision final.

## Phase 2 — Data Pipeline

- [ ] Reuse the production Sheet loader and exact export contract.
- [ ] Define and review the first player-safe district field allowlist.
- [ ] Create a typed public-data schema and fail on unexpected fields.
- [ ] Join Sheet facts to geometry by exact key.
- [ ] Generate districts, regions, sites, and provenance manifest outputs.
- [ ] Add key, schema, topology, bounds, privacy, and count validation.
- [ ] Add visual diagnostics for gaps, removed overlaps, boundary movement, and georeferencing.
- [ ] Decide and document how Sheet changes trigger a reviewed deployment.

## Phase 3 — First Useful Release

- [ ] Build the full-screen map shell and responsive controls.
- [ ] Add district selection and player-safe district details.
- [ ] Add layer controls for districts, regions, and revealed sites.
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

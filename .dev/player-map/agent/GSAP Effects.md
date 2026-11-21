# Player Map GSAP Effects

## Agent Routing

Read this when:
- adding or changing author-facing GSAP experiments;
- wiring new DOM nodes that should appear in the `targets` map.

Source of truth:
- playground: `src/gsap-effects.ts`
- menu: `src/IconRail.tsx`

Status:
- current

## What GSAP can and cannot animate

GSAP targets DOM and SVG elements. MapLibre district and region fills are drawn
in WebGL, so they are not available as `gsap.to(...)` targets.

Use `targets` for real UI nodes (`data-gsap` attributes). Gold practice shapes
for the Bay Street Financial District, Yonge Street, West Queen West, and the
Waterfront appear only on the local map, after Debug notes is opened and
**GSAP shapes** is checked. They start hidden. Each shape is
`targets['sandbox.BayStFinancial']`, `targets['sandbox.YongeStreet']`,
`targets['sandbox.WestQueenWest']`, or `targets['sandbox.Waterfront']`.

Edit `main()` in `src/gsap-effects.ts` to try looks. Winning effects can later
be reproduced with MapLibre paint properties or feature-state.

`regionPulse` is on the map as the selected district's loop. While a district
is selected, its fill, glow, and outline breathe on the same two-second loop
as the GSAP timeline: fill alpha 0.06 to 0.12, a doubled glow whose line is
9px to 16px and whose blur is 6px to 14px, and a stroke widening from 2px
to 3px as it turns white. Regions keep their static fill and dashed outline.
The driver is `src/district-pulse.ts`.

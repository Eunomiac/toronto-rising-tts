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

Use `targets` for real UI nodes (`data-gsap` attributes). The old gold sandbox
drawn over Bay Street Financial, Yonge Street, West Queen West, and the
Waterfront is not part of the map.

Edit `main()` in `src/gsap-effects.ts` to try looks. Winning effects can later
be reproduced with MapLibre paint properties or feature-state.

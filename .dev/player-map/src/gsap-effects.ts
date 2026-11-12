/**
 * Author playground for GSAP experiments on the Player Map.
 *
 * MapLibre district/region fills are WebGL, not DOM/SVG nodes, so they cannot
 * be passed directly to gsap.to(...). Use `targets` for real DOM nodes and the
 * projected sandbox SVG (`targets.sandbox`) for animation trials. Winning looks
 * can later be reproduced with MapLibre paint/feature-state helpers.
 */
import gsap from 'gsap';

export type GsapTargetMap = Record<string, Element | null>;

export const targets: GsapTargetMap = {};

function collectTargets(): GsapTargetMap {
  const next: GsapTargetMap = {};
  for (const element of document.querySelectorAll<HTMLElement>('[data-gsap]')) {
    const key = element.dataset.gsap;
    if (!key) continue;
    next[key] = element;
  }
  for (const element of document.querySelectorAll<SVGElement>('[data-gsap-sandbox]')) {
    const key = element.dataset.gsapSandbox;
    if (!key) continue;
    next[`sandbox.${key}`] = element;
  }
  return next;
}

export function refreshGsapTargets() {
  const next = collectTargets();
  for (const key of Object.keys(targets)) delete targets[key];
  Object.assign(targets, next);
  return targets;
}

/**
 * Runs on every page refresh after the map UI mounts.
 * Put temporary gsap experiments here.
 */
export function main() {
  refreshGsapTargets();
  // Example (commented): pulse the Map Layers diamond.
  // const face = targets['rail-face-map-layers'];
  // if (face) gsap.fromTo(face, { scale: 0.92 }, { scale: 1, duration: 0.45, ease: 'power2.out' });
}

export function runGsapEffectsMain() {
  requestAnimationFrame(() => {
    main();
  });
}

// Keep gsap imported so author experiments can use it without re-import friction.
void gsap;

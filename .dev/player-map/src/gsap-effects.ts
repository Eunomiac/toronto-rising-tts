/**
 * Author playground for GSAP experiments on the Player Map.
 *
 * MapLibre district/region fills are WebGL, not DOM/SVG nodes, so they cannot
 * be passed directly to gsap.to(...). Use `targets` for real DOM nodes and the
 * projected sandbox shapes (`targets['sandbox.BayStFinancial']` and the other
 * three) when the debug bar's GSAP shapes switch is on. Winning
 * looks can later be reproduced with MapLibre paint/feature-state helpers.
 */
import gsap from 'gsap';

export type GsapTargetMap = Record<string, Element | null>;

export const targets: GsapTargetMap = {};

/**
 * =========================================
 * === GSAP EFFECT DEFINITIONS =============
 * =========================================
 */

type GsapEffectFunc = (targets: gsap.TweenTarget|Array<gsap.TweenTarget>, config: object) => gsap.core.Animation;
type GsapEffectDefinition = {
  name: string;
  effect: GsapEffectFunc;
  defaults?: object;
  extendTimeline?: boolean;
}
/** Same RGB as `color` (hex, rgb, or rgba), with `alpha` replacing any existing alpha. */
function colorWithAlpha(color: string, alpha: number): string {
  const [r, g, b] = gsap.utils.splitColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const GSAP_EFFECTS: Record<string, Omit<GsapEffectDefinition, 'name'>> = {
  "regionPulse": {
    effect: (targets, config: {color?: string}) => {
      const color = config.color ?? "#FF0000";
      const glowStart = colorWithAlpha(color, 0.005);
      const glowEnd = colorWithAlpha(color, 0.015);
      const tl = gsap.timeline({repeat: -1, repeatDelay: 0})
      return tl
        .set(targets, {
          fill: glowStart,
          filter: `drop-shadow(0px 0px 4px ${color}) drop-shadow(0px 0px 4px ${color})`,
          stroke: color,
          autoRound: false,
          strokeWidth: 2
        })
        .to(targets, {
        fill: glowEnd,
        filter: `drop-shadow(0px 0px 10px ${color}) drop-shadow(0px 0px 10px ${color})`,
        strokeWidth: 3,
        stroke: "#FFFFFF",
        autoRound: false,
        duration: 1,
        ease: "sine.inOut",
        repeat: 1,
        yoyo: true
      })
    },
    defaults: {
      color: "#FF0000"
    },
    extendTimeline: false
  }
}

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

export function registerGsapEffects() {
  for (const [name, definition] of Object.entries(GSAP_EFFECTS)) {
    gsap.registerEffect({
      name,
      extendTimeline: definition.extendTimeline,
      effect: definition.effect,
      defaults: definition.defaults
    });
  }
}

/**
 * Runs on every page refresh after the map UI mounts.
 * Put temporary gsap experiments here.
 *
 * Available Targets:
 * - targets[sandbox.BayStFinancial']
 * - targets[sandbox.YongeStreet']
 * - targets[sandbox.WestQueenWest']
 * - targets[sandbox.Waterfront']
 * - targets['rail-face-map-layers']
 *   - '#icon-rail-body-map-layers .icon-rail__title'
 *   - '#icon-rail-body-map-layers .icon-rail__list'
 *   - '#icon-rail-body-map-layers .icon-rail__list [aria-label="Anarch Free Zone"]'
 *   - '#icon-rail-body-map-layers .icon-rail__list [aria-label="Bennington Heights"]'
 * - targets['rail-face-domains']
 * - targets['rail-face-sites']
 */
export function main() {
  refreshGsapTargets();
  registerGsapEffects();

  gsap.effects.regionPulse(
    targets['sandbox.BayStFinancial'],
    {color: "#FF0000"}
  )

  gsap.set(
    targets['sandbox.YongeStreet'] as gsap.TweenTarget,
    {opacity: 0}
  );
  gsap.set(targets['sandbox.WestQueenWest'] as gsap.TweenTarget, {opacity: 0});
  gsap.set(targets['sandbox.Waterfront'] as gsap.TweenTarget, {opacity: 0});

  // gsap.effects.regionPulse(
  //   targets['sandbox.YongeStreet'],
  //   {color: "#FF0000"}
  // )

  // gsap.effects.regionPulse(
  //   targets['sandbox.WestQueenWest'],
  //   {color: "#AA00FF"}
  // )

  // gsap.effects.regionPulse(
  //   targets['sandbox.Waterfront'],
  //   {color: "#FFFF00"}
  // )
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

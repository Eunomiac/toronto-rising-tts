/**
 * Hunt resonance odds, as tuned in the author's Resonance Lab (`.dev/Storyteller Dashboard Docs/Hunting &
 * Resonance.md`). Full precision throughout; round only for display.
 */

export const COMMON_FLAVORS = ["choleric", "melancholic", "phlegmatic", "sanguine"] as const;
export const RARE_FLAVORS = ["ischemic", "mercurial", "primal"] as const;
export const FLAVORS = [...COMMON_FLAVORS, ...RARE_FLAVORS] as const;
export type Flavor = (typeof FLAVORS)[number];

export const INTENSITIES = ["none", "fleeting", "intense", "acute"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export type HuntOutcome = "basic" | "critical" | "messy";

export type FlavorModifiers = Readonly<Record<Flavor, number>>;
export type Odds<K extends string> = Readonly<Record<K, number>>;

const isFlavor = (type: string): type is Flavor => (FLAVORS as readonly string[]).includes(type);
const isRare = (flavor: Flavor): boolean => (RARE_FLAVORS as readonly string[]).includes(flavor);

/** Net signed modifier per flavor (repeats stack), plus any resonance names the model does not know. */
export const netModifiers = (list: readonly { readonly type: string; readonly up: boolean }[]): {
  modifiers: FlavorModifiers;
  unknown: readonly string[];
} => {
  const modifiers = Object.fromEntries(FLAVORS.map((flavor) => [flavor, 0])) as Record<Flavor, number>;
  const unknown: string[] = [];
  for (const { type, up } of list) {
    if (isFlavor(type)) {
      modifiers[type] += up ? 1 : -1;
    } else {
      unknown.push(type);
    }
  }
  return { modifiers, unknown };
};

const locationWeight = (flavor: Flavor, m: number): number => {
  if (isRare(flavor)) {
    return m > 0 ? 70 * m : 0;
  }
  return m >= 0 ? 25 + 50 * m : Math.max(0.5, 25 + 13.5 * m);
};

const normalise = <K extends string>(weights: Record<K, number>): Odds<K> => {
  const total = Object.values<number>(weights).reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(Object.entries<number>(weights).map(([key, weight]) => [key, weight / total])) as Record<K, number>;
};

/** The location distribution L: every common flavor, plus rare flavors the location supports. */
export const locationOdds = (modifiers: FlavorModifiers): Odds<Flavor> =>
  normalise(Object.fromEntries(FLAVORS.map((flavor) => [flavor, locationWeight(flavor, modifiers[flavor])])) as Record<Flavor, number>);

/** Flavors that can come up at all: the four common ones and any rare flavor with positive location support. */
export const eligibleFlavors = (modifiers: FlavorModifiers): readonly Flavor[] =>
  FLAVORS.filter((flavor) => !isRare(flavor) || modifiers[flavor] > 0);

const SEEK_PER_MARGIN = 13.6;
const SEEK_BONUS: Record<HuntOutcome, number> = { basic: 0, critical: 9, messy: -20 };
const SEEK_CAP = 0.95;

/** Flavor odds for a successful hunt, given resonance present: seeking, then (on a messy critical) chaos. */
export const flavorOdds = ({ modifiers, target, margin, outcome }: {
  modifiers: FlavorModifiers;
  target: Flavor | null;
  margin: number;
  outcome: HuntOutcome;
}): Odds<Flavor> => {
  const location = locationOdds(modifiers);
  const eligible = eligibleFlavors(modifiers);
  const seeking = target !== null && location[target] > 0 ? target : null;
  let odds: Record<Flavor, number> = { ...location };
  if (seeking) {
    const lt = location[seeking];
    const boost = (SEEK_PER_MARGIN * Math.max(0, margin) + SEEK_BONUS[outcome]) / 100;
    const t = Math.min(Math.max(lt + boost, 0), Math.max(SEEK_CAP, lt));
    odds = Object.fromEntries(FLAVORS.map((flavor) => [flavor, flavor === seeking ? t : location[flavor] * ((1 - t) / (1 - lt))])) as Record<Flavor, number>;
  }
  if (outcome === "messy") {
    const chaos = eligible.filter((flavor) => flavor !== seeking);
    odds = Object.fromEntries(FLAVORS.map((flavor) => [flavor, 0.5 * odds[flavor] + (chaos.includes(flavor) ? 0.5 / chaos.length : 0)])) as Record<Flavor, number>;
  }
  return odds;
};

const INTENSITY_CURVE: Record<Intensity, { readonly base: number; readonly growth: number }> = {
  none: { base: 50, growth: 0 },
  fleeting: { base: 30, growth: 1 },
  intense: { base: 16, growth: 1.76 },
  acute: { base: 4, growth: 2.28 }
};
const SHIFT_PER_MARGIN = 0.235;
const SHIFT_BONUS: Record<HuntOutcome, number> = { basic: 0, critical: 0.445, messy: 1.5 };

/** Intensity odds (including no resonance); independent of location and of the flavor sought. */
export const intensityOdds = (margin: number, outcome: HuntOutcome): Odds<Intensity> => {
  const shift = SHIFT_PER_MARGIN * Math.max(0, margin) + SHIFT_BONUS[outcome];
  return normalise(Object.fromEntries(INTENSITIES.map((intensity) => {
    const { base, growth } = INTENSITY_CURVE[intensity];
    return [intensity, base * Math.exp(growth * shift)];
  })) as Record<Intensity, number>);
};

/** Picks a key from a distribution with a uniform draw in [0, 1). */
export const sample = <K extends string>(odds: Odds<K>, order: readonly K[], draw: number): K => {
  let edge = 0;
  for (const key of order) {
    edge += odds[key];
    if (draw < edge) {
      return key;
    }
  }
  const last = order[order.length - 1];
  if (last === undefined) {
    throw new Error("sample: empty distribution");
  }
  return last;
};

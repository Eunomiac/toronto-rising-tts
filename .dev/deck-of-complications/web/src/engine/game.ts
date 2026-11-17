import { buildDeckInstances } from "./rarity";
import type {
  CatalogCard,
  CardInstance,
  GameState,
  PublicTotals,
  TargetRoll,
} from "./types";

export type Rng = () => number;

function now() {
  return Date.now();
}

function touch(g: GameState) {
  g.updatedAt = now();
}

function catalogPause(catalog: CatalogCard[], index: number): boolean {
  const def = catalog.find((c) => c.index === index);
  return def == null || def.requiresPause !== false;
}

export function createGame(
  target: TargetRoll,
  catalog: CatalogCard[],
  rng: Rng = Math.random,
  id = cryptoRandomId(),
): GameState {
  const instances = buildDeckInstances(catalog, target.rollType);
  if (instances.length < 10) {
    throw new Error(
      `Not enough eligible cards for roll type ${target.rollType} (${instances.length})`,
    );
  }
  const cards: Record<string, CardInstance> = {};
  for (const partial of instances) {
    cards[partial.id] = {
      ...partial,
      zone: "deck",
      up: false,
      enhanced: false,
      negated: false,
      revalued: false,
    };
  }
  const g: GameState = {
    version: 1,
    id,
    target,
    cards,
    slots: {},
    adjust: 0,
    autoDiscard: true,
    mode: "stop",
    selected: null,
    last: null,
    exhausted: false,
    enhanceNext: false,
    ended: false,
    finalTotal: null,
    createdAt: now(),
    updatedAt: now(),
  };
  shuffleDeckIds(g, rng);
  for (let slot = 1; slot <= 10; slot++) draw(g, slot, rng);
  return g;
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

function deckIds(g: GameState): string[] {
  return Object.keys(g.cards)
    .filter((id) => g.cards[id].zone === "deck")
    .sort();
}

function shuffleDeckIds(g: GameState, rng: Rng) {
  const ids = deckIds(g);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // Order is only used by drawTop; we pick randomly among deck, so shuffle is a no-op
  // for draw() which samples randomly. Kept for future drawTop parity.
  void ids;
}

function pickRandom<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

export function totals(g: GameState): PublicTotals {
  let total = g.adjust;
  let capped = false;
  for (let i = 1; i <= 10; i++) {
    const id = g.slots[i];
    if (!id) continue;
    const c = g.cards[id];
    if (c && c.zone === "slot" && c.up) {
      total += Number.isFinite(c.value) ? c.value : 0;
      if (c.index === 9 && !c.negated) capped = true;
    }
  }
  const margin = g.target.margin + total;
  return {
    complicationsTotal: total,
    adjustedMargin: capped ? Math.min(0, margin) : margin,
    buzzkillCapped: capped,
    originalMargin: g.target.margin,
  };
}

export function draw(g: GameState, slot: number, rng: Rng = Math.random): string | null {
  if (g.ended) return null;
  const pool = deckIds(g);
  if (pool.length === 0) {
    g.exhausted = true;
    g.slots[slot] = undefined;
    touch(g);
    return null;
  }
  if (pool.length === 1) g.exhausted = true;
  const id = pickRandom(pool, rng);
  const c = g.cards[id];
  c.zone = "slot";
  c.up = false;
  c.enhanced = false;
  c.negated = false;
  g.slots[slot] = id;
  touch(g);
  return id;
}

function clearSlotOf(g: GameState, id: string): number | null {
  for (let i = 1; i <= 10; i++) {
    if (g.slots[i] === id) {
      g.slots[i] = undefined;
      return i;
    }
  }
  return null;
}

export function move(g: GameState, id: string, zone: "deck" | "discard") {
  const c = g.cards[id];
  if (!c) throw new Error(`Unknown card ${id}`);
  clearSlotOf(g, id);
  c.zone = zone;
  c.up = false;
  touch(g);
}

export function redeal(g: GameState, rng: Rng = Math.random) {
  const slots: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const id = g.slots[i];
    if (!id || !g.cards[id].up) {
      slots.push(i);
      if (id) move(g, id, "deck");
    }
  }
  for (const i of slots) draw(g, i, rng);
}

export function restrictCategory(
  g: GameState,
  category: string | Record<string, boolean>,
  rng: Rng = Math.random,
) {
  if (!g.autoDiscard) return;
  const match = (cat: string) => {
    if (!cat) return false;
    if (typeof category === "string") return cat === category && category !== "";
    return category[cat] === true;
  };
  const removed: string[] = [];
  for (const [id, c] of Object.entries(g.cards)) {
    if (
      match(c.category) &&
      (c.zone === "deck" || (c.zone === "slot" && !c.up))
    ) {
      removed.push(id);
    }
  }
  removed.sort();
  const slots: number[] = [];
  for (const id of removed) {
    const slot = clearSlotOf(g, id);
    if (slot != null) slots.push(slot);
    const c = g.cards[id];
    c.zone = "discard";
    c.up = false;
  }
  slots.sort((a, b) => a - b);
  for (const i of slots) draw(g, i, rng);
  touch(g);
}

function passEnhancement(g: GameState, fromId: string, rng: Rng) {
  const from = g.cards[fromId];
  if (!from?.enhanced) return;
  from.enhanced = false;
  const targets = Object.values(g.cards).filter(
    (c) =>
      c.id !== fromId &&
      c.zone === "slot" &&
      c.up &&
      !c.enhanced &&
      !c.negated,
  );
  if (targets.length === 0) {
    g.enhanceNext = true;
  } else {
    pickRandom(targets, rng).enhanced = true;
  }
}

export function reveal(
  g: GameState,
  id: string,
  catalog: CatalogCard[],
  rng: Rng = Math.random,
): { ok: boolean; pause: boolean } {
  if (g.ended || g.exhausted || g.mode !== "stop") return { ok: false, pause: false };
  const c = g.cards[id];
  if (!c || c.zone !== "slot" || c.up) return { ok: false, pause: false };
  const pause = catalogPause(catalog, c.index);
  c.up = true;
  g.last = id;
  if (g.enhanceNext) {
    c.enhanced = true;
    g.enhanceNext = false;
  }
  if (pause) {
    g.selected = id;
    g.mode = "select";
  } else {
    g.selected = null;
    g.mode = "stop";
  }
  restrictCategory(g, c.category, rng);
  touch(g);
  return { ok: true, pause };
}

export function discardSelected(g: GameState, rng: Rng = Math.random): boolean {
  const id = g.selected;
  const c = id ? g.cards[id] : null;
  if (!c || c.zone !== "slot" || !c.up) return false;
  const slot = clearSlotOf(g, id!);
  if (c.enhanced) passEnhancement(g, id!, rng);
  c.zone = "discard";
  c.up = false;
  c.negated = false;
  g.selected = null;
  g.mode = "select";
  if (c.category !== "") {
    const matching = Object.keys(g.cards)
      .filter(
        (other) =>
          other !== id &&
          g.cards[other].zone === "discard" &&
          g.cards[other].category === c.category,
      )
      .sort();
    for (const other of matching) {
      g.cards[other].zone = "deck";
      g.cards[other].up = false;
    }
    redeal(g, rng);
  } else if (slot != null) {
    draw(g, slot, rng);
  }
  touch(g);
  return true;
}

export function toggleCategories(g: GameState, rng: Rng = Math.random) {
  g.autoDiscard = !g.autoDiscard;
  if (g.autoDiscard) {
    const categories: Record<string, boolean> = {};
    for (let i = 1; i <= 10; i++) {
      const id = g.slots[i];
      if (!id) continue;
      const c = g.cards[id];
      if (c.up && c.category) categories[c.category] = true;
    }
    restrictCategory(g, categories, rng);
  } else {
    for (const c of Object.values(g.cards)) {
      if (c.zone === "discard" && c.category !== "") {
        c.zone = "deck";
        c.up = false;
      }
    }
    redeal(g, rng);
  }
  touch(g);
}

export function candidates(
  g: GameState,
  mode: "all" | "enhanced" | "normal",
): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const id = g.slots[i];
    if (!id) continue;
    const c = g.cards[id];
    if (
      c.up &&
      !c.negated &&
      (mode === "all" ||
        (mode === "enhanced" && c.enhanced) ||
        (mode === "normal" && !c.enhanced))
    ) {
      out.push(id);
    }
  }
  return out.sort();
}

export function setModeStop(g: GameState) {
  g.mode = "stop";
  g.selected = null;
  touch(g);
}

export function armSelect(g: GameState) {
  if (g.ended) return;
  if (g.last && g.cards[g.last]?.zone === "slot") g.selected = g.last;
  else g.selected = null;
  g.mode = "select";
  touch(g);
}

export function selectCard(g: GameState, id: string | null) {
  // Web ST UX: allow picking a face-up card without arming a separate "Force Select" mode.
  if (g.ended || g.mode === "ended") return false;
  if (id == null) {
    g.selected = null;
    touch(g);
    return true;
  }
  const c = g.cards[id];
  if (!c || c.zone !== "slot" || !c.up) return false;
  g.selected = id;
  touch(g);
  return true;
}

export function toggleEnhance(g: GameState, rng: Rng = Math.random) {
  const id = g.selected;
  const c = id ? g.cards[id] : null;
  if (!c || c.zone !== "slot" || !c.up) return false;
  if (c.enhanced) {
    passEnhancement(g, id!, rng);
  } else {
    c.enhanced = true;
  }
  touch(g);
  return true;
}

export function toggleNegate(g: GameState, rng: Rng = Math.random) {
  const id = g.selected;
  const c = id ? g.cards[id] : null;
  if (!c || c.zone !== "slot" || !c.up) return false;
  const next = !c.negated;
  if (next && c.enhanced) passEnhancement(g, id!, rng);
  c.negated = next;
  touch(g);
  return true;
}

export function adjust(g: GameState, delta: number) {
  g.adjust += delta;
  touch(g);
}

export function setCardValue(g: GameState, value: number) {
  const id = g.selected;
  const c = id ? g.cards[id] : null;
  if (!c || c.zone !== "slot" || !c.up) return false;
  c.value = value;
  c.revalued = true;
  touch(g);
  return true;
}

export function requestStop(g: GameState) {
  if (g.ended || g.mode === "select") return false;
  g.mode = "confirm";
  touch(g);
  return true;
}

export function confirmEnd(g: GameState): PublicTotals {
  const t = totals(g);
  g.ended = true;
  g.mode = "ended";
  g.finalTotal = t.complicationsTotal;
  g.selected = null;
  touch(g);
  return t;
}

export function cancelConfirm(g: GameState) {
  if (g.mode === "confirm") {
    g.mode = "stop";
    touch(g);
  }
}

export function resumePlay(g: GameState) {
  if (g.ended) return;
  g.mode = "stop";
  g.selected = null;
  touch(g);
}

export function faceUpCount(g: GameState): number {
  let n = 0;
  for (let i = 1; i <= 10; i++) {
    const id = g.slots[i];
    if (id && g.cards[id].up) n++;
  }
  return n;
}

/** After tenth face-up card, game must end. */
export function maybeAutoEnd(g: GameState) {
  if (!g.ended && faceUpCount(g) >= 10) {
    confirmEnd(g);
  }
}

export function publicView(g: GameState) {
  const t = totals(g);
  return {
    id: g.id,
    target: g.target,
    mode: g.mode,
    selected: g.selected,
    last: g.last,
    adjust: g.adjust,
    autoDiscard: g.autoDiscard,
    exhausted: g.exhausted,
    enhanceNext: g.enhanceNext,
    ended: g.ended,
    finalTotal: g.finalTotal,
    totals: t,
    deckCount: deckIds(g).length,
    discardCount: Object.values(g.cards).filter((c) => c.zone === "discard")
      .length,
    slots: Array.from({ length: 10 }, (_, i) => {
      const id = g.slots[i + 1];
      if (!id) return null;
      const c = g.cards[id];
      return {
        slot: i + 1,
        id: c.id,
        up: c.up,
        index: c.index,
        name: c.name,
        category: c.category,
        value: c.value,
        printedValue: c.printedValue,
        enhanced: c.enhanced,
        negated: c.negated,
        revalued: c.revalued,
        imageStem: c.imageStem,
      };
    }),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export type PublicGameView = ReturnType<typeof publicView>;

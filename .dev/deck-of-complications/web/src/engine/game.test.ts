import { describe, expect, it } from "vitest";
import {
  adjust,
  confirmEnd,
  createGame,
  discardCard,
  pickRandomSelected,
  publicView,
  reveal,
  setCardValue,
  totals,
  toggleEnhance,
  toggleNegate,
  toggleSelect,
  restrictCategory,
} from "./game";
import type { CatalogCard, TargetRoll } from "./types";

const catalog: CatalogCard[] = [
  {
    index: 9,
    name: "Buzzkill",
    category: "",
    rarity: "Uncommon",
    value: 2,
    requiresPause: false,
    rollTypes: {
      standard: true,
      discipline: true,
      willpowerRoll: true,
      launch: true,
      goal: true,
    },
    imageStem: "09-buzzkill",
  },
  {
    index: 11,
    name: "Cognitive Dissonance",
    category: "Debilitation",
    rarity: "Common",
    value: 1,
    requiresPause: true,
    rollTypes: {
      standard: true,
      discipline: true,
      willpowerRoll: true,
      launch: true,
      goal: true,
    },
    imageStem: "11-cognitive-dissonance",
  },
  {
    index: 40,
    name: "Powderkeg",
    category: "",
    rarity: "Very Common",
    value: 1,
    requiresPause: false,
    rollTypes: {
      standard: true,
      discipline: true,
      willpowerRoll: true,
      launch: true,
      goal: true,
    },
    imageStem: "40-powderkeg",
  },
  {
    index: 50,
    name: "Spread Thin",
    category: "Debilitation",
    rarity: "Common",
    value: 1,
    requiresPause: false,
    rollTypes: {
      standard: true,
      discipline: true,
      willpowerRoll: true,
      launch: true,
      goal: true,
    },
    imageStem: "50-spread-thin",
  },
];

const target: TargetRoll = {
  color: "Red",
  rollId: "roll-1",
  rollType: "launch",
  playerLabel: "Test PC",
  margin: -3,
};

function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i] ?? 0;
    i++;
    return v;
  };
}

describe("createGame", () => {
  it("deals ten face-down slots from rarity-weighted deck", () => {
    const g = createGame(target, catalog, () => 0);
    const view = publicView(g);
    expect(view.slots).toHaveLength(10);
    expect(view.slots.every((s) => s && !s.up)).toBe(true);
    expect(view.deckCount).toBeGreaterThan(0);
  });
});

describe("reveal + category", () => {
  it("removes matching category cards from face-down slots and deck", () => {
    const g = createGame(target, catalog, () => 0);
    // Force Cognitive Dissonance (requiresPause) into slot 1
    const debil = Object.values(g.cards).find((c) => c.index === 11)!;
    expect(debil).toBeTruthy();
    const old = g.slots[1]!;
    if (old && old !== debil.id) {
      g.cards[old].zone = "deck";
      g.cards[old].up = false;
    }
    // Clear any prior slot holding this card
    for (let i = 1; i <= 10; i++) {
      if (g.slots[i] === debil.id) g.slots[i] = undefined;
    }
    g.slots[1] = debil.id;
    debil.zone = "slot";
    debil.up = false;

    const result = reveal(g, debil.id, catalog, () => 0);
    expect(result.ok).toBe(true);
    expect(result.pause).toBe(true);
    expect(g.mode).toBe("select");

    for (const c of Object.values(g.cards)) {
      if (c.category === "Debilitation" && c.id !== debil.id) {
        expect(c.zone === "deck" && !c.up ? false : c.zone === "discard" || c.up).toBe(
          true,
        );
        if (!c.up) expect(c.zone).toBe("discard");
      }
    }
  });
});

describe("totals", () => {
  it("sums face-up values plus adjust and caps with Buzzkill", () => {
    const g = createGame(target, catalog, () => 0);
    const buzz = Object.values(g.cards).find((c) => c.index === 9)!;
    const old = g.slots[1]!;
    g.cards[old].zone = "deck";
    g.slots[1] = buzz.id;
    buzz.zone = "slot";
    buzz.up = true;
    buzz.value = 2;
    adjust(g, 1);
    const t = totals(g);
    // margin -3 + (2+1) = 0, buzzkill caps at 0 anyway
    expect(t.complicationsTotal).toBe(3);
    expect(t.buzzkillCapped).toBe(true);
    expect(t.adjustedMargin).toBe(0);
  });
});

describe("enhance / negate / discard", () => {
  it("passes enhancement when negated", () => {
    const g = createGame(target, catalog, seqRng([0, 0, 0, 0]));
    const a = Object.values(g.cards).find((c) => c.index === 40)!;
    const b = Object.values(g.cards).find(
      (c) => c.index === 40 && c.id !== a.id,
    )!;
    for (const id of Object.values(g.slots)) {
      if (id) {
        g.cards[id].zone = "deck";
      }
    }
    g.slots = { 1: a.id, 2: b.id };
    a.zone = "slot";
    a.up = true;
    a.enhanced = true;
    b.zone = "slot";
    b.up = true;
    g.selectedIds = [a.id];
    g.mode = "select";
    toggleNegate(g, a.id, () => 0);
    expect(a.negated).toBe(true);
    expect(a.enhanced).toBe(false);
    expect(b.enhanced).toBe(true);
  });

  it("discard replaces the slot", () => {
    const g = createGame(target, catalog, () => 0);
    const id = g.slots[1]!;
    g.cards[id].up = true;
    g.selectedIds = [id];
    g.mode = "select";
    discardCard(g, id, () => 0);
    expect(g.cards[id].zone).toBe("discard");
    expect(g.slots[1]).toBeTruthy();
    expect(g.slots[1]).not.toBe(id);
  });
});

describe("end", () => {
  it("records finalTotal on confirm", () => {
    const g = createGame(target, catalog, () => 0);
    const id = g.slots[1]!;
    g.cards[id].up = true;
    g.cards[id].value = 2;
    const t = confirmEnd(g);
    expect(g.ended).toBe(true);
    expect(g.finalTotal).toBe(t.complicationsTotal);
    expect(t.complicationsTotal).toBe(2);
  });
});

describe("restrictCategory helper", () => {
  it("no-ops when autoDiscard is off", () => {
    const g = createGame(target, catalog, () => 0);
    g.autoDiscard = false;
    const before = deckIdsSnapshot(g);
    restrictCategory(g, "Debilitation", () => 0);
    expect(deckIdsSnapshot(g)).toEqual(before);
  });
});

function deckIdsSnapshot(g: ReturnType<typeof createGame>) {
  return Object.values(g.cards)
    .filter((c) => c.zone === "deck")
    .map((c) => c.id)
    .sort();
}

describe("toggleEnhance", () => {
  it("enhances the card and clears without passing", () => {
    const g = createGame(target, catalog, () => 0);
    const id = g.slots[1]!;
    const other = g.slots[2]!;
    g.cards[id].up = true;
    g.cards[other].up = true;
    toggleEnhance(g, id);
    expect(g.cards[id].enhanced).toBe(true);
    toggleEnhance(g, id);
    expect(g.cards[id].enhanced).toBe(false);
    expect(g.cards[other].enhanced).toBe(false);
  });
});

describe("multi-select / revalue", () => {
  it("toggles selection and picks random among selected", () => {
    const g = createGame(target, catalog, () => 0);
    const a = g.slots[1]!;
    const b = g.slots[2]!;
    g.cards[a].up = true;
    g.cards[b].up = true;
    toggleSelect(g, a);
    toggleSelect(g, b);
    expect(g.selectedIds.sort()).toEqual([a, b].sort());
    const winner = pickRandomSelected(g, () => 0);
    expect(winner).toBeTruthy();
    expect(g.highlightId).toBe(winner);
    expect(g.selectedIds).toContain(winner!);
  });

  it("clears revalue when the same value is chosen again", () => {
    const g = createGame(target, catalog, () => 0);
    const id = g.slots[1]!;
    g.cards[id].up = true;
    g.cards[id].printedValue = 3;
    g.cards[id].value = 3;
    setCardValue(g, id, -2);
    expect(g.cards[id].revalued).toBe(true);
    expect(g.cards[id].value).toBe(-2);
    setCardValue(g, id, -2);
    expect(g.cards[id].revalued).toBe(false);
    expect(g.cards[id].value).toBe(3);
  });
});

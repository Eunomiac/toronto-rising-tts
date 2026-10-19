import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { applyNpcConditions, type NpcConditionView } from "../../../shared/npcConditions";
import type { NpcStatBlock } from "../../../shared/npcStats";
import type { StLiveRoll } from "../../worldState";

vi.mock("../sketch", () => ({ Overlay: ({ children }: { children: ReactNode }) => children }));
vi.mock("./dice", () => ({ PoolDiamonds: () => null }));
vi.mock("../npcTrackers", async () => {
  const { createContext } = await import("react");
  return { NpcLiveContext: createContext(null) };
});

import { NpcLiveContext } from "../npcTrackers";
import { NpcConfigure } from "./npcConfigure";

const source: NpcStatBlock = {
  mental: 7, willpower: 8, exceptional: [{ id: "save", name: "Resolve + Survival", dice: 7 }],
  attacks: [], powers: []
};
const effects: NpcConditionView = {
  conditions: [], manual: [], statChanges: { willpower: -2 }, wpMax: 6,
  rollFeatures: { resolveHalved: true }
};
const live: StLiveRoll = {
  rollId: "one", npcCharacterKey: "npc", rollType: "standard", hint: "", wpReroll: false,
  pool: {}, dice: [], secret: false, quiet: false, bloodSurge: false,
  actions: {
    roll: false, rollEnabled: false, half: false, halfEnabled: false, wp: false,
    recalc: false, reroll: false, confirm: false, oblivChoice: false, brutalChoice: false
  }
};
const setup = (block: NpcStatBlock) => {
  const send = vi.fn();
  const effective = applyNpcConditions(block, effects);
  render(
    <NpcLiveContext.Provider value={{
      conditions: { npc: effects }, trackers: {}, kindOf: () => undefined,
      sourceBlockFor: () => block, blockFor: () => effective
    }}>
      <NpcConfigure at={{ x: 0, y: 0 }} live={live} block={effective} levels={{}}
        send={send} onPool={vi.fn()} onClose={vi.fn()} />
    </NpcLiveContext.Provider>
  );
  return send;
};

describe("NPC Resolve condition controls", () => {
  it("plans an associated Resolve pool with the weighted modifier without asking for a rating", async () => {
    const user = userEvent.setup();
    const send = setup({ ...source, exceptional: [{ id: "save", name: "Resolve + Survival", dice: 8, traits: ["Resolve", "Survival"], difficulty: "3-5" }] });
    expect(screen.getByRole("spinbutton", { name: "Resolve before halving" })).toHaveValue(null);
    const roll = screen.getByRole("button", { name: /Resolve \+ Survival/ });
    expect(roll).toBeEnabled();
    await user.click(roll);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ op: "npcStatRoll", normal: 6, hunger: 0, difficultyRule: "3-5" }));
  });
  it("uses a saved individual Resolve rating and sends the adjusted composite pool once", async () => {
    const user = userEvent.setup();
    const send = setup({ ...source, exceptional: [...source.exceptional, { id: "resolve", name: "Resolve", dice: 5 }] });
    expect(screen.getByRole("spinbutton", { name: "Resolve before halving" })).toHaveValue(5);
    await user.click(screen.getByRole("button", { name: /Resolve \+ Survival/ }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ op: "npcStatRoll", normal: 4, hunger: 0 }));
  });

  it("asks for an unknown attribute contribution and applies it to the chosen broad pool", async () => {
    const user = userEvent.setup();
    const send = setup(source);
    const usesResolve = screen.getByRole("checkbox", { name: "The chosen pool uses Resolve" });
    expect(usesResolve).toBeDisabled();
    expect(screen.getByRole("button", { name: /Resolve \+ Survival/ })).toBeDisabled();
    await user.type(screen.getByRole("spinbutton", { name: "Resolve before halving" }), "5");
    await user.click(usesResolve);
    await user.click(screen.getByRole("button", { name: /^Mental/ }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ op: "npcStatRoll", normal: 4, hunger: 0 }));
    expect(source.mental).toBe(7);
    expect(source.willpower).toBe(8);
  });
});

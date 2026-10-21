import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
const stats = { npc: { named: {
  difficultyStrong: 4,
  difficultyWeak: 3,
  exceptional: [{ id: "roll", name: "Concentration", dice: 8 }],
  attacks: [{ id: "attack", name: "Strike", pool: "ex:roll", bonus: 2 }],
  powers: [{ name: "Dominate", powers: [{ level: 1, name: "Command", rouse: 1, pool: "ex:roll" }] }]
} } };
vi.mock("../npcStats", () => ({ useNpcStats: () => stats, saveNpcStats: save }));
vi.mock("./sketch", () => ({ Overlay: ({ children, onClose }: { children: ReactNode; onClose: () => void }) => <div>{children}<button onClick={onClose}>Close</button></div> }));
import { NpcStatsModal } from "./npcStatsModal";

beforeEach(() => { save.mockReset().mockResolvedValue(undefined); });
describe("NPC custom-roll editor", () => {
  it.each(["Concentration", "Strike", "Command"])("keeps %s bars open while editing and saves its associations", async (name) => {
    const user = userEvent.setup();
    render(<NpcStatsModal statsKey="npc" label="NPC" generic={false} onClose={vi.fn()} />);
    const field = screen.getAllByDisplayValue(name).find((element) => element.tagName === "INPUT")!;
    const row = field.closest(".npc-custom-roll")!;
    expect(row).not.toHaveClass("editing");
    await user.click(field);
    expect(row).toHaveClass("editing");
    await user.click(screen.getByRole("textbox", { name: `${name} first trait` }));
    await user.keyboard("Resolve");
    await user.type(screen.getByRole("textbox", { name: `${name} second trait` }), "Composure");
    await user.type(screen.getByRole("textbox", { name: `${name} difficulty rule` }), "3-5");
    expect(row).toHaveClass("editing");
    await user.click(screen.getByText("NPC", { selector: ".lab-modal-title" }));
    expect(row).not.toHaveClass("editing");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const block = save.mock.calls[0]![1].named;
    const entry = name === "Concentration" ? block.exceptional[0] : name === "Strike" ? block.attacks[0] : block.powers[0].powers[0];
    expect(entry).toMatchObject({ traits: ["Resolve", "Composure"], difficulty: "3-5" });
  });
  it("keeps invalid difficulty text editable instead of silently discarding it", async () => {
    const user = userEvent.setup();
    render(<NpcStatsModal statsKey="npc" label="NPC" generic={false} onClose={vi.fn()} />);
    await user.click(screen.getAllByDisplayValue("Concentration").find((element) => element.tagName === "INPUT")!);
    const difficulty = screen.getByRole("textbox", { name: "Concentration difficulty rule" });
    await user.type(difficulty, "5-2");
    expect(difficulty).toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/Fix the difficulty rule/)).toBeInTheDocument();
  });
});

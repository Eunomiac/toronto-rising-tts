import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SeatSketch } from "./sketch";
import { XpAwardPanel } from "./xpAwardPanel";

const pc = (slot: number, color: SeatSketch["color"], name: string): SeatSketch => ({
  slot,
  kind: "pc",
  color,
  name,
  seatKey: color
});

describe("XP award buttons", () => {
  it("uses the character name and a green awarded mark without dropping the player color", async () => {
    const user = userEvent.setup();
    render(
      <XpAwardPanel phase="Feedback" seats={[pc(1, "Red", "Lord Lucien")]} apply={vi.fn()} />
    );
    const button = screen.getByRole("button", { name: "Lord Lucien" });
    expect(button.className).toContain("lab-xp-seat--red");
    await user.click(button);
    expect(button.className).toContain("is-awarded");
    expect(button.className).toContain("lab-xp-seat--red");
  });

  it("awards the typed amount and description to that character only", async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    render(
      <XpAwardPanel
        phase="End"
        seats={[pc(1, "Red", "Lord Lucien"), pc(2, "Pink", "Aishe Tache")]}
        apply={apply}
      />
    );
    const amount = screen.getByRole("spinbutton", { name: "Aishe Tache XP amount" });
    const description = screen.getByRole("textbox", { name: "Aishe Tache XP description" });
    await user.clear(amount);
    await user.type(amount, "3");
    await user.type(description, "Quiet work");
    await user.click(screen.getAllByRole("button", { name: "Award" })[1]!);
    expect(apply).toHaveBeenCalledWith({ op: "xpAppend", color: "Pink", amount: 3, description: "Quiet work" });
  });
});

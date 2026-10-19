import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Difficulty } from "./RollsCell";

describe("custom roll difficulty strip", () => {
  it("shows only a range's valid difficulties", () => {
    render(<Difficulty value={undefined} editable title="Difficulty" rule="2-5" noneCell onPick={vi.fn()} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["2", "3", "4", "5"]);
  });
  it("keeps – with a minimum rule and offers higher difficulties", async () => {
    const pick = vi.fn();
    render(<Difficulty value={undefined} editable title="Difficulty" rule="12+" noneCell onPick={pick} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["–", "12", "13", "14", "15"]);
    await userEvent.setup().click(screen.getByRole("button", { name: "–" }));
    expect(pick).toHaveBeenCalledWith(0);
  });
  it("allows the ST to revise a fixed starting difficulty", async () => {
    render(<Difficulty value={3} editable title="Difficulty" rule="3" noneCell onPick={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByRole("button", { name: "–" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15" })).toBeInTheDocument();
  });
});

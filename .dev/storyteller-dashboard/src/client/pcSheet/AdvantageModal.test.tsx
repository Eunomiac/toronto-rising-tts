import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdvantageModal } from "./AdvantageModal.js";
import type { ApplyCommand } from "./types.js";

describe("Add advantage dialog", () => {
  it("lets a new background be saved at six dots", async () => {
    const user = userEvent.setup();
    const send = vi.fn(async (_command: ApplyCommand) => undefined);
    render(
      <AdvantageModal
        color="Pink"
        defaultType="backgrounds"
        send={send}
        onClose={vi.fn()}
      />
    );

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Allies");
    const dotsLabel = screen.getByText("Dots").closest("label");
    const slotsLabel = screen.getByText("Dot slots").closest("label");
    expect(dotsLabel).toBeTruthy();
    expect(slotsLabel).toBeTruthy();
    const dots = dotsLabel!.querySelector("input");
    const plus = dotsLabel!.querySelectorAll("button")[1];
    expect(dots).toHaveValue(1);
    for (let i = 0; i < 5; i += 1) {
      await user.click(plus!);
    }
    expect(dots).toHaveValue(6);
    expect(slotsLabel!.querySelector("input")).toHaveValue(6);

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      op: "advantageUpsert",
      type: "backgrounds",
      entry: expect.objectContaining({ name: "Allies", base: 6, max: 6 })
    }));
  });
});

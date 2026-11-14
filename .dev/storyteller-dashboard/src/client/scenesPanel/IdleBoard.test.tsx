import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenesCommandContext } from "./commands";
import { IdleBoard } from "./sketch";

const dusk = new Date(2026, 10, 14, 19, 0);
const dawn = new Date(2026, 10, 15, 7, 0);
const nightNow = new Date(2026, 10, 14, 22, 0);

const mount = (props: Partial<Parameters<typeof IdleBoard>[0]> = {}): void => {
  render(
    <ScenesCommandContext.Provider value={() => {}}>
      <IdleBoard w={800} h={500} seats={[]} {...props} />
    </ScenesCommandContext.Provider>
  );
};

describe("IdleBoard stage reminders", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows Intermission reminders and hides one on click", async () => {
    const user = userEvent.setup();
    mount({ phase: "Intermission" });
    expect(screen.getByRole("button", { name: /session recorder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scenes are preloaded/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /session recorder/i }));
    expect(screen.queryByRole("button", { name: /session recorder/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scenes are preloaded/i })).toBeInTheDocument();
  });

  it("shows the awakening reminder in Downtime at night and dismisses it for that night", async () => {
    const user = userEvent.setup();
    mount({
      phase: "Play",
      subPhase: "Downtime",
      clockNow: nightNow,
      dusk,
      dawn
    });
    const button = screen.getByRole("button", { name: /rouse checks for awakening/i });
    await user.click(button);
    expect(screen.queryByRole("button", { name: /rouse checks for awakening/i })).not.toBeInTheDocument();
    expect(screen.getByText("(No Active Scene)")).toBeInTheDocument();
  });

  it("shows End-phase NPC reminders and dismisses them independently", async () => {
    const user = userEvent.setup();
    mount({ phase: "End", sessionNum: 7 });
    expect(screen.getByRole("button", { name: /Dark Between the Stars/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rats in the Walls/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Black Caesar/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Rats in the Walls/i }));
    expect(screen.queryByRole("button", { name: /Rats in the Walls/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dark Between the Stars/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Black Caesar/i })).toBeInTheDocument();
  });
});

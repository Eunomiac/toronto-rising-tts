import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScenesCommandContext } from "./commands";
import { IdleBoard, Seats } from "./sketch";

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
    mount({ phase: "Intermission", sessionName: "" });
    expect(screen.getByRole("button", { name: /session recorder/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /scenes are preloaded/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /title for this session/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /session recorder/i }));
    expect(screen.queryByRole("button", { name: /session recorder/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /title for this session/i })).toBeInTheDocument();
  });

  it("shows the preload reminder on the opening Play downtime, not a later one", () => {
    mount({ phase: "Play", subPhase: "Downtime", sessionStartDowntime: true });
    expect(screen.getByRole("button", { name: /scenes are preloaded/i })).toBeInTheDocument();
  });

  it("shows a connected PC as in the scene during Downtime and tells the table", () => {
    const send = vi.fn();
    render(
      <ScenesCommandContext.Provider value={send}>
        <IdleBoard
          w={800}
          h={500}
          phase="Play"
          subPhase="Downtime"
          seats={[{ slot: 1, seatKey: "Pink", kind: "pc", name: "Aishe Tache", state: "absent", color: "Pink" }]}
        />
      </ScenesCommandContext.Provider>
    );
    expect(document.querySelector(".lab-seat.absent")).toBeNull();
    expect(screen.getByText("Aishe Tache")).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith({ op: "seatPresence", seat: "Pink", present: true });
  });

  it("keeps an out-of-scene PC grey outside Downtime and can bring them back", async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(
      <ScenesCommandContext.Provider value={send}>
        <IdleBoard
          w={800}
          h={500}
          phase="Play"
          subPhase="Main"
          seats={[{ slot: 1, seatKey: "Pink", kind: "pc", name: "Aishe Tache", state: "absent", color: "Pink" }]}
        />
      </ScenesCommandContext.Provider>
    );
    expect(document.querySelector(".lab-seat.absent")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Bring Aishe Tache into the scene" }));
    expect(send).toHaveBeenCalledWith({ op: "seatPresence", seat: "Pink", present: true });
    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Aishe Tache") });
    await user.click(screen.getByRole("menuitem", { name: "Bring Aishe Tache into the scene" }));
    expect(send).toHaveBeenCalledTimes(2);
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
    expect(screen.getByRole("button", { name: /Black Caesar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save the game/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Dark Between the Stars/i }));
    expect(screen.queryByRole("button", { name: /Dark Between the Stars/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Black Caesar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save the game/i })).toBeInTheDocument();
  });
});

describe("seat presence button", () => {
  it("marks a seated character in or out of the scene without opening trackers", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    render(
      <ScenesCommandContext.Provider value={() => {}}>
        <Seats
          seats={[{ slot: 1, seatKey: "Pink", kind: "pc", name: "Aishe Tache", color: "Pink" }]}
          onTogglePresence={toggle}
        />
      </ScenesCommandContext.Provider>
    );
    await user.click(screen.getByRole("button", { name: "Take Aishe Tache out of the scene" }));
    expect(toggle).toHaveBeenCalledWith("Pink", false);
  });
});

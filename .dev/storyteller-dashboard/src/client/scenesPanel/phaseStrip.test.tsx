import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ScenesCommandContext } from "./commands";
import { PhaseStrip } from "./glance";
import type { LivePhase, LiveScenes } from "./glance";

const scenes: LiveScenes = { live: [], current: null };
const spotlight: LivePhase["spotlight"] = { order: [], front: 0 };
const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");

const renderStrip = (phase: string, subPhase?: string): void => {
  const live: LivePhase = {
    phase,
    sessionNum: 12,
    sessionName: "The Wake",
    spotlight,
    presentYear: 2026,
    ...(subPhase ? { subPhase } : {})
  };
  render(
    <div className="lab-canvas">
      <ScenesCommandContext.Provider value={() => {}}>
        <PhaseStrip
          library={[{ key: "elysium", title: "Elysium", status: "new" }]}
          scenes={scenes}
          onSwitch={() => {}}
          onEndScene={() => {}}
          onEndDeckScene={() => {}}
          onRemoveFromDeck={() => {}}
          onPlay={() => {}}
          onEdit={vi.fn()}
          onPrepare={() => {}}
          live={live}
        />
      </ScenesCommandContext.Provider>
    </div>
  );
};

describe("PhaseStrip scene library", () => {
  afterAll(() => {
    if (originalOffsetParent) {
      Object.defineProperty(HTMLElement.prototype, "offsetParent", originalOffsetParent);
    }
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ districts: [], sites: [], weather: [] })
    })));
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return (this as HTMLElement).parentElement;
      }
    });
  });

  it("opens the scene library from Intermission without putting a scene on the table", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <div className="lab-canvas">
        <ScenesCommandContext.Provider value={() => {}}>
          <PhaseStrip
            library={[{ key: "elysium", title: "Elysium", status: "new" }]}
            scenes={scenes}
            onSwitch={() => {}}
            onEndScene={() => {}}
            onEndDeckScene={() => {}}
            onRemoveFromDeck={() => {}}
            onPlay={() => {}}
            onEdit={onEdit}
            onPrepare={() => {}}
            live={{ phase: "Intermission", sessionNum: 12, sessionName: "The Wake", spotlight, presentYear: 2026 }}
          />
        </ScenesCommandContext.Provider>
      </div>
    );

    expect(screen.getByRole("button", { name: "Play ▸" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Scene ▸" }));
    expect(screen.getByText("Scene library")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "End Scene" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Memoriam…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith("elysium");
  });

  it("keeps Scene ▸ during Play and hides it in Spotlight and a Memoriam", () => {
    const { unmount } = render(
      <div className="lab-canvas">
        <ScenesCommandContext.Provider value={() => {}}>
          <PhaseStrip
            library={[]}
            scenes={scenes}
            onSwitch={() => {}}
            onEndScene={() => {}}
            onEndDeckScene={() => {}}
            onRemoveFromDeck={() => {}}
            onPlay={() => {}}
            onEdit={() => {}}
            onPrepare={() => {}}
            live={{ phase: "Play", subPhase: "Main", sessionName: "", spotlight }}
          />
        </ScenesCommandContext.Provider>
      </div>
    );
    expect(screen.getByRole("button", { name: "Scene ▸" })).toBeInTheDocument();
    unmount();

    renderStrip("Spotlight");
    expect(screen.queryByRole("button", { name: "Scene ▸" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End ▸" })).toBeInTheDocument();
  });

  it("uses Return during a Memoriam instead of the scene library", () => {
    renderStrip("Play", "Memoriam");
    expect(screen.queryByRole("button", { name: "Scene ▸" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Downtime ▸" })).toBeInTheDocument();
  });
});

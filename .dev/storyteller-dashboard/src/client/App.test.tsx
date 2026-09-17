import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./stageNpcs", () => ({ initStageNpcs: vi.fn() }));
vi.mock("./scenesTab", () => ({ initScenesTab: vi.fn() }));
vi.mock("./luaTab", () => ({ initLuaTab: vi.fn() }));
vi.mock("./generateNpcTab", () => ({ initGenerateNpc: vi.fn() }));

import { App } from "./App";

describe("App shell", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ usable: false, message: "TTS bridge offline." })
    })));
  });

  it("shows Storyteller tabs with Stage NPCs selected", () => {
    render(<App />);
    expect(screen.getByRole("tab", { name: "Stage NPCs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Scenes" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "PCs" })).toHaveAttribute("aria-selected", "false");
    expect(document.getElementById("panel-scenes")).toHaveAttribute("hidden");
  });

  it("keeps panels mounted when switching to Scenes", async () => {
    const user = userEvent.setup();
    render(<App />);
    const scenesTab = document.getElementById("tab-scenes");
    expect(scenesTab).toBeTruthy();
    await user.click(scenesTab!);
    expect(scenesTab).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("panel-scenes")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-stage-npcs")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Main NPCs" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the PCs tab without unmounting other panels", async () => {
    const user = userEvent.setup();
    render(<App />);
    const pcsTab = document.getElementById("tab-pcs");
    expect(pcsTab).toBeTruthy();
    await user.click(pcsTab!);
    expect(pcsTab).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("panel-pcs")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-stage-npcs")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "PCs" })).toHaveAttribute("aria-selected", "true");
  });
});

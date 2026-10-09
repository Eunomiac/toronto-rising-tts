import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./luaTab", () => ({ initLuaTab: vi.fn() }));
vi.mock("./generateNpcTab", () => ({ initGenerateNpc: vi.fn() }));
vi.mock("./lab/LabTab", () => ({ LabTab: () => null }));
vi.mock("./scenesPanel/ScenesPanel", () => ({ ScenesPanel: () => null }));

import { App } from "./App";

describe("App shell", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ usable: false, message: "TTS bridge offline." })
    })));
  });

  it("shows Storyteller tabs with Scenes selected", () => {
    render(<App />);
    expect(screen.getByRole("tab", { name: "Scenes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "PCs" })).toHaveAttribute("aria-selected", "false");
    expect(document.getElementById("panel-scenes")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-pcs")).toHaveAttribute("hidden");
  });

  it("opens the PCs tab without unmounting other panels", async () => {
    const user = userEvent.setup();
    render(<App />);
    const pcsTab = document.getElementById("tab-pcs");
    expect(pcsTab).toBeTruthy();
    await user.click(pcsTab!);
    expect(pcsTab).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("panel-pcs")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-scenes")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "PCs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Claim Port" })).toBeInTheDocument();
  });

  it("shows Release Port when the dashboard TTS bridge is connected", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/tts-bridge-status")) {
        return {
          ok: true,
          json: async () => ({
            usable: true,
            mode: "gateway",
            editorPort: "via_gateway",
            message: "Connected through the TTS Tools gateway (Cursor)."
          })
        };
      }
      return {
        ok: true,
        json: async () => ({ prints: [], error: "stand-in" })
      };
    }));
    const user = userEvent.setup();
    render(<App />);
    const pcsTab = document.getElementById("tab-pcs");
    expect(pcsTab).toBeTruthy();
    await user.click(pcsTab!);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Release Port" })).toBeInTheDocument();
    });
  });
});

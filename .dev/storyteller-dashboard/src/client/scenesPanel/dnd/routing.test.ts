import { afterEach, describe, expect, it, vi } from "vitest";
import { startNativeDrag, acceptNativeDrag } from "./native";
import { hitTestDrop } from "./resolve";
import { sessionTargetsAt, tryCommitDrop } from "./commit";
import { beginDrag, endDrag, getDndSession, moveDrag } from "./session";
import { isDropAllowed, edgesWithBins } from "./matrix";
import { DROP_KINDS } from "./types";

const stackAt = (...elements: Element[]): void => {
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: vi.fn(() => elements),
  });
};
const point = { x: 40, y: 70 };

afterEach(() => {
  endDrag();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("drop routing", () => {
  it("negotiates move-only sources instead of requesting a forbidden copy", () => {
    const transfer = {
      effectAllowed: "move",
      dropEffect: "none",
    } as DataTransfer;
    acceptNativeDrag(transfer);
    expect(transfer.dropEffect).toBe("move");
    transfer.effectAllowed = "copyMove";
    acceptNativeDrag(transfer);
    expect(transfer.dropEffect).toBe("copy");
    expect(() => acceptNativeDrag(null)).not.toThrow();
  });

  it("finds any roll state before a stage ancestor and ignores decorative overlays", () => {
    document.body.innerHTML =
      '<div data-tr-dnd-stage><div data-tr-dnd-roll="npcRollPostrollSecret"><span id="dice"></span></div></div><div id="overlay"></div>';
    stackAt(
      document.querySelector("#overlay")!,
      document.querySelector("#dice")!,
      document.querySelector("[data-tr-dnd-stage]")!,
    );
    expect(hitTestDrop(point)).toEqual({ dropKind: "npcRollPostrollSecret" });
  });

  it("prioritizes bins over roll cards, and treats panel gaps as cancellations", () => {
    document.body.innerHTML =
      '<div data-tr-dnd-panel="A"><button data-tr-dnd-bin="std"></button></div><div data-tr-dnd-roll="pcRollPreroll" data-tr-dnd-roll-color="Pink"></div>';
    const bin = document.querySelector("button")!,
      panel = bin.parentElement!,
      roll = document.querySelector("[data-tr-dnd-roll]")!;
    stackAt(bin, panel, roll);
    expect(hitTestDrop(point)).toEqual({ dropKind: "panelA", binId: "std" });
    stackAt(panel, roll);
    expect(hitTestDrop(point)).toEqual({ dropKind: "panelA" });
  });

  it("identifies a seated PC by their color, not the literal holder label pc", () => {
    document.body.innerHTML =
      '<div data-chair="1" data-chair-holder="pc" data-chair-kind="pc" data-seat-key="Pink"></div>';
    stackAt(document.body.firstElementChild!);
    expect(hitTestDrop(point)).toMatchObject({
      dropKind: "pcSeated",
      holderKey: "Pink",
    });
  });

  it("anchors hover choices to their character while the pointer approaches a bin", () => {
    document.body.innerHTML =
      '<div data-tr-dnd-staged="victorVex"></div><button data-tr-dnd-hover-bin="diffLow" data-tr-dnd-hover-drop="npcStaged"></button>';
    beginDrag({ dragKind: "pcRollPreroll", color: "Pink" }, point);
    stackAt(document.body.firstElementChild!);
    const first = sessionTargetsAt(point, "pcRollPreroll");
    moveDrag(point, first.highlight, first.hover);
    stackAt(document.querySelector("button")!);
    const next = sessionTargetsAt({ x: 50, y: 80 }, "pcRollPreroll");
    moveDrag({ x: 50, y: 80 }, next.highlight, next.hover);
    expect(getDndSession().hover).toEqual({
      dropKind: "npcStaged",
      characterKey: "victorVex",
    });
    expect(getDndSession().hoverPointer).toEqual(point);
    expect(getDndSession().highlight?.binId).toBe("diffLow");
  });

  it("allows roster groups only on stage geometry and never opens character bins", () => {
    expect(
      DROP_KINDS.filter((drop) => isDropAllowed("npcRosterGroup", drop)),
    ).toEqual(["stage", "pack", "npcStaged"]);
    expect(edgesWithBins("npcRosterGroup")).toEqual([]);
    const ctx = { scenes: vi.fn(), rolls: vi.fn() };
    expect(
      tryCommitDrop(
        {
          dragKind: "npcRosterGroup",
          groupKey: "Coterie",
          members: [
            { characterKey: "a", name: "A" },
            { characterKey: "b", name: "B" },
          ],
        },
        { dropKind: "panelA", binId: "std" },
        ctx,
      ),
    ).toBe(false);
    expect(ctx.rolls).not.toHaveBeenCalled();
    expect(ctx.scenes).not.toHaveBeenCalled();
  });

  it("does not report a missing editor hook as a successful drop", () => {
    const notify = vi.fn();
    expect(
      tryCommitDrop(
        { dragKind: "npcStaged", characterKey: "victorVex" },
        { dropKind: "panelC", binId: "edit" },
        { scenes: vi.fn(), rolls: vi.fn(), ui: { notify } },
      ),
    ).toBe(false);
    expect(notify).toHaveBeenCalledWith("This control is unavailable here.");
  });
  it("defers shelves until the browser has captured its native drag image", () => {
    vi.useFakeTimers();
    const event = {
      clientX: 40,
      clientY: 70,
      dataTransfer: { effectAllowed: "move", setDragImage: vi.fn() },
    };
    startNativeDrag(
      event as unknown as import("react").DragEvent<HTMLElement>,
      { dragKind: "npcRoster", characterKey: "victorVex" },
    );
    expect(getDndSession().active).toBe(false);
    vi.advanceTimersByTime(20);
    expect(getDndSession().active).toBe(true);
    endDrag();
    startNativeDrag(
      event as unknown as import("react").DragEvent<HTMLElement>,
      { dragKind: "npcRoster", characterKey: "victorVex" },
    );
    document.dispatchEvent(new Event("dragend"));
    vi.advanceTimersByTime(20);
    expect(getDndSession().active).toBe(false);
    vi.useRealTimers();
  });

  it("keeps hover choices reachable while crossing the gap, then closes them farther away", () => {
    beginDrag({ dragKind: "pcRollPreroll", color: "Pink" }, point);
    moveDrag(point, null, { dropKind: "npcStaged", characterKey: "victorVex" });
    stackAt();
    expect(
      sessionTargetsAt({ x: 40, y: 120 }, "pcRollPreroll").hover,
    ).toMatchObject({ characterKey: "victorVex" });
    expect(
      sessionTargetsAt({ x: 40, y: 400 }, "pcRollPreroll").hover,
    ).toBeNull();
  });

  it("does not let a broad stage container mask an NPC target lower in the stack", () => {
    document.body.innerHTML =
      '<div data-tr-dnd-stage></div><div data-tr-dnd-staged="victorVex"></div>';
    stackAt(document.body.firstElementChild!, document.body.lastElementChild!);
    expect(hitTestDrop(point)).toEqual({
      dropKind: "npcStaged",
      characterKey: "victorVex",
    });
  });
});

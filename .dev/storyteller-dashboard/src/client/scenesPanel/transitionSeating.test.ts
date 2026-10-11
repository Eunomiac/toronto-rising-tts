import { describe, expect, it } from "vitest";
import type { LibraryScene } from "../../shared/sceneLibrary";
import type { SeatRow } from "../worldState";
import { draftSeatRows } from "./library";
import { carryOverSeating, orphanNpc, seatingChanged, seatOrphan, withSeatingOf } from "./transitionSeating";

const destination: LibraryScene = {
  key: "next",
  title: "Next",
  placementMode: "standard",
  linked: false,
  status: "new",
  sessionScene: {
    tableKey: "Table A",
    seatSlots: {
      Red: { characterKey: "lordLucien", isPresent: true, tableSlot: 1 },
      NPC1: { characterKey: "rosie", isPresent: true, tableSlot: 5 },
      NPC2: { slotEmpty: true, tableSlot: 6 },
      NPC3: { slotEmpty: true },
      NPC4: { slotEmpty: true }
    },
    seatPresent: { Red: true, NPC1: true },
    npcWorld: { placements: { laz: { u: 0.5, v: 0.5 } } }
  }
};

const table: readonly SeatRow[] = [
  { seat: "Red", kind: "pc", isPresent: true, tableSlot: 1, charKey: "lordLucien" },
  { seat: "NPC1", kind: "npc", isPresent: true, tableSlot: 5, characterKey: "bee" },
  { seat: "NPC2", kind: "npc", isPresent: false, tableSlot: 7, characterKey: "mara" },
  { seat: "NPC3", kind: "npc", isPresent: true, tableSlot: 8, characterKey: "rosie" },
  { seat: "NPC4", kind: "npc", isPresent: true, tableSlot: 9, characterKey: "laz" }
];

const npcChairs = (row: LibraryScene): Record<string, number | undefined> =>
  Object.fromEntries(
    draftSeatRows(row, []).filter((seat) => seat.kind === "npc" && seat.characterKey).map((seat) => [seat.characterKey!, seat.tableSlot])
  );

describe("carryOverSeating", () => {
  const start = carryOverSeating(destination, table);

  it("keeps the destination's seating and orphans a table NPC whose chair it takes", () => {
    expect(npcChairs(start.row)).toMatchObject({ rosie: 5 });
    expect(start.orphans).toEqual(["bee"]);
  });

  it("carries a table NPC into its free chair, keeping their presence", () => {
    expect(npcChairs(start.row)).toMatchObject({ mara: 7 });
    expect(draftSeatRows(start.row, []).find((seat) => seat.characterKey === "mara")?.isPresent).toBe(false);
  });

  it("leaves NPCs the destination already places alone", () => {
    expect(npcChairs(start.row).laz).toBeUndefined();
    expect(Object.values(npcChairs(start.row))).not.toContain(8);
  });
});

describe("strip edits", () => {
  const start = carryOverSeating(destination, table);

  it("drags a seated NPC off the strip into the orphans", () => {
    const next = orphanNpc(start, "mara");
    expect(npcChairs(next.row).mara).toBeUndefined();
    expect(next.orphans).toEqual(["bee", "mara"]);
  });

  it("seats an orphan on a chair, swapping out the NPC there", () => {
    const next = seatOrphan(start, "bee", 5);
    expect(npcChairs(next.row)).toMatchObject({ bee: 5, mara: 7 });
    expect(next.orphans).toEqual(["rosie"]);
  });

  it("refuses a PC's chair", () => {
    expect(seatOrphan(start, "bee", 1)).toBe(start);
  });

  it("copies the edited seating onto the row being played", () => {
    const played = withSeatingOf({ ...destination, title: "Copy" }, start.row);
    expect(played.title).toBe("Copy");
    expect(npcChairs(played)).toEqual(npcChairs(start.row));
    expect(seatingChanged(destination, start.row)).toBe(true);
    expect(seatingChanged(destination, destination)).toBe(false);
  });
});

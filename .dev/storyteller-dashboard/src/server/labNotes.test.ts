import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLabNoteStore, LabNoteError, parseLabNoteCreate, parseLabNotePatch } from "./labNotes";

describe("lab note store", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "lab-notes-"));
    filePath = path.join(dir, "agent", "lab-notes.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("starts empty and numbers notes in order", async () => {
    const store = createLabNoteStore(filePath);
    expect((await store.list()).notes).toEqual([]);
    await store.add({ sketch: "scenes-r1-a", x: 10, y: 20, text: "Too big" });
    const file = await store.add({ sketch: "scenes-r1-b", x: 30, y: 40, text: "Love this" });
    expect(file.notes.map((note) => [note.id, note.sketch, note.status])).toEqual([
      [1, "scenes-r1-a", "open"],
      [2, "scenes-r1-b", "open"]
    ]);
    const onDisk = JSON.parse(await readFile(filePath, "utf8")) as { notes: unknown[] };
    expect(onDisk.notes).toHaveLength(2);
  });

  it("edits, resolves, and deletes notes, keeping ids stable", async () => {
    const store = createLabNoteStore(filePath);
    await store.add({ sketch: "scenes-r1-a", x: 1, y: 1, text: "One" });
    await store.add({ sketch: "scenes-r1-a", x: 2, y: 2, text: "Two" });
    await store.update(1, { text: "One, edited", status: "done" });
    await store.remove(2);
    const file = await store.add({ sketch: "scenes-r1-a", x: 3, y: 3, text: "Three" });
    expect(file.notes.map((note) => [note.id, note.text, note.status])).toEqual([
      [1, "One, edited", "done"],
      [2, "Three", "open"]
    ]);
    await expect(store.remove(99)).rejects.toBeInstanceOf(LabNoteError);
  });

  it("rejects bad input", () => {
    expect(() => parseLabNoteCreate({ sketch: "Bad Id!", x: 1, y: 1, text: "x" })).toThrow(LabNoteError);
    expect(() => parseLabNoteCreate({ sketch: "scenes-r1-a", x: 1, y: 1, text: "   " })).toThrow(LabNoteError);
    expect(() => parseLabNotePatch({ status: "maybe" })).toThrow(LabNoteError);
    expect(parseLabNoteCreate({ sketch: "scenes-r1-a", x: 1.6, y: 2.2, text: " hi " })).toEqual({
      sketch: "scenes-r1-a",
      x: 2,
      y: 2,
      text: "hi"
    });
  });
});

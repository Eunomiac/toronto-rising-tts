import { describe, expect, it } from "vitest";
import type { SceneCatalogs } from "../scenes/types";
import type { SeatsSlice, SoundscapeSlice } from "../worldState";
import { liveSeats, liveTokens, soundView, spotlightView, toDate, weatherAxes } from "./liveScene";

const catalogs = {
  pcs: [
    { characterKey: "aishe", fullName: "Aishe Tache", isPC: true, groups: [], pickerGroups: [] },
    { characterKey: "rashid", fullName: "Rashid Abdulrahman", isPC: true, groups: [], pickerGroups: [] }
  ],
  namedNpcs: [{ characterKey: "victorVex", fullName: "Victor Vex", isPC: false, groups: [], pickerGroups: [] }],
  tables: [{ key: "Table B", slotCapacity: 7 }]
} as unknown as SceneCatalogs;

const seats: SeatsSlice = {
  seats: [
    { seat: "Pink", kind: "pc", tableSlot: 1, isPresent: true, charKey: "aishe", absentFromSession: false },
    { seat: "Orange", kind: "pc", tableSlot: 2, isPresent: false, charKey: "rashid", absentFromSession: false, playingNpcKey: "victorVex" },
    { seat: "Red", kind: "pc", isPresent: true, charKey: "lordLucien", absentFromSession: true },
    { seat: "NPC1", kind: "npc", tableSlot: 6, isPresent: true, characterKey: "victorVex" },
    { seat: "NPC2", kind: "npc", isPresent: true, slotEmpty: true }
  ],
  stage: [
    { characterKey: "victorVex", u: 0.5, v: 0.25, lightMode: "STANDARD" },
    { characterKey: "kai", u: 0.1, v: 0.2, lightMode: "OFF" },
    { characterKey: "nowhere" }
  ],
  generics: [],
  scatter: [],
  spotlightOrder: ["Pink", "Orange", "Red"],
  spotlightFrontIndex: 2
};

describe("liveSeats", () => {
  it("places occupants by chair number, keeps absence and role play, and marks missing chairs", () => {
    const row = liveSeats(seats, "Table B", catalogs);
    expect(row.map((seat) => seat.slot)).toEqual([9, 7, 5, 3, 1, 2, 4, 6, 8]);
    expect(row.find((seat) => seat.slot === 1)).toMatchObject({ kind: "pc", name: "Aishe Tache", color: "Pink" });
    expect(row.find((seat) => seat.slot === 2)).toMatchObject({
      kind: "pc", characterKey: "victorVex", name: "Victor Vex", playedBy: "Rashid Abdulrahman", state: "absent", color: "Orange"
    });
    expect(row.find((seat) => seat.slot === 6)).toMatchObject({ kind: "npc", name: "Victor Vex" });
    expect(row.find((seat) => seat.slot === 3)?.kind).toBe("empty");
    expect(row.find((seat) => seat.slot === 8)?.kind).toBe("nochair");
    expect(row.some((seat) => seat.characterKey === "lordLucien")).toBe(false);
  });
});

describe("liveTokens", () => {
  it("keeps placed NPCs with first names and lit state", () => {
    expect(liveTokens(seats.stage, catalogs)).toEqual([
      { characterKey: "victorVex", name: "Victor", lit: true, u: 0.5, v: 0.25 },
      { characterKey: "kai", name: "kai", lit: false, u: 0.1, v: 0.2 }
    ]);
  });
});

describe("spotlightView", () => {
  it("converts the 1-based Lua front index", () => {
    expect(spotlightView(seats)).toEqual({
      order: [{ color: "Pink", characterKey: "aishe" }, { color: "Orange", characterKey: "rashid" }, { color: "Red", characterKey: "lordLucien" }],
      front: 1
    });
  });
});

describe("weatherAxes", () => {
  it("maps TTS rain and wind layers", () => {
    expect(weatherAxes({ rain: "rainHeavy", wind: "windWinterMax", thunder: true, indoors: false })).toEqual({ precip: "heavyRain", wind: 3, thunder: true });
    expect(weatherAxes({ rain: "rainLight", wind: "windLow", thunder: false, indoors: false })).toEqual({ precip: "lightRain", wind: 1, thunder: false });
    expect(weatherAxes({ thunder: false, indoors: true })).toEqual({ precip: "none", wind: 0, thunder: false });
  });
});

describe("soundView", () => {
  it("reads lanes as slider values and names the playlist", () => {
    const sound: SoundscapeSlice = {
      musicMood: "combat", musicEnabled: true, musicSuppressed: false, siteSilent: false, featuredActive: true, featuredKey: "TR_Loop",
      sessionIntroActive: false, location: "none",
      lanes: [
        { id: "featured", volume: 0.25, naturalVolume: 0.25, ducked: false, active: true },
        { id: "thunder", volume: 0.6, naturalVolume: 0.6, ducked: false, active: false }
      ]
    };
    const view = soundView(sound);
    expect(view.playlist).toBe("Combat");
    expect(view.levels.featured).toBe(25);
    expect(view.playing.featured).toBe(true);
    expect(view.levels.thunder).toBe(60);
    expect(view.playing.thunder).toBe(false);
    expect(view.ambient).toBeUndefined();
    expect(soundView({ ...sound, musicEnabled: false }).playlist).toBe("Silent");
    expect(soundView({ ...sound, musicMode: "locationMusic", locationMusic: "gioEstate" }).playlist).toBe("Giovanni Estate");
  });
});

describe("toDate", () => {
  it("builds a local date (months are 1-based in Lua)", () => {
    const date = toDate({ year: 2026, month: 9, day: 22, hour: 5, minute: 33 });
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()]).toEqual([2026, 8, 22, 5, 33]);
  });
});

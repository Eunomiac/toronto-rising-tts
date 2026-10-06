import { describe, expect, it } from "vitest";
import {
  displayStakes,
  draftFieldDiff,
  draftFromProject,
  emptyProjectDraft,
  parseDateInput,
  parseProjectsSnapshot,
  projectsForSource,
  rebaseDraft,
  stakeCapacity,
  stakeClass
} from "./projects.js";

const raw = {
  ok: true,
  presentDayText: "Jun. 3, 2027",
  presentDay: { year: 2027, month: 6, day: 3 },
  sources: [{ key: "rashid", label: "Rashid Abdulrahman", color: "Red" }, { key: "coterie", label: "Coterie" }],
  advantages: {
    rashid: [{ name: "Resources", focus: "", label: "Resources", free: 1 }],
    coterie: []
  },
  order: { rashid: ["p2", "p1"], coterie: [] },
  increments: [{ key: "weekly", label: "Weekly" }],
  projects: [
    {
      id: "p1",
      owner: "rashid",
      phase: "inProgress",
      goal: "Take the docks",
      scope: 3,
      startDate: { year: 2027, month: 5, day: 1 },
      increment: "weekly",
      projectDieMod: 0,
      launchRollSkill: "Politics",
      launchRollAdvantage: "Resources",
      launchRollDifficulty: 5,
      numContributors: 1,
      launchRollResult: "win",
      launchRollMargin: 2,
      stakeRows: [
        { source: "rashid", name: "Resources", focus: "", qty: 2 },
        { source: "coterie", qty: 0 }
      ],
      derived: { autoPhase: "inProgress", requiredStake: 2, sumStake: 2, die: 6, startText: "May 1, 2027", endText: "Jul. 10, 2027", beginEligible: false, beginMessage: "", launchEligible: false, launchRollDisplay: "Politics + Resources", displayFor: ["rashid", "coterie"] }
    },
    { id: "p2", owner: "rashid", phase: "setup", goal: "", stakeRows: [], derived: [] }
  ]
};

describe("parseProjectsSnapshot", () => {
  it("parses projects, order, and Lua empty-table arrays", () => {
    const snapshot = parseProjectsSnapshot(raw);
    expect(snapshot.ok).toBe(true);
    expect(projectsForSource(snapshot, "rashid").map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(projectsForSource(snapshot, "coterie")).toEqual([]);
    const p1 = snapshot.projects.find((p) => p.id === "p1");
    expect(p1?.derived.die).toBe(6);
    expect(p1?.stakeRows[1]).toEqual({ source: "coterie", name: "", focus: "", qty: 0 });
    const p2 = snapshot.projects.find((p) => p.id === "p2");
    expect(p2?.scope).toBeNull();
    expect(p2?.derived.displayFor).toEqual([]);
  });

  it("returns the host error when ok is false", () => {
    expect(parseProjectsSnapshot({ ok: false, error: "nope" }).error).toBe("nope");
  });
});

describe("stakes", () => {
  it("classifies and limits displayed stakes", () => {
    const p1 = parseProjectsSnapshot(raw).projects.find((p) => p.id === "p1");
    if (!p1) throw new Error("missing p1");
    expect(displayStakes(p1)).toHaveLength(1);
    expect(stakeClass(p1.stakeRows[0]!, "rashid")).toBe("self");
    expect(stakeClass(p1.stakeRows[0]!, "aishe")).toBe("other");
    expect(stakeClass(p1.stakeRows[1]!, "rashid")).toBe("coterie");
  });

  it("adds this project's held dots back to free capacity", () => {
    const snapshot = parseProjectsSnapshot(raw);
    const p1 = snapshot.projects.find((p) => p.id === "p1");
    const row = { source: "rashid", name: "Resources", focus: "" };
    expect(stakeCapacity(snapshot, undefined, row)).toBe(1);
    expect(stakeCapacity(snapshot, p1, row)).toBe(3);
  });
});

describe("drafts", () => {
  it("diffs only changed fields and converts types", () => {
    const p1 = parseProjectsSnapshot(raw).projects.find((p) => p.id === "p1");
    if (!p1) throw new Error("missing p1");
    const base = draftFromProject(p1);
    expect(draftFieldDiff(base, base)).toEqual({});
    expect(draftFieldDiff({ ...base, scope: "4", launchRollMargin: "" }, base)).toEqual({ scope: 4, launchRollMargin: "" });
    expect(draftFieldDiff({ ...base, startDate: "2027-07-04" }, base)).toEqual({ startDate: { year: 2027, month: 7, day: 4 } });
  });

  it("sends non-empty fields for a new project", () => {
    const draft = { ...emptyProjectDraft("rashid", { year: 2027, month: 6, day: 3 }), goal: "Win" };
    expect(draftFieldDiff(draft, null)).toEqual({
      owner: "rashid",
      goal: "Win",
      startDate: { year: 2027, month: 6, day: 3 },
      numContributors: 1,
      projectDieMod: 0
    });
  });

  it("rebases untouched fields onto fresh TTS values", () => {
    const old = emptyProjectDraft("rashid", null);
    const draft = { ...old, goal: "typed" };
    const fresh = { ...old, scope: "3", launchRollDifficulty: "5" };
    const out = rebaseDraft(draft, old, fresh);
    expect(out.goal).toBe("typed");
    expect(out.launchRollDifficulty).toBe("5");
  });

  it("parses date input values", () => {
    expect(parseDateInput("1888-02-29")).toEqual({ year: 1888, month: 2, day: 29 });
    expect(parseDateInput("June 3")).toBeNull();
  });
});

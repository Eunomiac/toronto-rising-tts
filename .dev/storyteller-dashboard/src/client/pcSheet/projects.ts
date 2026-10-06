/**
 * Sheet Page 5 projects: snapshot parser, editor drafts, and the field diff sent to TTS.
 * Every derived value (phase, required stake, die, end date, Begin eligibility) comes from Lua.
 */

export const PHASE = {
  setup: "setup",
  preLaunch: "preLaunch",
  postLaunch: "postLaunch",
  inProgress: "inProgress",
  complete: "complete"
} as const;

export const PHASE_LABELS: Record<string, string> = {
  setup: "Setup",
  preLaunch: "Pre-launch",
  postLaunch: "Post-launch",
  inProgress: "In progress",
  complete: "Complete"
};

export const RESULT_OPTIONS = [
  { value: "", label: "—" },
  { value: "win", label: "Win" },
  { value: "criticalWin", label: "Critical Win" }
] as const;

export const STAKE_ROW_POOL = 8;
export const DISPLAY_STAKE_ROWS = 4;
export const MAX_SCOPE = 15;
export const COTERIE = "coterie";

export type ProjectDate = { readonly year: number; readonly month: number; readonly day: number };

export type ProjectStakeRow = {
  readonly source: string;
  readonly name: string;
  readonly focus: string;
  readonly qty: number;
};

export type ProjectDerived = {
  readonly autoPhase: string;
  readonly requiredStake: number | null;
  readonly sumStake: number;
  readonly die: number | null;
  readonly startText: string;
  readonly endText: string;
  readonly beginEligible: boolean;
  readonly beginMessage: string;
  readonly launchEligible: boolean;
  readonly launchRollDisplay: string;
  readonly displayFor: readonly string[];
};

export type Project = {
  readonly id: string;
  readonly owner: string;
  readonly phase: string;
  readonly goal: string;
  readonly scope: number | null;
  readonly startDate: ProjectDate | null;
  readonly increment: string;
  readonly projectDieMod: number;
  readonly launchRollSkill: string;
  readonly launchRollAdvantage: string;
  readonly launchRollDifficulty: number | null;
  readonly numContributors: number;
  readonly launchRollResult: string;
  readonly launchRollMargin: number | null;
  readonly stakeRows: readonly ProjectStakeRow[];
  readonly derived: ProjectDerived;
};

export type ProjectSource = { readonly key: string; readonly label: string; readonly color?: string };
export type ProjectAdvantage = { readonly name: string; readonly focus: string; readonly label: string; readonly free: number };

export type ProjectsSnapshot = {
  readonly ok: boolean;
  readonly error?: string;
  readonly presentDayText: string;
  readonly presentDay: ProjectDate | null;
  readonly sources: readonly ProjectSource[];
  readonly advantages: Readonly<Record<string, readonly ProjectAdvantage[]>>;
  readonly order: Readonly<Record<string, readonly string[]>>;
  readonly projects: readonly Project[];
  readonly increments: readonly { readonly key: string; readonly label: string }[];
  readonly createdId?: string;
};

/** "" clears a field in Lua (JSON null does not survive TTS decode). */
export type ProjectFields = Partial<{
  owner: string;
  goal: string;
  scope: number | "";
  increment: string;
  startDate: ProjectDate | "";
  launchRollSkill: string;
  launchRollAdvantage: string;
  launchRollDifficulty: number | "";
  numContributors: number;
  projectDieMod: number;
  launchRollResult: string;
  launchRollMargin: number | "";
}>;

export type ProjectCommand =
  | { readonly op: "create"; readonly fields: ProjectFields; readonly stakeRows?: readonly ProjectStakeRow[] }
  | { readonly op: "patch"; readonly id: string; readonly fields: ProjectFields }
  | { readonly op: "setStakeRows"; readonly id: string; readonly rows: readonly ProjectStakeRow[] }
  | { readonly op: "begin" | "complete" | "delete" | "launchRoll"; readonly id: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asOptNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const parseDate = (value: unknown): ProjectDate | null =>
  isRecord(value) && typeof value.year === "number" && typeof value.month === "number" && typeof value.day === "number"
    ? { year: value.year, month: value.month, day: value.day }
    : null;

const parseStakeRow = (value: unknown): ProjectStakeRow | null =>
  isRecord(value) && typeof value.source === "string" && value.source !== ""
    ? { source: value.source, name: asString(value.name), focus: asString(value.focus), qty: Math.floor(asNumber(value.qty)) }
    : null;

const parseProject = (value: unknown): Project | null => {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }
  const d = isRecord(value.derived) ? value.derived : {};
  return {
    id: value.id,
    owner: asString(value.owner),
    phase: asString(value.phase) || PHASE.setup,
    goal: asString(value.goal),
    scope: asOptNumber(value.scope),
    startDate: parseDate(value.startDate),
    increment: asString(value.increment),
    projectDieMod: Math.floor(asNumber(value.projectDieMod)),
    launchRollSkill: asString(value.launchRollSkill),
    launchRollAdvantage: asString(value.launchRollAdvantage),
    launchRollDifficulty: asOptNumber(value.launchRollDifficulty),
    numContributors: Math.max(1, Math.floor(asNumber(value.numContributors, 1))),
    launchRollResult: asString(value.launchRollResult),
    launchRollMargin: asOptNumber(value.launchRollMargin),
    stakeRows: asArray(value.stakeRows).map(parseStakeRow).filter((row): row is ProjectStakeRow => row !== null),
    derived: {
      autoPhase: asString(d.autoPhase),
      requiredStake: asOptNumber(d.requiredStake),
      sumStake: asNumber(d.sumStake),
      die: asOptNumber(d.die),
      startText: asString(d.startText),
      endText: asString(d.endText),
      beginEligible: d.beginEligible === true,
      beginMessage: asString(d.beginMessage),
      launchEligible: d.launchEligible === true,
      launchRollDisplay: asString(d.launchRollDisplay),
      displayFor: asArray(d.displayFor).filter((key): key is string => typeof key === "string")
    }
  };
};

export const emptyProjectsSnapshot = (error?: string): ProjectsSnapshot => ({
  ok: false,
  ...(error ? { error } : {}),
  presentDayText: "",
  presentDay: null,
  sources: [],
  advantages: {},
  order: {},
  projects: [],
  increments: []
});

/** Lua encodes an empty table as [], so map-shaped fields accept arrays as empty. */
export const parseProjectsSnapshot = (value: unknown): ProjectsSnapshot => {
  if (!isRecord(value)) {
    throw new Error("Projects snapshot was not an object.");
  }
  if (value.ok === false) {
    return emptyProjectsSnapshot(asString(value.error) || "Projects apply failed");
  }
  const advantages: Record<string, ProjectAdvantage[]> = {};
  if (isRecord(value.advantages)) {
    for (const [key, list] of Object.entries(value.advantages)) {
      advantages[key] = asArray(list).flatMap((row) =>
        isRecord(row) && typeof row.name === "string"
          ? [{ name: row.name, focus: asString(row.focus), label: asString(row.label) || row.name, free: Math.floor(asNumber(row.free)) }]
          : []
      );
    }
  }
  const order: Record<string, string[]> = {};
  if (isRecord(value.order)) {
    for (const [key, ids] of Object.entries(value.order)) {
      order[key] = asArray(ids).filter((id): id is string => typeof id === "string");
    }
  }
  return {
    ok: true,
    presentDayText: asString(value.presentDayText),
    presentDay: parseDate(value.presentDay),
    sources: asArray(value.sources).flatMap((row) =>
      isRecord(row) && typeof row.key === "string"
        ? [{ key: row.key, label: asString(row.label) || row.key, ...(typeof row.color === "string" ? { color: row.color } : {}) }]
        : []
    ),
    advantages,
    order,
    projects: asArray(value.projects).map(parseProject).filter((p): p is Project => p !== null),
    increments: asArray(value.increments).flatMap((row) =>
      isRecord(row) && typeof row.key === "string" ? [{ key: row.key, label: asString(row.label) || row.key }] : []
    ),
    ...(typeof value.createdId === "string" ? { createdId: value.createdId } : {})
  };
};

/** Projects shown on a source's Page 5, in Lua's listForDisplaySource order. */
export const projectsForSource = (snapshot: ProjectsSnapshot, sourceKey: string): Project[] => {
  const byId = new Map(snapshot.projects.map((p) => [p.id, p]));
  return (snapshot.order[sourceKey] ?? []).flatMap((id) => {
    const project = byId.get(id);
    return project ? [project] : [];
  });
};

export type StakeClass = "self" | "coterie" | "other";

export const stakeClass = (row: ProjectStakeRow, viewerKey: string): StakeClass =>
  row.source === COTERIE ? "coterie" : row.source === viewerKey ? "self" : "other";

/** Rows the TTS card paints: an advantage with at least one dot, first four only. */
export const displayStakes = (project: Project): ProjectStakeRow[] =>
  project.stakeRows.filter((row) => row.name !== "" && row.qty >= 1).slice(0, DISPLAY_STAKE_ROWS);

export const stakeLabel = (row: { readonly name: string; readonly focus: string }): string =>
  row.focus ? `${row.name} (${row.focus})` : row.name;

export const phaseHoldsStakes = (phase: string): boolean => phase === PHASE.postLaunch || phase === PHASE.inProgress;

/**
 * Dots this project may stake on an advantage. Snapshot `free` already subtracts every project's
 * held stakes, so add back what this project holds while its phase holds stakes.
 */
export const stakeCapacity = (
  snapshot: ProjectsSnapshot,
  project: Project | undefined,
  row: { readonly source: string; readonly name: string; readonly focus: string }
): number => {
  const adv = (snapshot.advantages[row.source] ?? []).find((a) => a.name === row.name && a.focus === row.focus);
  const free = adv?.free ?? 0;
  if (!project || !phaseHoldsStakes(project.phase)) {
    return free;
  }
  const held = project.stakeRows
    .filter((r) => r.source === row.source && r.name === row.name && r.focus === row.focus)
    .reduce((sum, r) => sum + Math.max(0, r.qty), 0);
  return free + held;
};

// ---------------------------------------------------------------- editor drafts

export type ProjectDraft = {
  readonly owner: string;
  readonly goal: string;
  readonly scope: string;
  readonly increment: string;
  readonly startDate: string;
  readonly launchRollSkill: string;
  readonly launchRollAdvantage: string;
  readonly launchRollDifficulty: string;
  readonly numContributors: string;
  readonly projectDieMod: string;
  readonly launchRollResult: string;
  readonly launchRollMargin: string;
  readonly stakeRows: readonly ProjectStakeRow[];
};

export type DraftField = Exclude<keyof ProjectDraft, "stakeRows">;

const pad = (n: number, width: number): string => String(n).padStart(width, "0");

/** `<input type="date">` value. */
export const dateInputValue = (date: ProjectDate | null): string =>
  date ? `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}` : "";

export const parseDateInput = (text: string): ProjectDate | null => {
  const match = /^(\d{3,4})-(\d{2})-(\d{2})$/.exec(text.trim());
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
};

const numText = (value: number | null): string => (value === null ? "" : String(value));

export const draftFromProject = (project: Project): ProjectDraft => ({
  owner: project.owner,
  goal: project.goal,
  scope: numText(project.scope),
  increment: project.increment,
  startDate: dateInputValue(project.startDate),
  launchRollSkill: project.launchRollSkill,
  launchRollAdvantage: project.launchRollAdvantage,
  launchRollDifficulty: numText(project.launchRollDifficulty),
  numContributors: String(project.numContributors),
  projectDieMod: String(project.projectDieMod),
  launchRollResult: project.launchRollResult,
  launchRollMargin: numText(project.launchRollMargin),
  stakeRows: project.stakeRows
});

export const emptyProjectDraft = (owner: string, presentDay: ProjectDate | null): ProjectDraft => ({
  owner,
  goal: "",
  scope: "",
  increment: "",
  startDate: dateInputValue(presentDay),
  launchRollSkill: "",
  launchRollAdvantage: "",
  launchRollDifficulty: "",
  numContributors: "1",
  projectDieMod: "0",
  launchRollResult: "",
  launchRollMargin: "",
  stakeRows: []
});

const optNum = (text: string): number | "" => {
  const trimmed = text.trim();
  if (trimmed === "") {
    return "";
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    throw new Error(`"${text}" is not a number`);
  }
  return Math.floor(n);
};

const intOr = (text: string, fallback: number): number => {
  const n = Number(text.trim());
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const fieldValue = (draft: ProjectDraft, key: DraftField): ProjectFields[keyof ProjectFields] => {
  switch (key) {
    case "scope":
    case "launchRollDifficulty":
    case "launchRollMargin":
      return optNum(draft[key]);
    case "numContributors":
      return Math.max(1, intOr(draft.numContributors, 1));
    case "projectDieMod":
      return intOr(draft.projectDieMod, 0);
    case "startDate": {
      if (draft.startDate.trim() === "") {
        return "";
      }
      const date = parseDateInput(draft.startDate);
      if (!date) {
        throw new Error("Start date is not a valid date");
      }
      return date;
    }
    default:
      return draft[key];
  }
};

/**
 * Fields whose draft text differs from `base`. Scope is sent before difficulty in Lua, so leaving
 * difficulty untouched lets the scope → difficulty auto-fill run.
 */
export const draftFieldDiff = (draft: ProjectDraft, base: ProjectDraft | null): ProjectFields => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(draft) as (keyof ProjectDraft)[]) {
    if (key === "stakeRows") {
      continue;
    }
    if (base === null ? draft[key] !== "" : draft[key] !== base[key]) {
      out[key] = fieldValue(draft, key);
    }
  }
  return out as ProjectFields;
};

const rowKey = (row: ProjectStakeRow): string => `${row.source}\u0001${row.name}\u0001${row.focus}\u0001${row.qty}`;

export const stakeRowsEqual = (a: readonly ProjectStakeRow[], b: readonly ProjectStakeRow[]): boolean =>
  a.length === b.length && a.every((row, i) => rowKey(row) === rowKey(b[i] as ProjectStakeRow));

/** Keep edits the author made since `oldBase`; take TTS values for everything else. */
export const rebaseDraft = (draft: ProjectDraft, oldBase: ProjectDraft, newBase: ProjectDraft): ProjectDraft => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(newBase) as (keyof ProjectDraft)[]) {
    if (key === "stakeRows") {
      out[key] = stakeRowsEqual(draft.stakeRows, oldBase.stakeRows) ? newBase.stakeRows : draft.stakeRows;
    } else {
      out[key] = draft[key] === oldBase[key] ? newBase[key] : draft[key];
    }
  }
  return out as ProjectDraft;
};

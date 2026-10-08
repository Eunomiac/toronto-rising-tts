import { useCallback, useEffect, useState, type ReactElement } from "react";
import { DotLine } from "./DotLine.js";
import { assetUrl } from "./layout.js";
import type { DotFill, DotSlot } from "./paint.js";
import type { PageContext } from "./pages.js";
import { ProjectEditor } from "./ProjectEditor.js";
import {
  COTERIE,
  displayStakes,
  draftFromProject,
  emptyProjectDraft,
  emptyProjectsSnapshot,
  MAX_SCOPE,
  PHASE,
  projectsForSource,
  stakeClass,
  stakeLabel,
  type Project,
  type ProjectDraft,
  type ProjectsSnapshot,
  type StakeClass
} from "./projects.js";
import { fetchProjectsSnapshot } from "./projectsBridge.js";
import { subscribeTtsEvents } from "../ttsEvents.js";

type Editing = { readonly project?: Project; readonly draft: ProjectDraft };

const STAKE_DOT: Record<StakeClass, DotFill> = {
  self: "dot_white",
  coterie: "dot_yellow",
  other: "dot_grey"
};

const filledDots = (count: number, image: DotFill): DotSlot[] =>
  Array.from({ length: count }, () => ({ active: true, image }));

const INCREMENT_TEXT = (snapshot: ProjectsSnapshot, key: string): string => {
  const label = snapshot.increments.find((inc) => inc.key === key)?.label ?? "";
  return label ? `(Increments ${label})` : "";
};

const ProjectCard = ({
  project,
  snapshot,
  viewerKey,
  onEdit
}: {
  readonly project: Project;
  readonly snapshot: ProjectsSnapshot;
  readonly viewerKey: string;
  readonly onEdit: (project: Project) => void;
}): ReactElement => {
  const scope = Math.max(0, Math.min(MAX_SCOPE, project.scope ?? 0));
  const crit = project.launchRollResult === "criticalWin";
  const win = project.launchRollResult === "win";
  const die = project.derived.die;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`pc-proj-card phase-${project.phase}`}
      title="Edit project"
      onClick={() => onEdit(project)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(project);
        }
      }}
    >
      <div className="pc-proj-header">
        <span className="pc-proj-scope" aria-label={`Scope ${scope}`}>
          <DotLine slots={filledDots(scope, "dot_yellow")} />
        </span>
        <span className="pc-proj-goal">{project.goal || "(no goal yet)"}</span>
      </div>
      {die !== null ? (
        <img className="pc-proj-die" src={assetUrl(`sheet/project_die_${Math.max(0, Math.min(10, die))}.webp`)} alt={`Project die ${die}`} />
      ) : null}
      {win || crit ? (
        <span className="pc-proj-result">
          <img src={assetUrl(`sheet/${crit ? "project_crit" : "project_win"}.webp`)} alt={crit ? "Critical Win" : "Win"} />
          {win ? <b>+{project.launchRollMargin ?? 0}</b> : null}
        </span>
      ) : null}
      {!crit ? (
        <ul className="pc-proj-stakes">
          {displayStakes(project).map((row, i) => {
            const cls = stakeClass(row, viewerKey);
            return (
              <li key={i} className={cls}>
                <span>{stakeLabel(row)}</span>
                <DotLine slots={filledDots(Math.min(5, row.qty), STAKE_DOT[cls])} />
              </li>
            );
          })}
        </ul>
      ) : <span className="pc-proj-stakes" />}
      <div className="pc-proj-dates">
        <span className="start">{project.derived.startText}</span>
        <span className="start">—</span>
        <span>{project.derived.endText}</span>
        <span className="increment">{INCREMENT_TEXT(snapshot, project.increment)}</span>
      </div>
      {project.phase !== PHASE.inProgress && project.phase !== PHASE.complete ? (
        <span className="pc-proj-phase">{project.derived.autoPhase === PHASE.postLaunch && project.derived.beginEligible ? "Ready to begin" : "Setting up"}</span>
      ) : null}
    </div>
  );
};

export const PageFive = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [snapshot, setSnapshot] = useState<ProjectsSnapshot>(() => emptyProjectsSnapshot());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coterie, setCoterie] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await fetchProjectsSnapshot());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, ctx.seat.color]);

  useEffect(() => subscribeTtsEvents((event) => {
    if (event.topic === "projects" || event.topic === "reload") {
      void load();
    }
  }), [load]);

  const viewerKey = coterie ? COTERIE : ctx.seat.charKey;
  const projects = snapshot.ok ? projectsForSource(snapshot, viewerKey) : [];
  const newOwner = coterie ? "" : ctx.seat.charKey;

  return (
    <article className={`pc-page pc-sheet-page pc-page-five ${ctx.side}`}>
      <div className="pc-divider">
        <h3 className="pc-section-title">Projects</h3>
        <div className="pc-divider-actions">
          <button type="button" className={`pc-add-text${coterie ? " active" : ""}`} onClick={() => setCoterie((v) => !v)}>
            {coterie ? "Coterie ✓" : "Coterie"}
          </button>
          <button type="button" className="pc-add-text" disabled={!snapshot.ok} onClick={() => setEditing({ draft: emptyProjectDraft(newOwner, snapshot.presentDay) })}>
            + Project
          </button>
          <button type="button" className="pc-add-text" disabled={loading} onClick={() => void load()}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>
      {snapshot.presentDayText ? <p className="pc-proj-present">Present day: {snapshot.presentDayText}</p> : null}
      {error ? <p className="pc-sheet-error">{error}</p> : null}
      <div className="pc-proj-list">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            snapshot={snapshot}
            viewerKey={viewerKey}
            onEdit={(p) => setEditing({ project: p, draft: draftFromProject(p) })}
          />
        ))}      </div>
      {editing ? (
        <ProjectEditor
          snapshot={snapshot}
          {...(editing.project ? { project: editing.project } : {})}
          initial={editing.draft}
          onSnapshot={setSnapshot}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </article>
  );
};

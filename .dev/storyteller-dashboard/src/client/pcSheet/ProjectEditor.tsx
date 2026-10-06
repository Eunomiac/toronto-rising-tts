import { useRef, useState, type ReactElement } from "react";
import { Field, SelectInput, TextInput, type SelectOption } from "./fields.js";
import {
  COTERIE,
  draftFieldDiff,
  draftFromProject,
  MAX_SCOPE,
  PHASE,
  PHASE_LABELS,
  rebaseDraft,
  RESULT_OPTIONS,
  STAKE_ROW_POOL,
  stakeCapacity,
  stakeRowsEqual,
  type Project,
  type ProjectDraft,
  type ProjectsSnapshot,
  type ProjectStakeRow
} from "./projects.js";
import { applyProjectCommand } from "./projectsBridge.js";
import { SheetModal } from "./SheetModal.js";

type Props = {
  readonly snapshot: ProjectsSnapshot;
  /** Omitted for a new project — nothing reaches TTS until the first Save. */
  readonly project?: Project;
  readonly initial: ProjectDraft;
  readonly onSnapshot: (snapshot: ProjectsSnapshot) => void;
  readonly onClose: () => void;
};

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Rows Lua stores: a source is required; no advantage means a display-only row with no dots. */
const cleanRows = (rows: readonly ProjectStakeRow[]): ProjectStakeRow[] =>
  rows
    .filter((row) => row.source !== "")
    .map((row) => (row.name === "" ? { source: row.source, name: "", focus: "", qty: 0 } : row));

const advKey = (name: string, focus: string): string => `${name}\u0001${focus}`;

const NumberText = ({
  value,
  onChange,
  min,
  max,
  disabled
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: number;
  readonly max?: number;
  readonly disabled?: boolean;
}): ReactElement => (
  <input
    className="sheet-input"
    type="number"
    value={value}
    min={min}
    max={max}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
  />
);

export const ProjectEditor = ({ snapshot, project, initial, onSnapshot, onClose }: Props): ReactElement => {
  const [draft, setDraftState] = useState(initial);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const baseRef = useRef<ProjectDraft | null>(project ? draftFromProject(project) : null);
  const idRef = useRef<string | null>(project?.id ?? null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const setDraft = (next: ProjectDraft): void => {
    draftRef.current = next;
    setDraftState(next);
  };
  const patch = (fields: Partial<ProjectDraft>): void => setDraft({ ...draftRef.current, ...fields });

  const live = idRef.current ? snapshot.projects.find((p) => p.id === idRef.current) : undefined;
  const phase = live?.phase ?? PHASE.setup;
  const started = phase === PHASE.inProgress || phase === PHASE.complete;

  const absorb = (next: ProjectsSnapshot, id: string): void => {
    onSnapshot(next);
    const fresh = next.projects.find((p) => p.id === id);
    if (!fresh) {
      return;
    }
    const newBase = draftFromProject(fresh);
    setDraft(rebaseDraft(draftRef.current, baseRef.current ?? newBase, newBase));
    baseRef.current = newBase;
  };

  /** Send changed fields and stake rows for a saved project; queued so blurs never overlap. */
  const commit = (): Promise<void> => {
    const next = chain.current.then(async () => {
      const id = idRef.current;
      const base = baseRef.current;
      if (!id || !base) {
        return;
      }
      const current = draftRef.current;
      const fields = draftFieldDiff(current, base);
      let fresh: ProjectsSnapshot | null = null;
      if (Object.keys(fields).length > 0) {
        fresh = await applyProjectCommand({ op: "patch", id, fields });
      }
      const rows = cleanRows(current.stakeRows);
      if (!stakeRowsEqual(rows, base.stakeRows)) {
        fresh = await applyProjectCommand({ op: "setStakeRows", id, rows });
      }
      if (fresh) {
        absorb(fresh, id);
      }
    });
    chain.current = next.catch(() => undefined);
    return next;
  };

  const commitOnBlur = (): void => {
    if (!idRef.current) {
      return;
    }
    setInlineError(null);
    commit().catch((error: unknown) => setInlineError(errorText(error)));
  };

  const save = async (): Promise<void> => {
    if (idRef.current) {
      await commit();
      onClose();
      return;
    }
    const created = await applyProjectCommand({
      op: "create",
      fields: draftFieldDiff(draftRef.current, null),
      stakeRows: cleanRows(draftRef.current.stakeRows)
    });
    onSnapshot(created);
    onClose();
  };

  const runOp = (op: "begin" | "complete" | "launchRoll") => async (): Promise<void> => {
    await commit();
    const id = idRef.current;
    if (!id) {
      throw new Error("Save the project first");
    }
    absorb(await applyProjectCommand({ op, id }), id);
  };

  const remove = async (): Promise<void> => {
    const id = idRef.current;
    if (!id) {
      onClose();
      return;
    }
    onSnapshot(await applyProjectCommand({ op: "delete", id }));
    onClose();
  };

  const ownerOptions: SelectOption[] = [
    { value: "", label: "—" },
    ...snapshot.sources.filter((s) => s.key !== COTERIE).map((s) => ({ value: s.key, label: s.label }))
  ];
  const sourceOptions: SelectOption[] = [
    { value: "", label: "—" },
    ...snapshot.sources.map((s) => ({ value: s.key, label: s.label }))
  ];
  const incrementOptions: SelectOption[] = [
    { value: "", label: "—" },
    ...snapshot.increments.map((inc) => ({ value: inc.key, label: inc.label }))
  ];

  const setRow = (index: number, row: ProjectStakeRow): void => {
    const rows = [...draftRef.current.stakeRows];
    rows[index] = row;
    patch({ stakeRows: rows });
  };
  const removeRow = (index: number): void => {
    patch({ stakeRows: draftRef.current.stakeRows.filter((_, i) => i !== index) });
    commitOnBlur();
  };

  const stakeRow = (row: ProjectStakeRow, index: number): ReactElement => {
    const options = snapshot.advantages[row.source] ?? [];
    const capacity = row.name ? stakeCapacity(snapshot, live, row) : 0;
    const advOptions: SelectOption[] = [
      { value: "", label: "— display only —" },
      ...options.map((adv) => {
        const cap = stakeCapacity(snapshot, live, { source: row.source, name: adv.name, focus: adv.focus });
        const current = adv.name === row.name && adv.focus === row.focus;
        return { value: advKey(adv.name, adv.focus), label: `${adv.label} (${cap} free)`, disabled: cap < 1 && !current };
      })
    ];
    return (
      <div key={index} className="pc-proj-stake-edit">
        <SelectInput
          value={row.source}
          options={sourceOptions}
          onChange={(source) => setRow(index, { source, name: "", focus: "", qty: 0 })}
        />
        <SelectInput
          value={row.name ? advKey(row.name, row.focus) : ""}
          options={advOptions}
          disabled={row.source === ""}
          onChange={(value) => {
            const adv = options.find((a) => advKey(a.name, a.focus) === value);
            setRow(index, adv ? { source: row.source, name: adv.name, focus: adv.focus, qty: Math.max(1, Math.min(row.qty, 5)) } : { source: row.source, name: "", focus: "", qty: 0 });
          }}
        />
        <NumberText
          value={row.name ? String(row.qty) : ""}
          min={1}
          max={Math.max(1, capacity)}
          disabled={!row.name}
          onChange={(value) => setRow(index, { ...row, qty: Math.max(0, Math.floor(Number(value) || 0)) })}
        />
        <button type="button" className="pc-proj-row-remove" title="Remove row" onClick={() => removeRow(index)}>×</button>
      </div>
    );
  };

  const derived = live?.derived;
  const title = idRef.current ? "Edit Project" : "New Project";
  const subtitle = live ? `${PHASE_LABELS[live.derived.autoPhase] ?? live.derived.autoPhase}${snapshot.presentDayText ? ` · Present day ${snapshot.presentDayText}` : ""}` : "Nothing is sent to TTS until you press Save.";

  return (
    <SheetModal
      title={title}
      subtitle={subtitle}
      wide
      onClose={onClose}
      onSubmit={save}
      {...(idRef.current ? { onDelete: remove } : {})}
      actions={(run) => (
        <>
          <button type="button" title="Launch roll for the owner (same as the TTS R button)" disabled={!derived?.launchEligible} onClick={() => run(runOp("launchRoll"))}>
            R
          </button>
          <button type="button" disabled={!derived?.beginEligible} onClick={() => run(runOp("begin"))}>Lock &amp; Begin</button>
          <button type="button" disabled={phase !== PHASE.inProgress} onClick={() => run(runOp("complete"))}>Complete</button>
        </>
      )}
    >
      <div className="sheet-form-grid pc-proj-form" onBlur={commitOnBlur}>
        <Field label="Owner">
          <SelectInput value={draft.owner} options={ownerOptions} onChange={(owner) => patch({ owner })} />
        </Field>
        <Field label="Increment">
          <SelectInput value={draft.increment} options={incrementOptions} onChange={(increment) => patch({ increment })} />
        </Field>
        <Field label="Goal" wide>
          <TextInput value={draft.goal} onChange={(goal) => patch({ goal })} placeholder="Wrest control of the Distillery District…" />
        </Field>
        <Field label="Scope" hint={`0–${MAX_SCOPE}; fills Difficulty (Scope + 2) unless you changed it`}>
          <NumberText value={draft.scope} min={0} max={MAX_SCOPE} onChange={(scope) => patch({ scope })} />
        </Field>
        <Field label="Start date">
          <TextInput type="date" value={draft.startDate} onChange={(startDate) => patch({ startDate })} />
        </Field>
        <Field label="Launch skill">
          <TextInput value={draft.launchRollSkill} onChange={(launchRollSkill) => patch({ launchRollSkill })} />
        </Field>
        <Field label="Launch advantage">
          <TextInput value={draft.launchRollAdvantage} onChange={(launchRollAdvantage) => patch({ launchRollAdvantage })} />
        </Field>
        <Field label="Difficulty">
          <NumberText value={draft.launchRollDifficulty} min={0} onChange={(launchRollDifficulty) => patch({ launchRollDifficulty })} />
        </Field>
        <Field label="Contributors">
          <NumberText value={draft.numContributors} min={1} onChange={(numContributors) => patch({ numContributors })} />
        </Field>
        <Field label="Result" {...(started ? { hint: "Locked once the project has begun" } : {})}>
          <SelectInput
            value={draft.launchRollResult}
            options={RESULT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            disabled={started}
            onChange={(launchRollResult) => patch({ launchRollResult })}
          />
        </Field>
        <Field label="Margin">
          <NumberText
            value={draft.launchRollMargin}
            disabled={started || draft.launchRollResult !== "win"}
            onChange={(launchRollMargin) => patch({ launchRollMargin })}
          />
        </Field>
        <Field label="Project die modifier" hint="Duration is 10 + modifier increments">
          <NumberText value={draft.projectDieMod} onChange={(projectDieMod) => patch({ projectDieMod })} />
        </Field>

        <div className="sheet-field wide pc-proj-stakes-edit">
          <span className="sheet-field-label">
            Stakes
            {derived?.requiredStake !== null && derived?.requiredStake !== undefined
              ? ` — ${derived.sumStake} of ${derived.requiredStake} required`
              : ""}
          </span>
          {draft.stakeRows.map(stakeRow)}
          <button
            type="button"
            className="pc-add-text"
            disabled={draft.stakeRows.length >= STAKE_ROW_POOL}
            onClick={() => patch({ stakeRows: [...draftRef.current.stakeRows, { source: draft.owner, name: "", focus: "", qty: 0 }] })}
          >
            + Stake row
          </button>
        </div>

        {derived ? (
          <dl className="pc-proj-derived wide">
            <dt>Project die</dt>
            <dd>{derived.die ?? "—"}</dd>
            <dt>Dates</dt>
            <dd>{derived.startText || "—"}{derived.endText ? ` — ${derived.endText}` : ""}</dd>
            <dt>Required stake</dt>
            <dd>{derived.requiredStake ?? "—"}</dd>
            {derived.autoPhase === PHASE.postLaunch || derived.autoPhase === PHASE.preLaunch ? (
              <>
                <dt>Begin</dt>
                <dd className={derived.beginEligible ? "ok" : "warn"}>{derived.beginMessage}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        {inlineError ? <p className="sheet-modal-error wide" role="alert">{inlineError}</p> : null}
      </div>
    </SheetModal>
  );
};

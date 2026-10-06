import { useState, type ReactElement } from "react";
import { DisciplineAddModal, DisciplineEditModal, PowerModal, RITUAL_KIND_LABEL } from "./DisciplineModals.js";
import { DotLine } from "./DotLine.js";
import { assetUrl } from "./layout.js";
import { paintDotLine } from "./paint.js";
import type { PageContext } from "./pages.js";
import {
  canAddRitual,
  DISCIPLINE_LABELS,
  heldRitualKinds,
  MAX_DISCIPLINES,
  parseDisciplines,
  powersByLevel,
  ritualDivider,
  ritualLayout,
  ritualsOf,
  unownedDisciplines,
  type DisciplineKey,
  type DisciplineRow,
  type PowerEntry,
  type RitualKind,
  type RitualSlot
} from "./sheetData.js";
import { termProps } from "../termImages/store.js";

type Popup =
  | { kind: "addDiscipline" }
  | { kind: "editDiscipline"; key: DisciplineKey }
  | { kind: "power"; key: DisciplineKey; entry?: PowerEntry }
  | { kind: "ritual"; ritual: RitualKind; entry?: PowerEntry };

const DisciplineCell = ({
  row,
  ctx,
  onPopup
}: {
  readonly row: DisciplineRow;
  readonly ctx: PageContext;
  readonly onPopup: (popup: Popup) => void;
}): ReactElement => {
  const condition = ctx.seat.resolvedStatChanges[row.key] ?? 0;
  const dots = paintDotLine(row.key, { base: row.base, temp: row.temp + condition, disabled: 0 });
  return (
    <div className="pc-disc-cell">
      <header className="pc-disc-header">
        <button
          type="button"
          className="pc-disc-name"
          title={`Edit ${DISCIPLINE_LABELS[row.key]}`}
          {...termProps("discipline", DISCIPLINE_LABELS[row.key])}
          onClick={() => onPopup({ kind: "editDiscipline", key: row.key })}
        >
          <img src={assetUrl(`sheet/discName_${row.key}.webp`)} alt={DISCIPLINE_LABELS[row.key]} />
        </button>
        <button
          type="button"
          className="pc-disc-dots"
          title="Adjust dots"
          onClick={(event) => ctx.onRing(event, { kind: "discipline", key: row.key })}
        >
          <DotLine slots={dots} />
        </button>
        <button
          type="button"
          className="pc-add"
          title="Add a power"
          onClick={() => onPopup({ kind: "power", key: row.key })}
        >
          +
        </button>
      </header>
      <ul className="pc-disc-powers">
        {powersByLevel(row.powers).map((group) => (
          <li key={group.level}>
            {group.powers.map((power, index) => (
              <span key={power.index}>
                {index > 0 ? <span className="pc-power-sep"> ◆ </span> : null}
                <button
                  type="button"
                  className="pc-power"
                  title={power.notes !== "" ? power.notes : `Level ${power.level}`}
                  {...termProps("power", power.name)}
                  onClick={() => onPopup({ kind: "power", key: row.key, entry: power })}
                >
                  {power.name}
                  {power.notes !== "" ? <sup>*</sup> : null}
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

const RitualRow = ({ slot, onEdit }: { readonly slot: RitualSlot; readonly onEdit: (slot: NonNullable<RitualSlot>) => void }): ReactElement => {
  if (slot === null) {
    return <div className="pc-rc-row empty" />;
  }
  const dots = Array.from({ length: 5 }, (_, i) => ({ active: i < slot.entry.level, image: "dot_yellow" as const }));
  return (
    <button
      type="button"
      className="pc-rc-row"
      title={slot.entry.notes !== "" ? slot.entry.notes : `Level ${slot.entry.level}`}
      onClick={() => onEdit(slot)}
    >
      <DotLine slots={dots} />
      <span className="pc-rc-name" {...termProps(slot.kind === "rituals" ? "ritual" : "ceremony", slot.entry.name)}>{slot.entry.name}</span>
    </button>
  );
};

export const PageTwo = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const color = ctx.seat.color;
  const rows = parseDisciplines(ctx.seat.playerData);
  const rituals = ritualsOf(rows, "rituals");
  const ceremonies = ritualsOf(rows, "ceremonies");
  const layout = ritualLayout(rituals, ceremonies);
  const cells: Array<DisciplineRow | null> = Array.from({ length: MAX_DISCIPLINES }, (_, i) => rows[i] ?? null);
  const close = (): void => setPopup(null);
  const ritualKinds = heldRitualKinds(rows);
  const divider = ritualDivider(ritualKinds);

  const renderPopup = (): ReactElement | null => {
    if (popup === null) {
      return null;
    }
    if (popup.kind === "addDiscipline") {
      return <DisciplineAddModal color={color} choices={unownedDisciplines(rows)} send={ctx.applyNow} onClose={close} />;
    }
    if (popup.kind === "editDiscipline") {
      const row = rows.find((candidate) => candidate.key === popup.key);
      return row ? <DisciplineEditModal color={color} row={row} send={ctx.applyNow} onClose={close} /> : null;
    }
    if (popup.kind === "power") {
      const { key, entry } = popup;
      const rating = rows.find((candidate) => candidate.key === key)?.base ?? 1;
      return (
        <PowerModal
          title={`${entry ? "Edit" : "Add"} ${DISCIPLINE_LABELS[key]} Power`}
          levelLabel="Power level"
          defaultLevel={Math.max(1, Math.min(5, rating))}
          {...(entry ? { initial: entry } : {})}
          onClose={close}
          onSave={(power) => ctx.applyNow({ op: "disciplinePowerUpsert", color, key, power, ...(entry ? { index: entry.index } : {}) })}
          {...(entry ? { onDelete: async () => { await ctx.applyNow({ op: "disciplinePowerRemove", color, key, index: entry.index }); close(); } } : {})}
        />
      );
    }
    const { ritual, entry } = popup;
    return (
      <PowerModal
        title={`${entry ? "Edit" : "Add"} ${RITUAL_KIND_LABEL[ritual]}`}
        levelLabel="Level"
        defaultLevel={1}
        {...(entry ? { initial: entry } : {})}
        onClose={close}
        onSave={(draft) => ctx.applyNow({ op: "ritualUpsert", color, kind: ritual, entry: draft, ...(entry ? { index: entry.index } : {}) })}
        {...(entry ? { onDelete: async () => { await ctx.applyNow({ op: "ritualRemove", color, kind: ritual, index: entry.index }); close(); } } : {})}
      />
    );
  };

  const firstEmpty = cells.findIndex((cell) => cell === null);
  return (
    <article className={`pc-page pc-sheet-page pc-page-two ${ctx.side}`}>
      <section className="pc-disc-grid" aria-label="Disciplines">
        {cells.map((row, index) => (
          row
            ? <DisciplineCell key={row.key} row={row} ctx={ctx} onPopup={setPopup} />
            : (
              <div key={`empty-${index}`} className="pc-disc-cell empty">
                {index === firstEmpty ? (
                  <button type="button" className="pc-disc-add" onClick={() => setPopup({ kind: "addDiscipline" })}>
                    + Discipline
                  </button>
                ) : null}
              </div>
            )
        ))}
      </section>

      {layout || divider ? (
        <section className="pc-rc" aria-label="Rituals and Ceremonies">
          <div className="pc-divider">
            {divider ? <img src={assetUrl(`sheet/${divider}.webp`)} alt="" /> : null}
            {ritualKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                className="pc-add-text"
                title={canAddRitual(kind, rituals.length, ceremonies.length)
                  ? `Add a ${RITUAL_KIND_LABEL[kind]}`
                  : "Page 2 is full: 10 of one kind, or 5 of each"}
                disabled={!canAddRitual(kind, rituals.length, ceremonies.length)}
                onClick={() => setPopup({ kind: "ritual", ritual: kind })}
              >
                + {RITUAL_KIND_LABEL[kind]}
              </button>
            ))}
          </div>
          {layout ? (
            <div className="pc-rc-columns">
              {[layout.left, layout.right].map((column, columnIndex) => (
                <div key={columnIndex} className="pc-rc-col">
                  {column.map((slot, rowIndex) => (
                    <RitualRow
                      key={rowIndex}
                      slot={slot}
                      onEdit={(picked) => setPopup({ kind: "ritual", ritual: picked.kind, entry: picked.entry })}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {renderPopup()}
    </article>
  );
};

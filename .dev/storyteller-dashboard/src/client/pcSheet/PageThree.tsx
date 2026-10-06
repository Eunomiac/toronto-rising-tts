import { useState, type ReactElement } from "react";
import { AdvantageModal } from "./AdvantageModal.js";
import { DotLine } from "./DotLine.js";
import { assetUrl } from "./layout.js";
import type { PageContext } from "./pages.js";
import {
  ADVANTAGE_LABELS,
  advantageStakeKey,
  advantageTitle,
  advantageWeight,
  formatSourceLine,
  isStatusEntry,
  packColumns,
  parseAdvantages,
  statusDotSlots,
  traitDotSlots,
  type AdvantageCategory,
  type AdvantageEntry
} from "./sheetData.js";

type Popup = { readonly entry?: AdvantageEntry; readonly type: AdvantageCategory };

const stakeFor = (ctx: PageContext, entry: AdvantageEntry): number =>
  ctx.seat.projectStakes[advantageStakeKey(entry.name, entry.focus)] ?? 0;

const AdvantageBox = ({
  entry,
  ctx,
  onEdit
}: {
  readonly entry: AdvantageEntry;
  readonly ctx: PageContext;
  readonly onEdit: (entry: AdvantageEntry) => void;
}): ReactElement => {
  const source = formatSourceLine(entry.source);
  const staked = stakeFor(ctx, entry);
  return (
    <div className={`pc-adv-box ${entry.category}`}>
      <header className="pc-adv-title">
        <button type="button" className="pc-adv-name" title="Edit" onClick={() => onEdit(entry)}>
          {advantageTitle(entry)}
        </button>
        <button
          type="button"
          className="pc-adv-dots"
          title={staked > 0 ? `Adjust dots (${staked} staked on projects)` : "Adjust dots"}
          onClick={(event) => ctx.onRing(event, { kind: "advantage", type: entry.category, index: entry.index, name: entry.name })}
        >
          <DotLine slots={traitDotSlots(entry, staked)} />
        </button>
      </header>
      {entry.description.length > 0 ? (
        <p className="pc-adv-flavor">{entry.description.join("\n")}</p>
      ) : null}
      {entry.rules.length > 0 ? <p className="pc-adv-rules">{entry.rules.join("\n")}</p> : null}
      {source ? <p className="pc-adv-source">{source}</p> : null}
    </div>
  );
};

const SECTION_DIVIDER: Record<AdvantageCategory, (color: string) => string | null> = {
  backgrounds: () => null,
  merits: () => "divider_merits",
  flaws: (color) => `divider_flaws_${color}`
};

const AdvantageSection = ({
  category,
  entries,
  ctx,
  onPopup
}: {
  readonly category: AdvantageCategory;
  readonly entries: readonly AdvantageEntry[];
  readonly ctx: PageContext;
  readonly onPopup: (popup: Popup) => void;
}): ReactElement => {
  const shown = entries.filter((entry) => entry.sheetDisplay);
  const hidden = entries.filter((entry) => !entry.sheetDisplay && !isStatusEntry(entry));
  const columns = packColumns(shown, advantageWeight);
  const divider = SECTION_DIVIDER[category](ctx.seat.color);
  const label = ADVANTAGE_LABELS[category];
  const edit = (entry: AdvantageEntry): void => onPopup({ entry, type: category });
  return (
    <section className={`pc-adv-section ${category}`} aria-label={`${label}s`}>
      <div className="pc-divider">
        {divider
          ? <img src={assetUrl(`sheet/${divider}.webp`)} alt={`${label}s`} />
          : <h3 className="pc-section-title">{label}s</h3>}
        <button type="button" className="pc-add-text" onClick={() => onPopup({ type: category })}>
          + {label}
        </button>
      </div>
      {shown.length > 0 ? (
        <div className="pc-adv-columns">
          {columns.map((column, index) => (
            <div key={index} className="pc-adv-col">
              {column.map((entry) => (
                <AdvantageBox key={`${entry.index}-${entry.name}`} entry={entry} ctx={ctx} onEdit={edit} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="pc-empty-note">No {label.toLowerCase()}s on the sheet.</p>
      )}
      {hidden.length > 0 ? (
        <p className="pc-adv-hidden">
          Not printed:{" "}
          {hidden.map((entry) => (
            <button key={`${entry.index}-${entry.name}`} type="button" className="pc-adv-chip" onClick={() => edit(entry)}>
              {advantageTitle(entry)}
            </button>
          ))}
        </p>
      ) : null}
    </section>
  );
};

const StatusStrip = ({
  backgrounds,
  ctx,
  onPopup
}: {
  readonly backgrounds: readonly AdvantageEntry[];
  readonly ctx: PageContext;
  readonly onPopup: (popup: Popup) => void;
}): ReactElement => {
  const statuses = backgrounds.filter(isStatusEntry);
  const camarilla = statuses.find((entry) => entry.focus === "Camarilla");
  const clan = statuses.find((entry) => entry.focus !== "Camarilla");
  const cell = (label: string, entry: AdvantageEntry | undefined): ReactElement => (
    <div className="pc-status-cell">
      <button
        type="button"
        className="pc-status-label"
        disabled={!entry}
        title={entry ? `Edit ${label}` : `No ${label}: add a Background named Status with "Show on sheet" off`}
        onClick={() => entry && onPopup({ entry, type: "backgrounds" })}
      >
        {label}
      </button>
      {entry ? (
        <button
          type="button"
          className="pc-status-dots"
          title="Adjust dots"
          onClick={(event) => ctx.onRing(event, { kind: "advantage", type: "backgrounds", index: entry.index, name: entry.name })}
        >
          <DotLine slots={statusDotSlots(entry, stakeFor(ctx, entry))} />
        </button>
      ) : <span className="pc-status-none">—</span>}
    </div>
  );
  return (
    <div className="pc-status-strip">
      {cell("Camarilla Status", camarilla)}
      {cell(clan?.focus ? `${clan.focus} Status` : "Clan Status", clan)}
    </div>
  );
};

export const PageThree = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const backgrounds = parseAdvantages(ctx.seat.playerData, "backgrounds");
  const merits = parseAdvantages(ctx.seat.playerData, "merits");
  const flaws = parseAdvantages(ctx.seat.playerData, "flaws");
  return (
    <article className={`pc-page pc-sheet-page pc-page-three ${ctx.side}`}>
      <StatusStrip backgrounds={backgrounds} ctx={ctx} onPopup={setPopup} />
      <AdvantageSection category="backgrounds" entries={backgrounds} ctx={ctx} onPopup={setPopup} />
      <AdvantageSection category="merits" entries={merits} ctx={ctx} onPopup={setPopup} />
      <AdvantageSection category="flaws" entries={flaws} ctx={ctx} onPopup={setPopup} />
      {popup ? (
        <AdvantageModal
          color={ctx.seat.color}
          defaultType={popup.type}
          {...(popup.entry ? { entry: popup.entry } : {})}
          send={ctx.applyNow}
          onClose={() => setPopup(null)}
        />
      ) : null}
    </article>
  );
};

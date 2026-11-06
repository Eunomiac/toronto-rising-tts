import { useState, type ReactElement } from "react";
import { AdvantageModal } from "./AdvantageModal.js";
import { DotLine } from "./DotLine.js";
import { SelectInput } from "./fields.js";
import { sheetArtUrl } from "./layout.js";
import type { PageContext } from "./pages.js";
import { ADVANTAGE_CATEGORIES, ADVANTAGE_LABELS, advantageTitle, parseAdvantages, traitDotSlots, type AdvantageCategory, type AdvantageEntry } from "./sheetData.js";
import type { ApplyCommand } from "./types.js";

type Scope = "coterie" | "domain" | "haven";
type Editing = { readonly type: AdvantageCategory; readonly entry?: AdvantageEntry };

export const CourtAdvantages = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [scope, setScope] = useState<Scope>("coterie");
  const [editing, setEditing] = useState<Editing | null>(null);
  const data = ctx.snapshot.coterieData;
  const send = async (command: ApplyCommand): Promise<void> => {
    if (command.op === "advantageUpsert") {
      await ctx.applyNow({ ...command, op: "courtAdvantageUpsert", scope });
    } else if (command.op === "advantageDelete") {
      await ctx.applyNow({ ...command, op: "courtAdvantageDelete", scope });
    } else {
      throw new Error("Unknown Court Advantage command.");
    }
  };

  if (!data) return <p className="pc-sheet-error">Load the updated TTS scripts and refresh the PCs tab to edit Court Advantages.</p>;
  const stats: Record<string, unknown> = {};
  for (const category of ADVANTAGE_CATEGORIES) {
    const key = scope + category.charAt(0).toUpperCase() + category.slice(1);
    const rows = data[key];
    stats[category] = Array.isArray(rows) ? rows.map((row: Record<string, unknown>) => ({
      ...row, blank: row.active === false || (row.blank === true && row.active !== true),
    })) : [];
  }

  return <>
    <label className="pc-court-scope">Court section
      <SelectInput value={scope} onChange={value => { setScope(value as Scope); setEditing(null); }} options={[
        { value: "coterie", label: "Coterie" }, { value: "domain", label: "Domain" }, { value: "haven", label: "Haven" },
      ]} />
    </label>
    <div className="pc-sheet-scroll">
      {ADVANTAGE_CATEGORIES.map(category => <section key={category}>
        <div className="pc-divider">
          <h3 className="pc-section-title">{category}</h3>
          <button type="button" className="pc-add-text" onClick={() => setEditing({ type: category })}>+ {ADVANTAGE_LABELS[category]}</button>
        </div>
        {parseAdvantages({ stats }, category).map(entry => <div className={`pc-adv-box ${category}`} key={entry.index}>
          <header className="pc-adv-title">
            <button type="button" className="pc-adv-name" title="Edit" onClick={() => setEditing({ type: category, entry })}>{advantageTitle(entry)}</button>
            <DotLine slots={traitDotSlots(entry, 0)} />
          </header>
          <div className="pc-adv-content">
            {entry.portrait ? <img className="pc-rel-portrait-img" src={sheetArtUrl(entry.portrait)} alt="" /> : null}
            <div>
              <p className="pc-adv-flavor">{entry.description.join("\n")}</p>
              <p className="pc-adv-rules">{entry.rules.join("\n")}</p>
            </div>
          </div>
        </div>)}
      </section>)}
    </div>
    {editing ? <AdvantageModal
      court color={ctx.seat.color} defaultType={editing.type}
      {...(editing.entry ? { entry: editing.entry } : {})}
      portraitOptions={ctx.snapshot.courtPortraits ?? []}
      send={send} onClose={() => setEditing(null)}
    /> : null}
  </>;
};

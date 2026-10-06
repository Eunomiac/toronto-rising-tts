import { useState, type ReactElement } from "react";
import { assetUrl } from "./layout.js";
import type { PageContext } from "./pages.js";
import { emptyRelationship, isBondLink, MAX_BOND_STRENGTH, packTwoColumns, relationshipSections } from "./relationships.js";
import { portraitUrl, RelationshipModal } from "./RelationshipModal.js";
import { termProps } from "../termImages/store.js";
import type { RelationshipDraft, RelationshipRow } from "./types.js";

type Popup = { readonly row?: RelationshipRow; readonly draft: RelationshipDraft };

const BondBoxes = ({ strength }: { readonly strength: number }): ReactElement => (
  <span className="pc-rel-bond" title={`Bond Strength ${strength}`}>
    <span className="pc-rel-bond-label">Bond Strength:</span>
    {Array.from({ length: MAX_BOND_STRENGTH }, (_, i) =>
      i < strength
        ? <img key={i} src={assetUrl("boxes/box_red.webp")} alt="" />
        : <span key={i} className="pc-rel-bond-empty" />
    )}
  </span>
);

const RelationshipBox = ({
  row,
  charKey,
  onEdit
}: {
  readonly row: RelationshipRow;
  readonly charKey: string;
  readonly onEdit: (row: RelationshipRow) => void;
}): ReactElement => {
  const { entry } = row;
  const portrait = entry.portrait ? portraitUrl(entry.portrait) : undefined;
  const bond = isBondLink(entry.pcLinks[charKey]);
  return (
    <div className="pc-rel-box">
      <button type="button" className="pc-rel-title" title="Edit" onClick={() => onEdit(row)}>
        <span className="pc-rel-name" {...termProps("character", entry.headerLeft)}>{entry.headerLeft}</span>
        {bond ? <BondBoxes strength={entry.bondStrength ?? 0} /> : <span className="pc-rel-role">{entry.headerRight}</span>}
      </button>
      <div className="pc-rel-content">
        {portrait ? <img className="pc-rel-portrait-img" src={portrait} alt="" /> : null}
        <div className="pc-rel-text">
          {entry.subheaderLeft || entry.subheaderRight ? (
            <div className="pc-rel-sub">
              <span>{entry.subheaderLeft}</span>
              <span>{entry.subheaderRight}</span>
            </div>
          ) : null}
          {entry.body.map((line, index) => <p key={index}>{line}</p>)}
        </div>
      </div>
    </div>
  );
};

const Columns = ({
  rows,
  charKey,
  onEdit
}: {
  readonly rows: readonly RelationshipRow[];
  readonly charKey: string;
  readonly onEdit: (row: RelationshipRow) => void;
}): ReactElement => {
  const [left, right] = packTwoColumns(rows);
  return (
    <div className="pc-rel-columns">
      {[left, right].map((column, index) => (
        <div key={index} className="pc-rel-col">
          {column.map((row) => <RelationshipBox key={row.key} row={row} charKey={charKey} onEdit={onEdit} />)}
        </div>
      ))}
    </div>
  );
};

type AddButton = { readonly label: string; readonly linkType: string };

const Divider = ({
  image,
  label,
  adds,
  onAdd
}: {
  readonly image?: string;
  readonly label: string;
  readonly adds: readonly AddButton[];
  readonly onAdd: (linkType: string) => void;
}): ReactElement => (
  <div className="pc-divider">
    {image ? <img src={assetUrl(`sheet/${image}.webp`)} alt={label} /> : <h3 className="pc-section-title">{label}</h3>}
    {adds.map((add) => (
      <button key={add.linkType} type="button" className="pc-add-text" onClick={() => onAdd(add.linkType)}>
        + {add.label}
      </button>
    ))}
  </div>
);

export const PageFour = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const charKey = ctx.seat.charKey;
  const sections = relationshipSections(ctx.seat.relationships, charKey);
  const edit = (row: RelationshipRow): void => setPopup({ row, draft: row.entry });
  const add = (linkType: string): void => setPopup({ draft: emptyRelationship(charKey, linkType) });
  const stack = (rows: readonly RelationshipRow[]): ReactElement[] =>
    rows.map((row) => <RelationshipBox key={row.key} row={row} charKey={charKey} onEdit={edit} />);
  return (
    <article className={`pc-page pc-sheet-page pc-page-four ${ctx.side}`}>
      <div className="pc-rel-columns">
        <div className="pc-rel-col">
          <Divider label="Touchstone" adds={[{ label: "Touchstone", linkType: "touchstone" }]} onAdd={add} />
          {stack(sections.touchstones)}
        </div>
        <div className="pc-rel-col">
          <Divider label="Sire" adds={[{ label: "Sire", linkType: "sire" }]} onAdd={add} />
          {stack(sections.sires)}
        </div>
      </div>
      <Divider image="divider_childer" label="Childer" adds={[{ label: "Childe", linkType: "childe" }]} onAdd={add} />
      {sections.childer.length > 0 ? <Columns rows={sections.childer} charKey={charKey} onEdit={edit} /> : null}
      <Divider
        image="divider_bloodBonds"
        label="Blood Bonds"
        adds={[{ label: "Thrall", linkType: "thrall" }, { label: "Regnant", linkType: "regnant" }]}
        onAdd={add}
      />
      {sections.bloodBonds.length > 0 ? <Columns rows={sections.bloodBonds} charKey={charKey} onEdit={edit} /> : null}
      <Divider image="divider_otherRelationships" label="Other Relationships" adds={[{ label: "Relationship", linkType: "contact" }]} onAdd={add} />
      {sections.others.length > 0 ? <Columns rows={sections.others} charKey={charKey} onEdit={edit} /> : null}
      {popup ? (
        <RelationshipModal
          seat={ctx.seat}
          seats={ctx.snapshot.seats}
          draft={popup.draft}
          {...(popup.row ? { row: popup.row } : {})}
          send={ctx.applyNow}
          onClose={() => setPopup(null)}
        />
      ) : null}
    </article>
  );
};

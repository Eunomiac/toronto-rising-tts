import { useState, type ReactElement } from "react";
import { Field, linesFromText, LinesInput, NumberInput, SelectInput, textFromLines, TextInput } from "./fields.js";
import { isBondLink, LINK_TYPE_SUGGESTIONS, MAX_BOND_STRENGTH } from "./relationships.js";
import { SheetModal } from "./SheetModal.js";
import type { ApplyCommand, RelationshipDraft, RelationshipRow, SeatColor, SeatSnapshot } from "./types.js";

/** Portraits already registered on the Page 4 objects (the only images TTS can show there). */
const PORTRAITS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("/assets/portraits/*Portrait.webp", { query: "?url", import: "default", eager: true }))
    .map(([path, url]) => [path.replace(/^.*\/(.+)\.webp$/, "$1"), url])
);

export const portraitUrl = (key: string): string | undefined => PORTRAITS[key];

const NOT_LINKED = "";
const CUSTOM = "__custom";

const LINK_LABELS: Record<string, string> = {
  touchstone: "Touchstone",
  sire: "Sire",
  childe: "Childe",
  thrall: "Thrall (bonded to this PC)",
  regnant: "Regnant (this PC is bonded)",
  enemy: "Enemy",
  contact: "Contact",
  mawla: "Mawla",
  victim: "Victim",
  criseDeLwa: "Crise de Lwa"
};

const LinkPicker = ({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }): ReactElement => {
  const known = value === NOT_LINKED || (LINK_TYPE_SUGGESTIONS as readonly string[]).includes(value);
  const [custom, setCustom] = useState(!known);
  return (
    <div className="pc-rel-link">
      <SelectInput
        value={custom ? CUSTOM : value}
        onChange={(next) => {
          setCustom(next === CUSTOM);
          onChange(next === CUSTOM ? (known ? "" : value) : next);
        }}
        options={[
          { value: NOT_LINKED, label: "— not linked —" },
          ...LINK_TYPE_SUGGESTIONS.map((linkType) => ({ value: linkType, label: LINK_LABELS[linkType] ?? linkType })),
          { value: CUSTOM, label: "Other word…" }
        ]}
      />
      {custom ? <TextInput value={value} onChange={onChange} placeholder="e.g. rival" /> : null}
    </div>
  );
};

type Props = {
  readonly seat: SeatSnapshot;
  readonly seats: readonly SeatSnapshot[];
  /** Present when editing; absent when adding. */
  readonly row?: RelationshipRow;
  /** New entries start with this link type for the current PC. */
  readonly draft: RelationshipDraft;
  readonly send: (command: ApplyCommand) => Promise<void>;
  readonly onClose: () => void;
};

/** Add / edit one `gameState.relationships` entry: per-PC link types, header text, body, bond strength, portrait. */
export const RelationshipModal = ({ seat, seats, row, draft, send, onClose }: Props): ReactElement => {
  const color: SeatColor = seat.color;
  const [pcLinks, setPcLinks] = useState<Record<string, string>>(draft.pcLinks);
  const [headerLeft, setHeaderLeft] = useState(draft.headerLeft);
  const [headerRight, setHeaderRight] = useState(draft.headerRight);
  const [subheaderLeft, setSubheaderLeft] = useState(draft.subheaderLeft);
  const [subheaderRight, setSubheaderRight] = useState(draft.subheaderRight);
  const [body, setBody] = useState(textFromLines(draft.body));
  const [bondStrength, setBondStrength] = useState(draft.bondStrength ?? 1);
  const [portrait, setPortrait] = useState(draft.portrait);

  const ordered = [seat, ...seats.filter((other) => other.color !== seat.color)].filter((other) => other.charKey !== "");
  const bonded = Object.values(pcLinks).some(isBondLink);
  const setLink = (charKey: string, linkType: string): void => {
    setPcLinks((current) => {
      const next = { ...current };
      if (linkType.trim() === "") {
        delete next[charKey];
      } else {
        next[charKey] = linkType.trim();
      }
      return next;
    });
  };

  const entry = (): RelationshipDraft => ({
    pcLinks,
    portrait,
    headerLeft: headerLeft.trim(),
    headerRight: headerRight.trim(),
    subheaderLeft: subheaderLeft.trim(),
    subheaderRight: subheaderRight.trim(),
    body: linesFromText(body),
    ...(bonded ? { bondStrength } : {})
  });

  return (
    <SheetModal
      title={row ? `Edit ${row.entry.headerLeft}` : "Add Relationship"}
      subtitle="Page 4 of every linked PC repaints after saving."
      submitLabel={row ? "Save" : "Add"}
      wide
      onClose={onClose}
      {...(row ? {
        deleteLabel: "Delete Relationship",
        onDelete: async () => {
          await send({ op: "relationshipDelete", color, key: row.key, expectHeader: row.entry.headerLeft });
          onClose();
        }
      } : {})}
      onSubmit={async () => {
        if (headerLeft.trim() === "") {
          throw new Error("Name is required.");
        }
        if (Object.keys(pcLinks).length === 0) {
          throw new Error("Link the relationship to at least one PC.");
        }
        await send({
          op: "relationshipUpsert",
          color,
          entry: entry(),
          ...(row ? { key: row.key, expectHeader: row.entry.headerLeft } : {})
        });
        onClose();
      }}
    >
      {ordered.map((other) => (
        <Field key={other.color} label={other.charName || other.charKey} {...(other.color === seat.color ? { hint: "This sheet." } : {})}>
          <LinkPicker value={pcLinks[other.charKey] ?? NOT_LINKED} onChange={(value) => setLink(other.charKey, value)} />
        </Field>
      ))}
      <Field label="Name" hint="Title bar, left.">
        <TextInput value={headerLeft} onChange={setHeaderLeft} placeholder="e.g. Kade Phillips" />
      </Field>
      <Field label="Role" hint="Title bar, right (e.g. Hair Stylist, Contact).">
        <TextInput value={headerRight} onChange={setHeaderRight} />
      </Field>
      <Field label="Subheader" hint="Grey line under the title, left.">
        <TextInput value={subheaderLeft} onChange={setSubheaderLeft} />
      </Field>
      <Field label="Subheader (right)">
        <TextInput value={subheaderRight} onChange={setSubheaderRight} />
      </Field>
      {bonded ? (
        <Field label="Bond Strength" hint={`Red boxes in the title bar (0–${MAX_BOND_STRENGTH}).`}>
          <NumberInput value={bondStrength} onChange={setBondStrength} min={0} max={MAX_BOND_STRENGTH} />
        </Field>
      ) : null}
      <Field label="Body" hint="One paragraph per line." wide>
        <LinesInput value={body} onChange={setBody} rows={5} />
      </Field>
      <Field label="Portrait" hint="Only portraits already loaded on the Page 4 sheets can show in TTS." wide>
        <div className="pc-rel-portraits">
          <button type="button" className={`pc-rel-portrait none${portrait === "" ? " selected" : ""}`} onClick={() => setPortrait("")}>
            None
          </button>
          {Object.entries(PORTRAITS).map(([key, url]) => (
            <button
              key={key}
              type="button"
              className={`pc-rel-portrait${portrait === key ? " selected" : ""}`}
              title={key}
              onClick={() => setPortrait(key)}
            >
              <img src={url} alt={key} loading="lazy" />
            </button>
          ))}
        </div>
      </Field>
    </SheetModal>
  );
};

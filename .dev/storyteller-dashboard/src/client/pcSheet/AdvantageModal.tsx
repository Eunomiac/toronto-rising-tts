import { useState, type ReactElement } from "react";
import { CheckInput, Field, linesFromText, LinesInput, NumberInput, SelectInput, textFromLines, TextInput } from "./fields.js";
import { SheetModal } from "./SheetModal.js";
import { ADVANTAGE_CATEGORIES, ADVANTAGE_LABELS, MAX_TITLE_DOTS, type AdvantageCategory, type AdvantageEntry } from "./sheetData.js";
import type { AdvantageDraft, ApplyCommand, SeatColor } from "./types.js";

type Props = {
  readonly color: SeatColor;
  /** Present when editing; absent when adding. */
  readonly entry?: AdvantageEntry;
  readonly defaultType: AdvantageCategory;
  readonly send: (command: ApplyCommand) => Promise<void>;
  readonly onClose: () => void;
};

/** One popup for adding and editing Backgrounds, Merits and Flaws (fields mirror page3.xml). */
export const AdvantageModal = ({ color, entry, defaultType, send, onClose }: Props): ReactElement => {
  const [type, setType] = useState<AdvantageCategory>(entry?.category ?? defaultType);
  const [name, setName] = useState(entry?.name ?? "");
  const [focus, setFocus] = useState(entry?.focus ?? "");
  const [base, setBase] = useState(entry?.base ?? 1);
  const [max, setMax] = useState(entry?.max ?? Math.max(1, entry?.base ?? 5));
  const [temp, setTemp] = useState(entry?.temp ?? 0);
  const [disabled, setDisabled] = useState(entry?.disabled ?? 0);
  const [description, setDescription] = useState(textFromLines(entry?.description ?? []));
  const [rules, setRules] = useState(textFromLines(entry?.rules ?? []));
  const [book, setBook] = useState(entry?.source?.book ?? "");
  const [page, setPage] = useState(entry?.source?.page ?? 0);
  const [sheetDisplay, setSheetDisplay] = useState(entry?.sheetDisplay ?? true);

  const draft = (): AdvantageDraft => ({
    name: name.trim(),
    focus: focus.trim(),
    base: Math.min(base, max),
    max,
    temp,
    disabled,
    description: linesFromText(description),
    rules: linesFromText(rules),
    ...(book.trim() !== "" || page > 0 ? { source: { book: book.trim(), page } } : {}),
    sheetDisplay
  });

  const label = ADVANTAGE_LABELS[type];
  return (
    <SheetModal
      title={entry ? `Edit ${ADVANTAGE_LABELS[entry.category]}` : `Add ${label}`}
      {...(entry && type !== entry.category ? { subtitle: `Saving moves it to ${label}s.` } : {})}
      submitLabel={entry ? "Save" : "Add"}
      wide
      onClose={onClose}
      {...(entry ? {
        deleteLabel: `Delete ${ADVANTAGE_LABELS[entry.category]}`,
        onDelete: async () => {
          await send({ op: "advantageDelete", color, type: entry.category, index: entry.index, expectName: entry.name });
          onClose();
        }
      } : {})}
      onSubmit={async () => {
        if (name.trim() === "") {
          throw new Error("Name is required.");
        }
        await send({
          op: "advantageUpsert",
          color,
          type,
          entry: draft(),
          ...(entry ? { index: entry.index, fromType: entry.category, expectName: entry.name } : {})
        });
        onClose();
      }}
    >
      <Field label="Type">
        <SelectInput
          value={type}
          onChange={(value) => setType(value as AdvantageCategory)}
          options={ADVANTAGE_CATEGORIES.map((value) => ({ value, label: ADVANTAGE_LABELS[value] }))}
        />
      </Field>
      <Field label="Show on sheet" hint="Off for Status, which prints as the dot strip instead of a box.">
        <CheckInput checked={sheetDisplay} onChange={setSheetDisplay} label="Print a box on Page 3" />
      </Field>
      <Field label="Name">
        <TextInput value={name} onChange={setName} placeholder="e.g. Resources" />
      </Field>
      <Field label="Focus" hint="Printed after the name, e.g. RESOURCES: OLD MONEY.">
        <TextInput value={focus} onChange={setFocus} />
      </Field>
      <Field label="Dots">
        <NumberInput value={Math.min(base, max)} onChange={setBase} min={0} max={max} />
      </Field>
      <Field label="Dot slots" hint={`Empty circles in the title bar (1–${MAX_TITLE_DOTS}).`}>
        <NumberInput value={max} onChange={setMax} min={1} max={MAX_TITLE_DOTS} />
      </Field>
      <Field label="Temporary dots" hint="White dots after the base dots.">
        <NumberInput value={temp} onChange={setTemp} min={0} max={MAX_TITLE_DOTS} />
      </Field>
      <Field label="Disabled dots" hint="Crossed-out grey dots from the right.">
        <NumberInput value={disabled} onChange={setDisabled} min={0} max={MAX_TITLE_DOTS} />
      </Field>
      <Field label="Description" hint="Flavour text, one sheet line per line." wide>
        <LinesInput value={description} onChange={setDescription} rows={3} />
      </Field>
      <Field label="Rules" hint="Mechanics, one sheet line per line." wide>
        <LinesInput value={rules} onChange={setRules} rows={4} />
      </Field>
      <Field label="Source book">
        <TextInput value={book} onChange={setBook} placeholder="e.g. V5 Core" />
      </Field>
      <Field label="Page">
        <NumberInput value={page} onChange={setPage} min={0} max={999} />
      </Field>
    </SheetModal>
  );
};

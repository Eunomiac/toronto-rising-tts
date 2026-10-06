import { useState, type ReactElement } from "react";
import { Field, LinesInput, NumberInput, SelectInput, TextInput } from "./fields.js";
import { SheetModal } from "./SheetModal.js";
import { DISCIPLINE_LABELS, type DisciplineKey, type DisciplineRow, type PowerEntry, type RitualKind } from "./sheetData.js";
import type { ApplyCommand, SeatColor } from "./types.js";

type Send = (command: ApplyCommand) => Promise<void>;

type AddProps = {
  readonly color: SeatColor;
  readonly choices: readonly DisciplineKey[];
  readonly send: Send;
  readonly onClose: () => void;
};

export const DisciplineAddModal = ({ color, choices, send, onClose }: AddProps): ReactElement => {
  const [key, setKey] = useState<string>(choices[0] ?? "");
  return (
    <SheetModal
      title="Add Discipline"
      subtitle="Starts at one dot. Page 2 holds six disciplines."
      submitLabel="Add"
      onClose={onClose}
      onSubmit={async () => {
        await send({ op: "disciplineAdd", color, key });
        onClose();
      }}
    >
      <Field label="Discipline" wide>
        <SelectInput
          value={key}
          onChange={setKey}
          options={choices.map((value) => ({ value, label: DISCIPLINE_LABELS[value] }))}
        />
      </Field>
    </SheetModal>
  );
};

type EditProps = {
  readonly color: SeatColor;
  readonly row: DisciplineRow;
  readonly send: Send;
  readonly onClose: () => void;
};

/** Absolute base / temp edit plus removal; quick nudges stay on the dot ring. */
export const DisciplineEditModal = ({ color, row, send, onClose }: EditProps): ReactElement => {
  const [base, setBase] = useState(row.base);
  const [temp, setTemp] = useState(row.temp);
  const label = DISCIPLINE_LABELS[row.key];
  return (
    <SheetModal
      title={label}
      subtitle={`${row.powers.length} power${row.powers.length === 1 ? "" : "s"} on the sheet`}
      onClose={onClose}
      deleteLabel={`Remove ${label}`}
      onDelete={async () => {
        await send({ op: "disciplineRemove", color, key: row.key });
        onClose();
      }}
      onSubmit={async () => {
        if (base !== row.base) {
          await send({ op: "dotDelta", color, family: "disciplines", key: row.key, field: "base", delta: base - row.base });
        }
        if (temp !== row.temp) {
          await send({ op: "dotDelta", color, family: "disciplines", key: row.key, field: "temp", delta: temp - row.temp });
        }
        onClose();
      }}
    >
      <Field label="Rating">
        <NumberInput value={base} onChange={setBase} min={0} max={5} />
      </Field>
      <Field label="Temporary" hint="White dots above the rating, grey below it.">
        <NumberInput value={temp} onChange={setTemp} min={-5} max={5} />
      </Field>
    </SheetModal>
  );
};

type PowerProps = {
  readonly title: string;
  readonly initial?: PowerEntry;
  readonly defaultLevel: number;
  readonly levelLabel: string;
  readonly onSave: (draft: { name: string; level: number; notes: string }) => Promise<void>;
  readonly onDelete?: () => Promise<void>;
  readonly onClose: () => void;
};

/** Shared popup for discipline powers, rituals and ceremonies. */
export const PowerModal = ({ title, initial, defaultLevel, levelLabel, onSave, onDelete, onClose }: PowerProps): ReactElement => {
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState(initial?.level ?? defaultLevel);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  return (
    <SheetModal
      title={title}
      submitLabel={initial ? "Save" : "Add"}
      onClose={onClose}
      {...(onDelete ? { onDelete } : {})}
      onSubmit={async () => {
        if (name.trim() === "") {
          throw new Error("Name is required.");
        }
        await onSave({ name: name.trim(), level, notes: notes.trim() });
        onClose();
      }}
    >
      <Field label="Name">
        <TextInput value={name} onChange={setName} placeholder="As printed in the book" />
      </Field>
      <Field label={levelLabel}>
        <NumberInput value={level} onChange={setLevel} min={1} max={5} />
      </Field>
      <Field label="Notes" hint="Storyteller only — amalgam requirements, reminders. Not printed on the TTS sheet." wide>
        <LinesInput value={notes} onChange={setNotes} rows={2} />
      </Field>
    </SheetModal>
  );
};

export const RITUAL_KIND_LABEL: Record<RitualKind, string> = {
  rituals: "Ritual",
  ceremonies: "Ceremony"
};

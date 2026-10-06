import { useState, type ReactElement } from "react";
import { Field, NumberInput, SelectInput, TextInput } from "./fields.js";
import { SheetModal } from "./SheetModal.js";
import { sessionDisplayForNum } from "./xpDisplay.js";
import type { ApplyCommand, SeatColor, SeatSnapshot, SheetSnapshot, XpEntryRef } from "./types.js";

type Props = {
  readonly seat: SeatSnapshot;
  readonly snapshot: SheetSnapshot;
  readonly send: (command: ApplyCommand) => Promise<void>;
  readonly onClose: () => void;
};

type Batch = { readonly entry: XpEntryRef; readonly colors: readonly SeatColor[] };

const describe = (entry: XpEntryRef): string =>
  `${entry.kind === "gain" ? "+" : "−"}${entry.amount} XP — ${entry.description}`;

/**
 * Add Experience Log entries (same rules as the TTS XP popup). Stays open after Apply so
 * several entries can go in; Undo removes the latest one, or the whole last Apply to All.
 */
export const XpModal = ({ seat, snapshot, send, onClose }: Props): ReactElement => {
  const [kind, setKind] = useState<"gain" | "spend">("gain");
  const [amount, setAmount] = useState(1);
  const [description, setDescription] = useState("");
  const [lastAll, setLastAll] = useState<Batch | null>(null);
  const color = seat.color;
  const sessionNum = snapshot.sessionNum ?? 1;
  const last = seat.lastXpEntry;

  const entry = (): XpEntryRef => {
    if (description.trim() === "") {
      throw new Error("A description is required.");
    }
    return { kind, amount, description: description.trim() };
  };
  const signed = (ref: XpEntryRef): number => (ref.kind === "gain" ? ref.amount : -ref.amount);
  const reset = (): void => {
    setDescription("");
    setAmount(1);
  };
  const eligible = snapshot.seats.filter((row) => !row.absentFromSession).map((row) => row.color);

  return (
    <SheetModal
      title={`Experience — ${seat.charName || color}`}
      subtitle={`New entries go in ${sessionDisplayForNum(sessionNum)}.`}
      submitLabel="Apply"
      onClose={onClose}
      onSubmit={async () => {
        const ref = entry();
        await send({ op: "xpAppend", color, amount: signed(ref), description: ref.description });
        setLastAll(null);
        reset();
      }}
      actions={(run) => (
        <>
          <button
            type="button"
            title="Every PC except disconnected ones"
            onClick={() => run(async () => {
              const ref = entry();
              await send({ op: "xpAppendAll", color, amount: signed(ref), description: ref.description });
              setLastAll({ entry: ref, colors: eligible });
              reset();
            })}
          >
            Apply to All
          </button>
          <button
            type="button"
            disabled={!lastAll && !last}
            onClick={() => run(async () => {
              if (lastAll) {
                await send({ op: "xpUndoAll", color, expect: lastAll.entry, colors: lastAll.colors });
                setLastAll(null);
              } else if (last) {
                await send({ op: "xpUndo", color, expect: last });
              }
            })}
          >
            {lastAll ? "Undo All" : "Undo"}
          </button>
        </>
      )}
    >
      <Field label="Type">
        <SelectInput
          value={kind}
          onChange={(value) => setKind(value === "spend" ? "spend" : "gain")}
          options={[{ value: "gain", label: "Gain" }, { value: "spend", label: "Spend" }]}
        />
      </Field>
      <Field label="Amount">
        <NumberInput value={amount} onChange={setAmount} min={1} max={99} />
      </Field>
      <Field label="Description" wide>
        <TextInput value={description} onChange={setDescription} placeholder={kind === "gain" ? "e.g. Session attendance" : "e.g. Dominate 3"} />
      </Field>
      <p className="sheet-modal-note">
        {lastAll
          ? `Last Apply to All: ${describe(lastAll.entry)} (${lastAll.colors.length} PCs)`
          : last ? `Last entry: ${describe(last)}` : "No entries yet this session."}
      </p>
    </SheetModal>
  );
};

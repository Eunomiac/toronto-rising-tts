import { useEffect, useRef, useState, type MouseEvent, type ReactElement } from "react";
import type { LabNote } from "../../shared/labNote";
import { addLabNote, deleteLabNote, listLabNotes, patchLabNote } from "./labNotesApi";

const CONFIRM_MS = 1500;

type Draft = { readonly x: number; readonly y: number; readonly id?: number; readonly text: string };

/** Double-confirm: the first click arms (turns red), a second click inside the window acts. */
const ConfirmButton = ({ label, onConfirm }: { label: string; onConfirm: () => void }): ReactElement => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) {
      return undefined;
    }
    const timer = window.setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      className={armed ? "lab-pin-confirm armed" : "lab-pin-confirm"}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? "Click again" : label}
    </button>
  );
};

export const LabPins = ({ sketch, addMode, visible }: { sketch: string; addMode: boolean; visible: boolean }): ReactElement => {
  const [notes, setNotes] = useState<readonly LabNote[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const layer = useRef<HTMLDivElement>(null);

  const run = (task: Promise<readonly LabNote[]>): void => {
    task.then((next) => {
      setNotes(next);
      setError(null);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  };

  useEffect(() => {
    run(listLabNotes());
  }, []);

  useEffect(() => {
    setOpenId(null);
    setDraft(null);
  }, [sketch]);

  const onLayerClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (!addMode || event.target !== layer.current) {
      return;
    }
    const rect = layer.current.getBoundingClientRect();
    setOpenId(null);
    setDraft({ x: event.clientX - rect.left, y: event.clientY - rect.top, text: "" });
  };

  const saveDraft = (): void => {
    if (!draft || draft.text.trim() === "") {
      return;
    }
    run(draft.id === undefined
      ? addLabNote({ sketch, x: draft.x, y: draft.y, text: draft.text })
      : patchLabNote(draft.id, { text: draft.text }));
    setDraft(null);
  };

  const shown = notes.filter((note) => note.sketch === sketch);
  const openNote = shown.find((note) => note.id === openId);

  return (
    <div
      ref={layer}
      className={addMode ? "lab-pins adding" : "lab-pins"}
      onClick={onLayerClick}
      hidden={!visible && !addMode}
    >
      {shown.map((note) => (
        <button
          key={note.id}
          type="button"
          className={`lab-pin ${note.status}${note.reply ? " replied" : ""}${note.id === openId ? " open" : ""}`}
          style={{ left: note.x, top: note.y }}
          title={note.text}
          onClick={(event) => {
            event.stopPropagation();
            setDraft(null);
            setOpenId(note.id === openId ? null : note.id);
          }}
        >
          {note.id}
        </button>
      ))}

      {openNote && (
        <div className="lab-pin-card" style={{ left: openNote.x + 18, top: openNote.y }} onClick={(event) => event.stopPropagation()}>
          <p className="lab-pin-card-label">Note {openNote.id}{openNote.status === "done" ? " (done)" : ""}</p>
          <p className="lab-pin-card-text">{openNote.text}</p>
          {openNote.reply && <p className="lab-pin-card-reply"><strong>Agent:</strong> {openNote.reply}</p>}
          <div className="lab-pin-card-actions">
            <button type="button" onClick={() => setDraft({ x: openNote.x, y: openNote.y, id: openNote.id, text: openNote.text })}>Edit</button>
            <button type="button" onClick={() => run(patchLabNote(openNote.id, { status: openNote.status === "done" ? "open" : "done" }))}>
              {openNote.status === "done" ? "Reopen" : "Mark done"}
            </button>
            <ConfirmButton label="Delete" onConfirm={() => {
              setOpenId(null);
              run(deleteLabNote(openNote.id));
            }} />
          </div>
        </div>
      )}

      {draft && (
        <div className="lab-pin-card editing" style={{ left: draft.x + 18, top: draft.y }} onClick={(event) => event.stopPropagation()}>
          <span className="lab-pin draft" style={{ left: -18, top: 0 }} />
          <textarea
            autoFocus
            value={draft.text}
            placeholder="What should change here? (Enter saves, Shift+Enter for a new line)"
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                saveDraft();
              }
              if (event.key === "Escape") {
                setDraft(null);
              }
            }}
          />
          <div className="lab-pin-card-actions">
            <button type="button" onClick={saveDraft} disabled={draft.text.trim() === ""}>Save note</button>
            <button type="button" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="lab-pins-error">{error}</p>}
    </div>
  );
};

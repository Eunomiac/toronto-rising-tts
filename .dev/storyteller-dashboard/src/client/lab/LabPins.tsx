import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { LabNote } from "../../shared/labNote";
import { addLabNote, deleteLabNote, listLabNotes, patchLabNote } from "./labNotesApi";

const CONFIRM_MS = 1500;
/** `.lab-pin-card` width (border-box) plus the gap kept from the panel's right edge. */
const CARD_W = 300;
const CARD_MARGIN = 8;
const CARD_OFFSET = 18;

/** While adding notes these never reach the page; the click itself places the note. */
const SWALLOWED = ["pointerdown", "mousedown", "click", "dblclick", "contextmenu", "dragstart"] as const;

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

/**
 * Dev-only design notes pinned on a dashboard tab (`page` is the tab, `panel` its element). Notes are drawn in the
 * panel's content coordinates, so they scroll with it. While `addMode` is on, a click anywhere outside the tab bar
 * (pop-ups and modals included) opens a new note there instead of reaching the page.
 */
export const LabPins = ({ page, panel, addMode, visible }: { page: string; panel: HTMLElement; addMode: boolean; visible: boolean }): ReactElement => {
  const [notes, setNotes] = useState<readonly LabNote[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [page]);

  useEffect(() => {
    if (!addMode) {
      return undefined;
    }
    panel.classList.add("pin-adding");
    const swallow = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(".lab-pins, .app-tabs")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "click" && event instanceof MouseEvent) {
        const rect = panel.getBoundingClientRect();
        setOpenId(null);
        setDraft({ x: event.clientX - rect.left + panel.scrollLeft, y: event.clientY - rect.top + panel.scrollTop, text: "" });
      }
    };
    for (const type of SWALLOWED) {
      window.addEventListener(type, swallow, true);
    }
    return () => {
      panel.classList.remove("pin-adding");
      for (const type of SWALLOWED) {
        window.removeEventListener(type, swallow, true);
      }
    };
  }, [addMode, panel]);

  const saveDraft = (): void => {
    if (!draft || draft.text.trim() === "") {
      return;
    }
    run(draft.id === undefined
      ? addLabNote({ sketch: page, x: draft.x, y: draft.y, text: draft.text })
      : patchLabNote(draft.id, { text: draft.text }));
    setDraft(null);
  };

  // A click outside the notes saves the note being written (if it has text) and folds every card back to its pin.
  useEffect(() => {
    if (!draft && openId === null) {
      return undefined;
    }
    const away = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Element && target.closest(".lab-pin-card, .lab-pin")) {
        return;
      }
      if (draft && draft.text.trim() !== "") {
        saveDraft();
      } else {
        setDraft(null);
      }
      setOpenId(null);
    };
    window.addEventListener("pointerdown", away, true);
    return () => window.removeEventListener("pointerdown", away, true);
  });

  /** Cards open to the right of their pin, or to the left when that would run past the panel's right edge. */
  const cardLeft = (x: number): number =>
    x + CARD_OFFSET + CARD_W <= panel.scrollLeft + panel.clientWidth - CARD_MARGIN ? x + CARD_OFFSET : x - CARD_OFFSET - CARD_W;

  const shown = notes.filter((note) => note.sketch === page);
  const openNote = shown.find((note) => note.id === openId);

  return createPortal(
    <div className="lab-pins" hidden={!visible && !addMode}>
      {shown.map((note) => (
        <button
          key={note.id}
          type="button"
          className={`lab-pin ${note.status}${note.reply ? " replied" : ""}${note.id === openId ? " open" : ""}`}
          style={{ left: note.x, top: note.y }}
          title={note.text}
          onClick={() => {
            setDraft(null);
            setOpenId(note.id === openId ? null : note.id);
          }}
        >
          {note.id}
        </button>
      ))}

      {openNote && (
        <div className="lab-pin-card" style={{ left: cardLeft(openNote.x), top: openNote.y }}>
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
        <div className="lab-pin-card editing" style={{ left: cardLeft(draft.x), top: draft.y }}>
          <span className="lab-pin draft" style={{ left: draft.x - cardLeft(draft.x), top: 0 }} />
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
                event.stopPropagation();
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
    </div>,
    panel
  );
};

import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Map } from 'maplibre-gl';
import { addDebugNote, deleteDebugNote, listDebugNotes, patchDebugNote } from './debugNotesApi';
import {
  contextSnapshot,
  interfaceAnchor,
  MAP_SURFACE,
  pointForAnchor,
  VIEWPORT_SURFACE,
  type ScreenPoint,
} from './positioning';
import type { DebugNote, DebugNoteAnchor, DebugNoteFile } from './types';
import type { DebugNotesSlotProps } from './DebugNotesSlot';
import './debug-notes.scss';

const SWALLOWED_EVENTS = ['pointerdown', 'mousedown', 'click', 'dblclick', 'contextmenu', 'dragstart'] as const;
const CARD_WIDTH = 312;

type Draft = { readonly anchor: DebugNoteAnchor; readonly point: ScreenPoint; readonly text: string; readonly id?: number };

function cardPosition(point: ScreenPoint) {
  const left = Math.max(8, Math.min(window.innerWidth - CARD_WIDTH - 8, point.x + 18));
  const top = Math.max(8, Math.min(window.innerHeight - 260, point.y + 18));
  return { left, top };
}

function ConfirmDelete({ onConfirm }: { readonly onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const timer = window.setTimeout(() => setArmed(false), 1600);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return <button type="button" className={armed ? 'is-danger' : ''} onClick={() => armed ? onConfirm() : setArmed(true)}>{armed ? 'Click again' : 'Delete'}</button>;
}

export function DebugNotesSlot({ map, selectedDistrict }: DebugNotesSlotProps) {
  const [enabled, setEnabled] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [visible, setVisible] = useState(true);
  const [file, setFile] = useState<DebugNoteFile>({ nextId: 1, notes: [] });
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionRevision, refreshPositions] = useState(0);

  const run = useCallback((task: Promise<DebugNoteFile>) => {
    task.then((next) => { setFile(next); setError(null); }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, []);

  useEffect(() => { run(listDebugNotes()); }, [run]);

  useEffect(() => {
    const refresh = () => refreshPositions((value) => value + 1);
    window.addEventListener('resize', refresh);
    map?.on('move', refresh);
    const app = document.querySelector('.app');
    const observer = app ? new ResizeObserver(refresh) : null;
    if (app) observer?.observe(app);
    return () => {
      window.removeEventListener('resize', refresh);
      map?.off('move', refresh);
      observer?.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (!addMode) return undefined;
    document.documentElement.classList.add('debug-note-adding');
    const swallow = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.debug-notes')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      if (event.type !== 'click' || !(event instanceof MouseEvent)) return;

      const surfaceElement = target.closest<HTMLElement>('[data-note-surface]');
      const surface = surfaceElement?.dataset.noteSurface ?? VIEWPORT_SURFACE;
      let anchor: DebugNoteAnchor;
      if (surface === MAP_SURFACE && map) {
        const rect = map.getContainer().getBoundingClientRect();
        const coordinates = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
        anchor = { kind: 'map', longitude: coordinates.lng, latitude: coordinates.lat };
      } else {
        const rect = surfaceElement?.getBoundingClientRect()
          ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
        anchor = interfaceAnchor(surface, rect, event.clientX, event.clientY);
      }
      setOpenId(null);
      setVisible(true);
      setDraft({ anchor, point: { x: event.clientX, y: event.clientY }, text: '' });
    };
    for (const type of SWALLOWED_EVENTS) window.addEventListener(type, swallow, true);
    return () => {
      document.documentElement.classList.remove('debug-note-adding');
      for (const type of SWALLOWED_EVENTS) window.removeEventListener(type, swallow, true);
    };
  }, [addMode, map]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target instanceof HTMLTextAreaElement)) {
        setAddMode(false);
        setDraft(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const positionedNotes = useMemo(() => file.notes.flatMap((note) => {
    const point = pointForAnchor(note.anchor, map);
    return point ? [{ note, point }] : [];
  }), [file.notes, map, positionRevision]);

  const saveDraft = () => {
    if (!draft || draft.text.trim() === '') return;
    if (draft.id === undefined) {
      run(addDebugNote({ anchor: draft.anchor, text: draft.text, context: contextSnapshot(map, selectedDistrict) }));
    } else {
      run(patchDebugNote(draft.id, { text: draft.text }));
    }
    setDraft(null);
  };

  const openNote = file.notes.find((note) => note.id === openId) ?? null;
  const openPoint = openNote ? pointForAnchor(openNote.anchor, map) : null;
  const openCount = file.notes.filter((note) => note.status === 'open').length;

  const editNote = (note: DebugNote, point: ScreenPoint) => {
    setOpenId(null);
    setDraft({ id: note.id, anchor: note.anchor, point, text: note.text });
  };

  const stop = (event: ReactPointerEvent) => event.stopPropagation();

  return (
    <div className="debug-notes" onPointerDown={stop}>
      <div className={`debug-notes__controls${enabled ? ' is-open' : ''}`}>
        <button type="button" className="debug-notes__master" aria-expanded={enabled} onClick={() => {
          setEnabled((value) => !value);
          setAddMode(false);
          setDraft(null);
          setOpenId(null);
        }}>
          Debug notes <span>{openCount}</span>
        </button>
        {enabled && (
          <div className="debug-notes__actions">
            <button type="button" aria-pressed={addMode} onClick={() => { setAddMode((value) => !value); setVisible(true); setDraft(null); }}>
              {addMode ? 'Adding: click anywhere' : 'Add note'}
            </button>
            <button type="button" aria-pressed={visible} onClick={() => {
              setVisible((value) => !value);
              setOpenId(null);
              setDraft(null);
            }}>
              {visible ? 'Hide notes' : 'Show notes'}
            </button>
          </div>
        )}
      </div>

      {enabled && (visible || addMode) && positionedNotes.map(({ note, point }) => (
        <button
          key={note.id}
          type="button"
          className={`debug-note-pin debug-note-pin--${note.status}${note.reply ? ' has-reply' : ''}`}
          style={{ left: point.x, top: point.y }}
          title={note.text}
          onClick={() => { setDraft(null); setOpenId(openId === note.id ? null : note.id); }}
        >{note.id}</button>
      ))}

      {enabled && openNote && openPoint && (
        <article className="debug-note-card" style={cardPosition(openPoint)}>
          <p className="debug-note-card__label">Note {openNote.id}{openNote.status === 'done' ? ' · done' : ''}</p>
          <p className="debug-note-card__text">{openNote.text}</p>
          {openNote.reply && <p className="debug-note-card__reply"><strong>Agent:</strong> {openNote.reply}</p>}
          <div className="debug-note-card__actions">
            <button type="button" onClick={() => editNote(openNote, openPoint)}>Edit</button>
            <button type="button" onClick={() => run(patchDebugNote(openNote.id, { status: openNote.status === 'done' ? 'open' : 'done' }))}>
              {openNote.status === 'done' ? 'Reopen' : 'Mark done'}
            </button>
            <ConfirmDelete onConfirm={() => { setOpenId(null); run(deleteDebugNote(openNote.id)); }} />
          </div>
        </article>
      )}

      {enabled && draft && (
        <article className="debug-note-card debug-note-card--editing" style={cardPosition(draft.point)}>
          <p className="debug-note-card__label">{draft.id === undefined ? 'New note' : `Edit note ${draft.id}`}</p>
          <textarea
            autoFocus
            value={draft.text}
            placeholder="What should change here? (Enter saves; Shift+Enter adds a line)"
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveDraft(); }
              if (event.key === 'Escape') { event.stopPropagation(); setDraft(null); }
            }}
          />
          <div className="debug-note-card__actions">
            <button type="button" disabled={draft.text.trim() === ''} onClick={saveDraft}>Save note</button>
            <button type="button" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </article>
      )}

      {error && <p className="debug-notes__error" role="alert">{error}</p>}
    </div>
  );
}

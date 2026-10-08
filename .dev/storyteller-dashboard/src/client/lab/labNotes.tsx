import { useState, useSyncExternalStore, type CSSProperties, type DragEvent, type ReactElement } from "react";

/**
 * Scene notes for the Glance layout. The Lab keeps them in this browser's local storage, notes keyed by scene and
 * categories shared by every scene; the real build stores a scene's notes with that scene in the library.
 */

type NoteCategory = { readonly id: string; readonly name: string; readonly color: string };
type SceneNote = { readonly id: string; readonly text: string; readonly categoryId: string; readonly createdAt: number };
type NotesStore = {
  readonly categories: readonly NoteCategory[];
  readonly scenes: Readonly<Record<string, readonly SceneNote[]>>;
};
type SortMode = "manual" | "newest" | "category";

const NOTES_KEY = "tr-lab-scene-notes";
const NOTE_DRAG_TYPE = "application/x-tr-scene-note";
const UNCATEGORISED_COLOR = "#6a6a74";
const NEW_CATEGORY_COLOR = "#7bc6a4";

const SAMPLE_SCENE = "Elysium — Casa Loma: Great Hall";
const SAMPLE_STORE: NotesStore = {
  categories: [
    { id: "plot", name: "Plot", color: "#c9a94e" },
    { id: "npcs", name: "NPCs", color: "#6aa9e8" },
    { id: "clues", name: "Clues", color: "#b48ae8" },
    { id: "todo", name: "To do", color: "#e06666" }
  ],
  scenes: {
    [SAMPLE_SCENE]: [
      { id: "n1", text: "Victor arrives late and wants to be seen beside the Prince.", categoryId: "npcs", createdAt: 1 },
      { id: "n2", text: "The ledger page is still in the cloakroom.", categoryId: "clues", createdAt: 2 },
      { id: "n3", text: "If the toast goes badly, cut to the gardens.", categoryId: "plot", createdAt: 3 },
      { id: "n4", text: "Ask Rashid's player about the boon from last session.", categoryId: "todo", createdAt: 4 }
    ]
  }
};

const readStore = (): NotesStore => {
  const saved = window.localStorage.getItem(NOTES_KEY);
  return saved ? (JSON.parse(saved) as NotesStore) : SAMPLE_STORE;
};

let store: NotesStore | null = null;
const listeners = new Set<() => void>();
const snapshot = (): NotesStore => {
  store ??= readStore();
  return store;
};
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setStore = (next: NotesStore): void => {
  store = next;
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
};

/** Category marker that is also a hidden picker: click the dot to file the note under another category. */
const CategoryDot = ({ categories, value, onChange }: {
  categories: readonly NoteCategory[];
  value: string;
  onChange: (categoryId: string) => void;
}): ReactElement => (
  <span className="lab-note-dot" title="Category">
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">No category</option>
      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select>
  </span>
);

/**
 * Add a note with Enter; double-click a note to edit it; drag notes to reorder them (in "My order", or onto a
 * category heading when grouped by category). Category chips filter the list; "+" adds a category.
 */
export const SceneNotes = ({ scene }: { scene: string }): ReactElement => {
  const data = useSyncExternalStore(subscribe, snapshot);
  const notes = data.scenes[scene] ?? [];
  const [text, setText] = useState("");
  const [newCategory, setNewCategory] = useState(data.categories[0]?.id ?? "");
  const [sort, setSort] = useState<SortMode>("manual");
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [draft, setDraft] = useState<{ name: string; color: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const categoryOf = (note: SceneNote): NoteCategory | undefined => data.categories.find((category) => category.id === note.categoryId);
  const saveNotes = (next: readonly SceneNote[]): void => setStore({ ...data, scenes: { ...data.scenes, [scene]: next } });
  const updateNote = (id: string, change: Partial<SceneNote>): void =>
    saveNotes(notes.map((note) => (note.id === id ? { ...note, ...change } : note)));
  const addNote = (): void => {
    if (text.trim() === "") {
      return;
    }
    saveNotes([...notes, { id: `note-${Date.now()}`, text: text.trim(), categoryId: newCategory, createdAt: Date.now() }]);
    setText("");
  };
  const moveNote = (id: string, before: string | null, categoryId?: string): void => {
    const moving = notes.find((note) => note.id === id);
    if (!moving || id === before) {
      return;
    }
    const moved = categoryId === undefined ? moving : { ...moving, categoryId };
    const rest = notes.filter((note) => note.id !== id);
    const at = before === null ? rest.length : rest.findIndex((note) => note.id === before);
    saveNotes([...rest.slice(0, at), moved, ...rest.slice(at)]);
  };
  const createCategory = (): void => {
    if (!draft || draft.name.trim() === "") {
      return;
    }
    const category = { id: `cat-${Date.now()}`, name: draft.name.trim(), color: draft.color };
    setStore({ ...data, categories: [...data.categories, category] });
    setNewCategory(category.id);
    setDraft(null);
  };
  const removeCategory = (id: string): void => {
    setStore({
      categories: data.categories.filter((category) => category.id !== id),
      scenes: Object.fromEntries(Object.entries(data.scenes).map(([key, list]) => [
        key,
        list.map((note) => (note.categoryId === id ? { ...note, categoryId: "" } : note))
      ]))
    });
    if (filter === id) {
      setFilter(null);
    }
  };

  const visible = notes.filter((note) => filter === null || note.categoryId === filter);
  const ordered = sort === "newest" ? [...visible].sort((a, b) => b.createdAt - a.createdAt) : visible;
  const dropProps = (key: string, onDrop: (id: string) => void) => ({
    onDragOver: (event: DragEvent) => {
      if (event.dataTransfer.types.includes(NOTE_DRAG_TYPE)) {
        event.preventDefault();
        setDropTarget(key);
      }
    },
    onDragLeave: () => setDropTarget((current) => (current === key ? null : current)),
    onDrop: (event: DragEvent) => {
      setDropTarget(null);
      const id = event.dataTransfer.getData(NOTE_DRAG_TYPE);
      if (id) {
        onDrop(id);
      }
    }
  });

  const noteRow = (note: SceneNote): ReactElement => {
    const category = categoryOf(note);
    const draggable = sort !== "newest" && editing?.id !== note.id;
    return (
      <li
        key={note.id}
        className={`lab-note${dropTarget === note.id ? " drop" : ""}`}
        style={{ "--note": category?.color ?? UNCATEGORISED_COLOR } as CSSProperties}
        draggable={draggable}
        onDragStart={(event) => event.dataTransfer.setData(NOTE_DRAG_TYPE, note.id)}
        {...(draggable ? dropProps(note.id, (id) => moveNote(id, note.id, sort === "category" ? note.categoryId : undefined)) : {})}
      >
        <CategoryDot categories={data.categories} value={note.categoryId} onChange={(categoryId) => updateNote(note.id, { categoryId })} />
        {editing?.id === note.id ? (
          <textarea
            className="lab-note-edit"
            autoFocus
            value={editing.text}
            onChange={(event) => setEditing({ ...editing, text: event.target.value })}
            onBlur={() => {
              updateNote(note.id, { text: editing.text.trim() || note.text });
              setEditing(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setEditing(null);
              }
            }}
          />
        ) : (
          <span className="lab-note-text" title="Double-click to edit" onDoubleClick={() => setEditing({ id: note.id, text: note.text })}>
            {note.text}
          </span>
        )}
        <button type="button" className="lab-note-remove" title="Delete note" onClick={() => saveNotes(notes.filter((entry) => entry.id !== note.id))}>×</button>
      </li>
    );
  };

  const groups = [...data.categories.map((category) => ({ id: category.id, name: category.name, color: category.color })), { id: "", name: "No category", color: UNCATEGORISED_COLOR }];
  return (
    <div className="lab-notes">
      <div className="lab-notes-head">
        <span className="lab-notes-title">Scene notes</span>
        <select className="lab-select" value={sort} title="Sort notes" onChange={(event) => setSort(event.target.value as SortMode)}>
          <option value="manual">My order</option>
          <option value="newest">Newest first</option>
          <option value="category">By category</option>
        </select>
      </div>
      <div className="lab-notes-chips">
        <button type="button" className={`lab-notes-chip${filter === null ? " on" : ""}`} onClick={() => setFilter(null)}>All</button>
        {data.categories.map((category) => (
          <span key={category.id} className={`lab-notes-chip${filter === category.id ? " on" : ""}`} style={{ "--note": category.color } as CSSProperties}>
            <button type="button" onClick={() => setFilter(filter === category.id ? null : category.id)}>{category.name}</button>
            <button type="button" className="lab-notes-chip-remove" title="Remove category (its notes keep no category)" onClick={() => removeCategory(category.id)}>×</button>
          </span>
        ))}
        <button type="button" className="lab-notes-chip add" title="New category" onClick={() => setDraft({ name: "", color: NEW_CATEGORY_COLOR })}>+</button>
      </div>
      {draft && (
        <form
          className="lab-cat-draft"
          onSubmit={(event) => {
            event.preventDefault();
            createCategory();
          }}
        >
          <input className="lab-select" autoFocus placeholder="Category name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input type="color" className="lab-cat-color" value={draft.color} title="Category colour" onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
          <button type="submit" className="lab-btn primary">Add</button>
          <button type="button" className="lab-btn" onClick={() => setDraft(null)}>Cancel</button>
        </form>
      )}
      <form
        className="lab-notes-add"
        style={{ "--note": data.categories.find((category) => category.id === newCategory)?.color ?? UNCATEGORISED_COLOR } as CSSProperties}
        onSubmit={(event) => {
          event.preventDefault();
          addNote();
        }}
      >
        <CategoryDot categories={data.categories} value={newCategory} onChange={setNewCategory} />
        <input
          className="lab-select"
          placeholder="Add a note…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </form>
      <div className="lab-notes-body">
        {sort === "category" ? (
          groups.map((group) => {
            const list = ordered.filter((note) => note.categoryId === group.id);
            if (list.length === 0 && (group.id === "" || filter !== null)) {
              return null;
            }
            return (
              <section key={group.id || "none"} className="lab-notes-group" style={{ "--note": group.color } as CSSProperties}>
                <span
                  className={`lab-notes-group-head${dropTarget === `head:${group.id}` ? " drop" : ""}`}
                  {...dropProps(`head:${group.id}`, (id) => moveNote(id, null, group.id))}
                >
                  {group.name} <span className="lab-cat-count">{list.length}</span>
                </span>
                <ul className="lab-notes-list">{list.map(noteRow)}</ul>
              </section>
            );
          })
        ) : (
          <ul className="lab-notes-list">{ordered.map(noteRow)}</ul>
        )}
        {notes.length === 0 && <p className="lab-notes-empty">No notes for this scene yet.</p>}
      </div>
    </div>
  );
};

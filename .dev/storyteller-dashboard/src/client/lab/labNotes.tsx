import { useState, useSyncExternalStore, type CSSProperties, type ReactElement } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

/**
 * Scene notes for the Glance layout: one or more rich-text documents per scene, switched with tabs. The Lab keeps
 * them in this browser's local storage keyed by scene; the real build stores them with the scene in the library.
 */

type SceneDoc = { readonly id: string; readonly title: string; readonly html: string };
type SceneDocs = { readonly docs: readonly SceneDoc[]; readonly activeId: string };
type DocsStore = Readonly<Record<string, SceneDocs>>;

const DOCS_KEY = "tr-lab-scene-docs";

const SAMPLE_SCENE = "Elysium — Casa Loma: Great Hall";
const SAMPLE_STORE: DocsStore = {
  [SAMPLE_SCENE]: {
    activeId: "d1",
    docs: [
      {
        id: "d1",
        title: "Scene",
        html: "<h3>Beats</h3><ul><li><p>Victor arrives late and wants to be seen beside the Prince.</p></li><li><p>If the toast goes badly, cut to the gardens.</p></li></ul><h3>Clues</h3><p>The ledger page is still in the <strong>cloakroom</strong>.</p>"
      },
      { id: "d2", title: "To do", html: "<ul><li><p>Ask Rashid's player about the boon from last session.</p></li></ul>" }
    ]
  }
};

const readStore = (): DocsStore => {
  const saved = window.localStorage.getItem(DOCS_KEY);
  return saved ? (JSON.parse(saved) as DocsStore) : SAMPLE_STORE;
};

let store: DocsStore | null = null;
const listeners = new Set<() => void>();
const snapshot = (): DocsStore => {
  store ??= readStore();
  return store;
};
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setScene = (scene: string, next: SceneDocs): void => {
  store = { ...snapshot(), [scene]: next };
  window.localStorage.setItem(DOCS_KEY, JSON.stringify(store));
  listeners.forEach((listener) => listener());
};

const newDoc = (title: string): SceneDoc => ({ id: `d${Date.now().toString(36)}`, title, html: "" });
const EMPTY_SCENE: SceneDocs = { docs: [{ id: "d0", title: "Notes", html: "" }], activeId: "d0" };
const sceneDocsOf = (scene: string): SceneDocs => snapshot()[scene] ?? EMPTY_SCENE;

type ToolButton = {
  readonly label: string;
  readonly title: string;
  readonly look?: CSSProperties;
  readonly active: (editor: Editor) => boolean;
  readonly run: (editor: Editor) => void;
};

const TOOLS: readonly (ToolButton | "sep")[] = [
  { label: "B", title: "Bold (Ctrl+B)", look: { fontWeight: 900 }, active: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { label: "I", title: "Italic (Ctrl+I)", look: { fontStyle: "italic" }, active: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: "U", title: "Underline (Ctrl+U)", look: { textDecoration: "underline" }, active: (e) => e.isActive("underline"), run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: "S", title: "Strikethrough", look: { textDecoration: "line-through" }, active: (e) => e.isActive("strike"), run: (e) => e.chain().focus().toggleStrike().run() },
  "sep",
  { label: "H", title: "Heading", active: (e) => e.isActive("heading", { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "•", title: "Bulleted list", active: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "1.", title: "Numbered list", active: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "❝", title: "Quote", active: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() }
];

const Toolbar = ({ editor }: { editor: Editor }): ReactElement => {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => TOOLS.map((tool) => (tool === "sep" ? false : tool.active(current)))
  });
  return (
    <div className="lab-doc-tools">
      {TOOLS.map((tool, index) =>
        tool === "sep" ? (
          <span key={`sep${index}`} className="lab-doc-tools-sep" />
        ) : (
          <button
            key={tool.label}
            type="button"
            className={`lab-doc-tool${active[index] ? " on" : ""}`}
            style={tool.look}
            title={tool.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => tool.run(editor)}
          >
            {tool.label}
          </button>
        )
      )}
    </div>
  );
};

const DocEditor = ({ doc, onChange }: { doc: SceneDoc; onChange: (html: string) => void }): ReactElement | null => {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [3] }, link: false }), Placeholder.configure({ placeholder: "Write notes for this scene…" })],
    content: doc.html,
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML())
  });
  if (!editor) {
    return null;
  }
  return (
    <>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="lab-doc-body" />
    </>
  );
};

/**
 * Click a tab to switch documents, double-click it to rename, "+" for a new one. The × on the open tab deletes it
 * after a second click; the last document cannot be deleted.
 */
export const SceneNotes = ({ scene }: { scene: string }): ReactElement => {
  const data = useSyncExternalStore(subscribe, snapshot);
  const sceneDocs = data[scene] ?? EMPTY_SCENE;
  const active = sceneDocs.docs.find((doc) => doc.id === sceneDocs.activeId) ?? sceneDocs.docs[0];
  const [renaming, setRenaming] = useState<string | null>(null);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const save = (docs: readonly SceneDoc[], activeId: string): void => setScene(scene, { docs, activeId });
  // Reads the stored documents, not this render's, because the editor keeps the callback it was created with.
  const update = (id: string, change: Partial<SceneDoc>): void => {
    const current = sceneDocsOf(scene);
    save(current.docs.map((doc) => (doc.id === id ? { ...doc, ...change } : doc)), current.activeId);
  };
  const remove = (id: string): void => {
    const index = sceneDocs.docs.findIndex((doc) => doc.id === id);
    const docs = sceneDocs.docs.filter((doc) => doc.id !== id);
    save(docs, docs[Math.max(0, index - 1)]?.id ?? "");
    setArmedDelete(null);
  };
  return (
    <div className="lab-doc">
      <div className="lab-doc-tabs">
        {sceneDocs.docs.map((doc) =>
          renaming === doc.id ? (
            <input
              key={doc.id}
              className="lab-doc-tab-rename"
              defaultValue={doc.title}
              autoFocus
              onFocus={(event) => event.target.select()}
              onBlur={(event) => {
                update(doc.id, { title: event.target.value.trim() || doc.title });
                setRenaming(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setRenaming(null);
                }
              }}
            />
          ) : (
            <span
              key={doc.id}
              className={`lab-doc-tab${doc.id === active?.id ? " on" : ""}`}
              title="Double-click to rename"
              onClick={() => save(sceneDocs.docs, doc.id)}
              onDoubleClick={() => setRenaming(doc.id)}
              onMouseLeave={() => setArmedDelete(null)}
            >
              {doc.title}
              {doc.id === active?.id && sceneDocs.docs.length > 1 && (
                <button
                  type="button"
                  className={`lab-doc-tab-close${armedDelete === doc.id ? " armed" : ""}`}
                  title={armedDelete === doc.id ? "Click again to delete this document" : "Delete this document"}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (armedDelete === doc.id) {
                      remove(doc.id);
                    } else {
                      setArmedDelete(doc.id);
                    }
                  }}
                >
                  {armedDelete === doc.id ? "Delete?" : "×"}
                </button>
              )}
            </span>
          )
        )}
        <button
          type="button"
          className="lab-doc-tab-add"
          title="New document"
          onClick={() => {
            const doc = newDoc(`Notes ${sceneDocs.docs.length + 1}`);
            save([...sceneDocs.docs, doc], doc.id);
          }}
        >
          +
        </button>
      </div>
      {active && <DocEditor key={active.id} doc={active} onChange={(html) => update(active.id, { html })} />}
    </div>
  );
};

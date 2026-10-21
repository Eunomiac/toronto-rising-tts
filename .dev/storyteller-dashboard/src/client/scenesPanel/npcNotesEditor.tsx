import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, type ReactElement } from "react";
import { normalizeNpcNotes } from "../../shared/npcNotes";

/** A toolbar-free notes editor. Ctrl/Cmd+B and Ctrl/Cmd+I are the only rich-text commands retained on save. */
export const NpcNotesEditor = ({ value, onChange }: { value: string; onChange: (html: string) => void }): ReactElement | null => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
        strike: false,
        link: false
      }),
      Placeholder.configure({ placeholder: "Notes (Ctrl/Cmd+B for bold; Ctrl/Cmd+I for italic)" })
    ],
    content: value,
    editorProps: { attributes: { "aria-label": "Notes" } },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : normalizeNpcNotes(current.getHTML()))
  });
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : normalizeNpcNotes(editor.getHTML());
    const next = normalizeNpcNotes(value);
    if (current !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);
  return editor ? <EditorContent editor={editor} className="npc-stats-notes" /> : null;
};

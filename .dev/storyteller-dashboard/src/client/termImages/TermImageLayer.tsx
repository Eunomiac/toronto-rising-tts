import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Field } from "../pcSheet/fields.js";
import { SheetModal } from "../pcSheet/SheetModal.js";
import {
  loadTermImages,
  removeTermImage,
  saveTermImage,
  saveTermText,
  subscribeTermImages,
  termTooltip,
  type TermTooltip
} from "./store.js";

const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EDGE_MARGIN = 8;
const CURSOR_GAP = 18;

type Target = { readonly key: string; readonly label: string };
type Orientation = "wide" | "tall";

const termElement = (target: EventTarget | null): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>("[data-term]") : null;

const targetOf = (el: HTMLElement): Target | null => {
  const key = el.dataset.term;
  return key ? { key, label: el.dataset.termLabel ?? el.textContent?.trim() ?? key } : null;
};

const imageFrom = (items: DataTransferItemList | null | undefined, files: FileList | null | undefined): File | null => {
  for (const item of Array.from(items ?? [])) {
    if (item.kind === "file" && ACCEPTED.has(item.type)) {
      const file = item.getAsFile();
      if (file) {
        return file;
      }
    }
  }
  return Array.from(files ?? []).find((file) => ACCEPTED.has(file.type)) ?? null;
};

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "INPUT");

/** Markdown with GFM; raw HTML in the text is shown as text, never rendered. */
const TermMarkdown = ({ text }: { readonly text: string }): ReactElement => (
  <div className="term-md">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </div>
);

const TermImageModal = ({ target, onClose }: { readonly target: Target; readonly onClose: () => void }): ReactElement => {
  const current = termTooltip(target.key);
  const [image, setImage] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState(current?.text ?? "");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const file = imageFrom(event.clipboardData?.items, event.clipboardData?.files);
      if (file) {
        event.preventDefault();
        setImage(file);
        setClearImage(false);
        setNotice(null);
      } else if (!isEditable(event.target)) {
        setNotice("The clipboard has no image. Copy an image (or a screenshot) and press Ctrl+V again.");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const keptImage = clearImage ? undefined : current?.imageUrl;
  const shown = preview ?? keptImage;
  return (
    <SheetModal
      title={target.label}
      subtitle={`Tooltip · ${target.key}`}
      submitLabel={current ? "Update" : "Save"}
      wide
      onClose={onClose}
      onSubmit={async () => {
        const nextText = text.replace(/\s+$/, "");
        if (!image && !keptImage && nextText === "") {
          throw new Error(current ? "Nothing would be left — use Remove tooltip instead." : "Paste an image or write some text first.");
        }
        if (nextText !== (current?.text ?? "")) {
          await saveTermText(target.key, nextText);
        }
        if (image) {
          await saveTermImage(target.key, image);
        } else if (clearImage && current?.imageUrl) {
          await removeTermImage(target.key, "image");
        }
        onClose();
      }}
      {...(current ? { onDelete: async () => { await removeTermImage(target.key); onClose(); }, deleteLabel: "Remove tooltip" } : {})}
    >
      <div
        className="term-image-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = imageFrom(event.dataTransfer.items, event.dataTransfer.files);
          if (file) {
            setImage(file);
            setClearImage(false);
            setNotice(null);
          }
        }}
      >
        {shown ? <img src={shown} alt={target.label} /> : <p>Press <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste an image, or drop an image file here.</p>}
        {preview ? <span className="term-image-badge">New — not saved yet</span> : null}
        {shown ? (
          <button
            type="button"
            className="term-image-clear"
            onClick={() => {
              setImage(null);
              setClearImage(true);
            }}
          >
            Clear image
          </button>
        ) : null}
      </div>
      {notice ? <p className="sheet-modal-note">{notice}</p> : null}
      <Field label="Tooltip text" hint="Markdown: **bold**, *italic*, # headings, - lists, tables. Ctrl+Enter saves.">
        <textarea
          className="sheet-input term-md-input"
          rows={10}
          value={text}
          placeholder="Optional notes shown with the image."
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <div className="term-md-preview">
        <span className="sheet-field-label">Preview</span>
        {text.trim() !== "" ? <TermMarkdown text={text} /> : <p className="term-md-empty">Nothing to preview yet.</p>}
      </div>
      <p className="sheet-modal-note">Shared by every “{target.label}” of this kind on the dashboard. Shift+right-click opens the normal browser menu.</p>
    </SheetModal>
  );
};

/** Mount once: right-click on `[data-term]` opens the tooltip editor; hover shows the saved image and text. */
export const TermImageLayer = (): ReactElement | null => {
  const [editing, setEditing] = useState<Target | null>(null);
  const [tip, setTip] = useState<TermTooltip | null>(null);
  const [shape, setShape] = useState<{ readonly url: string; readonly orientation: Orientation } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  /** Beside the cursor, flipped to the other side when it would cross an edge, then clamped inside the viewport. */
  const place = (): void => {
    const el = tipRef.current;
    if (!el) {
      return;
    }
    const { x, y } = pointer.current;
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const axis = (at: number, size: number, view: number): number => {
      let start = at + CURSOR_GAP;
      if (start + size > view - EDGE_MARGIN && at - CURSOR_GAP - size >= EDGE_MARGIN) {
        start = at - CURSOR_GAP - size;
      }
      return Math.max(EDGE_MARGIN, Math.min(start, view - EDGE_MARGIN - size));
    };
    el.style.left = `${axis(x, w, viewW)}px`;
    el.style.top = `${axis(y, h, viewH)}px`;
  };
  const placeRef = useRef(place);
  placeRef.current = place;

  useEffect(() => {
    loadTermImages().catch((error: unknown) => console.error("Term images:", error));

    const refreshTip = (): void => {
      const key = hoverRef.current?.dataset.term;
      setTip(key ? termTooltip(key) ?? null : null);
    };

    const onOver = (event: MouseEvent): void => {
      const el = termElement(event.target);
      if (el === hoverRef.current) {
        return;
      }
      hoverRef.current = el;
      pointer.current = { x: event.clientX, y: event.clientY };
      refreshTip();
      placeRef.current();
    };
    const onMove = (event: MouseEvent): void => {
      if (hoverRef.current) {
        pointer.current = { x: event.clientX, y: event.clientY };
        placeRef.current();
      }
    };
    const onLeave = (event: MouseEvent): void => {
      if (event.relatedTarget === null) {
        hoverRef.current = null;
        setTip(null);
      }
    };
    const onContext = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.shiftKey) {
        return;
      }
      const el = termElement(event.target);
      const target = el ? targetOf(el) : null;
      if (!target) {
        return;
      }
      event.preventDefault();
      hoverRef.current = null;
      setTip(null);
      setEditing(target);
    };

    const unsubscribe = subscribeTermImages(refreshTip);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseout", onLeave);
    document.addEventListener("contextmenu", onContext);
    return () => {
      unsubscribe();
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onLeave);
      document.removeEventListener("contextmenu", onContext);
    };
  }, []);

  const orientation = shape !== null && shape.url === tip?.imageUrl ? shape.orientation : null;
  useLayoutEffect(() => place(), [tip, orientation]);

  const measure = useCallback((img: HTMLImageElement | null): void => {
    if (!img?.complete || img.naturalWidth === 0) {
      return;
    }
    const url = img.getAttribute("src") ?? "";
    const next: Orientation = img.naturalWidth >= img.naturalHeight ? "wide" : "tall";
    setShape((prev) => (prev?.url === url && prev.orientation === next ? prev : { url, orientation: next }));
  }, []);

  const ready = tip !== null && !editing && (!tip.imageUrl || orientation !== null);
  const classes = [
    "term-image-tip",
    ready ? "on" : "",
    tip?.imageUrl ? orientation ?? "" : "text-only",
    tip?.text ? "has-text" : ""
  ].filter(Boolean).join(" ");
  const tipNode = (
    <div ref={tipRef} className={classes} aria-hidden="true">
      {tip?.imageUrl ? (
        <img key={tip.imageUrl} ref={measure} src={tip.imageUrl} alt="" onLoad={(event) => measure(event.currentTarget)} />
      ) : null}
      {tip?.text ? <TermMarkdown text={tip.text} /> : null}
    </div>
  );
  return (
    <>
      {createPortal(tipNode, document.body)}
      {editing ? <TermImageModal target={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
};

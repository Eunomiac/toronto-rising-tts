import { useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { SheetModal } from "../pcSheet/SheetModal.js";
import { loadTermImages, removeTermImage, saveTermImage, subscribeTermImages, termImageUrl } from "./store.js";

const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type Target = { readonly key: string; readonly label: string };

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

const TermImageModal = ({ target, onClose }: { readonly target: Target; readonly onClose: () => void }): ReactElement => {
  const current = termImageUrl(target.key);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
        setNotice(null);
      } else {
        setNotice("The clipboard has no image. Copy an image (or a screenshot) and press Ctrl+V again.");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const shown = preview ?? current;
  return (
    <SheetModal
      title={target.label}
      subtitle={`Tooltip image · ${target.key}`}
      submitLabel={current ? "Replace" : "Save"}
      onClose={onClose}
      onSubmit={async () => {
        if (!image) {
          throw new Error("Paste an image first (Ctrl+V).");
        }
        await saveTermImage(target.key, image);
        onClose();
      }}
      {...(current ? { onDelete: async () => { await removeTermImage(target.key); onClose(); }, deleteLabel: "Remove image" } : {})}
    >
      <div
        className="term-image-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = imageFrom(event.dataTransfer.items, event.dataTransfer.files);
          if (file) {
            setImage(file);
            setNotice(null);
          }
        }}
      >
        {shown ? <img src={shown} alt={target.label} /> : <p>Press <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste an image, or drop an image file here.</p>}
        {preview && current ? <span className="term-image-badge">New — not saved yet</span> : null}
      </div>
      {notice ? <p className="sheet-modal-note">{notice}</p> : null}
      <p className="sheet-modal-note">Shared by every “{target.label}” of this kind on the dashboard. Shift+right-click opens the normal browser menu.</p>
    </SheetModal>
  );
};

/** Mount once: right-click on `[data-term]` opens the paste popup; hover shows the saved image. */
export const TermImageLayer = (): ReactElement | null => {
  const [editing, setEditing] = useState<Target | null>(null);
  const [tipUrl, setTipUrl] = useState<string | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    loadTermImages().catch((error: unknown) => console.error("Term images:", error));

    const place = (): void => {
      const tip = tipRef.current;
      if (!tip) {
        return;
      }
      const { x, y } = pointer.current;
      const flipX = x > window.innerWidth / 2;
      const flipY = y > window.innerHeight / 2;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      tip.style.transform = `translate(${flipX ? "calc(-100% - 18px)" : "18px"}, ${flipY ? "calc(-100% - 18px)" : "18px"})`;
    };

    const refreshTip = (): void => {
      const el = hoverRef.current;
      const key = el?.dataset.term;
      setTipUrl(key ? termImageUrl(key) ?? null : null);
    };

    const onOver = (event: MouseEvent): void => {
      const el = termElement(event.target);
      if (el === hoverRef.current) {
        return;
      }
      hoverRef.current = el;
      pointer.current = { x: event.clientX, y: event.clientY };
      refreshTip();
      place();
    };
    const onMove = (event: MouseEvent): void => {
      if (hoverRef.current) {
        pointer.current = { x: event.clientX, y: event.clientY };
        place();
      }
    };
    const onLeave = (event: MouseEvent): void => {
      if (event.relatedTarget === null) {
        hoverRef.current = null;
        setTipUrl(null);
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
      setTipUrl(null);
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

  const tip = (
    <div ref={tipRef} className={`term-image-tip${tipUrl && !editing ? " on" : ""}`} aria-hidden="true">
      {tipUrl ? <img src={tipUrl} alt="" /> : null}
    </div>
  );
  return (
    <>
      {createPortal(tip, document.body)}
      {editing ? <TermImageModal target={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
};

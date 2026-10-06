import { useEffect, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly submitLabel?: string;
  readonly wide?: boolean;
  readonly onClose: () => void;
  /** Throw to keep the modal open and show the message. */
  readonly onSubmit: () => Promise<void>;
  /** Two-click delete in the footer when provided. */
  readonly onDelete?: () => Promise<void>;
  readonly deleteLabel?: string;
  /** Extra footer buttons (left of Save); `run` shares the modal busy/error state. */
  readonly actions?: (run: (task: () => Promise<void>) => void) => ReactNode;
  readonly children: ReactNode;
};

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const SheetModal = ({
  title,
  subtitle,
  submitLabel = "Save",
  wide = false,
  onClose,
  onSubmit,
  onDelete,
  deleteLabel = "Delete",
  actions,
  children
}: Props): ReactElement => {
  const cardRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armedDelete, setArmedDelete] = useState(false);

  useEffect(() => {
    const first = cardRef.current?.querySelector<HTMLElement>("input, textarea, select");
    first?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  useEffect(() => {
    if (!armedDelete) {
      return;
    }
    const timer = window.setTimeout(() => setArmedDelete(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armedDelete]);

  const run = async (task: () => Promise<void>): Promise<void> => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    void run(onSubmit);
  };

  const clickDelete = (): void => {
    if (!onDelete) {
      return;
    }
    if (!armedDelete) {
      setArmedDelete(true);
      return;
    }
    setArmedDelete(false);
    void run(onDelete);
  };

  const root = typeof document !== "undefined" ? document.getElementById("modal-root") : null;
  const body = (
    <div
      className="modal-backdrop sheet-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <form
        ref={cardRef}
        className={`sheet-modal${wide ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            submit(event);
          }
        }}
      >
        <header className="sheet-modal-header">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
        <div className="sheet-modal-body">{children}</div>
        <footer className="sheet-modal-footer">
          {onDelete ? (
            <button type="button" className={`sheet-modal-delete${armedDelete ? " armed" : ""}`} disabled={busy} onClick={clickDelete}>
              {armedDelete ? "Click again to confirm" : deleteLabel}
            </button>
          ) : null}
          {error ? <p className="sheet-modal-error" role="alert">{error}</p> : <span className="sheet-modal-spacer" />}
          {actions?.((task) => void run(task))}
          <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className="sheet-modal-submit" disabled={busy}>
            {busy ? "Sending…" : submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
  return root ? createPortal(body, root) : body;
};

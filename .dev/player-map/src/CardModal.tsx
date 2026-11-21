import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface CardModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Accessible name when visible titles are omitted. */
  readonly ariaLabel: string;
  readonly children: ReactNode;
}

/**
 * Full-screen dimmed overlay. Clicks outside any `[data-card-surface]` close
 * without forwarding through to the map. Card images (and flip controls) mark
 * themselves as the only interactive surface.
 */
export function CardModal({ open, onClose, ariaLabel, children }: CardModalProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  useGSAP(() => {
    if (!open || !rootRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || import.meta.env.MODE === 'test';
    if (reduced) {
      gsap.set(rootRef.current, { clearProps: 'opacity' });
      return;
    }
    gsap.fromTo(rootRef.current, { autoAlpha: 0 }, {
      autoAlpha: 1,
      duration: 0.28,
      ease: 'power2.out',
    });
  }, { dependencies: [open], revertOnUpdate: true });

  if (!open) return null;

  const onBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-card-surface]')) return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      ref={rootRef}
      className="card-modal"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-note-surface="card-modal"
      onMouseDown={onBackdrop}
      onClick={onBackdrop}
    >
      <div className="card-modal__content">
        {children}
      </div>
    </div>
  );
}

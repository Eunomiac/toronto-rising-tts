import type { ReactElement } from "react";

/** A player's signal fire on the dashboard: the flame floating over their seat (click it to put the fire out). */
export const SignalFlame = ({ className }: { className?: string }): ReactElement => (
  <svg className={`signal-flame${className ? ` ${className}` : ""}`} viewBox="0 0 64 64" aria-hidden>
    <path d="M32 2c4 12 18 20 18 38 0 12-8 22-18 22S14 52 14 40c0-9 5-14 8-21 1 7 4 11 8 12-2-11 0-20 2-29z" />
    <path className="signal-flame-core" d="M32 30c2 6 9 10 9 18 0 6-4 10-9 10s-9-4-9-10c0-5 3-7 4-11 1 3 2 5 4 5-1-5 0-9 1-12z" />
  </svg>
);

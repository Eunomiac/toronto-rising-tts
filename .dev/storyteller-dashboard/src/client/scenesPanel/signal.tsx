import { useEffect, useRef, type ReactElement } from "react";

/**
 * A player's signal fire on the dashboard: the flame drawn on their seat and the alert banner, a chime when a
 * signal is lit, and a reminder chime while any stays lit.
 */

export const SignalFlame = ({ className }: { className?: string }): ReactElement => (
  <svg className={`signal-flame${className ? ` ${className}` : ""}`} viewBox="0 0 64 64" aria-hidden>
    <path d="M32 2c4 12 18 20 18 38 0 12-8 22-18 22S14 52 14 40c0-9 5-14 8-21 1 7 4 11 8 12-2-11 0-20 2-29z" />
    <path className="signal-flame-core" d="M32 30c2 6 9 10 9 18 0 6-4 10-9 10s-9-4-9-10c0-5 3-7 4-11 1 3 2 5 4 5-1-5 0-9 1-12z" />
  </svg>
);

/** While any signal stays lit, the chime repeats this often. */
const REMIND_MS = 60_000;

let context: AudioContext | undefined;

const audio = (): AudioContext | undefined => {
  if (typeof AudioContext === "undefined") {
    return undefined;
  }
  context ??= new AudioContext();
  return context;
};

/** Three rising bell tones. The browser only plays sound after a click on the page since it was opened. */
export const playSignalChime = (): void => {
  const ctx = audio();
  if (!ctx) {
    return;
  }
  void ctx.resume();
  const start = ctx.currentTime + 0.05;
  [880, 1174.66, 1567.98].forEach((frequency, index) => {
    const at = start + index * 0.18;
    const tone = ctx.createOscillator();
    const level = ctx.createGain();
    tone.type = "triangle";
    tone.frequency.value = frequency;
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 1.2);
    tone.connect(level).connect(ctx.destination);
    tone.start(at);
    tone.stop(at + 1.25);
  });
};

/**
 * Chimes when a seat's signal fire is lit (not for signals already lit when the dashboard first hears from TTS),
 * then every minute while any stays lit. `lit` is undefined until the seats arrive.
 */
export const useSignalAlert = (lit: readonly string[] | undefined): void => {
  const seen = useRef<ReadonlySet<string> | null>(null);
  const key = lit ? [...lit].sort().join(",") : undefined;
  useEffect(() => {
    const unlock = (): void => void audio()?.resume();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => {
    if (key === undefined) {
      return;
    }
    const now = new Set(key === "" ? [] : key.split(","));
    const previous = seen.current;
    seen.current = now;
    if (previous && [...now].some((color) => !previous.has(color))) {
      playSignalChime();
    }
  }, [key]);
  useEffect(() => {
    if (!key) {
      return undefined;
    }
    const timer = window.setInterval(playSignalChime, REMIND_MS);
    return () => window.clearInterval(timer);
  }, [key]);
};

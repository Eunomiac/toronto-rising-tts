/** Subtle procedural UI sounds — no BGM, no loops. */

export type SfxName =
  | "deal"
  | "flip"
  | "enhance"
  | "negate"
  | "discard"
  | "stop"
  | "confirm"
  | "denied"
  | "tick";

const STORAGE_KEY = "complications-sfx-muted";

let ctx: AudioContext | null = null;
let unlocked = false;

function getMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setMutedFlag(muted: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function isMuted(): boolean {
  return getMuted();
}

export function setMuted(muted: boolean) {
  setMutedFlag(muted);
  if (muted && ctx?.state === "running") {
    void ctx.suspend();
  } else if (!muted && ctx) {
    void ctx.resume();
  }
}

export function toggleMuted(): boolean {
  const next = !getMuted();
  setMuted(next);
  return next;
}

/** Call from a click/tap so browsers allow audio. */
export async function unlockAudio() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") await c.resume();
  unlocked = true;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain = 0.04,
  freqEnd?: number,
) {
  if (getMuted() || !unlocked) return;
  const c = ensureCtx();
  if (!c || c.state !== "running") return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + duration);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSfx(name: SfxName) {
  switch (name) {
    case "deal":
      tone(220, 0.08, "triangle", 0.03, 180);
      break;
    case "flip":
      tone(420, 0.12, "sine", 0.045, 280);
      break;
    case "enhance":
      tone(520, 0.1, "triangle", 0.04);
      setTimeout(() => tone(780, 0.14, "sine", 0.035), 40);
      break;
    case "negate":
      tone(180, 0.16, "sawtooth", 0.025, 90);
      break;
    case "discard":
      tone(160, 0.1, "square", 0.02, 80);
      break;
    case "stop":
      tone(300, 0.1, "sine", 0.035);
      break;
    case "confirm":
      tone(360, 0.08, "triangle", 0.04);
      setTimeout(() => tone(540, 0.12, "sine", 0.04), 70);
      break;
    case "denied":
      tone(140, 0.08, "square", 0.02);
      break;
    case "tick":
      tone(660, 0.04, "sine", 0.02);
      break;
  }
}

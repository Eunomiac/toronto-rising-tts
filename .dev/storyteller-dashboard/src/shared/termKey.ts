/**
 * Clipboard-image tooltip keys: `<kind>:<name>[:<sub>]`, case- and spacing-insensitive, so every
 * copy of a term (every PC's "Dominate") shares one image.
 */

export const MAX_TERM_KEY_LENGTH = 200;

export const normalizeTermKey = (raw: string): string =>
  raw.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*:\s*/g, ":");

export const termKey = (kind: string, ...parts: readonly string[]): string =>
  normalizeTermKey([kind, ...parts.filter((part) => part.trim() !== "")].join(":"));

export const isValidTermKey = (key: string): boolean =>
  key.length > 0 && key.length <= MAX_TERM_KEY_LENGTH && key === normalizeTermKey(key) && key.includes(":");

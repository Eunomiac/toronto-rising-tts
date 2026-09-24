/**
 * Removes trailing commas before `}` or `]` so spreadsheet-style / author JSON
 * parses with JSON.parse. Mirrors lib/util.ttslua U.sanitizeJsonTextRemoveTrailingCommas.
 *
 * Limitation: string values that literally contain `,}` or `,]` as adjacent text
 * could be altered — normal seat patches do not use such strings.
 */
export function sanitizeJsonTextRemoveTrailingCommas(input: string): string {
  let out = input;
  for (let guard = 0; guard < 64; guard++) {
    const before = out;
    out = out.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    if (out === before) {
      break;
    }
  }
  return out;
}

/** Parse JSON after stripping trailing commas. */
export function parseJsonLenient(text: string): unknown {
  return JSON.parse(sanitizeJsonTextRemoveTrailingCommas(text));
}

# Player Map Debug Notes

## Agent Routing

Read this when:
- reviewing or implementing feedback pinned on the local Player Map;
- changing the debug-note controls, storage, or development API.

Source of truth:
- note data: `agent/debug-notes.json`;
- development interface: `src/debug/DebugNotesSlot.dev.tsx`;
- development API and validation: `scripts/debug-notes-plugin.ts` and `scripts/debug-note-store.ts`;
- production exclusion: `src/debug/DebugNotesSlot.tsx`, the Vite alias, and `scripts/check-production-debug-boundary.mjs`.

Verification:
- `npm run test:debug-notes:browser` exercises map and interface pins on desktop and a Pixel 7-sized viewport;
- `npm run build` fails if known debug-note content reaches the production bundle.

Status:
- current

## Author workflow

1. Start the local map with `npm run dev` from `.dev/player-map`.
2. Open **Debug notes** in the lower-left corner.
3. Choose **Add note**, then click the map or the interface element you want to discuss.
4. Write the instruction and press Enter to save. Use Shift+Enter for another line.
5. Leave **Show notes** on to review pins, edit their text, mark them done, or delete them. Deletion requires two clicks so a stray click cannot remove a note.

Map pins store longitude and latitude, so they remain on the same place while
the map pans or zooms. Interface pins store a named surface and a position
within that surface, so they follow the header or panel when the responsive
layout changes. Each new note also records the page address, viewport size,
selected District, and current map camera as reproduction context.

## Agent one-pass workflow

1. Read every open entry in `agent/debug-notes.json` before changing the Player Map. Do not assume one pin is independent of the others.
2. Group compatible notes and implement them in one coherent pass. Use each note's `anchor` and `context` to reproduce the author's view.
3. Preserve any note that is ambiguous, blocked, or not yet implemented. Add a concise `reply` only when the author needs an answer, limitation, or choice explained.
4. Run the relevant checks and inspect the changed interface through the real local map.
5. Remove notes that are fully implemented and verified. Keep unresolved notes open; do not clear the file wholesale.

The local API at `/api/debug-notes` supports GET, POST, PATCH, and DELETE while
Vite is running. Direct edits to the tracked JSON file are appropriate for
agent replies and carefully reviewed cleanup. Preserve `nextId` so note numbers
are never silently reused.

## Production boundary

This feature is deliberately local-development-only. Vite substitutes a null
component during production builds, the API plugin applies only to the Vite
development server, and the note file sits outside `public/`. Cloudflare must
never receive the controls, API, note comments, replies, or reproduction
context. Do not weaken the automated production-bundle check when changing the
feature.

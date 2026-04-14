# Playbook: Summarizer

## Goal

Ground later passes by filling `classification`, `description`, and (when needed) `notes` for every region in `region_registry.json` for the files in scope.

## Inputs

- `region_registry.json` and the corresponding `.ttslua` sources.
- Marker titles from the Architect (must stay consistent with the file).

## Steps

1. For each `(file, regionNum)` you own in this batch, read the code inside that region (use `startLine`–`endLine` in the registry).
2. Set **`classification`** to a short type label (e.g. `Configuration`, `Initialization`, `Helper Function`, `Main Implementation`, `Import`).
3. Set **`description`** to one or two precise sentences: what this block is responsible for and when it runs (e.g. “Runs during global `onLoad` wiring only.”).
4. If the region **mixes multiple purposes**, record that in **`notes`** (e.g. “Mixed: init + math helper; consider Organizer pass to split or move helper.”).
5. Prefer updating via CLI (keeps JSON valid):

   ```bash
   node .tools/code-review/dist/cli.js upsert-region --file core/foo.ttslua --region-num 200 --classification "Initialization" --description "..." --notes "..."
   ```

   Or edit `region_registry.json` carefully, then run `npm run code-review:validate`.

## Non-goals

- Do not change Lua code or markers in this pass.
- Do not file consolidation or duplication opinions here—those belong in `findings.jsonl` via specialist passes.

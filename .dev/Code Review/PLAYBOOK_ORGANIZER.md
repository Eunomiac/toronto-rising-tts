# Playbook: Organizer

## Goal

Turn structural signals (nested “suspected misplacement” regions, Summarizer `notes`, obvious duplicate section titles) into a **reviewed plan** for refactors—without applying those refactors until approved.

## Inputs

- `region_registry.json` (with Summarizer fields filled).
- Optional `findings.jsonl` if an early pass already flagged issues.

## Steps

1. Scan registry rows for the batch (directory, feature area, or whole repo milestone).
2. List **concrete** organizational actions: merge regions, split regions, move helpers to another file, rename region titles after moves, etc.
3. For each action, cite `(file, regionNum)` and the **post-change** region map you expect (new ids/titles if applicable).
4. Output a numbered plan in markdown (PR description, ticket, or `dev/Code Review/` note). Get **human approval** before any “Fixer” edits.
5. After implementation (separate pass), update markers + registry + exclusions to match; run `npm run code-review:validate`.

## Non-goals

- Do not silently edit production `.ttslua` in this pass unless explicitly designated as implementation.
- Do not delete historical findings; add new ones if the Organizer discovers issues specialists should track.

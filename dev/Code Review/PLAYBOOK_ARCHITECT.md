# Playbook: Architect

## Goal

Partition one production `.ttslua` file (see globs in [CODE_REVIEW_PIPELINE.md](CODE_REVIEW_PIPELINE.md)) with nested `#region` markers and registry rows—**no** code-quality judgments.

## Inputs

- Target file path (repo-relative, e.g. `core/lighting.ttslua`).
- [CODE_REVIEW_PIPELINE.md](CODE_REVIEW_PIPELINE.md) marker grammar and adjacency rules.

## Steps

1. Read the entire file. Identify logical sections (config, init, helpers, main API, etc.).
2. Wrap **100%** of lines in regions: first line is a root `#region`; last line is a root `#endregion`. Use **nested** regions when a misplaced or suspicious block should stay visually inside a parent (e.g. helper inside init).
3. Use **spaced** `regionNum` values (100, 200, …) if you want room for insertions; ids must be **unique per file**.
4. For each region, add one row to `region_registry.json` with correct `parentRegionNum` (`null` for roots), `title` (must match the marker text), `startLine`, `endLine`, and empty `classification` / `description` / `notes` for now.
5. Remove this file’s entry from `excluded_files.json` when the file is fully partitioned and registered.
6. Run `npm run code-review:validate` and fix any mechanical issues before ending the session.

## Non-goals

- Do not rename functions, move code across files, or “clean up” behavior.
- Do not append to `findings.jsonl` unless you are also running a specialist pass by agreement.

## When to nest vs. new root

- **Nest** when a block is logically “inside” a parent but should be called out (misplaced helper, odd subsection).
- Use a **new root** only for top-level file sections that are sequential siblings from line 1 to EOF (roots must be directly adjacent per the pipeline spec).

# Code review pipeline (machine spec)

This document is the **normative** specification for the retro-collaborative, agent-driven code review workflow. Human prose and examples live in [Rough Code Review Plan.md](Rough%20Code%20Review%20Plan.md); tooling and agents must follow **this** file for formats and invariants.

## Scope: production `.ttslua`

The following globs define **production** Lua sources for this pipeline (POSIX-style paths, forward slashes):

- `core/**/*.ttslua`
- `lib/**/*.ttslua`
- `ui/**/*.ttslua`

**Out of scope** unless explicitly added later:

- `.dev/**/*.ttslua` and any other paths not listed above.

## Transitional gating: `excluded_files.json`

Validation uses a **file-by-file hard gate**:

- Each production file is either **partitioned** (markers + registry + mechanical rules pass) or **listed** in [`excluded_files.json`](excluded_files.json) with a human-readable `reason`.
- There is no third state for CI: unlisted files that lack valid partitioning **fail** validation.

Partitioned files **must not** appear in `excluded_files.json` (validator errors on overlap).

**Bootstrap:** new production files should be added to `excluded_files.json` until the Architect pass covers them, then removed when that file validates.

## Region markers (nested)

### Grammar (exact shape)

All markers are **full-line** Lua comments. Leading whitespace on the line is allowed.

**Open region**

```text
-- #region ::== [<regionNum>] <title> ==::
```

**Close region**

```text
-- #endregion ::== [<regionNum>] ==::
```

### Rules

- `<regionNum>` is a positive integer, unique **per file** among all regions in that file.
- `<title>` is a non-empty string. It should be descriptive; when placement is uncertain, prefer an explicit title such as `Helper: getEase (suspected misplacement)` so later agents do not rely only on nesting depth for signal.
- **Nesting:** every `#region` is closed by a matching `#endregion` with the **same** `<regionNum>`, in proper stack (LIFO) order.
- **Root coverage:** the file’s line range must be exactly covered by one or more **root** regions (parent `null`) that appear **back-to-back** from first line to last line: the first line of the file is a root `#region` open; the last line is a root `#endregion` close; there are no lines outside the outermost root spans.
- **Trailing newline:** a single empty line at EOF caused by a final newline after the last `#endregion` is **ignored** by the validator (only all-empty trailing lines are stripped before checks).
- **Leaf coverage:** every line of the file is assigned to exactly one **leaf** region:
  - A **leaf** is a region with **no child** regions.
  - A **non-leaf** (parent) may only contain child regions and **glue** lines (see below) between them; it must not contain other executable content outside its children.
- **Between markers inside a parent that has children**, tooling **v1** requires **strict adjacency** (no intervening lines): `parent.startLine + 1 === firstChild.startLine`, `child[i].endLine + 1 === child[i+1].startLine`, and `lastChild.endLine + 1 === parent.endLine`. This avoids ambiguous ownership for “glue” lines; later versions may relax to allow comment-only glue with an explicit ownership rule.

### Numbering

Region IDs may use spaced numbering (100, 200, 300, …) to leave room for insertions, as in the rough plan. The validator does **not** require gaps; it only requires uniqueness per file and consistent markers.

## Artifacts

Paths are relative to the repository root unless stated otherwise.

| Artifact | Path | Role |
|----------|------|------|
| Exclusion list | `.dev/Code Review/excluded_files.json` | Lists files not yet subject to full partitioning rules. |
| Region registry | `.dev/Code Review/region_registry.json` | Authoritative metadata for each `(file, regionNum)` row used by agents. |
| Findings log | `.dev/Code Review/findings.jsonl` | Append-only findings keyed by stable `id`. |

### `excluded_files.json` schema

- `version`: integer, currently `1`.
- `entries`: array of `{ "path": string, "reason": string }`.
- `path` uses forward slashes and matches the production glob layout (e.g. `core/lighting.ttslua`).

### `region_registry.json` schema

- `version`: integer, currently `1`.
- `regions`: array of objects:
  - `file` (string): path like `core/lighting.ttslua`.
  - `regionNum` (number): matches marker id.
  - `parentRegionNum` (number or `null`): `null` for roots; otherwise must match the enclosing region’s `regionNum`.
  - `title` (string): should match the marker title for that id (validator checks).
  - `startLine`, `endLine` (numbers, 1-based inclusive): span of the region from its opening marker through its closing marker. Tooling may refresh these when markers move.
  - `classification` (string): filled by Summarizer; may be empty during Architect-only phase.
  - `description` (string): filled by Summarizer.
  - `notes` (string): optional cross-pass notes (e.g. mixed-purpose warnings).

Registry rows must exist for **every** region parsed from markers for non-excluded files, and **only** those regions (no extras per file).

### `findings.jsonl` schema

One JSON object per line (JSON Lines), UTF-8:

- `id` (string): stable unique id (UUID recommended).
- `file` (string).
- `regionNum` (number).
- `agent` (string): logical pass name (e.g. `Consolidation`, `Duplication`).
- `category` (string): short machine token (e.g. `consolidation`, `duplication`).
- `message` (string): human-readable finding.
- `createdAt` (string): ISO-8601 timestamp in UTC.

Findings are **not** substituted for registry `notes`/`tags`; they are the primary append-only audit trail for specialist passes.

## Tooling (CLI)

Implemented under `.tools/code-review/` (see root `package.json` scripts). Commands include:

- **`validate`**: checks markers, nesting, leaf and glue rules, exclusion overlap, and registry consistency for all non-excluded production files.
- **`add-finding`**: appends one validated JSON line to `findings.jsonl`.
- **`upsert-region`**: updates registry fields for one `(file, regionNum)` then validates.

Agents should prefer these commands over hand-editing JSON/JSONL to avoid formatting and quoting mistakes.

## Optional checks (non-blocking by default)

- **Lua parse:** optional `luaparse` pass over each production file may be added later to catch syntax errors unrelated to regions. Not required for initial milestone unless enabled by flag.

## Related playbooks

Operational prompts and pass ordering: [PASS_ORDER.md](PASS_ORDER.md), `PLAYBOOK_*.md` in this directory.

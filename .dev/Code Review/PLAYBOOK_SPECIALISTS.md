# Playbook: Specialists

## Goal

Run **narrow** passes that each look for **one** class of issue. Specialists **append findings only** (no Lua edits) using the CLI, unless you are explicitly running a Fixer phase.

## Shared rules

- Scope: one batch of `(file, regionNum)` rows or a directory at a time.
- Always cite the **smallest** region that contains the issue.
- After the batch, run `npm run code-review:validate`.

## Append a finding

```bash
node tools/code-review/dist/cli.js add-finding --file core/foo.ttslua --region-num 300 --agent Duplication --category duplication --message "Suspects overlap with lib/util.ttslua helpers; verify X and Y."
```

Use stable **`category`** tokens: `organization`, `duplication`, `redundancy`, `consolidation`, `code-smell`, `obsolete`, `scaling`, `breaking-errors` (match your taxonomy; keep them lowercase kebab-case).

## Suggested agents (lenses)

| Agent / lens | Focus |
|----------------|--------|
| Organization | Better file or section placement; ordering (init not near top, etc.). |
| Duplication | Exact or near-duplicate logic vs. other regions/files. |
| Redundancy | Similar intent without identical code (overlapping abstractions). |
| Consolidation | Central pipeline or shared API that should own this behavior. |
| Code smell | Mechanically “fishy” control flow, globals, coupling—verify root cause. |
| Obsolete | Dead code, outdated comments, unnecessary compatibility shims. |
| Scaling | Data modeled for1 that should generalize to N. |
| Breaking errors | Missing guards, poor error messages for host-facing failures. |

## Non-goals

- Do not rewrite code in the same session unless the task is explicitly **Fixer** work.
- Do not hand-edit `findings.jsonl` if the CLI is available (avoids JSONL corruption).

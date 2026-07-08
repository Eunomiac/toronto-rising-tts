# Code review pass order

## Agent Routing

Read this when:
- deciding which code-review pass to run next
- coordinating Architect, Summarizer, Organizer, Specialist, or Fixer work
- updating pass playbooks in this folder

Source of truth:
- `.dev/Code Review/CODE_REVIEW_PIPELINE.md`
- `.dev/Code Review/PLAYBOOK_*.md`
- `.tools/code-review/`

Verification:
- `npm run code-review:validate` after each mutating pass
- `npm run code-review:build` when CLI artifacts change

Status: current pass-order index; pipeline invariants live in `CODE_REVIEW_PIPELINE.md`.

Run passes in this order. After **each** pass that mutates artifacts or source, run:

```bash
npm run code-review:validate
```

Normative rules and file formats: [CODE_REVIEW_PIPELINE.md](CODE_REVIEW_PIPELINE.md).

## Flow

1. **Architect** — Insert `#region` / `#endregion` markers (nested where helpful), add matching rows to `region_registry.json`, remove the file from `excluded_files.json` when that file is complete. Do not judge code quality; only structure and coverage.
2. **Validate** — `npm run code-review:validate`
3. **Summarizer** — Fill `classification`, `description`, and optional `notes` per region (prefer `npm run code-review:build` then `node .tools/code-review/dist/cli.js upsert-region ...`, or edit registry and validate).
4. **Validate**
5. **Organizer** — Produce a **human-reviewed** markdown plan for merges/moves (no `.ttslua` edits in this pass unless you are explicitly running a fixer phase).
6. **Specialists** — One focused pass per category; append findings only via:

   ```bash
   node .tools/code-review/dist/cli.js add-finding --file <repoRel> --region-num <n> --agent <Name> --category <token> --message "<text>"
   ```

7. **Validate**
8. **Fixer (optional)** — Apply approved refactors; keep markers, registry, and `findings.jsonl` consistent; validate after each logical chunk.

## Dependency notes

- **Summarizer** before **Organizer** and most **Specialists** so every region has stable summaries.
- Cross-file passes (e.g. duplication) should run after a majority of files are out of `excluded_files.json` or scoped to a batch you name in your session plan.

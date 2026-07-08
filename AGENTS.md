# Toronto Rising Agent Guide

This repository is a private Tabletop Simulator modding project for the Toronto Rising Vampire: the Masquerade chronicle. It has been built mostly through AI-assisted workflows, so documentation must be treated as useful but untrusted until verified against current code.

## Start Here

For any agent working in this repo:

1. Read this file.
2. Read [`.dev/README.md`](.dev/README.md) for `.dev` trust levels and cleanup rules.
3. Use [`.dev/DOCS_INDEX.md`](.dev/DOCS_INDEX.md) to route by task.
4. Follow repo-local Cursor rules in [`.cursor/rules/`](.cursor/rules/) when working in Cursor.
5. Use repo-local skills in [`.cursor/skills/`](.cursor/skills/) when explicitly invoked or when their workflow applies.

## Current Workflows

`/tr-start` is the current start command when the user wants to work on "the next task." It reads Focus, Linear context, and architecture policies before implementation.

`/tr-inbox` is the current capture-processing command. It turns markdown notes in `.dev/INBOX.md` into Linear issues, tasklist updates, and Focus stack changes.

These workflows are not permanent architecture. Preserve their current behavior until a cleaner agent-first workflow is deliberately introduced.

For Codex/API sessions where slash commands are not available, mirror the same behavior manually: inspect `.dev/RUNNING TASKLIST.md`, `.dev/INBOX.md` when relevant, Linear context if available, and the task-specific routing in `.dev/DOCS_INDEX.md`.

## Trust Hierarchy

Use this order when sources disagree:

1. Current user request and active system/developer instructions.
2. Current code and generated source inputs.
3. This `AGENTS.md`.
4. `.cursor/rules/*` and `.cursor/skills/*` for repo-local agent workflows.
5. `.dev/DOCS_INDEX.md` for task routing.
6. Current `.dev` canonical docs, after checking them against code.
7. Generated reports or task notes only when current code and active task state confirm they still apply.
8. Global editor/extension instructions.

Notion is an index/planning layer, not the source of truth for code-adjacent docs.

## Documentation Policy

Docs are agent-first by default. Optimize for routing, source-of-truth clarity, verification steps, and "read this before touching X." Do not create broad user manuals unless the user asks or a complex private reference genuinely needs human-facing prose.

When adding or updating canonical docs, prefer an agent routing block:

```markdown
## Agent Routing

Read this when:
- touching `<system-or-path>`

Source of truth:
- `<code-or-data-path>`

Verification:
- `<command-or-playbook>`

Status:
- current | needs verification | generated | delete candidate
```

## `.dev` Cleanup Safety

Move or delete `.dev` files only after path references have been checked. Current paths are used by:

- `package.json`
- `.tools/`
- `.cursor/rules/`
- `.cursor/skills/`
- code comments and generated-file headers
- documentation links
- TTS save/custom UI tooling

Generated files, save snapshots, local tool apps, chronicle data, active task notes, and canonical engineering docs are currently mixed together. Classify first; delete stale files instead of keeping redirect notes or legacy archives.

## Coding Guardrails

- Treat `gameState` as the single source of truth for game intent.
- Keep mutation and reconciliation separate.
- Use explicit sync entry points after state mutation.
- Do not hide live-world side effects in state setters.
- For Lua, define `local function` helpers above every caller in the same chunk or forward-declare them.
- Object-hosted scripts must not require broad `core.*` or `lib.constants` graphs; route mutations through `Global.call`.
- Fail loudly. Do not add silent fallbacks or unannotated `pcall` in production paths.

See `.cursor/rules/` and `.dev/DOCS_INDEX.md` for task-specific policy routing.

## Git And Scope

Cursor repo rules favor frequent commits after logical units. Codex/API sessions must still preserve user changes, respect explicit "do not commit" or audit-only instructions, and stage only intended files. Never silently include unrelated worktree changes.

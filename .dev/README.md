# `.dev` Agent Orientation

`.dev/` is currently a mixed development workspace, not a clean documentation tree. It contains canonical docs, active scripts, generated artifacts, save snapshots, local tools, chronicle data, agent prompts, historical plans, and migration debris.

Treat every document here as untrusted until checked against current code.

## Current Rule

Do not move or delete `.dev` files yet.

Before any relocation, check references in:

- `package.json`
- `.tools/`
- `.cursor/rules/`
- `.cursor/skills/`
- root `README.md`
- code comments and generated-file headers
- docs that link to the path

Many paths are active and path-sensitive.

## Agent-First Docs

Documentation in this repository should be written primarily for agents:

- explain when to read a doc
- identify source-of-truth code/data files
- identify generated/dependent outputs
- include verification commands or manual playbooks
- clearly mark stale, generated, historical, or speculative material

Human/player documentation should stay minimal and isolated when needed.

## Working Entry Points

- Root agent entrypoint: [`../AGENTS.md`](../AGENTS.md)
- Task routing index: [`DOCS_INDEX.md`](DOCS_INDEX.md)
- Current Focus/tasklist: [`RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md)
- Capture inbox: [`INBOX.md`](INBOX.md)
- Current Cursor start workflow: [`../.cursor/skills/tr-start/SKILL.md`](../.cursor/skills/tr-start/SKILL.md)
- Current Cursor inbox workflow: [`../.cursor/skills/tr-inbox/SKILL.md`](../.cursor/skills/tr-inbox/SKILL.md)

`/tr-start` and `/tr-inbox` are current operational workflows, not permanent architecture. Preserve them during Phase 1 so existing work remains reachable, then evaluate whether cleaner agent-first workflows should replace them.

## Current Categories

| Category | Examples | Edit Policy |
|---|---|---|
| Canonical or likely canonical docs | `TTS_BUNDLING_SETUP.md`, `HUD_FUNCTIONS.md`, `TESTING.md`, system folders | Edit carefully; verify against code |
| Agent instructions | `Agent Reviews/`, `Code Review/`, `.cursor/rules`, `.cursor/skills` | Keep aligned with routing docs |
| Active scripts/tools | `scripts/`, `CSV to Markdown Parser/`, dashboards | Path-sensitive; update package/tool refs with any move |
| Generated artifacts | `build-logs/`, `custom-ui-assets/*.json`, `Problems/` | Do not hand-edit unless policy/output is the task |
| Save snapshots | `TS_Save_230*.json` | Do not hand-edit casually; tooling depends on current paths |
| Chronicle data | `Chronicle Data/` | Treat as campaign source material; human review preferred |
| Historical plans | `plans/`, stale design docs | Preserve until archive phase |
| One-off patches | `_*.py`, `_gen_*.js`, migration debris | Archive later after reference checks |

## Cleanup Phase Plan

1. Phase 0: audit only. Complete; see [`../.codex/audits/dev-folder/phase-0-dev-documentation-artifact-audit.md`](../.codex/audits/dev-folder/phase-0-dev-documentation-artifact-audit.md).
2. Phase 0.5: agent instruction stack audit. Complete; see [`../.codex/audits/agent-instructions/phase-0.5-agent-instruction-stack-audit.md`](../.codex/audits/agent-instructions/phase-0.5-agent-instruction-stack-audit.md).
3. Phase 1: add orientation/index docs only. This file and [`DOCS_INDEX.md`](DOCS_INDEX.md) are part of that phase.
4. Later phases: verify canonical docs, relocate generated artifacts, archive historical material, then delete only with explicit confirmation.

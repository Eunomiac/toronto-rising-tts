# `.dev` Agent Orientation

`.dev/` is currently a mixed development workspace, not a clean documentation tree. It contains canonical docs, active scripts, generated artifacts, save snapshots, local tools, chronicle data, agent prompts, active task notes, and migration debris.

Treat every document here as untrusted until checked against current code.

## Current Rule

Move or delete `.dev` files only after checking path references.

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
- clearly mark generated material and delete or consolidate stale/speculative material after reference checks

Human/player documentation should stay minimal and isolated when needed.

## Working Entry Points

- Root agent entrypoint: [`../AGENTS.md`](../AGENTS.md)
- Task routing index: [`DOCS_INDEX.md`](DOCS_INDEX.md)
- Current Focus/tasklist: [`RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md)
- Capture inbox: [`INBOX.md`](INBOX.md)
- Current Cursor start workflow: [`../.cursor/skills/tr-start/SKILL.md`](../.cursor/skills/tr-start/SKILL.md)
- Current Cursor inbox workflow: [`../.cursor/skills/tr-inbox/SKILL.md`](../.cursor/skills/tr-inbox/SKILL.md)

`/tr-start` and `/tr-inbox` are current operational workflows, not permanent architecture. Preserve them until a cleaner agent-first workflow is deliberately introduced.

## Current Categories

| Category | Examples | Edit Policy |
|---|---|---|
| Canonical or likely canonical docs | `TTS_BUNDLING_SETUP.md`, `HUD_FUNCTIONS.md`, `TESTING.md`, system folders | Edit carefully; verify against code |
| Agent instructions | `Agent Reviews/`, `Code Review/`, `.cursor/rules`, `.cursor/skills` | Keep aligned with routing docs |
| Active scripts/tools | `scripts/`, `CSV to Markdown Parser/`, dashboards | Path-sensitive; update package/tool refs with any move |
| Generated artifacts | `build-logs/`, generated `custom-ui-assets/*.json`/`*.lua`, `Problems/` | Do not hand-edit unless policy/output is the task; custom UI workflow source is `custom-ui-assets/README.md` plus `prune-custom-ui-assets.txt` |
| Save snapshots | `TS_Save_230*.json` | Local working snapshots; ignored by git and regenerated/exported outside repo history |
| Chronicle data | `Chronicle Data/` | Treat as campaign source material; human review preferred |
| Task plans | `plans/`, implementation notes | Keep only when still useful for active or recently completed work; delete or consolidate stale plans after reference checks |
| One-off patches | `_*.py`, `_gen_*.js`, migration debris | Delete after confirming no package/tool/code refs need them |

## Cleanup Phase Plan

1. Phase 0: audit only. Complete; see [`../.codex/audits/dev-folder/phase-0-dev-documentation-artifact-audit.md`](../.codex/audits/dev-folder/phase-0-dev-documentation-artifact-audit.md).
2. Phase 0.5: agent instruction stack audit. Complete; see [`../.codex/audits/agent-instructions/phase-0.5-agent-instruction-stack-audit.md`](../.codex/audits/agent-instructions/phase-0.5-agent-instruction-stack-audit.md).
3. Agent orientation docs are established. Keep this file, [`DOCS_INDEX.md`](DOCS_INDEX.md), `AGENTS.md`, and `.cursor` rules/skills aligned.
4. Later phases: verify canonical docs, relocate generated artifacts, and delete or consolidate stale task material after reference checks.

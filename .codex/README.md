# Codex Workspace

This folder is reserved for Codex-owned working notes, audits, and planning artifacts. It is not part of the runtime mod, build pipeline, or player-facing documentation.

## Structure

```text
.codex/
├─ audits/
│  ├─ agent-instructions/
│  │  └─ phase-0.5-agent-instruction-stack-audit.md
│  └─ dev-folder/
│     └─ phase-0-dev-documentation-artifact-audit.md
├─ notes/
│  ├─ README.md
│  └─ external-config-access.md
└─ templates/
   └─ agent-routing-block.md
```

## Use

- `audits/` holds durable audit reports and phase records.
- `notes/` is for short-lived analysis that may inform a later report.
- `templates/` holds reusable documentation patterns for later cleanup phases.

Keep canonical project documentation in the repository tree it describes, usually `.dev/`, `docs/`, or root agent instructions. Use `.codex/` for Codex process artifacts and audit history.

Do not copy secrets, tokens, or private cache contents into `.codex/` reports. It is acceptable to summarize that a private/global config source exists and how it affects agent routing.

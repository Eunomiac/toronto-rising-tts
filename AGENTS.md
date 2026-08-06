# Toronto Rising Agent Guide

This repository is a private Tabletop Simulator modding project for the Toronto Rising Vampire: the Masquerade chronicle. It has been built mostly through AI-assisted workflows, so documentation must be treated as useful but untrusted until verified against current code.

## Start Here

For any agent working in this repo:

1. Read this file.
2. Read [`.dev/README.md`](.dev/README.md) for `.dev` trust levels and cleanup rules.
3. Use [`.dev/DOCS_INDEX.md`](.dev/DOCS_INDEX.md) to route by task.
4. Follow repo-local Cursor rules in [`.cursor/rules/`](.cursor/rules/) when working in Cursor.
5. Use repo-local skills in [`.cursor/skills/`](.cursor/skills/) when explicitly invoked or when their workflow applies.

Multi-root Cursor workspaces may include **Toronto Rising (Project)** and **TTS (Documents)** alongside this repo. Treat those folders as walled browse roots: do not Glob, Grep, Read, Write, or Delete there unless the author explicitly points you at a path. Node tooling still uses absolute paths from `tts-assets.config.json`. Full policy: [`.cursor/rules/toronto-rising-walled-workspace-roots.mdc`](.cursor/rules/toronto-rising-walled-workspace-roots.mdc) (including the `Saves/` exception for save inspection).

## Author voice (mandatory)

**Write to the author in plain English.** The author should read your chat, Linear notes, and verification instructions — not decipher them. Prefer complete sentences and a short plain “so what” over engineer telegram style, even when that means being more verbose. Explain nicknames (`canary remount`, `Sync.full`, and so on) in everyday language the first time you use them in a reply.

This is a first-class project rule: [`.cursor/rules/toronto-rising-author-voice.mdc`](.cursor/rules/toronto-rising-author-voice.mdc). It applies to **all author-facing writing** (chat, status summaries, Linear comments, Pending Author Verification, author playbooks), not only verify checklists. It overrides generic “be terse” defaults when terseness would feel like jargon.

Agent-first `.dev` routing docs may stay compact for other agents; anything the author is expected to act on must stay readable.

## Current Workflows

`/tr-start` is the current start command when the user wants to work on "the next task." It reads Focus, Linear context, and architecture policies before implementation.

`/tr-inbox` is the current capture-processing command. It turns markdown notes in `.dev/INBOX.md` into Linear issues, tasklist updates, and Focus stack changes.

These workflows are not permanent architecture. Preserve their current behavior until a cleaner agent-first workflow is deliberately introduced.

For Codex/API sessions where slash commands are not available, mirror the same behavior manually: inspect `.dev/RUNNING TASKLIST.md`, read `.dev/PENDING AUTHOR VERIFICATION.md` when useful, follow `.dev/PENDING AUTHOR VERIFICATION.agent.md` for verify wording, edit the PAVE checklist **only** when mirroring `/tr-inbox` / “process the inbox”, inspect `.dev/INBOX.md` when relevant, Linear context if available, and the task-specific routing in `.dev/DOCS_INDEX.md`.

**Author verification:** Linear **Done** does not mean Save & Play confirmed. Put plain-English how-to-verify in the Linear Done comment when shipping. Agents **edit** the checklist [`.dev/PENDING AUTHOR VERIFICATION.md`](.dev/PENDING%20AUTHOR%20VERIFICATION.md) **only during `/tr-inbox`** (or “process the inbox”); policy: [`.dev/PENDING AUTHOR VERIFICATION.agent.md`](.dev/PENDING%20AUTHOR%20VERIFICATION.agent.md). On inbox, process author marks **✅** / **❌** / **⚠️**, mark unshipped follow-ups **⌚** (not ready to verify), and add missing Outstanding entries from Done comments / tasklist notes.

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

**Exception — author-facing surfaces:** Chat, Linear comments meant for the author, [PENDING AUTHOR VERIFICATION](.dev/PENDING%20AUTHOR%20VERIFICATION.md) (checklist), and step-by-step / author playbooks must use **plain English** per [`.cursor/rules/toronto-rising-author-voice.mdc`](.cursor/rules/toronto-rising-author-voice.mdc). Prefer clarity over brevity when those conflict.

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
- Before adding or changing Lua/XML that touches Tabletop Simulator APIs, check `.dev/Sychronizing Game Functionality/TTS-API-Heavy-Workload-Catalog.md`, `.dev/Sychronizing Game Functionality/TTS-API-Heavy-Workload-Usage-Inventory.md`, `.dev/Sychronizing Game Functionality/Performance Audit.md`, and `.dev/Sychronizing Game Functionality/Event Listener Policy.md`.
- Do not introduce hot-path broad scans, casts, spawn/reload/custom-object work, full XML rebuilds, component traversal/writes, AssetBundle/audio changes, timers, or broad UI refreshes without an O(1) or bounded guard first: GUID/object identity, seat/color/tag bound, dirty fingerprint, narrowed sync delta, cold/debug-only justification, or chunked/deferred work.
- Prefer known-object bounds/tag checks, cached GUID/tag indexes, fingerprints, and explicit sync deltas over `getObjects`, `getAllObjects`, `getObjectsWithTag`, `Physics.cast`, full `UI.setXml`, or repeated component setters in event handlers, timers, reconcilers, and `onValueChanged` paths.
- Never duplicate broad refresh work immediately after `Sync.full`, `Sync.player`, or another reconciler unless a concrete missing-refresh case is documented.
- Keep mutation and reconciliation separate.
- Use explicit sync entry points after state mutation.
- Do not hide live-world side effects in state setters.
- For Lua, define `local function` helpers above every caller in the same chunk or forward-declare them.
- Object-hosted scripts must not require broad `core.*` or `lib.constants` graphs; route mutations through `Global.call`.
- Timing: use the **timing contract** `U.stagger` / `U.chain` / `U.await` (`docs/solutions/lua-wait-api-policy.md`); no raw `Wait.time` / `Wait.condition` / `Wait.stop` outside `lib/util.ttslua`. In `U.chain`, **`return <seconds>`** from a step to delay before the next (prefer that over a no-op `U.await` step).
- Console `print` order is unreliable in TTS when several prints share one function. In `U.chain` / `U.stagger`, isolate each `print` / `printHeader` in its own step (see [Dice-E2E.md](.dev/E2E%20Playbooks/Dice-E2E.md)); use `log` for table dumps. Canonical rule: [`.dev/TESTING.md`](.dev/TESTING.md#console-print-ordering-tts).
- Fail loudly. Do not add silent fallbacks or unannotated `pcall` in production paths.

See `.cursor/rules/` and `.dev/DOCS_INDEX.md` for task-specific policy routing.

## Git And Scope

Cursor repo rules favor frequent commits after logical units. Codex/API sessions must still preserve user changes, respect explicit "do not commit" or audit-only instructions, and stage only intended files. Never silently include unrelated worktree changes.

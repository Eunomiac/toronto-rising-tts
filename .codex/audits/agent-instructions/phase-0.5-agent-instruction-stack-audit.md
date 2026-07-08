# Phase 0.5: Agent Instruction Stack Audit

Status: audit complete
Date: 2026-07-07
Scope: repo-local and symlinked global agent/editor instruction surfaces
Audience: future Codex/agent runs and Phase 1 documentation planning
Change policy: this report records findings only; it does not change agent behavior

## Purpose

Phase 0 identified that `.dev/` cleanup cannot be planned in isolation. This Phase 0.5 audit maps the instruction surfaces that agents may receive before, during, or alongside work in this repository.

The goal is to make Phase 1 orientation docs align the actual agent instruction stack:

```text
global Codex config / skills / plugins
global Cursor user settings
repo .cursor/rules
repo .cursor/skills
root AGENTS.md
.dev/README.md
.dev/DOCS_INDEX.md
task-specific canonical docs
```

## Evidence

Read or inventoried:

- `.external-agent-config/codex/config.toml`
- `.external-agent-config/codex/skills/.system/*/SKILL.md`
- `.external-agent-config/codex/plugins/cache/openai-curated-remote/**/SKILL.md`
- `.external-agent-config/cursor-user/settings.json`
- `.external-agent-config/cursor-user/keybindings.json`
- `.external-agent-config/cursor-user/globalStorage/storage.json`
- selected non-secret Cursor globalStorage text files
- repo `.cursor/rules/*.mdc`
- repo `.cursor/skills/*/SKILL.md`
- `.codex/notes/external-config-access.md`

Intentionally not mined:

- Codex `auth.json`
- sqlite databases
- Cursor `state.vscdb`
- session logs
- Cursor checkpoint diffs
- sandbox secret/cache directories

Those stores are mostly auth/session/history state rather than stable instruction surfaces.

## Executive Summary

The active instruction stack has four meaningful layers:

1. Global Codex config defines model preferences, MCP servers, elevated Windows sandbox mode, and trusted project status for this repo.
2. Global Codex skills/plugins define general-purpose behavior for OpenAI docs, GitHub, Gmail, Google Drive, Notion, image generation, skill/plugin creation, and installation.
3. Repo-local `.cursor/rules` and `.cursor/skills` are the strongest Toronto Rising-specific agent routing layer today. `/tr-start` and `/tr-inbox` are current operational workflows: `/tr-inbox` promotes markdown captures into Linear/tasklist state, and `/tr-start` begins implementation from the current Focus stack. They should be preserved during Phase 1, then reassessed as candidates for simplification, replacement, or retirement.

The most important Phase 1 implication: create root `AGENTS.md`, `.dev/README.md`, and `.dev/DOCS_INDEX.md` as an agent-first routing chain, but do not pretend they are the only instruction surfaces. They must explicitly acknowledge `.cursor/rules` and `.cursor/skills` as active consumers of the same routing model.

## Global Codex Config

Source: `.external-agent-config/codex/config.toml`

Observed stable settings:

| Setting Area | Finding | Cleanup Impact |
|---|---|---|
| Model/personality | Uses GPT-5.5, high reasoning effort, pragmatic personality | No repo action needed |
| MCP servers | Playwright, Bright Data, Supabase, basic-memory, Vercel, Linear, Notion, context7, sequential-thinking | Phase 1 docs can mention Linear/Notion availability, but should not rely on every tool being present in all environments |
| Secrets | MCP config contains API tokens/remote URLs | Do not quote secrets in docs or reports |
| Windows sandbox | Global Codex config says Windows sandbox is elevated | Local sandbox policy for this session still controls tool execution; do not encode elevated assumptions in repo docs |
| Project trust | `d:\projects\.coding\toronto-rising-tts` is trusted | No repo action needed |

Risks:

- Global MCP availability may make local workflows look more automated than they are for other agents.
- Docs should describe required repository behavior, not assume all global MCP connectors are installed.
- Secret-bearing global config should stay ignored and out of Cursor indexing.

## Global Codex Skills And Plugins

Sources:

- `.external-agent-config/codex/skills/.system/`
- `.external-agent-config/codex/plugins/cache/openai-curated-remote/`

System skills present:

| Skill | Role | Relevance |
|---|---|---|
| `imagegen` | Generate/edit bitmap assets | Relevant only for visual asset work |
| `openai-docs` | OpenAI/Codex docs and model/API guidance | Relevant for Codex self-knowledge and OpenAI API work |
| `plugin-creator` | Create Codex plugins | Not directly relevant to `.dev` cleanup |
| `skill-creator` | Create Codex skills | Potentially relevant if Toronto Rising agent behavior becomes a repo skill |
| `skill-installer` | Install Codex skills | Not directly relevant to `.dev` cleanup |

Plugin skills present:

| Plugin Area | Skills | Relevance |
|---|---|---|
| GitHub | `github`, `gh-address-comments`, `gh-fix-ci`, `yeet` | Useful for PR/CI workflows; note commit/PR scope guardrails |
| Gmail | `gmail`, `gmail-inbox-triage` | Not relevant to repo docs |
| Google Drive | Drive, Docs, Sheets, Slides, comments | Relevant if Notion/Sheets/Docs workflows interact with external planning docs |
| Notion | knowledge capture, meeting intelligence, research documentation, spec-to-implementation | Relevant to Notion dashboard recommendation |

Instruction conflict to note:

- GitHub `yeet` skill says to confirm intended scope and avoid staging unrelated changes.
- Repo `.cursor/rules/toronto-rising-git.mdc` says to commit aggressively without asking.
- Current Codex runtime/developer policy still requires respecting user scope and not silently staging unrelated changes.

Recommended Phase 1 wording: root `AGENTS.md` should state that repo-local workflow favors frequent commits in Cursor sessions, but agents must still preserve user changes, respect explicit "do not commit" instructions, and stage only intended files.

## Cursor User Settings

Source: `.external-agent-config/cursor-user/settings.json`

Most settings are editor UI, formatting, theme, terminal, and extension preferences. Notable agent-adjacent settings:

| Setting | Finding | Cleanup Impact |
|---|---|---|
| Cursor user settings | Editor preferences and extension state | Do not use global/editor settings as repo documentation authority |
| `cursor.composer.queueMessageDefaultBehavior` | Queue behavior set to `queue` | No docs impact |
| `cursor.composer.usageSummaryDisplay` | Usage summary always shown | No docs impact |
| `cursor.general.gitGraphIndexing` | Enabled | `.external-agent-config/` should stay ignored to prevent indexing external config |
| `TTSLua.includeOtherFilesPaths` | Includes this repo path | Supports TTS Lua tooling; no `.dev` cleanup change |
| `git.branchProtectionPrompt` | `alwaysCommit` | May reinforce commit prompts/behavior in Cursor; should not override repo-safe staging rules |

Important finding:

- Global/editor settings should not be treated as repo documentation authority.
- Phase 1 `AGENTS.md` should be explicit enough to override that broad guideline for this repo until the setting is removed from Cursor user settings.

## Cursor GlobalStorage

Source: `.external-agent-config/cursor-user/globalStorage/`

Findings:

- `storage.json` mainly maps historical workspaces to profiles and contains telemetry/workspace state.
- `anysphere.cursor-commits` contains checkpoint metadata and diffs for past Cursor agent commits.
- `anysphere.cursor-mcp` contains OAuth/MCP state.
- Extension logs and history are noisy and not stable instructions.

Recommendation:

- Do not treat Cursor globalStorage as a canonical instruction source.
- Do not index or commit `.external-agent-config/`.
- Keep `.external-agent-config/` in `.cursorignore` and `.gitignore`.

## Repo-Local Cursor Rules

Source: `.cursor/rules/*.mdc`

| Rule | Role | Status |
|---|---|---|
| `toronto-rising-development.mdc` | Always-applied development style and routing | Routes through current repo docs and active rules |
| `toronto-rising-git.mdc` | Aggressive commit policy | Important, but should be reconciled with Codex/GitHub skill staging safety |
| `toronto-rising-linear.mdc` | Linear/tasklist policy | Routes inbox work through `.cursor/skills/tr-inbox/SKILL.md` |
| `toronto-rising-lua-local-function-order.mdc` | Lua nil-call prevention | Strong canonical rule; keep routed prominently |
| `toronto-rising-multiplayer-authority.mdc` | Multiplayer authority model | Strong canonical rule; path-sensitive to `.dev/Multiplayer Functionality/` |
| `toronto-rising-object-script-bundling.mdc` | Object script bundle-size guardrail | Strong canonical rule; path-sensitive to `.dev/TTS_BUNDLING_SETUP.md` |
| `toronto-rising-synchronization.mdc` | Sync/reconciler contract | Strong canonical rule; path-sensitive to `.dev/Sychronizing Game Functionality/` typo path |

Phase 1 implication:

- Root `AGENTS.md` should not duplicate every `.cursor/rules` detail.
- It should identify `.cursor/rules` as active local rules and route agents to the relevant rule/doc pair by task.

## Repo-Local Cursor Skills

Source: `.cursor/skills/*/SKILL.md`

Key skills:

| Skill | Role | Status |
|---|---|---|
| `tr-start` | Current start command for "the next task"; bootstraps from Focus, Linear, and architecture policies | Current closest equivalent to `.dev/DOCS_INDEX.md`; many hard-coded `.dev` paths; reassess after routing cleanup |
| `tr-inbox` | Current capture-processing command; turns markdown inbox notes into Linear issues/tasklist updates and refreshes Focus | Depends on `.dev/INBOX.md`, `.dev/RUNNING TASKLIST.md`, and Linear workflow docs; reassess after planning cleanup |
| `step-by-step-guidance` | Verification/playbook generation method | Referenced by `.dev/TESTING.md` and playbooks |
| `toronto-rising-conditions` | Conditions system agent guidance | Depends on `.dev/PC Data & Tracking/Conditions System Guide.md` |
| `dbcheck`, `dbfullcheck` | Debug/checking workflows | Reference `.dev/AVAILABLE_FUNCTIONS.md` and `.dev/SOLVING ISSUES & DEBUGGING.md` |
| `eagercommit` | Commit workflow | May overlap/conflict with broader commit policy |
| `toronto-rising-compound-engineering` | Repo-specific engineering workflow | Needs detailed path audit before doc moves |

Phase 1 implication:

- `.dev/DOCS_INDEX.md` should mirror the practical routing in `tr-start` initially.
- `/tr-start` should be preserved as the current "next task" entrypoint during Phase 1. Later phases can update it to consume `.dev/DOCS_INDEX.md`, replace it with a cleaner workflow, or retire it if the new routing makes it unnecessary.
- `/tr-inbox` should be preserved as the current capture-to-Linear workflow during Phase 1. Later phases should update or replace it only after `.dev/INBOX.md`, `.dev/RUNNING TASKLIST.md`, and planning docs have a settled home.

## Known Alignment Considerations

| Issue | Evidence | Recommended Handling |
|---|---|---|
| Commit policy scope | Cursor rules favor frequent commits; Codex/API sessions still follow active system/developer safety rules | Phase 1 should define Cursor policy without overriding higher-priority runtime instructions |
| `.dev/Sychronizing Game Functionality/` typo path | Referenced by repo rules, skills, docs | Preserve path until a dedicated move/reference PR |

## Recommended Instruction Precedence

For Toronto Rising work, the desired practical precedence should be:

1. Current chat/user request.
2. System/developer/runtime constraints.
3. Root `AGENTS.md` for repo-specific agent entrypoint.
4. `.cursor/rules/*` for always-on local Cursor policies.
5. `.cursor/skills/*` for task-specific local Cursor workflows.
6. `.dev/DOCS_INDEX.md` for task-to-doc routing.
7. Canonical `.dev/docs/**` or current-path docs.
8. Historical plans, generated artifacts, and global editor defaults.

Important nuance:

- Global Codex/Cursor config may provide tools and broad preferences, but it should not be the source of truth for Toronto Rising engineering behavior.
- Notion should remain an index/planning layer, not canonical technical instruction storage.

## Phase 1 Requirements

Phase 1 should be non-destructive and should create only orientation/index docs.

Required files:

- `AGENTS.md`
- `.dev/README.md`
- `.dev/DOCS_INDEX.md`

Required content:

- State that docs are agent-first by default.
- State that user/player docs are intentionally minimal.
- Route agents to `.cursor/rules/*` and `.cursor/skills/*`.
- State that `/tr-start` is the current "next task" workflow and `/tr-inbox` is the current markdown capture to Linear/tasklist workflow, while leaving room to replace or retire them after the reorganization.
- Mark `.dev` as untrusted until verified against code.
- Tell agents not to move or delete `.dev` files until reference checks are complete.
- Identify generated artifacts, save snapshots, tool source, and chronicle data as different categories.
- Include a "current paths are path-sensitive" warning.
- Include a policy that later moves must update `package.json`, `.tools`, `.cursor/rules`, `.cursor/skills`, code comments, generated-file headers, and docs in the same PR.

## Recommended Follow-Up Issues

| Title | Goal | Labels |
|---|---|---|
| Phase 1 agent orientation docs | Add `AGENTS.md`, `.dev/README.md`, `.dev/DOCS_INDEX.md` without moving files | docs, codex-ok, agent-instruction |
| Align repo Cursor rules with agent-first docs | Route current rules through `AGENTS.md`, `.dev/DOCS_INDEX.md`, and active skills | docs, path-sensitive, agent-instruction |
| Align repo Cursor skills with `.dev/DOCS_INDEX.md` | Update `tr-start`, `tr-inbox`, and domain skills after index exists | docs, path-sensitive, agent-instruction |
| Reconcile commit policy | Preserve frequent commits while making staging/scope safety explicit | docs, tooling, needs-human-review |

# Phase 0: `.dev` Documentation & Artifact Audit

Status: audit complete; cleanup status updated through 2026-07-08
Date: 2026-07-07; updated 2026-07-08
Scope: `.dev/` inventory, classification, and current cleanup routing
Audience: future Codex/agent runs and project cleanup planning
Change policy: this report began as a read-only Phase 0 audit; later cleanup commits keep this document aligned with current repo state

## Purpose

This report converts the initial Phase 0 chat reply into a durable audit document. It should be used as a planning reference for reorganizing `.dev/` in later phases.

The project is agent-built and agent-maintained. Documentation decisions should optimize for agent retrieval, task routing, and correctness checks, not broad public or user documentation. Human/player documentation should stay minimal and should be isolated from canonical engineering guidance.

## Evidence

The audit used:

- `.dev-inventory.csv`
- `.dev-preview.txt`
- `git ls-files .dev`
- `.gitignore`
- `package.json`
- targeted `rg` scans for `.dev` paths and stale references
- representative reads of high-signal docs and tool READMEs

No build or test runs were needed for this inventory pass.

## Executive Summary

`.dev/` is a mixed workspace, not a clean documentation folder. It contains:

- heavily referenced engineering docs
- agent prompts and review workflows
- active build and generator scripts used by `package.json`
- local tool apps and dashboards
- ignored generated manifests, reports, gate logs, and runtime debug output
- ignored local TTS save snapshots
- chronicle/campaign source material
- stale plans, migration notes, and one-off patch scripts
- vendored/reference Tabletop Simulator API documentation

The highest-risk finding is path sensitivity. `package.json` directly invokes `.dev/scripts/*`, reads and writes `.dev/custom-ui-assets/*`, and many tools assume `.dev/TS_Save_230.json`. Code and UI comments also route agents to many `.dev` docs. Moves should wait until references, generated-file headers, VS Code tasks, and tool defaults have been checked.

The second major finding is documentation trust ambiguity. Several docs are important, heavily linked, and confident, but may not match current code. Later phases should add agent-facing routing/index docs before moving or consolidating anything.

The third major finding is that `.dev/` cannot be cleaned up in isolation. Repo-local agent instructions under `.cursor/rules/` and `.cursor/skills/` are active routing surfaces for agents and contain many hard-coded `.dev` paths. Those files should stay aligned in every move/reference pass.

## Agent-Centric Documentation Principle

For this repo, documentation should be designed as an agent operating layer:

- optimize for "what should an agent read before touching this area?"
- avoid broad prose that looks canonical but is not tied to code
- mark generated artifacts and historical plans loudly
- keep user/player docs light and isolated
- prefer task routing and verification commands over narrative explanations
- keep canonical technical docs in Git, with Notion acting only as an index/dashboard

Every canonical engineering doc should eventually start with an agent routing block:

```markdown
## Agent Routing

Read this when:
- touching `core/soundscape.ttslua`
- changing scene apply/load behavior

Do not read this when:
- changing dice UI
- editing PC sheet stat math

Source of truth:
- `core/soundscape.ttslua`
- `lib/soundscape_catalog.ttslua`

Generated/dependent files:
- none

Verification:
- `node --test ".dev/scripts/soundscape_contract.test.js"`
```

That block should tell future agents whether the document is relevant and where to verify it.

## Adjacent Agent Instruction Surfaces

The audit scope started with `.dev/`, but the workspace also contains agent rules and skills that are automatically sent or invoked by agents. These are not ordinary docs. They are part of the operational control plane and must be aligned with any new `.dev` structure.

Accessible repo-local surfaces found:

| Path | Role | Cleanup Concern |
|---|---|---|
| `.cursor/rules/toronto-rising-development.mdc` | Always-applied development style and routing rule | Routes through active repo rules and current `.dev` paths |
| `.cursor/rules/toronto-rising-git.mdc` | Always-applied aggressive commit policy | Conflicts with some external/system agent policies; future `AGENTS.md` must state repo-local precedence clearly |
| `.cursor/rules/toronto-rising-linear.mdc` | Always-applied Linear/tasklist policy | Routes inbox work through `.cursor/skills/tr-inbox/SKILL.md` |
| `.cursor/rules/toronto-rising-lua-local-function-order.mdc` | Always-applied Lua pre-flight rule | Good candidate for canonical agent routing; linked from docs and skills |
| `.cursor/rules/toronto-rising-multiplayer-authority.mdc` | Always-applied multiplayer authority rule | Heavily linked to `.dev/Multiplayer Functionality/` and synchronization docs |
| `.cursor/rules/toronto-rising-object-script-bundling.mdc` | Always-applied object bundling rule | Depends on `.dev/TTS_BUNDLING_SETUP.md` and should stay near build/deploy workflow routing |
| `.cursor/rules/toronto-rising-synchronization.mdc` | Always-applied sync contract | References `.dev/Sychronizing Game Functionality/` typo path and canonical sync docs |
| `.cursor/skills/tr-start/SKILL.md` | Main session bootstrap skill | Hard-codes the current read order and many `.dev` paths; should become a primary consumer of `.dev/DOCS_INDEX.md` |
| `.cursor/skills/tr-inbox/SKILL.md` | Inbox/Linear triage skill | Depends on `.dev/INBOX.md`, `.dev/RUNNING TASKLIST.md`, and Linear workflow docs |
| `.cursor/skills/step-by-step-guidance/SKILL.md` | Step-by-step verification guidance | Referenced from `.dev/TESTING.md` and playbooks |
| `.cursor/skills/toronto-rising-conditions/SKILL.md` | Conditions system guidance | References `.dev/PC Data & Tracking/Conditions System Guide.md` |
| `.cursor/skills/dbcheck`, `dbfullcheck`, `eagercommit`, `toronto-rising-compound-engineering` | Additional repo-specific agent skills | Need path/reference audit before any major structure move |

Confirmed adjacent agent-instruction surfaces:

- `.cursor/rules/toronto-rising-author-session.mdc` records the author-session fact policy.
- `.cursor/skills/tr-start/SKILL.md` functions as the current agent read-order index and should consume `.dev/DOCS_INDEX.md` as the routing model stabilizes.

Orientation docs should preserve this intended chain:

```text
root AGENTS.md
  -> .dev/README.md
  -> .dev/DOCS_INDEX.md
  -> task-specific canonical docs
  -> .cursor/rules/* and .cursor/skills/* stay aligned with those routes
```

Later relocation phases must update `.cursor/rules/*` and `.cursor/skills/*` in the same PR as moved docs. Otherwise agents will continue reading stale paths even if human-facing indexes are correct.

## Top-Level Classification

| Path | Classification | Likely Purpose | Confidence | Codex May Edit Later? | Check References Before Move? | Recommended Destination |
|---|---|---|---|---|---|---|
| `.dev/.debug/` | generated-artifact, build-output | Runtime bridge/debug writes | high | no hand edits | yes | `.dev/generated/debug/` or ignored runtime dir |
| `.dev/Agent Reviews/` | agent-instruction | Agent review prompts | high | yes | yes | `.dev/agents/reviews/` |
| `.dev/Animations/` | active-working-doc | Animation design notes | medium | yes | yes | `.dev/docs/systems/animation/` |
| `.dev/build-logs/` | generated-artifact, build-output | Ignored tool, gate, and save reports | high | generated policy only | yes | local ignored output |
| `.dev/Chronicle Data/` | chronicle-data | Campaign/NPC/weather lore data | high | cautious; human review | yes | `.dev/chronicle/` |
| `.dev/Code Review/` | agent-instruction, active-tool-source | Code-review pipeline spec and artifacts | high | yes, carefully | yes | `.dev/agents/reviews/code-review/` plus tool artifacts |
| `.dev/CSV to Markdown Parser/` | active-tool-source | Local Google Sheets to Markdown app | high | yes | yes | `.dev/tools/csv-to-markdown/` or `tools/` |
| `.dev/custom-ui-assets/` | active-tool-source, generated-output-dir | Workflow README and prune list are tracked; generated manifests/reports are ignored | high | README/prune list yes; generated outputs no | yes | keep stable until script defaults change |
| `.dev/Dice System/` | authoritative-doc, active-working-doc | Dice architecture/specs | high | yes | yes | `.dev/docs/systems/dice/` |
| `.dev/E2E Playbooks/` | authoritative-doc, active-working-doc | Manual E2E playbooks | high | yes | yes | `.dev/docs/testing/e2e/` |
| `.dev/HUDs & Overlays/` | authoritative-doc | Player HUD/UI specs | high | yes | yes | `.dev/docs/systems/hud/` |
| `.dev/Multiplayer Functionality/` | active-working-doc, historical-plan | Multiplayer audits/plans | medium | yes | yes | `.dev/docs/architecture/multiplayer/` |
| `.dev/NPC Object Spawning & Spotlighting/` | authoritative-doc, generated-artifact | NPC spawning/lighting docs and PNGs | high | docs yes; images cautious | yes | `.dev/docs/systems/npc/` |
| `.dev/PC Data & Tracking/` | authoritative-doc, generated-artifact | PC, condition, state docs and generated PC ref | high | docs yes; generated ref no | yes | `.dev/docs/systems/pc-state/` |
| `.dev/plans/` | historical-plan, active-working-doc | Plans and CSV/Lua exports | medium | yes | yes | `.dev/plans/{active,parked,completed}/` |
| `.dev/Problems/` | generated-artifact | Ignored Problems panel JSON captures | high | no hand edits | yes | local ignored output |
| `.dev/Projects/` | authoritative-doc | Coterie/project system doc | medium | yes | yes | `.dev/docs/systems/projects/` |
| `.dev/Scene Constructor/` | authoritative-doc, fixture | Scene import schema/templates | high | yes | yes | `.dev/docs/systems/scenes/` plus `.dev/fixtures/scenes/` |
| `.dev/scripts/` | script-source, active-tool-source | Build/generator/migration scripts | high | yes, with tests | yes | `.dev/tools/scripts/` or `tools/` after script updates |
| `.dev/sheets-obsidian-dashboard/` | active-tool-source | Local Sheets/Obsidian dashboard | high | yes | yes | `.dev/tools/sheets-obsidian-dashboard/` |
| `.dev/Soundscape & Audio/` | authoritative-doc, active-tool-source | Soundscape docs and Unity scripts | high | yes | yes | `.dev/docs/systems/soundscape/` plus `tools/unity/` |
| `.dev/Step-By-Step Playbooks/` | authoritative-doc, active-working-doc | Manual verification templates | high | yes | yes | `.dev/docs/testing/step-by-step/` |
| `.dev/storyteller-dashboard/` | active-tool-source | Current local dashboard app | high | yes | yes | `.dev/tools/storyteller-dashboard/` or `tools/` |
| `.dev/Sychronizing Game Functionality/` | authoritative-doc, historical-plan | Sync architecture docs; typo path | high | yes | yes | `.dev/docs/architecture/synchronization/` |
| `.dev/testbed/` | active-tool-source, generated-artifact | Ignored TTS test harness | high | cautious | yes | `.dev/fixtures/testbed/` or keep ignored |
| `.dev/tts-api/` | authoritative-doc, archive-candidate | Vendored TTS API reference | high | no unless refreshing | yes | `.dev/docs/reference/tts-api/` |
| `.dev/User Guides/` | authoritative-doc | TTS positioning guide | high | yes | yes | `.dev/docs/workflows/` |
| `.dev/utility-functions/` | authoritative-doc, historical-plan | Utility implementation plans | medium | yes | yes | `.dev/docs/systems/utilities/` |

## Top-Level File Classification

| Path | Classification | Likely Purpose | Confidence | Codex May Edit Later? | Check References Before Move? | Recommended Destination |
|---|---|---|---|---|---|---|
| `.dev/.markdownlint.jsonc` | active-tool-source | Markdown lint config | high | yes | yes | stay or `.dev/` |
| `.dev/AVAILABLE_FUNCTIONS.md` | authoritative-doc | Utility/function reference | high | yes after code verification | yes | `.dev/docs/reference/` |
| `.dev/DEBUG_FILE_LOGGING.md` | authoritative-doc | Debug bridge/logging guide | high | yes | yes | `.dev/docs/troubleshooting/` |
| `.dev/DEVELOPMENT_WORKFLOW.md` | agent-instruction, authoritative-doc | Workflow rules | medium | yes; needs reconciliation | yes | `.dev/agents/` or `.dev/docs/workflows/` |
| `.dev/Game State Data.jsonc` | authoritative-doc, fixture | State snapshot/example | medium | cautious | yes | `.dev/fixtures/state/` |
| `.dev/HUD_FUNCTIONS.md` | authoritative-doc | HUD handler reference | high | yes | yes | `.dev/docs/reference/` |
| `.dev/INBOX.md` | active-working-doc | Capture inbox | high | yes | yes | `.dev/plans/active/` or `.dev/inbox.md` |
| `.dev/Rotational Coordinate Generator.md` | authoritative-doc | Seat/table coordinate workflow | high | yes | yes | `.dev/docs/systems/table-layout/` |
| `.dev/RUNNING TASKLIST.md` | active-working-doc | Linear/task authoring surface | high | yes | yes | `.dev/plans/active/` |
| `.dev/SOLVING ISSUES & DEBUGGING.md` | authoritative-doc | Debugging playbook | high | yes | yes | `.dev/docs/troubleshooting/` |
| `.dev/Table Seat Layout Audit.md` | generated-artifact, active-working-doc | Seat layout audit | medium | cautious | yes | `.dev/docs/systems/table-layout/` or generated |
| `.dev/TESTING.md` | authoritative-doc | Testing index | high | yes | yes | `.dev/docs/testing/README.md` |
| `.dev/TS_Save_230*.json` | save-snapshot | Ignored local save snapshots used by save-analysis scripts | high | no hand edits | yes | local ignored working files |
| `.dev/TTS Edtior.log` | generated-artifact | Ignored typo-named log | high | no | no | keep ignored or generated/logs |
| `.dev/TTS_BUNDLING_SETUP.md` | authoritative-doc | Bundling/save pipeline | high | yes | yes | `.dev/docs/workflows/tts-bundling.md` |
| `.dev/TTS_MCP.md` | authoritative-doc | TTS MCP/bridge setup | high | yes | yes | `.dev/docs/workflows/tts-mcp.md` |
| `.dev/TTS-Scripting-Guide.htm` | archive-candidate | Offline TTS guide | medium | no | yes | `.dev/docs/reference/tts-api/` |
| `.dev/tts-color-object-tags-by-seat.md` | authoritative-doc | Seat tag reference | high | yes | yes | `.dev/docs/reference/` |
| `.dev/Utility Function - RotateToFrom.md` | authoritative-doc, historical-plan | Utility guide | medium | yes | yes | `.dev/docs/systems/utilities/` |
| `.dev/_*.py`, `.dev/_gen_*.js` | one-off-patch | Patch/generation debris | medium | only after verification | yes | `.dev/archive/patches/` |

## Likely Canonical Docs

These documents should be preserved or consolidated, then verified against code before being treated as source-of-truth material.

| Area | Likely Canonical Inputs | Currentness Assessment |
|---|---|---|
| Synchronization/state | `.dev/Sychronizing Game Functionality/Reconciler Contract.md`, `Event Listener Policy.md`, `State Access Audit.md` | Important; folder typo needs careful reference handling |
| State model | `.dev/Game State Data.jsonc`, `.dev/HUDs & Overlays/Player HUD Overview.md`, `.dev/PC Data & Tracking/PC Tracking & State Behavior.md` | Important; verify runtime shape against `core/state.ttslua` |
| NPC systems | `.dev/NPC Object Spawning & Spotlighting/NPC Object Overview.md`, `NPC Reconciler Procedure.md`, `Storyteller Gameboard Control.md` | Appears current and code-referenced |
| Lighting/table layout | `.dev/Rotational Coordinate Generator.md`, `.dev/Table Seat Layout Audit.md`, NPC light docs | Important; verify against `core/lighting.ttslua` and `lib/rotational-seat-layout.ttslua` |
| Soundscape | `.dev/Soundscape & Audio/SOUNDSCAPE_LUA_IMPLEMENTATION.md`, `SOUNDSCAPE_UNITY_SETUP.md`, `UNITY_VS_TTS_AUDIO_LIFECYCLE.md` | Important and test-referenced |
| HUD/overlays | `.dev/HUD_FUNCTIONS.md`, `.dev/HUDs & Overlays/Player HUD Overview.md` | Heavily referenced by UI/code |
| TTS save/custom UI pipeline | `.dev/TTS_BUNDLING_SETUP.md`, `.dev/custom-ui-assets/README.md` | Active and path-sensitive |
| Build/testing/debugging | `.dev/TESTING.md`, `.dev/SOLVING ISSUES & DEBUGGING.md`, `.dev/DEBUG_FILE_LOGGING.md` | Important |
| Agent instructions | `.dev/Agent Reviews/AGENT_REVIEW_PROMPTS.md`, `.dev/Code Review/CODE_REVIEW_PIPELINE.md`, `.cursor/rules/*` | Route through root `AGENTS.md` and `.dev/DOCS_INDEX.md` |

Important update: agent instruction cleanup should include `.cursor/skills/*` as well as `.cursor/rules/*`. The skills are active routing documents, not passive references.

## Generated Artifacts And Large Misplaced Files

Current generated-output policy:

- `.dev/TS_Save_230*.json`: ignored local save snapshots; package scripts use `.dev/TS_Save_230.json` when present.
- `.dev/.debug/`: ignored runtime output; move later only if `core/debug.ttslua` and bridge paths change.
- `.dev/build-logs/*`: ignored generated reports, gate baselines, and save inventories.
- `.dev/custom-ui-assets/*.json`, `*.lua`, reports: ignored generated manifests and upload outputs; tracked source in that folder is `README.md` and `prune-custom-ui-assets.txt`.
- `.dev/Problems/*.json`: ignored IDE/problem captures.
- `.dev/PC Data & Tracking/PC Reference.md`: explicitly generated; keep but mark generated.
- `.dev/CSV to Markdown Parser/node_modules/`, `md/`, output-like files: local app artifacts; add/verify ignores before moving.
- `.dev/TTS Edtior.log`: ignored by `*.log`; keep ignored.
- `.dev/TTS-Scripting-Guide.htm` and `.dev/tts-api/`: reference/vendor material; archive/reference, not source docs.

## Active Tooling Inside `.dev`

Path-sensitive active tooling:

- `.dev/scripts/`: used by `package.json` scripts and generated-file headers. Move only with package/docs/header updates.
- `.dev/CSV to Markdown Parser/`: invoked by `csv-to-markdown:*` scripts. Candidate for `.dev/tools/csv-to-markdown/` or `tools/csv-to-markdown/`.
- `.dev/storyteller-dashboard/`: local OpenAI dashboard app. Candidate for `.dev/tools/storyteller-dashboard/`; check VS Code tasks first.
- `.dev/sheets-obsidian-dashboard/`: standalone local app. Candidate for `.dev/tools/`.
- `.dev/Soundscape & Audio/TTSAssetBundle Unity Scripts/` and `UnityEditorScripts/`: active Unity helper code. Candidate for `tools/unity/soundscape/`.
- `.dev/testbed/TEST BED.ttslua`: ignored but test-referenced. Keep until harness policy is clarified.
- `.dev/custom-ui-assets/`: workflow README, prune list, and ignored generated outputs consumed by `.tools/custom-ui-assets`. Keep path stable until script defaults change.

## Broken Or Suspicious References

Confirmed suspicious repo documentation paths still worth tracking:

- The misspelled folder `.dev/Sychronizing Game Functionality/` is widely referenced. Fixing it requires a deliberate compatibility/reference pass.
- `.cursor/rules/*` and `.cursor/skills/*` contain many direct `.dev` paths and should be included in the same reference checks as package scripts and code comments.

## Proposed Agent-First Target Structure

The target structure should favor agent retrieval and routing over public docs polish.

```text
.dev/
├─ README.md
├─ DOCS_INDEX.md
├─ agents/
│  ├─ prompts/
│  └─ reviews/
├─ docs/
│  ├─ architecture/
│  │  ├─ synchronization/
│  │  └─ multiplayer/
│  ├─ systems/
│  │  ├─ dice/
│  │  ├─ hud/
│  │  ├─ npc/
│  │  ├─ pc-state/
│  │  ├─ scenes/
│  │  ├─ soundscape/
│  │  └─ table-layout/
│  ├─ workflows/
│  ├─ testing/
│  ├─ troubleshooting/
│  ├─ reference/
│  └─ user/
├─ plans/
│  ├─ active/
│  ├─ parked/
│  └─ completed/
├─ tools/
├─ generated/
│  ├─ build-logs/
│  ├─ custom-ui-assets/
│  ├─ debug/
│  └─ problems/
├─ fixtures/
│  ├─ saves/
│  ├─ scenes/
│  └─ testbed/
└─ chronicle/
```

Notes:

- `docs/user/` should exist only for complex player-facing or private reference material that is genuinely useful to humans.
- Most engineering docs should be written for agents.
- `.dev/README.md` should explain trust levels and cleanup policy.
- `.dev/DOCS_INDEX.md` should be task-oriented: "if touching X, read Y".
- Root `AGENTS.md` should be the first agent entrypoint and should route into `.dev/DOCS_INDEX.md`.
- `.cursor/rules/*` and `.cursor/skills/*` should be treated as downstream agent-routing consumers of this structure, not as separate competing documentation.

## Notion Integration Recommendation

Use Notion as a dashboard and planning layer, not canonical technical storage.

Notion should hold:

- project dashboard
- `.dev` cleanup tracker
- system index linking to repo docs
- decision log
- Codex run log
- links to GitHub PRs and Linear issues

Canonical technical docs should remain in Git. Notion pages should summarize, index, assign ownership/status, and link back to repository paths and PRs.

## Recommended Linear Issues

| Title | Goal | Scope | Acceptance Criteria | Labels | Codex Safe? | Human Review? |
|---|---|---|---|---|---|---|
| Agent orientation docs | Maintain non-destructive agent entrypoints | root `AGENTS.md`, `.dev/README.md`, `.dev/DOCS_INDEX.md`; cross-reference `.cursor/rules` and `.cursor/skills` | Current-path links; trust model; agent routing; explicit rule/skill alignment note | docs, codex-ok | yes | yes |
| Agent rule and skill alignment | Bring automatic agent instructions into the new routing model | `.cursor/rules/*`, `.cursor/skills/*` | Route live instructions through `AGENTS.md`, `.dev/DOCS_INDEX.md`, and active Cursor skills | docs, agent-instruction, path-sensitive, codex-ok | yes | yes |
| Reference audit for `.dev` paths | Identify move blockers | `package.json`, `.tools`, docs, UI/code comments | Path-sensitive refs and owners listed | docs, path-sensitive, codex-ok | yes | yes |
| Canonical docs verification | Mark current/stale docs | sync, state, NPC, HUD, soundscape, testing | Each canonical doc has status, source files, and verification commands | docs, needs-human-review | partial | yes |
| Generated artifact policy | Keep generated outputs ignored | build logs, debug, manifests, saves, editor exports | `.gitignore` and routing docs stay aligned with generated-output locations | generated-artifact, docs | yes | yes |
| Tooling relocation plan | Prepare script/app moves | `.dev/scripts`, dashboards, parser | No moves yet; package/script migration map | tooling, path-sensitive | yes | yes |
| Archive historical docs | Remove or consolidate stale plans later | plans and one-off patches | Candidates listed and approved before relocation or deletion | archive-candidate | partial | yes |
| Notion dashboard setup | Create index/tracker | dashboard, cleanup tracker, decision log | Links to repo docs and Linear issues | notion | partial | yes |
| Delete-candidate review | Explicit final cleanup | ignored logs/artifacts only | Human-approved delete list | needs-human-review | no | yes |

## Phase Plan

1. Phase 0: audit and classify `.dev`.
2. Agent orientation: keep root `AGENTS.md`, `.dev/README.md`, `.dev/DOCS_INDEX.md`, and `.cursor` rules/skills aligned.
3. Phase 2: verify and consolidate canonical docs against current code.
4. Phase 3: keep generated artifacts ignored and untracked; update script/default paths only when relocation is actually needed.
5. Phase 4: remove or consolidate stale plans, historical docs, and one-off patch debris after reference checks.
6. Phase 5: populate Notion dashboard/index/tracker from Git sources if useful.
7. Phase 6: review any remaining local-only delete candidates.

Recommended next cleanup: verify and consolidate canonical docs against current code.

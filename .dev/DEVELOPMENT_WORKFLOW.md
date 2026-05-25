# Development Workflow

This document outlines the development workflow and best practices for this project.

## Linear synchronization (primary responsibility)

**Linear is a primary source of truth for project state**, alongside the codebase. Agents must follow **`.cursor/rules/toronto-rising-linear.mdc`** on every task — check issues before starting, sync when finishing, never leave RUNNING TASKLIST and Linear diverged.

[`.dev/RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md) is the authoring surface for planned work; every bullet must have a matching `_(TOR-XX)_` id. Alignment audit: [`.dev/plans/linear-alignment-log.md`](plans/linear-alignment-log.md).

**Quick capture (not yet scheduled):** [`.dev/INBOX.md`](INBOX.md) — one-line notes; **“process the inbox”** to clarify and promote.

See **§ Linear synchronization (detail)** below for domain projects, labels, and hygiene.

## Git Workflow

### Regular Commits

**Important**: All code changes should be committed to the repository regularly without requiring explicit user prompts. This includes:

- Feature implementations
- Bug fixes
- Refactoring
- Documentation updates
- Configuration changes

### Commit Message Guidelines

Commit messages should be clear and descriptive:

- Use present tense ("Add feature" not "Added feature")
- Start with a verb describing the action
- Include relevant details about what changed
- Reference related issues when applicable

**Good Examples:**

```text
Implement GUID-based player lighting system

- Refactored lighting module to use GUID-based lookup for player lights
- Player lights no longer require player data for control
- Updated test functions to use new GUID library
```

```text
Update documentation for lighting system changes

- Updated DEBUG_FILE_LOGGING.md with logging improvements
- Updated EXTRACTABLE_FUNCTIONS_INDEX.md to reflect current codebase state
```

### When to Commit

Commit changes when:

- A logical unit of work is complete
- A feature is implemented and tested
- Documentation is updated
- Refactoring is complete
- Multiple related changes are made together

**Do not wait for user prompts** - commit proactively after completing work. **Never ask** “Should I commit?” or “Want me to commit?” — the answer is always yes.

### Agent chat titles (Cursor)

Cursor **auto-titles** agent threads from early messages. Chats that open with only `/tr-start` often become generic (“Start command discussion”, “Starting a new process”, etc.).

**Agents cannot rename chats programmatically.** After scope is confirmed and the Linear issue is **In Progress**, the agent should ask the author **once** to rename the sidebar title to **`TOR-XXX — short title`**.

**Handoff pattern:** `/tr-inbox` → new chat with `/tr-start TOR-138 soundscape resync after load` → confirm scope → rename chat. Details: `.cursor/commands/tr-start.md` § Agent chat title.

## Code Organization

### Module Structure

- `lib/` - Shared libraries and utilities
- `core/` - Core game logic modules
- `.dev/` - Development tools and documentation
- `ui/` - UI XML files and related resources

### File Naming

- Use `.ttslua` extension for Lua module files
- Use `.md` for documentation
- Use `.xml` for UI definitions

## Development Best Practices

### Code Style

- Follow existing code patterns and conventions
- Use descriptive variable and function names
- Include JSDoc-style comments for functions
- Maintain consistent indentation (spaces, not tabs)

### Error Handling

- Do **not** wrap code in `pcall` by default. Unexpected failures should be visible.
- Use `pcall` only for a known, expected failure that is intentionally non-fatal and safe to ignore.
- Every `pcall` must include a clear nearby comment explaining:
  - the specific known failure being masked
  - why masking is acceptable in that location
  - what fallback/logging behavior is used
- Provide clear error messages
- Validate inputs before processing

### Testing

- Test changes in TTS before committing
- Update test functions when adding new features
- Document test requirements in `.dev/TESTING.md`

### Runtime logging and agent instrumentation

- Workspace file output from **`sendExternalMessage`** `type: "write"` goes to **`.dev/.debug/`** when the repo **tts-bridge** listens on **39998** — see **`.dev/DEBUG_FILE_LOGGING.md`**.
- Use **`core/debug.ttslua`** helpers (`DEBUG.logToFile`, `DEBUG.writeWorkspaceFile`, **`DEBUG.workspaceNdjsonBegin`**, **`DEBUG.workspaceNdjsonAppend`**) instead of calling **`lib/workspace_ndjson_log`** directly from new code unless there is a specific exception.

## Module Dependencies

### Required Modules

- `lib/constants` - Game constants and configuration
- `lib/guids` - GUID references (G library)
- `lib/util` - Utility functions
- `core/state` - State management
- `core/lighting` - Lighting control
- `core/main` - Main game logic

### Module Loading Order

Modules should be loaded in dependency order:

1. Constants and utilities
2. Core modules
3. Main game logic
4. Debug/testing modules (development only)

## Inbox capture & triage

[`.dev/INBOX.md`](INBOX.md) is the **low-friction capture surface** for bugs, intentions, and feature ideas. The human adds **one-line notes only**; the triage agent decides promotion (Linear Backlog, RUNNING TASKLIST, dismiss, or duplicate). GitHub Issues are **not** used for Toronto Rising project tracking.

### Human capture

| You do | Triage agent does |
| --- | --- |
| One line under **Active** (prefixes/tags optional) | Classify, dedupe, park unclear items with `?` bullets |
| **`Answer:` inline** under each `?` in **Needs clarification** | Re-run **“process the inbox”** → read answers from file, promote |
| Fix obvious bugs in <5 min in code | (Skip inbox) retroactive Linear **Bug** |

**Clarification loop:** Questions and answers live **in INBOX.md** (`?` / `Answer:` on the same item). Chat echo is optional; the file is authoritative. Re-run **`/tr-inbox`** after answering.

**Back-burner confirmation:** When triage would **defer from Focus** an **inbox-promoted** item, the agent **must propose** Focus treatment, **`blockedBy`** links, and Linear **priority** (separate axes) with rationale, and **wait for author OK** before writing. See **`/tr-inbox`**. Do not auto-set **Low** priority because of deferral.

**Linear ID context:** Agents never cite bare `TOR-XXX` without a short label (tasklist/Linear title) in chat, Deferred lines, or summaries.

**Format:** `- summary` or `- [bug][module] summary` — optional indented sub-bullets if you already know repro/context.

### Agent triage (“process the inbox”)

When the user says **“process the inbox”** (or similar), run **both phases** below in one session unless the user explicitly asked for “clarifications only”.

#### Phase 1 — Clarify (park + `?` bullets)

1. Read **Active** and **Needs clarification** in [`.dev/INBOX.md`](INBOX.md).
2. For each item **without an `Answer:`** on every open `?` bullet:
   - Search the codebase and Linear for context; resolve alone when unambiguous.
   - If still unclear: **move the item** from Active → **Needs clarification** (subsection: **Unclear Bugs** / **Unclear Intents** / **Unclear Ideas**).
   - Append **`?` question bullets** under the item (repro steps, scope, priority, module, duplicate check, etc.).
3. **Do not require chat replies.** The author answers by editing INBOX inline (`Answer:` on the question line or indented `- Answer:` below). Optionally post a short chat pointer: “Questions parked in INBOX → Needs clarification.”
4. Items where **every `?` has an `Answer:`** → ready for Phase 2. Do not promote until answers are in the file.

#### Phase 2 — Promote (agent decides destination)

For every item Phase 1 marked ready (clear Active lines + answered Needs clarification lines):

1. **Search Linear** for duplicates; merge or dismiss if a matching `TOR-*` exists.
2. Choose an outcome **by assessment** (user does not pick tier):

| Assessment | Action |
| --- | --- |
| **Actionable, scoped** — clear enough to schedule or track as planned work | Linear issue **+** RUNNING TASKLIST `[ ]` bullet with `_(TOR-XX)_`; labels `Bug` / `Improvement` / `Feature` + `module:*` + `source:tasklist`; domain project + epic when applicable |
| **Worth tracking, not schedulable yet** — vague idea, needs design, large unknown scope | Linear **Backlog** only (no tasklist); note “Promoted from INBOX” in description |
| **Bug on shipped feature** | `Bug` + `relatedTo` original **Done** feature issue |
| **Duplicate** | Processed entry referencing existing `TOR-*`; no new issue |
| **Dismiss** | Processed as `dismissed — reason` |
| **Trivial fix** (only if user asked to fix during triage) | Fix in code; Linear Bug **Done**; Processed with TOR id |

3. **Move** promoted/dismissed/duplicate lines → **Processed** (`YYYY-MM-DD TOR-XXX — summary`).
4. Leave **Needs clarification** items that still lack answers in place; remove answered items after promotion.
5. Preserve section headers in Active / Needs clarification; do not delete structure.
6. **Never** leave tasklist-scheduled promotions without both Linear and RUNNING TASKLIST sync.

**Cadence:** when user says “process the inbox”; optionally at session end if user added Active items that session; when Active + unanswered Needs clarification total ~5–10 items.

**Re-triage:** After the user adds **`Answer:`** bullets under **Needs clarification**, the next **“process the inbox”** runs Phase 2 on those items (Phase 1 only if new ambiguities appear).

### Surfaces (do not dual-track)

| Surface | Role |
| --- | --- |
| `.dev/INBOX.md` | Ephemeral capture; not authoritative for status |
| **Linear** | Status, history, bug anchors |
| `.dev/RUNNING TASKLIST.md` | Shaped planned work with `_(TOR-XX)_`; **Focus** = current stack rank |
| `docs/solutions/` | Patterns after solving — **not** a tracker |

## Focus & backlog prioritization

After inbox promotion or when the user asks **“what’s next”**, **“prioritize the backlog”**, or **“what should I work on”**:

### Precedence vs priority (two axes)

| Axis | Where | Meaning |
| --- | --- | --- |
| **Precedence** | **Focus** table, **Deferred this cycle**, Linear **`blockedBy`** | Work order — what to do *now* vs later; “complete A before B” |
| **Priority** | Linear **Priority** field | Intrinsic importance when an issue *is* scheduled — **independent** of open bugs elsewhere |

**Agent rules:**

- **Deferral ≠ Low priority.** Deferred inbox features may stay **Medium** or **High** in Linear.
- **Do not** lower unrelated issues’ priority because Focus has bugs.
- **Use `blockedBy` liberally** for sequencing (hard or soft “should finish first”). Author audits and removes wrong blocks in Linear — easier than surveying priority drift.
- **`parentId`** = hierarchy/decomposition; **`relatedTo`** = thematic link, no order; **`blockedBy`** = sequencing.

**Guardrails:** One-way blocking (prerequisite blocks dependent). No circular chains. Prefer **`parentId`** over blocking for parent/child structure.

**Anti-gridlock:** Star pattern — blockers live on the **waiting** issue only. Short direct lists (typically 1–6). No deferred-peer meshes or whole-backlog linking. Remove obsolete blocks when prerequisites go **Done**. Full rules: `.cursor/rules/toronto-rising-linear.mdc` § Anti-gridlock.

### Steps

1. Read **Focus** at the top of [`.dev/RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md) — authoritative stack rank for the current cycle.
2. Cross-check **Linear**: open **Bug** issues, non-epic **In Progress**, Focus ids, and **`blockedBy`** on deferred work.
3. Recommend **one** next item (usually top unchecked Focus row). Precedence favors bugs/regressions unless the user is blocked on ST workflow.
4. When the user adjusts rank, **update Focus**; set Linear **priority** on intrinsic importance; add **`blockedBy`** for sequencing — not as a substitute for priority.
5. On Focus item **Done**: check off in domain section, remove or renumber Focus row, update Linear **Done** + comment; remove obsolete **blocks** relations if applicable.
6. **Inbox back-burner gate:** Before deferring **inbox-promoted-this-session** items from Focus, present **Back-burner proposal** (Focus + proposed blockers + proposed priority) and get author confirmation. See **`/tr-inbox`**.
7. **Deferred this cycle** and all agent-facing id lists: every `TOR-XXX` gets a short label (e.g. `TOR-139 (scenes panel trim + library grid)`).

**Cadence:** re-stack Focus after **“process the inbox”** or **`/tr-inbox`**, before a play session, or ~weekly — not on every small fix.

**Slash command:** **`/tr-inbox`** (`.cursor/commands/tr-inbox.md`) runs inbox triage **and** Focus/Linear prioritization in one session so a new chat can use **`/tr-start`** immediately.

## Linear synchronization (detail)

Linear is the source of truth for project state. [`.dev/RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md) is the authoring surface for planned work; every bullet must have a matching `_(TOR-XX)_` id. Alignment audit: [`.dev/plans/linear-alignment-log.md`](plans/linear-alignment-log.md). **Agent rule:** `.cursor/rules/toronto-rising-linear.mdc`.

### Domain projects (Toronto Rising team)

| Project | Scope |
|---------|--------|
| Foundation & Tooling | util, state, zones, guids, debug, build/MCP |
| Synchronization & State | sync, conditions, reconcilers |
| Dice & Rolls | roll FSM, dice, ST rolls, policies |
| Scenes & Chronicle | scenes, library, overlay, locations |
| Lighting & Camera | lighting reconciler, camera presets |
| NPC & Spotlight | npcs, rotational layout |
| Soundscape & Audio | soundscape, emitters, BGM |
| UI & HUD | panels, overlays, PCs panel |
| Character Sheets | multi-page sheets, decals |
| Players & Connection | seat assignment, play-as-NPC |
| Table Objects | tarot, interactables |
| Agent Reviews & Quality | audits, QA epics |
| Out of Scope (Workshop) | Canceled workshop-only tracking |

### When adding planned work to RUNNING TASKLIST

1. Create or update the Linear issue (`save_issue`) in the matching domain project.
2. Add labels: `Feature` or `Improvement`, `source:tasklist`, and `module:*` when applicable.
3. Set `parentId` to the domain epic when one exists (e.g. TOR-31 for Dice).
4. Append `_(TOR-XX)_` to the tasklist bullet immediately.

### When completing work

1. Mark the Linear issue **Done** with a comment (files changed, commits, verification).
2. Change the tasklist checkbox to `[x]`; keep the TOR id.
3. Reference the TOR id in git commit bodies (see `.cursorrules`).

### Living documentation (`living-doc` label)

Some issues (e.g. **TOR-141** manual E2E playbooks) ship a **baseline** but stay **In Progress** because the doc must track code forever.

| Step | Rule |
| --- | --- |
| Baseline shipped | Tasklist `[x]` on the baseline bullet; Linear **In Progress** + `living-doc`; comment with commit + paths |
| Later code changes | Update [`.dev/E2E Playbooks/`](E2E%20Playbooks/README.md) (or linked doc) in the **same PR** |
| Close issue | **Done** only if playbooks are retired or replaced by automation |

See [E2E Playbooks README](E2E%20Playbooks/README.md) maintenance table and `.cursor/rules/toronto-rising-linear.mdc` § Living documentation.

### When descoping or deferring

- Linear → **Canceled** or **Backlog** with reason; move or strikethrough the tasklist item.
- **Focus deferral:** add to **Deferred this cycle**; set **`blockedBy`** on the deferred issue toward prerequisites — do not auto-set **Low** priority.
- Do not delete Linear issues.

### Issue relationships (Linear MCP)

When creating or updating issues via `save_issue`:

- **`parentId`** — sub-issue under epic or parent feature (structure).
- **`blockedBy`** — prerequisite issues that should complete first (**liberal use** for soft sequencing). Append-only in MCP; list proposed links in triage summary.
- **`relatedTo`** — contextual link, no implied order (e.g. bug on shipped feature).
- **`blocks`** — inverse of `blockedBy`; prefer setting **`blockedBy`** on the dependent issue.

Do not create circular **`blockedBy`** chains. Do not use blocking where **`parentId`** is the correct model.

**Anti-gridlock:** Prefer a **star** from the dependent issue to its prerequisites; avoid peer-to-peer blocking among deferred work; cap direct blockers (~6) unless author approves more; drop **`blocks`** relations when prerequisites complete.

### When discovering bugs on shipped features

- Create a **Bug** issue; link via `relatedTo` to the original **Done** feature issue.
- Do not reopen Done feature issues for unrelated bugs.

### Periodic hygiene (monthly or before major releases)

1. Diff RUNNING TASKLIST unchecked items vs Linear Backlog/Todo.
2. Diff checked items vs Linear Done.
3. Process or clear stale **Active** / **Needs clarification** items in [`.dev/INBOX.md`](INBOX.md) via **“process the inbox”**.
4. Scan new `core/` / `lib/` modules for missing coverage under domain epics.
5. Archive completed epics only when all children are Done or Canceled.

### Agent workflow

- **Before coding:** Search Linear for related `TOR-*` issues; read matching tasklist bullet; skim [`.dev/INBOX.md`](INBOX.md) Active if the task might overlap an unprocessed note.
- **When starting:** Set issue **In Progress**; confirm tasklist has correct `_(TOR-XX)_`.
- **When finishing:** Mark **Done** with comment (files, commits, verification); update tasklist `[x]`; reference `TOR-XX` in commit body. **`living-doc`:** keep issue **In Progress** after baseline; see § Living documentation.
- **New work:** Create Linear issue in domain project first; append `_(TOR-XX)_` to tasklist (or INBOX first if capture-only).
- **Inbox triage:** Follow **§ Inbox capture & triage** on “process the inbox”: Phase 1 park + `?` in INBOX; Phase 2 promote when every `?` has inline **`Answer:`**.
- **Never** leave tasklist and Linear diverged at end of session.

## Documentation

### Keeping Documentation Updated

- Update relevant documentation when making changes
- Add examples for new functions
- Document breaking changes
- Keep README files current

### Documentation Files

- `.cursor/rules/toronto-rising-linear.mdc` - **Primary:** Linear + RUNNING TASKLIST + INBOX sync (always-on)
- `.dev/INBOX.md` - Quick capture: `bug` / `intent` / `idea` before Linear promotion
- `.dev/RUNNING TASKLIST.md` - Planned work; every bullet `_(TOR-XX)_`
- `.dev/plans/linear-alignment-log.md` - Linear alignment audit trail
- `.dev/TESTING.md` - Testing guide and test functions
- `.dev/GUID_REQUIREMENTS.md` - GUID requirements and setup
- `.dev/AVAILABLE_FUNCTIONS.md` - Function reference
- `.dev/DEVELOPMENT_WORKFLOW.md` - This file

## AI Assistant Instructions

When working on this project:

1. **Linear (primary):** Follow `.cursor/rules/toronto-rising-linear.mdc` — check `TOR-*` before start, **In Progress** when working, **Done** + comment + tasklist when finished
2. **Inbox:** One-line notes in [`.dev/INBOX.md`](INBOX.md); clarifications via inline **`Answer:`** under **Needs clarification**; **“process the inbox”** to promote
3. **Focus:** Stack rank at top of [RUNNING TASKLIST](RUNNING%20TASKLIST.md); **“what’s next”** / **“prioritize the backlog”** reads Focus + Linear Bugs
4. **Session bootstrap:** **`/tr-start`** in Cursor (`.cursor/commands/tr-start.md`) — re-anchor on Focus + architecture policies; commit without asking; prompt chat rename after Linear **In Progress**
5. **Inbox + prioritize:** **`/tr-inbox`** (`.cursor/commands/tr-inbox.md`) — process INBOX, sync Focus and Linear priorities; then **`/tr-start`** in a fresh chat for implementation
6. **Commit regularly**: Commit after each logical unit **without asking** — never prompt “want me to commit?” (always yes); reference `TOR-XX` in commit body
7. **Agent chat titles**: Agents **cannot** rename Cursor chats. After grabbing a `TOR-*` issue, ask the author once to rename the thread to `TOR-XXX — short title` (see `/tr-start` § Agent chat title)
8. **Clear Messages**: Write descriptive commit messages explaining what changed and why
9. **Update Documentation**: Keep documentation files updated when making changes
10. **Test Changes**: Verify changes work in TTS when possible
11. **Follow Patterns**: Maintain consistency with existing code style and patterns
12. **Error Handling**: Include appropriate error handling and validation
13. **Type Safety**: Use strict TypeScript notation where applicable, avoid `any` type

## Troubleshooting

### Common Issues

- **Module not found**: Check require paths match file locations
- **GUID errors**: Verify GUIDs in `lib/guids.ttslua` match actual TTS objects
- **State persistence**: Ensure state is saved before game reload
- **UI not updating**: Check UI element IDs match between XML and update functions

### Getting Help

- Check `.dev/TESTING.md` for test functions
- Review `.dev/AVAILABLE_FUNCTIONS.md` for function reference
- Check console output for error messages
- Review git history for recent changes

---

**Last Updated**: 2026-05-25 (Focus stack rank; `/tr-start` and `/tr-inbox`; Linear ID labels; inbox back-burner; precedence vs priority; liberal `blockedBy` + anti-gridlock; proactive commits + agent chat rename prompt)
**Maintained By**: Development Team

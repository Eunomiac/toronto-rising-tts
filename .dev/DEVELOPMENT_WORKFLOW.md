# Development Workflow

This document outlines the development workflow and best practices for this project.

## Linear synchronization (primary responsibility)

**Linear is a primary source of truth for project state**, alongside the codebase. Agents must follow **`.cursor/rules/toronto-rising-linear.mdc`** on every task — check issues before starting, sync when finishing, never leave RUNNING TASKLIST and Linear diverged.

[`.dev/RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md) is the authoring surface for planned work; every bullet must have a matching `_(TOR-XX)_` id. Alignment audit: [`.dev/plans/linear-alignment-log.md`](plans/linear-alignment-log.md).

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

**Do not wait for user prompts** - commit proactively after completing work.

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

### When descoping or deferring

- Linear → **Canceled** or **Backlog** with reason; move or strikethrough the tasklist item.
- Do not delete Linear issues.

### When discovering bugs on shipped features

- Create a **Bug** issue; link via `relatedTo` to the original **Done** feature issue.
- Do not reopen Done feature issues for unrelated bugs.

### Periodic hygiene (monthly or before major releases)

1. Diff RUNNING TASKLIST unchecked items vs Linear Backlog/Todo.
2. Diff checked items vs Linear Done.
3. Scan new `core/` / `lib/` modules for missing coverage under domain epics.
4. Archive completed epics only when all children are Done or Canceled.

### Agent workflow

- **Before coding:** Search Linear for related `TOR-*` issues; read matching tasklist bullet.
- **When starting:** Set issue **In Progress**; confirm tasklist has correct `_(TOR-XX)_`.
- **When finishing:** Mark **Done** with comment (files, commits, verification); update tasklist `[x]`; reference `TOR-XX` in commit body.
- **New work:** Create Linear issue in domain project first; append `_(TOR-XX)_` to tasklist.
- **Never** leave tasklist and Linear diverged at end of session.

## Documentation

### Keeping Documentation Updated

- Update relevant documentation when making changes
- Add examples for new functions
- Document breaking changes
- Keep README files current

### Documentation Files

- `.cursor/rules/toronto-rising-linear.mdc` - **Primary:** Linear + RUNNING TASKLIST sync (always-on)
- `.dev/RUNNING TASKLIST.md` - Planned work; every bullet `_(TOR-XX)_`
- `.dev/plans/linear-alignment-log.md` - Linear alignment audit trail
- `.dev/TESTING.md` - Testing guide and test functions
- `.dev/GUID_REQUIREMENTS.md` - GUID requirements and setup
- `.dev/AVAILABLE_FUNCTIONS.md` - Function reference
- `.dev/DEVELOPMENT_WORKFLOW.md` - This file

## AI Assistant Instructions

When working on this project:

1. **Linear (primary):** Follow `.cursor/rules/toronto-rising-linear.mdc` — check `TOR-*` before start, **In Progress** when working, **Done** + comment + tasklist when finished
2. **Commit Regularly**: Commit changes after completing logical units of work without waiting for user prompts; reference `TOR-XX` in commit body
3. **Clear Messages**: Write descriptive commit messages explaining what changed and why
4. **Update Documentation**: Keep documentation files updated when making changes
5. **Test Changes**: Verify changes work in TTS when possible
6. **Follow Patterns**: Maintain consistency with existing code style and patterns
7. **Error Handling**: Include appropriate error handling and validation
8. **Type Safety**: Use strict TypeScript notation where applicable, avoid `any` type

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

**Last Updated**: 2026-05-22 (Linear as primary responsibility)
**Maintained By**: Development Team

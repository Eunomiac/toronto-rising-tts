# AGENTS.md

This file is maintained incrementally by the **Continual Learning** plugin
(`agents-memory-updater` subagent, triggered by the `stop` hook on cadence).
Only the two sections below are managed by the updater; keep contents as plain
bullets without evidence, confidence, or sourcing metadata.

## Learned User Preferences

- Use double quotes for strings, and use string templates or `.join()` instead of direct concatenation.
- Do not use the `any` type, the non-null assertion operator (`!`), or `as unknown as T` casts.
- Generate full code with no placeholders; only emit code relevant to the change rather than regenerating whole files unless asked.
- Include clear inline comments and JSDoc-style headers; implement explicit error checking and type validation.
- Prefer editing existing files over creating new ones; remove dead branches, unused helpers, and obsolete compatibility shims rather than leaving them "just in case".
- Update `.dev/` and `docs/solutions/` in the same change whenever behavior, paths, or public APIs move; never defer documentation as a follow-up.
- Never mask runtime errors; if uncertain whether to fail or fall back, fail loudly so the failure surfaces in logs and chat.
- Commit after each logical unit of work without being prompted, in present tense, and reference related Linear issues (e.g. `TOR-123`) in the commit body.
- **Linear tracking is a primary responsibility:** check `TOR-*` issues before starting work; set **In Progress** when starting; mark **Done** with a comment when finishing; keep `.dev/RUNNING TASKLIST.md` checkboxes and `_(TOR-XX)_` ids aligned with Linear. Never treat Linear sync as optional or defer it.
- Use Compound Engineering skills proactively (session lookup, planning, structured review, git/PR helpers, learnings) when scope or risk warrants it; do not require the user to type `/ce:…` slash commands.
- Environment is 64-bit Windows 11 with PowerShell as the integrated terminal and Chrome as the browser; avoid suggestions that assume macOS, Linux, bash, or other shells.
- Proactive pushback is required: if the user request or current approach appears unsound, overengineered, or contrary to the architecture, explicitly say so, explain why, and propose a simpler/safer alternative immediately instead of silently implementing a weak path.
- Prefer "single authority" designs and call out dual-writer/dual-source-of-truth risks early (for example, restore paths competing with reconciler-derived state).

## Learned Workspace Facts

- This repo is a Vampire: The Masquerade 5th Edition Tabletop Simulator module written in Lua 5.1; module files use `.ttslua`, entry-point stubs use `.lua`, and UI uses `.xml`.
- Source layout: `lib/` for shared libraries (`constants`, `guids`, `util`), `core/` for game logic (`state`, `lighting`, `main`, `scenes`, `zones`, `debug`), `ui/` for UI XML, `.tts/` as TTS Tools auto-generated output, and `.dev/plans/` for new planning documents.
- The real Global script lives at `core/global_script.ttslua`; `global/global_script.ttslua` is a shim that only does `require("core.global_script")` and must not hold game logic.
- Standard require order in modules is `lib.constants` (`C`) → `lib.guids` (`G`) → `lib.util` (`U`) → `core.state` (`S`) → other core modules.
- All TTS object GUIDs live in `lib/guids.ttslua` under the `G` table; never read GUIDs from the legacy `C.GUIDS.*` location and prefer helpers like `G.GetHandZoneGUID(color)`.
- `pcall` is forbidden in production paths and allowed only to mask a known, expected, non-actionable failure, with an adjacent comment explaining what is masked, why masking is safe, and what fallback or logging occurs.
- The Tabletop Simulator MCP / External Editor bridge runs on localhost ports `39999` / `39998`; full setup, tooling (`tts_execute_lua`, `.tools/tts-bridge`), and pitfalls are in `.dev/TTS_MCP.md`.
- External Editor executes the **saved/bundled** Lua, not the on-disk repo, so use the extension's Save and Play before expecting repo edits to take effect in-game.
- From Global (`guid` `"-1"`) executes, prefer `spawnObjectData` over `spawnObject` to avoid TTS `.NET` null-reference failures during MCP-driven spawns; see `DEBUG.ensureEasingTestRig()` in `core/debug.ttslua`.
- For structured return data from TTS, encode JSON in Lua (`JSON.encode` + `print` + `return`) and parse on the Node/TS side, falling back to parsing JSON out of `prints`, because nested tables do not round-trip reliably through `messageID` 5 `returnValue`.
- Emit agent-readable lines from Lua via `U.emitForAgent(kind, data)` or `U.mcpEmitResult(data)` so each event is a single `TR_AGENT_V1` JSON envelope with `seq`, `kind`, `t`, and nested `data`.
- Avoid `node -e` with embedded Lua on Windows due to PowerShell quoting; prefer scripts under `.tools/tts-bridge/scripts/` (e.g. `npm run tts-bridge:run-easing-mcp-test`).
- For long `RunSequenceWithOptions` flows, set a high `maxWaitMs` as the wall-clock cap and a moderate `idleTimeoutMs` matched to the final known print pattern to avoid apparent hangs after the last `TR_AGENT_V1` line.
- Player roles: Storyteller is always `Black`; players are `Brown`, `Orange`, `Red`, `Pink`, `Purple` (in `C.PlayerColors` order). Storyteller ID is hard-coded in `C.StorytellerID`; all per-player state must be keyed by steam_id, never by color or display name.
- State must always be read and written through `S.getStateVal()` / `S.setStateVal()`; direct table access into `S.state.*` is disallowed.
- Synchronization follows an explicit mutation-then-reconcile contract: write state first, then call `Sync.player(color)` / `Sync.full()` (or domain `reconcile*` entry points); do not hide reconciliation side effects inside state setters.
- Player lighting is state-derived (no restore stack): `ROLLING` > `NPC-role exception (future)` > `absent from seat layout` > `HUNGRY` > scene `lightingSeatSpotlightPreset` / `STANDARD`. Scene darkness is expressed in `C.LightModes.*.spotlights` (e.g. `"OFF"`), not by preset key suffix.
- Scene APIs (`Scenes.loadScene` / `Scenes.fadeToScene`) are state-mutation helpers; live scene effects must be applied via `Scenes.reconcileFromState()` through `Sync.*`.
- Coroutine helpers (`U.waitUntil`, `U.RunSequence`, `U.Lerp`) require `startLuaCoroutine(Global, "FunctionName")` and run in Global context where `self` refers to Global.
- Do not call `Wait.time`, `Wait.condition`, or `Wait.stop` outside `lib/util.ttslua`; use `U.delay`, `U.stopDelay`, `U.waitForCondition`, `U.scheduleAtOffsets`, and higher-level sequence helpers. The build gate enforces zero raw Wait usage in game code (`docs/solutions/lua-wait-api-policy.md`).
- Before writing new helpers, check `.dev/AVAILABLE_FUNCTIONS.md` and `lib/util.ttslua` (75+ utilities) so existing `U.map`, `U.filter`, `U.Type`, `U.Val`, etc. are reused instead of reimplemented.
- Implementation plans and design notes belong under `.dev/plans/` unless the user specifies another path; do not invent a top-level `docs/` tree for that purpose.
- The canonical Miro board for Toronto Rising work is `https://miro.com/app/board/uXjVGfp9Sdk=/`; enumerate canvas content with `board_list_items` (paginating via `nextCursor`) because `context_explore` only surfaces high-level item kinds.
- Conditions: canonical doc is `.dev/PC Data & Tracking/Conditions System Guide.md`; modules `lib/condition_defs`, `condition_derive`, `condition_effects`, `condition_roll_policies`, `core/conditions`, `core/roll_condition_handlers`; mutation-then-`afterChange`; roll FSM uses `Conditions.resolveRollPolicy` → `active.rollPolicy` only (not raw `playerData.conditions`).
- **Linear:** Toronto Rising team (`TOR-*`); 12 domain projects; epics TOR-30–43. Always-on agent rule: `.cursor/rules/toronto-rising-linear.mdc`. Planned work: `.dev/RUNNING TASKLIST.md` (`_(TOR-XX)_`). Quick capture: `.dev/INBOX.md` one-liners → **“process the inbox”** (clarify, then agent promotes to Linear/tasklist). Audit trail `.dev/plans/linear-alignment-log.md`. Linear MCP: `plugin-linear-linear`. No GitHub Issues for tracking.

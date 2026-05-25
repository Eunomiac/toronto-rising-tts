---
description: "Bootstrap a Toronto Rising agent session — Focus, Linear, architecture policies"
---

You are starting (or re-scoping) work on **Toronto Rising**, a Vampire: The Masquerade 5e Tabletop Simulator module (Lua 5.1, `.ttslua` sources). Treat this message as your **session charter**. Do not jump to code until you have read the files below and confirmed scope with the user (unless they already named a specific `TOR-*` issue or task).

## 1) Read first (in order)

**Tracking & scope**

1. `.dev/RUNNING TASKLIST.md` — especially **`## Focus`** (current stack rank) and the domain section for any issue the user named.
2. `.dev/INBOX.md` — skim **Active** and **Needs clarification** only if overlap with the task is likely.
3. Search **Linear** (`Toronto Rising` team) for the relevant `TOR-*` issue(s); note status, priority, and open Bugs.

**Architecture & sync (mandatory before touching game logic)**

4. `.dev/Sychronizing Game Functionality/Reconciler Contract.md` — mutation vs reconcile, `Sync.full` order, dual-apply rules.
5. `.cursor/rules/toronto-rising-synchronization.mdc` — single authority for `gameState` intent; no hidden side effects in setters.
6. `.dev/Sychronizing Game Functionality/Dual_apply_survey.md` — skim if the task touches scene, soundscape, lighting, or spawns.

**Coding policies (build gate enforced)**

7. `docs/solutions/lua-pcall-policy.md` — **no `pcall`** in production paths unless annotated necessity + impact.
8. `docs/solutions/lua-wait-api-policy.md` — **no raw `Wait.time` / `Wait.condition` / `Wait.stop`** outside `lib/util.ttslua`; use `U.delay`, `U.waitForCondition`, `U.RunSequence`, etc.
9. `docs/solutions/lua-ui-full-xml-policy.md` — avoid **`UI.setXml` / `setXmlTable`**; prefer `setAttribute`, `setAttributes`, `setValue`, `show`/`hide`. Gate counts are baseline — do not add call sites without review.
10. `.dev/AVAILABLE_FUNCTIONS.md` + `lib/util.ttslua` — **reuse existing helpers** (`U.map`, `U.filter`, `U.Type`, …) before writing new ones.

**When relevant**

- Conditions: `.dev/PC Data & Tracking/Conditions System Guide.md` before any registry or roll-policy change.
- Debugging: `.dev/SOLVING ISSUES & DEBUGGING.md` (or `/debug-checklist-quick` for a compact checklist).
- TTS in-game verification: `.dev/TTS_MCP.md` — External Editor runs **saved/bundled** Lua; Save & Play before expecting repo edits live.
- Agent workflow: `.dev/DEVELOPMENT_WORKFLOW.md` § Linear, Inbox, Focus.

## 2) Non-negotiables (apply on every change)

| Rule | Detail |
| --- | --- |
| **Single authority** | `gameState` holds intent. Mutate via `S.setStateVal` / `S.setPlayerVal` / domain APIs — never direct `S.state.*`. Reconcilers apply world; setters do not hide reconciliation. |
| **Sync entry points** | After mutation: `Sync.player(color)`, `Sync.full()`, or the domain `reconcile*` that owns the slice. No dual apply (eager domain setter + reconcile without fingerprint prime). |
| **Fail loudly** | No silent fallbacks; no unannotated `pcall`. |
| **Timing** | All delays through `lib/util.ttslua` helpers only. |
| **UI updates** | Targeted attribute/value updates, not full XML refresh, except approved csheet/debug paths in the UI policy doc. |
| **GUIDs** | `lib/guids.ttslua` (`G` table) — not legacy `C.GUIDS.*`. |
| **Global script** | Real logic: `core/global_script.ttslua`; `global/global_script.ttslua` is a require shim only. |
| **Require order** | `lib/constants` → `lib/guids` → `lib/util` → `core/state` → other modules. |
| **Player identity** | Per-player state keyed by **steam_id**; Storyteller = `Black`; PC colors per `C.PlayerColors`. |
| **Minimal diff** | Remove dead code and obsolete shims; update `.dev/` docs in the same change when behavior or public APIs move. |
| **Linear sync** | Part of **done**: In Progress when starting, Done + comment + tasklist `[x]` when finishing; never leave Focus/tasklist/Linear diverged. |
| **Commits** | Only when the user explicitly asks. |

## 3) How to choose work

- If the user **named a task** (e.g. `TOR-135`, “fix weather burst”, “process the inbox”): that is scope — confirm briefly, set Linear **In Progress**, proceed.
- If the user asked **“what’s next”** or did not name a task: read **Focus**, cross-check Linear open **Bugs**, recommend **one** item (usually top Focus row), and wait for confirmation unless they said to start immediately.
- **“Process the inbox”** → follow `.dev/DEVELOPMENT_WORKFLOW.md` § Inbox (Phase 1: `?` in file; Phase 2: promote when every `?` has inline **`Answer:`**).
- For large or resumed work: search prior agent sessions (`ce-sessions`) before contradicting earlier design.

## 4) Your first reply in this thread

Post a **short orientation** (not a wall of text):

1. **Focus snapshot** — top 3 Focus rows + whether any match the user’s intent.
2. **Assumed scope** — one sentence (or ask one clarifying question if ambiguous).
3. **Docs you read** — checklist of the numbered reads above that you actually opened (honest list).
4. **Plan** — 3–5 bullets for the first implementation or triage pass.
5. **Risk callouts** — dual-apply, reconciler boundary, or gate policy if relevant.

Then execute unless the user only wanted orientation.

---

*Slash command: `/tr-start` — re-run anytime to re-anchor a long thread on Focus and architecture policy. Run **`/tr-inbox`** first (same or prior session) after capture-heavy testing so Focus and Linear are current.*

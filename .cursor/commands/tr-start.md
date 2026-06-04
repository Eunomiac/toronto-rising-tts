---
description: "Bootstrap a Toronto Rising agent session — Focus, Linear, architecture policies"
---

You are starting (or re-scoping) work on **Toronto Rising**, a Vampire: The Masquerade 5e Tabletop Simulator module (Lua 5.1, `.ttslua` sources). Treat this message as your **session charter**. Do not jump to code until you have read the files below and confirmed scope with the user (unless they already named a specific `TOR-*` issue or task).

**Linear ID context:** Whenever you mention a `TOR-XXX` in chat, include a few words of human-readable context (tasklist/Linear title). Never bare ids alone — e.g. `TOR-135 (NPC cutouts on scene apply)`, not just `TOR-135`. Focus table rows may use the **Why now** column for context.

**Precedence vs priority:** **Focus** and Linear **`blockedBy`** = work order. Linear **Priority** = intrinsic importance — deferral from Focus does **not** mean Low priority. Use **`blockedBy` liberally** for “should complete before” sequencing; **anti-gridlock:** star pattern, short blocker lists, no deferred-peer meshes (see `toronto-rising-linear.mdc`).

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

7. **`docs/solutions/lua-local-function-order.md`** — **READ FIRST among Lua policies.** Top recurring runtime bug: **`local function` before every caller** in the same file (or forward-declare). Causes `attempt to call a nil value` in `Global.*`, `Global.call`, HUD/object handlers; **not caught by `npm run build`**. Always-on: `.cursor/rules/toronto-rising-lua-local-function-order.mdc`.
8. `docs/solutions/lua-pcall-policy.md` — **no `pcall`** in production paths unless annotated necessity + impact.
9. `docs/solutions/lua-wait-api-policy.md` — **no raw `Wait.time` / `Wait.condition` / `Wait.stop`** outside `lib/util.ttslua`; use `U.delay`, `U.waitForCondition`, `U.RunSequence`, etc.
10. `docs/solutions/lua-ui-full-xml-policy.md` — avoid **`UI.setXml` / `setXmlTable`**; prefer `setAttribute`, `setAttributes`, `setValue`, `show`/`hide`. Gate counts are baseline — do not add call sites without review.
11. `.dev/AVAILABLE_FUNCTIONS.md` + `lib/util.ttslua` — **reuse existing helpers** (`U.map`, `U.filter`, `U.Type`, …) before writing new ones.

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
| **Lua local order** | **#1 nil-call bug:** `local function` **above** every caller in the same chunk (or forward-declare). Pre-flight: grep helper vs caller line numbers. Not caught by build. See `lua-local-function-order.md` + `toronto-rising-lua-local-function-order.mdc`. |
| **Player identity** | Per-player state keyed by **steam_id**; Storyteller = `Black`; PC colors per `C.PlayerColors`. |
| **Minimal diff** | Remove dead code and obsolete shims; update `.dev/` docs in the same change when behavior or public APIs move. |
| **Linear sync** | Part of **done**: In Progress when starting, Done + comment + tasklist `[x]` when finishing; on gate-close (**Focus** / **Deferred** / **`blockedBy` prerequisite**), run **deferred resurfacing** (unblock dependents, propose 1–3 labeled resurfacing candidates in comment or chat). Never leave Focus/tasklist/Linear diverged. |
| **Commits** | After every logical unit of work — **without asking**. Never prompt “want me to commit?”; the answer is always **yes**. Reference `TOR-XX` in the commit body. See `.cursorrules` § Git Commits and `.dev/DEVELOPMENT_WORKFLOW.md` § Regular Commits. |

## 2b) Agent chat title (Cursor)

**Agents cannot rename Cursor agent chats programmatically.** Cursor auto-titles threads from early messages; a chat that opens with only `/tr-start` often becomes an unhelpful generic title (e.g. “Start command discussion”).

**Mitigation:**

1. **Do not** treat orientation boilerplate as the “name” of the session — wait until a **`TOR-*` issue is grabbed** (Linear **In Progress** + confirmed scope).
2. **Immediately after** scope is confirmed and the issue is **In Progress**, add **one line** to your reply asking the author to rename the chat in the sidebar to: **`TOR-XXX — short title`** (use the Linear/tasklist label, not a bare id).
3. **Prefer** starting with issue context when possible: `/tr-start TOR-138 soundscape resync after load` — still rename manually after confirm; auto-title may stay generic.
4. **`/tr-inbox` handoff** should name the recommended next `TOR-*` so the follow-up `/tr-start` message can include it.

## 3) How to choose work

- If the user **named a task** (e.g. `TOR-135` NPC cutouts, “fix weather burst”, “process the inbox”): that is scope — confirm briefly with labeled id, set Linear **In Progress**, proceed.
- If the user asked **“what’s next”** or did not name a task: read **Focus**, cross-check Linear open **Bugs**, recommend **one** item (usually top Focus row), and wait for confirmation unless they said to start immediately.
- **“Process the inbox”** → follow `.dev/DEVELOPMENT_WORKFLOW.md` § Inbox (Phase 1: `?` in file; Phase 2: promote when every `?` has inline **`Answer:`**).
- For large or resumed work: search prior agent sessions (`ce-sessions`) before contradicting earlier design.

## 4) Your first reply in this thread

Post a **short orientation** (not a wall of text):

1. **Focus snapshot** — top 3 Focus rows (issue + **Why now**) + whether any match the user’s intent. If citing ids outside the table, add short labels.
2. **Assumed scope** — one sentence (or ask one clarifying question if ambiguous).
3. **Docs you read** — checklist of the numbered reads above that you actually opened (honest list).
4. **Plan** — 3–5 bullets for the first implementation or triage pass.
5. **Risk callouts** — dual-apply, reconciler boundary, or gate policy if relevant.
6. **Chat rename** — once scope is confirmed and Linear is **In Progress**, one line: ask the author to rename this chat to **`TOR-XXX — short title`**. Skip only if the user already renamed it or the thread title already matches the issue.

Then execute unless the user only wanted orientation. **Commit** after each logical unit without asking for permission.

---

*Slash command: `/tr-start` — re-run anytime to re-anchor a long thread on Focus and architecture policy. Run **`/tr-inbox`** first (same or prior session) after capture-heavy testing so Focus and Linear are current.*

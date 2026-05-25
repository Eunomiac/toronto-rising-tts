# Inbox — quick capture (bugs, intents, ideas)

**Dump one-line notes while testing or mid-task.** No templates. Prefixes and module tags are optional — the triage agent infers type and domain when you say **“process the inbox”**.

**Authoritative tracking lives elsewhere:**

| When | Where |
| --- | --- |
| Quick note (this file) | `.dev/INBOX.md` |
| Scheduled / shaped work | Linear `TOR-*` + [RUNNING TASKLIST.md](RUNNING%20TASKLIST.md) |
| Implementation truth | Code + `.dev/` docs |

**Agents:** [DEVELOPMENT_WORKFLOW.md § Inbox capture & triage](DEVELOPMENT_WORKFLOW.md#inbox-capture--triage). Always-on: [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc).

---

## How to capture (human)

Add a single line under **Active** (any subsection, or pick Bugs / Intents / Ideas if you like). Examples:

```markdown
- weather ducking stuck after site change
- [bug] roll camera jumpy
- centralize seat light modes in C.LightModes
- ST rolls for NPCs from dice panel
```

Optional hints: `[bug]`, `[intent]`, `[idea]`, `[dice]`, `[lighting]`, … — never required.

**You do not** create Linear issues or tasklist bullets. The triage agent promotes clear items (Backlog and/or RUNNING TASKLIST) based on its assessment.

**Fix in <5 min while already in code?** Fix → commit → Linear **Bug** retroactively. Skip the inbox.

**Do not use GitHub Issues** — Linear is primary.

---

## Active

_One-line captures. Triage agent moves processed items to **Processed**; unclear items go to **Needs clarification**._

### Bugs

<!-- - one line -->

### Intents (planned changes, refactors, direction)

<!-- - one line -->

### Ideas (new features, design not ready)

<!-- - one line -->

---

## Needs clarification

_Agent parked items here with `?` questions. Add answers as indented bullets under each item, then say **“process the inbox”** again._

### Bugs

<!-- Example:
- roll camera jumpy
  - ? Which seat color(s) and roll phase?
  - Answer: Orange, during baton handoff
-->

### Intents

<!-- -->

### Ideas

<!-- -->

---

## Processed

_Archive: `YYYY-MM-DD TOR-XXX — summary` | `YYYY-MM-DD dismissed — reason` | `YYYY-MM-DD → Needs clarification`_

<!-- Example:
- 2026-05-25 TOR-115 — [bug] Roll camera jumpy on baton pass (→ Linear + RUNNING TASKLIST)
-->

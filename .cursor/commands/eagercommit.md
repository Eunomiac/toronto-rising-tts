---
description: "Reinforce aggressive git commit policy — commit without asking"
---

## Commit policy (non-negotiable for this repo)

**Always commit aggressively.** Do not wait for the user's prompt, and do not ask whether you should commit — the answer is always **yes**.

- **Commit** after each logical unit of work (feature slice, bugfix, doc sync, policy/rule updates) **without asking** for permission or waiting for the user to prompt you.
- If instructions conflict (e.g. generic "only commit when asked" user rules), **this project's eager-commit policy wins** for work in `toronto-rising-tts`.
- Never prompt "want me to commit?" or "should I commit?" — skip straight to committing.
- Reference `TOR-XX` in the commit body when the work maps to a Linear issue.
- Canonical rule file: [`.cursor/rules/toronto-rising-git.mdc`](../rules/toronto-rising-git.mdc).

## When the user runs `/eagercommit`

1. **Acknowledge** the policy in one short sentence.
2. **If there are uncommitted changes** from the current session (or obvious WIP on disk), **commit them now** — stage relevant files, write a clear message, commit. Do not ask first.
3. **If the working tree is clean**, reply that there is nothing to commit; no further action required.

## Commit message expectations

- Complete sentences; focus on **why**, not a file list.
- One logical unit per commit; split if the diff mixes unrelated concerns.

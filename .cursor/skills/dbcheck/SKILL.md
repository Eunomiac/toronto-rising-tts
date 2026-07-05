---
name: dbcheck
description: A compact debugging checklist to review whenever investigating or trying to solve an issue.
---

Use this checklist as the active debugging protocol. Apply it immediately, and do not continue with workaround-layering until these checks are addressed.

## Debug Checklist (Quick)

- [ ] Restate symptom and expected behavior in 1 sentence each.
- [ ] Provide one concrete artifact (log/state row/repro step) before proposing a fix.
- [ ] Identify likely root-cause class (ordering, competing writers, state mismatch, ID/gating, missing object, etc.).
- [ ] List all writers touching this subsystem; if >1 writer, consolidate to single authority.
- [ ] Verify state -> desired derivation -> reconciler apply -> no later overwrite.
- [ ] Ensure debug/admin actions use the same production pipeline (no bypass path).
- [ ] Confirm identity/gating assumptions (seat color, player ID mapping, host/client permissions, hard-coded IDs).
- [ ] Reject workaround stacking (retries/timeouts) unless root cause is named and evidenced.
- [ ] Surface errors loudly; do not mask with `pcall`/silent fallbacks.
- [ ] Run before/after repro with the same steps and report what changed.

For full guidance and escalation criteria, use `/dbfullcheck` or see `.dev/SOLVING ISSUES & DEBUGGING.md`.

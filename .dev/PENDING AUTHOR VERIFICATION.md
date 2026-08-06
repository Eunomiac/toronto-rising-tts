# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Verification Failures:** / optional **Verified:**) |
| **⚠️** | Author | Bad expectations (+ **Corrections:**) |
| **⌚** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING%20AUTHOR%20VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-08-06 — PAVE pass: cleared ✅ TOR-462 / 481 / 484 / 449 / 469; TOR-485 ❌⚠️ → follow-up **TOR-486** (⌚)._

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped).

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**.

---

### NPC gameboard (follow-up — not ready to verify)

#### ⌚ TOR-486 — Clear right-click: silent no-op + re-snap misplaced palette tokens

**Status:** Open follow-up (Focus #1). Do not Save & Play for this row until the fix ships.

**How to verify (after fix ships):** Save & Play. Drag some NPC tokens off the control board and/or leave some on the palette but out of their parking slots. Right-click **Clear** — off-board strays should return to palette slots, and misplaced palette tokens should snap to their correct parking positions. Board placements stay. You should get clear feedback even if nothing needed moving. Left-click **Clear** twice within five seconds still confirms and clears the stage.

**Context:** Author ❌⚠️ on TOR-485: right-click Clear did nothing; recovery must also re-position tokens already on the palette. Original recover path skipped on-palette tokens.

**Verification Failures (from TOR-485 pass):** Right-click Clear no-op.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_

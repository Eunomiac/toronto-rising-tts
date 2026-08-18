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

_Last populated: 2026-08-18 inbox — cleared ✅ **TOR-488** (Apply Location blindfold) and **TOR-489** (Compulsion tally). Shipped follow-ups for **TOR-487** (auto-confirm after Take Half + Rouse), **TOR-482** (Daysleep Refresh without a live scene + overlay hide), and **TOR-486** (one token scan on right-click Clear). Those three are ready to re-test. Added **TOR-491** (idle Oblivion-Rouse bag right-click). **TOR-490** was already confirmed in TTS this morning. **TOR-439** remains a multiclient gate (not a solo Save & Play)._

**First:** Save & Play so the table is running this code.

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

---

### Dice

#### TOR-487 — Take Half with Rouse dice auto-rolls (then auto-confirm)

**Status:** Linear **Done**. Follow-up shipped this inbox — please re-test.

**How to verify:** After Save & Play, start a roll for a seated player (Brown is fine) with some normal dice **plus one Rouse die**. Click **Take Half**. The normal dice should vanish, and the Rouse die should toss itself after a short pause — you should not have to pick it up and throw it. After it settles, the roll should **broadcast by itself**. You should **not** see a one-button Confirm prompt. Also try Take Half with **no** Rouse dice: that path should still auto-confirm and broadcast, same as before.

**Context:** First pass: auto-toss worked. Correction: after the Rouse die settles, sole Confirm must auto-resolve (same policy as TOR-328 / TOR-306).

---

#### TOR-491 — Idle Oblivion-Rouse bag right-click auto-rolls a 1-die check

**Status:** Linear **Done**. Pending Save & Play.

**How to verify:** After Save & Play, sit in Purple (the seat with an Oblivion-Rouse bag) with no roll in progress and Hunger below 5. Right-click the **Oblivion-Rouse** bag once. The tray should open, one Oblivion-Rouse die should appear, and it should toss by itself — you should not need to click Open or Roll. After it settles, the usual Oblivion result path should run (Confirm, or Hunger-or-Stain if that choice appears). Left-click the same bag with no roll should still wait for Storyteller Open. At Hunger 5, right-click should still do nothing.

---

### Scenes

#### TOR-482 — Daysleep Refresh gold button

**Status:** Linear **Done**. Follow-up shipped this inbox — please re-test.

**How to verify:** After Save & Play, you do **not** need a live scene. Give a seated PC some Superficial Willpower damage. Open Scenes → Scene Time. On the Years row, click the gold **Refresh** button at the far right. Superficial Willpower should heal (same amount as the session-start heal — up to Resolve or Composure, whichever is higher), and the session-start heal overlay should appear if anyone actually healed. Health should **not** change. The overlay should **hide by itself after a few seconds** (about six seconds, same as when you enter Play). The gold button should stay gold whether or not a scene is live; the green/grey clock-lerp buttons should still recolor as usual.

**Context:** First pass: heal worked with a live scene. Failures: Refresh required a live scene, and the overlay stayed on screen.
---

### NPC gameboard

#### TOR-486 — Clear right-click: re-snap palette tokens + always give feedback

**Status:** Linear **Done**. Follow-up shipped this inbox — please re-test lag.

**How to verify:** After Save & Play, nudge a parked NPC token on the palette so it is off its snap. Optionally also drag a token off the board entirely. Right-click **Clear**. Off-board strays should return to palette slots, and the misplaced palette token should jump back to its parking snap. Stage placements on the control board should stay. You should see a cyan Storyteller message. Right-click **Clear** again with everything already parked: you should still get a message that no strays were found (not silence). Left-click **Clear** should still ask you to click again within five seconds, and the second click should still wipe placements. Note whether the hitch still feels as heavy as before.

**Context:** Behavior already passed. The only remaining complaint was lag. Right-click Clear used to scan all tagged NPC tokens twice (park strays, then re-snap). Those two passes are now one scan. If it still feels slow after Save & Play, treat that as accepted for now — no further squeeze unless something else obvious turns up.
---


## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_

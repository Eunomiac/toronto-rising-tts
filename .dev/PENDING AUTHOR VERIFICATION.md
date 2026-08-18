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

_Last populated: 2026-08-18 — added ready-to-verify rows for the Focus batch (**TOR-489**, **TOR-486**, **TOR-487**, **TOR-482**, **TOR-488**); cleared ⌚ on **TOR-486** now that the fix has shipped. **TOR-439** remains a multiclient gate (not a solo Save & Play)._

**First:** Save & Play so the table is running this code.

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

---

### Dice

#### TOR-487 — Take Half with Rouse dice auto-rolls

**Status:** Linear **Done**. Pending Save & Play.

**How to verify:** After Save & Play, start a roll for a seated player (Brown is fine) with some normal dice **plus one Rouse die**. Click **Take Half**. The normal dice should vanish, and the Rouse die should toss itself after a short pause — you should not have to pick it up and throw it. After it settles, Confirm as usual. Also try Take Half with **no** Rouse dice: that path should still auto-confirm and broadcast, same as before.

---

### Scenes

#### TOR-488 — Apply Location full blindfold with district and site cards

**Status:** Linear **Done**. Pending Save & Play.

**How to verify:** After Save & Play, apply a library scene so something is live on the table. Open the Scenes panel, browse to a **different** site, and click **Apply location + soundscape**. You should get the full scene-transition blindfold: it comes down, the destination district and site cards appear, the location change happens under cover, and the new ambient fades in as the blindfold lifts. Then check the two exceptions: a **skybox-only** Apply (no new site) should still use the short fade, not the full card sequence. Editing a **pending** (blue, not live) library row should still save the location keys without running a full transition.

#### TOR-482 — Daysleep Refresh gold button

**Status:** Linear **Done**. Pending Save & Play.

**How to verify:** After Save & Play, apply a library scene so a scene is live. Give a seated PC some Superficial Willpower damage. Open Scenes → Scene Time. On the Years row, click the gold **Refresh** button at the far right. Superficial Willpower should heal (same amount as the session-start heal — up to Resolve or Composure, whichever is higher), and the session-start heal overlay should appear if anyone actually healed. Health should **not** change. With **no** live scene, that gold button should be grey and clicking it should only give a Storyteller alert. The green/grey clock-lerp buttons should still recolor as usual; this gold button should stay gold when a scene is live, not turn green with them.

---

### NPC gameboard

#### TOR-486 — Clear right-click: re-snap palette tokens + always give feedback

**Status:** Linear **Done**. Pending Save & Play (follow-up to TOR-485).

**How to verify:** After Save & Play, nudge a parked NPC token on the palette so it is off its snap. Optionally also drag a token off the board entirely. Right-click **Clear**. Off-board strays should return to palette slots, and the misplaced palette token should jump back to its parking snap. Stage placements on the control board should stay. You should see a cyan Storyteller message. Right-click **Clear** again with everything already parked: you should still get a message that no strays were found (not silence). Left-click **Clear** should still ask you to click again within five seconds, and the second click should still wipe placements.

**Context:** Author ❌⚠️ on TOR-485: right-click Clear did nothing; recovery must also re-position tokens already on the palette.

---

### Table objects

#### TOR-489 — Compulsion variant tally on first choice

**Status:** Linear **Done**. Pending Save & Play.

**How to verify:** After Save & Play, draw a Compulsion for a seated player and pick one of the four presented cards. In the console, check that player’s tally (use that seat’s color), for example: `lua log(S.getStateVal("playerData", S.getPlayerID("Purple"), "compulsionsTally"))`. You should see the Compulsion type with the chosen variant at 1 and the other three variants at 0. Save the game, reload, and confirm the tally is still there. Returning the selected card to the master deck should **not** add another count.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_

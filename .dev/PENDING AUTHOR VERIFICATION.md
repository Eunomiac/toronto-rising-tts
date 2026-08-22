# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Verification Failures:** / optional **Verified:**) |
| **⚠️** | Author | Bad expectations (+ **Corrections:**) |
| **⌚** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-08-22 evening inbox — cleared author-confirmed overture, dice, featured-track, and seat-dump rows. Added shipped follow-ups still waiting for Save & Play: rain particles, End→Intermission cover settle, catalog load, and Play seat lights. **TOR-439** remains a multiclient gate (not a solo Save & Play)._

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-503 — Catalog load must not crash (no `getTracks` / sheet spam)

**How to verify:** Save & Play so this script is in the table. On load you should **not** see `getTracks` / `attempt to call a string value` in the console, and character sheets should **not** spam `GlobalResolveSheetPlayerID`. The table should finish loading normally. Then from **Intermission**, click **Advance**: Loop should duck, the Session Starter piece should play, and the cover should lift near the end.

**Context:** This is the load-breaker that showed up while testing the Intermission→Play overture. A helper had named its first argument `type`, which hid Lua’s built-in `type()` and stopped the sound catalog (and then Global) from finishing.

#### TOR-502 — End→Intermission cover should finish before table prep

**How to verify:** Save & Play. From **End**, click **Advance**. The full-screen cover should drop and finish fading first. Only after about two seconds should the table and skybox reshuffle happen underneath. You should not see table or skybox work start on a still-visible table in the middle of the fade.

**Context:** Follow-up to **TOR-497**. Table prep now waits on Intermission enter so the cover animation is not hitch-interrupted.

#### TOR-504 — Intermission→Play restores player seat lights

**How to verify:** Save & Play. From **End**, click **Advance** to **Intermission** (the table goes dark under the cover). Then click **Advance** to **Play**. While the cover is still up, or as soon as it lifts near the end of the sting, each occupied player seat should have its normal seat lights on again — not stay black like Intermission. Hunger-4+ seats can still look Hungry. Empty seats can stay off.

**Context:** Follow-up to **TOR-497**. Intermission turns seat lights off; Play was only applying the outdoor dim ambient and never switching the seat-light objects back on.

---

### Dice

#### TOR-492 — Queue roll-result broadcasts so each plays the full six seconds

**How to verify:** Save & Play. Sit two seats (or use the same seat twice if that is easier). Right-click idle **Rouse** so two checks auto-toss and auto-confirm in quick succession. You should see the first result for about six seconds, a short fade, then the second for about six seconds — not a flicker of only the last roll. One ordinary Confirm should still look like today: one message, about six seconds, then it fades away.

#### TOR-493 — Concurrent idle-bag auto-Rouse checks

**How to verify:** Save & Play. Sit two different player seats. Right-click idle **Rouse** (or one Rouse and one Oblivion-Rouse) on both seats in quick succession. Both checks should toss. You should then see the first fullscreen result for about six seconds, a short fade, then the second. Right-click the same seat’s Rouse bag twice very quickly: only one check should start. Start an ordinary Standard roll on one seat, then try an idle Rouse right-click on another seat while that Standard roll is still going. The Rouse shortcut should still do nothing until the Standard roll is confirmed.

---

### Sound / debug

#### TOR-498 — Outdoor rain particles follow weather audio

**How to verify:** Save & Play so this script is live. Apply an **outdoor** site with **light rain**, then with **heavy rain**, then with a **thunderstorm**. The rain particles should match the rain strength and the wind band (none / low / med / max) at the same time the weather audio changes — including while the cover is still down during a staged Apply. Then apply an **indoor** site (or a silent site): particles should go to none, even if rain audio is still stored and ducked. Apply a location with **no rain**: particles should stay off.

**Context:** Snow and other weather particles are not part of this check.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

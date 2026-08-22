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

_Last populated: 2026-08-22 inbox — added shipped dice/sound/phase work still waiting for Save & Play. **TOR-439** remains a multiclient gate (not a solo Save & Play)._

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-497 — Intermission→Play 71-second session-start piece

**How to verify:** Save & Play so this script is in the table. From **End**, click **Advance**. The full-screen cover should drop immediately; table prep happens underneath; Intermission loop music should start as usual. Then from **Intermission**, click **Advance**. Loop should duck in about half a second, and the new 71-second piece should start at once at full volume, with no Main playlist underneath. The cover should lift about two seconds before the piece ends. After it finishes, Main should fade in, and the Willpower heal overlay can appear if anyone needed Superficial Willpower.

**Context:** Pair this with **TOR-501** (Advance wait past 60 seconds) on the same Intermission→Play click. If the sting is silent, check the Music C object (GM Notes `SOUNDSCAPE_MUSIC_C`).

#### TOR-501 — Intermission→Play cover must lift (no 60-second timeout)

**How to verify:** Save & Play. If you are still in Play with the cover stuck from a failed earlier run, Save & Play again (or Advance to Spotlight, then back through End → Intermission) so you are in Intermission. From Intermission, click **Advance**. The 71-second piece should play through. You should not see `chainWait timeout (60s)` in the console. The cover should lift about two seconds before the piece ends. After the piece, Main should fade in and the Willpower heal overlay can appear.

**Context:** Follow-up to **TOR-497**. The Advance sequencer used to abort at 60 seconds while Play still needed ~69 seconds before lifting the cover.

---

### Dice

#### TOR-492 — Queue roll-result broadcasts so each plays the full six seconds

**How to verify:** Save & Play. Sit two seats (or use the same seat twice if that is easier). Right-click idle **Rouse** so two checks auto-toss and auto-confirm in quick succession. You should see the first result for about six seconds, a short fade, then the second for about six seconds — not a flicker of only the last roll. One ordinary Confirm should still look like today: one message, about six seconds, then it fades away.

#### TOR-493 — Concurrent idle-bag auto-Rouse checks

**How to verify:** Save & Play. Sit two different player seats. Right-click idle **Rouse** (or one Rouse and one Oblivion-Rouse) on both seats in quick succession. Both checks should toss. You should then see the first fullscreen result for about six seconds, a short fade, then the second. Right-click the same seat’s Rouse bag twice very quickly: only one check should start. Start an ordinary Standard roll on one seat, then try an idle Rouse right-click on another seat while that Standard roll is still going. The Rouse shortcut should still do nothing until the Standard roll is confirmed.

#### TOR-500 — Hide player roll panel on idle Rouse / Oblivion-Rouse right-click

**How to verify:** Save & Play. With no live roll, right-click the **Rouse** bag. The die should toss and the fullscreen result should appear, but the player roll-control panel (Roll / Take Half / Cancel) should stay hidden the whole time. Repeat on the **Oblivion-Rouse** bag at Hunger 4 or lower. A normal left-click Rouse that the Storyteller Opens should still show the player panel as usual.

#### TOR-499 — Hunger-5 failed Rouse auto-opens Frenzy at Difficulty 4, no Cancel

**How to verify:** Save & Play. Sit a player at Hunger 5. Fail a standard Rouse so Hunger would go past 5. After that Rouse result finishes, a Frenzy Resist roll should appear already opened (you should not need the Storyteller to click Open), with Difficulty 4, and the player should have no Cancel button. Clicking Frenzy from the PCs panel yourself should still behave like a normal player-started roll.

---

### Sound / debug

#### TOR-494 — Featured tracks fade out location ambience

**How to verify:** Save & Play. Apply **Ravenwing** so you hear the nightclub location bed. On the Sounds panel, start a featured track. The nightclub bed should fade out under the song; weather can stay. Let the song finish, or press **Stop feat.** The nightclub bed should fade back in. Optionally repeat at a site that uses Main playlist music: that music should still duck and return as it did before.

#### TOR-496 — Seat-role offset dump for player-positioning capture

**How to verify:** Save & Play so the new Global script is in the table. Make sure the External Editor / tts-bridge is listening (same as other debug file dumps). In the TTS console run `lua DEBUG.dumpSeatRoleOffsets("Red")`. You should see a console line with a role count, and a file at `.dev/.debug/debug_logs/seat_role_offsets_RED.lua`. Repeat with `"Pink"` and `"Purple"` if you want extras. Hidden objects may dump `defaultY = -200`; that is expected. If no file appears, the console will say the write failed because the bridge is not listening.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

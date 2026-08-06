# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks for agents** (prefix the `####` header): **✅** confirmed · **❌** still broken (+ **Verification Failures:** / optional **Verified:**) · **⚠️** bad expectations (+ **Corrections:**). Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING%20AUTHOR%20VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-08-04 — Linear Done scan plus RUNNING TASKLIST “Pending…” / “still pending Save & Play” / recent Done without author confirm. Prefer tasklist + Done-this-cycle notes over stale Linear description text (many Done issues still say “Pending Save & Play” after you already confirmed)._

### High — session / join / first-load

#### TOR-469 — Scene transition lead-in and camera snap timing

**How to verify:** Save & Play so the updated blindfold script loads. Apply a library scene that has both a District and a Site. Watch the transition: the blindfold art should sit alone for a few seconds, then the district and site cards should fade in as before. You should **not** feel a camera snap during those early fades — the default camera should wait until later, when the heavy table/scene work runs under the blindfold. When the blindfold finally rises, the new scene’s music and ambience should already be at the right volumes. Also End a live scene once and confirm that path still feels smooth (no destination cards on End).

**Context:** Lead-in pushed from 4.5s to 5.0s so the site card gets more FadeIn time before ambient fade-out / Sync. Default camera moved out of the early +1.5s slot into the heavy-work step.

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped).

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**.

#### ✅ TOR-384 — Global HUD missing on first save load

**How to verify:** From the Tabletop Simulator main menu, load into the chronicle save (a fresh load, not a reload of an already-open session). Confirm that the Storyteller / player global HUD appears on that first load without needing File → Load a second time, and that Intermission music / ambient still starts. In the console you may see a line about the Global HUD canary missing and remounting; you should **not** see a two-minute `chainWait:timeout` stuck on `startup-ready-ensure-global-xml`.

**Context:** First recovery attempt waited on `UI.loading` before remounting; on a cold load that flag stayed true, so the gate never remounted and timed out after 180s. Fix: remount as soon as the canary is missing, even while `UI.loading` is true.

#### ✅ TOR-449 — Scenes preview deselect and THERE close guard

**How to verify:** In the Scenes panel, select a library row so the blue pending preview is active, then close the panel, reload the save, or run a scene transition — the pending preview should clear and you should be editing the live (green) scene again. While THERE mode is active on the Control Board, closing the Scenes panel should be blocked (with a Host/Black broadcast telling you to resolve THERE first). When you End a live scene, that scene should be **deselected** in the library (no row highlighted as the active edit target) — End is leaving the table with no live scene, not leaving a “preview of the scene you just ended.”

**Context:** Done this cycle; still pending Save & Play. Linear Done comment already matches End-clears-`activeKey`; an older **TOR-365** note about keeping the ended row selected is obsolete.

---

### Scenes / clock (2026-07-19 batch — still pending)

#### ⚠️ TOR-402 — Skybox-only Apply Location

**How to verify:** On the Scenes panel, change only the skybox (leave District and Site empty or unchanged) and press Apply Location. The skybox should update without the panel insisting you pick a District/Site first.
**Corrections:** The global blindfold should come down immediately upon triggering an independent skybox change, but only briefly: blindfold comes down -> sufficient wait for blindfold fade-in duration animation to complete -> apply new skybox -> hide blindfold two seconds after it finished fading in (i.e. two seconds of active blindfold is all we need for a skybox transition).  Otherwise, the ability to switch skyboxes independent of Site/District is functioning as it should.

#### TOR-403 — Clock lerp control id parse

**How to verify:** On Scene Time, click the minute / hour / day (and related) lerp delta buttons. They should advance or rewind the narrative clock without a console error about being unable to parse the clock lerp control.

#### TOR-404 — Advance yields so the toolbar can close first

**How to verify:** With the Storyteller toolbar open, press Phases **Advance**. The toolbar should visibly close before the rest of the phase work continues, without a long hitch where the close animation waits until everything else is done.

#### TOR-405 — Close ST toolbar before clock lerp

**How to verify:** Start a Scene Time clock lerp (delta button, dusk/dawn, or year Go) while the Storyteller toolbar is open. The toolbar should close first, the same way it does before a scene Apply, and then the lerp should run.

#### TOR-222 — Animated Scene Time lerp grids

**How to verify:** Exercise the full Scene Time grids (minutes, hours, days, weeks, months, dusk/dawn, year Go). Confirm the clock eases forward or backward and settles into the expected narrative time. Parsing and toolbar-close fixes for that flow are covered by **TOR-403** and **TOR-405**.

#### TOR-470 — Clock lerp overlay-only ticks + DEBUG tick rate

**How to verify:** Save & Play. With a live scene on the table, run a Scene Time lerp (for example +1 hour). While it animates, only the center overlay date and time should scrub — you should not see heavy UI churn on the closed Scenes panel. When the lerp finishes, weather and the Scene Time fields should match the settled clock if you reopen Scenes. Then in the console try `lua DEBUG.setClockLerpTickSeconds(0.05)`, run another lerp and compare smoothness; try `lua DEBUG.setClockLerpTickSeconds(0)` or `"frame"` for every-frame; reset with `lua DEBUG.setClockLerpTickSeconds(nil)`.

**Context:** Mid-lerp used to rewrite closed panel month buttons and inputs every tick at 0.25s. Now ticks are overlay text only; panel/weather/Sync stay on settle. Default tick is still `C.CLOCK_LERP.tickSeconds` (0.25) until you pick a keeper via DEBUG.

---

### Debug chrome (INBOX re-open under test)

#### TOR-394 — Debug last-load clock label

**How to verify:** Load the save, open the DEBUG / admin controls panel, and confirm the last-load time under the DEBUG heading shows a sensible `HH:MM AM/PM` for when this session loaded. If the label was blank when the panel first opened before, it should appear now when you open the panel.

#### TOR-396 — Debug toolbar vertical offset

**How to verify:** Open the DEBUG toolbar and check that it sits about 100px lower than the old position (offset moved so it is easier to reach / less overlapping). Twirl-down behavior for the body should be unchanged.

---

### NPC / gameboard smoke

#### TOR-423 — npc_gameboard module split

**How to verify:** Save & Play so the split `npc_gameboard_*` siblings load. Smoke Control Board Apply and Clear, drop an NPC token onto a stage snap, and confirm seating / placement still works with no nil-call or missing-module errors in the console.

#### TOR-238 — Hover token → stage figurine spotlight preview

**How to verify:** Bind and hold the **Spotlight NPC (hold)** game key, then sweep the cursor over NPC control tokens on the Control Board. The matching stage figurine should briefly enter spotlight, and the Storyteller board indicator should follow the token, without writing lasting game state. Release the key and the preview should end.

#### TOR-413 — Group relocate keeps close family together

**How to verify:** With group-move held, relocate a Mid Center family toward CENTER (or another close family move that used to leave siblings behind). All tokens in that family should travel and re-seat together rather than stranding one member.

#### TOR-414 — Group flip and palette token scale

**How to verify:** Drag an NPC token from the palette onto a stage ring and confirm it keeps that ring’s token scale (not reset to the tiny default). While holding group-move, flip one token and confirm sibling faces in the family match the flipped token’s face. Follow-ups for family/face/Y/stage light are still tracked under open **TOR-419**.

---

### Recent UI Quick Fixes (Done — no author confirm logged)

#### TOR-460 — Character sheet right-click → dice tray camera

**How to verify:** At a PC seat, left-click the character sheet inner-edge control as usual — it should still snap the camera to the sheet. Right-click that same control — the camera should move to that seat’s dice tray view instead.

#### TOR-461 — Map / Court / Coteries mutual exclusivity

**How to verify:** From the right sidebar, open Map, then open Court or Coteries — Map should close. Open Map again while Court or Coteries is open — those panels should close. Only one of Map / Court / Coteries should be open at a time.

#### TOR-100 — Pink Tarot camera on activate / hide

**How to verify:** Activate the Pink Tarot deck — Pink’s camera should go to the dice-tray style view used for Tarot. Hide the Tarot deck — Pink’s camera should return to the default seat view.

#### TOR-453 — Scene Time present day when nothing is selected

**How to verify:** Clear or avoid a Scenes library selection so no pending/live library row is driving the clock. Scene Time should show / behave as present day (blank or present-day presentation as designed) rather than a stale selected-scene time.

#### TOR-452 — Compulsion with companion tray

**How to verify:** Draw and resolve a Compulsion while a companion / famulus tray is in play for that seat. The Compulsion flow should complete cleanly with the companion tray present (no missing UI, stuck camera, or broken select/remove).

#### TOR-450 — Location and camera popouts stay fully opaque

**How to verify:** Open a location or camera popout from the HUD. It should stay fully opaque at rest and on hover (no idle fade to translucent), and you should still be able to click through its interactive targets.

#### TOR-451 — Right-sidebar button tint

**How to verify:** Watch a right-sidebar toggle at rest (middling grey), on hover (white), and while its panel is open / active (deep red). The three states should be easy to tell apart.

---

## Possibly stale Linear “pending” text (do not treat as owed)

These Linear **Done** descriptions or comments still say “Pending Save & Play”, but RUNNING TASKLIST **Done this cycle** (or domain bullets) already record **author confirmed**. Clear the Linear wording when convenient; **do not** block a play session on them.

Examples: **TOR-446** (remove FirstPerson on blindfold), **TOR-447** (Tarot shuffle on activate), **TOR-436** (blindfold parent), **TOR-428** / **TOR-430** / **TOR-438** (join Defer controls + timing API), **TOR-406**–**TOR-412**, **TOR-425**, **TOR-204**, **TOR-244**, **TOR-281**, and older June soundscape/gameboard Done issues (**TOR-268**–**TOR-270**, **TOR-274**–**TOR-277**, and similar) where the tasklist already says author confirmed.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_

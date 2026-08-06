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

_Last populated: 2026-08-06 — author chat confirmed TOR-418 / TOR-419 / TOR-459; TOR-459 removed from Outstanding._

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped).

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**.

---

### UI / map / phases (shipped — need Save & Play)

#### TOR-462 — Map sidebar idle art (empty audience → Blue sentinel)

**How to verify:** Save & Play. Open the map. Overlay (left) and district (right) buttons should show **inactive** art by default — not the active art stacked on top. Hover one button: only that button’s hover chrome for you. Click an overlay on: only that button shows active chrome; click off → idle again. Optional: with two seats, one player’s active/hover should not appear on the other seat’s map view.

**Context:** Empty audiences now use unused seat `Blue` as a hide sentinel (`U.VISIBILITY_EMPTY_SENTINEL`), not TTS team `None`. Follow-up after an earlier visibility-only attempt still looked permanently active.

#### TOR-481 — ST toolbar + debug hotkeys replace twirldowns

**How to verify:** Save & Play. Options → Game Keys — bind **Storyteller toolbar (toggle)** and **Debug panel (toggle)**. Press each key — toolbar / debug should open and close. The old ► buttons should be gone. Open debug once and confirm the last-load clock line still appears. Open a ST panel tab, then close it — toolbar body should still collapse (TOR-395).

---

### NPC gameboard (shipped — need Save & Play)

#### TOR-484 — Group-move onto occupied family auto-evacuates

**How to verify:** Save & Play. Put a few NPC tokens on one Far or Mid family. Hold **Group move**, then drop another family’s tokens onto that occupied family. Expect: old occupants jump to the first empty priority family (dark side); movers take the destination. Fill every priority family, then group-move onto one more occupied spot — expect overflow occupants to park on the palette face-up.

#### TOR-485 — Clear right-click recovers stray tokens

**How to verify:** Save & Play. Drag some NPC tokens off the control board (not onto the palette). Right-click **Clear** — those tokens should return to their palette slots; board placements stay. Left-click **Clear** twice within five seconds — still confirms and clears the stage as before.

---

### Scenes (shipped — need Save & Play)

#### TOR-449 — Scenes preview deselect + THERE close guard

**How to verify:** Save & Play. With a pending (blue) library row selected, close Scenes — pending should deselect and the green live row should return. Switch to THERE, try to close Scenes — should block with an Alert. Apply while THERE. End a live scene — library selection should clear (no leftover preview of the ended scene). Save & Play while THERE should restore HERE.

#### TOR-469 — Scene transition lead-in + camera in heavy work

**How to verify:** Save & Play. Apply a library scene with district + site cards. Watch the early blindfold fades and confirm the default camera snap does not hitch early during lead-in (camera should move in the heavy-work window). Audio timing was re-checked under **TOR-476** (author confirmed) — this row is mainly lead-in length and camera placement.

**Context:** Audio silence-after-lift was fixed and author-confirmed as **TOR-476**.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_

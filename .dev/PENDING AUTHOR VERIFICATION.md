# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Issues listed here should be **Awaiting Author Review** in Linear.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment:**) |
| **⏰** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |
| **🚫** | Author | Irrelevant or obsolete - feature being tested is to be replaced by the Storyteller Dashboard; follow-up validation of this issue can be discarded (see **Author Comment**s for more details on how to handle the Linear issue) |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row and set Linear to **Awaiting Author Review** whenever they ship in-game code. They process your **✅** / **❌** / **⚠️** marks on the next inbox. A **✅** moves the Linear issue to **Fully Complete** by default, or **Complete (KEEP)** when its Linear history should be retained. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-10-02 — confirmed rows removed (TOR-634, TOR-92, TOR-636, TOR-635, TOR-632). Bugged rows left in place._

### Scatter / table layout

#### ⏰ TOR-602 — Scatter Mode player HUD (group strip + click-to-move)

The group strip and click-to-move checks passed on 2026-10-01. Do not re-test until **TOR-641** (Scatter table change turns off every character sheet page) has shipped.

**How to verify:** Save & Play. On a normal table, leave at least one character-sheet page open (and another page off, if you want the contrast). Switch the table to Scatter. The pages that were open should still be open. Pages that were off should stay off. The group strip from the earlier check should still work.

**Context:** Author check: almost everything in the Scatter player HUD was right, except every character sheet turned off. relatedTo **TOR-572**.

### Memoriam

#### ❌ TOR-101 — Memoriam runtime apply (enter / exit)

**How to verify:** Save & Play so scripts and Global XML reload. Confirm Custom Assets include names like `memoriamBlindfold_rashid7` (Cloud sync job `memoriamBlindfolds`).

1. ✅ **Real period Advance:** During Play, open Phases → Memoriam, pick a PC, pick a scene panel (not Just Smoke), set assignments if you like, click Advance. The global cover should show that period’s Memoriam blindfold art. Under the cover you should land on Table B0, the subject at seat 1, overlay showing the Memoriam location string (no site/weather row), a night clock on the Memoriam date, and the chosen panel skybox. Hunger should be unchanged; Health and Willpower should be full for PCs present as themselves.
2. ❌ **Just Smoke:** Same flow but click Just Smoke then Advance. Host console should print `[Memoriam] …` and the world/subphase should **not** change.
**Author Comment:** There is no "Just Smoke" option to select.  Additionally, any attempt to set the time slider in a "gap" that doesn't have a defined time period throws an error when I click "Advance" -- this is the situation where "Just Smoke" should be assigned automatically, and a standard global blindfold transition (i.e. without a memoriam splash image) should be shown as we transition to the new scene.
3. ✅ **Exit restore:** Start Memoriam from an applied library scene, then click Main (or Downtime). You should return to that library scene (flushed evolving data). Start Memoriam with no live scene, then exit: Downtime + no-scene baseline.
4. ✅ **Scene Apply while Memoriam:** Apply a library scene with NOW — time should use the clock from just before Memoriam began, not wall present-day. End Scene while Memoriam should clear Memoriam and apply the usual no-scene End path.
5. ✅ **Re-select:** While already in Memoriam, open Memoriam again, pick a different period, Advance — new blindfold/world apply without dropping the original return-scene memory until you finally exit.

**Context:** Catalog `blindfoldURL` removed. PC-as-NPC sheet swap still TOR-95; LUT/sepia still TOR-321.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

### Players & Connection

#### TOR-631 — Seat occupancy by connection: disconnected players' seats, hands and cards

**Merged:** TOR-512 (Absent off restores the full seat pile), TOR-513 (Absent hand zone and PC token stash) and TOR-633 (sheet pages come back with the seat) are folded in here. TOR-630 (Scene Apply clears Absent) is canceled as superseded.

**How to verify:** Save & Play so the new scripts load. The Debug panel should read green **Assume Connected**, and every PC should be seated. To "disconnect" a player, click their **Connected** button on the PCs panel so it reads **Disconnected**. Clicking it again reconnects them.

1. **Darken only.** Put a few cards in Red's hand, and put one other card into Red's storage bag yourself (this one should stay in the bag throughout). Disconnect Red. Red's seat should go dark, but the chair, sheet, hand and cards stay at the table.
2. **Park at the blindfold.** Advance a phase (or apply a scene, or change the table). Under the blindfold, **every** Red seat object should go under the table: figurine, sheet pages, bags, dice drawer, companion toggles, signal fire, hunger smoke, seat lights, and Red's Prince curtain, signet and border. Red's hand zone goes under the table too, and **the cards that were in Red's hand go into Red's storage bag** (which also goes under the table), with no swoop sound and no cards left behind at the seat. Red's control-board token should sit locked a little beneath the board.
3. **Read the trace.** In the console, look for lines starting with `[HandTrace]`. You should see `Red via pile park: zone y … -> -200.0`, followed by `Red: parked hand zone; N card(s) stashed in storage container`, where N is the number of cards that were in Red's hand. On reconnect you should see `Red: unparked hand zone; dealing N stashed card(s) back`. If anything looks off, copy those lines back to the agent.
4. **Stays parked.** While Red is still disconnected, change the table once, then apply a Scatter scene and leave it again. Nothing of Red's should reappear: no drawer, no Prince items, no bags, no hunger smoke, and no cards drifting back down to the table.
5. **Pink's tarot.** Turn Pink's tarot on (Consult the Tarot), disconnect Pink, and advance a phase. The tarot deck, drawer and button should all go under the table with the rest of Pink's seat. Reconnect Pink. The tarot set should come back still turned on, at Pink's chair.
6. **Reconnect.** Before disconnecting, turn Red's page 2 off and light the signal fire. Then reconnect Red. Red should be seated at once at their usual chair (or the lowest free one), with the full seat back: page 1 showing, page 2 still off, signal fire lit, Prince items in place, and **the cards that were in Red's hand dealt back into Red's fan** at the table. The card you put into the storage bag yourself should still be in the bag.
7. **Control board.** Swap two connected PCs' tokens between chairs on the control board and click **Apply**. Those two players should swap chairs at the table.
8. **Mode switch.** Click the Debug button so it reads yellow **By Connection Status**. Players who are not really connected should only go dark until the next phase advance. Click it back to green, and every PC should be seated straight away.
9. **Reload.** Save and reload. While the game sets up, every PC should be seated, even players who are not connected. Once the console prints **Startup readiness gate complete**, any PC whose player is not connected should lose their chair, following step 2.

**Context:** Whether a PC holds a chair is now decided only by connection; the old Absent checkbox is gone. Full model: `docs/solutions/seat-occupancy-and-connection.md`. Shipped in commits `94e9ec07`, `3696d4cb`, `f170cbba`, `a44df425`, `d083ec49`, `43f0753d` and the storage-bag change (parked hand cards go into the player's storage bag, tagged `StashedHandCard`, and only those come back). Cards left stranded by earlier tests may still carry a `LockedCardRed` tag and be locked; unlock them, remove that tag, and drop them back into Red's hand before testing. The `[HandTrace]` console lines are temporary and will be removed once the floating-cards cause is fixed.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._

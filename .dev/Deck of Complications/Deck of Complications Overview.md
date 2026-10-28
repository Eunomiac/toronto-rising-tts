# Deck of Complications System Overview

## Agent Routing

Read this when:

- implementing or changing the Deck of Complications minigame, its board controls, card import, roll integration, or Storyteller HUD visibility toggle.

Source of truth:

- This document defines the intended behavior and automation scope, including the author's resolved clarifications.
- Google Sheet [The Deck of Complications](https://docs.google.com/spreadsheets/d/11kcsl9vAqWeEBEFFmadMs65xpDqMNV8SkCaCNM_09bU/edit), `Cards` tab, supplies card definitions. Its effect-function columns do not authorize automated effect execution.
- `ui/shared/complications_board.xml` supplies the existing board UI; `lib/guids.ttslua` identifies the board and drawer anchors. The supplied TTS save supplies physical decks, GM Notes, and board snap points.
- Existing integration points: `core/roll_controller.ttslua`, `dashboard/rolls.ttslua`, `dashboard/world_snapshot.ttslua`, `.dev/storyteller-dashboard/src/client/scenesPanel/rolls/RollsCell.tsx`, and `ui/storyteller/hud_storyteller.xml`.
- Follow `AGENTS.md`, `.dev/DOCS_INDEX.md`, and `docs/solutions/lua-hide-restore-policy.md` before implementation.

Verification:

- Check imported card identities against physical-card GM Notes and validate the board's ten card slots and two deck/discard snap points.
- Verify startup, reveal/locking, selection, enhancement, negation, discard/replacement, category filtering, hiding/restoring, and ending a game in TTS.
- Verify both unconfirmed and already-confirmed target rolls, additive margin/result classification, and per-roll checkbox eligibility.
- Verify the five allowed roll types, totals recalculated from cards plus Adjust, enhanced-card discard cleanup, full-board/deck-exhaustion handling, and save/reload of visible and hidden unfinished games. Previously applied roll consequences must not run again.
- Follow `AGENTS.md` for mandatory dashboard browser verification when implementing the start button. Documentation changes alone do not implement these behaviors.

Status: Author-approved behavior specification; the review's open decisions have been resolved. Base system implemented; master-deck cloning and accelerated transfers supersede the original collection/return procedures below. Automated verification passes; live TTS verification remains required.

## Deck of Complications Overview
The "Deck of Complications" is a minigame players can play to make up shortfalls in certain important rolls, most notable Launch rolls for initiating Projects. In general, the game works by randomly dealing ten Complication cards face-down onto a playmat. The player chooses one to turn over, revealing a Complication card, and earning a certain number of successes to add to their roll. After resolving the Complication card, the player can choose another to turn over, or to stop the game and proceed to resolve the roll after adding the successes earned by playing the Deck of Complications.

### Complication Cards
A Complication card consists of:

* **Name:** The name of the Complication card. Names are never duplicated, though multiple copies of each Complication card exist in the deck.
* **Value:** The number of successes added (or, in rare cases, lost) immediately upon revealing this Complication card. This is usually a positive integer, but it can also be a negative integer (lost successes) or an "X", meaning the value depends on the Complication's effect and is handled manually through Adjust.
* **Effect:** A brief rules description of the results of resolving this Complication card, e.g. "Suffer two points of Superficial Willpower damage."
* **Enhanced Effect:** Certain cards and mechanics can "enhance" a Complication card. When a Complication card is enhanced, its Enhanced Effect is applied immediately. Enhanced Effects always apply in addition to the primary Effect, not instead of it (though in some cases the text of the Enhanced Effect will contradict this, by explicitly starting with the word "Instead").
* **Category:** Some (not all) Complication cards have a category. By default, category restrictions apply immediately upon reveal, before the Storyteller resolves the effect. Revealing, for example, a Complication card in the "Debilitation" category removes all other "Debilitation" Complication cards from the deck and from face-down spaces on the playmat. The Auto-Disc/Mults Okay control can disable this restriction.

Effects (and Enhanced Effects) are expansive and varied, and many apply to the Deck of Complications minigame itself. There are effects that modify the rules (such as allowing multiple cards from a Category to be resolved), effects that modify the values of cards, effects that negate cards (removing their effect, but not their value), effects that duplicate cards, effects that force more draws upon the player, and (of course) effects that enhance cards. Because of this, the TTS implementation will need to include a suite of controls that the Storyteller can use to manipulate the Deck of Complications game as it is being played.

### Automation Scope

Most card effects remain manual. The author reviewed the Sheet's **Necessary Automations** column and retained ten entries; those entries, with the clarifications below, define the complete bespoke scope. Cleared cells require no bespoke automation. The Sheet's function sketches are reference data, never executed as code.

The far-right **Automate** button is enabled for a selected board card with a registered handler. Left-click toggles between applying and reversing the effect. Its label reads **Reverse** while an application is recorded. The saved receipt describes the effect actually applied: enhancing or unenhancing the visible card does not change that receipt. Thus the sequence is Apply Standard → Enhance → Reverse Standard → Apply Enhanced. Right-click remains an explicit reverse-only shortcut. Effects are never automatically reapplied on reload. Negate remains a marker-only control, except that it switches Buzzkill's automatic cap off/on. Discarding or ending the minigame does not automatically reverse persistent character/Project effects; the Storyteller controls their removal.

Registered handlers plan saved operations with reversal receipts. Condition changes use the existing Conditions APIs and remain until manually cleared; no duration or one-shot expiry is automated. Restoration preserves pre-existing condition values, and applying mutually exclusive variants ensures only the appropriate variant is active.

| Card | Bespoke behavior |
| --- | --- |
| At Cross Purposes (6) | Randomly choose an in-progress Project owned by another PC. Reduce its die by 2, or 4 when enhanced, floored at zero. Record the Project and actual reduction; reversal restores that reduction on the same Project while preserving later changes. No eligible Project means no application. |
| Blood Rush (7) | Start the existing four-choice process specifically for the Clan Compulsion. Record the source and chosen card. Reversal cancels its pending choice or removes its still-current Compulsion; it never removes a different Compulsion. An existing Compulsion must be resolved first. The enhanced future Messy Critical trigger remains manual. |
| Buzzkill (9) | No Automate handler: while face-up and not negated, cap adjusted margin at zero, including the final outcome. Keep the raw Complications total unchanged. Enhanced draw restriction remains manual. |
| Cognitive Dissonance (11) | Apply `WPRerollLimit2` or enhanced `WPRerollLimit1`, capping each WP reroll even when roll options would otherwise allow more/unlimited dice. |
| Exhausted (17) | Apply `WPRefreshLow` or enhanced `WPRefresh1` to session-start/Daysleep WP healing. |
| Impending Doom (28) | Clone each eligible physical Rare original in the deck, discard pile or board twice, or four times when enhanced; exclude copies already generated by this same source from the source population. Subtract this source's retained face-up copies from the number still needed for each original; remove previously retained copies that have since left face-up board slots before creating the fresh batch. Tag copies by source/root, shuffle them into the deck, and replace all face-down board cards. Reversal destroys its copies except those currently face-up on the board; return all remaining face-down board cards, shuffle, and deal replacements from the top. All temporary copies are destroyed at game cleanup. |
| The Beast Ascendant (52) | Base applies `BestialNullBasicSuccess`: each Hunger 1 cancels a 6–9, normal dice first, then Hunger dice. Enhanced additionally applies `BestialNullCrit`: each Hunger 1 also cancels a non-Hunger 10. The rules never cancel the same die, and physical faces remain unchanged. |
| The Beast Rampant (57) | Apply `NoMessyReroll` or enhanced `ExpensiveMessyReroll`. Respect the existing Auto-WP setting; with it enabled, a Messy Critical reroll costs 2 WP under the enhanced condition. Removal remains manual even for the base one-shot wording. |
| The Beast Scorned (59) | Reuse `noBloodSurge`'s existing activation block. Enhanced additionally applies `NoDisciplineBonus`, omitting the automatically added Discipline Bonus when initiating a Discipline roll. Hiding the Hunger bag is not required. |
| Under the Bus (64) | No Automate handler. Extend Select's Spotlight hover targeting to external face-up Complication cards; Enhance then uses the same replacement rules at that card's position/rotation. External cards never contribute to the minigame total or random selection. Unenhancement restores their originals in place during play. End-game cleanup destroys all loose tagged Complication cards, including these external originals and representations. |

All other damage, XP, Hunger, value changes, forced draws, and narrative effects remain manual through existing controls. A card's `X` value still uses Adjust.

Only the participating player and the Storyteller may perform normal gameplay flips. Other players may observe. Nested effects involving another player drawing and resolving a Complication are handled manually; do not automatically start a second minigame or credit that card to the main game's total.

### Recalculatable Totals

The displayed values must always be derivable from the current game's face-up cards in play plus the Adjust modifier:

```text
complicationsTotal = sum(numeric values of face-up cards in play) + adjustModifier
adjustedMargin = originalMargin + complicationsTotal
if any face-up, non-negated Buzzkill: adjustedMargin = min(0, adjustedMargin)
finalRollDelta = adjustedMargin - originalMargin
```

Count each logical card once. An enhanced replacement represents its underlying original, not an additional contribution; the original concealed beneath it is not counted again. Negated cards still contribute their full numeric value. Face-down cards, discards, source-deck templates, excluded cards, and manually drawn cards outside this game's board do not contribute. `X` contributes zero automatically; the Storyteller uses Adjust to account for it.

Discarding a card automatically removes its numeric contribution and refreshes both totals. This also applies to negative-value cards: removing a -3 card raises the total by 3. The Adjust modifier is independent and is not automatically reversed when a card is discarded; the Storyteller handles any related manual correction. Hiding the game preserves the same logical face-up cards and contributions even though they are temporarily parked off-table.

## Automating a Deck of Complications Game

A game can be started with the click of a button by the Storyteller on the Storyteller Dashboard. Only PC **Launch**, **Goal**, **Standard**, **Willpower**, and **Discipline** rolls are eligible (runtime types `launch`, `goal`, `standard`, `willpowerRoll`, and `discipline`). Show the start button only in an eligible roll's panel and only once its margin is known. Enforce the same eligibility in the command handler. All other roll types are ineligible. This communicates the two pieces of information the Deck of Complications minigame needs to know before it can be started:

* Who is playing the minigame?
* What is the margin of the roll this game is being played for?

The Storyteller may start a game before or after the target roll has been confirmed. Retain the identity of that specific roll throughout the game, including while other rolls are made during an interruption.

The Complications total is a strict additive delta to the target roll's calculated margin; it never changes the dice. The final broadcast must retain both the actual dice-success count and the original Difficulty, while displaying the adjusted margin independently. For example, 3 successes against Difficulty 7 plus a +4 Complications delta displays 3 successes vs. Difficulty 7 and a +0 margin. Reclassify the outcome using the adjusted margin, original dice characteristics, and the target roll type's existing classification rules. In particular, a Failure may become a Messy Critical if its dice would have produced a Messy Critical but originally fell short of the Difficulty. Ending the game automatically confirms the target roll; already-confirmed rolls must also receive the updated margin and outcome.

For an already-confirmed roll, update its margin, outcome, existing history entry, and display without replaying previously applied consequences. Do not spend Willpower again, repeat tracker changes, or retrigger other resolved side effects. Effects already processed before confirmation must likewise not be repeated when finishing an unconfirmed target roll. The new eligibility restriction excludes Rouse, Remorse, and Frenzy rolls altogether; their consequences were examples of side effects, not supported Complications targets.

### Preserved Master Decks

The two source decks are immutable templates during gameplay. On save load, check for exactly one Deck tagged `deckOfComplications` and `masterDeck` without `enhancedComplication`, and exactly one Deck with all three tags. For each uniquely identified master, inspect its first five card metadata entries for valid, nondecreasing numeric indices. Duplicate indices are expected in the ordinary master and are allowed. This is a quick prefix check, not certification of the entire deck. Broadcast failures only to the Storyteller; missing/ambiguous masters prevent starting a new game.

`DEBUG.SortMasterDecks`, also exposed as **Sort Master Decks** in the Storyteller Debug panel, sorts both complete decks in ascending index order with duplicate copies adjacent. Order warnings direct the Storyteller to this function. This explicit repair is allowed to reorder the masters; gameplay never draws from, shuffles, filters, or returns cards to them. Preserve their GUIDs, positions, card counts and settings. The Full-build deck assembler emits both `masterDeck` tags and sorted contents. Finish older active games before rebuilding source decks and reload the patched save from the Games menu.

### Start-Up Automation Sequence

1. Validate and capture the specific target roll; locate the board, participating player's drawer anchor, two unique masters, ten untagged card snaps, and two `deckOfComplications` pile snaps. Save the board's home pose. The greater-x tagged snap is the draw pile; the other is the discard pile.
2. Clone both masters with new object/card GUIDs and remove `masterDeck` from the copies. The enhanced gameplay copy remains unfiltered in hidden storage; the masters remain untouched.
3. Filter the ordinary gameplay copy in one immediate container operation, destroying copies whose roll-type checkbox is unchecked (or whose identity is not imported). There is no recoverable exclusion pile: the originals remain in the master.
4. Instantly move the board to the participating player's drawer anchor, shifted seven world units toward the table origin, at `y = 7.75`, with an extra 180-degree y rotation. Make it visible to everyone.
5. Instantly move the filtered gameplay deck face-down to the draw snap plus two world units in y. Make it visible, unlock it, and shuffle it. If no eligible cards remain, retain an empty game that the Storyteller can end.
6. Set connected players' cameras to `diceTray<Color>` for the participating seat, shifted by the same seven-unit offset. Initialize controls and totals.
7. Deal the physical top ten cards face-down to the ten board snaps in a randomized slot order, with brief stepped delays. Draw only when each deal executes, after the shuffle. An exhausted deck leaves empty slots. Finish by unlocking eligible face-down cards; revealed cards stay locked.

Saved operations make cloning, filtering and dealing resumable without duplicating a gameplay deck. Fixed pauses are limited to a small number of setup operations and visible card steps, not one operation per master-deck card.

Each deal records the chosen top-card GUID before extraction, then waits for that specific object to finish spawning and loading before positioning/locking it and advancing. Dealing must not depend on delivery of a spawn callback. A setup or transfer operation that cannot complete within 30 seconds reports its name (and card slot, when applicable) to the Storyteller; it retains the unfinished operation so Save & Play can retry it. Completed container snapshots are discarded immediately, and the reusable deck template stores only container settings. Advancing/dealing updates the relevant saved fields rather than repeatedly validating every saved card and template.

### Accelerated Deck Modification

Cards already inside the gameplay deck or discard pile move as one group, in a single pile transaction, to their destination: face-down on top of the deck when restored, or face-up on top of the discard pile when excluded by category. Preserve their logical card GUIDs. Face-down playmat cards still return in brief stepped sequence.

After all required removals/returns, shuffle the gameplay deck and deal physical top cards face-down into empty slots. Category removal replaces only affected face-down slots. Category restoration and Impending Doom changes return **all** face-down board cards before shuffling and redealing. This applies to both application and reversal of Impending Doom; revealed retained copies remain in place. The same roll-type eligibility filter always applies. No operation modifies the masters. Any temporary extraction or spawned card/deck awaiting placement uses a staging position outside the world-space envelope of all board snaps, with additional vertical clearance; never stage above the board centre or another card slot.

### Gameplay Sequence
This sequence should activate whenever the participating player or Storyteller flips a face-down card on this game's board over. Card definitions must be imported from the Google Sheet identified above as part of the build process, creating a table available to the minigame script during play. Importing definitions does not execute card effects.

1. **Apply Value:** The value of the Complication card should be applied immediately to both the Complication total and the adjusted margin on the board UI, unless that value is "X".
2. **Apply Category Restriction:** Immediately upon reveal, if Auto-Disc is enabled and the card has a Category, collect all other cards in that category that are face-down on the board AND those in the deck. Move matching piled cards together to the discard pile, face up; move matching face-down board cards in stepped sequence. Then shuffle and replace emptied slots from the top of the eligible gameplay deck, as described in Accelerated Deck Modification. Cards revealed only by moving to the discard pile do not earn value or trigger this gameplay sequence.
3. **Highlight Card:** A cyan highlight should be applied to the flipped card.
4. **Lock Face-down Cards:** All face-down cards should be locked, preventing the player from flipping another card until this one has been resolved.
5. **Lock the Revealed Card:** Allow enough time for its flip animation to finish, then lock the newly face-up card. Face-up cards remain locked during ordinary play, including after enhancement or removal of enhancement; automated moves may temporarily unlock objects as necessary.

The Storyteller resolves effects manually using the controls below. Right-clicking Select finishes this resolution step: immediately deselect the current card, stop any pending selection-hotkey listener, unlock the face-down board cards if further gameplay is available, and return the button to Stop. The player may then flip another card, or the Storyteller may use Stop to end the game. Previously revealed cards remain locked.

### Full Board and Deck Exhaustion

When all ten board cards are face-up, the player cannot choose another card to reveal. Likewise, if the eligible deck runs out, no further player gameplay is possible, even if face-down board cards remain. Do not loop, silently recycle discards, or end the game automatically. Preserve the current cards and totals, prevent further flips, and allow the Storyteller to finish resolving the current card and end the game through Stop and its normal confirmation click. Right-click Select must return to Stop in these cases without requiring another draw or unlocking cards that cannot be played.

If a deal or replacement cannot fill a slot because the eligible deck is exhausted, leave that slot empty and apply the same exhaustion behavior. A missing replacement must not prevent discarding a selected card, updating the total, or reaching Stop.

### End Game Sequence

After the normal Stop/Confirm clicks, capture the final displayed margin and `finalRollDelta` before removing any contributing cards.

1. Instantly destroy both disposable gameplay decks, the discard pile, and all loose Card objects tagged `deckOfComplications`, including enhanced representations, Impending Doom copies and manually drawn external cards. Never destroy a `masterDeck` object. Cleanup also handles an interrupted game that was hidden.
2. Instantly return the board to its saved home position and rotation and restore its Storyteller-only visibility. There is no per-card collection, final shuffle, or return of cards to the masters.
3. Apply the captured `finalRollDelta` to the original target roll and automatically confirm it, preserving its dice and avoiding repeated consequences for confirmed rolls.
4. Clear the live game and remove its HUD hide/show toggle. Persistent character/Project effects are not reversed automatically.

Older saved games retain their original collection/return cleanup until completed, before migrating the source decks to masters.

### Interruptions: Storyteller HUD Hide/Show Toggle

Add a button at the very bottom right of the Storyteller HUD, immediately to the right of the colored seat-change buttons. It is visible only while a Complications game is live, including while that game is hidden.

Each click toggles the game between hidden and revealed. Hide and restore the board, playable deck, discard pile, and all cards belonging to the live game, including enhanced replacements and the originals beneath them. Preserve their positions, rotations, face orientation, lock states, selection, negation markers, and game totals. Both masters stay in their existing storage state, and the disposable Enhanced Deck stays hidden in storage.

Use the existing `O.hideObject` / `O.restoreObject` library functions in Global code, or `GlobalHideObject` / `GlobalRestoreObject` from object scripts, following `docs/solutions/lua-hide-restore-policy.md`. Hiding is not ending the game: do not collect cards, reset state, apply the margin, or confirm the target roll. Restoring resumes the same game. This supports interruptions such as Memoriam; nested card effects remain manually resolved.

### Save/Reload Recovery

Saving and reloading must preserve an unfinished Complications game. Persist its authoritative state in `gameState`, including the participant and specific target roll, original margin and dice/result information needed for final classification, prior confirmation status, Adjust modifier, board-slot/card identities, enhanced-clone/original pairings, negation markers, category mode, selection/resolution state, and whether the game is hidden or unable to continue.

On reload, restore the same game and HUD toggle, reestablish its listeners and control states, and recalculate the displays from the saved card state plus Adjust. Preserve the cards, deck/discard membership, locks, and hide/restore information needed to resume. Do not restart the initial deal, create duplicate enhanced clones, reapply card values as additional increments, or confirm the roll merely because the save was loaded. Recovery must also work when saved while hidden or during a deal, flip, replacement, or other unfinished operation.

## Storyteller Control Panel

The functions of each button on the Storyteller Control Panel are described below. Each button calls the same onClick function: `"onComplicationButtonClick"`. That function will need to determine the action to take based on the `id` of the button element and the mouse button used (left or right).

Random selection operates only on revealed cards in play on the current board. Manual Select also accepts external face-up Complication cards for enhancement, without adding them to board slots or totals. The Select hotkey also supports the face-down replacement action explicitly described below; that action does not select or reveal the replacement. Exclude discards, deck contents, and original cards concealed beneath enhanced replacements from selection. All random-selection modes exclude negated cards, including the entire animated scan. Enhanced replacements participate only in modes that include them. Manually selecting a negated card remains possible so the Storyteller can restore its effect marker or discard it; deselecting it must preserve its red negation marker.

1. **Stop/Select:** Initialize as "Stop" (`text = "Stop", class = "complicationButton yellowButton"`), but change to "Select" (`text = "Select", class = "complicationButton magentaButton"`) when a player flips over a Complication card.
  1.a. **Stop - Left Click:** Set `class` to `"complicationButton redButton"`, `text` to `"Confirm"`, and begin a five-second timer. If the Storyteller left-clicks the same button again within the time window, trigger the End Game Sequence. Otherwise, return the button's `class` to `"complicationButton yellowButton"` and its text to `"Stop"`
  1.b. **Stop - Right Click:** Lock all face-down Complication cards and apply the cyan highlight to the most recent Complication card flipped over, then change this button to "Select" (i.e. returns the game to the resolution phase for the most recently flipped Complication card)
  1.c. **Select - Left Click:** Begin listening for the Storyteller to click his "Spotlight NPC (hold)" action button, or stop listening if clicked a second time. If the button is hovering over a face-up Complication card when it is clicked, remove the cyan color from the currently-selected card, and apply it to the hover-over card, selecting it as the active card, and stop listening. If the button is hovering over a face-down card, shuffle it back into the Complications deck and replace it with a new face-down card, and stop listening. Otherwise, do nothing and continue waiting.
  1.d. **Select - Right Click:** Immediately deselect the selected card, cancel any pending selection-hotkey listener, and unlock all face-down board cards so the player can flip another, unless further gameplay is unavailable under Full Board and Deck Exhaustion. Always restore this button to Stop (`text = "Stop", class = "complicationButton yellowButton"`), even when no further card can be played. Keep revealed cards locked and preserve any red negation marker when removing the cyan selection highlight.
2. **Random:** This button triggers the random selection of a face-up Complications card. When triggered, the cyan highlight should move randomly among all face-up Complication cards, slowing down as it does so, before finally stopping on the newly-selected card.
  2.a. **Random - Left Click:** The scan and final selection should EXCLUDE all Enhanced cards.
  2.b. **Random - Right Click:** The scan and final selection should INCLUDE all Enhanced cards.
  If there are no possible cards to select, the button should do nothing. If there is only one possible card to select, it should be selected immediately without running the animated selection process.
3. **Enhance:** **Hidden** unless a face-up Complication card is currently selected.
  3.a. **Enhance - Left Click:** Read the GM Notes on the Complication card, which will be of the form `<index>:<name>[:Enhanced]`.
    * **If the GM Notes do NOT contain "`:Enhanced`":** Use the matching card snapshot from the disposable Enhanced Deck (GM Notes `<index>:<name>:Enhanced`) to create an enhanced representation; never draw from the enhanced master. Lock the selected Complication card, then apply a `-0.5` unit shift to its y-position (to hide it inside the board). Instantly move the cloned Enhanced Complication card face-up to the same location, make it visible to all players, and lock it. Immediately remove the original’s highlight before burying it and transfer the selection highlight to the Enhanced Complication card as soon as it is placed. Apply this to both board and external cards. Negated cards keep their red marker on the visible representation; concealed originals never retain a highlight. This replaces the visible representation of the same card; it does not count as another reveal or automatically apply effect text.
    * **If the GM Notes DO contain "`:Enhanced`":** Undo the enhancement by destroying the cloned Enhanced Complication, applying a `+0.5` unit shift to the y-position of the Complication card hidden beneath it, and selecting the restored original. Keep that face-up card locked. Enhancement changes preserve the card's negation state and do not automatically change its credited value.
  3.b. **Enhance - Right Click:** Run the random selection process (described above for the "Random" button), except INCLUDE ONLY the Enhanced cards.
4. **Negate:** **Hidden** unless a face-up Complication card is currently selected.
  4.a. **Negate - Left Click:** Toggle the selected card's negated marker and red highlight. Red indicates that its effect has been negated; removing red indicates that its effect has been restored. Do not change its value or `complicationsTotal`, and do not execute or reverse its registered effect. Normally `adjustedMargin` also stays unchanged; Buzzkill is the explicit exception, since its automatic cap follows the negation marker. The Storyteller handles effects and any desired value correction manually with Adjust. Negated cards are excluded from every random-selection mode.
  4.b. **Negate - Right Click:** Discard the currently selected card, automatically remove its numeric contribution from the total, and update both displayed totals from the remaining face-up cards plus Adjust. This replaces the previous random-negated-card action.
    * **Enhanced-card cleanup:** If the selected card is enhanced, destroy its enhanced clone and move its underlying original to the discard pile. Enhanced cards never enter the discard pile. Use the original's Category for the restoration process below. Otherwise, move the selected unenhanced card itself to the discard pile.
    * **If the discarded card has no Category:** Deal a new face-down card from the eligible Complications Deck into the vacated board slot.
    * **If the discarded card has a Category:** Return all other cards in the discard pile with that same Category to the Complications Deck, excluding the specific card just discarded (not every copy of its name). Shuffle all remaining face-down board cards back into the deck as well, then shuffle and deal new face-down cards into every previously face-down slot and the vacated slot. Leave other face-up board cards in place. This uses the same face-down replacement process as Mults Okay, but returns only matching-category discards and does not change the Auto-Disc/Mults Okay setting. The per-roll checkbox eligibility still applies to cards returned to the playable deck.
    * All replacements are unenhanced, face-down cards; they are not reveals and do not contribute value. Clear selection, remain in Select/resolution mode, and keep replacements locked until right-click Select. If there is no eligible replacement, follow Full Board and Deck Exhaustion; Stop must remain reachable.
5. **Adjust:** This button applies a static modifier to `complicationsTotal` and `adjustedMargin`, initialized to zero. Always include it in total calculations. Use it for manually resolved `X` values, card-specific value changes, and other manual corrections. Negation itself never changes this modifier or any card's value. The `text` attribute of the button should display the current value of the modifier as a signed integer in parentheses (e.g. `"Adjust (+2)"` or `"Adjust (−3)"`)
  5.a. **Adjust - Left Click:** Add one to the modifier and update the display elements.
  5.b. **Adjust - Right Click:** Subtract one from the modifier and update the display elements.
6. **Auto-Disc/Mults Okay:** Initialize as "Auto-Disc" (`text = "Auto-Disc", class = "complicationButton greenButton"`), toggle between "Auto-Disc" and "Mults Okay" (`text = "Mults Okay", class = "complicationButton redButton"`) on a left click.
  6.a. **Auto-Disc Mode:** The Category Restriction rule described in the Gameplay Sequence above is ENABLED. When toggled to this mode, the Category Restriction process should be run for all face-up cards, as described in the Gameplay Sequence above. Duplicate categories are allowed among cards that are already face-up (i.e. only face-down cards on the game board should be swapped out).
  6.b. **Mults Okay Mode:** The Category Restriction rule described in the Gameplay Sequence above is DISABLED. When toggled to this mode, all cards in the discard pile with a category value should be shuffled back into the Complications Deck, subject to the per-roll checkbox eligibility. Then, all face-down cards on the board should be shuffled into the Complications Deck, and replaced with new cards from the eligible deck.

### Per-roll card eligibility (supersedes the initial Project-only filter)

The Sheet's Standard, Discipline, Willpower, Launch and Goal checkboxes are the authoritative eligibility rules for each card. During initialization, exclude every card whose checkbox for the target roll type is unchecked. Restoration, redealing and category restoration must never reintroduce an ineligible card. A Project-category card checked for a non-Launch roll is eligible; the old blanket Project exclusion no longer applies to newly initialized games. Import fields by header, not column position.

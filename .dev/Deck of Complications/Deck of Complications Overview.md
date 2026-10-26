# Deck of Complications System Overview

## Agent Routing

Read this when:

- implementing or changing the Deck of Complications minigame, its board controls, card import, roll integration, or Storyteller HUD visibility toggle.

Source of truth:

- This document defines the intended behavior and automation scope. Open decisions at the end are not settled requirements.
- Google Sheet [The Deck of Complications](https://docs.google.com/spreadsheets/d/11kcsl9vAqWeEBEFFmadMs65xpDqMNV8SkCaCNM_09bU/edit), `Cards` tab, supplies card definitions. Its effect-function columns do not authorize automated effect execution.
- `ui/shared/complications_board.xml` supplies the existing board UI; `lib/guids.ttslua` identifies the board and drawer anchors. The supplied TTS save supplies physical decks, GM Notes, and board snap points.
- Existing integration points: `core/roll_controller.ttslua`, `dashboard/rolls.ttslua`, `dashboard/world_snapshot.ttslua`, `.dev/storyteller-dashboard/src/client/scenesPanel/rolls/RollsCell.tsx`, and `ui/storyteller/hud_storyteller.xml`.
- Follow `AGENTS.md`, `.dev/DOCS_INDEX.md`, and `docs/solutions/lua-hide-restore-policy.md` before implementation.

Verification:

- Check imported card identities against physical-card GM Notes and validate the board's ten card slots and two deck/discard snap points.
- Verify startup, reveal/locking, selection, enhancement, negation, discard/replacement, category filtering, hiding/restoring, and ending a game in TTS.
- Verify both unconfirmed and already-confirmed target rolls, additive margin/result classification, and non-Launch Project-category exclusion.
- Follow `AGENTS.md` for mandatory dashboard browser verification when implementing the start button. Documentation changes alone do not implement these behaviors.

Status: Author-approved behavior specification, with remaining open decisions listed below; full runtime implementation is pending.

## Deck of Complications Overview
The "Deck of Complications" is a minigame players can play to make up shortfalls in certain important rolls, most notable Launch rolls for initiating Projects. In general, the game works by randomly dealing ten Complication cards face-down onto a playmat. The player chooses one to turn over, revealing a Complication card, and earning a certain number of successes to add to their roll. After resolving the Complication card, the player can choose another to turn over, or to stop the game and proceed to resolve the roll after adding the successes earned by playing the Deck of Complications.

### Complication Cards
A Complication card consists of:

* **Name:** The name of the Complication card. Names are never duplicated, though multiple copies of each Complication card exist in the deck.
* **Value:** The number of successes earned (or, in rare cases, lost) upon resolving this Complication card. This is usually a positive integer, but it can also be a negative integer (lost successes) or an "X", meaning the the value depends on the Complication's effect.
* **Effect:** A brief rules description of the results of resolving this Complication card, e.g. "Suffer two points of Superficial Willpower damage."
* **Enhanced Effect:** Certain cards and mechanics can "enhance" a Complication card. When a Complication card is enhanced, its Enhanced Effect is applied immediately. Enhanced Effects always apply in addition to the primary Effect, not instead of it (though in some cases the text of the Enhanced Effect will contradict this, by explicitly starting with the word "Instead").
* **Category:** Some (not all) Complication cards have a category. By default, category restrictions apply immediately upon reveal, before the Storyteller resolves the effect. Revealing, for example, a Complication card in the "Debilitation" category removes all other "Debilitation" Complication cards from the deck and from face-down spaces on the playmat. The Auto-Disc/Mults Okay control can disable this restriction.

Effects (and Enhanced Effects) are expansive and varied, and many apply to the Deck of Complications minigame itself. There are effects that modify the rules (such as allowing multiple cards from a Category to be resolved), effects that modify the values of cards, effects that negate cards (removing their effect, but not their value), effects that duplicate cards, effects that force more draws upon the player, and (of course) effects that enhance cards. Because of this, the TTS implementation will need to include a suite of controls that the Storyteller can use to manipulate the Deck of Complications game as it is being played.

### Automation Scope

Card effects and Enhanced Effects are resolved manually by the Storyteller. Do not automate damage, Hunger, XP, conditions, Projects, effect reversal, or card-specific instructions in this implementation. References above to applying an effect describe the game rules, not automatic execution. Effect automation may be added in the future.

Automate the explicitly specified board/deck operations, numeric card-value accounting, category restrictions, controls, and final roll adjustment. The Storyteller handles other card manipulations manually, including forced draws, duplication, individual value changes, and `X` values, using the global Adjust modifier as needed. Discarding the selected card and replacing it is automated through right-click Negate.

Only the participating player and the Storyteller may perform normal gameplay flips. Other players may observe. Nested effects involving another player drawing and resolving a Complication are handled manually; do not automatically start a second minigame or credit that card to the main game's total.

## Automating a Deck of Complications Game

A game can be started with the click of a button by the Storyteller on the Storyteller Dashboard. The start button should appear in the panel of every PC roll, revealed only once the margin of the roll is known. This communicates the two pieces of information the Deck of Complications minigame needs to know before it can be started:

* Who is playing the minigame?
* What is the margin of the roll this game is being played for?

The Storyteller may start a game before or after the target roll has been confirmed. Retain the identity of that specific roll throughout the game, including while other rolls are made during an interruption.

The Complications total is a strict additive delta to the target roll's calculated margin; it never changes the dice. Reclassify the outcome using the adjusted margin and the original dice characteristics. In particular, a Failure may become a Messy Critical if its dice would have produced a Messy Critical but originally fell short of the Difficulty. Ending the game automatically confirms the target roll; already-confirmed rolls must also receive the updated margin and outcome.

### Start-Up Automation Sequence

1. The Complications Board (`G.GUIDS.COMPLICATIONS_BOARD`) should be retrieved, as should all objects tagged `"deckOfComplications"`.
  1.a. The deck object tagged `"deckOfComplications"` AND `"enhancedComplication"` should be identified as the Enhanced Complications Deck.
  1.b. The deck object tagged only `"deckOfComplications"` should be identified as the Complications Deck.
  1.c. All card objects tagged `"deckOfComplications"` should be moved into the appropriate deck (i.e. the Enhanced Complications deck if the card is also tagged `"enhancedComplication"`, or the Complications Deck otherwise)
  1.d. The Complications Deck should be moved onto the Complications Board at the snap point tagged `"deckOfComplications"` with the _greatest_ x value (there are two snap points with that tag; the second one is the discard pile).
  1.e. The Enhanced Complications Deck should remain where it is.
  1.f. Unless the target roll is a **Launch** roll, remove all cards whose **Category** is exactly `Project` from the playable Complications Deck before the initial deal. This is a Category filter, not a filter on the `Set` column: cards in the `Projects` set with another category remain eligible. Keep excluded originals recoverable for end-game cleanup. This eligibility rule remains in force when cards are returned or reshuffled during the game, including in Mults Okay mode.
2. The Complications Board and the Complications Deck (but not the Enhanced Complications Deck) should be set visible to all players, then moved instantly as a rigid body to the position and rotation of the player's deck drawer anchor (`G.GUIDS.CSHEET_DICE_DRAWER_ANCHOR_ON_<COLOR>`), except 7 world units closer to the table origin, at a height of `{y = 7.75}`, and with a 180-degree rotation applied to the y-axis
3. A listener should be registered for permitted face-down-to-face-up flips of cards belonging to this game's board. Unrelated or manually drawn cards must not automatically contribute to this game.
4. Storyteller Control buttons (see below) should be initialized to their starting values (as described in the corresponding section below).
5. The setup sequence should be played.

#### The Setup Sequence
This sequence should be run with comfortable sequencing delays within a `U.chain` function:

1. All players cameras should be set to the `dice<Color>` mode, with the position modified by the same 7-unit shift in the direction of the table origin.
2. The deck should be shuffled.
3. Cards should be dealt, quickly but one-at-a-time, facedown to the ten snap point locations on the Complications board that are _not_ tagged `"deckOfComplications"`, in a random order.
4. In the board's display UI, `id="text_originalMargin"` should have its `text` attribute set to the margin on the target roll; `id="text_complicationsTotal"` should be set to `"+0"`, and `id="text_adjustedMargin"` should be set to the margin on the target roll (again).

### Gameplay Sequence
This sequence should activate whenever the participating player or Storyteller flips a face-down card on this game's board over. Card definitions must be imported from the Google Sheet identified above as part of the build process, creating a table available to the minigame script during play. Importing definitions does not execute card effects.

1. **Apply Value:** The value of the Complication card should be applied immediately to both the Complication total and the adjusted margin on the board UI, unless that value is "X".
2. **Apply Category Restriction:** Immediately upon reveal, if Auto-Disc is enabled and the card has a Category, collect all other cards in that category that are face-down on the board AND those in the deck. Move them one-by-one to the discard pile (upper-right board snap point), face up. Replace removed face-down board cards with new face-down cards from the eligible deck. Cards revealed only by moving to the discard pile do not earn value or trigger this gameplay sequence.
3. **Highlight Card:** A cyan highlight should be applied to the flipped card.
4. **Lock Face-down Cards:** All face-down cards should be locked, preventing the player from flipping another card until this one has been resolved.
5. **Lock the Revealed Card:** Allow enough time for its flip animation to finish, then lock the newly face-up card. Face-up cards remain locked during ordinary play, including after enhancement or removal of enhancement; automated moves may temporarily unlock objects as necessary.

The Storyteller resolves effects manually using the controls below. Right-clicking Select finishes this resolution step: immediately deselect the current card, stop any pending selection-hotkey listener, unlock the face-down board cards, and return the button to Stop. The player may then flip another card, or the Storyteller may use Stop to end the game. Previously revealed cards remain locked.

### End Game Sequence
When the End Game sequence is triggered:

1. Return all original Complication cards in the discard pile, board slots, or non-Launch Project-category exclusion group to the Complications Deck, and destroy all cloned Enhanced Complication cards. Preserve the original Enhanced Complications Deck and its templates. Cleanup must also work if the game is currently hidden.
2. Shuffle the Complications Deck.
3. Return the Complications Board and Deck as a rigid-body to its home location.
4. Set the Complications Board, Complications Deck, and Enhanced Complications Deck invisible to all players other than the Storyteller.
5. Apply the Complications total as an additive margin delta to the specific target roll, update its outcome using its original dice characteristics, and automatically confirm it. Support already-confirmed target rolls as described above.
6. End the live game and remove its Storyteller HUD hide/show toggle.

### Interruptions: Storyteller HUD Hide/Show Toggle

Add a button at the very bottom right of the Storyteller HUD, immediately to the right of the colored seat-change buttons. It is visible only while a Complications game is live, including while that game is hidden.

Each click toggles the game between hidden and revealed. Hide and restore the board, playable deck, discard pile, and all cards belonging to the live game, including enhanced replacements and the originals beneath them. Preserve their positions, rotations, face orientation, lock states, selection, negation markers, and game totals. The Enhanced Complications source deck remains in its existing Storyteller-only storage state.

Use the existing `O.hideObject` / `O.restoreObject` library functions in Global code, or `GlobalHideObject` / `GlobalRestoreObject` from object scripts, following `docs/solutions/lua-hide-restore-policy.md`. Hiding is not ending the game: do not collect cards, reset state, apply the margin, or confirm the target roll. Restoring resumes the same game. This supports interruptions such as Memoriam; nested card effects remain manually resolved.

## Storyteller Control Panel

The functions of each button on the Storyteller Control Panel are described below. Each button calls the same onClick function: `"onComplicationButtonClick"`. That function will need to determine the action to take based on the `id` of the button element and the mouse button used (left or right).

Selecting an active card and random selection operate only on revealed cards in play on the current board. The Select hotkey also supports the face-down replacement action explicitly described below; that action does not select or reveal the replacement. Exclude discards, deck contents, and original cards concealed beneath enhanced replacements from selection. All random-selection modes exclude negated cards, including the entire animated scan. Enhanced replacements participate only in modes that include them. Manually selecting a negated card remains possible so the Storyteller can restore its effect marker or discard it; deselecting it must preserve its red negation marker.

1. **Stop/Select:** Initialize as "Stop" (`text = "Stop", class = "complicationButton yellowButton"`), but change to "Select" (`text = "Select", class = "complicationButton magentaButton"`) when a player flips over a Complication card.
  1.a. **Stop - Left Click:** Set `class` to `"complicationButton redButton"`, `text` to `"Confirm"`, and begin a five-second timer. If the Storyteller left-clicks the same button again within the time window, trigger the End Game Sequence. Otherwise, return the button's `class` to `"complicationButton yellowButton"` and its text to `"Stop"`
  1.b. **Stop - Right Click:** Lock all face-down Complication cards and apply the cyan highlight to the most recent Complication card flipped over, then change this button to "Select" (i.e. returns the game to the resolution phase for the most recently flipped Complication card)
  1.c. **Select - Left Click:** Begin listening for the Storyteller to click his "Spotlight NPC (hold)" action button, or stop listening if clicked a second time. If the button is hovering over a face-up Complication card when it is clicked, remove the cyan color from the currently-selected card, and apply it to the hover-over card, selecting it as the active card, and stop listening. If the button is hovering over a face-down card, shuffle it back into the Complications deck and replace it with a new face-down card, and stop listening. Otherwise, do nothing and continue waiting.
  1.d. **Select - Right Click:** Immediately deselect the selected card, cancel any pending selection-hotkey listener, and unlock all face-down board cards so the player can flip another. Restore this button to Stop (`text = "Stop", class = "complicationButton yellowButton"`). Keep revealed cards locked and preserve any red negation marker when removing the cyan selection highlight.
2. **Random:** This button triggers the random selection of a face-up Complications card. When triggered, the cyan highlight should move randomly among all face-up Complication cards, slowing down as it does so, before finally stopping on the newly-selected card.
  2.a. **Random - Left Click:** The scan and final selection should EXCLUDE all Enhanced cards.
  2.b. **Random - Right Click:** The scan and final selection should INCLUDE all Enhanced cards.
  If there are no possible cards to select, the button should do nothing. If there is only one possible card to select, it should be selected immediately without running the animated selection process.
3. **Enhance:** **Hidden** unless a face-up Complication card is currently selected.
  3.a. **Enhance - Left Click:** Read the GM Notes on the Complication card, which will be of the form `<index>:<name>[:Enhanced]`.
    * **If the GM Notes do NOT contain "`:Enhanced`":** Search the Enhanced Complications Deck for the card with the matching index in its GM Notes (which will be of the form `<index>:<name>:Enhanced`), and clone it (briefly drawing it from the deck if necessary). Lock the selected Complication card, then apply a `-0.5` unit shift to its y-position (to hide it inside the board). Instantly move the cloned Enhanced Complication card face-up to the same location, make it visible to all players, and lock it. Finally, select the Enhanced Complication card (deselecting the now-hidden original Complication card in the process). This replaces the visible representation of the same card; it does not count as another reveal or automatically apply effect text.
    * **If the GM Notes DO contain "`:Enhanced`":** Undo the enhancement by destroying the cloned Enhanced Complication, applying a `+0.5` unit shift to the y-position of the Complication card hidden beneath it, and selecting the restored original. Keep that face-up card locked. Enhancement changes preserve the card's negation state and do not automatically change its credited value.
  3.b. **Enhance - Right Click:** Run the random selection process (described above for the "Random" button), except INCLUDE ONLY the Enhanced cards.
4. **Negate:** **Hidden** unless a face-up Complication card is currently selected.
  4.a. **Negate - Left Click:** Toggle the selected card's negated marker and red highlight. Red indicates that its effect has been negated; removing red indicates that its effect has been restored. Do not change its value, `complicationsTotal`, or `adjustedMargin`, and do not execute or reverse its effect. The Storyteller handles effects and any desired value correction manually with Adjust. Negated cards are excluded from every random-selection mode.
  4.b. **Negate - Right Click:** Discard the currently selected card by moving it to the discard pile. This replaces the previous random-negated-card action.
    * **If the discarded card has no Category:** Deal a new face-down card from the eligible Complications Deck into the vacated board slot.
    * **If the discarded card has a Category:** Return all other cards in the discard pile with that same Category to the Complications Deck, excluding the specific card just discarded (not every copy of its name). Shuffle all remaining face-down board cards back into the deck as well, then shuffle and deal new face-down cards into every previously face-down slot and the vacated slot. Leave other face-up board cards in place. This uses the same face-down replacement process as Mults Okay, but returns only matching-category discards and does not change the Auto-Disc/Mults Okay setting. The non-Launch Project-category exclusion still applies to cards returned to the playable deck.
    * Replacement cards are not reveals and do not contribute value. See Open Decisions for discarded-value accounting and enhanced-card cleanup.
5. **Adjust:** This button applies a static modifier to `complicationsTotal` and `adjustedMargin`, initialized to zero. Always include it in total calculations. Use it for manually resolved `X` values, card-specific value changes, and other manual corrections. Negation itself never changes this modifier or any card's value. The `text` attribute of the button should display the current value of the modifier as a signed integer in parentheses (e.g. `"Adjust (+2)"` or `"Adjust (−3)"`)
  5.a. **Adjust - Left Click:** Add one to the modifier and update the display elements.
  5.b. **Adjust - Right Click:** Subtract one from the modifier and update the display elements.
6. **Auto-Disc/Mults Okay:** Initialize as "Auto-Disc" (`text = "Auto-Disc", class = "complicationButton greenButton"`), toggle between "Auto-Disc" and "Mults Okay" (`text = "Mults Okay", class = "complicationButton redButton"`) on a left click.
  6.a. **Auto-Disc Mode:** The Category Restriction rule described in the Gameplay Sequence above is ENABLED. When toggled to this mode, the Category Restriction process should be run for all face-up cards, as described in the Gameplay Sequence above. Duplicate categories are allowed among cards that are already face-up (i.e. only face-down cards on the game board should be swapped out).
  6.b. **Mults Okay Mode:** The Category Restriction rule described in the Gameplay Sequence above is DISABLED. When toggled to this mode, all cards in the discard pile with a category value should be shuffled back into the Complications Deck, subject to the non-Launch Project-category exclusion. Then, all face-down cards on the board should be shuffled into the Complications Deck, and replaced with new cards from the eligible deck.

## Open Decisions Before Implementation

These points remain unresolved; recommendations here are not approved behavior.

- **Discard accounting:** When right-click Negate discards a revealed card, should its credited value be subtracted automatically or left for Adjust? Category restoration on discard is defined in the Negate control above. Negation alone is a marker and does not automatically undo category operations.
- **Discarding enhanced cards:** Recommended: destroy the enhanced clone, discard its underlying original, and deal one replacement into that slot. Clear selection, remain in Select/resolution mode, and keep the replacement face-down and locked until right-click Select.
- **Capacity and recovery:** Define what happens when all ten slots are face-up or the eligible deck runs out, and whether save/reload must resume a live game. The hide/show toggle preserves the live game but does not by itself define reload recovery.
- **Already-confirmed roll consequences:** Define whether changing an already-confirmed result updates only its margin, classification, history, and display, or also revisits previously applied automatic consequences. Do not blindly replay confirmation side effects. Recommended: update the result without repeating consequences, leaving any required correction to the Storyteller.

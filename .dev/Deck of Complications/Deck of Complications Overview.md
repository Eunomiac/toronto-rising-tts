# Deck of Complications System Overview

## Agent Routing
> _Note to Agent: This is an author-created file, so agent routing instructions are incomplete. Please edit this section to apply proper routing instructions, and remove this author comment._

Read this when:

Source of truth (planned):

Verification:

Status:

## Deck of Complications Overview
The "Deck of Complications" is a minigame players can play to make up shortfalls in certain important rolls, most notable Launch rolls for initiating Projects. In general, the game works by randomly dealing ten Complication cards face-down onto a playmat. The player chooses one to turn over, revealing a Complication card, and earning a certain number of successes to add to their roll. After resolving the Complication card, the player can choose another to turn over, or to stop the game and proceed to resolve the roll after adding the successes earned by playing the Deck of Complications.

### Complication Cards
A Complication card consists of:

* **Name:** The name of the Complication card. Names are never duplicated, though multiple copies of each Complication card exist in the deck.
* **Value:** The number of successes earned (or, in rare cases, lost) upon resolving this Complication card. This is usually a positive integer, but it can also be a negative integer (lost successes) or an "X", meaning the the value depends on the Complication's effect.
* **Effect:** A brief rules description of the results of resolving this Complication card, e.g. "Suffer two points of Superficial Willpower damage."
* **Enhanced Effect:** Certain cards and mechanics can "enhance" a Complication card. When a Complication card is enhanced, its Enhanced Effect is applied immediately. Enhanced Effects always apply in addition to the primary Effect, not instead of it (though in some cases the text of the Enhanced Effect will contradict this, by explicitly starting with the word "Instead").
* **Category:** Some (not all) Complication cards have a category. One of the fundamental rules of the Deck of Complications is that a player can only resolve one Complication card of each category in a game. After resolving, for example, a Complication card in the "Debilitation" category, all other "Debilitation" Complication cards are removed from the deck, and from face-down spaces on the playmat.

Effects (and Enhanced Effects) are expansive and varied, and many apply to the Deck of Complications minigame itself. There are effects that modify the rules (such as allowing multiple cards from a Category to be resolved), effects that modify the values of cards, effects that negate cards (removing their effect, but not their value), effects that duplicate cards, effects that force more draws upon the player, and (of course) effects that enhance cards. Because of this, the TTS implementation will need to include a suite of controls that the Storyteller can use to manipulate the Deck of Complications game as it is being played.

## Automating a Deck of Complications Game

A game can be started with the click of a button by the Storyteller on the Storyteller Dashboard. The start button should appear in the panel of every PC roll, revealed only once the margin of the roll is known. This communicates the two pieces of information the Deck of Complications minigame needs to know before it can be started:

* Who is playing the minigame?
* What is the margin of the roll this game is being played for?

### Start-Up Automation Sequence

1. The Complications Board (`G.GUIDS.COMPLICATIONS_BOARD`) should be retrieved, as should all objects tagged `"deckOfComplications"`.
  1.a. The deck object tagged `"deckOfComplications"` AND `"enhancedComplication"` should be identified as the Enhanced Complications Deck.
  1.b. The deck object tagged only `"deckOfComplications"` should be identified as the Complications Deck.
  1.c. All card objects tagged `"deckOfComplications"` should be moved into the appropriate deck (i.e. the Enhanced Complications deck if the card is also tagged `"enhancedComplication"`, or the Complications Deck otherwise)
  1.d. The Complications Deck should be moved onto the Complications Board at the snap point tagged `"deckOfComplications"` with the _greatest_ x value (there are two snap points with that tag; the second one is the discard pile).
  1.e. The Enhanced Complications Deck should remain where it is.
2. The Complications Board and the Complications Deck (but not the Enhanced Complications Deck) should be set visible to all players, then moved instantly as a rigid body to the position and rotation of the player's deck drawer anchor (`G.GUIDS.CSHEET_DICE_DRAWER_ANCHOR_ON_<COLOR>`), except 7 world units closer to the table origin, at a height of `{y = 7.75}`, and with a 180-degree rotation applied to the y-axis
3. A listener should be registered to fire whenever a player flips over a face-down Complication card
4. The setup sequence should be played.

#### The Setup Sequence
This sequence should be run with comfortable sequencing delays within a `U.chain` function:

1. All players cameras should be set to the `dice<Color>` mode, with the position modified by the same 7-unit shift in the direction of the table origin.
2. The deck should be shuffled.
3. Cards should be dealt, quickly but one-at-a-time, facedown to the ten snap point locations on the Complications board that are _not_ tagged `"deckOfComplications"`, in a random order.
4. In the board's display UI, `id="text_originalMargin"` should have its `text` attribute set to the margin on the target roll; `id="text_complicationsTotal"` should be set to `"+0"`, and `id="text_adjustedMargin"` should be set to the margin on the target roll (again).

### Gameplay Sequence
This sequence should activate whenever the player flips a face-down Complication card over. The data for Complication cards will need to be imported from the Google Drive "Deck of Complications" sheet, and should be done a part of the build process to create a table that can be accessed by the minigame script during play.

1. **Apply Value:** The value of the Complication card should be applied immediately to both the Complication total and the adjusted margin on the board UI, unless that value is "X".
2. **Apply Category Restriction:** If the Complication card has an associated "Category", all cards in the same category that are face-down on the board AND those that are in the deck should be collected, and moved one-by-one to the discard pile (upper-right board snap point), face up. Any face-down cards that were moved from the board should then be replaced with new face-down cards from the deck.
3. **Highlight Card:** A cyan highlight should be applied to the flipped card.
4. **Lock Face-down Cards:** All face-down cards should be locked, preventing the player from flipping another card until this one has been resolved.

The Storyteller will then conduct the resolution process via the Storyteller Control Panel (see below), until the Storyteller either triggers the End Game Sequence, or unlocks the cards allowing the player to flip another and restart the Gameplay Sequence.

### End Game Sequence
When the End Game sequence is triggered:

1. Return all Complication cards in the discard pile or in board slots to the Complications Deck, and destroy all Enhanced Complication cards.
2. Shuffle the Complications Deck.
3. Return the Complications Board and Deck as a rigid-body to its home location.
4. Set the Complications Board, Complications Deck, and Enhanced Complications Deck invisible to all players other than the Storyteller.
5. Apply the adjusted margin to the target roll.

## Storyteller Control Panel

The functions of each button on the Storyteller Control Panel are described below. Each button calls the same onClick function: `"onComplicationButtonClick"`. That function will need to determine the action to take based on the `id` of the button element and the mouse button used (left or right).

1. **Stop/Select:** Initialize as "Stop" (`text = "Stop", class = "complicationButton yellowButton"`), but change to "Select" (`text = "Select", class = "complicationButton magentaButton"`) when a player flips over a Complication card.
  1.a. **Stop - Left Click:** Set `class` to `"complicationButton redButton"`, `text` to `"Confirm"`, and begin a five-second timer. If the Storyteller left-clicks the same button again within the time window, trigger the End Game Sequence. Otherwise, return the button's `class` to `"complicationButton yellowButton"` and its text to `"Stop"`
  1.b. **Stop - Right Click:** Lock all face-down Complication cards and apply the cyan highlight to the most recent Complication card flipped over, then change this button to "Select" (i.e. returns the game to the resolution phase for the most recently flipped Complication card)
  1.c. **Select - Left Click:** Begin listening for the Storyteller to click his "Spotlight NPC (hold)" action button, or stop listening if clicked a second time. If the button is hovering over a face-up Complication card when it is clicked, remove the cyan color from the currently-selected card, and apply it to the hover-over card, selecting it as the active card, and stop listening. If the button is hovering over a face-down card, shuffle it back into the Complications deck and replace it with a new face-down card, and stop listening. Otherwise, do nothing and continue waiting.
  1.d. **Select - Right Click:** Nothing, yet.
2. **Random:** This button triggers the random selection of a face-up Complications card. When triggered, the cyan highlight should move randomly among all face-up Complication cards, slowing down as it does so, before finally stopping on the newly-selected card.
  2.a. **Random - Left Click:** The scan and final selection should EXCLUDE all Enhanced cards.
  2.b. **Random - Right Click:** The scan and final selection should INCLUDE all Enhanced cards.
  If there are no possible cards to select, the button should do nothing. If there is only one possible card to select, it should be selected immediately without running the animated selection process.
3. **Enhance:** **Hidden** unless a face-up Complication card is currently selected.
  3.a. **Enhance - Left Click:** Read the GM Notes on the Complication card, which will be of the form `<index>:<name>[:Enhanced]`.
    * **If the GM Notes do NOT contain "`:Enhanced`":** Search the Enhanced Complications Deck for the card with the matching index in its GM Notes (which will be of the form `<index>:<name>:Enhanced`), and clone it (briefly drawing it from the deck if necessary). Lock the selected Complication card, then apply a `-0.5` unit shift to its y-position (to hide it inside the board). Instantly move the cloned Enhanced Complication card face-up to the same location, and make it visible to all players. Finally, select the Enhanced Complication card (deselecting the now-hidden original Complication card in the process).
    * **If the GM Notes DO contain "`:Enhanced`":** Undo the enhancement by destroying the cloned Enhanced Complication, applying a `+0.5` unit shift to the y-position of the Complication card hidden beneath it, unlock the Complication card, and select it.
  3.b. **Enhance - Right Click:** Run the random selection process (described above for the "Random" button), except INCLUDE ONLY the Enhanced cards.
4. **Negate:** **Hidden** unless a face-up Complication card is currently selected.
  4.a. **Negate - Left Click:** Mark the card internally as negated, apply a red highlight to it, set its value to 0 and modify the `complicationsTotal` and `adjustedMargin` elements in the Board UI accordingly.  If the card is already negated, reverse the negation: Remove the red highlight, and restore its value to the total and adjusted margin.
  4.b. **Negate - Right Click:** As Enhanced - Right Click, but INCLUDE ONLY the negated cards.
5. **Adjust:** This button applies a static modifier to the `complicationsTotal` and the `adjustedMargin`. The modifier should always be included in any calculation of those values, including if a card's value is modified or negated. The `text` attribute of the button should display the current value of the modifier as a signed integer in parentheses (e.g. `"Adjust (+2)"` or `"Adjust (−3)"`)
  5.a. **Adjust - Left Click:** Add one to the modifier and update the display elements.
  5.b. **Adjust - Right Click:** Subtract one from the modifier and update the display elements.
6. **Auto-Disc/Mults Okay:** Initialize as "Auto-Disc" (`text = "Auto-Disc", class = "complicationButton greenButton"`), toggle between "Auto-Disc" and "Mults Okay" (`text = "Mults Okay", class = "complicationButton redButton"`) on a left click.
  6.a. **Auto-Disc Mode:** The Category Restriction rule described in the Gameplay Sequence above is ENABLED. When toggled to this mode, the Category Restriction process should be run for all face-up cards, as described in the Gameplay Sequence above. Duplicate categories are allowed among cards that are already face-up (i.e. only face-down cards on the game board should be swapped out).
  6.b. **Mults Okay Mode:** The Category Restriction rule described in the Gameplay Sequence above is DISABLED. When toggled to this mode, all cards in the discard pile with a category value should be shuffled back into the Complications Deck. Then, all face-down cards on the board should be shuffled into the Complications Deck, and then replaced with new cards from the Complications Deck.

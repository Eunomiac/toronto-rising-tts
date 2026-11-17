# Transitioning the Deck of Complications to a Web App
We will be moving the Deck of Complications minigame from within Tabletop Simulator to a webpage, without changing any of the rules or mechanics of the game itself. The following resources will facilitate this:

1. The "Overview" and "Rules" sections, below
2. The values and content of each of the cards, which are contained in the `EXPORT_COMPLICATIONS` data set from the "Toronto Rising" Google Sheet
3. The Lua code that currently governs Deck of Complications gameplay in Tabletop Simulator

## Deliverables
A responsive, elegant user interface appropriate to the visual theme of _Toronto Rising_ that can be hosted on a publically-accessible website, and used by players of _Toronto Rising_ to play a game of the Deck of Complications from start to finish. Explore options for allowing the Storyteller to supervise in real time.

## Gameplay Overview
When a player fails an important dice roll, the Storyteller may elect to offer them the opportunity to play "the Deck of Complications" minigame as a way to earn successes and increase their margin to the point of success (and sometimes beyond). The player is initially presented with ten face-down Complication cards drawn from the deck arranged in two rows of five. They flip cards one at a time, scoring the value of each card as additional successes and applying the effect written on the card -- which is usually, but not always, a negative consequence (hence the name of the game). The player may always choose to stop playing instead of flipping over a new card, in which case the total value of their face-up cards is summed, added to the margin of their roll, and the roll is resolved accordingly.

## Rules
1. **The Golden Rule:** If the text of a card effect contradicts any of the following rules, the card takes precedence.
2. Once a card has been flipped face up, the player must resolve its effect before they can choose to stop playing.
3. A player may choose to stop playing even if they have not yet reached the total value needed to succeed at their initial roll (in which case the game will end and the roll will resolve as a Failure). Conversely, a player need not _stop_ playing when they reach the value necessary to succeed at their roll (they may continue accumulating value to increase their margin if they so choose).
4. If a player flips over their tenth and final card, the game ends.
5. Card effects are never optional.
6. **Category:** Some (but not all) cards have a "Category". A player may only flip one card from any given Category. Accordingly, when a player flips a card that has a Category, all cards that share that Category are removed from the deck and from among the face-down cards in play (which are then replaced by cards newly drawn from the deck), guaranteeing they will not draw another from that Category.
7. **Enhancement:** All Complication cards have two effects: a "Base Effect" and an "Enhanced Effect". The Enhanced Effect is ignored _unless_ the card has been "enhanced". A card can only be enhanced by the effect of another card (e.g. "Powderkeg", whose effect reads: "Flip another card and enhance it.")
  - When a card is enhanced, both the Base Effect _and_ the Enhanced Effect apply (they are cumulative and they do stack), _unless_ the Enhanced Effect begins with the word "Instead" (in which case it replaces the Base Effect).
8. **Negation:** Some card effects will "negate" other cards. This negates the Base Effect (and the Enhanced Effect, if the card was enhanced), but not the value, which still contributes to the player's total.
9. **Applicable Rolls:** Not every card is applicable to every type of roll, as indicated in the appropriate column of the `EXPORT_COMPLICATIONS` data set.
10. **Timing of Effects:** Effects that explicitly relate to the mechanics of the Deck of Complications game itself (e.g. cards that force a player to draw; cards that enhance, negate, or otherwise 'target' other cards; etc.) are resolved immediately when they are flipped face-up. All other effects are applied only once the Deck of Complications game has ended.
11. **Conservation of Enhancement:** If an enhanced card is negated or discarded, that enhancement passes to another face-up card, randomly selected from among all face-up unenhanced cards. If there are no viable targets, the next card the player flips face-up is immediately enhanced.
12. **Card Rarity & Deck Construction:** Card rarity determines how many copies of a given card are added to the deck and, thus, the likelihood that any given card will be drawn. There are four levels of rarity:
	- "Very Common" -- 12 copies of each "Very Common" card are added to the deck. Currently only one card ("Powderkeg") has the "Very Common" rarity.
	- "Common" -- 6 copies of each "Common" card are added to the deck.
	- "Uncommon" -- 3 copies of each "Uncommon" card are added to the deck.
	- "Rare" -- 1 copy of each "Rare" card is added to the deck.
  (The deck itself only ever contains the base version of each card; the enhanced version of each card is only used when the card is enhanced during play, at which point the base image is swapped with the enhanced version.)

## Assets
The following image assets can be found in `.dev/deck-of-complications/assets/`. Feel free to move and/or rename these assets as you organize the work folder.

- `assets/playmat.webp` -- The background playmat on which cards are displayed to the player. It includes ten spaces for dealt cards, as well as a discard pile and a space for the deck itself.
- `assets/card-back.webp` -- The image displayed on the back of a Complications card, before it is flipped face-up.
- `assets/overlays/**` -- Images that can be layed over top of face-up Complications cards to change them or to otherwise indicate that they have been manipulated. There are two types of overlays:
	- `assets/overlays/overlay-revalue-[neg]<#>.webp` -- Sixteen overlays that can be applied to cards whose value has been changed by their own effect or the effect of another card. An overlay exists for every number between -5 and 10, including zero. Negative numbers are distinguished by the prefix "neg" before the final integer in the filename, e.g. `overlay-revalue-neg3.webp`
	- `assets/overlays/overlay-negated.webp` -- Overlay applied to a card that has been "negated" (see Rules, above, item #8).
- `assets/cards/** -- All 66 unique cards in the Deck of Complications. Each card comes with a base-version image and an enhanced-version image (indicated by the suffix `_enhanced`), for when that card has been enhanced by the effect of another card. All card filenames begin with a two-digit index number corresponding to the index value in the first column of `EXPORT_COMPLICATIONS`.

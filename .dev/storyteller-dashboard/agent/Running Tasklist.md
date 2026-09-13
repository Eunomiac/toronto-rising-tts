# Running Tasklist for Storyteller Dashboard Work

## Agent Instructions

This file is the progress tracker for Storyteller Dashboard work. **Do not create, update, or comment on Linear issues for this slice.** Review this file periodically to check for new instructions from the author. They will be presented in bullet-point form.

- Once you have completed an item, mark it with a '✔️' emoji at the front.
- If you need clarification or cannot perform a task, add a line directly beneath the relevant item, prefixed with a '🤖' emoji
- Author comments or responses will be prefixed with a '👨' emoji
- Completed & approved issues will be deleted from this running task list by the author.
- Incomplete, incorrect, or issues that otherwise deserve more attention will be flagged with a '❌', followed by a '👨'-flagged comment describing the issue

**Note:** You have full authority to make changes to settings and imports on the app while testing -- none of the data is important to retain at this point in testing. (E.g. you shouldn't hesitate to move tokens around, even tokens that were placed by me, or make changes to the top controls to test things.)

## Task List



SD-9. I'd like to see more creativity in how you design the various control elements. District, Site and Skybox could be combined into a rectangular widget with buttons to change each; date controls could be condensed into an interesting and well-designed time control widget; weather controls could be contained in a weather-report style widget where various icons can be clicked to toggle through weather states, separating Rain, Snow, Wind, and Thunder into different controls that can be changed independently of each other. Lighting and top fog could also be incorporated into this widget, or perhaps a different one.  Consider checking sites like codepen, Pinterest, StackOverflow, Reddit -- those may be terrible examples, you may know of better sites to look at for UX inspiration, but I think we can do better and you should feel free to experiment with new ideas, see for yourself how they work, and then refine them or reject them and try something new. Feel free to create a planning document specific to these sorts of UX-improvement experiments, to keep track of your work and slowly build up a catalog of what is and isn't effective. **Important:** All issues described below should be considered with SD-9 in mind: If instructions there conflict with changes you've made to the functionality a later issue deals with, simply skip it and add a 🤖-comment requesting clarification on how things should work given your new design.
🤖 Experiment log: `.dev/storyteller-dashboard/agent/UX Experiments.md`. First chrome pass is on the right rail (place / clock / weather) with group trays on the left.
👨 Generally speaking, avoid using emojis as icons -- prefer using icons from game-icons.net, as they are much more resilient in terms of font and other styling peculiarities.

✔️ SD-9.5. Per the above, please replace the icons for District, Site, Skybox and the Weather buttons with game-icons.net icons.

✔️ SD-12. The board image itself has a lot more empty space than we need for this app. Can you scale and position it inside a non-overflowing parent panel, so that the unused space to the top and the right are cropped away, with the snap points and table map expanding to fill the available space?
🤖 The board art is much wider than the middle column, so filling the height clipped the table or the far packs. This version fits the useful region (table + polar) inside the column and leaves dark bars above/below. If you’d rather zoom and clip a side, say which side to keep.
👨 The right-most snap point of the Far Right area is _sligtly_ cut off by the cropping; if you could reduce the scaling by a very small amount, that should be perfect.
👨 **Important:** I have replaced `controlBoard_standard.webp` with a new version that shifts the seated player slots horizontally, so that slot 1 is in line with the center of the board (i.e. x = 50%). Please adjust the positions of those snap points to account for that, which should allow you to expand the size of the board since you don't have to worry about cutting off the seated players on the left side of the image.
🤖 Dashboard overlay seats now center slot 1 at `u = 0.50`, and the crop trims unused left parchment as well. I did **not** change the in-game CONTROL_BOARD Lua seat row (`uMin`/`uMax` still 0.05–0.35), so table tokens in TTS stay where they were. Say if the physical board art was updated too.

✔️ SD-13. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. Be sure to test the appearance by placing some tokens on the game board and adjusting size and position of the names so that they display clearly, are clearly associated with their token, and don't overlap.
👨 The display names need to be larger, with a stronger text shadow and always fully displayed: `font-size: 0.75rem; overflow: visible; text-shadow: 0 0 3px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 0 3px #000,0 0 3px #000,0 0 3px #000;`. To avoid overlap, positioning of the name may have to depend on the slots they occupy. For example, in the "Mid Center" group, names could extend outwards from the horizontal center (i.e. if a token is to the left of the central snap, `transform: translateX(-90%)`; if it is to the right, `transform: translateX(-10%)`). Similar by-slot transforms can be supplied by me once you've implemented the general structure for them; this way I can ensure each name is clearly displayed in a logical position without overlapping.  (A temporary debug button that populates all snap points with randomly-selected tokens would help me inspect each one and position its name; I'll be sure to do so using only `transform: translateX()` properties, so a slot map would only need to include the percentages. This debug button should be a toggle that removes the randomly-placed tokens when it is toggled off, and the button itself should only be visible in Debug mode (see SD-19).)
🤖 `SNAP_NAME_TRANSLATE_X` in `src/client/scenes/tokenNames.ts` is empty and waiting for your per-snap `translateX` percentages. Until then, names use the family-median heuristic (`-90` / `-50` / `-10`).

✔️ SD-16. Full information should be displayed on-screen at all times. By which I mean Conditions should not merely be shown with a number, but rather as a list on full display. Soundscape should display the current track for all channels.
👨 Great work generally, but I'd like to restore a few labels where the inputs are especially ambiguous: A very small "Conditions" header should appear before the conditions list, and icons should appear to the left of each of the soundscape dropdowns to indicate the category of sound (music, location ambient). Similarly, an icon next to the lighting dropdown should indicate what that is for.

✔️ SD-18. Could you make the drop animation for tokens and groups animate much like the tokens do when they are picked up?
👨 Need a small adjustment to the drop animation: The token should "drop" (scaling down) immediately, then bounce/pulse after it has downscaled (currently it bounces before it downscales, looking like it's floating without snapping for a brief moment).

✔️ SD-19. I may want to create a new image for the stage control board, rather than use the existing one, and then provide you with a list of new mapping coordinates so that you can convert them to what they should be in-game. (For example, I might want to expand the five 'Mid Center' snap points horizontally to give more room for the Draggable sensor to distinguish between positions, in which case I'd supply you with the new coordinates for you to map them to the originals.)  To facilitate this, could you add a freely-draggable little targeting reticule that, when it is dropped, pastes the coordinate it was dropped on to my clipboard so I can easily paste it to a file that you can then review?
👨 Let's add a "Debug" toggle button to the left of the "Clear Stage" button. The targeting widget should only appear when Debug mode is toggled on, and other debug features should be toggled by this button.  When the Debug toggle is deactivated, all debug features should likewise be disabled (including the dummy tokens spawned for SD-13)

✔️ SD-21. Let's animate the movement of tokens on the stage board. If it's possible for the draggable element to always be a 'ghost' (leaving the token in its original position, perhaps faded slightly to indicate that it's being dragged), then upon dropping the token, the token should smoothly move in a straight line to its new position (and any tokens that are swapping places should likewise be smoothly animated into their new positions).  Same with moving groups, upon dropping the group handle, and on moving tokens from the palette onto the game board.
👨 Check the current state of the board as this may be a very niche case, but when I move any token on the board, the Lexie Madi token animates from her seated position onto her stage position. I suspect this has something to do with the unique case of having a seated NPC also active on the stage board, i.e. having two live tokens on the table at once.)

✔️ SD-22. Moving a token off of the game board and dropping it should return it to the palette or, if it is an NPC who is occupying a seat, the stage token should disappear and the seated token restored to its pre-staged state. Moving an NPC token off of a seated position should unset them and return them to the palette. Finally, a "Clear Palette" button beneath the "Add NPCs..." button should remove all NPCs currently on the palette, deselecting them in the NPC modal.
🤖 The Add NPCs modal is gone; unused NPCs live in the left trays. Off-board drop already returns them there (and restores a seated NPC if they were only staged). I skipped “Clear Palette” — do you still want a button that removes every NPC from the board and trays, or only leftover “on deck” tokens from older drafts?
👨 Dragging a token off the board to the left or right drags them over the panels there (and does nothing when dropped). Dragging the tokens off the top or bottom of the board likewise does not clear them from the board. As for the palette, since we now allow dragging of tokens directly from the right panel to the board, the palette can be removed entirely.

✔️ SD-24. Add a gently pulsing glowing aura to lit tokens, with the pulses staggered slightly from each other.  At minimum brightness the aura should still be visible, i.e. it should pulse between "minimal brightness" and "maximum brightness", which should be a fairly subtle change, just a gentle throbbing as if representing a dimly pulsing light.
👨 I don't see an animated glow. In the inspector, hovering over the "scenes-token-glow" name in the `animation` property shows a tooltip stating "scenes-token-glow is not defined".

✔️ SD-25. The behavior of tokens in drawers should be different -- treat each token as a persistent object that can exist in only one place at a time. If a token is dragged out of a drawer, it should no longer be displayed in that drawer. (The only exception is for seated NPCs who are dragged onto the stage board from their seats, which should be duplicated as is current behavior -- just as Lexie Madi's token is currently positioned at the time of writing this.)

✔️ SD-26. The weather buttons need a bit of work:
  1. **Wind** — There are four different wind settings (including off/'no wind'). Check the sound catalog for the actual names. As a quick-and-dirty generalization, if the month is between November and February, OR if there is active Snow, the "winter" version of the wind should be used (e.g. "windWinterLow" instead of "windLow").
  2. **Rain** — There are three different rain settings (including 'none'); they should be listed in the sound catalog.
  3. **Thunder** - If thunder is active, wind and rain should both be set to their most intense settings (with winter used for wind depending on date/snow as described above)
  4. **Snow** - The snow button is currently inactive, and the tooltip reads "Snow is not in the import catalog yet". While this is technically true, it's only that we don't have _sounds_ for snow, because snow doesn't really make sounds. But we do have a snow particle system that will have "Light", "Medium" and "Heavy" values when implemented -- it should be possible to set these values now.
  5. game-icons.net icons for each, please
  6. The "Fog" checkbox actually belongs with the district/site/skybox inputs -- it's not weather fog, but rather it's a sort of smoke effect intended to hide seams in the skybox or add ambience for, e.g., underground locations.
🤖 Snow is saved on the dashboard draft and cycles Light / Medium / Heavy. Copy JSON / Import still omit `snow` until the Lua importer has a field for it.

✔️ SD-27. `font-size: 0.75rem;` for the `#scenes-bridge-status` element.

✔️ SD-28. Several of the groups of NPCs have been miscategorized:
  - Petitioners = Independent
  - Bee's Hive = Camarilla
  - the Five Keys = Camarilla
  - the Free Chantry = Camarilla
  - the Midnight Mass at St. Michael's = Camarilla
  - Scarlett & the Boys = Camarilla

✔️ SD-29. I'd like some greater control sorting groups by assigning a `important-group` class to ones I want at the top of their respective groups (perhaps wrap each group in a flex box and assign an `order` value with the `important-group` class?). In addition to the reordering of these important groups to the top of their categories, their header should also be styled more intensely to visually distinguish them from lesser groups.
Groups that should get this `important-group` class are:
 - the Five Keys
 - the Regency of the University Chantry
 - the Moon Club
 - Red Flag
 - the Redeemers
 - the Line

✔️ SD-30. Groups whose names differ only by a parenthetical suffix should be merged into one group, removing the suffix. E.g. "Friendly Neighborhood Spiders (Garou)" tokens should be merged into the "Friendly Neighborhood Spiders" drawer.

✔️ SD-31. Upon picking up a token from the token drawers, the token is offset to the right such that my cursor is holding onto the left edge of the token. (This doesn't happen for tokens picked up off the stage board, though)

✔️ SD-32. Let's use a different background gradient for lit tokens vs. unlit tokens.  The current grey background is ideal for unlit tokens, but lit tokens should get a brighter background.

✔️ SD-33. Add a drag handle on the right side of each of the group drawers. Dragging this onto the stage control board should drag all tokens currently in the drawer onto snap points in the nearest family, just like a group move currently does. The first NPC in the group (I believe this value is present in the NPC data) should be placed in the central/main snap point.

✔️ SD-34. Display the full date and time in the time widget, just as it is displayed in-game: "Tuesday, September 7, 2026\\n10:20 PM" (using am/pm notation for the time)

✔️ SD-35. Hovering over a token in a token drawer should reveal their name as a pop-up.

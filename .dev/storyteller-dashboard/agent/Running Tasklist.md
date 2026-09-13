# Running Tasklist for Storyteller Dashboard Work



## Agent Instructions

This file is the progress tracker for Storyteller Dashboard work. **Do not create, update, or comment on Linear issues for this slice.** Review this file periodically to check for new instructions from the author. They will be presented in bullet-point form.



- Once you have completed an item, mark it with a '✔️' emoji at the front.

- If you need clarification or cannot perform a task, add a line directly beneath the relevant item, prefixed with a '🤖' emoji

- Author comments or responses will be prefixed with a '👨' emoji

- Deferred tasks prefixed with a '⏳' emoji should be skipped until that emoji is removed.

- Completed & approved issues will be deleted from this running task list by the author.

- Incomplete, incorrect, or issues that otherwise deserve more attention will be flagged with a '❌', followed by a '👨'-flagged comment describing the issue

**Note:** You have full authority to make changes to settings and imports on the app while testing -- none of the data is important to retain at this point in testing. (E.g. you shouldn't hesitate to move tokens around, even tokens that were placed by me, or make changes to the top controls to test things.)

## General Guidelines

1. I'd like to see more creativity in how you design the various control elements. District, Site and Skybox could be combined into a rectangular widget with buttons to change each; date controls could be condensed into an interesting and well-designed time control widget; weather controls could be contained in a weather-report style widget where various icons can be clicked to toggle through weather states, separating Rain, Snow, Wind, and Thunder into different controls that can be changed independently of each other. Lighting and top fog could also be incorporated into this widget, or perhaps a different one.  Consider checking sites like codepen, Pinterest, StackOverflow, Reddit -- those may be terrible examples, you may know of better sites to look at for UX inspiration, but I think we can do better and you should feel free to experiment with new ideas, see for yourself how they work, and then refine them or reject them and try something new. Feel free to create a planning document specific to these sorts of UX-improvement experiments, to keep track of your work and slowly build up a catalog of what is and isn't effective. **Important:** All issues described below should be considered with this in mind: If instructions there conflict with changes you've made to the functionality a later issue deals with, simply skip it and add a 🤖-comment requesting clarification on how things should work given your new design.

🤖 Experiment log: `.dev/storyteller-dashboard/agent/UX Experiments.md`. First chrome pass is on the right rail (place / clock / weather) with group trays on the left.

2. Generally speaking, avoid using emojis as icons -- prefer using icons from game-icons.net, as they are much more resilient in terms of font and other styling peculiarities.

## Task List

⏳ SD-13. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. Be sure to test the appearance by placing some tokens on the game board and adjusting size and position of the names so that they display clearly, are clearly associated with their token, and don't overlap.

🤖 `SNAP_NAME_TRANSLATE_X` in `src/client/scenes/tokenNames.ts` is empty and waiting for your per-snap `translateX` percentages. Until then, names use the family-median heuristic (`-90` / `-50` / `-10`).

👨 Determining all of the positions will take some time; issue deferred until I've completed this.

✔️ SD-18. Could you make the drop animation for tokens and groups animate much like the tokens do when they are picked up?

👨 Since the animation is now being performed on the tokens as they move from their original location to the dropped location, the held ghost token should not animate at all when it is dropped but disappear immediately.

✔️ SD-24. Add a gently pulsing glowing aura to lit tokens, with the pulses staggered slightly from each other.  At minimum brightness the aura should still be visible, i.e. it should pulse between "minimal brightness" and "maximum brightness", which should be a fairly subtle change, just a gentle throbbing as if representing a dimly pulsing light.

👨 I still don't see an animated glow. The animation is properly registering in the inspector; perhaps the animation is simply too subtle?

✔️ SD-26. The weather buttons need a bit of work:

  1. **Wind** — There are four different wind settings (including off/'no wind'). Check the sound catalog for the actual names. As a quick-and-dirty generalization, if the month is between November and February, OR if there is active Snow, the "winter" version of the wind should be used (e.g. "windWinterLow" instead of "windLow").

  2. **Rain** — There are three different rain settings (including 'none'); they should be listed in the sound catalog.

  3. **Thunder** - If thunder is active, wind and rain should both be set to their most intense settings (with winter used for wind depending on date/snow as described above)

  4. **Snow** - The snow button is currently inactive, and the tooltip reads "Snow is not in the import catalog yet". While this is technically true, it's only that we don't have _sounds_ for snow, because snow doesn't really make sounds. But we do have a snow particle system that will have "Light", "Medium" and "Heavy" values when implemented -- it should be possible to set these values now.

  5. game-icons.net icons for each, please

  6. The "Fog" checkbox actually belongs with the district/site/skybox inputs -- it's not weather fog, but rather it's a sort of smoke effect intended to hide seams in the skybox or add ambience for, e.g., underground locations.

🤖 Snow is saved on the dashboard draft and cycles Light / Medium / Heavy. Copy JSON / Import still omit `snow` until the Lua importer has a field for it.

👨 I like the method of clicking to cycle through levels of the weather effects, but there is currently no visual indicator to distinguish between the various intensities.  Perhaps duplicate the icon, showing 1 for low, 2 for med, 3 for max?
🤖 Rain only has light and heavy (plus off), so that button stacks 1 or 2 icons. Wind and snow use 1 / 2 / 3. Thunder stays a single bolt when it is on.

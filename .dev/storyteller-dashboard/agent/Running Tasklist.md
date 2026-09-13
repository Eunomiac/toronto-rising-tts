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

SD-13. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. **For Configuration of Offsets:** Add a debug button called "Fill and Lock", which fills every slot on the stage with Rashid Abdulrahman tokens, then removes the drag handler from the token itself, and adds a drag handler to the name element. Then, add another debug button called "Get Name Offsets", which reads the positions of all name elements and pastes them to my clipboard. Then, I can position the names suitably, and paste to you the offsets each name should get depending on its snap slot on the game board.

❌ SD-27. Dragging a group-move handle off the board should clear that entire group.

👨 Dragging a Group Handle off the side of the board likewise doesn't remove it, but presents a toast error telling me to drop it on a polar snap.

❌ SD-28. "Off the board" should be any location that is not over the board image itself. When dragging anything, only the board should be set up as a drop target -- e.g. you cannot drag tokens onto _specific_ NPC drawers; dragging them over the drawers simply counts as "off the board" and the token is cleared normally.  Tokens that are being dragged off the board should get a red outline/tint/border/indication that dropping them will clear them.

👨 Dragging a token off of the left or right side of the board does not remove it from the board nor give it the red border indicating it will be removed.

SD-29. If I start to drag a group onto the board, but then change my mind and drag it back off the board, the group will often still snap to the nearest snap group family. If a drag handle is not within the bounds of the board, it should never result in tokens being added to the board when released. (This may be fixed by resolving SD-27 and SD-28, though.)

SD-30. Add a debug-only button called "Restore PCs" that removes all tokens from seated table positions, and replaces them with the default spread of the five PC tokens.

✔️ Polar snap catalogs read STAGE_BOARD size from the live TTS save whenever the dashboard is started or built (`npm run scene-catalogs`). After you resize the stage in-game, save the game, then restart the dashboard (or run `npm run dashboard:scene-catalogs` from the repo root).
🤖 Polar UVs are checked against `.dev/storyteller-dashboard/agent/TTS Stage Control Board Snap Coordinates.csv`. Stagger uses STAGE Transform scale as the UV half-extent (not scale/2). Refresh the dashboard tab to confirm Center/Mid neighbors sit on the painted holes.

SD-31. Vary the red background color on the weather controls by intensity, as well as duplicating the icons: Low intensity should be darker red, increasing to full #FF0000 at maximum intensity.  The Wind button should get a cyan outline (not a border, to avoid repositioning) when it is applying winter wind instead of standard wind.

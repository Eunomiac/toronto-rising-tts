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

✔️ SD-13. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. Be sure to test the appearance by placing some tokens on the game board and adjusting size and position of the names so that they display clearly, are clearly associated with their token, and don't overlap.

👨 It occurs to me that this is something you can manage independently, since you're able to see the board. Change the "fill stage" debug button so that it fills ALL token positions (seated and stage) with Rashid's token (since he has a very long name). Then, you can visually see how names should be positioned depending on snap slot. As long as the name is close enough to the token to be associated with it, you're free to position the name above, below, to the right or the left, wherever works best and doesn't overlap. (Additionally, when doing this, you'll notice some issues with snap points -- the Center, Mid Left, Mid Center and Mid Right areas appear to be missing snap points, and the positions of snap points for Mid Left, Mid Right, Center Left and Center Right do not line up with the image indicators -- and those image indicators do line up with the snap points in-game, I can confirm)

🤖 Fill Stage (Debug) puts Rashid on every polar snap and chair. Polar UVs now use live STAGE_BOARD size for radial stagger (same inches as in-game), and Center/Mid packs keep five snaps when their center token is in the Lua box. Please Save-refresh the dashboard and use Debug → Fill Stage to confirm Mid/Center tokens sit on the painted dots.

❌ SD-27. Dragging a group-move handle off the board should clear that entire group.

👨 Dragging a Group Handle off the side of the board likewise doesn't remove it, but presents a toast error telling me to drop it on a polar snap.

❌ SD-28. "Off the board" should be any location that is not over the board image itself. When dragging anything, only the board should be set up as a drop target -- e.g. you cannot drag tokens onto _specific_ NPC drawers; dragging them over the drawers simply counts as "off the board" and the token is cleared normally.  Tokens that are being dragged off the board should get a red outline/tint/border/indication that dropping them will clear them.

👨 Dragging a token off of the left or right side of the board does not remove it from the board nor give it the red border indicating it will be removed.

SD-29. If I start to drag a group onto the board, but then change my mind and drag it back off the board, the group will often still snap to the nearest snap group family. If a drag handle is not within the bounds of the board, it should never result in tokens being added to the board when released.

✔️ SD-30. `grid-template-columns: 18.45rem minmax(0, 1fr) 20.5rem` on the `.scenes-workspace` grid provides just enough room for five tokens to fit horizontally. The first column is increased by 0.2rem, so by reducing the `gap` from `0.45rem` to `0.35rem`, we should be able to maintain the same width of the central board.

🤖 Confirmed: three-column grid has two gaps, so −0.10rem on each gap returns the same +0.20rem the left rail takes. The middle `1fr` column (the stage board) stays the same width. Snap `u`/`v` are percentages on the board image, so even a 1px rounding slip would not change catalog coordinates.

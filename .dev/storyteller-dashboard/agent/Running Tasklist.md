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

🤖 Fill Stage (Debug) now puts Rashid on every polar snap and chair. Names use pack-side placement (`SNAP_NAME_LAYOUT` / `SEAT_NAME_LAYOUT` if you want per-slot tweaks). I skipped dashboard radial stagger so Center/Mid snaps sit on the painted packs; Center Left and Center Right still have 4 snaps each because one candidate sits just outside Lua `validSnaps`. Fill-all-Rashid is the worst-case overlap; mixed real NPCs read more clearly.

✔️ SD-24. Add a gently pulsing glowing aura to lit tokens, with the pulses staggered slightly from each other.  At minimum brightness the aura should still be visible, i.e. it should pulse between "minimal brightness" and "maximum brightness", which should be a fairly subtle change, just a gentle throbbing as if representing a dimly pulsing light.

👨 Quick change: The `::after` element should have `inset: 0%`.

✔️ SD-26. The weather buttons need a bit of work.

👨 For displaying multiple icons to represent the levels, instead of absolutely-positioned stacked icons, display them with standard positioning in a centered flex-box so that the icons appear centered and adjacent to each other, rather than stacked and vertically offset.

✔️ SD-27. Dragging a group-move handle off the board should clear that entire group.

✔️ SD-28. "Off the board" should be any location that is not over the board image itself. When dragging anything, only the board should be set up as a drop target -- e.g. you cannot drag tokens onto _specific_ NPC drawers; dragging them over the drawers simply counts as "off the board" and the token is cleared normally.  Tokens that are being dragged off the board should get a red outline/tint/border/indication that dropping them will clear them.

✔️ SD-29. Double-clicking a group drawer header in the left panel should clear all staged NPCs from that group, either returning them to the drawer or putting them back in their table seat.

✔️ SD-30. Some style changes to the group colors:
- Camarilla should be gold
- Anarch should be red
- Sabbat should be deep/dark purple
- Independents should be grey
- Hecata should be inverted grey (i.e. black text on a bright grey/white background)
- Werewolves should be brown
- Aapilu should be a deep blood red (though make them distinct from the Anarchs)

✔️ SD-31. The left panel is going to contain quite a few different NPC collections (including generics and memoriam NPCs), and could also be used for the scene library, to list scenes that have been saved, or to load in scenes that have been previously created. As such, we should implement a vertically-oriented sequence of tabs that open the various panels; for now, just add the tab column with the following tabs. Clicking on any tab other than "Main NPCs" should simply present an empty panel, until we implement it:
- "Scenes" -- Will contain the list of saved scenes for loading and editing
- "Main NPCs" -- This should display the current panel of cataloged NPCs
- "Generic NPCs" -- Will eventually replace the "Stage NPCs" tab of the Storyteller Dashboard completely.
- "Memoriam NPCs" -- Will only be clickable/active if the current scene is a Memoriam scene, which we will implement in the future.

✔️ SD-32. The faces on the tokens are a little small; could you scale up the cutouts on the interior of the tokens just a bit?

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

✔️ SD-11. Each group button should be assigned a class of the form `group-theme-<X>`, where "X" is a general category that collects the NPC groups into logical 'supergroups'. I can think of `group-theme-camarilla`, `group-theme-anarch`, `group-theme-werewolf`, `group-theme-civilian` (includes Touchstone and Civilian groups), `group-theme-retainer` (includes Crise-de-Lwa and Ducheski Revenant), `group-theme-sabbat`, `group-theme-aapilu`, `group-theme-hecata` and `group-theme-independent` (includes Autarkis). Those themes should then define a selection of color variables, which should be referenced for font color, background, and border in all button states (hover, active, selected, whatever).  FInally, the NPCs panel should be sorted by those groups.
🤖 Mapped Deep Six to sabbat and Memoriam to independent. Tell me if those should live under a different theme.

✔️ SD-12. The board image itself has a lot more empty space than we need for this app. Can you scale and position it inside a non-overflowing parent panel, so that the unused space to the top and the right are cropped away, with the snap points and table map expanding to fill the available space?
🤖 The board art is much wider than the middle column, so filling the height clipped the table or the far packs. This version fits the useful region (table + polar) inside the column and leaves dark bars above/below. If you’d rather zoom and clip a side, say which side to keep.

✔️ SD-13. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. Be sure to test the appearance by placing some tokens on the game board and adjusting size and position of the names so that they display clearly, are clearly associated with their token, and don't overlap.

✔️ SD-14. Note the large amount of unused space to the left and right of the game board. I think we can better use that space, perhaps instead of an NPC selection modal, the left portion contains a series of pop-out panels, sorted by group that, when clicked, open up to display tokens for those NPCs that can be dragged directly from the panel onto the board? As for the space to the right of the game board, perhaps we can move some of the controls currently at the top over to that side, removing at least one row from the top section.

✔️ SD-15. Remove input titles that are taking up vertical space, and replace them with placeholder content or other ways of indicating what an input is for.  For example, instead of the word "Skybox" above the Skybox button, you could have an appropriate icon with a hover-over tooltip reading Skybox, and place that to the immediate left of the button to set the skybox. Indicators may not be necessary at all, either -- Conditions, for example, simply repeats what the button always says.

✔️ SD-16. Full information should be displayed on-screen at all times. By which I mean Conditions should not merely be shown with a number, but rather as a list on full display. Soundscape should display the current track for all channels.

✔️ SD-18. Could you make the drop animation for tokens and groups animate much like the tokens do when they are picked up?

✔️ SD-19. I may want to create a new image for the stage control board, rather than use the existing one, and then provide you with a list of new mapping coordinates so that you can convert them to what they should be in-game. (For example, I might want to expand the five 'Mid Center' snap points horizontally to give more room for the Draggable sensor to distinguish between positions, in which case I'd supply you with the new coordinates for you to map them to the originals.)  To facilitate this, could you add a freely-draggable little targeting reticule that, when it is dropped, pastes the coordinate it was dropped on to my clipboard so I can easily paste it to a file that you can then review?

SD-20. Several snap points are extremely close together, resulting in difficulty targeting them when dragging tokens -- specifically the six center groups (i.e. groups other than the "Far .."-labeled groups). Do you have any suggestions on how we might improve this?
🤖 I switched drop targeting so it picks the nearest *pack* first, then the nearest snap inside that pack. That helps a little, but the snaps are still physically tight. Best lasting fix is new board art with those six packs spread out (the reticule is there so you can measure). A dashboard-only cheat would be to space the *visible* tokens farther than the in-game UVs, then map back on import — say if you want that.

✔️ SD-21. Let's animate the movement of tokens on the stage board. If it's possible for the draggable element to always be a 'ghost' (leaving the token in its original position, perhaps faded slightly to indicate that it's being dragged), then upon dropping the token, the token should smoothly move in a straight line to its new position (and any tokens that are swapping places should likewise be smoothly animated into their new positions).  Same with moving groups, upon dropping the group handle, and on moving tokens from the palette onto the game board.

✔️ SD-22. Moving a token off of the game board and dropping it should return it to the palette or, if it is an NPC who is occupying a seat, the stage token should disappear and the seated token restored to its pre-staged state. Moving an NPC token off of a seated position should unset them and return them to the palette. Finally, a "Clear Palette" button beneath the "Add NPCs..." button should remove all NPCs currently on the palette, deselecting them in the NPC modal.
🤖 The Add NPCs modal is gone; unused NPCs live in the left trays. Off-board drop already returns them there (and restores a seated NPC if they were only staged). I skipped “Clear Palette” — do you still want a button that removes every NPC from the board and trays, or only leftover “on deck” tokens from older drafts?

✔️ SD-23. Add a "Clear Stage" button overlaying the bottom left corner of the stage board. When clicked, it should turn red. When clicked again within five seconds, it should clear all staged NPCs (not seated NPCs) just as if they were each dragged off the board (i.e. returning them to the palette or to their seated position, as appropriate).

✔️ SD-24. Add a gently pulsing glowing aura to lit tokens, with the pulses staggered slightly from each other.  At minimum brightness the aura should still be visible, i.e. it should pulse between "minimal brightness" and "maximum brightness", which should be a fairly subtle change, just a gentle throbbing as if representing a dimly pulsing light.

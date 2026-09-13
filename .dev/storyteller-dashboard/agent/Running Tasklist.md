# Running Tasklist for Storyteller Dashboard Work

## Agent Instructions

This file is the progress tracker for Storyteller Dashboard work. **Do not create, update, or comment on Linear issues for this slice.** Review this file periodically to check for new instructions from the author. They will be presented in bullet-point form.

- Once you have completed an item, mark it with a '✔️' emoji at the front.
- If you need clarification or cannot perform a task, add a line directly beneath the relevant item, prefixed with a '🤖' emoji
- Author comments or responses will be prefixed with a '👨' emoji
- Completed & approved issues will be deleted from this running task list by the author.
- Incomplete, incorrect, or issues that otherwise deserve more attention will be flagged with a '❌', followed by a '👨'-flagged comment describing the issue

## Task List

✔️ Infrastructure: Vite + React + nested SCSS + Vitest on port **8788**. **Scenes tab feature work remains paused** until you want those items again — do not implement SD-3 / SD-8 follow-ups or SD-9–SD-19 yet.

❌ SD-3. The "move group" handle should be attached to the groups themselves, not tokens within a group. Initially position them directly on top of the label naming each group, and make them invisible. When they are hovered, they should GSAP-blink briefly, and only blink-pulse-and-stay when they are being dragged.
👨 The group-move handles are not located over top of the displayed group names on the image. Perhaps temporarily set them to be visible at all times, so that you can check and refine their positions until they're in the right place?

❌ SD-8. Remove the general instruction/status bar at the top. If an alert message has to be given, display them as expandable toast messages on the right side of the screen. (Feel free to download appropriate icons from game-icons.net)
👨 Toast messages should disappear when clicked on.

SD-9. The "Add NPCs" modal should remain open when an NPC is selected and added to the palette on the board, turning gold to represent that it is on the board, allowing multiple NPCs to be selected before closing the modal.

SD-10. Each group button should be assigned a class of the form `group-theme-<X>`, where "X" is a general category that collects the NPC groups into logical 'supergroups'. I can think of `group-theme-camarilla`, `group-theme-anarch`, `group-theme-werewolf`, `group-theme-civilian` (includes Touchstone and Civilian groups), `group-theme-retainer` (includes Crise-de-Lwa and Ducheski Revenant), `group-theme-sabbat`, `group-theme-aapilu`, `group-theme-hecata` and `group-theme-independent` (includes Autarkis). Those themes should then define a selection of color variables, which should be referenced for font color, background, and border in all button states (hover, active, selected, whatever).  FInally, the NPCs panel should be sorted by those groups.

SD-11. The board image itself has a lot more empty space than we need for this app. Can you scale and position it inside a non-overflowing parent panel, so that the unused space to the top and the right are cropped away, with the snap points and table map expanding to fill the available space?

SD-12. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. Be sure to test the appearance by placing some tokens on the game board and adjusting size and position of the names so that they display clearly, are clearly associated with their token, and don't overlap.

SD-13. Note the large amount of unused space to the left and right of the game board. I think we can better use that space, perhaps instead of an NPC selection modal, the left portion contains a series of pop-out panels, sorted by group that, when clicked, open up to display tokens for those NPCs that can be dragged directly from the panel onto the board? As for the space to the right of the game board, perhaps we can move some of the controls currently at the top over to that side, removing at least one row from the top section.

SD-14. I'd like to see more creativity in how you design the various control elements. District, Site and Skybox could be combined into a rectangular widget with buttons to change each; date controls could be condensed into an interesting and well-designed time control widget; weather controls could be contained in a weather-report style widget where various icons can be clicked to toggle through weather states, separating Rain, Snow, Wind, and Thunder into different controls that can be changed independently of each other. Lighting and top fog could also be incorporated into this widget, or perhaps a different one.  Consider checking sites like codepen, Pinterest, StackOverflow, Reddit -- those may be terrible examples, you may know of better sites to look at for UX inspiration, but I think we can do better and you should feel free to experiment with new ideas, see for yourself how they work, and then refine them or reject them and try something new.

SD-15. Remove input titles that are taking up vertical space, and replace them with placeholder content or other ways of indicating what an input is for.  For example, instead of the word "Skybox" above the Skybox button, you could have an appropriate icon with a hover-over tooltip reading Skybox, and place that to the immediate left of the button to set the skybox. Indicators may not be necessary at all, either -- Conditions, for example, simply repeats what the button always says.

SD-16. Full information should be displayed on-screen at all times. By which I mean Conditions should not merely be shown with a number, but rather as a list on full display. Soundscape should display the current track for all channels.

SD-17. The various Table B<#> buttons should be replaced by a single "Table B" button (since Table B dynamically resizes based on the number of seated characters).

SD-18. Could you make the drop animation for tokens and groups animate much like the tokens do when they are picked up?

SD-19. I may want to create a new image for the stage control board, rather than use the existing one, and then provide you with a list of new mapping coordinates so that you can convert them to what they should be in-game. (For example, I might want to expand the five 'Mid Center' snap points horizontally to give more room for the Draggable sensor to distinguish between positions, in which case I'd supply you with the new coordinates for you to map them to the originals.)  To facilitate this, could you add a freely-draggable little targeting reticule that, when it is dropped, pastes the coordinate it was dropped on to my clipboard so I can easily paste it to a file that you can then review?

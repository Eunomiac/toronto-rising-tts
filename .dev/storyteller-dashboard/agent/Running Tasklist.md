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

✔️ SD-13. Display the token's full name near or overlapping each token, which can disappear when the token is picked up for dragging but should otherwise remain visible at all times. **For Configuration of Offsets:** Add a debug button called "Fill and Lock", which fills every slot on the stage with Rashid Abdulrahman tokens, then removes the drag handler from the token itself, and adds a drag handler to the name element. Then, add another debug button called "Get Name Offsets", which reads the positions of all name elements and pastes them to my clipboard. Then, I can position the names suitably, and paste to you the offsets each name should get depending on its snap slot on the game board.

✔️ SD-13.5. In addition to setting the position of the names, I also need a way to cycle through left, center, and right alignment for the text. So, in addition to making the name labels draggable in this debug mode, also implement a double-click functionality that cycles through the alignments. Then, color-code the name to indicate the alignment it is currently set to:  #00FF00 for "center", #FFFF00 for "left", and #00FFFF for "right". The anchor point for the text should be set accordingly -- i.e. for right-aligned text, the name should extend out to the left, with the right edge of the text remaining at the same location.

✔️ SD-27. Dragging a group-move handle off the board should clear that entire group.
👨 Dragging a Group Handle off the side of the board likewise doesn't remove it, but presents a toast error telling me to drop it on a polar snap.

✔️ SD-28. "Off the board" should be any location that is not over the board image itself. When dragging anything, only the board should be set up as a drop target -- e.g. you cannot drag tokens onto _specific_ NPC drawers; dragging them over the drawers simply counts as "off the board" and the token is cleared normally.  Tokens that are being dragged off the board should get a red outline/tint/border/indication that dropping them will clear them.
👨 Dragging a token off of the left or right side of the board does not remove it from the board nor give it the red border indicating it will be removed.

✔️ SD-29. If I start to drag a group onto the board, but then change my mind and drag it back off the board, the group will often still snap to the nearest snap group family. If a drag handle is not within the bounds of the board, it should never result in tokens being added to the board when released. (This may be fixed by resolving SD-27 and SD-28, though.)

✔️ SD-30. Add a debug-only button called "Restore PCs" that removes all tokens from seated table positions, and replaces them with the default spread of the five PC tokens.

✔️ SD-31. Vary the red background color on the weather controls by intensity, as well as duplicating the icons: Low intensity should be darker red, increasing to full #FF0000 at maximum intensity.  The Wind button should get a cyan outline (not a border, to avoid repositioning) when it is applying winter wind instead of standard wind.

✔️ SD-32. I have added a map of Toronto image at `.dev\storyteller-dashboard\assets\scenes\districtMap.webp`. I'd like the District selection pop-up modal to display this image, and for the district buttons to be absolutely positioned on the map where their Districts are located.  To facilitate this, initially transform the buttons into draggable elements and add a button at the bottom of the modal that will output to my clipboard the absolute positions of each button. I'll then drag the buttons into the correct locations on the map, output their positions, and provide them to you so you can lock them in.  (The map image itself is 800 x 1000 pixels, so you should be able to display it at full size.)
👨 Change the button styles so that they are `opacity: 0` by default, and set the font color to a zero-alpha color (so the buttons remain sized by the text, though the text will never actually be visible). When hovered, the button should quick-fade in a translucent gold fill, and when selected, a gold border should be made visible (with no fill). This is because each button is directly on top of an existing label for the district it is associated with, baked into the image.

✔️ SD-34. When a token is moved onto a snap point that already includes a token, the token positions should be swapped. (This includes token positions for seated players.)
👨 This works for staged NPC tokens, but seated players are not swapped (dropping a seated token onto another occupied seat slot simply leaves both tokens in their original positions)

✔️ SD-35. The district selection screen should have no scroll bars -- it must display at full 1000px height.  This means removing the top label bar, and changing the "Close" button into a smaller, floating "X" button absolutely-positioned over the top-right corner of the image. The image itself should take up the full pop-up frame, and scroll bars should be removed.

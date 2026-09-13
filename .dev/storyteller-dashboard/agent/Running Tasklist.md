# Running Tasklist for Storyteller Dashboard Work

## Agent Instructions

This file is the progress tracker for Storyteller Dashboard work. **Do not create, update, or comment on Linear issues for this slice.** Review this file periodically to check for new instructions from the author. They will be presented in bullet-point form; once you have completed an item, mark it with a '✔️' emoji at the front. If you need clarification or cannot perform a task, add a line directly beneath the relevant item, prefixed with a '🤖' emoji; a response from me will come either in the form of revising the task (and deleting your comment), and/or in a line directly beneath prefixed with a '👨' emoji.

## Task List

✔️ 1. Is the `Draggable` library available with a free GSAP download? If so, let's install GSAP as I suspect we'll make good use of its many animation features.  For now though, implement the dragging of tokens through GSAP as it's much more responsive.

✔️ 2. Tokens are too large. After some experimentation in the Inspector, I found that tokens on the stage should be `2.4%`, and seated tokens should be `3.6%`. Once you have GSAP installed, picking up a token should have it size up to `5%` with a quick hapic-feedback GSAP pulse. Ghost images of tokens should appear as dragged tokens approach snap points (I'm pretty sure GSAP facilitates this)

✔️ 3. The "move group" handle should be attached to the groups themselves, not tokens within a group. Initially position them directly on top of the label naming each group, and make them invisible. When they are hovered, they should GSAP-blink briefly, and only blink-pulse-and-stay when they are being dragged.

✔️ 4. Token images need backgrounds (clipped to within the token ring), perhaps a diagonal gradient of greys?

✔️ 5. There's an issue with retrieving the images; `src` values like "/catalogued-npc-images/daevaGabrielCollard.webp" aren't pathing into the workspace root's asset folder.

✔️ 6. Remove the scene key input: The key should be derived from the scene's title, by removing incompatible characters and camelcasing it.

✔️ 7. Move the Copy/Import buttons at the bottom to the far right, and center-align the message in the port alert box (I have a clock widget at the bottom left of my screen, so that's a bad place to put things)

✔️ 8. Remove the general instruction/status bar at the top. If an alert message has to be given, display them as expandable toast messages on the right side of the screen. (Feel free to download appropriate icons from game-icons.net)
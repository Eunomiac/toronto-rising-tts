# Changes & Augmentations to the NPC Cutout & Display Panel

1. Enable the tooltips for NPC cutouts once spawned.
2. Set their tooltips to their full names (if tooltips are currently being used for functionality, use something else for the functionality).
3. Lights should be automatically activated in two cases:
    a. When an NPC is spawned into a position that has a (new) autoLight value of true.
    b. When an NPC whose lights are disabled is moved into a position that has a (new) autoLight value of true.
4. The NPC controls panel needs to be more responsive. I suggest two modifications to help this:
    a. Fully generate the NPC panel XML on load, rather than waiting for the panel to be opened.
    b. Instead of triggering all of the functionality when a button is clicked, instead it should only toggle the color of the button to green to indicate that it was clicked. Clicking the button again toggles the color back to white. A new "Apply" button should be added which, when clicked, applies all of the changes to the NPCs and closes the NPC panel. The only exception to this deferred functionality is the spotlight button: That should continue to set the NPC's light mode to spotlight for as long as it is held down.
5. Wire in NPC spawning into the table slots functionality. The NPC panel should have buttons to allow spawning NPCs into available table slots (which should be updated whenever the table changes).

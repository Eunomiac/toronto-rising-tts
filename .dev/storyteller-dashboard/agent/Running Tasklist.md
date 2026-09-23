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

✔️ SD-PCs. Live-play **PCs** tab: two-page spread matching sheet page 1, player rail replacing the in-game Storyteller PCs toolbar, GSAP ring menus, local stand-in edits when TTS snapshot is silent. Visual pass at 1920×1080: equal pages, Hunger ring, player switch. Live apply still waiting on TTS returning snapshot JSON.

✔️ SD-PCs Round 1. Colons off, Desire placeholder, specialties hover row, ten Health/Willpower boxes, Mano Negra, Ancilla subtitle, image rings with left/right click, Hunger/XP click without a popup. Stand-in apply covers overflow damage, impaired stains, Mend/Refresh, badges. Live TTS still needs Save & Play.

✔️ SD-PCs Claim/Release port. Red **Claim Port** seizes 39998 (including TTS Tools) and retries the live sheet. Green **Release Port** drops the dashboard hold so TTS Tools can reconnect. Snapshot JSON is printed from the execute-lua call so the tab can read it when TTS omits `return`.
✔️ Bridge status no longer probes 39998/39999 on a timer (that hitch TTS). Status is local hold-state only until the gateway can answer without touching TTS.

✔️ SD-PCs live-only (no fixture). Offline shows **No live sheet** + reason. Identity and Ambition come from TTS snapshot / `playerData.ambition` only.
✔️ SD-PCs **JSON** debug button. Opens a scrollable modal with pretty-printed live seat snapshot; patch textarea + **Apply** deep-merges into TTS (`mergeSeat`).
✔️ Dashboard Lua bridge folder: `dashboard/pc_sheet.ttslua` (`require("dashboard.pc_sheet")`), not under `core/`.

✔️ SD-PCs apply batch. Rapid PCs-tab clicks that pile up while TTS is busy go in one `GlobalDashboardPcSheetApply` array (TOR-595). Dashboard still paints immediately.

SD-37. Whenever a new site is selected, the Skybox should be reset to "[site default]"
SD-38. When an NPC token is moved to a seated slot at the table, they should continue to occupy that slot even if they are subsequently dragged onto a stage area: Their token should be duplicated and the seated version of their token should be set inactive. A single NPC cannot have both an active seated token and a stage token (whether active or inactive): If they have a token on the stage, their seated token must be inactive. If their seated token is double-clicked (i.e. activated/lit), the stage token must be cleared from the board to adhere to this rule. If the stage token is cleared from the board by some other means, their seated token should be set to the state it was when the staged token was added to the board. If a stage token is dragged onto a seat, it should not be duplicated, but simply moved to occupy that seat, defaulting to active/lit. (Let me know if I've failed to cover all of the possible combinations, but the general rule is that a seated NPC can only have a duplicate on the stage if their seated token is inactive.)
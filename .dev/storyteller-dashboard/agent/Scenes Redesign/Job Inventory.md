# Scenes Redesign — Job Inventory

## Agent Routing

Read this when:
- sketching, prototyping, or implementing the redesigned dashboard **Scenes** tab
- deciding which in-game Scenes panel / scene library / control board features move to the dashboard

Source of truth:
- author marks in the **You** column below (they override the agent's suggestion)
- current behavior: `core/storyteller_scenes_panel.ttslua`, `core/scene_library.ttslua`, `core/npc_gameboard*.ttslua`, `core/control_board_preview.ttslua`, `core/narrative_clock_lerp.ttslua`, `.dev/storyteller-dashboard/src/client/scenesTab.ts`

Status: current — round 0 (author priorities in; follow-up questions open)

## What this is

The redesigned Scenes tab replaces three in-game tools: the Storyteller **Scenes panel** (with its scene library and location pop-ups), the **NPC control board**, and the editing role of the **NPC stage**. This file lists every job those tools do today, so we can agree on what deserves space on one screen before drawing anything.

### Fixed requirements (from the author)

- **One screen, no scrolling.** Fullscreen browser at exactly **1920×1080**. No other size needs to work.
- **Intuitive**, and uses many visual methods (colour, icons, position, size, motion) to show as much as possible at a glance.
- **Changes queue up** in a small side panel. An **Apply** button sends the whole queue to TTS. A **Live** toggle sends each change immediately instead.
- **The dashboard owns** the scene library, the current scene, and the weather / time / NPC / table settings.
- **Anything that needs a real-time response inside TTS stays in TTS.** The only known case is the hover spotlight on control board tokens. Once everything else moves, the in-game board can be greatly simplified.

### How to mark priorities

Each job has a suggested placement in the **Mine** column. Put your own in the **You** column only where you disagree. Leave it blank to accept mine.

**Author Comment:** I have added a "**D**" priority mark for features that aren't merely unimportant, but that might actually make the interface more confusing if they aren't adequately hidden away unless needed. The ability to link/unlink scenes, for example, is something that should rarely need to be used,  yet surfacing it as a top-level option for scene management will almost certainly have me asking myself, 'what does this do again?' in a few months.

| Mark | Meaning |
| --- | --- |
| **A** | Always visible. Either I need to see it at a glance, or I use it in nearly every scene. |
| **B** | One click away (a pop-up, a flip-over panel, a hover). |
| **C** | Tucked away. Setup, rare, or debug only. |
| **D** | Actively hide to avoid confusion. |
| **X** | Drop it. Don't port this to the dashboard. |
| **T** | Stays in TTS. |

How-often guesses in the second column are mine. Correct any that are wrong — they drive the layout more than anything else.

## 1. Scene library

Today: 40 fixed slots in three columns. Importing can add more than 40, but rows past 40 are invisible in TTS.

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See which scene is on the table right now | Constantly | A | |
| Browse / search saved scenes | Every scene change | B | |
| Select a scene to prepare it without touching the table (today's blue "pending" row + THERE board) | Every scene change | A | |
| Apply the prepared scene to the table (blindfold transition, table switch, NPCs, location, clock) | Every scene change | A | |
| Show the 'present day' time & date and the current scene's time and date, if different | Constantly |  | A |
| Choose how the clock is set on Apply: the scene's own time, present day, present day +15/30/60/120 min, ×5 catch-up to now, set present day to the scene's time | Every scene change | B | |
| See whether the scene on the table is **linked** (live table changes are copied back into its library row) | Occasionally | A (small badge) | D, by inverting the visual cue: The table scene should be assumed to be linked; only when it has been unlinked should a clear visual distinguishing marker be shown. |
| Unlink the live scene from its library row | Rare | C | D |
| Fork: save the current table as a new scene and freeze the original | Occasionally | B | |
| End the scene (default no-scene table, random generic skybox, lights dim) | Once per scene | B | A |
| Create a new scene from scratch (today: the dashboard Scenes tab + Copy JSON / Import in TTS) | Between sessions | B | C |
| Import a scene from pasted JSON | Rare (once the dashboard owns the library) | C or X | X |
| Rename a scene | Rare | C | C, plus scenes should be given a default name derived from their location (District/Site) |
| Delete a scene (two-click confirm) | Rare | C | |
| Reorder / group scenes in the library | Between sessions | C | |
| Carry the current participants into the next Apply (today: control board **Lock**) | Occasionally | B | |

## 2. Where — location

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See district, site and skybox | Constantly | A | |
| Pick a district (today: 36 buttons; dashboard: Toronto map with pins) | Every scene change | B | |
| Pick a site (186 sites grouped by district, plus 70 general sites) | Every scene change | B | |
| Override the skybox (95 skyboxes), or clear the override | Occasionally | B | |
| See / toggle top fog (follows the site: outdoor on, indoor off, unless the site says otherwise) | Occasionally | A (icon) | |
| See the conditions the location adds (site + district catalog conditions) | Every scene | A (chips) | |
| Add or remove scene conditions by hand | Occasionally | B | |

## 3. When — scene clock

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See the scene's date and time | Constantly | A | |
| See time left until dawn / time since dusk | Constantly | A | |
| Jump time forward or back (10–60 min, 1–8 h, 1–6 days, 1–6 weeks, 1–12 months; animated in TTS) | Several times a session | A | |
| Jump to dawn minus N / dusk plus N minutes (0, 5, 15, 30, 60, 120) | Occasionally | B | |
| Jump by years (absolute year, or ± relative; lands at dusk + 1 h) | Rare | C | |
| Type an exact date and time | Occasionally | B | |
| See / set **present day** (the chronicle's "now", which advances when scenes move forward) | Occasionally | B | We need to make the display and management of scene time intuitively clear; I find myself often getting confused as to present time/scene time in the TTS interface; the colors aren't quite enough. |
| Real-time ticking on/off and speed multiplier | Occasionally | B | |
| Downtime clock (separate clock used during the Downtime phase) | Between sessions | C | |

## 4. Who's at the table — seats

Vocabulary: **present / absent** is narrative only (seat lit or dark, chair stays). **Disconnected** is a PC whose client is not connected; only connection changes that. The dashboard shows disconnection but never sets it.

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See the table layout (Table A, Table B family B0–B5, Table C, Scatter) | Constantly | A | |
| Switch table layout (runs behind a blindfold, random seating) | Occasionally | B | |
| See each seat at a glance: who sits there (PC or NPC), present or absent, disconnected | Constantly | A | |
| Toggle a seat present / absent | Several times a session | A | |
| Seat an NPC at the table, or remove them from their chair | Occasionally | A (drag) | |
| Move an NPC between their seat and the stage (SD-38 rules: a seated NPC may have a stage copy only while their seat is dark) | Occasionally | A (drag) | |
| See which PC is playing an NPC role (`npcRoleOverride`) | Rare | B | A: The NPC they are playing should be clearly visible, perhaps overlayed on top of their token |

## 5. Who's on the stage — NPCs

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See every NPC on stage: where, which group, lit or unlit | Constantly | A | |
| Place an NPC on the stage (drag from a group tray onto a polar pack) | Every scene | A | |
| Place a whole group at once (tray handle → nearest pack, leader on the anchor) | Every scene | A | |
| Move an NPC or a whole pack | Several times a session | A | |
| Light / unlight an NPC (today: flip the token) | Several times a session | A | |
| Light / unlight a whole pack | Occasionally | A | |
| Remove an NPC or pack from the stage | Several times a session | A | |
| Clear the whole stage (today: two-click confirm) | Once per scene | B | |
| Find an NPC fast (search across all groups) | Several times a session | A | |
| Add generic NPCs to the scene (today: type catalog keys, then name them) | Occasionally | B | A |
| Recover stray tokens / re-snap the palette (today: right-click Clear) | Rare | X (no physical tokens on the dashboard) | |
| Snaps on / off on the control board | Rare | X | |
| Hover spotlight on an NPC token (hold the hotkey, hover a token, that NPC lights up in the world) | During play | T | |
| Roll dice for a PC or NPC by dropping their token on a dice bag | During play | T? (see open question 4) | B |
| Drag a figurine in the world to re-aim its light | Rare | T | |

## 6. Scatter mode

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| Switch into / out of Scatter (six groups, each with 5 PC slots and 12 NPC slots) | Rare | B | |
| Place PCs and NPCs into Scatter groups | When in Scatter | A (replaces the stage while active) | |
| See which group each player picked (players choose their own group in their HUD) | When in Scatter | A | |

## 7. Atmosphere

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See the weather (rain, wind, thunder; today it follows an hourly schedule tied to the clock) | Constantly | A | |
| Override the weather by hand (today: not possible in TTS; dashboard draft has rain / snow / wind / thunder) | Occasionally | B | |
| See / pick the lighting preset (today: set by the site or scene, no panel in TTS) | Occasionally | B | |
| Scene soundscape (which narrative music the scene uses) | Every scene change | B | |
| Live music / volume controls (today: separate Soundscape panel) | Several times a session | In scope (open question 6); broken out below | |

### 7a. Soundscape panel (added after open question 6)

| Job | How often (guess) | Mine | You |
| --- | --- | --- | --- |
| See what is playing: music lane, featured track, location ambience, rain / wind / thunder, indoors | Constantly | A | |
| Switch background music lane (Main, Intrigue, Combat, Location) | Several times a session | A | |
| Play / stop a featured track (TR Full, TR Intro, TR Loop, STB) | Occasionally | B | |
| Lane volumes (Music, Location, Featured, Rain, Wind) | Occasionally | B | |
| Stop all sound | Rare | B | |
| Silence for save | Rare | C | |
| Inspect (debug readout of emitters) | Rare | D | |

## 8. Probably not Scenes

| Job | Today | Mine | You |
| --- | --- | --- | --- |
| Daysleep willpower refresh (gold button on the Scenes panel) | Scenes panel | Move to a phases area | A (this will occur during scenes/downtime, but always during the Play phase) |
| Debug: Fill Stage, Fill and Lock, Get Name Offsets, Restore PCs, Clear Stage | Dashboard Scenes tab | C | D |
| Board reticule (drop to copy board coordinates) | Dashboard Scenes tab | C | D |

## 9. At-a-glance budget

These are the things I'd plan to show without any click. Strike out or add to this list — it is the hardest constraint on the one-screen layout.

1. Scene on the table: title, linked or not, and whether a different scene is being prepared.
2. Queue: how many changes are waiting, Live on or off, TTS connected or not.
3. Where: district, site, skybox, top fog, location conditions.
4. When: date, time, time until dawn, real-time ticking on or off.
5. Weather: rain, wind, thunder (and snow once Lua supports it).
6. Table: layout name, and every seat's occupant, presence and connection.
7. Stage: every NPC's position, group colour, and lit state.

## Open questions for the author

Answer inline under each question with a line starting **Answer:**.

1. **Where does the scene library live?** If the dashboard owns it, it would be a file on disk next to the dashboard (git-ignored, like the term tooltips). Should TTS keep a copy in the save, so a scene can still be applied when the dashboard isn't running? Or is the dashboard always running when you play? **ANSWER:** Dashboard will always be running. Dashboard should own it as a JSON file on disk, but this should NOT be gitignored -- and the tooltips should be un-gitignored, too. I want to be able to use the repo to restore older versions of chronicle data if necessary.
2. **What goes in the queue?** Small changes (light an NPC, jump the clock 10 minutes) obviously queue. Should a **whole scene switch** also be one queued item, or should Apply Scene always fire at once with its blindfold transition? **ANSWER:** Any actions that are bundles of many actions should bypass the queue and apply immediately, including scene transitions.
3. **Preparing vs. live.** Today TTS uses green for "this edits the live table" and blue for "this edits a scene that isn't on the table yet". I'd keep that colour rule for the whole tab. Is preparing the next scene while the current one plays something you do often enough to deserve a permanent split view? Or is a mode switch enough? **ANSWER:** I would like the ability to select a different scene and trigger a panel to slide out showing everything about that scene; I can make edits in the panel, click off of it to view the actual live scene without closing/applying the preview panel, then slide the preview panel back out to continue working on it. I should be able to have multiple "in progress" preview panels (max  of one per scene), switching between them as necessary. Each should have a clear 'apply' button that will update the scene library and close the preview panel.
4. **Dice-bag rolls from tokens.** Today you can drop a PC or NPC token on a dice bag on the control board to start a roll. Does that stay in TTS, move to the dashboard (click a seat, pick a roll type), or go away? **ANSWER:** Move to the Dashboard, triggered via right-clicking on the character's dashboard representation.
5. **Weather authority.** TTS weather currently follows the hourly schedule only. Should the dashboard show the scheduled weather with an optional override? Or should hand-set weather replace the schedule for a scene? **ANSWER:** Scheduled weather, optional override. When an override is in place, this should be made very clear with a stark visual change, and it should be easy to remove overrides and restore baseline behavior.
6. **Soundscape scope.** Is the live Soundscape panel (music lanes, volumes, featured tracks) part of this redesign, or a separate later tab? The scene's own soundscape setting is assumed in scope. **ANSWER:** Let's include the Soundscape panel in this, as well.  I don't think it needs its own Dashboard tab, so it will likely end up in here anyways.
7. **In-game board after the move.** Once the dashboard takes over, the in-game control board only needs NPC tokens for the hover spotlight. Should tokens there just mirror whatever the dashboard placed (read-only), or do you still want to drag them in TTS sometimes? **ANSWER** I may want to drag the tokens around to arrange them logically for my own purposes, but no scripting behavior needs to be attached to their positioning on the board, only the spotlight listener.

## Follow-up questions

Answer inline the same way, with a line starting **Answer:**.

1. **Public repo vs. committed chronicle data.** The GitHub remote for this repo is public. Committing the scene library and term tooltips there would publish chronicle content (scene titles, NPC placements, your notes) and the pasted tooltip images. Those are often rulebook screenshots, which is why they were git-ignored in the first place. Version history is a good goal, so which of these do you want?
   - (a) Make the `toronto-rising-tts` GitHub repo private, then commit both.
   - (b) Keep the code repo public, and put chronicle data (scene library, term tooltips) in a separate **private** repo that the dashboard reads from.
   - (c) Commit them publicly anyway; you're comfortable with them being visible.

2. **Which actions count as "bundles" that skip the queue?** My proposed list of actions that always fire immediately:
   - applying a scene;
   - ending the scene;
   - switching table layout;
   - changing location (it runs a blindfold transition);
   - jumping the clock (TTS animates it and re-runs weather and lights);
   - Daysleep refresh;
   - clearing the stage;
   - dice rolls.

   Everything else queues: lighting or moving single NPCs, placing a group, seat presence, weather overrides, conditions, skybox, fog, and soundscape changes. Should anything move between the two lists? And when a bundle fires while changes are still queued, should the queue be sent first (my suggestion), or left waiting?

3. **Three different "Apply" buttons.** As described, the tab would have:
   - the queue's Apply, which sends waiting changes to TTS;
   - a preview panel's Apply, which saves the edits to the library and closes the panel;
   - the action that actually puts a scene on the table.

   I'd give them different names so they can't be mixed up, for example **Send** (queue), **Save** (preview panel) and **Play Scene** (put it on the table). Is that OK? Also, should a preview panel have a **Play Scene** button of its own, so you can save and go straight to that scene?

4. **Preview panels — a few edge cases.** Here's what I'd assume; correct any that are wrong.
   - In-progress previews survive a dashboard restart.
   - Each preview has a **Discard** button that throws away its edits.
   - You can't open a preview of the scene that's on the table, because the main view already is that scene, and edits there go live (through the queue) and are copied into its library row automatically.

5. **Present day vs. scene time.** To make the clock clear instead of colour-coded, it helps to know how the two drift apart in your play. In which situations is a scene set at a different time from present day: flashbacks, Memoriam, scenes prepared in advance, the ×5 catch-up? And when you've been confused in TTS, which question were you trying to answer? For example, "what time will it be when I apply this scene?" or "has present day moved since last session?"

6. **NPC rolls.** Right-clicking a character opens a roll menu. For PCs that's clear: the same roll types as the dice bags (standard, discipline, willpower, frenzy, rouse, remorse / Oblivion-rouse). Today, dropping an NPC token on a dice bag does nothing. What should an NPC roll do: roll a dice pool you type in, or something else? Note that right-click on tooltip-tagged words (disciplines, skills) already opens the tooltip editor. That's fine as long as character tokens aren't tagged, but say so if you want tooltips on NPC names too.

7. **Weather override scope.** When you override the weather, should the override:
   - belong to the scene and be saved in its library row, or
   - last until you clear it, even across scene changes?

   Also, the dashboard has snow controls but TTS has no snow yet. Do you want snow added in TTS as part of this work (Lua and art work), or should snow stay hidden for now?

8. **In-game control board tokens.** The hover spotlight needs a token on the in-game board for every NPC on the stage. When the dashboard puts an NPC on stage, should their in-game token:
   - appear somewhere predictable that mirrors the dashboard layout, which you can then rearrange freely, or
   - appear in a simple holding row?

   When an NPC leaves the stage, their token would go back to the palette. PC tokens on the in-game board would no longer have a job, since rolls move to the dashboard and seat presence moves too. OK to remove them?

9. **Generic NPCs and the Stage NPCs tab.** You marked "add generic NPCs" as always visible. The dashboard's separate **Stage NPCs** tab (the generic cutout grid) does part of this job. Should that tab merge into the Scenes tab and go away? Or should it stay as a browsing / tagging tool while Scenes gets its own quick add?

10. **Daysleep refresh.** You marked it always visible. Today it's a manual button. Would it help if the dashboard also offered it automatically when a clock jump crosses dawn, as a prompt you confirm, not an automatic heal? Or keep it purely manual?

11. **Default scene names.** New scenes take their name from District / Site, as you asked. When two scenes share a site, I'd add a number ("Elysium — The Annex (2)"). Fine?

## Next rounds

- **Round 1** — three rough grey-box layouts at 1920×1080 in a dev-only **Lab** view of the dashboard, plus click-to-comment feedback pins. Each layout gives the **A** jobs above a different arrangement.
- **Round 2** — pick one (or a blend), add real art, icons and fake data, make it clickable.
- **Round 3** — plain-language behavior tables for the tricky rules (queue, preparing vs. live, seat/stage duplicates).
- **Build** — promote the Lab version into the real Scenes tab; Lua bridge work for the new commands gets Linear issues and Pending Author Verification rows.

Decisions and rejected ideas from each round go in [UX Experiments.md](../UX%20Experiments.md).

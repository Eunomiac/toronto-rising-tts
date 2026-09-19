# PC Sheet Revisions

## Revisions Round 1

### GENERAL CHANGES
- remove the colons after the names of attributes
- Change the desire placeholder to "Player has not selected a Desire ..."
- Reorganize specialties into a horizontal flex-group of spans delimited by ` ◆ `, that do not overflow into the next column (but are truncated, ideally with some indication that truncation has occured). On hover-over, the full list of specialties should be shown, overlapping the next column, with the entire hovered-over specialties row gaining a black background and gold border.
- Always show the full width of the Health and Willpower trackers, including empty boxes (i.e. always display ten boxes, even though some will be empty).
- Add new @font-face definitions for the two new "Mano Negra" fonts added to `.dev\Storyteller Dashboard Docs\PC Sheet Fonts.csv`
- Header Subtitle should be of the form "<Generation> Generation Ancilla of <Clan> ◆ <Bloodline>", e.g. "Eighth Generation Ancilla of Clan Malkavian ◆ Descendant of the Pythia" or "Eighth Generation Ancilla of the Banu Haqim ◆ Descendant of Ur-Shulgi" or "Eighth Generation Ancilla of Clan Tremere ◆ bani Gwo Samedi"

### POP-UP STAT CONTROLS
- Use one button for each dot/box type, instead of two. **Left-clicking** a control **adds** a dot, **right-clicking** that control **removes** a dot, unless other instructions are specified below.
- Do not close the popup menu after a click, as user may want to add/remove multiple dots, unless other instructions are specified below.

#### ATTRIBUTES & SKILLS
- Three buttons, each depicted as one of the images added to assets/buttons:
  - `assets/buttons/trait_base.webp` — for permanent changes to the character's base stats
  - `assets/buttons/trait_temp.webp` — for adding/removing temp dots
  - `assets/buttons/trait_disable.webp` — for adding/removing disabled dots
- A fourth button modifies the badge, depicted exactly as the badge currently appears (i.e. the glowing, signed number). **Left-click** adds 1, **right-click** subtracts 1. Clamp to between -5 and +5. Button should show the current badge (or "+0" if there is no badge). _(Badges haven't been implemented in the Lua quite yet, but please include the badge data in JSON passed to Lua for future implementation.)_

#### BLOOD POTENCY CONTROLS
Exactly as ATTRIBUTE & SKILL CONTROLS, with two exceptions:
- No fourth badge button
- Use `assets/buttons/bp_base.webp` instead of `trait_base.webp` for the button that makes permanent changes to the base stat.

#### HEALTH & WILLPOWER CONTROLS
- Two buttons for adding/removing damage:
  - `assets/buttons/tracker_sup.webp` — for adding/removing superficial damage
  - `assets/buttons/tracker_agg.webp` — for adding/removing aggravated damage
  - NOTE: When a point of damage (of any type) is added to a full tracker, the leftmost point of superficial damage already on 	the tracker is converted into aggravated damage. If the entire tracker is full of aggravated damage, nothing happens.
- One button is used to clear all **superficial** damage on a left-click, and all **aggravated** damage on a right-click.
  - `assets/buttons/tracker_clear.webp`
- [WILLPOWER ONLY] A fourth button that, when clicked, removes up to X superficial damage boxes, where X is the HIGHER of their Resolve or Composure attributes (including temp/disabled dots)
  - `assets/buttons/tracker_refresh.webp`
  - CLOSE THE MENU after this button is clicked.
- [HEALTH ONLY] A fourth button that, when clicked, removes up to X superficial damage boxes, where X is equal to the character's Mending value. (Query the game for this value each time, and note that this value can be modified by Conditions like bumpBloodPotency -- you should always get the character's current mending value from the proper game functions that account for Conditions)
  - `assets/buttons/tracker_mend.webp`
  - CLOSE THE MENU after this button is clicked.

#### HUMANITY CONTROLS
- One button for adding/removing Stains
  - `assets/buttons/humanity_stain.webp`
  - NOTE: if a stain is added but the tracker is already imparied, the hidden tally should not count this as an added stain. Currently, if I add three stains while the character is impaired, nothing changes on the tracker -- which is expected, as it's impossible to gain stains when you're already impaired. But when I then try to subtract stains, I need to click the subtract button the same number of times before I can finally begin removing actual stains
- One button for adding/removing permanent Humanity
  - `assets/buttons/humanity_base.webp`
  - NOTE: The number of stains, and whether there is overlap to cause the impaired Red box to appear, amy be changed by changes to the humanity totals and will need to be recalculated after any changes with this button
- One button to resolve the results of Remorse rolls. On a **left-click**, all Stains are removed. On a **right-click**, all Stains __AND__ one point of Humanity are removed.
  - `assets/buttons/humanity_remorse.webp`

#### HUNGER CONTROL
No popup menu is necessary. Simply have a **left-click** on the hunger bar add a hunger, and a **right-click** on the hunger bar subtracy a point.

#### EXPERIENCE CONTROL
No popup menu is necessary here. Simply have a **left-click** on the XP jewel add a point, and a **right-click** on the XP jewel subtract a point.

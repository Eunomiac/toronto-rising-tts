# -*- coding: utf-8 -*-
"""One-shot builder for the Storyteller Dashboard DnD interaction matrix CSV."""
from __future__ import annotations

import csv
from pathlib import Path

OUT = Path(__file__).with_name("dnd-matrix.csv")
NONDND = Path(__file__).with_name("nondnd-events.csv")

DRAGS = [
    "NPC - Staged Token",
    "NPC - Roster Token",
    "NPC - Seated",
    "PC - Seated",
    "PC Roll - Preroll",
    "PC Roll - Postroll",
    "NPC Roll - Preroll",
    'NPC Roll - Postroll, Revealed',
    'NPC Roll - Postroll, Secret',
    "Scene - Active",
    'Scene - On Deck, "New"',
    'Scene - On Deck, "Ongoing"',
]

# Indices for readability
STAGED, ROSTER, NPC_SEAT, PC_SEAT = 0, 1, 2, 3
PC_PRE, PC_POST, NPC_PRE, NPC_POST_R, NPC_POST_S = 4, 5, 6, 7, 8
SCENE_ACT, SCENE_NEW, SCENE_ONG = 9, 10, 11

NOOP = "⛔"
IMPOSSIBLE = "❌"


def bins(*lines: str) -> str:
    return "\n".join(lines)


def cell_row(values: list[str]) -> list[str]:
    assert len(values) == len(DRAGS), f"expected {len(DRAGS)} cells, got {len(values)}"
    return values


# --- Character panel bins ---
CHAR_A = bins(
    "● Standard Roll",
    "● Discipline Roll",
    "● Frenzy Roll",
    "● Willpower Roll",
    "● Contested Roll… (choose second participant by next drop or HOVER)",
)
NPC_B = bins(
    "● Rouse Check (1 die)",
    "● Rouse Check (2 dice)",
    "● Obliv-Rouse Check (1 die)",
    "● Obliv-Rouse Check (2 die)",
)
PC_B = bins(
    "● Remorse Roll",
    "● Rouse Check",
    "● Obliv-Rouse Check",
)
NPC_C = bins(
    "● Edit DRAG NPC",
    "● Open Tracker",
    "If Generic: ● Rename (Generic)",
)
PC_C = bins(
    "● Initiate Project",
    "● Change Stats",
    "● Open Sheet",
)

PC_PRE_A = bins("● Execute Roll", "● Cancel")
NPC_PRE_A = bins("● Execute Roll", "● Execute Secret", "● Cancel")
PRE_B = bins(
    "● Blood Surge",
    "● Adjust Pool (Dice Ring)",
    "HOVER: Convert Type",
    "● Standard",
    "● Discipline",
    "● Frenzy",
    "● Willpower",
    "● Rouse / Obliv-Rouse / Remorse (context)",
)
PRE_C = bins("● Pin to Drawer", "● Open Roller's Tracker/Sheet")

POST_A = bins(
    "● Broadcast",
    "● Broadcast Again",
    "● Confirm / Resolve",
    "● Dismiss",
)
POST_B = bins(
    "● Willpower Reroll",
    "● Reroll Selected",
    "● Recalculate",
    "If Hunger/Stain pending: ● Choose Hunger",
    "If Hunger/Stain pending: ● Choose Stain",
)
POST_C = bins("● Copy Result Summary", "● Pin to Drawer")

SECRET_POST_A = bins(
    "● SECRET-SAFE: Broadcast",
    "● Reveal Quietly",
    "● Reveal & Broadcast",
    "● Confirm / Hold",
    "● Dismiss",
)

SCENE_ACT_A = bins(
    "● Fork/Duplicate",
    "● End Scene",
    "● Memoriam…",
)
SCENE_NEW_A = bins(
    "● Fork/Duplicate",
    "● Edit/Preview Scene",
)
SCENE_ONG_A = bins(
    "● Fork/Duplicate",
    "● Edit/Preview Scene",
    "● End Scene",
)
SCENE_ACT_B = bins("● Unlink / Relink Library", "● Play timing (if re-entry)")
SCENE_NEW_B = bins(
    "● Play Now",
    "● Play at Scene Time",
    "● Set Status (New / Ongoing / Ended / Template)",
)
SCENE_ONG_B = bins(
    "● Play / Switch Now",
    "● Set Status (New / Ongoing / Ended / Template)",
)
SCENE_C = bins(
    "● Rename",
    "● Archive",
    "● Delete",
    "● Duplicate as Template",
)

HOVER_DIFF = bins(
    "HOVER: Shows Drop Sites",
    "● <Lower General Difficulty>: Sets Roll Difficulty to displayed Difficulty.",
    "● <Higher General Difficulty>: Sets Roll Difficulty to displayed Difficulty.",
)

DUP_OTHER_CHAR = bins(
    "If Same Character: ⛔",
    "If Other Character: Duplicates DRAG Roll, opens new Roll to DROP character.",
)

DUP_OTHER_PC = bins(
    "If Same PC: ⛔",
    "If Other PC: Duplicates DRAG Roll, opens new Roll to DROP PC.",
)

APPLY_SAME_TYPE = bins(
    "If Same Roll Type: Applies DRAG Roll Conditions & Difficulty to DROP Roll.",
    "If Other Roll Type: ⛔",
)

MARGIN_DIFF = "Sets Difficulty of DROP Roll to margin of DRAG Roll."
MARGIN_DIFF_SECRET = bins(
    "Sets Difficulty of DROP Roll to margin of DRAG Roll.",
    "(ST sees full margin; SECRET-SAFE toward players until DROP is revealed.)",
)

BROADCAST = "Broadcast DRAG Roll"
BROADCAST_SECRET = "SECRET-SAFE: Broadcast DRAG Roll (do not reveal dice / full outcome to players)"
COMPARE_POST = bins(
    "If Same Roll: ❌",
    "Otherwise: Compare / Show Opposed Margin (ST view).",
)

SWAP_SEATS = bins(
    "If Same Seat: ❌",
    "Otherwise: Swap DRAG and DROP seats.",
)

RETARGET_ROLL = bins(
    "If Same Character already owns DROP Roll: ⛔",
    "Otherwise: Retarget DROP Roll to DRAG character (rebuild pool from their stats where applicable).",
)


def fill_matrix() -> list[list[str]]:
    rows: list[list[str]] = []

    legend = (
        "LEGEND — Drop ▼ / Drag ▶. "
        "⛔=no-op (drop allowed, does nothing). "
        "❌=not possible. "
        "●=drop bin. "
        "HOVER: Shows Drop Sites + ● lines = ring bins while hovering; release elsewhere cancels. "
        "Conditions on separate lines with ':'. "
        "DRAG/DROP name the two sides. "
        "SECRET-SAFE: = broadcast/share without revealing dice faces or full outcome to players. "
        "PACK: = join/form a stage pack. "
        "Slide-Out A/B/C = importance tiers for bins (A most important), not final panel layout. "
        "Deactivate (PC) = narratively out of the scene; seat stays. Never clear a PC seat from the Dashboard; disconnected is client-only. "
        "Companion Non-DnD Events sheet lists double-click / right-click / icon actions not captured here."
    )
    rows.append([legend] + [""] * len(DRAGS))
    rows.append(["Drop ▼ / Drag ▶"] + DRAGS)

    # Out / Off / Nowhere
    rows.append(
        ["Out / Off / Nowhere"]
        + cell_row(
            [
                bins("If Seated: Restore to Seat", "Otherwise: Clear from Stage"),
                NOOP,  # roster isn't "on" anything
                "Clear from Seat",
                "Deactivate",  # narrative out of scene
                "Clear / Cancel",
                "Clear / Cancel",
                "Clear / Cancel",
                "Clear / Cancel",
                "Clear / Cancel",
                NOOP,  # can't dismiss active by flinging off
                "Remove from Deck",
                "Remove from Deck",
            ]
        )
    )

    # Slide-Out A
    rows.append(
        ["Slide-Out Panel A"]
        + cell_row(
            [
                CHAR_A,
                CHAR_A,
                CHAR_A,
                CHAR_A,
                PC_PRE_A,
                POST_A,
                NPC_PRE_A,
                POST_A,
                SECRET_POST_A,
                SCENE_ACT_A,
                SCENE_NEW_A,
                SCENE_ONG_A,
            ]
        )
    )

    # Slide-Out B
    rows.append(
        ["Slide-Out Panel B"]
        + cell_row(
            [
                NPC_B,
                NPC_B,
                NPC_B,
                PC_B,
                PRE_B,
                POST_B,
                PRE_B,
                POST_B,
                POST_B,  # rerolls still ST-side; reveal stays on A
                SCENE_ACT_B,
                SCENE_NEW_B,
                SCENE_ONG_B,
            ]
        )
    )

    # Slide-Out C
    rows.append(
        ["Slide-Out Panel C"]
        + cell_row(
            [
                NPC_C,
                NPC_C,
                NPC_C,
                PC_C,
                PRE_C,
                POST_C,
                PRE_C,
                POST_C,
                POST_C,
                SCENE_C,
                SCENE_C,
                SCENE_C,
            ]
        )
    )

    # Stage
    rows.append(
        ["Stage"]
        + cell_row(
            [
                "Move to DROP Position",
                "Add to Stage at DROP Position",
                bins(
                    "Deactivate DRAG Seat (narratively out / dark while staged)",
                    "Add to Stage at DROP Position",
                ),
                NOOP,  # PCs don't stage
                NOOP,  # preroll: nothing to broadcast
                BROADCAST,
                NOOP,
                BROADCAST,
                BROADCAST_SECRET,
                NOOP,  # already the live scene's world
                "Transition to DRAG Scene (play into the world)",
                "Transition to DRAG Scene (play into the world)",
            ]
        )
    )

    # Empty Seat Slot
    rows.append(
        ["Empty Seat Slot"]
        + cell_row(
            [
                bins("Clear from Stage", "Occupy DROP Seat Slot"),
                "Occupy DROP Seat Slot",
                "Move to DROP Seat Slot",
                "Move to DROP Seat Slot",
                NOOP,
                BROADCAST,
                NOOP,
                BROADCAST,
                BROADCAST_SECRET,
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # Pack (Stage Group)
    rows.append(
        ["Pack (Stage Group)"]
        + cell_row(
            [
                "PACK: Join DROP pack (or form pack with pack handle at DROP)",
                "PACK: Add DRAG to Stage and join DROP pack",
                bins(
                    "Deactivate DRAG Seat",
                    "PACK: Add to Stage and join DROP pack",
                ),
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # Roll Drawer Slot
    rows.append(
        ["Roll Drawer Slot"]
        + cell_row(
            [
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Standard / Discipline / Frenzy / Willpower / Rouse…: Start that roll for DRAG in DROP drawer slot",
                ),
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Standard / Discipline / Frenzy / Willpower / Rouse…: Start that roll for DRAG in DROP drawer slot",
                ),
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Standard / Discipline / Frenzy / Willpower / Rouse…: Start that roll for DRAG in DROP drawer slot",
                ),
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Standard / Discipline / Frenzy / Willpower / Rouse / Remorse…: Start that roll for DRAG in DROP drawer slot",
                ),
                "Pin DRAG Preroll to DROP drawer slot",
                "Pin DRAG Postroll result to DROP drawer slot",
                "Pin DRAG Preroll to DROP drawer slot",
                "Pin DRAG Postroll result to DROP drawer slot",
                "Pin DRAG Postroll (still Secret) to DROP drawer slot",
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # --- Transpose block: drag targets as drops ---

    # NPC - Staged Token
    rows.append(
        ["NPC - Staged Token"]
        + cell_row(
            [
                bins(
                    "If Same Token: ❌",
                    "Otherwise: PACK: Join/Form pack with DROP at DROP position",
                ),
                "Add to Stage near DROP (optionally PACK: join DROP if DROP is in a pack)",
                bins(
                    "If Same NPC: Restore DROP to Seat / clear stage copy of seated original",
                    "Otherwise: Deactivate DRAG Seat, Add to Stage near DROP (PACK: join if DROP in pack)",
                ),
                NOOP,
                HOVER_DIFF,
                DUP_OTHER_CHAR,
                HOVER_DIFF,
                DUP_OTHER_CHAR,
                bins(
                    "If Same Character: ⛔",
                    "If Other Character: Duplicates DRAG Roll as Secret, opens new Roll to DROP character.",
                ),
                bins(
                    "If DROP already present in Active Scene: ⛔",
                    "Otherwise: Mark DROP NPC present / Bring into Active Scene",
                ),
                bins(
                    "Add DROP NPC to DRAG Scene seat plan / present list (preview seating)",
                ),
                bins(
                    "Add DROP NPC to DRAG Scene seat plan / present list (preview seating)",
                ),
            ]
        )
    )

    # NPC - Roster Token
    rows.append(
        ["NPC - Roster Token"]
        + cell_row(
            [
                "Clear from Stage (return DRAG to roster dock)",
                bins("If Same Token: ❌", "Otherwise: ⛔"),
                "Clear from Seat (unseat DRAG NPC; returns toward roster)",
                NOOP,
                HOVER_DIFF,
                DUP_OTHER_CHAR,
                HOVER_DIFF,
                DUP_OTHER_CHAR,
                bins(
                    "If Same Character: ⛔",
                    "If Other Character: Duplicates DRAG Roll as Secret, opens new Roll to DROP character.",
                ),
                bins(
                    "Mark DROP NPC present / Bring into Active Scene (from roster)",
                ),
                "Add DROP NPC to DRAG Scene seat plan / present list",
                "Add DROP NPC to DRAG Scene seat plan / present list",
            ]
        )
    )

    # NPC - Seated
    rows.append(
        ["NPC - Seated"]
        + cell_row(
            [
                bins(
                    "If Same NPC: Clear from Stage, ensure DROP occupied",
                    "Otherwise: HOVER: Shows Drop Sites",
                    "● Swap seats with DROP",
                    "● Displace DROP to Stage, Occupy DROP Seat with DRAG",
                ),
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Swap: seat DRAG, move DROP NPC to roster/stage",
                    "● Displace DROP to Stage, Occupy DROP Seat with DRAG",
                ),
                SWAP_SEATS,
                SWAP_SEATS,
                HOVER_DIFF,
                DUP_OTHER_CHAR,
                HOVER_DIFF,
                DUP_OTHER_CHAR,
                bins(
                    "If Same Character: ⛔",
                    "If Other Character: Duplicates DRAG Roll as Secret, opens new Roll to DROP character.",
                ),
                bins(
                    "If DROP narratively absent: Activate / Into the scene",
                    "If DROP already present: ⛔",
                ),
                "Assign DROP NPC seat in DRAG Scene transition seating",
                "Assign DROP NPC seat in DRAG Scene transition seating",
            ]
        )
    )

    # PC - Seated
    rows.append(
        ["PC - Seated"]
        + cell_row(
            [
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Contested Roll vs DROP PC (DRAG as opposition)",
                    "● ⛔ elsewhere on seat chrome",
                ),
                bins(
                    "HOVER: Shows Drop Sites",
                    "● Contested Roll vs DROP PC",
                    "● ⛔ elsewhere",
                ),
                SWAP_SEATS,
                SWAP_SEATS,
                DUP_OTHER_PC,
                DUP_OTHER_PC,
                bins(
                    "If Same Character context N/A",
                    "Duplicates DRAG NPC Roll, opens new Roll to DROP PC.",
                ),
                bins(
                    "Duplicates DRAG Roll, opens new Roll to DROP PC.",
                ),
                bins(
                    "SECRET-SAFE duplicate: opens new Roll to DROP PC (still Secret until revealed).",
                ),
                bins(
                    "If DROP deactivated (out of scene): Activate / Into the scene",
                    "If DROP already present: ⛔",
                ),
                "Assign DROP PC presence in DRAG Scene transition seating",
                "Assign DROP PC presence in DRAG Scene transition seating",
            ]
        )
    )

    # PC Roll - Preroll
    rows.append(
        ["PC Roll - Preroll"]
        + cell_row(
            [
                RETARGET_ROLL,
                RETARGET_ROLL,
                RETARGET_ROLL,
                RETARGET_ROLL,
                bins(
                    "If Same Roll: ❌",
                    APPLY_SAME_TYPE,
                ),
                MARGIN_DIFF,
                APPLY_SAME_TYPE,
                MARGIN_DIFF,
                MARGIN_DIFF_SECRET,
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # PC Roll - Postroll
    rows.append(
        ["PC Roll - Postroll"]
        + cell_row(
            [
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,  # can't apply setup onto finished
                COMPARE_POST,
                NOOP,
                COMPARE_POST,
                bins(
                    "If Same Roll: ❌",
                    "Otherwise: Compare / Show Opposed Margin (ST view; SECRET-SAFE toward players for DRAG).",
                ),
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # NPC Roll - Preroll
    rows.append(
        ["NPC Roll - Preroll"]
        + cell_row(
            [
                RETARGET_ROLL,
                RETARGET_ROLL,
                RETARGET_ROLL,
                RETARGET_ROLL,
                APPLY_SAME_TYPE,
                MARGIN_DIFF,
                bins("If Same Roll: ❌", APPLY_SAME_TYPE),
                MARGIN_DIFF,
                MARGIN_DIFF_SECRET,
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # NPC Roll - Postroll, Revealed
    rows.append(
        ['NPC Roll - Postroll, Revealed']
        + cell_row(
            [
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                COMPARE_POST,
                NOOP,
                COMPARE_POST,
                bins(
                    "If Same Roll: ❌",
                    "Reveal DROP Secret using DRAG as reference? → prefer Panel A Reveal bins; here: ⛔",
                ),
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # NPC Roll - Postroll, Secret
    rows.append(
        ['NPC Roll - Postroll, Secret']
        + cell_row(
            [
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                bins(
                    "If Same Roll: ❌",
                    "Otherwise: Compare / Show Opposed Margin (ST only; keep DROP Secret toward players).",
                ),
                NOOP,
                bins(
                    "If Same Roll: ❌",
                    "Otherwise: ⛔ (do not auto-reveal DROP by dropping a Revealed roll onto it)",
                ),
                bins("If Same Roll: ❌", "Otherwise: Compare (ST only; both remain Secret toward players)."),
                NOOP,
                NOOP,
                NOOP,
            ]
        )
    )

    # Scene - Active
    rows.append(
        ["Scene - Active"]
        + cell_row(
            [
                bins(
                    "If DRAG narratively absent / dark: Activate / Into the scene",
                    "If already present: ⛔",
                ),
                "Mark DRAG NPC present / Bring into Active Scene",
                bins(
                    "If DRAG narratively absent: Activate / Into the scene",
                    "If already present: ⛔",
                ),
                bins(
                    "If DRAG deactivated: Activate / Into the scene",
                    "If already present: ⛔",
                ),
                NOOP,
                BROADCAST,
                NOOP,
                BROADCAST,
                BROADCAST_SECRET,
                IMPOSSIBLE,
                "Transition to DRAG Scene",
                "Transition to DRAG Scene",
            ]
        )
    )

    # Scene - On Deck, New
    rows.append(
        ['Scene - On Deck, "New"']
        + cell_row(
            [
                "Add DRAG NPC to DROP Scene seat plan / present list",
                "Add DRAG NPC to DROP Scene seat plan / present list",
                "Assign DRAG seat in DROP Scene transition seating",
                "Assign DRAG PC presence in DROP Scene transition seating",
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,  # don't demote active by dropping onto a deck chip
                bins(
                    "If Same Scene: ❌",
                    "Otherwise: Reorder deck — place DRAG relative to DROP",
                ),
                bins(
                    "If Same Scene: ❌",
                    "Otherwise: Reorder deck — place DRAG relative to DROP",
                ),
            ]
        )
    )

    # Scene - On Deck, Ongoing
    rows.append(
        ['Scene - On Deck, "Ongoing"']
        + cell_row(
            [
                "Add DRAG NPC to DROP Scene seat plan / present list",
                "Add DRAG NPC to DROP Scene seat plan / present list",
                "Assign DRAG seat in DROP Scene transition seating",
                "Assign DRAG PC presence in DROP Scene transition seating",
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                NOOP,
                bins(
                    "If Same Scene: ❌",
                    "Otherwise: Reorder deck — place DRAG relative to DROP",
                ),
                bins(
                    "If Same Scene: ❌",
                    "Otherwise: Reorder deck — place DRAG relative to DROP",
                ),
            ]
        )
    )

    return rows


def fill_nondnd() -> list[list[str]]:
    rows = [
        [
            "Non-DnD / Non-matrix actions — gestures that should remain accounted for alongside the Drag & Drop matrix. "
            "Map ring/icon actions here if they are not represented as drop bins or direct drops."
        ],
        ["Surface", "Gesture", "Action", "Notes / accounts for"],
        [
            "Stage token",
            "Double-click",
            "Toggle light / darken (lightMode STANDARD ↔ OFF)",
            "Not a drag; keeps staged presence while changing spotlight feel",
        ],
        [
            "Stage token",
            "Single-click (live)",
            "Open NPC tracker overlay",
            "Also available via Panel C ● Open Tracker",
        ],
        [
            "Stage / Seat",
            "Right-click",
            "Legacy roll ring + Into/Out of the scene + Rename (generic)",
            "Largely replaced by Slide-Out A/B bins + Deactivate / Activate drops; keep listed until rings removed",
        ],
        [
            "Empty stage",
            "Right-click",
            "Placement ⇄ Scatter · Clear Stage · Reset to Library",
            "Board-level ops; Clear Stage is bulk vs single-token Out drop",
        ],
        [
            "NPC - Pack (whole pack)",
            "Pointer drag pack handle",
            "Move entire pack on Stage; Out = disperse/clear policy TBD",
            "No full Pack drag column in v1 matrix; pack is drop-only target",
        ],
        [
            "Occupied seat (PC)",
            "Click",
            "Open PC tracker (Health / WP / Humanity / Hunger)",
            "Panel C ● Open Sheet is related but fuller",
        ],
        [
            "Occupied seat (PC)",
            "Double-click",
            "Open character sheet (PCs tab)",
            "Matrix: Panel C ● Open Sheet",
        ],
        [
            "Occupied seat (NPC)",
            "Click (live)",
            "Open NPC tracker",
            "Matrix: Panel C ● Open Tracker",
        ],
        [
            "Seat (draft / preview)",
            "Click",
            "Toggle present / out of the scene",
            "Matrix: drop character onto Active Scene / Out for live Deactivate-Activate",
        ],
        [
            "Signal flame",
            "Click",
            "Put out signal fire",
            "No drag analogue",
        ],
        [
            "Deck chip",
            "Click",
            "Play / switch to that scene",
            "Matrix: On-deck → Active Scene or Stage = Transition",
        ],
        [
            "Deck chip",
            "Right-click",
            "Edit / preview scene",
            "Matrix: Panel A ● Edit/Preview",
        ],
        [
            "Deck chip",
            "Hold",
            "End ongoing OR Remove from deck",
            "Matrix: Out = Remove from Deck; Panel A ● End Scene",
        ],
        [
            "Table scene title",
            "Click popover",
            "Unlink / Fork…",
            "Matrix: Panel A ● Fork/Duplicate; Panel B ● Unlink / Relink",
        ],
        [
            "Play a Scene modal",
            "Buttons",
            "End Scene · Memoriam… · Play · Edit · reorder · rename · delete · archive status · deck stars",
            "Several mirrored in Panel A/B/C and on-deck reorder drops",
        ],
        [
            "Hunt flavor",
            "Click",
            "PC picker ring → hunt / resonance roll flow",
            "No matrix column yet; candidate future drag: Hunt Token",
        ],
        [
            "NPC / PC roll panel",
            "Icons",
            "Configure stats · Blood Surge · Roll (R-click secret) · Take Half · WP reroll · Recalc · Reroll picks · Confirm (R-click hold) · Oblivion/Brutal choices",
            "Mirrored in Slide-Out A/B for preroll/postroll; keep icons until bins ship",
        ],
        [
            "Secret NPC postroll",
            "Explicit Reveal control",
            "Reveal Quietly / Reveal & Broadcast",
            "Must exist even if Panel A bins cover it — never reveal via ordinary Broadcast",
        ],
        [
            "Drawer slot",
            "Broadcast / Clear icons",
            "Broadcast pinned · Clear drawer",
            "Matrix: drop postroll onto Stage/Empty Seat/Active Scene also Broadcast; drop onto Drawer = Pin",
        ],
        [
            "Calendar / When",
            "Moon drag / date popup",
            "Set scene date / moon",
            "Intentionally outside character/roll/scene DnD matrix",
        ],
        [
            "Phase / Blindfold",
            "Advance / checkpoint",
            "Phase changes; connection checkpoints may set absentFromSession",
            "absentFromSession is client-connection only — never a Dashboard drag",
        ],
        [
            "Sound mixer",
            "Ambient grid popover",
            "Pick ambient beds",
            "Outside this matrix",
        ],
        [
            "Roster group cluster",
            "Click / colour +",
            "Expand cluster · Group editor",
            "Group drag exists in UI; not a matrix column in v1",
        ],
        [
            "Roster category header",
            "Drop group / right-click",
            "File group into category · Rename category",
            "Roster organization; separate from stage Pack drops",
        ],
    ]
    return rows


def main() -> None:
    matrix = fill_matrix()
    with OUT.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerows(matrix)
    print(f"Wrote {OUT} ({len(matrix)} rows x {len(matrix[0])} cols)")

    nondnd = fill_nondnd()
    with NONDND.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerows(nondnd)
    print(f"Wrote {NONDND} ({len(nondnd)} rows)")


if __name__ == "__main__":
    main()

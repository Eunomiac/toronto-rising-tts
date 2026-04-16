# Dice System Outline

I plan to implement a very robust and feature-packed dice system that will be used throughout the game. This document serves as an initial outline for the system.

## Flow of Control

There are many different permutations to the dice rolling system in Vampire: the Masquerade 5E, and this system needs to be able to seamlessly and elegantly handle them all, while presenting the results in a stylish and engaging way. This includes, but isn't limited to:

  - simple rolls
  - extended rolls involving multiple dice pools rolled in sequence
  - teamwork rolls involving multiple PCs
  - hidden difficulties set by the ST before the roll is even possible
  - presenting the player with the option to "take half" instead of rolling, after the ST has locked in the difficulty
  - opposed rolls, where two dice pools are rolled against each other instead of a static difficulty
  - willpower expenditures to reroll dice, as well as permutations to these rules that may be in place due to, e.g., unique District rules
  - handling all of the different types of rolls (Rouse Checks, Rouse Checks to activate Oblivion risking Stains, Remorse rolls that don't use Hunger dice, etc.)

To facilitate a flexible scaffolding on which all of these permutations can be built, I propose a "pass the baton" style of control flow. Typically, the Storyteller will set the initial parameters for the roll, and then pass the baton to the player. The player will then be able to roll their dice, and the system will pass the baton back to the Storyteller to confirm the results. But by making the baton-passing functionality flexible and modular, we can easily add new permutations to the system without having to rewrite large chunks of code. This will also allow for correcting in-game mistakes or events happening unexpectedly out-of-sequence due to the vicissitudes of six players interacting with the system in real-time (e.g. a naive approach to Teamwork rolls would require the ST to declare them as such when initiating the roll -- but perhaps another player only makes the suggestion after the baton has been passed, the players agree, and want to go back to the ST to confirm the roll as Teamwork, the ST can simply pass the baton back to themselves and continue with the roll as Teamwork.)

Perhaps the best way to do this would be to identify the components of a roll that must be locked in and in what order, while allowing maximum freedom within those steps to actually define them. For example, if we built the system around a Difficulty that we define only as a number that is used to calculate the margin, then that Difficulty could be defined by a static number set by the ST, or the result of another roll (for an opposed roll).

## Components of a Roll

The minimum components a roll needs to function at all are:

- Size of dice pool
- Number of Hunger dice vs. Standard dice
- Difficulty
- Interpretation of the roll into one of several possible classes of Result (Win, Critical Win, Messy Critical, Bestial Failure, Failure, Total Failure, Total Bestial Failure)

Extended rolls will necessarily involve weaving together multiple sets of the above components before a 'final' result for the entire extended test can be interpreted.

## Initial Planning Approach

The first step is to build a thorough understanding of all of the types of rolls and their various permutations, so that we can ensure the system is flexible enough to support them all.

We should also include here any allowances we want to include for correcting in-game errors, applying custom mechanics that may be in place due to, e.g., unique District rules, conditions, etc.

We also need to build a list of player options, such as spending Willpower to reroll dice, or taking half before the roll is even made, etc.

Then, we need to build a basic process that is minimally capable of gracefully handling all of the above, likely by limiting the amount of automation and relying more heavily on direct management by the players and the Storyteller. Rather than needing to detect or handle an opposed roll vs. a static difficulty, for example, the ST should have the ability to set the difficult before or after a roll is made (the latter enabling the ST to set that difficulty equal to the result of an opposing roll, if that's the desired outcome).  Likewise, rather than automating the substitution of Hunger dice (which would also require knowing whether the roll uses Hunger dice at all), we should initially rely on the player to assemble their own dice pools and simply trust the results of the roll as presented.

## Current State of the System

Although the workspace includes some dice-related functionality, all of this should be considered obsolete or irrelevant: We're building this from scratch.

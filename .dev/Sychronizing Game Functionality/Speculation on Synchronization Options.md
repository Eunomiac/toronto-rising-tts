# Synchronization: Ensuring ALL Game Features Are Aligned with Expected Results from Game State

A wide variety of game features, component settings, sound, lighting, object locking, object visibility, and a host of others depend on values in `gameState`, and it is essential that these features always be aligned with the current `gameState`. To illustrate what I mean, I will use the "HUNGRY" lighting mode for player lights as an example.

## Synchronizing the "HUNGRY" Player Lighting Mode

The "HUNGRY" player lighting mode should be active whenever a player's Hunger equals 4 or 5, and it should be disabled when a player's Hunger falls to 3 or below. But there are several competing systems that also dictate light behavior that we need to consider, making the issue more complex than a simple toggle trigger. For example:

- the "DARK" lighting mode is meant to override all other lighting modes, plunging the game space into darkness
- the "STANDARD" lighting mode is the player's default lighting mode: "HUNGRY" should override "STANDARD" when a player's Hunger exceeds 3
- the proper assignment of "DARK", "STANDARD", or "HUNGRY" must occur whenever the game loads, whenever a player's stats change, whenever a table is reassigned, and any other time that lighting modes would be changed
- even small changes may require synchronization: if a player is temporarily assigned a different lighting mode, and then they are restored to "STANDARD", synchronization should instead switch them to "HUNGRY" if their Hunger levels warrant it

**Importantly,** this is just one example of a dynamic system that needs to (a) respond at the appropriate time when triggered by game events; (b) allow itself to be overridden by higher-priority competing systems where appropriate (e.g. the "DARK" lighting mode); (c) persist through game loads and game state changes, ensuring the system is always aligned to the current state of the game.

## Brief, Incomplete Summary of Other Circumstantial/Dynamic Game States to Synchronize

- the soundscape needs to be synchronized with the game phase, the current scene/location, the music mood, and the weather
- player lighting, District and Site cards (i.e. player location), and NPC cutouts need to be synchronized to the current scene -- including in cases where multiple scenes exist simultaneously, and the Storyteller is switching between them, such as when the party splits up
- player UI components, including overlays and map locations, which depend on things like whether the player is in frenzy, what their Hunger level is, and whether the current scene is a Memoriam scene
- phase-dependent player controls, such as a button that normally triggers Humanity rolls instead triggering Remorse rolls during the End phase

## Tentative Proposal: A Master Synchronization Umbrella Method, Performant Enough to Run Frequently

For this reason, I wonder if it might be prudent to construct and centralize a synchronization system that collects these circumstance-dependent systems in one easily-editable place (e.g. a "SyncPlayerWithGameState" method, which would contain little low-level code, but instead act as an umbrella method that conditionally calls the major methods in other libraries that control game features—"conducting the orchestra", as it were). This umbrella method could be designed to be as efficient and performant as possible (by, e.g., checking what's actually happening in game against game state, and triggering only changes that are necessary), so that it can be called virtually all of the time: Whenever something changes in the game, this method could be run as the final step to guarantee alignment with game state.

**ABSOLUTELY CRITICAL:** I am NOT an expert developer. I am actually rather junior, and am doing this as a hobby. So it is essential that you treat me as such. Do not accept my suggestions without carefully considering them, with a focus on considerations I may have missed or software development conventions I may be unaware of. Monitor me for common junior developer pitfalls, and push back firmly when you spot them. For example, if I appear to be stuck in an X/Y Problem, it's crucial that you let me know so we can correct for my inexperience. Because this proposal is quite broad in its extent, I want you to be especially vigilant: Assume the role of a coach, expert, or teacher, and assume you know better than I do.

With that firmly established, let me explore this idea of mine in a little more detail.

### Master Sync Method: Preliminary Requirements

In order for such a master sync method to work, we need to ensure a few things up front:

1. All relevant data about what systems _should_ be doing must be stored in state, since the syncrhonization method will use game state as the sole source of truth on how everything should be configured.
2. We need to ensure that functionality is heavily encapsulated: Scripts should only be able to modify game systems with established methods, and never work around those methods by doing things directly (e.g. if code were to directly modify the settings of a light component without using `L.SetLightMode`, that could easily bypass the synchronization step entirely)
3. The umbrella method must be flexible, simple, performant, and comprehensive:
  3.a - Flexible: We still have a number of systems to implement, including scenes, weather and game phases. We will need to be able to easily incorporate necessary synchronization operations into this umbrella method as we add new functionality.
  3.b - Simple: The umbrella method should be very high-level, calling only the primary methods in other libraries and modules as required. Low-level direct manipulation of game objects, state data, or anything else should be contained in an appropriate function within the proper library, which this umbrella method can then call. I imagine the method will be little more than a series of conditional checks to decide which of the primary library methods to call, and how to call them
  3.c - Performant: I want to be able to call this umbrella method frequently, so it needs to be extremely efficient in its operation, only making changes or taking time-consuming actions only when required.
  3.d - Comprehensive: I don't want multiple synchronization functions in different libraries, but rather a single central method that collects these decisions in one place for easy maintenance. (We can apply helper functions and break aspects out into related methods if the function grows too unwieldy)

### Master Sync Method: A Very Incomplete Pseudocode Illustration

To further illustrate my thinking, here is how I imagine such a method might be structured:

```pseudocode
function M.SyncPlayerWithGameState(playerRef)
  // lighting check
  if player's light is "DARK" {
    confirm light component matches "DARK" mode, change it only if it doesn't
  } else if player is not in current scene {
    set player's light mode to "DARK"
    confirm light component matches "DARK" mode, change it only if it doesn't
  } else if player's Hunger is >= 4 {
    confirm player's light is "HUNGRY"
    if player has assumed the role of an NPC for this scene, don't make any changes to their lighting
      else confirm light component matches "HUNGRY" mode, change it if it doesn't
  } else {
    confirm light component matches player's lighting mode, change it if it doesn't
  }

  // hunger check
  confirm player's Hunger overlay matches their hunger value
  if player's Hunger is >= 4, confirm Hunger Smoke is active
    else, confirm Hunger Smoke is inactive

  // soundscape check
  switch (gamePhase) {
    case C.PHASES.SessionStart: {
      confirm TR_Intro into TR_Loop playlist is playing
      confirm all other sounds are disabled
    }
    case C.PHASES.Play: {
      get current scene data
      get current location data
      get current weather data

      // soundscape: music
      if a Featured music track should be playing
        confirm it is playing at full volume
        confirm all other sounds are silent
      else if the location has a custom music playlist
        confirm that playlist is playing and looping
      else if the Storyteller has set a mood
        confirm the proper mood playlist is playing and looping
      else
        confirm the "main" Background music playlist is playing and looping
      end

      // soundscape: weather
      confirm all weather tracks align with current weather conditions

      // soundscape: location
      if the scene is set at a location with ambient audio
        confirm the ambient audio track is playing and looping
      if the location's `isIndoors` field is true, apply ducking to weather audio
        otherwise, ensure weather audio is playing at full default volume (i.e. undo any previous ducking)
    }
    // .. more checks
  }

  // NPC cutouts checks
  confirm spawned NPCs match those present in the current scene; swap them out if they aren't


  // ... and so on
```

I will leave my incomplete musings here: I very much look forward to your comments!
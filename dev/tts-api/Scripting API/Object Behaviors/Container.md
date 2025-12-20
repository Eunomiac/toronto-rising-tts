## Table of Contents

* Function Summary
* Function Details
  * search(...)

# Container

The Container behavior is present on Container objects such as Bags, Stacks and Decks.

## Function Summary {#function-summary}

|Function Name|Return|Description| |
|---|---|---|---|
|search( `player` player, ` int ` max_card)|Activate search window for player, optionally limited to top N cards|return ` boolean `|[#search](#search)|

---

## Function Details {#function-details}

### search(...) {#search}

[../../types/](../../types/)Show the Search window for the container to ` player `. If you specify ` max_cards ` then the search will be limited to that many cards from the top of the deck.
> **Info: search(player, max_cards)**
>
> * [../../types/](../../types/) **player**: The player to show the Search window to.
> * [../../types/](../../types/) **max_cards**: Optional maximum number of cards to show.
>
```lua
deck.Container.search(Player.Blue, 3)
```

## Table of Contents

* Functions
  * getOptions()
  * layout()
  * setOptions(...)
* Options

# LayoutZone

The LayoutZone behavior is present on [Layout Zones](https://kb.tabletopsimulator.com/game-tools/zone-tools/#layout-zone).

## Functions {#functions}

|Function Name|Return|Description|
|---|---|---|
|getOptions()|return `table`|Returns the layout zones [options](#options).|
|layout()|return ` boolean `|Causes the layout zone to (re)layout.|
|setOptions( ` table ` options)|return ` boolean `|Sets the layout zone's [options](#options). If an option is not included in the table, then the zone's value for that option will remain unchanged.|

> **Example: Example**
> Log a layout zone's options.
>
> ```lua
> log(zone.LayoutZone.getOptions())
> ```
>
> ```lua
> log(zone.LayoutZone.getOptions())
> ```
>
## Options {#options}

Layout zone option tables may contain the following properties.

|Name|Type|Description|
|---|---|---|
|allow_swapping|` boolean `|When moving an object from one full group to another, the object you drop on will be moved to the original group.|
|alternate_direction|` boolean `|Objects added to a group will be aligned up or right, different from the preceding object in the group. Used, for example, in trick-taking games to make counting easier.|
|cards_per_deck|` int `|Sets the size of decks made by the layout zone when it combines newly added cards.|
|combine_into_decks|` boolean `|Whether cards added to the zone should be combined into decks. You may specify the number of cards per deck.|
|direction|` int `|The directions the groups in the zone expand into. This will determine the origin corner.|
|horizontal_group_padding|` float `|How much horizontal space is inserted between groups.|
|horizontal_spread|` float `|How far each object in a group is moved horizontally from the previous object.|
|instant_refill|` boolean `|When enabled, if ever a group is picked up or removed the rest of the layout will trigger to fill in the gap|
|manual_only|` boolean `|The zone will not automatically lay out objects: it must be triggered manually.|
|max_objects_per_group|` int `|Each group in the zone may not contain more than this number of objects.|
|max_objects_per_new_group|` int `|When new objects are added to a zone, they will be gathered into groups of this many objects.|
|meld_direction|` int `|The direction the objects within a group will expand into.|
|meld_reverse_sort|` boolean `|When enabled the sort order inside a group is reversed|
|meld_sort|` int `|How groups are sorted internally.|
|meld_sort_existing|` boolean `|When enabled all groups will be sorted when laid out, rather than only newly added groups.|
|new_object_facing|` int `|Determines whether newly added objects are turned face-up or face-down.|
|randomize|` boolean `|Objects will be randomized whenever they are laid out|
|split_added_decks|` boolean `|Decks added to the zone will be split into their individual cards.|
|sticky_cards|` boolean `|When picked up, cards above the grabbed card will also be lifted.|
|trigger_for_face_down|` boolean `|Face-Down objects dropped on zone will be laid out.|
|trigger_for_face_up|` boolean `|Face-Up objects dropped on zone will be laid out.|
|trigger_for_non_cards|` boolean `|Non-card objects dropped on zone will be laid out|
|vertical_group_padding|` float `|How much vertical space is inserted between groups.|
|vertical_spread|`float`|How far each object in a group is moved vertically from the previous object.|

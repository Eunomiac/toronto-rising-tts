## Table of Contents

* Member Variables

# Grid

Grid, a static global class, controls the in-game grid. It allows you to manipulate the placement and appearance of the grid in the same way as the in-game interface.
Example usage: `Grid.show_lines = true`.

## Member Variables {#member-variables}

|Variable|Description|Type|
|---|---|---|
|type|The type of the grid. 1 = Rectangles, 2 = Horizontal hexes, 3 = Vertical hexes.|` int `|
|show_lines|Visibility of the grid lines.|` boolean `|
|color|Color of the grid lines.|` color `|
|opacity|Opacity of the grid lines.|` float `|
|thick_lines|Thickness of the grid lines. false = Thin, true = Thick.|` boolean `|
|snapping|Method of snapping objects to the grid. 1 = Off, 2 = Lines, 3 = Center, 4 = Both.|` int `|
|offsetX|X offset of the grid origin.|` float `|
|offsetY|Y offset of the grid origin.|` float `|
|sizeX|Width of the grid cells.|` float `|
|sizeY|Height of the grid cells.|`float`|

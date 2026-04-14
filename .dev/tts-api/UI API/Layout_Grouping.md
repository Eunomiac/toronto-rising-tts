## Table of Contents

* Element Summary
  * Layout Summary
  * Scroll View Summary
* Layout Element Details
  * Layout Details
    * Panel
    * HorizontalLayout
    * VerticalLayout
    * GridLayout
    * TableLayout
      * Row
      * Cell
  * Scroll View Details
    * HorizontalScrollView
    * VerticalScrollView

# Layout/Grouping

By nesting elements within layouts/groupings, you are able to easily group elements together in-game. It allows for adjusting/moving them together, uniform padding and additional visual flair possibilities.
Each layout element has its own attributes specific to its type. Additionally, elements within a layout are subject to common [common layout element attributes](../attributes/#layout-element-attributes).

## Element Summary {#element-summary}

### Layout Summary {#layout-summary}

|Element Name|Description| |
|---|---|---|
|`<Panel></Panel>`|A "window" in which elements can be confined.|[#panel](#panel)|
|`<HorizontalLayout></HorizontalLayout>`|A horizontal row of elements.|[#horizontallayout](#horizontallayout)|
|`<VerticalLayout></VerticalLayout>`|A vertical column of elements.|[#verticallayout](#verticallayout)|
|`<GridLayout></GridLayout>`|A grid of elements.|[#gridlayout](#gridlayout)|
|`<TableLayout></TableLayout>`|A layout element based on HTML tables, allowing you to specify the position of elements in specific rows/columns.|[#tablelayout](#tablelayout)|
|`<Row></Row>`|A row within a TableLayout.|[#row](#row)|
|`<Cell></Cell>`|A cell within a TableLayout.|[#cell](#cell)|

### Scroll View Summary {#scroll-view-summary}

|Element Name|Description| |
|---|---|---|
|`<HorizontalScrollView></HorizontalScrollView>`|A scrollable horizontal row of elements.|[#horizontalscrollview](#horizontalscrollview)|
|`<VerticalScrollView></VerticalScrollView>`|A scrollable vertical column of elements.|[#verticalscrollview](#verticalscrollview)|

## Layout Element Details {#layout-element-details}

### Layout Details {#layout-details}

#### Panel {#panel}

A "window" in which elements can be confined.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|padding|Specifies the padding for this panel. Please note that if padding is specified, the panel will function as a LayoutGroup (which it does not do by default).|float(left) float(right) float(top) float(bottom)|(none)|

```lua
<Panel>
 <Text>Text contained within Panel</Text>
</Panel>
```

---

#### HorizontalLayout {#horizontallayout}

A horizontal row of elements.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|padding| |float(left) float(right) float(top) float(bottom)|`0 0 0 0`|
|spacing|Spacing between child elements.|float|`0`|
|childAlignment| |UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|` UpperLeft `|
|childForceExpandWidth| |` boolean `|` true `|
|childForceExpandHeight| |` boolean `|` true `|

```lua
<HorizontalLayout>
 <Button>Button One</Button>
 <Button>Button Two</Button>
 <Button>Button Three</Button>
</HorizontalLayout>
```

---

#### VerticalLayout {#verticallayout}

A vertical column of elements.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|padding| |float(left) float(right) float(top) float(bottom)|`0 0 0 0`|
|spacing|Spacing between child elements.|float|`0`|
|childAlignment| |UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|` UpperLeft `|
|childForceExpandWidth| |` boolean `|` true `|
|childForceExpandHeight| |` boolean `|` true `|

```lua
<VerticalLayout>
 <Button>Button One</Button>
 <Button>Button Two</Button>
 <Button>Button Three</Button>
</VerticalLayout>
```

---

#### GridLayout {#gridlayout}

A grid of elements.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|padding| |float(left) float(right) float(top) float(bottom)|`0 0 0 0`|
|spacing|Spacing between child elements|float(x) float(y)|`0 0`|
|cellSize| |float(x) float(y)|`100 100`|
|startCorner| |UpperLeft UpperRight LowerLeft LowerRight|` UpperLeft `|
|startAxis| |Horizontal Vertical|` Horizontal `|
|childAlignment| |UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|` UpperLeft `|
|constraint| |Flexible FixedColumnCount FixedRowCount|` Flexible `|
|constraintCount| |integer|`2`|

```lua
<GridLayout>
 <Button>Button One</Button>
 <Button>Button Two</Button>
 <Button>Button Three</Button>
</GridLayout>
```

---

#### TableLayout {#tablelayout}

A layout element based on HTML tables, allowing you to specify the position of elements in specific rows/columns.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|padding| |float(left) float(right) float(top) float(bottom)|`0 0 0 0`|
|cellSpacing|Spacing between each cell.|float|`0`|
|columnWidths|(Optional) Explicitly set the width of each column. Use a value of 0 to auto-size a specific column.|float list - e.g. '32 0 0 32'|(none)|
|automaticallyAddColumns|If more cells are added to a row than are accounted for by columnWidths, should this TableLayout automatically add one or more new auto-sized entries (0) to columnWidths?|` boolean `|` true `|
|automaticallyRemoveEmptyColumns|If there are more entries in columnWidths than there are cells in any row, should this TableLayout automatically remove entries from columnWidths until their are no 'empty' columns?|` boolean `|` true `|
|autoCalculateHeight|If set to true, then the height of this TableLayout will automatically be calculated as the sum of each rows preferredHeight value. This option cannot be used without explicitly sized rows.|` boolean `|` false `|
|useGlobalCellPadding|If set to true, then all cells will use this TableLayout's cellPadding value.|` boolean `|` true `|
|cellPadding|Padding for each cell.|float(left) float(right) float(top) float(bottom)|`0 0 0 0`|
|cellBackgroundImage|Image to use as the background for each cell.|string| |
|cellBackgroundColor|Color for each cells background.|` color `|`rgba(1,1,1,0.4)`|
|rowBackgroundImage|Image to use as the background for each row.|string| |
|rowBackgroundColor|Color to use for each rows background.|` color `|` clear `|

```lua
<TableLayout>
 <!-- Row 1 -->
 <Row>
 <Cell><Button>Button One</Button></Cell>
 <Cell><Button>Button Two</Button></Cell>
 </Row>
 <!-- Row 2 -->
 <Row>
 <Cell><Button>Button One</Button></Cell>
 <Cell><Button>Button Three</Button></Cell>
 </Row>
</TableLayout>
```

##### Row {#row}

A row within a TableLayout.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|preferredHeight|Sets the height for this row. Use a value of '0' to specify that this row should be auto-sized.|float|`0`|
|dontUseTableRowBackground|If set to true, then this row will ignore the tables' rowBackgroundImage and rowBackgroundColor values, allowing you to override those values for this row.|` boolean `|` false `|

##### Cell {#cell}

A cell within a TableLayout.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|columnSpan|__|int|`1`|
|dontUseTableCellBackground|If set to true, then this cell will ignore the tables' cellBackgroundImage and values, allowing you to override those values for this cell.|` boolean `|` false `|
|overrideGlobalCellPadding|If set to true, then this cell will ignore the tables' cellPadding value, allowing you to set unique cell padding for this cell.|` boolean `|` false `|
|padding|Padding values to use for this cell if overrideGlobalCellPadding is set to true.|float(left) float(right) float(top) float(bottom)|`0 0 0 0`|
|childForceExpandWidth| |` boolean `|` true `|
|childForceExpandHeight| |` boolean `|` true `|

---

### Scroll View Details {#scroll-view-details}

#### HorizontalScrollView {#horizontalscrollview}

A scrollable horizontal row of elements. This is an [input element](../inputelements/).
A layout element such as a Panel, HorizontalLayout, GridLayout, or TableLayout can be used to position child elements within the Scroll View.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|When a selection is made, its name is sent to a function with this name.|string|(none)|
|horizontal| |` boolean `|` true `|
|vertical| |` boolean `|` false `|
|movementType| |Unrestricted Elastic Clamped|` Clamped `|
|elasticity| |float|`0.1`|
|inertia| |` boolean `|` true `|
|decelerationRate| |float|`0.135`|
|scrollSensitivity| |float|`1`|
|horizontalScrollbarVisibility| |Permanent AutoHide AutoHideAndExpandViewport|` AutoHide `|
|verticalScrollbarVisibility| |Permanent AutoHide AutoHideAndExpandViewport|(none)|
|noScrollbars|If set to true, then this scroll view will have no visible scrollbars.|` boolean `|` false `|
|scrollbarBackgroundColor| |` color `|`#FFFFFF`|
|scrollbarColors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|scrollbarImage| |string| |

```lua
<HorizontalScrollView>
 <HorizontalLayout>
 <Panel>
 <Text>1</Text>
 </Panel>
 <Panel>
 <Text>2</Text>
 </Panel>
 <Panel>
 <Text>3</Text>
 </Panel>
 <Panel>
 <Text>4</Text>
 </Panel>
 </HorizontalLayout>
</HorizontalScrollView>
```

---

#### VerticalScrollView {#verticalscrollview}

A scrollable vertical column of elements. This is an [input element](../inputelements/).
A layout element such as a Panel, HorizontalLayout, GridLayout, or TableLayout can be used to position child elements within the Scroll View.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|When a selection is made, its name is sent to a function with this name.|string|(none)|
|horizontal| |` boolean `|` false `|
|vertical| |` boolean `|` true `|
|movementType| |Unrestricted Elastic Clamped|` Clamped `|
|elasticity| |float|`0.1`|
|inertia| |` boolean `|` true `|
|decelerationRate| |float|`0.135`|
|scrollSensitivity| |float|`1`|
|horizontalScrollbarVisibility| |Permanent AutoHide AutoHideAndExpandViewport|(none)|
|verticalScrollbarVisibility| |Permanent AutoHide AutoHideAndExpandViewport|` AutoHide `|
|noScrollbars|If set to true, then this scroll view will have no visible scrollbars.|` boolean `|` false `|
|scrollbarBackgroundColor| |` color `|`#FFFFFF`|
|scrollbarColors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|scrollbarImage| |string| |

```lua
<VerticalScrollView>
 <VerticalLayout>
 <Panel>
 <Text>1</Text>
 </Panel>
 <Panel>
 <Text>2</Text>
 </Panel>
 <Panel>
 <Text>3</Text>
 </Panel>
 <Panel>
 <Text>4</Text>
 </Panel>
 </VerticalLayout>
</VerticalScrollView>
```

---

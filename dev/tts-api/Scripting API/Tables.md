## Table of Contents

* Function Summary
* Table Names
* Function Details
  * getCustomURL()
  * getTable()
  * getTableObject()
  * setCustomURL(...)
  * setTable(...)
    * Human-Readable Names

# Tables

`Tables` is a global which provides the ability to interact with the Table object.

## Function Summary {#function-summary}

|Function Name|Description|Return| |
|---|---|---|---|
|getCustomURL()|Returns the image URL of the current [Custom Table](https://kb.tabletopsimulator.com/host-guides/tables/#custom-table), or ` nil ` if the current table is not a Custom Table.|return ` string `| |
|getTable()|Returns the current Table's [name](../object/#name) i.e. equivalent to ` getTableObject().name `.|return ` string `| |
|getTableObject()|Returns the current Table object.|return ` object `| |
|setCustomURL( ` string ` url)|Sets the image URL for the current [Custom Table](https://kb.tabletopsimulator.com/host-guides/tables/#custom-table). Has no effect if the current Table is not a Custom Table.|return ` boolean `| |
|setTable( ` string ` name)|Replaces the current Table with the Table matching the specified ` name `.|return ` boolean `|[#settable](#settable)|

## Table Names {#table-names}

[getTable()](#gettable)will return one of the following table names. [setTable(...)](#settable)will also accept these
names in addition to [human-readable names](#human-readable-names).

* Table_Circular
* Table_Custom
* Table_Custom_Square
* Table_Glass
* Table_Hexagon
* Table_None
* Table_Octagon
* Table_Plastic
* Table_Poker
* Table_RPG
* Table_Square

## Function Details {#function-details}

### setTable(...) {#settable}

[../types/](../types/)Replaces the current Table with the Table matching the specified ` name `.
> **Info: setTable(name)**
>
> * [../types/](../types/) **name**: Table [name](#table-names)or [human-readable name](#human-readable-names).
>
#### Human-Readable Names {#human-readable-names}

In addition to the table names [listed above](#table-names), `setTable(...)` will also accept the following
human-readable names:

* Custom Rectangle
* Custom Square
* Hexagon
* None
* Octagon
* Poker
* Rectangle
* Round
* Round Glass
* Round Plastic
* Square

> **Example: Example**
> Replace the current Table with the Poker Table.
>
> ```lua
> Tables.setTable("Poker")
> ```
>
> ```lua
> Tables.setTable("Poker")
> ```

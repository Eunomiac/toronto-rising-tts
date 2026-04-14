## Table of Contents

* Member Variables
* Functions
  * get(...)
  * getVars()
  * set(...)

# Material

The Material of a Renderer [component](../component/)is the primary method of controlling that object's appearance.

## Member Variables {#member-variables}

|Name|Type|Description|Return|
|---|---|---|---|
|game_object|[GameObject](../gameobject/)|The GameObject the Material is attached to.| |
|shader|`string`|The name of the Shader used by the Material.| |

## Functions {#functions}

|Name|Return|Description|
|---|---|---|
|get( ` string ` name)|return ` variable `|Obtains the value of a given Variable on a Material.|
|getVars()|return ` table `|Returns a table mapping Var names ( ` string ` ) to their type, which is also represented as a ` string `.|
|set( ` string ` name, ` variable ` value)|return ` boolean `|Sets the Var of the specified ` name ` to the provided `value`.|

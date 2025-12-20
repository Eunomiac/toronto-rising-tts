## Table of Contents

* Member Variables
* Functions
  * get(...)
  * getVars()
  * set(...)

# Component
>
> **Note: Danger**
> Component APIs are an advanced feature. An **understanding of how Unity works is required**to utilize them.
>
## Member Variables {#member-variables}

|Name|Type|Description|Return|
|---|---|---|---|
|game_object|[GameObject](../gameobject/)|The GameObject the Component composes.| |
|name|`string`|The name of the Component.| |

## Functions {#functions}

|Name|Return|Description|
|---|---|---|
|get( ` string ` name)|return ` variable `|Obtains the value of a given Variable on a Component.|
|getVars()|return ` table `|Returns a table mapping Var names ( ` string ` ) to their type, which is also represented as a ` string `.|
|set( ` string ` name, ` variable ` value)|return ` boolean `|Sets the Var of the specified ` name ` to the provided `value`.|

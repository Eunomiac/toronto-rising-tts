## Table of Contents

* Member Variables
* Functions
  * getChild(...)
  * getChildren()
  * getComponent(...)
  * getComponentInChildren(...)
  * getComponents(...)
  * getComponentsInChildren(...)
  * getMaterials()
  * getMaterialsInChildren()

# GameObject
>
> **Note: Danger**
> Component APIs are an advanced feature. An **understanding of how Unity works is required**to utilize them.
>
## Member Variables {#member-variables}

|Name|Type|Description|
|---|---|---|
|name|`string`|The name of the GameObject.|

## Functions {#functions}

|Name|Return|Description|
|---|---|---|
|getChild( ` string ` name)|[GameObject](./)|Returns a child GameObject matching the specified ` name `.|
|getChildren()|return ` table `|Returns the list of children GameObjects.|
|getComponent( ` string ` name)|[Component](../component/)|Returns a Component matching the specified ` name ` from the GameObject's list of Components.|
|getComponentInChildren( ` string ` name)|[Component](../component/)|Returns a Component matching the specified ` name `. Found by searching the Components of the GameObject and its [children](#getchildren) recursively (depth first).|
|getComponents( ` string ` name)|return ` table `|Returns the GameObject's list of Components. ` name ` is optional, when specified only Components with specified ` name ` will be included.|
|getComponentsInChildren( ` string ` name)|return ` table `|Returns a list of Components found by searching the GameObject and its [children](#getchildren) recursively (depth first). ` name ` is optional, when specified only Components with specified ` name ` will be included.|
|getMaterials()|return ` table `|Returns the GameObject's list of Materials.|
|getMaterialsInChildren()|return `table`|Returns a list of Materials found by searching the GameObject and its [children](#getchildren) recursively (depth first).|

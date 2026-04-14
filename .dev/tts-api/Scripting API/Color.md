## Table of Contents

* Constructors summary
  * Constructors examples
* Element access summary
  * Element access examples
* Arithmetics summary
  * Arithmetics examples
* Methods summary
  * Methods not modifying self
  * Other methods
* Constructors details
  * Color.new(...)
  * Color.fromString(...)
  * Color.Blue
* Element access details
  * setAt(...)
  * set(...)
  * get()
  * copy()
* Methods details
  * Methods not modifying self
    * toHex(...)
    * toString(...)
    * equals(...)
    * lerp(...)
    * dump(...)
  * Other methods
    * Color.list
    * Color.Add(...)
* Manipulation examples

# Color

Color is a type of Table that is used to define RGBA values for tinting. R for red, G for green, B for blue and A
 for alpha (transparency)
Besides the functions listed below, other classes can be used to manipulate colors as well.
Example Usage: `orange = Color ( 1, 0, 0 ): lerp ( Color ( 1, 1, 0 ), 0.5 )`
Check [Manipulation examples](#manipulation-examples)for more detailed usage.
> **Tip: Tip**
> Vector and Color are the first classes to be defined in pure Lua. This means you **have**to use
> colon operator (e.g. `col:lerp()`) to call member functions, not the dot operator. Failing to do so
> will fail with cryptic error messages displayed.
>
## Constructors summary {#constructors-summary}
>
> **Tip: Tip**
> Every place that returns a coordinate table, like `obj. getColorTint ()`,
> serves a Color class instance already - you do not have to explicitly construct it.
> When constructing Color instances, the `.new` part can be omitted, making e.g. `Color ( 1, 0.5, 0.75 )` equivalent to `Color. new ( 1, 0.5, 0.75 )`.
|Function Name|Description|Return| |
|---|---|---|---|
|Color( ` float ` r, ` float ` g, ` float ` b)|Return a color with specified (r, g, b) components.|return ` color `|[#colornew](#colornew)|
|Color( ` float ` r, ` float ` g, ` float ` b, ` float ` a)|Return a color with specified (r, g, b, a) components.|return ` color `|[#colornew](#colornew)|
|Color( ` table ` t)|Return a color with r/g/b/a components from source table.|return ` color `|[#colornew](#colornew)|
|Color.new(...)|Same as Color(...).|return ` color `|[#colornew](#colornew)|
|Color.fromString( ` string ` colorStr)|Return a color from a color string ('Red', 'Green' etc), capitalization ignored.|return ` color `|[#colorfromstring](#colorfromstring)|
|Color.Blue|Shorthand for Color.fromString('Blue'), works for all [Player](../player/colors/) and [added colors](#coloradd), capitalization ignored. Also return the color name.|return ` color ` return ` string `|[#colorblue](#colorblue)|

### Constructors examples {#constructors-examples}

```lua
function onLoad()
 local red = Color.new(1, 0, 0)
 local green = Color(0, 1, 0) -- same as Color.new(0, 1, 0)
 local orangePlayer = Color.fromString("Orange")
 local purplePlayer = Color.Purple
end
```

## Element access summary {#element-access-summary}

In addition to accessing color components by their numeric indices (1, 2, 3, 4) and textual identifiers (r, g, b,
 a), the following methods may also be utilized.

|Function Name|Description|Return| |
|---|---|---|---|
|setAt( ` string ` k, ` float ` value)|Sets a component to value and returns self.|return ` self `|[#setat](#setat)|
|set( ` float ` r, ` float ` g, ` float ` b, ` float ` a)|Sets ` r `, ` g `, ` b `, ` a ` components to given values and returns self, alpha is optional|return ` self `|[#set](#set)|
|get()|Returns ` r `, ` g `, ` b `, ` a ` components as four separate values.|return ` float ` return ` float ` return ` float ` return ` float `|[#get](#get)|
|copy()|Returns a separate Color with identical component values.|return ` color `|[#copy](#copy)|

> **Tip: Tip**
> Before ` Color ` was introduced, color tables contained separate values under 1, 2, 3, 4 and r, g, b,
> a keys, with letter keys taking precedence when they were different. This is no longer the case, and using
> letter and numerical keys is equivalent. However, when iterating over Color components you have to use ` pairs ` and only letter keys will be read there.
>
### Element access examples {#element-access-examples}

```lua
function onLoad()
 local col = Color(0, 0.5, 0.75)
 col.r = 1 -- set the first component
 col[2] = 0.25 -- set the second component
 col:setAt('b', 1) -- set the third component
 print(col:get()) --> same as print(col.r, col.g, col.b, col.a)
 for colorCode, value in pairs(col) do
 print(colorCode.. "="..value) --> r=1 then g=0.25 then b=1 and finally a=1
 end
 col:copy():setAt('a', 0.5)
 print(col.a) --> 1, because we only changed 'a' on a copy
end
```

---

## Arithmetics summary {#arithmetics-summary}

Color also allows you to use arithmetic operators to performs basic operations:

|Operator|Description|Return| |
|---|---|---|---|
|` color ` one == ` color ` two|Return true if both colors identical or within a small margin of each other, false otherwise. See also [color:equals()](#equals).|` boolean `| |
|tostring( ` color ` col)|Return a string description of a color.|` string `| |

### Arithmetics examples {#arithmetics-examples}

```lua
function onLoad()
 local col = Color({r = 0.118, g = 0.53, b = 1})
 print(col == Color.blue) --> true
 -- Color: Blue { r = 0.118, g = 0.53, b = 1, a = 1}
 tostring(Color(0.118, 0.53, 1))
 --> Color: { r = 0.3, g = 0.5, b = 1, a = 1}
 tostring(Color({r = 0.3, g = 0.5, b = 1}))
end
```

---

## Methods summary {#methods-summary}

### Methods not modifying self {#methods-not-modifying-self}

|Method Name|Description|Return| |
|---|---|---|---|
|col:toHex( ` boolean ` includeAlpha)|Returns a hex string for ` col `, boolean parameter ` includeAlpha `.|return ` string `|[#tohex](#tohex)|
|col:toString( ` float ` tolerance)|Returns a color string if matching this instance, nil otherwise, optional numeric ` tolerance ` param.|return ` string `|[#tostring](#tostring)|
|col:equals( ` color ` otherCol, ` float ` num)|Returns true if ` otherCol ` same as ` col `, false otherwise, optional numeric tolerance param.|return ` boolean `|[#equals](#equals)|
|col:lerp( ` color ` otherCol, ` float ` num)|Return a color some part of the way between ` col ` and ` otherCol `, numeric arg [0, 1] is the fraction.|return ` color `|[#lerp](#lerp)|
|col:dump( ` string ` prefix)|Return a string description of a color with an optional ` prefix `.|return ` string ` return ` float `|[#dump](#dump)|

### Other methods {#other-methods}

|Method Name|Description|Return| |
|---|---|---|---|
|Color.list|Returns a table of all color strings.|return ` table `|[#colorlist](#colorlist)|
|Color.Add( ` string ` name, ` color ` yourColor)|Add your own color definition to the class.|return ` nil `|[#coloradd](#coloradd)|

---

## Constructors details {#constructors-details}

### Color.new(...) {#colornew}

[../types/](../types/)Return a color with specified components.
> **Info: Color.new(r, g, b)**
>
> * [../types/](../types/) **r**: Red component between 0 and 1.
> * [../types/](../types/) **g**: Green component between 0 and 1.
> * [../types/](../types/) **b**: Blue component between 0 and 1.
> **Info: Color.new(r, g, b, a)**
> * [../types/](../types/) **r**: Red component between 0 and 1.
> * [../types/](../types/) **g**: Green component between 0 and 1.
> * [../types/](../types/) **b**: Blue component between 0 and 1.
> * [../types/](../types/) **a**: Alpha component between 0 and 1.
> **Info: Color.new(t)**
> * [../types/](../types/) **t**: The table should use the ` r `, ` g `, ` b ` and ` a ` index.By default the value is 0 for
> color and 1 for alpha.
>
```lua
local red = Color.new(1, 0, 0)
local green = Color(0, 1, 0) -- same as Color.new(0, 1, 0)
local river = Color(52 / 255, 152 / 255, 219 / 255, 160 / 255)
local teal = Color({ r = 0.129, g = 0.694, b = 0.607})
```

> **Info: Info**
> If you want to use value between 0 and 255 you should divide them by 255 before construct the object.
>
### Color.fromString(...) {#colorfromstring}

[../types/](../types/)Return a color from a color string ('Red', 'Green' etc),
 capitalization ignored.
> **Info: Color.fromString(colorStr)**
>
> * [../types/](../types/) **colorStr**: Any [Player Color](../player/colors/)or color added with [Color.Add](#coloradd).
>
```lua
local col = Color.fromString("Blue")
print(col) --> Color: Blue { r = 0.118, g = 0.53, b = 1, a = 1 }
```

### Color.Blue {#colorblue}

[../types/](../types/) [../types/](../types/)Return a color from a color string ('Red', 'Green' etc).
Any [Player Color](../player/colors/)or color added with [Color.Add](#coloradd).

```lua
local color, name = Color.Blue
print(color) -- Color: Blue { r = 0.118, g = 0.53, b = 1, a = 1 }
print(name) -- Blue
local color, name = Color.Red
print(color) -- Color: Red { r = 0.856, g = 0.1, b = 0.094, a = 1 }
print(name) -- Red
```

---

## Element access details {#element-access-details}

### setAt(...) {#setat}

[../types/](../types/)Update one component of the color and returning self.
> **Info: setAt(key, num)**
>
> * [../types/](../types/) **key**: Index of component (1, 2, 3 or 4
> for r, g, b or a).
> * [../types/](../types/) **num**: New value.
>
```lua
col = Color.Blue
col:setAt(1, 128 / 255):setAt('a', 0.5)
print(col) --> Color: { r = 0.501961, g = 0.53, b = 1, a = 0.5 }
```

### set(...) {#set}

[../types/](../types/)Update all components of the vector and returning self.
Providing a nil value makes it ignore that argument.
> **Info: set(r, g, b)**
>
> * [../types/](../types/) **r**: New value of Red component.
> * [../types/](../types/) **g**: New value of Green component.
> * [../types/](../types/) **b**: New value of Blue component.
> **Info: set(r, g, b, a)**
> * [../types/](../types/) **r**: New value of Red component.
> * [../types/](../types/) **g**: New value of Green component.
> * [../types/](../types/) **b**: New value of Blue component.
> * [../types/](../types/) **a**: New value of Alpha component.
>
```lua
col = Color.black
col:set(41 / 255, 128 / 255, 185 / 255)
print(col) --> Color: { r = 0.160784, g = 0.501961, b = 0.72549, a = 1 }
```

### get() {#get}

[../types/](../types/) [../types/](../types/) [../types/](../types/) [../types/](../types/)Returns ` r `, ` g `, ` b `, ` a ` components as four separate values.

```lua
col = Color.Blue
r, g, b, a = col:get()
print(r + g + b + a) --> 2.648
```

### copy() {#copy}

[../types/](../types/)Copy self into a new Color and return it.

```lua
col1 = Color(1, 0.5, 0.75)
col2 = col1:copy()
col1:set(0.75, 1, 0.25)
print(col1) --> Color: { r = 0.75, g = 1, b = 0.25, a = 1 }
print(col2) --> Color: { r = 1, g = 0.5, b = 0.75, a = 1 }
```

## Methods details {#methods-details}

### Methods not modifying self {#methods-not-modifying-self_1}

#### toHex(...) {#tohex}

[../types/](../types/)Returns a hex string representation of self.
> **Info: toHex(includeAlpha)**
>
> * [../types/](../types/) **includeAlpha**: Include or not the ` a ` value. (Default true)
>
```lua
print(Color.blue:toHex()) -- 1e87ffff
print(Color.blue:toHex(true)) -- 1e87ffff
print(Color.blue:toHex(false)) -- 1e87ff
```

#### toString(...) {#tostring}

[../types/](../types/)Returns a color string if matching this instance, nil
 otherwise, optional numeric ` tolerance ` param.
> **Info: toString(tolerance)**
>
> * [../types/](../types/) **tolerance**: Numeric ` tolerance `, by default 0.01.
>
```lua
print(Color( 0.118, 0.53, 1):toString()) -- Blue
```

#### equals(...) {#equals}

[../types/](../types/)Returns true if ` otherCol ` same as self, false
 otherwise, optional numeric ` tolerance ` param.
> **Info: equals(otherCol, tolerance)**
>
> * [../types/](../types/) **otherCol**: The color to compare with.
> * [../types/](../types/) **tolerance**: Numeric ` tolerance `, by default 0.01.
>
```lua
print(Color( 0.118, 0.53, 1):equals(Color.Blue:copy())) -- true
print(Color( 0.118, 0.53, 1) == Color.Blue) -- true
print(Color( 0.118, 0.53, 1):equals(Color.Blue)) -- Throw errors
```

#### lerp(...) {#lerp}

[../types/](../types/)Return a color some part of the way between self and ` otherCol `, numeric arg [0, 1] is the fraction.
> **Info: lerp(otherCol, fraction)**
>
> * [../types/](../types/) **otherCol**: The color to compare with.
> * [../types/](../types/) **fraction**: Numeric ` fraction `.
>
```lua
local pink = Color.Red:lerp(Color.White, 0.5)
print(pink) -- Color: { r = 0.928, g = 0.55, b = 0.547, a = 1 }
```

#### dump(...) {#dump}

[../types/](../types/) [../types/](../types/)Return string describing self, optional string prefix.
> **Info: dump(prefix)**
>
> * [../types/](../types/) **prefix**: The prefix of return string.
> **Warning: Warning**
> This function returns one extra float that will be displayed in print function. This value is returned by the
> last gsub used in internal function.
>
```lua
col = Color.Blue
str = col:dump('Prefix')
print(str) --> Prefix: Blue { r = 0.118, g = 0.53, b = 1, a = 1 }
print(col:dump('Prefix')) --> Prefix: Blue { r = 0.118, g = 0.53, b = 1, a = 1 } 2
print(Color.dump(col, 'Prefix')) --> Prefix: Blue { r = 0.118, g = 0.53, b = 1, a = 1 } 2
```

### Other methods {#other-methods_1}

#### Color.list {#colorlist}

[../types/](../types/)Returns a table of all color strings.

```lua
data = Color.list
-- Same as
data = {
 [1] => "White",
 [2] => "Brown",
 [3] => "Red",
 [4] => "Orange",
 [5] => "Yellow",
 [6] => "Green",
 [7] => "Teal",
 [8] => "Blue",
 [9] => "Purple",
 [10] => "Pink",
 [11] => "Grey",
 [12] => "Black"
}
```

#### Color.Add(...) {#coloradd}

[../types/](../types/)Add your own color definition to the class.
> **Info: dump(name, yourColor)**
>
> * [../types/](../types/) **name**: The name of the color.
> * [../types/](../types/) **yourColor**: The color value.
>
```lua
Color.Add("River", Color(52 / 255, 152 / 255, 219 / 255))
local color, name = Color.River
print(color) -- Color: River { r = 0.203922, g = 0.596078, b = 0.858824, a = 1 }
print(name) -- River
```

---

## Manipulation examples {#manipulation-examples}

Tint all object in scene in orange.

```lua
function onLoad()
 local red = Color.Red
 local green = Color.Green
 -- Get a color between red and green
 local yellow = red:lerp(green, 0.5)
 -- Make the color brighter
 yellow:set(yellow.r * 1.5, yellow.g * 1.5, yellow.b * 1.5)
 -- Get a color between yellow and red
 local orange = yellow:lerp(Color.Red, 0.5)
 -- Iterate through all scene objects and set the color tint to orange
 for k, obj in pairs(getObjects()) do
 obj.setColorTint(orange)
 end
end
```

Tint all object in a random color.

```lua
function onLoad()
 -- Iterate through all scene objects and generate a random color
 for k, obj in pairs(getObjects()) do
 local colorA = getRandomColor()
 local colorB = getRandomColor()
 color = colorA:lerp(colorB, math.random(0, 1))
 -- Make the color darker or brighter
 local factor = math.random(1, 2)
 color:set(color.r * factor, color.g * factor, color.b * factor)
 -- Apply the color to object
 obj.setColorTint(color)
 end
end
function getRandomColor()
 local r = math.random(0, 255)
 local g = math.random(0, 255)
 local b = math.random(0, 255)
 return Color(r / 255, g / 255, b / 255)
end
```

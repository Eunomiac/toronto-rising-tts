## Table of Contents

* Constructors summary
  * Constructors examples
* Element access summary
  * Element access examples
* Arithmetics summary
  * Arithmetics examples
* Methods summary
  * Methods modifying self
  * Methods not modifying self
* Constructors details
  * Vector.min(...)
  * Vector.max(...)
  * Vector.between(...)
* Element access details
  * setAt(...)
  * set(...)
  * get()
  * copy()
* Methods details
  * Methods modifying self details
    * add(...)
    * sub(...)
    * scale(...)
    * clamp(...)
    * normalize()
    * project(...)
    * projectOnPlane(...)
    * reflect(...)
    * inverse()
    * moveTowards(...)
    * rotateTowards(...)
    * rotateTowardsUnit(...)
    * rotateOver(...)
  * Methods not modifying self details
    * dot(...)
    * magnitude()
    * sqrMagnitude()
    * distance(...)
    * sqrDistance(...)
    * equals(...)
    * string(...)
    * angle(...)
    * cross(...)
    * lerp(...)
    * normalized()
    * orthoNormalize(...)
    * heading(...)
* Manipulation examples

# Vector

Representation of 3D vectors and points.
This structure is used to pass 3D positions and directions around. It also contains functions for doing common vector operations.
Besides the functions listed below, other classes can be used to manipulate vectors and points as well.
Example Usage: `target = Vector ( 1, 0, 0 ) + Vector ( 0, 2, 0 ): normalized ()`
Check [Manipulation examples](#manipulation-examples)for more detailed usage.
> **Tip: Tip**
> Vector and Color are the first classes to be defined in pure Lua. This means you **have**to use colon operator (e.g. `pos:angle()`) to call member functions, not the dot operator. Failing to do so will fail with cryptic error messages displayed.
>
## Constructors summary {#constructors-summary}
>
> **Tip: Tip**
> Every place that returns a coordinate table, like `obj. getPosition ()`, serves a Vector class instance already - you do not have to explicitly construct it.
> When constructing Vector instances, the `.new` part can be omitted, making e.g. `Vector ( 1, 2, 3 )` equivalent to `Vector. new ( 1, 2, 3 )`.
|Function Name|Description|Return| |
|---|---|---|---|
|Vector( ` float ` x, ` float ` y, ` float ` z)|Return a vector with specified (x, y, z) components.|return ` vector `| |
|Vector( ` table ` v)|Return a vector with x/y/z or 1/2/3 components from source table (x/y/z first).|return ` vector `| |
|Vector.new(...)|Same as Vector(...).|return ` vector `| |
|Vector.min( ` vector ` vec1, ` vector ` vec2)|Returns a vector that is made from the smallest components of two vectors.|return ` vector `|[#vectormin](#vectormin)|
|Vector.max( ` vector ` vec1, ` vector ` vec2)|Returns a vector that is made from the largest components of two vectors.|return ` vector `|[#vectormax](#vectormax)|
|Vector.between( ` vector ` vec1, ` vector ` vec2)|Return a vector pointing from vec1 to vec2.|return ` vector `|[#vectorbetween](#vectorbetween)|

### Constructors examples {#constructors-examples}

```lua
function onLoad()
 local vec1 = Vector.new(0.5, 1, 1.5)
 local vec2 = Vector(1, -1, 0) -- same as Vector.new(1, -1, 0)
 print(Vector.between(vec1, vec2)) --> Vector: {0.5, -2, -1.5}
 print(Vector.max(vec1, vec2)) --> Vector: {1, 1, 1.5}
 print(Vector.min(vec1, vec2)) --> Vector: {0.5, -1, -0}
end
```

## Element access summary {#element-access-summary}

In addition to accessing vector components by their numeric indices (1, 2, 3) and textual identifiers (x, y, z), the following methods may also be utilized.

|Function Name|Description|Return| |
|---|---|---|---|
|setAt( ` string ` k, ` float ` value)|Sets a component to value and returns self.|return ` self `|[#setat](#setat)|
|set( ` float ` x, ` float ` y, ` float ` z)|Sets ` x `, ` y `, ` z ` components to given values and returns self.|return ` self `|[#set](#set)|
|get()|Returns ` x `, ` y `, ` z ` components as three separate values.|return ` float ` return ` float ` return ` float `|[#get](#get)|
|copy()|Returns a separate Vector with identical component values.|return ` vector `|[#copy](#copy)|

> **Tip: Tip**
> Before ` Vector ` was introduced, coordinate tables contained separate values under 1, 2, 3 and x, y, z keys, with letter keys taking precedence when they were different. This is no longer the case, and using letter and numerical keys is equivalent. However, when iterating over Vector components you have to use ` pairs ` and only letter keys will be read there.
>
### Element access examples {#element-access-examples}

```lua
function onLoad()
 local vec = Vector(1, 2, 3)
 vec.x = 2 -- set the first component
 vec[2] = 4 -- set the second component
 vec:setAt('z', 6) -- set the third component
 print(vec:get()) --> same as print(vec.x, vec.y, vec.z)
 for axis, value in pairs(vec) do
 print(axis.. "="..value) --> x=2 then y=4 and finally z=6
 end
 vec:copy():setAt('x', - 11)
 print(vec.x) --> 2, because we only changed 'x' on a copy
end
```

---

## Arithmetics summary {#arithmetics-summary}

Vector also allows you to use arithmetic operators to performs basic operations:

|Operator|Description|Return| |
|---|---|---|---|
|` vector ` one + ` vector ` two|Returns a new Vector that is a sum of ` one ` and ` two `|return ` vector `| |
|` vector ` one - ` vector ` two|Returns a new Vector that is a difference of ` one ` and ` two `|return ` vector `| |
|` vector ` one * ` float ` factor|Returns a new Vector that is ` one ` with each component multiplied by the factor.|return ` vector `| |
|` vector ` one == ` vector ` two|Returns a boolean whether ` one ` and ` two ` are very similar to each other (less than ~0.03 difference in magnitude)|return ` boolean `| |

### Arithmetics examples {#arithmetics-examples}

```lua
function onLoad()
 local vec = Vector(1, 2, 3)
 vec:add(Vector(3, 2, 1)) --> vec is now {4, 4, 4}
 vec:sub(Vector(1, 0, 1)) --> vec is now {3, 4, 3}
 local another = vec + Vector(-1, -2, -1) --> another is {2, 2, 2}, vec remains unchanged
 print(another:equals(Vector(1, 2, 3))) --> false
 print(another == Vector(2, 2, 2)) --> true
 print(another == Vector(1.99, 2.01, 2)) --> true, small differences are tolerated
end
```

---

## Methods summary {#methods-summary}
>
> **Tip: Tip**
> Numerous methods of Vector will return the ` self ` instance to allow easy "chaining". That way you can do more complex processing without saving an intermediate result in a variable, like e.g. `vec: setAt ( 'y', 0 ): scale ( 0.5 ): rotateOver ( 'y', 90 )`.
>
### Methods modifying self {#methods-modifying-self}

|Method Name|Description|Return| |
|---|---|---|---|
|vec:add( ` vector ` otherVec)|Adds components of otherVec to self.|return ` self `|[#add](#add)|
|vec:sub( ` vector ` otherVec)|Subtracts components of otherVec from self.|return ` self `|[#sub](#sub)|
|vec:scale( ` vector ` otherVec)|Multiplies self-components by corresponding components from otherVec.|return ` self `|[#scale](#scale)|
|vec:scale( ` float ` num)|Multiplies self-components by a numeric factor.|return ` self `|[#scale](#scale)|
|vec:clamp( ` float ` num)|If self-magnitude is higher than provided limit, scale self-down to match it.|return ` self `|[#clamp](#clamp)|
|vec:normalize()|Makes self-have a magnitude of 1.|return ` self `|[#normalize](#normalize)|
|vec:project( ` vector ` otherVec)|Make self into projection on another vector.|return ` self `|[#project](#project)|
|vec:projectOnPlane( ` vector ` otherVec)|Project self on a plane defined through a normal vector arg.|return ` self `|[#projectonplane](#projectonplane)|
|vec:reflect( ` vector ` otherVec)|Reflect self over a plane defined through a normal vector arg.|return ` self `|[#reflect](#reflect)|
|vec:inverse()|Multiply self-components by -1.|return ` self `|[#inverse](#inverse)|
|vec:moveTowards( ` vector ` otherVec, ` float ` num)|Move self towards another vector, but only up to a provided distance limit.|return ` self `|[#movetowards](#movetowards)|
|vec:rotateTowards( ` vector ` target, ` float ` maxAngle)|Rotate self towards another vector, but only up to a provided angle limit.|return ` self `|[#rotatetowards](#rotatetowards)|
|vec:rotateTowardsUnit( ` vector ` target, ` float ` maxAngle)|Same as rotateTowards, but only works correctly if ` target ` Vector is normalized. Less expensive than ` rotateTowards `.|return ` self `|[#rotatetowardsunit](#rotatetowardsunit)|
|vec:rotateOver( ` string ` axis, ` float ` angle)|Rotate a Vector ` angle ` degrees over given ` axis ` (can be `'x'`, `'y'`, `'z'` ).|return ` self `|[#rotateover](#rotateover)|

### Methods not modifying self {#methods-not-modifying-self}

|Method Name|Description|Return| |
|---|---|---|---|
|vec1:dot( ` vector ` vec2)|Return a dot product of two vectors.|return ` float `|[#dot](#dot)|
|vec:magnitude()|Returns the length of this vector.|return ` float `|[#magnitude](#magnitude)|
|vec:sqrMagnitude()|Returns the squared length of this vector.|return ` float `|[#sqrmagnitude](#sqrmagnitude)|
|p1:distance( ` vector ` p2)|Returns distance between two points.|return ` float `|[#distance](#distance)|
|p1:sqrDistance( ` vector ` p2)|Returns squared distance between two points.|return ` float `|[#sqrdistance](#sqrdistance)|
|vec1:equals( ` vector ` vec2, ` float ` margin)|Returns true if two vectors are approximately equal. The ` margin ` argument is optional and defaults to tolerating a difference of ~0.03 in both vector magnitude.|return ` boolean `|[#equals](#equals)|
|vec:string( ` string ` prefix)|Return string describing self, optional string prefix.|return ` string ` return ` float `|[#string](#string)|
|vec1:angle( ` vector ` vec2)|Return an angle between two vectors, in degrees [0, 180].|return ` float `|[#angle](#angle)|
|vec1:cross( ` vector ` vec2)|Return a cross-product vector of two vectors.|return ` vector `|[#cross](#cross)|
|p1:lerp( ` vector ` p2, ` float ` t)|Linearly interpolates between two points. Numeric arg [0, 1] is the fraction.|return ` vector `|[#lerp](#lerp)|
|vec:normalized()|Return a new vector that is normalized (length 1) version of self.|return ` vector `|[#normalized](#normalized)|
|vec:orthoNormalize()|Return three normalized vectors perpendicular to each other, first one being in the same dir as self. Return ` base `, ` normal `, ` binormal ` vectors.|return ` vector ` return ` vector ` return ` vector `|[#orthonormalize](#orthonormalize)|
|vec:orthoNormalize( ` vector ` binormalPlanar)|Same as vec:orthoNormalize(), but second vector is guranteed to be on a self-binormalPlanar plane.|return ` vector ` return ` vector ` return ` vector `|[#orthonormalize](#orthonormalize)|
|vec:heading()|Returns an angle (In degrees) of rotation of Vector over all axis ( `'x'`, `'y'`, `'z'` ).|return ` float ` return ` float ` return ` float `|[#heading](#heading)|
|vec:heading( ` string ` axis)|Returns an angle (In degrees) of rotation of Vector over a given ` axis ` (can be `'x'`, `'y'`, `'z'` ).|return ` float `|[#heading](#heading)|

---

## Constructors details {#constructors-details}

### Vector.min(...) {#vectormin}

[../types/](../types/)Returns a vector that is made from the smallest components of two vectors.
> **Info: Vector.min(vec1, vec2)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
>
```lua
vec1 = Vector(1, 2, 3)
vec2 = Vector(4, 3, 2)
print(Vector.min(vec1, vec2)) --> Vector: { 1, 2, 2 }
```

### Vector.max(...) {#vectormax}

[../types/](../types/)Returns a vector that is made from the largest components of two vectors.
> **Info: Vector.max(vec1, vec2)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
>
```lua
vec1 = Vector(1, 2, 3)
vec2 = Vector(4, 3, 2)
print(Vector.max(vec1, vec2)) --> Vector: { 4, 3, 3 }
```

### Vector.between(...) {#vectorbetween}

[../types/](../types/)Return a vector pointing from vec1 to vec2.
> **Info: Vector.between(vec1, vec2)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
>
```lua
vec1 = Vector(1, 2, 3)
vec2 = Vector(4, 3, 2)
print(Vector.between(vec1, vec2)) --> Vector: { 3, 1, -1 }
```

---

## Element access details {#element-access-details}

### setAt(...) {#setat}

[../types/](../types/)Update one component of the vector and returning self.
> **Info: setAt(key, num)**
>
> * [../types/](../types/) **key**: Index of component (1, 2 or 3 for x, y or z).
> * [../types/](../types/) **num**: New value.
>
```lua
vec = Vector(1, 2, 3)
vec:setAt(1, 4):setAt('y', 3)
print(vec) --> Vector: { 4, 3, 3 }
```

### set(...) {#set}

[../types/](../types/)Update all components of the vector and returning self.
Providing a nil value makes it ignore that argument.
> **Info: set(x, y, z)**
>
> * [../types/](../types/) **x**: New value of X component.
> * [../types/](../types/) **y**: New value of Y component.
> * [../types/](../types/) **z**: New value of Z component.
>
```lua
vec = Vector(1, 2, 3)
vec:set(4, 3, 2)
print(vec) --> Vector: { 4, 3, 2 }
```

### get() {#get}

[../types/](../types/) [../types/](../types/) [../types/](../types/)Returns ` x `, ` y `, ` z ` components as three separate values.

```lua
vec = Vector(1, 2, 3)
x, y, z = vec:get()
print(x + y + z) --> 6
```

### copy() {#copy}

[../types/](../types/)Copy self into a new vector and return it.

```lua
vec1 = Vector(1, 2, 3)
vec2 = vec1:copy()
vec1:set(4, 3, 2)
print(vec1) --> Vector { 4, 3, 2 }
print(vec2) --> Vector { 1, 2, 3 }
```

---

## Methods details {#methods-details}

### Methods modifying self details {#methods-modifying-self-details}

#### add(...) {#add}

[../types/](../types/)Adds components of otherVec to self and returning self.
> **Info: add(otherVec)**
>
> * [../types/](../types/) **otherVec**: The vector to add.
>
```lua
vec = Vector(1, 2, 3)
otherVec = Vector(4, 5, 6)
vec:add(otherVec)
print(vec) --> Vector: { 5, 7, 9 }
-- Same as
vec = Vector(1, 2, 3)
otherVec = Vector(4, 5, 6)
vec = vec + otherVec
print(vec) --> Vector: { 5, 7, 9 }
```

#### sub(...) {#sub}

[../types/](../types/)Subtracts components of otherVec from self and returning self.
> **Info: sub(otherVec)**
>
> * [../types/](../types/) **otherVec**: The vector to subtracts.
>
```lua
vec = Vector(1, 2, 3)
otherVec = Vector(6, 5, 4)
vec:sub(otherVec)
print(vec) --> Vector: { -5, -3, -1 }
-- Same as
vec = Vector(1, 2, 3)
otherVec = Vector(6, 5, 4)
vec = vec - otherVec
print(vec) --> Vector: { -5, -3, -1 }
```

#### scale(...) {#scale}

[../types/](../types/)Multiplies self-components by corresponding components from otherVec and returning self.
Every component in the result is a component of vec multiplied by the same component of otherVec or by a number factor.
> **Info: scale(otherVec)**
>
> * [../types/](../types/) **otherVec**: The vector to scale.
> **Info: scale(num)**
> * [../types/](../types/) **num**: The numeric factor.
>
```lua
vec = Vector(1, 2, 3)
otherVec = Vector(2, 3, 4)
vec:scale(otherVec)
print(vec) --> Vector: { 2, 6, 12 }
vec:scale(2)
print(vec) --> Vector: { 4, 12, 24 }
```

#### clamp(...) {#clamp}

[../types/](../types/)If self-magnitude is higher than provided limit, scale self-down to match it and returning self.
> **Info: clamp(num)**
>
> * [../types/](../types/) **num**: The numeric max magnitude.
>
```lua
vec = Vector(1, 2, 3)
vec:clamp(2)
print(vec) --> Vector: { 0.53, 1.07, 1.60 }
```

#### normalize() {#normalize}

[../types/](../types/)Makes this vector have a magnitude of 1 and returning self.
When normalized, a vector keeps the same direction but its length is 1.0.
Note that this function will change the current vector. If you want to keep the current vector unchanged, use [normalized()](#normalized)method.

```lua
vec = Vector(1, 2, 3)
vec:normalize()
print(vec) --> Vector: { 0.27, 0.53, 0.80 }
```

#### project(...) {#project}

[../types/](../types/)Make self into projection on another vector and return self.
To understand vector projection, imagine that ` otherVec ` is resting on a line pointing in its direction. Somewhere along that line will be the nearest point to the tip of vector. The projection is just ` otherVec ` rescaled so that it reaches that point on the line.
> **Info: project(otherVec)**
>
> * [../types/](../types/) **otherVec**: The normal vector.
>
```lua
vec = Vector(2, 1, 4)
vec:project(Vector(1, -2, 1))
print(vec) --> Vector: { 0.67, -1.3, 0.67 }
```

#### projectOnPlane(...) {#projectonplane}

[../types/](../types/)Projects a vector onto a plane defined by a normal orthogonal to the plane and return self.
A Vector stores the position of the given ` vec ` in 3d space. A second Vector is given by ` otherVec ` and defines a direction from a plane towards vector that passes through the origin. Vector.projectOnPlane uses the two Vector values to generate the position of vector in the ` otherVec ` direction, and return the location of the Vector on the plane.
> **Info: projectOnPlane(otherVec)**
>
> * [../types/](../types/) **otherVec**: The plane normal vector.
>
```lua
vec = Vector(2, 1, 4)
vec:projectOnPlane(Vector(1, -2, 1))
print(vec) --> Vector: { 1.33, 2.33, 3.33 }
```

#### reflect(...) {#reflect}

[../types/](../types/)Make self into reflection on another vector and return self.
The ` otherVec ` vector defines a plane (a plane's normal is the vector that is perpendicular to its surface). The ` vec ` vector is treated as a directional arrow coming in to the plane. The returned value is a vector of equal magnitude to ` vec ` but with its direction reflected.
> **Info: reflect(otherVec)**
>
> * [../types/](../types/) **otherVec**: The normal vector.
>
```lua
vec = Vector(1, 2, 3)
vec:reflect(Vector(4, 3, 2))
print(vec) --> Vector: { -3.41, -1.31, 0.79 }
```

#### inverse() {#inverse}

[../types/](../types/)Multiply self-components by -1.

```lua
vec = Vector(1, 2, 3)
vec:inverse()
print(vec) --> Vector: { -1, -2, -3 }
```

#### moveTowards(...) {#movetowards}

[../types/](../types/)Move self towards another vector, but only up to a provided distance limit and return self.
> **Info: moveTowards(otherVec, num)**
>
> * [../types/](../types/) **target**: The position to move towards.
> * [../types/](../types/) **num**: The distance limit.
>
```lua
vec = Vector(1, 2, 3)
vec:moveTowards(Vector(4, 3, 2), 0.5)
print(vec) --> Vector: { 1.45, 2.15, 2.85 }
```

#### rotateTowards(...) {#rotatetowards}

[../types/](../types/)Rotate self towards another vector, but only up to a provided angle limit and return self.
This function is similar to [moveTowards()](#movetowards)except that the vector is treated as a direction rather than a position. The current vector will be rotated round toward the target direction by an angle of ` maxAngle `, although it will land exactly on the target rather than overshoot. If the magnitudes of current and target are different, then the magnitude of the result will be linearly interpolated during the rotation. If a negative value is used for ` maxAngle `, the vector will rotate away from target until it is pointing in exactly the opposite direction, then stops.
> **Info: rotateTowards(target, maxAngle)**
>
> * [../types/](../types/) **target**: The position to rotate towards.
> * [../types/](../types/) **maxAngle**: The maximum angle in **degree**allowed for this rotation.
>
```lua
vec = Vector(1, 2, 3)
vec:rotateTowards(Vector(4, 3, 2), 45)
print(vec) --> Vector: { 2.78, 2.08, 1.39 }
```

#### rotateTowardsUnit(...) {#rotatetowardsunit}

[../types/](../types/)Same as [rotateTowards()](#rotatetowards), but only works correctly if ` target ` Vector is normalized and return self. Less expensive than `rotateTowards()`.
> **Info: rotateTowardsUnit(target, maxAngle)**
>
> * [../types/](../types/) **target**: The position to rotate towards.
> * [../types/](../types/) **maxAngle**: The maximum angle in **degree**allowed for this rotation.
>
```lua
vec = Vector(1, 2, 3)
vec:rotateTowardsUnit(Vector(4, 3, 2):normalized(), 45)
print(vec) --> Vector: { 3.29, 0.87, -1.55 }
```

#### rotateOver(...) {#rotateover}

[../types/](../types/)Rotate a Vector ` angle ` degrees over given ` axis `(can be `'x'`, `'y'`, `'z'`) and return self.
> **Info: rotateOver(axis, angle)**
>
> * [../types/](../types/) **axis**: The axis to rotate around.
> * [../types/](../types/) **angle**: The angle in **degree**for this rotation.
>
```lua
vec = Vector(3, 2, 3)
vec:rotateOver('y', 45)
print(vec) --> Vector: { 4.24, 2, 0 }
```

---

### Methods not modifying self details {#methods-not-modifying-self-details}

#### dot(...) {#dot}

[../types/](../types/)Return the dot product of two vectors.
The dot product is a float value equal to the magnitudes of the two vectors multiplied together and then multiplied by the cosine of the angle between them.
For normalized vectors Dot returns 1 if they point in exactly the same direction, -1 if they point in completely opposite directions and zero if the vectors are perpendicular.
> **Info: vec1:dot(vec2)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
>
```lua
vec1 = Vector(0, 1, 2)
vec2 = Vector(0, 2, 4)
print(vec1:dot(vec2)) --> 10
print(Vector.dot(vec1:normalized(), vec2:normalized())) --> 1
```

#### magnitude() {#magnitude}

[../types/](../types/)Returns the length of this vector.

```lua
vec = Vector(1, 2, 3)
print(vec:magnitude()) --> 3.74 (sqrt of 14)
print(Vector.magnitude(vec)) --> 3.74 (sqrt of 14)
```

#### sqrMagnitude() {#sqrmagnitude}

[../types/](../types/)Returns the squared length of this vector.

```lua
vec = Vector(1, 2, 3)
print(vec:sqrMagnitude()) --> 14
print(Vector.sqrMagnitude(vec)) --> 14
```

#### distance(...) {#distance}

[../types/](../types/)Returns distance between two points.
> **Info: p1:distance(p2)**
>
> * [../types/](../types/) **p1**: First point.
> * [../types/](../types/) **p2**: Second point.
>
```lua
p1 = Vector(1, 2, 3)
p2 = Vector(4, 3, 2)
print(p1:distance(p2)) --> 3.32
print(Vector.distance(p1, p2)) --> 3.32
print((p1 - p2):magnitude()) --> 3.32
```

#### sqrDistance(...) {#sqrdistance}

[../types/](../types/)Returns squared distance between two points.
> **Info: p1:sqrDistance(p2)**
>
> * [../types/](../types/) **p1**: First point.
> * [../types/](../types/) **p2**: Second point.
>
```lua
p1 = Vector(1, 2, 3)
p2 = Vector(4, 3, 2)
print(p1:sqrDistance(p2)) --> 11
print(Vector.sqrDistance(p1, p2)) --> 11
```

#### equals(...) {#equals}

[../types/](../types/)Returns true if two vectors are approximately equal.
The ` margin ` argument is optional and defaults to tolerating a difference of `~0.03` in both vector magnitude.
> **Info: vec1:equals(vec2, margin)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
> * [../types/](../types/) **margin**: (Optional) Numeric tolerance.
>
```lua
vec1 = Vector(1, 2, 3.10)
vec2 = Vector(1, 2, 3.15)
print(vec1:equals(vec2)) --> false
print(Vector.equals(vec1, vec2, 0.01)) --> true
```

#### string(...) {#string}

[../types/](../types/) [../types/](../types/)Return string describing self, optional string prefix.
> **Info: string(prefix)**
>
> * [../types/](../types/) **prefix**: The prefix of return string.
>
```lua
vec = Vector(1, 2, 3)
str = vec:string('Prefix')
print(str) --> Prefix: { 1, 2, 3 }
print(vec:string('Prefix')) --> Prefix: { 1, 2, 3 }
print(Vector.string(vec, 'Prefix')) --> Prefix: { 1, 2, 3 }
```

> **Warning: Warning**
> This function returns one extra float that will be displayed in print function. This value is returned by the last gsub used in internal function.
>
#### angle(...) {#angle}

[../types/](../types/)Returns the angle in degrees between two vectors.
The angle returned is the unsigned angle between the two vectors. This means the smaller of the two possible angles between the two vectors is used. The result is never greater than 180 degrees.
> **Info: vec1:angle(vec2)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
>
```lua
vec1 = Vector(1, 2, 3)
vec2 = Vector(4, 3, 2)
print(vec1:angle(vec2)) --> 37.43
print(Vector.angle(vec1, vec2)) --> 37.43
```

#### cross(...) {#cross}

[../types/](../types/)Return a cross-product vector of two vectors.
The cross product of two vectors results in a third vector which is perpendicular to the two input vectors. The result's magnitude is equal to the magnitudes of the two inputs multiplied together and then multiplied by the sine of the angle between the inputs. You can determine the direction of the result vector using the "left hand rule".
> **Info: vec1:cross(vec2)**
>
> * [../types/](../types/) **vec1**: First vector.
> * [../types/](../types/) **vec2**: Second vector.
>
```lua
vec1 = Vector(1, 2, 3)
vec2 = Vector(4, 3, 2)
print(vec1:cross(vec2)) --> Vector: { -5, 10, -5 }
print(vec2:cross(vec1)) --> Vector: { -5, -10, 5 }
print(Vector.cross(vec1, vec2)) --> Vector: { -5, 10, -5 }
print(Vector.cross(vec2, vec1)) --> Vector: { -5, -10, 5 }
```

#### lerp(...) {#lerp}

[../types/](../types/)Linearly interpolates between two points.
Interpolates between the points a and b by the interpolant t. The parameter t is clamped to the range [0, 1]. This is most commonly used to find a point some fraction of the way along a line between two endpoints (e.g. to move an object gradually between those points).
The value returned equals (b - a) * t. When t = 0 returns a. When t = 1 returns b. When t = 0.5 returns the point midway between a and b.
> **Info: p1:lerp(p2, t)**
>
> * [../types/](../types/) **p1**: First point.
> * [../types/](../types/) **p2**: Second point.
> * [../types/](../types/) **t**: Fraction.
>
```lua
p1 = Vector(1, 2, -4)
p2 = Vector(1, 2, 4)
print(p1:lerp(p2, 0.25)) --> Vector: { 1, 2, -2 }
print(Vector.lerp(p1, p2, 0.25)) --> Vector: { 1, 2, -2 }
```

#### normalized() {#normalized}

[../types/](../types/)Return a new vector that is normalized (length 1) version of self.

```lua
vec = Vector(1, 2, 3)
print(vec:normalized()) --> Vector: { 0.27, 0.53, 0.80}
print(Vector.normalized(vec)) --> Vector: { 0.27, 0.53, 0.80}
```

#### orthoNormalize(...) {#orthonormalize}

[../types/](../types/) [../types/](../types/) [../types/](../types/)Return three normalized vectors perpendicular to each other, first one being in the same direction as self. If ` binormalPlaner ` is provided, the second vector is guaranteed to be on a self-binormalPlanar plane.
> **Info: orthoNormalize(binormalPlanar)**
>
> * [../types/](../types/) **binormalPlanar**: (optional) The vector for binormal planar.
>
```lua
vec = Vector(0, 0, 2)
base, normal, binormal = vec:orthoNormalize(Vector(0, 1, 0))
print(base) --> Vector: { 0, 0, 1}
print(normal) --> Vector: { -1, 0, 0}
print(binormal) --> Vector: { 0, -1, 0}
```

#### heading(...) {#heading}

[../types/](../types/)Returns an angle (In degrees) of rotation of Vector over a given ` axis `(can be `'x'`, `'y'`, `'z'`).
> **Info: heading(axis)**
>
> * [../types/](../types/) **axis**: Can be `'x'`, `'y'`, `'z'`.
>
```lua
vec = Vector(1, 2, 3)
angle = vec:heading('z')
print(angle) --> 26.57
```

---

## Manipulation examples {#manipulation-examples}

Moving an object towards a target position in small steps

```lua
function onLoad()
 local obj = assert(getObjectFromGUID('555555'), 'Object not found!')
 obj.lock()
 local current = Vector(10, 5, 0) -- obj starting position
 local target = Vector(-10, 5, 0) -- obj destination
 local movementType = 'linear' -- try with 'spherical' or 'asymptotic' to see how other methods work
 -- We want the movement stretched over time, a Wait will do it periodically
 local waitID
 waitID = Wait.time(
 function()
 -- move the current postion towards destination
 if movementType == 'linear' then
 -- simple linear movement, 1 unit at a time
 current:moveTowards(target, 1)
 elseif movementType == 'spherical' then
 -- rotate towards target, 10 degress at a time
 current:rotateTowards(target, 5)
 elseif movementType == 'asymptotic' then
 -- move quarter of the way towards target (take note that lerp does not modify current directly)
 current = current:lerp(target, 0.25)
 end
 obj.setPositionSmooth(current, true, true)
 -- if we reached the destination, stop this timer
 if current == target then
 Wait.stop(waitID)
 broadcastToAll('Finished!', {0, 1, 0})
 end
 end,
 0.5, -- repeats every half second
 -1 -- indefinitely, until stopped because we reached destination
 )
end
```

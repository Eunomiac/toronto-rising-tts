## Table of Contents

* Learning Lua
* Lua Version
* Lua Standard Libraries
* Lua Additions
  * Lambda-Style Functions
    * Limitations

# Lua in Tabletop Simulator

## Learning Lua {#learning-lua}

There are lots of resources available online to learn Lua in general. What follows is a collection of guides which are
designed to help you learn Lua, specifically in the context of Tabletop Simulator:

1. [Learning Lua](http://steamcommunity.com/sharedfiles/filedetails/?id=714904631)

* First steps, and introduction to programming.

2. [Learning MORE Lua](http://steamcommunity.com/sharedfiles/filedetails/?id=879449506)

* More complicated concepts and many coding examples to demonstrate commonly used functions.

3. [Learning Lua Functions](http://steamcommunity.com/sharedfiles/filedetails/?id=752690530)

* A collection of utility functions to help in performing actions as well as demonstrate some better coding practices.

## Lua Version {#lua-version}

Tabletop Simulator's Lua implementation is *based on*Lua 5.2.
You will be unable to use Lua features that were introduced in later versions of Lua.

## Lua Standard Libraries {#lua-standard-libraries}

We include a subset of Lua's standard libraries in order to provide a safe sandbox for execution of user scripts.

|Library|Description|
|---|---|
|Basic|The basic methods. Includes assert, collectgarbage, error, print, select, type, tonumber, and tostring.|
|Bit32|The bit32 package.|
|Coroutine|The coroutine package.|
|Dynamic|The dynamic package (introduced by MoonSharp).|
|ErrorHandling|The error handling methods: pcall and xpcall.|
|GlobalConsts|The global constants: _G,_VERSION, and _MOONSHARP.|
|Math|The math package.|
|Metatables|The metatable methods: setmetatable, getmetatable, rawset, rawget, rawequal, and rawlen.|
|OS_Time|The time methods of the os package: clock, difftime, date, and time.|
|String|The string package.|
|Table|The table package.|
|TableIterators|The table iterators: next, ipairs, and pairs.|

## Lua Additions {#lua-additions}

### Lambda-Style Functions {#lambda-style-functions}

You may come across syntax involving the use of the `|`(vertical bar) character.
> **Example: e.g.**
>
> ```lua
> local block = spawnedBlock({
> type = 'BlockSquare',
> callback_function = |spawnedBlock| print(spawnedBlock.type.. " spawned")
> })
> Wait.condition(|| print('Block is now resting'), || block.resting)
> ```
>
This is **non-standard syntax**called Lambda-Style Functions (aka Metalua Short Anonymous Functions).
> **Example: i.e.**
> `|paramList| expression` is just an abbreviated form of:
>
> ```lua
> function(paramList)
> return expression
> end
> ```
>
> ```lua
> function(paramList)
> return expression
> end
> ```
>
#### Limitations {#limitations}

There are some important limitations you need to be aware of:

1. Lambda-Style Functions contain a single expression, **not a statement**. This means the following is valid:

```lua
|spawnedBlock| print(spawnedBlock.type)
```

but this is not:

```lua
|spawnedBlock| spawnedBlock.locked = true
```

2. The result of the expression will *always*be returned. Generally, this is what you want, but it's worth being aware
 of.
3. Because Lambda-Style Functions are fundamentally not standard Lua syntax, most Lua tooling will not know how to
 handle the syntax.
Best case, syntax highlighting just won't work. However, more serious issues may occur. For example, standard Lua
runtimes are simply unable to execute any code which includes this syntax.
*Atom (with the Tabletop Simulator plugin) is an exception, as it specifically implements support.*

> **Warning: Warning**
> If you're not 100% certain what the difference is between a statement and an expression, then it's probably best to
> avoid Lambda-Style Functions.

## Table of Contents

* Clock Modes
* Member Variables
* Function Summary
* Function Details
  * getValue()
  * pauseStart()
  * setValue(...)
  * showCurrentTime()
  * startStopwatch()

# Clock

The Clock behavior is present on the Digital Clock object.

## Clock Modes {#clock-modes}

* **Current Time**: Displays the current time of the host.
* **Stopwatch**: Displays a running count up.
* **Timer**: Displays a countdown and beeps once complete.

## Member Variables {#member-variables}

|Variable|Type|Description|
|---|---|---|
|paused|`boolean`|If the clock timer is paused.|

## Function Summary {#function-summary}

|Function Name|Return|Description| |
|---|---|---|---|
|getValue()|return ` int `|Current time in stopwatch or timer mode. Clock mode returns 0. This function acts the same as [Object's getValue()](../../object/#getvalue).| |
|pauseStart()|return ` boolean `|Pauses/resumes a Clock in stopwatch or timer mode.| |
|setValue( ` int ` seconds)|return ` boolean `|Switches clock to timer and sets countdown time. This function acts the same as [Object's setValue()](../../object/#setvalue).|[#setvalue](#setvalue)|
|showCurrentTime()|return ` boolean `|Switches clock to display current time. It will clear any stopwatch or timer.| |
|startStopwatch()|return ` boolean `|Switches clock to stopwatch, setting time to 0. It will reset time if already in stopwatch mode.| |

---

## Function Details {#function-details}

### setValue(...) {#setvalue}

[../../types/](../../types/)Set the timer to display a number of seconds. This function acts the same as [Object's setValue()](../../object/#setvalue). If the Clock is not in timer mode, it will be switched. If it is in timer mode, it will be paused and the remaining time will be changed. This will not start the countdown on its own.
> **Info: setValue(seconds)**
>
> * [../../types/](../../types/) **seconds**: How many seconds will be counted down.
>
```lua
self.Clock.setValue(30)
```

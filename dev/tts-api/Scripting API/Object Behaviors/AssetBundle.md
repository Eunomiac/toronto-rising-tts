## Table of Contents

* Function Summary
* Function Details
  * getLoopingEffectIndex()
  * getLoopingEffects()
  * getTriggerEffects()
  * playLoopingEffect(...)
  * playTriggerEffect(...)

# AssetBundle

The AssetBundle behavior is present on Objects that were created from a [custom AssetBundle](https://kb.tabletopsimulator.com/custom-content/custom-assetbundle/).

## Function Summary {#function-summary}

|Function Name|Description|Return| |
|---|---|---|---|
|getLoopingEffectIndex()|return `int`|Index of the currently looping effect. Indexes starts at 0.| |
|getLoopingEffects()|return ` table `|Returns a Table with the keys "index" and "name" for each looping effect.|[#getloopingeffects](#getloopingeffects)|
|getTriggerEffects()|return ` table `|Returns a Table with the keys "index" and "name" for each trigger effect.|[#gettriggereffects](#gettriggereffects)|
|playLoopingEffect( ` int ` index)|return ` nil `|Starts playing a looping effect. Indexes starts at 0.| |
|playTriggerEffect( ` int ` index)|return ` nil `|Starts playing a trigger effect. Indexes starts at 0.| |

## Function Details {#function-details}

### getLoopingEffects() {#getloopingeffects}

[../../types/](../../types/)Returns a Table with the keys "index" and "name" for each looping effect.

```lua
-- Example usage
 effectTable = self.AssetBundle.getLoopingEffects()
```

```lua
-- Example returned table
 {
 {index=0, name="Effect Name 1"},
 {index=1, name="Effect Name 2"},
 }
```

---

### getTriggerEffects() {#gettriggereffects}

[../../types/](../../types/)Returns a Table with the keys "index" and "name" for each trigger effect.

```lua
-- Example usage
 effectTable = self.AssetBundle.getTriggerEffects()
```

```lua
-- Example returned table
 {
 {index=0, name="Effect Name 1"},
 {index=1, name="Effect Name 2"},
 }
```

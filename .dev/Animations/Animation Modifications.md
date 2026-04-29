# Animating Object Modifications

This document outlines the new method we will be using to govern the movement of ALL game objects, whether they are being moved instantly (`duration = 0`) or are being lerped via an ease.

**Critical:** The `utils.ttslua` library contains a variety of functions that should be used at all times when moving objects; "reinventing the wheel" is a serious problem that arises frequently when new animations are implemented, and care should be taken to use existing functions. This includes functions for:

- smoothly moving objects AND/OR animating other properties via lerping and an ease curve
- sequencing events in time (not limited to animations: the sequencing utility functions should be used WHENEVER several functions need to be run in sequence, waiting for a defined time between functions and/or waiting for certain game events to occur.)

## Animating Seat Objects

### Animation Type Definitions

Animations will now HAVE to be defined using the following types, defined using TypeScript notation for convenience:

```typescript
type PlanarVector = {x: number, z: number}
type VerticalVector = {y: number}
type Vector = PlanarVector & VerticalVector

// PlanarFrame: Defines motion and rotation within the XZ-frame.
type PlanarFrame = {
 position: PlanarVector,
 rotation: VerticalVector,
 scale?: Vector
}

// Frame: A Transform where only `position` and `rotation` are required; `scale` is made optional and given a default value
type Frame = {
 position: Vector
 rotation: Vector
 scale?: Vector = {x: 1, y: 1, z: 1}
}

// MotionFrame: Defines a destination for animating objects to. Missing components are unchanged from object's existing state.
type MotionFrame = {
 position?: Partial<Vector>
 rotation?: Partial<Vector>
 scale?: Vector
}

// AnchoredMotionFrame: A MotionFrame that derives its position and rotation from the PlanarFrame of an anchor object and a `height` VerticalVector.
// **A Note on Anchors:** Anchors are invariably small, invisible, locked GameObjects with very high y values so they do not interfere with objects at the table level. Their sole purpose is to define the XZ-position and rotation values of objects or animation destinations anchored to them.
type AnchoredMotionFrame = {
 anchor: ObjectReference,
 height: VerticalVector,
 scale?: Vector
}

type AnimatableProperty = string // Any object attribute that can be defined by a number or Vector and lerped through for an animation (e.g. "color", "angle", "range", "intensity", "distance", "yaw", "pitch")

// AnimationOptions: Various settings (with defaults) that define the characteristics of an Animation
interface AnimationOptions {
 duration?: number = 1,
 ease?: string = "sine",
 delay?: number = 0,    // A delay defining a period of no motion between when the animation is called and when the animation begins movement
 isLocked?: boolean,    // Whether the object should remain locked (if true) or be unlocked (if false) after the animation completes. If absent, lock state is restored
 isHidden?: boolean = false  // Whether the object should be set invisible to all players after the animation completes
}

// Animation: Defines the movement of an object from its current position to a defined destination position.
type Animation = (MotionFrame|AnchoredMotionFrame) & AnimationOptions & Record<AnimatableProperty, number|Vector>

// ObjectAnimations: A table defining multiple animations by name that can be called for a given object
interface ObjectAnimations {
  object: ObjectReference,
  [k: string]: Animation
}
```

### Animation Guidelines

*ALL* movement of objects must be defined as `Animation` objects, usually within an `ObjectAnimations` table that both identifies the object to be animated, and supplies named `Animation`s the object can be moved between. (For example, `C.ObjectPositions` is of type Record<string, ObjectAnimations>)

- Whenever an object is animated, it is always locked for the duration of the animation. When the animation completes, its lock state should be restored to its original state unless overridden by `isLocked`.
- Whenever an object is animated, it is always revealed to all players for the duration of the animation. When the animation completes, it should remain revealed unless overridden by `isHidden`
- Objects should be animated via the animation functions in the utils library.
- Sequences of animations should be constructed using the sequencing functions in the utils library.
- If an animation duration is zero, it is not technically an animation: the object should be moved instantly via setPosition & setRotation, without smooth/slow/lerping options

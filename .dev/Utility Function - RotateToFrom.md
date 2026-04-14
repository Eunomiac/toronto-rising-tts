# `U.RotateToFrom(transformRefs, toAngle, [fromAngle], [origin])`

This versatile function facilitates determining and applying positions and orientations in cylindrical coordinates.

## Type Definitions

| Type | Definition |
| ------ | ------ |
| `ObjectRef` | An object reference from which `U.getObject` can return a `GameObject`: a `string` (GUID), a table with a `guid` field, or a `GameObject` itself. |
| `Frame` | A subset of `Transform`, omitting scale: a table containing a `position` `Vector` and an optional `rotation` `Vector` (which, if omitted, defaults to `Vector(0,0,0)`). e.g. `{position = Vector(10, 0, 0), rotation = Vector(0, 0, 0)}` |
| `FrameRef` | Either a `Frame` or an `ObjectRef` from which a `Frame` can be derived. |
| `AngleXZ` | An `integer` representing an angle in degrees around the y-axis (i.e. on the xz-plane), rotating clockwise. Unless representing an angle-delta, by convention, `0` is 12 o'clock on the xz-plane (i.e. positive z-axis, x-axis `0`); `90` is 3 o'clock on the xz-plane; `180` is 6 o'clock on the xz-plane; `270` is 9 o'clock on the xz-plane. |
| `AngleRef` | Either an `AngleXZ` or a `FrameRef` (from which an `AngleXZ` can be derived; see below). |

## Parameters: `frameRefs`, `toAngleRef`, `fromAngleRef`, `originRef`

Each of its parameters accepts a variety of input types:

- `frameRefs`: A single `FrameRef` or an array of `FrameRefs`
  - any `FrameRef` that reduces to an object reference indicates that the object's position and rotation should be changed by this function, in addition to returning the new `Frame` in the results.
  - if a table of `FrameRefs` is provided, that group must be rotated as if it were a single, rigid-body object — i.e. they must all move together as a unit, with relative positions and orientations between them being preserved. *(Simply applying `U.RotateTo` to each object in the table will not work as expected.)*
- `toAngleRef`: A single `AngleRef`. Combined with the inputs of `originRef` and `fromAngleRef`, the `AngleRef` can be reduced to an integer angle *(see below)*.
- `fromAngleRef`: A single `AngleRef`. Optional (i.e. can be `nil`).
- `originRef`: A single `Vector` position in xyz-space. If omitted, defaults to `Vector(0,0,0)`.

## Return Value: `Frame` or `Frame[]`

- If a single `FrameRef` is provided, the function returns a single `Frame` after applying the rotation.
- If an array of `FrameRefs` is provided, the function returns an array of `Frames` after applying the rotation to the entire group as a single, rigid-body object.
- Any `FrameRef` that reduces to an object reference will have its position and rotation changed by this function in the game world, in addition to returning the new `Frame` in the results.

## Derivation of Final `Frame` from Parameters

1. Reduce `originRef` to a `Vector` position in xyz-space. This defines the center of the cylindrical coordinate system.

2. If provided, reduce `fromAngleRef` to an `AngleXZ` integer representing an absolute angle around the `origin` on the xz-plane.

   - if `fromAngleRef` is an `AngleXZ` integer, no reduction is needed.
   - if `fromAngleRef` is a `FrameRef`, determine the `AngleXZ` integer by calculating the angle between the `origin` and the `FrameRef`'s position on the xz-plane.

3. Reduce `toAngleRef` to an `AngleXZ` integer representing an absolute angle around the `origin` on the xz-plane.

   - if `toAngleRef` is an `AngleXZ` integer, no reduction is needed.
   - if `toAngleRef` is a `FrameRef`, determine the `AngleXZ` integer by calculating the angle between the `origin` and the `FrameRef`'s position on the xz-plane.
   - if `fromAngleRef` is provided, the `AngleXZ` integer derived from the above step represents an angle-delta from `fromAngleRef`: convert this angle-delta into an absolute angle by adding it to `fromAngleRef`.

4. Derive `distance` from the `origin` to the `FrameRef`'s position on the xz-plane, and `height` from the `FrameRef`'s position on the y-axis.

5. Convert the cylindrical coordinates `{distance, angle, height}` to an xyz-space `Vector` position using the `origin` as the center.

6. Determine the rotation `Vector` for the return `Frame` by maintaining the object's orientation relative to the `origin` on the xz-plane. For groups of objects, the rotation should be the same for all objects in the group.

7. Apply the derived `position` and `rotation` values to any `FrameRef`s that reduced to an object reference. *(Do this instantly: No need to animate/lerp.)*

8. Return either a single derived `Frame` or an array of derived `Frames`, depending on the input parameters.

# TTS 3D Positioning Utility Guide Design

> This document exists to clarify what will be documented and where, before writing the user-facing guide.

## Goal
Create a developer/user guide that summarizes the existing 3D positioning utilities in `lib/util.ttslua`, with special emphasis on cylindrical and spherical coordinate positioning in Tabletop Simulator (TTS).

## Architecture
The guide will be reference + recipe oriented:
- Reference the relevant `U.*` exports for converting between XYZ and cylindrical/spherical coordinate representations.
- Reference the existing smooth path/orientation helpers that consume those coordinate representations (pre-computed eased paths and deferred/evaluated-at-execution paths).
- Provide short “how to use” examples that show how to create orbit/spiral-style motion by interpolating in coordinate space.

## Tech Stack
- Lua utility library: `lib/util.ttslua`
- Coordinate system conventions and demo context: `core/debug.ttslua`

## Scope
Included:
- `U.rotateAroundPoint(...)` (XZ-plane circular placement)
- `U.XYZToCylindrical(...)` / `U.XYZToSpherical(...)`
- `U.resolvePositionData(...)` (interpret `data.position` using `coordinateSystem`)
- `U.GetEasedPath(...)` with `coordinateSystem = "cylindrical" | "spherical"`
- `U.LerpPath(...)` / `U.LerpDeferred(...)` (apply the generated path)
- `U.lookAtRotation(...)` (orientation “look-at” helper)

Excluded:
- Broader physics helpers and snap-point helpers unless needed to support 3D motion application (kept minimal).

## Output
1. Commit this design document.
2. Create the user-facing guide in:
   - `.dev/User Guides/<new-file>.md`

## Notes
- Angle conventions used by `U.*` cylindrical/spherical utilities will be explicitly documented to avoid mismatched expectations.
- The guide will also note coordinate-system defaults/hardcoded behavior in `U.Lerp(...)` where relevant, recommending `U.GetEasedPath(...)` for cylindrical/spherical motion.

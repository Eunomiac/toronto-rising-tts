# Scene and Scatter Stall Isolation

Use this only while investigating **TOR-769** (heavy scene transition hangs and disconnects every
joined client). The probes are dormant during ordinary play.

## Before you start

1. Save & Play so TTS has the current Global script.
2. In `.dev/testbed/TEST BED.ttslua`, select the complete `SceneStallProbe` function and run
   **Execute Code** once. This registers the helper.
3. Open the TTS console so you can see each `START`, `RETURN`, `HEARTBEAT 0`, and
   `HEARTBEAT 250` line.
4. Run only one commented example at a time. Wait for both heartbeat lines before continuing.

The `RETURN` line measures the Lua call. The heartbeat lines measure how long it took TTS to let
Lua run again after that call returned. If a probe prints `RETURN` quickly and its heartbeat arrives
much later, the engine work started by that probe is the important boundary.

## Baseline

Run `SceneStallProbe("baseline")`, then `SceneStallProbe("census")`.

Stop if the baseline heartbeat is already delayed. The table was busy before the diagnostic action
began. The census lists every object still loading or spawning and summarizes the live preload pool.
Wait for those objects to finish, then repeat the baseline.

## Scatter player slices

Enter Scatter and replace `pc1` in the examples with the key for the player you are testing. Run, in
order:

1. `scatter_figurine`
2. `scatter_hand`
3. `scatter_seat`
4. `scatter_camera`
5. `scatter_all`
6. `scatter_hud`
7. `dashboard`

These actions re-apply that player's current pose. They do not move the player to another group or
rewrite Scatter membership. Stop after the first action whose heartbeat is delayed by the familiar
freeze and keep the complete console block.

### If `dashboard` is the first delayed heartbeat

After Save & Play with the follow-up probe actions, run these one at a time:

1. `SceneStallProbe("dashboard_build_seats")`
2. `SceneStallProbe("dashboard_encode_seats")`
3. `SceneStallProbe("dashboard_emit_seats")`
4. `SceneStallProbe("dashboard_build_scene")`
5. `SceneStallProbe("dashboard_encode_scene")`
6. `SceneStallProbe("dashboard_emit_scene")`

The build probe stops before JSON encoding. The encode probe stops before the tagged console message.
The emit probe exercises the complete single-slice path. Stop after the first delayed heartbeat.

## Scene slices

With the heavy Elysium scene already live, run, in order:

1. `table`
2. `seats`
3. `npcs`
4. `scene`
5. `ui`
6. `soundscape`

Each action re-applies current `gameState` intent through the production reconciler for that slice.
After the individual slices, `full` deliberately re-applies the complete full-sync path for
comparison. Stop after the first delayed heartbeat.

## What to send back

Copy the baseline and census blocks, the first delayed probe block, and the block immediately before
it. If no individual slice stalls but `scatter_all` or `full` does, include all component blocks from
that section because the problem is likely cumulative.

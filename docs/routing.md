# Routing and reproducibility

The copper was generated independently for MuseView with tscircuit's local `hypergraph` / `beta_pipeline7` router, then corrected at the USB input, ground/power plane fanouts, buck feedback and camera bypasses. No reference board's route cache is used.

`index.circuit.tsx` holds the component placement, nets, high-priority fixed traces, FPC fanout, planes and keepouts. `pcb-routes.json` records the remaining reviewed routing. `scripts/board-router.ts` replays that copper only if the incoming routing geometry/net fingerprint matches. A footprint, connectivity, board or placement change fails the build instead of silently using stale copper. Schematic-only edits do not change the routing fingerprint. Replayed routes still go through native DRC and the independent checks.

To deliberately redesign copper:

1. In the board autorouter configuration, temporarily remove `algorithmFn: boardRouter`, keeping the local router and existing clearance rules. Build and inspect `dist/autorouter-debug/phase-0.input.simple-route.json` and the corresponding output traces.
2. Resolve all geometry, short and continuity errors, and review local bypasses and power return paths. An autorouter's completion flag alone is insufficient.
3. Replace saved traces with the reviewed output and compute `routeFingerprint(input)` for that exact input. Restore `algorithmFn: boardRouter`. Do not merely change the fingerprint to silence a stale-routing error.
4. Run `bun run verify`, update and check 2D/3D snapshots, then `bun run export:release`. Recheck JLC placement rotations and physical margins before ordering.

The snapshot command attempts to save its own optional selector-based route cache and may report that `port.top` is not unique for vias. That secondary cache is not used. The explicit geometry-guarded router above supplies the routes; snapshot matching, native circuit validation and Gerber short verification still execute.

All exported drills are through plated L1–L4 or nonplated. There are no blind/buried fabrication drill files. L2 is the GND reference and L3 is common VDD_IO, with the RF exclusion applied to all copper. The camera local bypasses and USB ESD path are preserved explicitly; controlled impedance and assembled high-frequency performance remain prototype measurements.

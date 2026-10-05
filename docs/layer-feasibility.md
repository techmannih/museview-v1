# Two-layer feasibility review — 2026-10-05

**Decision: retain the existing four-layer release. The tested two-layer draft is NOT READY and must not be ordered. Four layers are recommended, not mandatory for an ESP32-S3 design.**

Espressif's [PCB layout guidelines](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/pcb-layout-design.html) explicitly permit two layers, while recommending four. They call for minimal bottom-layer routing and continuous ground in a two-layer implementation, and a continuous reference beneath USB differential routing. MuseView uses the WROOM module; bare-chip RF, crystal and memory layout requirements must not all be interpreted as baseboard requirements.

## What was tested

The isolated trial started from commit `7c9b41137d943b7360f18bac38ae7db58a59127b`. It retained the 50 × 35 mm outline, existing assembly-part positions, top-only assembly, USB-C 5 V without PD, ESP32-S3-WROOM-1-N16R8, M0031 and the existing supply targets. The declared via minima remained 0.30 mm drill / 0.45 mm pad; actual vias retained 0.30 mm drills / 0.60 mm pads.

The trial removed the inner planes, routed supply connections on the outer layers, added top/bottom GND pours and additional ground stitches, and tried several route orders and local ground connections. It was a real two-layer routing experiment, not merely a change to the board's layer count. Existing release checks were not disabled to accept it.

## Result

| Check | Latest trial result |
| --- | --- |
| Board copper layers | 2 |
| Grid-router failed connections | 0; 120 generated traces |
| Complete circuit geometry | 169 PCB traces, 143 vias |
| Native circuit build | Failed: 23 `pcb_port_not_connected_error` diagnostics on GND |
| Independent ground-polygon analysis | Three disconnected ground groups |
| Manufacturing export | Not performed; draft rejected before release |

The ground groups are the main board ground, a separate island containing **C13.pin2 and C16.pin2**, and another containing **J2.DGND**. The 23 diagnostics are not 23 separate islands: the checker reports multiple members of the incompletely connected net. Zero router failures therefore does not establish complete PCB connectivity.

A second diagnostic sampled USB centerlines at intervals no greater than 0.05 mm against opposite-layer GND pours and pads. It found uncovered runs up to approximately **3.69 mm on the D− port/ESD network** and **2.96 mm on D+**. This includes connector and IC escapes. It is a geometric reference-coverage check, not an impedance calculation or a physical USB test. PORT/ESD aliases refer to the same connected copper and must not be summed as independent measurements. Ground traces and vias are not counted as a reference plane by this diagnostic.

The machine-readable [trial evidence](evidence/two-layer-feasibility.json) records the draft hashes, diagnostics, ground groups and sampling results. The rejected draft and its detailed logs are retained separately in the local feasibility workspace; they are not release inputs.

## Consequence

This experiment does not prove that a two-layer MuseView is impossible. It shows that the tested conversion of the current placement does not meet connectivity and return-path requirements. A two-layer version needs further placement/routing work around the camera grounds, power distribution and USB, followed by complete verification and new manufacturing exports. A smaller layer count alone is not a safe cost reduction.

The committed PCB, routing, BOM/CPL, Gerbers and CAD remain the existing four-layer design. Its inner GND and VDD_IO planes are electrically active and cannot simply be deleted. The existing M0031/AFC01 mechanical qualification and JLC placement-preview items remain open; this layer review does not close them or authorize an order.

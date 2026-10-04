# Release checks

Status: **NOT READY** for the first prototype. Only the two pre-order items below remain open; post-assembly measurements are listed separately. The machine-readable [`verification.json`](../release/verification.json) records the exact circuit hash and check outcomes. Manufacturing exports are versioned in `release/`, with SHA-256 hashes.

Local verification completed on 2026-10-04: source netlist, schematic placement, PCB placement, routing difficulty, board build, electrical contract, actual copper continuity, local bypasses, exact M0031 supply bounds, assembly/stock checks and separate Gerber short analysis passed. Nineteen regression tests passed, including supplier TVS pin polarity and the two captured renderer inputs. Native 2D and 3D snapshot regeneration/compare runs matched. The GitHub workflow repeats the circuit checks and 2D snapshots and compiles the matching ESP-IDF 5.4.2 firmware.

Exact trace/via counts are recorded in `verification.json`. There are zero build/routing errors and zero detected Gerber shorts. The retained native width warnings are explained in `electrical-review.md`; critical local widths are checked against their exact endpoints. All 28 selected assembly part numbers had positive JLCSearch stock in the dated evidence. This is availability evidence, not a PCBA order acceptance.

The handoff exporter verifies five KiCad schematic files (root plus four children) and all 16 distinct native/imported STEP models. GLB embeds the local OBJ bodies. KiCad files are interchange exports; no native KiCad ERC/DRC run is claimed. The tscircuit source and its checked copper remain authoritative.

| Check | Evidence required |
|---|---|
| Electrical contract | `bun run check:contract`, matches generated netlist |
| Stock | `sourcing/bom-with-stock.csv`, timestamped JLCSearch URLs |
| Type and source netlist | `bun run typecheck`, `tsci check netlist` |
| Placement and schematic | Native checks plus reviewed four-sheet renders |
| PCB | Zero build errors, connectivity checks, zero Gerber shorts |
| Bypass loops | `bun run check:decoupling`, actual local copper length |
| Assembly | Exact part identities, all fitted parts top, FPC pitch, JLC placement review |
| Firmware | CI compile and generated pin header consistency; physical operation separately |
| Fabrication | Review Gerber/drill/stackup/impedance with manufacturer |
| Hardware | Rails, startup, thermal/current/USB/camera tests in `bring-up.md` |

First-prototype blockers:

1. **Exact M0031-to-J2 mating qualification** — AFC01 requires a tighter 0.29–0.31 mm tail than F32R’s 0.27–0.33 mm range. Exact seating/latch fit remains unqualified. The numbered-tail photo also raises a possible reversed camera-to-J2 mapping after accounting for contact face and insertion direction; the current one-to-one numbering is not physically signed off. See `camera-mating.md`.
2. **JLC assembly placement approval** — the exported rotations are CAD angles. Verify U1/J1/J2/D1/LED1/U2/U3/U4/U5 alignment and centroids in the authenticated JLC preview, using `placement-review.md` and the generated `release/placement-review.json`. The Gerber upload was recognized as 4 layers, 50 × 35 mm. No order/payment was submitted.

After assembly: no physical PCB has been tested in this task. Source-current/inrush, rails/ripple/thermal behavior, USB enumeration and camera capture are prototype bring-up work before production. They are not circular prerequisites for ordering the first prototype. Manufacturing stackup and assembly eligibility must still match the actual quote; automated checks do not replace manufacturer review.

The 1.197 V camera-core revision is superseded. R8 = 25.5 kΩ and CAM_1V3 are mandatory. Electrical checks validate the declared board nets, including J2 pin 10 to CAM_1V3; they cannot prove the camera-to-connector contact mapping. See `camera-mating.md` for the tolerance comparison and possible numbering reversal. Neither exact tail qualification nor the numbered physical mating has been signed off.

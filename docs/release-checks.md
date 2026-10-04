# Release checks

Status: **CAD verification complete; engineering prototype, physical validation open**. The machine-readable [`verification.json`](../release/verification.json) records the exact circuit hash and check outcomes. Manufacturing exports are versioned in `release/`, with SHA-256 hashes.

Local verification completed on 2026-10-04: source netlist, schematic placement, PCB placement, routing difficulty, board build, electrical contract, actual copper continuity, local bypasses, assembly/stock checks and separate Gerber short analysis passed. Twelve regression tests passed. Native 2D and 3D snapshot regeneration/compare runs matched. The GitHub workflow repeats the circuit checks and 2D snapshots and compiles the matching ESP-IDF 5.4.2 firmware.

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

Physical validation is open: no PCB has been manufactured or electrically tested in this task. JLC assembly eligibility/rotation preview, external M0031 mating, source-current/inrush behavior, controlled impedance and the measured results above must be signed off before production. These checks are not replaced by software CI.

# Release checks

Status: **engineering prototype; validation in progress**. Do not order from an intermediate commit. The final verification report records the actual outcomes for its circuit hash.

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

# Assembly

All 49 fitted components are on the top side. Probe pads are bare copper features and must not enter the assembly BOM. BOM and placement CSVs are generated from the final circuit JSON, with exact JLC numbers. Quantities must be regenerated after circuit changes. Copper, drill and JLC centroid coordinates share the board-center origin; negative coordinates are intentional. Do not offset the CPL independently of the Gerbers. Rotation is the tscircuit footprint rotation, so check every polarized part in the JLC placement preview.

- U1: ESP32-S3-WROOM-1-N16R8, not MINI/1U or another memory variant. PCB antenna points toward the north edge. Do not place copper, metal fasteners, battery or enclosure metal in the marked RF keepout. Exposed ground lands need the specified solder paste and solder-mask-covered ground island.
- J1: TYPE-C-31-M-12, facing west. Receptacle mouth intentionally overhangs the board. Verify plated mounting slots and locating holes in the fabrication preview.
- J2: AFC01-S24FCA-00, 24 contacts at 0.5 mm pitch, bottom contact, 0.3 mm flex candidate. Pad 1 is west. Contacts on the mating flex face the PCB; verify the physical M0031 tail's pin 1 and insertion geometry before energizing. Do not force or hot-plug the latch.
- D1: SMF5.0A is unidirectional. Cathode is the west/negative-X pad and connects to protected 5 V; anode is ground. Native diode pin aliases are used; physical footprint pad polarity is explicitly preserved.
- LED1: imported KT-0603R polarity; inspect the anode from GPIO17 through R13 and cathode to GND.
- U3/U4/U5: compare pin-1 and package rotations with manufacturer drawings, not only rendered bodies. The 3D asset is a visualization and is not a substitute for a land-pattern drawing.
- R6/R7: 432 kΩ and 100 kΩ, **0.1%**, mandatory. R8: 20.5 kΩ, replacing the source brief's 25.5 kΩ.

Four corner holes are 2.7 mm nonplated, intended for M2.5 hardware. Check screw-head/enclosure clearances. The external camera needs mechanical support; its outline is an assembly note outside the PCB, not fabricated board area.

Imports were downloaded using `tsci import C<number> --jlcpcb --download --use-exact-footprint`. Primitive selection, pin attributes and connectivity aliases were reviewed after import. Standard passives use native tscircuit footprints with explicit supplier identities. The unused 25.5 kΩ import is excluded.

External items (not JLC assembly): Arducam M0031, rated 5 V USB supply/cable, M2.5 hardware/enclosure. No alternate camera module is approved without rechecking pinout, flex orientation, rail ranges and GPIO timing.

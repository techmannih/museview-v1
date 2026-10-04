# MuseView V1 manufacturing handoff

- `museview-v1-gerbers.zip`: four copper layers, solder masks/paste, silkscreen, outline, plated L1–L4 drills and nonplated drills. Generic exporter BOM/CPL are removed to avoid competing assembly files.
- `jlc-bom.csv` and `jlc-cpl.csv`: the authoritative 49-component **top-only** assembly pair. No bottom-side components. Board-center origin matches the Gerbers. Validate polarized-part rotations in JLC's placement preview.
- `schematic-usb.svg`, `schematic-power.svg`, `schematic-mcu.svg`, `schematic-camera.svg`: four readable vector schematic sheets.
- `pcb-top.svg`, `pcb-bottom.svg`, `pcb-top.png`: copper/placement views.
- `museview-v1-kicad.zip`: PCB, project, root plus four schematic sheets and 16 model files. Extract the whole archive; retain its `3dmodels/` tree.
- `museview-v1.step`, `museview-v1.glb`, `3d.png`: assembled mechanical model, portable textured 3D model and preview. Camera is an external assembly item.
- `circuit.json`: exact verified tscircuit interchange/netlist/geometry; CAD URLs resolve relative to repository root.
- `verification.json`, `sha256.json`: verification evidence and artifact checksums.

USB-C is 5 V only. Use the assembly, electrical review and bring-up documents in `../docs/`. Physical power/startup/USB/camera tests and manufacturer stackup/impedance review remain open. This package is an engineering prototype handoff, not a claim of measured production qualification.

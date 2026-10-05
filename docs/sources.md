# Component sources and datasheets

Checked 2026-10-04. JLC evidence includes exact fetch timestamps and URLs in `sourcing/stock-snapshot.json`. Stock is a cached search snapshot, not a reserved quantity.

- ESP32 module: https://documentation.espressif.com/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf
- ESP32 hardware guidance: https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/pcb-layout-design.html
- TLV62569: https://www.ti.com/lit/ds/symlink/tlv62569.pdf
- XC6206: https://product.torexsemi.com/system/files/series/xc6206.pdf
- SGM2059: https://www.sg-micro.com/rect/assets/c90e4805-a9a9-4001-be72-fb96737d867e/SGM2059.pdf
- USBLC6-2: https://www.st.com/resource/en/datasheet/usblc6-2.pdf
- OV2640 manufacturer datasheet v2.2, table 6, hosted by Robu: https://robu.in/wp-content/uploads/2024/09/OV2640_DS.pdf
- Exact Arducam M0031 product/core/mating connector: https://www.arducam.com/arducam-ov2640-camera-module-2mp-mini-ccm-compact-camera-modules-compatible-with-arduino_m0031esp32-esp8266-development-board-with-dvp-24-pin-interface_.html
- Amphenol F32R recommended mate: https://www.amphenol-cs.com/product/f32r1a7h111024.html
- Amphenol F32R bottom-contact/0.30 mm interface: https://cdn.amphenol-cs.com/media/wysiwyg/files/documentation/datasheet/flex/ffc_fpc_050mm_f32r_f32q.pdf
- Amphenol F32R/F32J dimensioned drawing A-S0201 rev C, visually inspected: https://cdn.amphenol-cs.com/media/wysiwyg/files/drawing/f32r-f32j.pdf (SHA-256 `ccb80cfe928b3ab5cb602e74da5e3fe788bbf19c41fc63e2e992ffa461303bb0`)
- Amphenol F32R thickness tolerance, specification IS.EQC.001 rev D: https://cdn.amphenol-cs.com/media/wysiwyg/files/documentation/f31q-f32r-f52q-f52r_prodspec.pdf (manufacturer PDF downloaded via https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/6256/f31q-f32r-f52q-f52r_prodspec.pdf ; SHA-256 `c78407cb7ef80c4142c3566afae8f0222eef4fee88663f247b355b14d4eee4a7`)
- JUSHUO AFC01 drawing/specification, C262669: https://datasheet.lcsc.com/datasheet/pdf/97e3ba016a78286ffa6cfbc591e2beb6.pdf
- M0031/pinout: https://blog.arducam.com/ov2640-vs-ov7670-detailed-comparisons-and-resources/
- JLCSearch: https://jlcsearch.tscircuit.com/

Native resistors/capacitors use explicit JLC numbers rather than an automatic parts engine. Other parts and local STEP/OBJ bodies were obtained through tscircuit's JLC import flow. Supplier CAD/symbol data remain subject to their original terms; no blanket relicensing of vendor assets is asserted.

The power and interface design uses a common 3.192 V MCU/camera I/O supply, 1.296 V camera core, 0.1% main feedback resistors, 5 V analog-LDO input, controllable camera reset/powerdown, camera I/O decoupling and local ESD-supply bypass. USB-C supplies standard 5 V power.

Supplier STEP entity terminators were normalized from `) ;` to `);` for the pinned exporter’s parser. Geometry/entity arguments were not changed. `bun run normalize:step` reproduces this formatting operation after a fresh import. Assembled STEP export then completes without omitted-model warnings.

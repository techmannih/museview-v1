# Source and provenance

Checked 2026-10-04. JLC evidence includes exact fetch timestamps and URLs in `sourcing/stock-snapshot.json`. Stock is a cached search snapshot, not a reserved quantity. The source bundle was supplied by the user; its older stock quantities were not treated as current.

- Repository conventions: https://github.com/techmannih/trellis-core
- Camera architecture/pin study: https://tscircuit.com/0hmX/esp32-s3-usb-webcam-ov2640 (v1.0.7). No wholesale reference board source or route cache is incorporated.
- ESP32 module: https://documentation.espressif.com/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf
- ESP32 hardware guidance: https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/pcb-layout-design.html
- TLV62569: https://www.ti.com/lit/ds/symlink/tlv62569.pdf
- XC6206: https://product.torexsemi.com/system/files/series/xc6206.pdf
- SGM2059: https://www.sg-micro.com/rect/assets/c90e4805-a9a9-4001-be72-fb96737d867e/SGM2059.pdf
- USBLC6-2: https://www.st.com/resource/en/datasheet/usblc6-2.pdf
- OV2640 manufacturer datasheet v1.6, hosted by UCTRONICS: https://www.uctronics.com/download/cam_module/OV2640DS.pdf
- M0031/pinout: https://blog.arducam.com/ov2640-vs-ov7670-detailed-comparisons-and-resources/
- JLCSearch: https://jlcsearch.tscircuit.com/

Native resistors/capacitors use explicit JLC numbers rather than an automatic parts engine. Other parts and local STEP/OBJ bodies were obtained through tscircuit's JLC import flow. Supplier CAD/symbol data remain subject to their original terms; no blanket relicensing of vendor assets is asserted.

The design changes relative to the supplied USB5V package are intentional: common 3.192 V MCU/camera I/O, 1.197 V camera core, 0.1% main feedback resistors, 5 V analog-LDO input, controllable camera reset/powerdown, explicit camera I/O decoupling and local ESD-supply bypass. No PD circuitry is included.

Supplier STEP entity terminators were normalized from `) ;` to `);` for the pinned exporter’s parser. Geometry/entity arguments were not changed. `bun run normalize:step` reproduces this formatting operation after a fresh import. Assembled STEP export then completes without omitted-model warnings.

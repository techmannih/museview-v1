# First-prototype assembly placement review

Reviewed 2026-10-04 against the generated board and exported CPL. **Board-side orientation landmarks checked; JLC-specific placement approval is pending.** The user chose to continue offline after the JLC login gate. No BOM/CPL placement preview, order or payment was completed.

JLC successfully detected the uploaded Gerbers as four copper layers and 50 × 35 mm. This validates file recognition only. It does not validate component matching, rotations, centroids, stackup choices or assembly eligibility. The temporary quote defaults were not approved manufacturing settings.

The table uses the top view: north is +Y, east is +X, and all coordinates are in mm relative to the same board-centre origin used by the Gerbers. Angles are the current **footprint/CPL angles**, not independently calibrated JLC angles. `release/placement-review.json` records the actual pad coordinates/nets and binds this review to the exact circuit and CPL SHA-256 hashes.

| Ref / JLC part | CPL angle | Required assembled orientation / board landmarks |
|---|---:|---|
| U1 ESP32-S3-WROOM-1-N16R8 / C2913202 | 0° | Antenna north. Pin 1 GND northwest at (−4.2500, 9.5450); pin 2 VDD_IO immediately south. Pin 40 GND northeast. |
| J1 TYPE-C-31-M-12 / C165948 | 270° | USB mouth west/left, SMT signal row east. CC1 at (−18.6760, 4.2499), CC2 at (−18.6760, 1.2499). Use connector pad names, not the imported shell-tab `pin1`, as the orientation reference. |
| J2 AFC01-S24FCA-00 / C262669 | 90° | Mouth east/right, flex contacts down. Pin 1 south at (21.1999, −7.2498), pin 24 north at (21.1999, 4.2501). Signal row west of the body; mounting tabs east. |
| D1 SMF5.0A / C193402 | 0° | Pin 1 cathode/bar west at (−22.6350, 9.7000), connected to VBUS_5V. Pin 2 anode east at (−19.3650, 9.7000), GND. Explicit supplier pin numbering is enforced by the hardware contract. |
| LED1 KT-0603R / C2286 | 0° | Cathode west at (−13.4501, −13.8000), GND. Anode east at (−11.9499, −13.8000), driven through R13. Confirm the actual supplier polarity mark against these nets. |
| U2 USBLC6-2SC6 / C2687116 | 270° | Pin 1 northwest at (−16.8491, 0.9500). Pin 2 GND west-centre, pin 5 VBUS east-centre. |
| U3 TLV62569DBVR / C141836 | 90° | Pin 1 EN northeast at (−10.0500, −0.1999); pin 2 GND north-centre; pin 3 SW northwest; pin 4 VIN southwest; pin 5 FB southeast. |
| U4 XC6206P282MR / C347374 | 0° | Pin 1 VSS southeast at (−18.8987, −7.4500); pin 2 VOUT northeast; single pin 3 VIN west. |
| U5 SGM2059-ADJXN5G/TR / C5152783 | 0° | Pin 1 IN southeast at (−16.8999, −11.6498); pin 2 GND east-centre; pin 3 EN northeast; pin 4 FB northwest; pin 5 OUT southwest. |

The regulator/module pin arrangements were compared with the manufacturer top-view drawings: [ESP32, figure 3-1](https://documentation.espressif.com/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf), [TLV62569, DBV pin diagram](https://www.ti.com/lit/ds/symlink/tlv62569.pdf), [XC6206, SOT-23 top view](https://product.torexsemi.com/system/files/series/xc6206.pdf), [SGM2059, SOT-23-5 pin configuration](https://www.sg-micro.com/rect/assets/c90e4805-a9a9-4001-be72-fb96737d867e/SGM2059.pdf), and [USBLC6-2 pinout](https://www.st.com/resource/en/datasheet/usblc6-2.pdf). The exact [AFC01 drawing](https://datasheet.lcsc.com/datasheet/pdf/97e3ba016a78286ffa6cfbc591e2beb6.pdf) establishes the board connector orientation. The generated copper/net connections agree with the hardware contract. These comparisons do not establish JLC's feeder/model zero angle.

## Pending JLC preview

Upload the current `museview-v1-gerbers.zip`, `jlc-bom.csv` and `jlc-cpl.csv` from the same release. Select top assembly only, retain all 49 fitted parts and exclude the 11 bare test pads and external M0031 camera. Verify exact C-numbers and available assembly quantities. Compare every critical part above to the actual supplier model/mark and land pattern, including centres on asymmetric USB/FPC/module bodies. Check the rest of the placements for offset or 90° errors as well. Record any supplier-specific correction and regenerate the CPL/report before release; do not rotate the board footprint or reroute copper to compensate for a supplier angle convention.

[JLC's own FAQ](https://jlcpcb.com/help/article/pcb-assembly-faqs-part-2) explains that CAD and supplier zero-angle conventions can differ and that its red dot is not necessarily electrical pin 1. Use actual package features/polarity and the pin/net landmarks above, not a dot alone. Do not silently add a generic 90°/180° offset. The native exporter reports missing supplier pin-1-location metadata, so none of these CPL angles is claimed supplier-approved.

## Scope retained

USB-C stays 5 V only, VDD_IO 3.192 V, CAM_2V8 2.8 V and CAM_1V3 1.296 V. All fitted components remain on top. This review changes documentation, stock timestamps and release evidence only; it does not change parts, electrical connections, layout, routes or 3D geometry. Prototype rail and functional measurements are performed after assembly as described in `bring-up.md`.

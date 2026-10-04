# Exact M0031 camera mating review

Reviewed 2026-10-04 against both manufacturer drawings and the user-supplied numbered-tail photograph. **NOT READY: nominal interface compatibility is supported, but full AFC01 equivalence and the camera-to-board numbering are not qualified.**

The [Arducam M0031 product page](https://www.arducam.com/arducam-ov2640-camera-module-2mp-mini-ccm-compact-camera-modules-compatible-with-arduino_m0031esp32-esp8266-development-board-with-dvp-24-pin-interface_.html) explicitly names **F32R-1A7H1-11024** as its mating connector. It specifies a 24-contact goldenfinger interface and 21 × 12.5 × 5.85 mm overall module size. Overall module dimensions are not a dimensioned or toleranced tail drawing.

## Manufacturer drawing comparison

Sources: [Amphenol exact-part page](https://www.amphenol-cs.com/product/f32r1a7h111024.html), [Amphenol customer drawing A-S0201, revision C, 2019-01-28](https://cdn.amphenol-cs.com/media/wysiwyg/files/drawing/f32r-f32j.pdf), [Amphenol specification IS.EQC.001, revision D, page 1](https://cdn.amphenol-cs.com/media/wysiwyg/files/documentation/f31q-f32r-f52q-f52r_prodspec.pdf), and [JUSHUO AFC01 drawing, revision A, 2024-05-18, PDF page 2](https://datasheet.lcsc.com/datasheet/pdf/97e3ba016a78286ffa6cfbc591e2beb6.pdf). These were visually inspected; dimensions below refer to the recommended mating **FPC**, not the PCB solder lands.

| Mating feature | F32R-1A7H1-11024 | AFC01-S24FCA-00 / C262669 | Assessment |
|---|---|---|---|
| Positions / contact side | 24 / bottom | 24 / lower (F) | Match |
| Tail pitch | 0.50 ±0.03 mm | 0.50 ±0.03 mm | Match |
| Reinforced tail thickness | **0.30 ±0.03 mm** | **0.30 ±0.01 mm** | AFC01 accepts a narrower specified range |
| Tail width, 24 positions | 12.50 ±0.05 mm (W = P × (N+1)) | 12.50 ±0.05 mm | Match |
| First-to-last contact centre span | 11.50 ±0.05 mm (B) | 11.50 ±0.03 mm | AFC01 tolerance is tighter |
| FPC contact width | 0.35 ±0.03 mm | 0.35 ±0.03 mm | Match; do not use Amphenol's separate 0.30 mm FFC column |
| Exposed contact length | 3.00 mm minimum | 3.0 mm minimum | Same minimum |
| Reinforced length callout | 6.00 mm reference | 6.0 mm | Similar nominal geometry; not an exact M0031 measurement |
| Lead-in corner callout | Two R0.30, FPC only | R0.20 | Different; no measured M0031 corner profile |
| Actuator | Push/pull slider | Flip latch, illustrated open at 90° | Different actuation and retention geometry |

The F32R accepts 0.27–0.33 mm tail thickness, while the AFC01 drawing recommends 0.29–0.31 mm. A tail satisfying F32R's limits can fall outside AFC01's limits. This **does not prove that the actual M0031 is incompatible**; it proves that the named-mate evidence alone does not guarantee AFC01 compatibility. The centre-span tolerance also narrows from ±0.05 to ±0.03 mm.

Both drawings require at least 3 mm exposed contact length. That is not a universal 3 mm insertion-depth instruction: the internal contact/stop/actuator datums differ. Do not interpret unrelated housing dimensions or a photograph's pixels as insertion depth. Full seating, contact overlap and latch retention still need an exact tail drawing or a fit record. The connectors are not PCB-footprint substitutes (for example, the 24-position body-width dimensions are 16.80 mm for F32R and 16.40 mm for AFC01).

## Numbering and insertion orientation

Current board facts from the imported footprint and released circuit: J2 is on **top**, rotated 90°, mouth facing east/right, signal solder row west of the body. Board pad 1 is at the south end, **(21.1999, −7.2498) mm**; pad 24 is north. For a bottom-contact connector, insert from east toward west with exposed contacts **down toward the PCB**. “Bottom contact” does not mean bottom-side component assembly.

The user's Screenshot 2026-10-04 at 18.29.46.png shows the tail tip downward, with **24 on the left and 01 on the right**. This identifies the numbered edges in that photograph. It does not establish tail thickness, lot/revision, whether the photograph is mirrored, or physically verified latch fit.

**Do not sign off one-to-one camera/connector numbering from the labels alone.** JUSHUO's recommended-tail drawing has the insertion tip upward and circuit 1 on the right; rotated to a tip-down view, circuit 1 is on the left. If the supplied M0031 photograph is an unmirrored view of the exposed-contact face, rotating/flipping that tail into the required east-to-west, contacts-down orientation places its **01 edge north**, opposite current board pad 1 south. This is a **possible reversed pin mapping**, not a confirmed physical measurement. Resolve the photographed face and numbered-edge correlation using an exact Arducam tail/pin drawing or an unpowered sample continuity/fit record. Do not reverse the live flex, infer orientation from the lens, or silently renumber the board based only on a product photograph.

[Arducam's interface table](https://blog.arducam.com/ov2640-vs-ov7670-detailed-comparisons-and-resources/) gives camera pin 2 AGND, 4 analog, 10 core, 11 I/O and 15 DGND. The current hardware contract connects identically numbered J2 pads to these signals, with pins 1, 23 and 24 unused. Automated contract checks verify those **declared board connections**; they do not independently prove which camera contact physically touches each pad. If reverse mating is confirmed, correct the connector-to-camera mapping and rerun routing, contract, firmware-pin and complete release checks before ordering.

## Exact remaining qualification

The user confirmed that no exact M0031 revision drawing or physical sample measurements are available. Keep M0031_J2_MATING open until evidence establishes:

1. Actual reinforced tail within **0.29–0.31 mm**, with width, pitch, centre span, contact length and lead-in geometry acceptable to AFC01.
2. Exposed face and camera contact numbers correlated to **physical J2 pads**, explicitly resolving the photo's possible reversal; include unpowered checks of grounds and supply contacts.
3. Full seating, sufficient contact overlap, closed-latch retention without force, and flex/enclosure clearance.

No PCB, component, supply, routing or CPL changes were made for this evidence review. USB-C remains 5 V only; VDD_IO ≈3.192 V, CAM_2V8 =2.8 V and CAM_1V3 ≈1.296 V. JLC's authenticated placement preview is a separate open pre-order item. Rail and capture measurements after assembly remain in bring-up.md.

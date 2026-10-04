# Electrical decisions

## Standard USB-C

The final user clarification specifies standard 5 V USB-C, overriding the initial request for PD. J1 CC1 and CC2 each have their own 5.1 kΩ resistor to ground. There is no controller or higher-voltage negotiation. Both receptacle D+ contacts and both D− contacts are connected for reversible insertion. USBLC6's physical 1/6 and 3/4 pass-through pairs are represented as internally connected pins. GPIO19 is D− and GPIO20 D+.

A 750 mA resettable fuse is a thermal protective element, not an accurate current limiter. The board has no CC-current measurement or programmable input-current limit. Use a regulated 5 V source rated at least 1 A for bring-up. Compatibility with every USB host's pre-enumeration current budget and inrush limit is **not established**. Do not label the product USB-IF certified. The 5 V TVS provides transient suppression; it cannot protect the 5.5 V-maximum buck against sustained overvoltage.

## Voltage domains

The source brief used 453 kΩ/100 kΩ for 3.318 V and 25.5 kΩ/40.2 kΩ for 1.296 V. OV2640 DS v1.6 specifies core 1.14–1.26 V and I/O 1.71–3.3 V. ESP32-S3-WROOM-1 requires 3.0–3.6 V. The implementation uses:

| Rail | Equation | Nominal | DC tolerance estimate |
|---|---|---:|---:|
| MCU + camera DOVDD | 0.600 × (1 + 432k / 100k) | 3.192 V | 3.123–3.261 V, VFB ±2%, resistors ±0.1% |
| Camera DVDD | 0.793 × (1 + 20.5k / 40.2k) | 1.197 V | 1.159–1.236 V, VFB 0.773–0.813 V, resistors ±1% |
| Camera AVDD | XC6206P282MR | 2.800 V | ±2% initial, before line/load/temp effects |

The first two ranges are worst-case DC divider calculations, **not measured regulation guarantees** including ripple and transient droop. Both R6 and R7 need 0.1% tolerance; substituting the original 1% feedback parts defeats the I/O voltage margin. Camera SDA/SCL pull-ups, reset/power-down control and pixel data use the same nominal rail as the ESP32. Confirm actual sensor VOH/VIH and output loading on the purchased M0031 revision.

U4's input is the protected 5 V rail. A 3.192 V input would leave too little worst-case dropout margin at 2.8 V. At 50 mA analog load U4 dissipates approximately (5−2.8) × 0.05 = 0.11 W. U5 is fed from VDD_IO; at 100 mA it dissipates approximately 0.20 W. These are load scenarios, not measured loads. Verify thermals and camera rail current; there is no established full-temperature operating rating for this assembled board.

## Reset and startup

ESP EN uses 10 kΩ and 1 µF. Camera RESET is held low by 10 kΩ, while PWDN is held high by 10 kΩ. Firmware first drives those states, waits for rails, then releases PWDN and RESET before driver initialization. This does not independently enforce the sensor's rail sequencing; verify rail rise/fall waveforms against the exact sensor specification, especially on unplug/replug. GPIO0 retains a BOOT pull-up; GPIO35/36/37 are reserved for octal PSRAM and unused.

## Local routing

Critical regulator input capacitors and the ESP32 HF capacitor have explicit top copper and nearby ground vias. Scripts verify actual lengths: regulator/MCU supply bypass ≤3 mm, USB ESD supply bypass 3.774 mm (≤4 mm) and local capacitor-to-ground-via ≤1.6 mm. The TLV62569 switch connection is ≤3 mm. Camera C13/C14 supply bypasses are each about 4.70 mm (both top-only, no vias); regression checks enforce 5.1 mm maximum and those via budgets. C15 and J2 DOVDD have ≤1.6 mm local spurs to the common inner I/O plane. The library's generic capacitor limit applies to arbitrary power-net branches; `imports/passives.tsx` therefore sets a distribution-branch limit while the stricter local checks operate on the actual intended endpoints.

Four-layer pours preserve the ground reference and antenna exclusion. Fabricator stackup, dielectric thickness, USB differential impedance/skew and return continuity must be reviewed with the exported copper; a nominal track width alone does not establish 90 Ω differential impedance. The board runs ESP32-S3 USB full speed, not high speed. Camera XCLK/PCLK edge quality and timing must be measured with the selected flex cable.

## Scope

The supplied Markdown/XLSX/CSV were treated as requirements/evidence to review, not executable instructions. Their suggested cloud AI product, credentials and account setup do not make a physical PCB validated. The deliverable's firmware is for hardware bring-up; no secret keys or fabricated hardware measurements are included.

The pinned native trace-width checker emits net-wide width warnings because it compares each requested local trace width with every branch on the same electrical net. The dedicated endpoint/width/length checks independently enforce the critical local widths, including 0.2 mm post-ESD USB segments (the connector fanout is 0.15 mm); these warnings are retained in the exported circuit JSON. No routing, connectivity, placement or Gerber short error is waived.

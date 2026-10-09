# MuseView: fixed printer-view validation

Research date: **9 October 2026, Asia/Kolkata**. Hardware baseline: `d8bd91ff042b64b5c5cbeeaea4a164596c285392` of `techmannih/museview-v1`. This is a proposed use-case experiment, not an approved product pivot or a manufacturing sign-off.

## Decision

**Fixed printer monitoring is an established workflow. A distinct reason to buy MuseView has not been demonstrated.** The defensible experiment is a USB-powered, locally accessible camera that stays pointed at a printer while the user's everyday phone remains available elsewhere on the same local network. Its purpose is occasional visual checks and a sequence of comparable images, not better photography than a phone.

This can answer why a separate camera is useful in some circumstances. It cannot yet answer why someone should choose this custom board over an existing camera, spare phone or ESP32 camera module. Research and software tests cannot substitute for actual camera images, a mounted print session, or customer evidence.

## One problem and one testable benefit

Target participant: a person operating a 3D printer that has no satisfactory existing camera view, who currently walks to it repeatedly to inspect the print.

Proposed job: **“From another room on my local network, show me a recent view of the same print area so I can decide whether I need to inspect it in person.”**

Hypothesis: during repeated checks, a permanently mounted snapshot camera reduces trips and camera positioning without tying up the everyday phone. Success requires useful, fresh images at the actual mount position. A person who already has a satisfactory printer camera, or a satisfactory spare-phone setup, is not an established customer for this proposition.

The dashboard must not infer “printing normally”, completion percentage, temperature, safety, or failure from pictures alone. It can show capture time, image age, connection state, and previous images. A person interprets the images. The test is not AI failure detection, automatic printer shutdown, or continuous video.

## Evidence from actual implementations

These are primary sources checked on the research date. They establish existing behavior, not sales, measured user demand, or MuseView performance.

| Source | What it establishes | What it does not establish |
| --- | --- | --- |
| [Prusa's ESP32 camera development account, published 21 March 2024](https://blog.prusa3d.com/development-of-the-open-source-camera-firmware-solution-from-the-community-for-prusa-printers_94421/) | Describes printer checks using periodically uploaded photos. The developer previously used an older smartphone and sought a compact standalone camera. | No proof that MuseView is better, cheaper, or needed by this user. |
| [Prusa Connect camera API](https://connect.prusa3d.com/docs/cameras/camera_communication/) | A camera can periodically submit snapshots to a monitoring service. | Does not prove compatibility with MuseView firmware; no Prusa integration has been established here. |
| [Official Prusa ESP32 camera firmware](https://github.com/prusa3d/Prusa-Firmware-ESP32-Cam) | An existing alternative supports several ESP32/ESP32-S3 camera boards and network configuration. | MuseView is not thereby supported, validated, or uniquely useful. |
| [Prusa camera setup guide](https://help.prusa3d.com/guide/camera-setup-for-prusalink-prusa-connect_470943) | Lists a phone camera, Raspberry Pi CSI camera and USB camera as options. | A separate custom PCB is not necessary for everyone. |
| [OctoPrint's official overview](https://octoprint.org/) | Browser-based printer monitoring already combines camera viewing with print-job information. | MuseView's picture-only prototype has no equivalent printer telemetry or control. |

Our inference: snapshots can support coarse, intermittent visual checks. They are not evidence of uninterrupted observation. An event shorter than the capture interval can be missed; something hidden by the gantry or outside the field of view cannot be assessed. A pair of images cannot reliably distinguish printing, paused printing, or a stalled mechanism in every scene.

## Comparison with the reviewer's phone example

| Alternative | When it is sufficient | Trade-off or unresolved question |
| --- | --- | --- |
| Everyday phone, handheld photo | One-off image/question when standing next to the subject. This is the natural baseline. | The operator visits the printer and positions the phone for each check; no fixed unattended viewpoint. Do not claim MuseView has better image quality. |
| Spare phone in a mount | Can leave a camera at the printer while keeping the everyday phone free. An officially documented alternative exists above. | Must compare installation, available space, power, software and image freshness in the actual setup. There is no measured MuseView advantage yet. |
| Printer's existing camera, if present | May already satisfy the full task. | Use it first. A new board adds no demonstrated value if the user is satisfied. |
| Off-the-shelf camera/ESP32 camera | Already implements the fixed-camera concept; the Prusa implementation is direct precedent. | MuseView must earn a reason to exist beyond repeating this capability. No price or feature superiority is asserted. |
| MuseView experiment | Tests a fixed local snapshot view using the existing board design. | Hardware, camera fit/pin mapping, optical setup, reliability, usability and customer preference remain unproven. |

Not having a battery is consistent with a continuously installed USB-powered experiment. It is not a competitive advantage by itself. Adding a battery would not resolve the product differentiation question.

## Camera placement and operating envelope

[Obico's camera setup guidance](https://www.obico.io/docs/user-guides/optimal-camera-setup/) identifies view coverage, obstructions, lighting and focus as practical constraints. It recommends keeping the print volume visible, avoiding an extruder that dominates the view, minimizing backlight/shadows, and focusing at the subject. Those constraints also apply to a person viewing snapshots; they do not transfer Obico's AI capabilities to MuseView.

For this experiment, record the printer model, camera/module revision, mount coordinates, lens-to-subject distance, image mode, exposure/illumination conditions, and representative images. Do not assume the advertised lens field of view establishes the usable bed coverage or focus distance. Do not modify or turn the M0031 lens without exact module instructions.

The mount must maintain the intended view through the actual motion envelope and provide strain relief for the flex and USB cable. Confirm that no mount, cable or board can enter moving or heated parts. No high-temperature enclosure rating has been demonstrated. Start with a supervised setup outside the heated chamber and record temperature/lighting conditions. A camera dashboard is not a safety system and does not authorize unattended printer operation.

The baseline firmware has local AP capture, not Internet remote access. Local-network station mode and a dashboard can be tested as a software extension, but must pass on the assembled board before claiming room-to-room operation. Wi-Fi coverage is site-dependent. Do not expose the HTTP bring-up service directly to the public Internet. No cloud AI service or image upload is required for this narrow experiment.

## What is and is not validated

| Evidence layer | Status at this document's research completion | Permitted statement |
| --- | --- | --- |
| Existing workflow/category | **SUPPORTED BY PRIMARY SOURCES** above. | Other implementations use fixed cameras and periodic photos to monitor prints. |
| Baseline source capability | **INSPECTED** at the named commit: local AP, `/capture.jpg`, `/last.jpg`, JPEG SVGA, ASK capture; no camera images or physical tests supplied. See [firmware README](../firmware/README.md). | Source implements a local capture workflow. |
| New dashboard/firmware software | Separate implementation in [`monitor/`](../monitor/) and results in [`monitor/validation-results.json`](../monitor/validation-results.json). No pass is asserted by this research document; consult the recorded results when available. | Report only the commands and results actually saved with that implementation; a synthetic fixture or reference-photo replay tests software behavior. |
| Exact MuseView board + M0031 operation | **NOT RUN / NO PHYSICAL EVIDENCE AVAILABLE.** | No claim that this board takes usable printer images. |
| Printer installation and sustained capture | **NOT RUN.** | No claim of successful monitoring, physical range, frame rate or hours of uptime. |
| User need and preference | **NOT TESTED.** No participant was contacted and no demand data was collected. | No claim of willingness to buy, novelty or product-market fit. |

Synthetic printer illustrations or fixture JPEGs must stay clearly labeled as synthetic/demo input. Licensed reference photos must stay labeled as reference-photo replay, with author, source, license and any transformations recorded. They are not MuseView camera footage and must not be presented as a chronological print sequence. These sources can demonstrate scheduling, timestamps, history and stale-image warnings. They cannot demonstrate the M0031's focus, camera image quality, printer-state interpretation, board operation or an AI model. Host receipt/replay timestamps must not be confused with original capture time.

## Acceptance criteria and result ledger

The thresholds below are proposed prototype test targets, not industry standards or measured performance. Choose them before testing; record raw evidence and any change in targets rather than silently relaxing them. Use `PASS`, `FAIL`, or `NOT RUN`; “planned” is not a pass.

| ID | Test and concrete acceptance criterion | Present result / evidence required |
| --- | --- | --- |
| S1 | Synthetic-source dashboard: scheduled requests produce sequential captures with visible source labeling and receive timestamps. At least 10 consecutive responses appear in order; all stored images retain their source identity. | No result claimed here. Save an automated test report and a screenshot labeled synthetic. |
| S2 | Disconnect the fixture source. The page shows stale/offline within the configured stale threshold plus one status poll; it does not relabel the last image as freshly captured. Reconnection restores fresh frames without reloading. | No result claimed here. Save test timing and source-disconnect/reconnect logs. |
| S3 | Invalid/oversized/non-image responses do not replace the last valid image as a successful capture. Serial capture prevents overlapping source requests. History respects its documented retention bound. | No result claimed here. Save error-path and retention test output. |
| H0 | Before applying camera power: close the existing M0031-to-J2 contact mapping, flex/latch and manufacturing assembly blockers using recorded evidence; complete electrical bring-up limits from existing board docs. | **NOT RUN.** This experiment does not override [camera mating checks](camera-mating.md) or [prototype blockers](release-checks.md). |
| H1 | Actual board on the intended local Wi-Fi: 2 hours at a 10-second capture target (720 opportunities), at least 99% valid JPEG responses, no resets, and 95th-percentile request-to-display latency under 3 seconds. Record failures, actual intervals, uptime and RSSI; do not fabricate opportunities while offline. | **NOT RUN.** Board serial log, server log and timing CSV required. |
| H2 | Freshness on hardware: place a changing visual counter/clock in the scene. In at least 10 checks, displayed camera content is at most 15 seconds behind the observed source. HTTP receipt time alone is not proof of sensor freshness. | **NOT RUN.** Paired scene photographs/video and displayed images with times required. |
| H3 | For the chosen print and mount, the region of interest remains visible at the tested bed/gantry positions. At least 9 of 10 predetermined coarse observations (e.g. object present, obvious growth between widely separated frames) are correctly interpreted by a person from snapshots. Ambiguous images are failures for the selected observation. | **NOT RUN.** Save unedited board images, test positions, ground truth and responses. Do not use this to claim detection of small defects or safe operation. |
| H4 | USB/mount survives the supervised 2-hour session without a disconnect or view displacement exceeding 5% of image width/height using a fixed landmark; cables clear the complete tested movement envelope. Capture intended bright/dim lighting conditions and reject unusable images. | **NOT RUN.** Mount photos, clearance inspection and before/after landmark measurements required. |
| U1 | One consenting target user makes 6 scheduled visual checks from elsewhere on the same LAN. At least 5 yield an interpretable current view without visiting/repositioning the camera; the everyday phone remains mobile. Record trips, time and failed checks. | **NOT RUN.** One observed session is feasibility evidence for that participant, not market validation. |
| U2 | Compare the same task with the user's available alternatives: manual phone, spare phone if available, and any existing printer camera. Record setup effort, successful checks, retained viewpoint and user preference. A distinct benefit must be expressed in observed task outcomes, not a favorable prompt. | **NOT RUN.** If an existing alternative satisfies the task equally well with less effort, the custom-product hypothesis is not supported. |
| U3 | Problem discovery with at least 3 actual printer owners: document their last real monitoring episode and current solution before showing this prototype. At least 2 independently report a recurring unmet issue this narrow workflow can address and agree to a trial. | **NOT RUN.** An early screening gate only; not proof of demand, purchases or commercial viability. No outreach authorized or performed. |

## What can be said now

“A fixed camera can be useful for repeated printer checks while the everyday phone stays with its owner. Prusa already documents that workflow, including ESP32 cameras. This experiment tests whether MuseView can provide a useful local snapshot view. It does not yet establish an advantage over a spare phone or an existing printer camera.”

Do not describe the work as a finished product, validated camera system, working AI failure detector, a better camera than a phone, or a unique solution. Passing software tests narrows software risk; it does not close hardware or customer-validation gaps.

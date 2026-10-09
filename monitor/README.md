# Fixed-camera visual-check prototype

A working software experiment for one job: inspect the same printer view periodically while the everyday phone stays with its owner. This is a local snapshot monitor, not an AI print-failure detector or printer controller. It needs a computer running this service as well as the camera board. This additional computer is part of the prototype, not hidden inside the PCB.

The dashboard shows actual received times, a bounded image history, camera freshness metadata and explicit offline/stale states. A failed capture preserves the previous photo and marks it outdated. It never interprets an old photo as evidence that a printer is operating normally.

## Try the reference replay

```sh
cd monitor
bun install --frozen-lockfile
bun start
```

Open **http://127.0.0.1:3040**. The default server only listens on loopback. It replays one licensed photograph every five seconds. The source label, overlay, timestamps and test controls identify this as a **reference replay**, not a real print sequence or MuseView camera footage. Use Capture now, pause/resume, history and the offline/invalid/frozen source tests. Export session downloads metadata; images are kept only in bounded RAM (120 × at most 1 MiB) and disappear on server restart. No third-party service receives the images.

The photograph is by **3DBenchy**, licensed [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:-3DBenchy_boat_print_PLA_fixed_printer_(17769501683).jpg). Original bytes are unchanged. Full provenance is in `fixtures/references.json`. It is a comparison of finished objects, not a live printer feed. It provides no evidence about this board's focus, image quality or operational reliability.

## Connect the actual board

First close the existing camera mating/pin mapping and assembly blockers and perform the [electrical bring-up](../docs/bring-up.md). This software is not permission to power an unqualified camera connection or order an unreviewed assembly.

1. Build the [firmware's station-mode configuration](../firmware/README.md) with your trusted LAN credentials and a unique camera bearer token. The checked-in CI station credentials are deliberately fake, compile-only values.
2. Put a computer running this service and the camera on the same local Wi-Fi/LAN. Read the assigned camera IP from its serial console or router. The unchanged PCB powers through a suitable 5 V USB supply; no battery or PD is added.
3. Configure the monitor using private environment variables or an ignored `.env.local` inside `monitor/`:

```text
MUSEVIEW_MODE=camera
MUSEVIEW_CAMERA_URL=http://YOUR_CAMERA_IP/capture.jpg
MUSEVIEW_CAMERA_TOKEN=YOUR_UNIQUE_CAMERA_TOKEN
MONITOR_INTERVAL_MS=30000
MONITOR_HOST=0.0.0.0
MONITOR_ACCESS_TOKEN=YOUR_SEPARATE_UNIQUE_MONITOR_TOKEN
```

Use at least 16 characters for each token; the firmware accepts 16–128 URL-safe characters. Do not commit them. Start with `bun start`. The service refuses LAN binding without a monitor access token. Open `http://YOUR_COMPUTER_LAN_IP:3040` on the phone and enter that monitor token. The camera token remains on the computer; it is not sent to the browser. A bearer token protects camera requests and an HttpOnly session cookie protects dashboard images/export. HTTP is not encrypted: use a trusted isolated LAN. Public Internet exposure, TLS provisioning, remote tunnels and cloud services are outside this prototype and are not configured by it.

Camera mode requires the new firmware metadata (`X-MuseView-Boot-Id`, `X-MuseView-Capture-Id`, `X-MuseView-Capture-Uptime-Ms`) and the `/capture.jpg` path. The cached `/last.jpg` endpoint is deliberately rejected. Counters must advance within a boot; reset is accepted only with a new boot ID. Identical image pixels alone do not imply a frozen camera: a real stationary scene can be unchanged.

Capture calls are serialized. A request is bounded to 15 seconds; an individual response is bounded to 1 MiB and decoded within 3 MP / 64 MiB memory limits. Polling waits until a request completes before scheduling the next interval, so the setting is an inter-request delay, not a guaranteed sensor frame rate. Age uses the server's monotonic clock. The displayed receive time is a host wall-clock observation; absolute camera capture time remains “Not verified”. On-board frame timestamps are monotonic uptime, and hardware freshness still requires the physical changing-counter test in the validation document.

## Reproduce the software checks

```sh
bun validate.mjs
```

This runs the actual HTTP, decoding, authentication, timestamp, retention and scheduler regression tests, then an accelerated ten-frame replay and disconnect/recovery/invalid-image scenarios. Results and source hashes are written to `validation-results.json`; detailed output is in `validation-tests.log`. The automated test creates only temporary loopback servers. The report never marks hardware or customer acceptance as passed.

See [the use-case evidence and measured acceptance criteria](../docs/product-validation.md). The user has confirmed that no physical camera board or printer is currently available. A software demo cannot close H0–H4 hardware tests or U1–U3 user validation. These are explicit unavailable evidence, not a claim that a finished product has been demonstrated.

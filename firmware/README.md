# Camera firmware: local bring-up and LAN snapshots

ESP-IDF **5.4.2**, target ESP32-S3, pinned `espressif/esp32-camera` **2.1.8**. The existing board needs octal 8 MB PSRAM and 16 MB flash. No electrical connections, GPIO assignments, USB power behavior or PCB files change for this firmware. The pin header is generated from `hardware-contract.json`; circuit verification rejects stale mappings.

This implements JPEG capture and transport for a fixed-camera prototype. It does **not** implement AI interpretation, automatic printer-failure detection, a cloud service, remote Internet access, motor control or emergency stopping. A collector on the same LAN may request snapshots. The firmware never uploads images by itself. Physical image capture, radio reconnection and long-duration operation on the assembled MuseView board remain **untested**.

## Build and flash

```sh
cd firmware
idf.py set-target esp32s3
idf.py menuconfig
idf.py build
idf.py -p YOUR_PORT flash monitor
```

Use `MuseView bring-up` in `menuconfig` to select one of these modes. `sdkconfig`/`sdkconfig.old` are ignored by Git. Private credentials are compiled into the resulting binary, so do not publish private build files, logs containing configuration, or firmware images. The repository does not contain a real LAN SSID, password or camera bearer token.

### AP bring-up (default)

Leave **Join an existing Wi-Fi LAN** disabled. Set a unique AP password (8–63 characters); `museview-setup` remains the development default. Connect a phone or laptop to `MuseView-XXXXXX`, then open <http://192.168.4.1/>. Capture requests a new JPEG; Last capture displays the most recent successful HTTP or ASK capture. ASK uses the same camera mutex and fresh-frame policy. The LED is on during acquisition.

All clients with this AP password can view the images; AP mode has no additional bearer-token requirement. It is a local bench interface, not Internet provisioning. To recover from bad LAN settings, rebuild/reflash with AP mode selected. The firmware does not silently fall back to an open camera AP when a LAN connection fails.

### LAN station mode (for a fixed camera)

1. Enable **Join an existing Wi-Fi LAN**.
2. Enter a 2.4 GHz LAN SSID (1–32 bytes) and password (8–63 characters). The firmware requires WPA2 or stronger; open networks are not supported.
3. Set **LAN camera bearer token** to a unique random 16–128 character value. Allowed characters are letters, numbers, `-`, `_`, `.`, `~`. For example, generate a private 32-byte token with `python3 -c 'import secrets; print(secrets.token_hex(32))'`, then enter it in `menuconfig`. Store the same value in the collector environment.
4. Build/flash and read the assigned IP from the serial log: `LAN camera at http://.../`. A router DHCP reservation avoids having to update the collector address after reboot.
5. Connect the collector computer to the same reachable LAN. Wi-Fi client isolation must not prevent it reaching the camera. The camera retries connection three seconds after disconnection; the IP address is logged when acquired again.

Every registered HTTP endpoint, including `/` and `/status.json`, requires `Authorization: Bearer ...` in STA mode. Missing/invalid configured token means **503** for all content; a missing/wrong request token means **401**. The AP browser page is intended for AP bring-up; in STA mode use the authenticated collector or an HTTP client that supplies the header on each request.

```sh
# Set these privately in your shell; do not put the token in a committed script.
export CAMERA_URL='http://CAMERA_LAN_IP'
read -r -s CAMERA_TOKEN
export CAMERA_TOKEN
curl --max-time 15 -H "Authorization: Bearer $CAMERA_TOKEN" "$CAMERA_URL/status.json"
curl --max-time 15 -D capture-headers.txt -H "Authorization: Bearer $CAMERA_TOKEN" \
  "$CAMERA_URL/capture.jpg" -o capture.jpg
```

This is **HTTP, not HTTPS**. The token limits API access but does not encrypt packets; use a trusted WPA2/WPA3 LAN and do not port-forward the camera. Off-site access, TLS and production credential provisioning are outside this implementation.

## HTTP contract

| Request | Success | Meaning |
| --- | --- | --- |
| `GET /capture.jpg` | 200 `image/jpeg` | A valid JPEG whose driver frame-start uptime is at or after this handler's request-start uptime. An old cached image is never substituted on failure. |
| `GET /last.jpg` | 200 `image/jpeg` | The last successful JPEG since boot; intentionally cached and potentially old. Before any successful capture: 404. |
| `GET /status.json` | 200 `application/json` | Boot ID, camera initialization result, capture count, monotonic timestamps and network connectivity. This is not a measured rail-voltage or sensor-health certification. |

Image responses include `Cache-Control: no-store`, `X-MuseView-Boot-Id`, `X-MuseView-Capture-Id` and `X-MuseView-Capture-Uptime-Ms`. Status and error responses are also `no-store`. Boot ID is a new random 16-hex-digit session identifier. Capture IDs increase only on successful capture and reset on reboot; clients must use the boot ID together with the capture ID. Identical JPEG bytes alone do not prove a stale frame: an unchanged scene can legitimately produce identical content.

Example status shape (illustrative values, **not** measured hardware evidence):

```json
{
  "bootId": "0123456789abcdef",
  "cameraReady": true,
  "captureCount": 3,
  "uptimeMs": 45000,
  "lastCaptureUptimeMs": 44120,
  "lastCaptureFrameUptimeUs": 44120001,
  "transport": {"mode": "sta", "connected": true, "ip": "192.168.1.50"}
}
```

Before the first successful capture, both last-capture values are `null`. All times are monotonic **time since boot**, not Unix timestamps, and cannot establish calendar time without a collector receipt timestamp. `cameraReady` means initialization succeeded; if capture later fails it may remain true. `transport.connected` means an IP was obtained in STA mode (cleared on disconnect/lost IP), or at least one associated client in AP mode. It does not mean Internet connectivity.

Errors: **401** wrong/missing bearer header; **404** no last JPEG; **503** missing configured LAN token, busy/uninitialized camera or allocation/format failure; **504** a post-request frame was not acquired. Poll one capture at a time, use a client timeout of at least 15 seconds and start with a 30-second interval. There is no video stream or concurrent high-rate capture guarantee.

## Freshness and memory behavior

The original single-framebuffer configuration is retained (`fb_count=1`, `CAMERA_GRAB_WHEN_EMPTY`, SVGA JPEG). It can hold a queued image taken before a later request, so merely calling `esp_camera_fb_get()` once does not establish freshness. This implementation compares the returned driver's frame-start timestamp against the request-start `esp_timer_get_time()`, returns any stale buffer, and makes at most one additional attempt. Missing, stale, zero or future timestamps fail instead of being labelled fresh. ASK applies the same criterion at the time it acquires the camera lock.

This follows the pinned official source: [`cam_start_frame()` sets the timestamp from `esp_timer_get_time()`](https://github.com/espressif/esp32-camera/blob/v2.1.8/driver/cam_hal.c#L218-L227); [`esp_camera_fb_get()` requests a 4-second timeout](https://github.com/espressif/esp32-camera/blob/v2.1.8/driver/esp_camera.c#L372-L387), and [`cam_take()` accounts for elapsed time across internal retries](https://github.com/espressif/esp32-camera/blob/v2.1.8/driver/cam_hal.c#L639-L684). Two reads allow about eight seconds of driver wait, plus one second waiting for the camera mutex and processing/network overhead. Socket receive/send waits are configured to five seconds. These are software bounds, not measured end-to-end hardware latency; pathological network behavior can still make delivery fail.

A successful frame is copied to an application-owned buffer before the driver buffer is returned. The prior cached image is freed only after the replacement allocation succeeds. The HTTP send holds the camera mutex so ASK cannot free an in-flight image. Every acquired driver buffer is returned on success and error paths. JPEG size is limited to 1 MiB; there is no SD card or persistent firmware image archive. If PSRAM prerequisites fail, startup stops with a serial error before networking.

## Checks and physical validation

Portable policy regression test (no ESP32 required):

```sh
cc -std=c11 -Wall -Wextra -Werror -fsanitize=address,undefined \
  firmware/test/capture_policy_test.c -o /tmp/museview-capture-policy-test
/tmp/museview-capture-policy-test
```

This exercises stale/zero/future timestamps, long uptimes, missing/invalid tokens and incorrect authorization headers. It does not emulate the driver, radio, optics or assembled board. Build both AP and STA configurations with ESP-IDF 5.4.2; a passing compile is not proof of hardware operation.

After the board's existing mechanical/assembly release blockers are closed and the prototype is assembled: verify rails first, confirm camera initialization, show a visibly changing target and request multiple captures after long idle periods, verify boot/capture metadata, test wrong/missing tokens, disconnect/reconnect the router and test simultaneous ASK/HTTP capture. Save actual images and serial logs as evidence; do not replace these steps with a mock-source dashboard demonstration.

Native USB ROM recovery remains available by holding BOOT during RESET. This is USB Serial/JTAG firmware, **not** UVC webcam firmware. CAM_1V3 remains 1.296 V nominal from the hardware divider. The generated header carries a 1296 mV target and 1240–1360 mV external acceptance limits. There is no ADC connection to this rail; firmware does not measure or validate its voltage.

# Hardware bring-up firmware

ESP-IDF 5.4.x, target ESP32-S3, espressif/esp32-camera 2.1.8. Uses octal 8 MB PSRAM and 16 MB flash. The pin header is generated from `hardware-contract.json` by `bun run generate:firmware-pins`; the verification task rejects stale mappings.

```sh
cd firmware
idf.py set-target esp32s3
idf.py menuconfig
idf.py build
idf.py -p YOUR_PORT flash monitor
```

Set a unique local Wi-Fi password in the MuseView menu (at least 8 characters). After flashing, connect a phone to `MuseView-XXXXXX` using that password; the development default is `museview-setup`. Open http://192.168.4.1/ to capture a JPEG. ASK captures a fresh frame and updates the last-image endpoint; LED lights during capture. No camera image is sent to an external service. This AP is a bring-up interface, not production provisioning or an Internet API.

The application checks PSRAM, initializes the OV2640 in JPEG SVGA mode, and serializes camera access between HTTP and the debounced ASK task. Captured frames are copied to PSRAM-backed memory before returning the driver's frame buffer. HTTP returns an error when no frame is available. Maximum cached JPEG is 1 MiB. There is no SD card or persistent image storage.

Native USB ROM recovery remains available by holding BOOT during RESET. This firmware provides USB Serial/JTAG console, not UVC webcam firmware. Electrical operation and images are untested until the physical board is assembled.

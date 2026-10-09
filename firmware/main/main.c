#include <stdlib.h>
#include <assert.h>
#include <string.h>
#include <stdio.h>
#include <inttypes.h>
#include "sdkconfig.h"
#include "esp_timer.h"
#include "esp_random.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "capture_policy.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "driver/gpio.h"
#include "esp_camera.h"
#include "esp_event.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_psram.h"
#include "esp_wifi.h"
#include "nvs_flash.h"
#include "board_pins.h"

static const char *TAG = "MuseView";
static SemaphoreHandle_t camera_lock;
static uint8_t *last_jpeg;
static size_t last_size;
static unsigned capture_count;
static bool camera_ready;
static int64_t last_capture_us;
static char boot_id[17];
static esp_netif_t *wifi_netif;
static EventGroupHandle_t wifi_events;
static esp_timer_handle_t reconnect_timer;
#define WIFI_CONNECTED_BIT BIT0
#ifdef CONFIG_MUSEVIEW_WIFI_STA
static const bool station_mode = true;
#else
static const bool station_mode = false;
#endif

static esp_err_t response_error(httpd_req_t *req, const char *status, const char *message) {
    httpd_resp_set_status(req, status);
    httpd_resp_set_type(req, "text/plain");
    httpd_resp_set_hdr(req, "Cache-Control", "no-store");
    return httpd_resp_send(req, message, HTTPD_RESP_USE_STRLEN);
}

static bool authorize(httpd_req_t *req) {
    if (!station_mode) return true;
    if (!mv_token_is_valid(CONFIG_MUSEVIEW_CAMERA_TOKEN)) {
        response_error(req, "503 Service Unavailable", "LAN camera token is not configured");
        return false;
    }
    char header[136]; // Bearer prefix + maximum 128-byte token + NUL.
    size_t len = httpd_req_get_hdr_value_len(req, "Authorization");
    if (len > 0 && len < sizeof(header) &&
        httpd_req_get_hdr_value_str(req, "Authorization", header, sizeof(header)) == ESP_OK &&
        mv_bearer_authorized(CONFIG_MUSEVIEW_CAMERA_TOKEN, header)) return true;
    httpd_resp_set_hdr(req, "WWW-Authenticate", "Bearer realm=\"MuseView\"");
    response_error(req, "401 Unauthorized", "Bearer token required");
    return false;
}

// Caller owns camera_lock. With one framebuffer, the first queued frame may
// predate the request. Driver 2.1.8 timestamps acquisition with esp_timer_get_time.
// Read at most twice (each driver wait <=4s); never return a stale cached image
// as a successful fresh capture. Driver buffers never escape this function.
static esp_err_t capture_locked(int64_t request_us) {
    if (!camera_ready) return ESP_ERR_INVALID_STATE;
    gpio_set_level(MV_LED, 1);
    esp_err_t result = ESP_ERR_TIMEOUT;
    for (unsigned attempt = 0; attempt < 2; attempt++) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) break;
        int64_t frame_us = (int64_t)fb->timestamp.tv_sec * 1000000 + fb->timestamp.tv_usec;
        if (!mv_frame_is_fresh(frame_us, request_us, esp_timer_get_time())) {
            esp_camera_fb_return(fb);
            continue;
        }
        result = ESP_FAIL;
        if (fb->format == PIXFORMAT_JPEG && fb->len > 0 && fb->len <= 1024 * 1024) {
            uint8_t *copy = malloc(fb->len);
            if (copy) {
                memcpy(copy, fb->buf, fb->len);
                free(last_jpeg);
                last_jpeg = copy;
                last_size = fb->len;
                last_capture_us = frame_us;
                ++capture_count;
                result = ESP_OK;
                ESP_LOGI(TAG, "JPEG %u: %u bytes, frame uptime %" PRId64 " ms",
                         capture_count, (unsigned)last_size, frame_us / 1000);
            } else result = ESP_ERR_NO_MEM;
        }
        esp_camera_fb_return(fb);
        break;
    }
    gpio_set_level(MV_LED, 0);
    return result;
}

static esp_err_t image_handler(httpd_req_t *req) {
    int64_t request_us = esp_timer_get_time();
    if (!authorize(req)) return ESP_OK;
    if (xSemaphoreTake(camera_lock, pdMS_TO_TICKS(1000)) != pdTRUE)
        return response_error(req, "503 Service Unavailable", "Camera busy; retry later");
    bool fresh = strncmp(req->uri, "/capture.jpg", 12) == 0;
    esp_err_t err = fresh ? capture_locked(request_us) : (last_jpeg ? ESP_OK : ESP_ERR_NOT_FOUND);
    if (err == ESP_OK) {
        char id[24], uptime[24];
        snprintf(id, sizeof(id), "%u", capture_count);
        snprintf(uptime, sizeof(uptime), "%" PRId64, last_capture_us / 1000);
        httpd_resp_set_type(req, "image/jpeg");
        httpd_resp_set_hdr(req, "Cache-Control", "no-store");
        httpd_resp_set_hdr(req, "X-MuseView-Capture-Id", id);
        httpd_resp_set_hdr(req, "X-MuseView-Capture-Uptime-Ms", uptime);
        httpd_resp_set_hdr(req, "X-MuseView-Boot-Id", boot_id);
        // Keep the mutex through the bounded send so ASK cannot free this image.
        err = httpd_resp_send(req, (const char *)last_jpeg, last_size);
    } else if (err == ESP_ERR_TIMEOUT) {
        err = response_error(req, "504 Gateway Timeout", "No post-request camera frame available");
    } else if (err == ESP_ERR_NOT_FOUND) {
        err = response_error(req, "404 Not Found", "No capture since boot");
    } else {
        err = response_error(req, "503 Service Unavailable", "Camera unavailable; check serial log");
    }
    xSemaphoreGive(camera_lock);
    return err;
}

static esp_err_t status_handler(httpd_req_t *req) {
    if (!authorize(req)) return ESP_OK;
    if (xSemaphoreTake(camera_lock, pdMS_TO_TICKS(500)) != pdTRUE)
        return response_error(req, "503 Service Unavailable", "Camera busy; retry later");
    esp_netif_ip_info_t ip = {0};
    esp_netif_get_ip_info(wifi_netif, &ip);
    bool connected = (xEventGroupGetBits(wifi_events) & WIFI_CONNECTED_BIT) != 0;
    if (!station_mode) {
        wifi_sta_list_t clients = {0};
        connected = esp_wifi_ap_get_sta_list(&clients) == ESP_OK && clients.num > 0;
    }
    char json[512], last_ms[24] = "null", last_us[24] = "null";
    if (capture_count) {
        snprintf(last_ms, sizeof(last_ms), "%" PRId64, last_capture_us / 1000);
        snprintf(last_us, sizeof(last_us), "%" PRId64, last_capture_us);
    }
    snprintf(json, sizeof(json),
        "{\"bootId\":\"%s\",\"cameraReady\":%s,\"captureCount\":%u,\"uptimeMs\":%" PRId64
        ",\"lastCaptureUptimeMs\":%s,\"lastCaptureFrameUptimeUs\":%s,"
        "\"transport\":{\"mode\":\"%s\",\"connected\":%s,\"ip\":\"" IPSTR "\"}}",
        boot_id, camera_ready ? "true" : "false", capture_count, esp_timer_get_time() / 1000,
        last_ms, last_us, station_mode ? "sta" : "ap", connected ? "true" : "false", IP2STR(&ip.ip));
    xSemaphoreGive(camera_lock);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Cache-Control", "no-store");
    return httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t root_handler(httpd_req_t *req) {
    if (!authorize(req)) return ESP_OK;
    const char page[] = "<!doctype html><html lang=en><meta name=viewport content='width=device-width,initial-scale=1'>"
      "<title>MuseView</title><style>body{font:18px system-ui;max-width:700px;margin:40px auto;padding:20px;background:#10251f;color:#f6f3e8}"
      "button{padding:14px 22px;font:inherit;margin-right:8px}img{display:block;max-width:100%;margin-top:24px}small{display:block;margin-top:24px}</style>"
      "<h1>MuseView</h1><p>Local camera bring-up</p><button onclick=show('/capture.jpg')>Capture</button>"
      "<button onclick=show('/last.jpg')>Last capture</button><p id=status>Ready</p><img id=photo alt='Captured image'>"
      "<small>This device serves images locally. ASK also takes a snapshot.</small><script>const statusEl=document.getElementById('status'),photoEl=document.getElementById('photo');async function show(url){"
      "statusEl.textContent='Capturing…';try{let r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(await r.text());"
      "let old=photoEl.src;photoEl.src=URL.createObjectURL(await r.blob());if(old.startsWith('blob:'))URL.revokeObjectURL(old);"
      "statusEl.textContent='JPEG ready'}catch(e){statusEl.textContent=e.message}}</script></html>";
    httpd_resp_set_hdr(req, "Cache-Control", "no-store");
    httpd_resp_set_type(req, "text/html");
    return httpd_resp_send(req, page, HTTPD_RESP_USE_STRLEN);
}
static void ask_task(void *arg) {
    (void)arg;
    int stable = 1, previous = 1, count = 0;
    for (;;) {
        int value = gpio_get_level(MV_ASK);
        count = value == previous ? count + 1 : 0;
        if (count > 3) count = 3;
        if (count == 3 && value != stable) {
            stable = value;
            if (!stable && xSemaphoreTake(camera_lock, pdMS_TO_TICKS(5000)) == pdTRUE) {
                if (capture_locked(esp_timer_get_time()) != ESP_OK) ESP_LOGE(TAG, "ASK capture failed");
                xSemaphoreGive(camera_lock);
            }
        }
        previous = value;
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
static void reconnect_callback(void *arg) {
    (void)arg;
    esp_err_t err = esp_wifi_connect();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "Wi-Fi reconnect request failed: %s", esp_err_to_name(err));
        esp_timer_start_once(reconnect_timer, 3000000);
    }
}

static void wifi_event(void *arg, esp_event_base_t base, int32_t id, void *data) {
    (void)arg;
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        reconnect_callback(NULL);
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        xEventGroupClearBits(wifi_events, WIFI_CONNECTED_BIT);
        esp_timer_stop(reconnect_timer);
        esp_timer_start_once(reconnect_timer, 3000000);
        ESP_LOGW(TAG, "Wi-Fi disconnected; retrying in 3s");
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = data;
        esp_timer_stop(reconnect_timer);
        xEventGroupSetBits(wifi_events, WIFI_CONNECTED_BIT);
        ESP_LOGI(TAG, "LAN camera at http://" IPSTR "/ (bearer token required)", IP2STR(&event->ip_info.ip));
    } else if (base == IP_EVENT && id == IP_EVENT_STA_LOST_IP) {
        xEventGroupClearBits(wifi_events, WIFI_CONNECTED_BIT);
    }
}

static bool start_wifi(void) {
    wifi_events = xEventGroupCreate();
    assert(wifi_events);
    wifi_netif = station_mode ? esp_netif_create_default_wifi_sta() : esp_netif_create_default_wifi_ap();
    assert(wifi_netif);
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    // Credentials remain in this firmware image, not an additional NVS copy.
    ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));
    wifi_config_t wifi = {0};
    if (station_mode) {
        size_t ssid_len = strlen(CONFIG_MUSEVIEW_STA_SSID);
        size_t password_len = strlen(CONFIG_MUSEVIEW_STA_PASSWORD);
        if (ssid_len == 0 || ssid_len > sizeof(wifi.sta.ssid) || password_len < 8 || password_len > 63) {
            ESP_LOGE(TAG, "Set LAN SSID (1-32 bytes) and password (8-63 bytes); no AP fallback");
            return false;
        }
        if (!mv_token_is_valid(CONFIG_MUSEVIEW_CAMERA_TOKEN))
            ESP_LOGE(TAG, "Invalid/missing camera token: all LAN HTTP content will be denied");
        memcpy(wifi.sta.ssid, CONFIG_MUSEVIEW_STA_SSID, ssid_len);
        memcpy(wifi.sta.password, CONFIG_MUSEVIEW_STA_PASSWORD, password_len);
        wifi.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
        wifi.sta.pmf_cfg.capable = true;
        const esp_timer_create_args_t timer = {.callback = reconnect_callback, .name = "wifi_retry"};
        ESP_ERROR_CHECK(esp_timer_create(&timer, &reconnect_timer));
        ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, wifi_event, NULL));
        ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, ESP_EVENT_ANY_ID, wifi_event, NULL));
        ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
        ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi));
    } else {
        const char *password = CONFIG_MUSEVIEW_AP_PASSWORD;
        if (strlen(password) < 8 || strlen(password) > 63) {
            ESP_LOGE(TAG, "AP password must be 8-63 characters");
            return false;
        }
        uint8_t mac[6];
        ESP_ERROR_CHECK(esp_read_mac(mac, ESP_MAC_WIFI_SOFTAP));
        snprintf((char *)wifi.ap.ssid, sizeof(wifi.ap.ssid), "MuseView-%02X%02X%02X", mac[3], mac[4], mac[5]);
        memcpy(wifi.ap.password, password, strlen(password) + 1);
        wifi.ap.channel = 1;
        wifi.ap.max_connection = 2;
        wifi.ap.authmode = WIFI_AUTH_WPA2_PSK;
        ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
        ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &wifi));
        ESP_LOGI(TAG, "Join %s then open http://192.168.4.1/", wifi.ap.ssid);
    }
    ESP_ERROR_CHECK(esp_wifi_start());
    return true;
}

void app_main(void) {
    ESP_LOGI(TAG,"CAM_1V3 hardware target %d mV; verify TP7 %d–%d mV externally (not measured by firmware)",
        MV_CAMERA_CORE_TARGET_MV, MV_CAMERA_CORE_MIN_MV, MV_CAMERA_CORE_MAX_MV);
    camera_lock = xSemaphoreCreateMutex();
    assert(camera_lock);
    gpio_config_t output = {.pin_bit_mask=(1ULL<<MV_LED)|(1ULL<<MV_RESET)|(1ULL<<MV_PWDN), .mode=GPIO_MODE_OUTPUT};
    ESP_ERROR_CHECK(gpio_config(&output));
    gpio_set_level(MV_LED,0); gpio_set_level(MV_RESET,0); gpio_set_level(MV_PWDN,1);
    gpio_config_t input = {.pin_bit_mask=1ULL<<MV_ASK,.mode=GPIO_MODE_INPUT,.pull_up_en=GPIO_PULLUP_ENABLE};
    ESP_ERROR_CHECK(gpio_config(&input));
    vTaskDelay(pdMS_TO_TICKS(20));
    gpio_set_level(MV_PWDN,0); vTaskDelay(pdMS_TO_TICKS(10));
    gpio_set_level(MV_RESET,1); vTaskDelay(pdMS_TO_TICKS(20));
    if (!esp_psram_is_initialized() || esp_psram_get_size() < 8*1024*1024) {
        ESP_LOGE(TAG,"Expected 8 MB octal PSRAM; check N16R8 and sdkconfig");
        return;
    }
    camera_config_t camera = {
        .pin_pwdn=MV_PWDN,.pin_reset=MV_RESET,.pin_xclk=MV_XCLK,
        .pin_sccb_sda=MV_SDA,.pin_sccb_scl=MV_SCL,
        .pin_d0=MV_D0,.pin_d1=MV_D1,.pin_d2=MV_D2,.pin_d3=MV_D3,
        .pin_d4=MV_D4,.pin_d5=MV_D5,.pin_d6=MV_D6,.pin_d7=MV_D7,
        .pin_vsync=MV_VSYNC,.pin_href=MV_HREF,.pin_pclk=MV_PCLK,
        .xclk_freq_hz=20000000,.ledc_timer=LEDC_TIMER_0,.ledc_channel=LEDC_CHANNEL_0,
        .pixel_format=PIXFORMAT_JPEG,.frame_size=FRAMESIZE_SVGA,.jpeg_quality=12,
        .fb_count=1,.fb_location=CAMERA_FB_IN_PSRAM,.grab_mode=CAMERA_GRAB_WHEN_EMPTY
    };
    esp_err_t err=esp_camera_init(&camera);
    camera_ready=err==ESP_OK;
    if (!camera_ready) ESP_LOGE(TAG,"Camera init failed: %s",esp_err_to_name(err));
    err=nvs_flash_init();
    if(err==ESP_ERR_NVS_NO_FREE_PAGES || err==ESP_ERR_NVS_NEW_VERSION_FOUND) {ESP_ERROR_CHECK(nvs_flash_erase());err=nvs_flash_init();}
    ESP_ERROR_CHECK(err); ESP_ERROR_CHECK(esp_netif_init());ESP_ERROR_CHECK(esp_event_loop_create_default());
    if (!start_wifi()) return;
    uint32_t boot_random[2];
    esp_fill_random(boot_random, sizeof(boot_random));
    snprintf(boot_id, sizeof(boot_id), "%08" PRIx32 "%08" PRIx32, boot_random[0], boot_random[1]);
    httpd_config_t server_cfg=HTTPD_DEFAULT_CONFIG();server_cfg.stack_size=8192;
    server_cfg.recv_wait_timeout=5;server_cfg.send_wait_timeout=5;server_cfg.lru_purge_enable=true;
    httpd_handle_t server;ESP_ERROR_CHECK(httpd_start(&server,&server_cfg));
    const httpd_uri_t home={.uri="/",.method=HTTP_GET,.handler=root_handler};
    const httpd_uri_t capture={.uri="/capture.jpg",.method=HTTP_GET,.handler=image_handler};
    const httpd_uri_t status={.uri="/status.json",.method=HTTP_GET,.handler=status_handler};
    const httpd_uri_t last={.uri="/last.jpg",.method=HTTP_GET,.handler=image_handler};
    ESP_ERROR_CHECK(httpd_register_uri_handler(server,&home));ESP_ERROR_CHECK(httpd_register_uri_handler(server,&capture));ESP_ERROR_CHECK(httpd_register_uri_handler(server,&last));
    ESP_ERROR_CHECK(httpd_register_uri_handler(server,&status));
    if(xTaskCreate(ask_task,"ask",4096,NULL,5,NULL)!=pdPASS) ESP_LOGE(TAG,"Could not start ASK task");
}

#include <stdlib.h>
#include <assert.h>
#include <string.h>
#include <stdio.h>
#include "freertos/FreeRTOS.h"
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

// Caller owns camera_lock. Driver buffers never escape this function.
static esp_err_t capture_locked(void) {
    if (!camera_ready) return ESP_ERR_INVALID_STATE;
    gpio_set_level(MV_LED, 1);
    camera_fb_t *fb = esp_camera_fb_get();
    esp_err_t result = ESP_FAIL;
    if (fb && fb->format == PIXFORMAT_JPEG && fb->len <= 1024 * 1024) {
        uint8_t *copy = malloc(fb->len);
        if (copy) {
            memcpy(copy, fb->buf, fb->len);
            free(last_jpeg);
            last_jpeg = copy;
            last_size = fb->len;
            ++capture_count;
            result = ESP_OK;
            ESP_LOGI(TAG, "JPEG %u: %u bytes", capture_count, (unsigned)last_size);
        } else result = ESP_ERR_NO_MEM;
    }
    if (fb) esp_camera_fb_return(fb);
    gpio_set_level(MV_LED, 0);
    return result;
}
static esp_err_t image_handler(httpd_req_t *req) {
    if (xSemaphoreTake(camera_lock, pdMS_TO_TICKS(5000)) != pdTRUE)
        return httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Camera busy");
    bool fresh = strcmp(req->uri, "/capture.jpg") == 0;
    esp_err_t err = fresh ? capture_locked() : (last_jpeg ? ESP_OK : ESP_ERR_NOT_FOUND);
    if (err == ESP_OK) {
        httpd_resp_set_type(req, "image/jpeg");
        httpd_resp_set_hdr(req, "Cache-Control", "no-store");
        err = httpd_resp_send(req, (const char *)last_jpeg, last_size);
    } else err = httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "No JPEG; check camera and serial log");
    xSemaphoreGive(camera_lock);
    return err;
}
static esp_err_t root_handler(httpd_req_t *req) {
    const char page[] = "<!doctype html><html lang=en><meta name=viewport content='width=device-width,initial-scale=1'>"
      "<title>MuseView</title><style>body{font:18px system-ui;max-width:700px;margin:40px auto;padding:20px;background:#10251f;color:#f6f3e8}"
      "button{padding:14px 22px;font:inherit;margin-right:8px}img{display:block;max-width:100%;margin-top:24px}small{display:block;margin-top:24px}</style>"
      "<h1>MuseView</h1><p>Local camera bring-up</p><button onclick=show('/capture.jpg')>Capture</button>"
      "<button onclick=show('/last.jpg')>Last ASK capture</button><p id=status>Ready</p><img id=photo alt='Captured image'>"
      "<small>Images stay on this local device. ASK also takes a snapshot.</small><script>const statusEl=document.getElementById('status'),photoEl=document.getElementById('photo');async function show(url){"
      "statusEl.textContent='Capturing…';try{let r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(await r.text());"
      "let old=photoEl.src;photoEl.src=URL.createObjectURL(await r.blob());if(old.startsWith('blob:'))URL.revokeObjectURL(old);"
      "statusEl.textContent='JPEG ready'}catch(e){statusEl.textContent=e.message}}</script></html>";
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
                if (capture_locked() != ESP_OK) ESP_LOGE(TAG, "ASK capture failed");
                xSemaphoreGive(camera_lock);
            }
        }
        previous = value;
        vTaskDelay(pdMS_TO_TICKS(10));
    }
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
    esp_netif_create_default_wifi_ap();
    wifi_init_config_t cfg=WIFI_INIT_CONFIG_DEFAULT(); ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    uint8_t mac[6];ESP_ERROR_CHECK(esp_read_mac(mac,ESP_MAC_WIFI_SOFTAP));
    wifi_config_t wifi={.ap={.channel=1,.max_connection=2,.authmode=WIFI_AUTH_WPA2_PSK}};
    snprintf((char*)wifi.ap.ssid,sizeof(wifi.ap.ssid),"MuseView-%02X%02X%02X",mac[3],mac[4],mac[5]);
    const char *password=CONFIG_MUSEVIEW_AP_PASSWORD;
    if(strlen(password)<8 || strlen(password)>63) {ESP_LOGE(TAG,"AP password must be 8–63 characters");return;}
    memcpy(wifi.ap.password,password,strlen(password)+1);
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP,&wifi));ESP_ERROR_CHECK(esp_wifi_start());
    httpd_config_t server_cfg=HTTPD_DEFAULT_CONFIG();server_cfg.stack_size=8192;
    httpd_handle_t server;ESP_ERROR_CHECK(httpd_start(&server,&server_cfg));
    const httpd_uri_t home={.uri="/",.method=HTTP_GET,.handler=root_handler};
    const httpd_uri_t capture={.uri="/capture.jpg",.method=HTTP_GET,.handler=image_handler};
    const httpd_uri_t last={.uri="/last.jpg",.method=HTTP_GET,.handler=image_handler};
    ESP_ERROR_CHECK(httpd_register_uri_handler(server,&home));ESP_ERROR_CHECK(httpd_register_uri_handler(server,&capture));ESP_ERROR_CHECK(httpd_register_uri_handler(server,&last));
    if(xTaskCreate(ask_task,"ask",4096,NULL,5,NULL)!=pdPASS) ESP_LOGE(TAG,"Could not start ASK task");
    ESP_LOGI(TAG,"Join %s then open http://192.168.4.1/",wifi.ap.ssid);
}

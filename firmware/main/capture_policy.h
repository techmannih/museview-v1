#pragma once
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include <string.h>

// Epoch is monotonic uptime, not wall time. Reject stale, zero and future frames.
static inline bool mv_frame_is_fresh(int64_t frame_us, int64_t request_us, int64_t now_us) {
    return frame_us > 0 && frame_us >= request_us && frame_us <= now_us;
}

static inline bool mv_token_is_valid(const char *token) {
    size_t n = strlen(token);
    if (n < 16 || n > 128) return false;
    for (size_t i = 0; i < n; i++) {
        unsigned char c = (unsigned char)token[i];
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
              (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~')) return false;
    }
    return true;
}

static inline bool mv_bearer_authorized(const char *token, const char *header) {
    if (!mv_token_is_valid(token) || strncmp(header, "Bearer ", 7) != 0) return false;
    size_t n = strlen(token);
    if (strlen(header + 7) != n) return false;
    unsigned char difference = 0;
    for (size_t i = 0; i < n; i++) difference |= (unsigned char)token[i] ^ (unsigned char)header[i + 7];
    return difference == 0;
}

#include <assert.h>
#include <stdio.h>
#include "../main/capture_policy.h"

int main(void) {
    // A queued frame from before the request must never be presented as fresh.
    assert(!mv_frame_is_fresh(1000, 2000, 3000));
    assert(mv_frame_is_fresh(2000, 2000, 3000));
    assert(mv_frame_is_fresh(2500, 2000, 3000));
    assert(!mv_frame_is_fresh(0, 0, 3000));
    assert(!mv_frame_is_fresh(4000, 2000, 3000));
    assert(!mv_frame_is_fresh(-1, 2000, 3000));
    // Uptime greater than 32-bit microseconds (about 72 minutes) stays valid.
    assert(mv_frame_is_fresh(INT64_C(100000000000), INT64_C(99999999999), INT64_C(100000000001)));
    assert(!mv_token_is_valid(""));
    assert(!mv_token_is_valid("too-short"));
    assert(!mv_token_is_valid("0123456789abcdef\r\n"));
    assert(mv_token_is_valid("0123456789abcdef-_.~"));
    assert(mv_bearer_authorized("0123456789abcdef", "Bearer 0123456789abcdef"));
    assert(!mv_bearer_authorized("", "Bearer "));
    assert(!mv_bearer_authorized("0123456789abcdef", "Bearer 0123456789abcdee"));
    assert(!mv_bearer_authorized("0123456789abcdef", "Bearer 0123456789abcdef extra"));
    assert(!mv_bearer_authorized("0123456789abcdef", "Basic 0123456789abcdef"));
    assert(!mv_bearer_authorized("0123456789abcdef", ""));
    char long_token[130]; memset(long_token, 'a', 129); long_token[129] = 0;
    assert(!mv_token_is_valid(long_token));
    puts("capture policy: freshness boundaries and fail-closed token tests passed");
    return 0;
}

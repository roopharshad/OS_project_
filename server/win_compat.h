/* Force-included (gcc -include) only when the website compiles C code on
 * Windows with MinGW. It is never shown to the user and does not change the
 * program's logic.
 *  - MinGW.org's <unistd.h> has no sleep(), so map it to the Win32 Sleep().
 *  - Make stdout unbuffered so output can be streamed to the browser live. */
#ifndef WIN_COMPAT_H
#define WIN_COMPAT_H
#ifdef _WIN32
#include <stdio.h>
#include <unistd.h>   /* include first so the macro below cannot clash with it */
#include <windows.h>

static unsigned int dp_compat_sleep(unsigned int seconds)
{
    Sleep(seconds * 1000u);
    return 0;
}
#define sleep(s) dp_compat_sleep(s)

__attribute__((constructor)) static void dp_compat_unbuffer(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
}
#endif
#endif

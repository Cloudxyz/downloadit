# Android runtime review

The upstream youtubedl-android library runs a packaged Python interpreter, yt-dlp and separate native FFmpeg payloads. Its documented targets include ARM, ARM64, x86 and x86-64. These payloads do not share the desktop executable format. The wrapper's native artifacts, extracted codec libraries, licensing obligations and 16 KB alignment must each be checked independently. The upstream issue tracker records an alignment problem inside the codec payload for version 0.18.1. The application does not bundle it or invoke its updater. [Upstream integration](https://github.com/yausername/youtubedl-android) · [Codec alignment report](https://github.com/yausername/youtubedl-android/issues/365)

The bounded native Kotlin path handles directly supplied public AVC/AAC MP4 streams without a third-party executable. OkHttp supplies TLS hostname validation and binds sockets and DNS lookup to the selected Android network. The broker rejects redirects, non-public IPv4 destinations, oversized bodies and malformed stream metadata. Streams requiring player-code execution are unavailable.

Android 10 and later can create new media through MediaStore without broad file permissions. A pending entry remains private during transfer. The worker publishes it after the stream length and MP4 header have been checked. Each filename includes a job suffix. Player indexing is device-dependent. [MediaStore guidance](https://developer.android.com/training/data-storage/shared/media)

The Gradle 8.14.3 wrapper JAR digest is `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172`. The wrapper properties pin the distribution checksum. [Gradle verification](https://gradle.org/release-checksums/)

MP3 conversion uses the separately packaged, single-thread FFmpeg/libmp3lame WebAssembly variant. AndroidX JavaScriptSandbox runs it in an isolated process using the installed System WebView provider. No desktop executable, downloaded script or dynamically installed codec is required. An unsupported provider fails the MP3 job. See [JavaScriptSandbox](https://developer.android.com/develop/ui/views/layout/webapps/jsengine).

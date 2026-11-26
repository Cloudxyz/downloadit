# Project status

The workspace, threat model, canonical ID parser and versioned IPC validators are implemented. Browser, Windows, Android and peer transport work is pending. No release or device compatibility has been verified.

The extension implements top-frame SPA controls, English/Spanish confirmation, local profile preferences, host IPC, status, retry and history deletion. Android uses the system share action when supported. Browser interaction is unverified.

The Windows host implements a single-worker persistent queue, bounded retries, cancellation, byte progress, public IPv4 egress checks and no-replace MP4 publication under Downloads/DownloadIT. MP3 conversion and yt-dlp are gated. Only muxed AVC/AAC MP4 URLs offered directly on a public watch page qualify. Requests that need login, redirects, decryption or challenges fail. Runtime transport and live media remain unverified.

Android implements Share Sheet confirmation, selectable quality and Movies subfolder, Wi-Fi binding, foreground notifications, persisted jobs, cancellation, bounded retry, history deletion and pending MediaStore publication. The debug APK builds with the pinned Gradle wrapper. Share delivery, foreground lifecycle, actual downloads and player visibility still require physical-device verification.

QR pairing, one-use offers, fresh TLS connection challenges, Keystore identity, DPAPI credentials, revocation and Android job forwarding are implemented. Both platform builds and launcher compilation passed. Physical QR, LAN authentication and forwarded submission remain unverified.

Windows MP3 conversion now accepts bounded direct Opus/WebM input and encodes 128, 192 or 320 kbps with FFmpeg/libmp3lame WebAssembly. The muxer writes title and artist metadata. The codec loader, bytes and memory limit are checked during build. Encoding real media remains unverified.

Android MP3 now selects direct Opus audio and publishes tagged MP3s through pending Music entries. The debug APK contains the same bounded FFmpeg image and requires a compatible Android System WebView JavaScriptSandbox. Physical encoding and Pulsar indexing remain unverified.

The optional Windows yt-dlp worker is tied to release 2026.11.23. Preparation verified the upstream OpenPGP signature and SHA-256 digest. Lint, build and Python syntax checks passed. The installed Ubuntu WSL environment lacks bubblewrap, so optional extraction is unavailable here. The default broker remains available.

Cover artwork is opt-in on each platform. Jobs persist the setting and add a bounded JPEG as an ID3 front-cover frame. Lint, desktop/extension builds and the Android debug build passed; player display has not been exercised.

The extension can choose Downloads or format-specific Music/Videos folders on Windows. The queue journals a sanitized title and generated filename before publication and reads earlier queue formats. Lint and build passed; filesystem behavior on redirected Windows libraries is unverified.

Security review added Android JSON nesting limits, a peer connection deadline, pending-entry recovery, explicit Native Messaging pipe flushes and ownership checks for Windows partial cleanup. Platform builds and launcher compilation passed.

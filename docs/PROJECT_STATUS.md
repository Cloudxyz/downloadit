# Project status

This is a source-build MVP. The repository contains a compiled-path implementation for desktop, Android and paired operation. Runtime compatibility is still awaiting acceptance.

| Area | Implemented | Verification boundary |
|---|---|---|
| Shared protocol | Canonical video IDs, strict versioned requests, reply validation and bounded history | TypeScript checks and static inspection |
| Extension | Top-frame watch, Shorts and Music controls, SPA navigation, preferences, native IPC, local QR scanning, progress, history, cancel/retry, English and Spanish | MV3 bundle built. No browser automation or interactive browser check |
| Windows | Native launcher, single-worker persistent queue, interrupted-job recovery, approved folders and exclusive publication | Node bundle and C# launcher compiled. Host registration and live transfers unverified |
| Android | Share Sheet and paste, foreground service, Wi-Fi binding, MediaStore publication, subfolders, queue, retry, history deletion | Debug APK assembled with JDK 17, Platform 36 and Gradle 8.14.3. No physical device run |
| Media | Direct public AVC/AAC MP4 and Opus/WebM to MP3 via offline FFmpeg/libmp3lame, original title/artist, optional JPEG cover | Package signatures and codec hashes checked. Asset inventory inspected. Encoded audio, player visibility and quality unverified |
| Pairing | Expiring one-use QR, pinned TLS 1.3, per-connection nonce, Keystore identity, DPAPI credentials, Android revocation and desktop forwarding | Builds and static flow review. Camera, handshake, background transitions and revocation need two devices |
| Optional yt-dlp | Verified 2026.11.23 Python zipimport asset, offline WSL worker, intersection with directly offered public streams | OpenPGP signature, release digest and Python syntax checked. This build machine lacks bubblewrap |
| Repository | MIT license, dependency locks, threat model, SHA-pinned security workflows and manual release procedure | Owner settings, hosted scans and release signing are separate from local build validation |

## Limits that affect downloads

Windows installations now activate a complete per-install host directory. A standard reinstall selects the native broker even if an earlier installation included WSL assets. Live install and rollback remain manual acceptance items.

- The public watch document must expose a compatible direct URL. Common challenges, private videos, live content, redirects and separately encoded video tracks can make a requested download unavailable. MP4 quality is a ceiling and the source is never enlarged.
- Standard limits are 256 MiB / one hour for MP4 and 15 minutes for MP3. The receiving device can opt into 512 MiB / two hours for streamed MP4. Extended MP3 allows 37 min 30 s at 128 kbps, 25 min at 192 kbps and 15 min at 320 kbps. All profiles keep the 16 MiB Opus input, 37 MiB encoded output, sample counting and codec deadlines. Each queue holds up to 64 jobs and permits three attempts per job.
- Audio-only watch responses are eligible for MP3 when they contain a directly offered Opus track. The MP4 stream list is required only for video jobs.
- Compatible direct formats with declared sizes above the local cap are skipped during selection. Media can supply its exact byte count in the format descriptor or the HTTP response. When both are present they must agree. Publication still requires reading exactly that many bytes within the local cap.
- Wi-Fi-only defaults to enabled on Android. Pairing requires private IPv4 Wi-Fi and a visible receiver. The default Android retrieval path does not depend on WSL or the native youtubedl-android binaries.
- Mobile extension controls pass the chosen format to the system Share Sheet. The app accepts one supported link in shared text and asks the user to confirm. Browsers without Web Share show the manual sharing action.
- Source builds, developer installation and unpacked extension loading are available. Signed installers, APK releases, store publication and device compatibility certification are pending.
- CodeGraph indexes local source and shared symbols. Native Messaging, Android intents and service lifecycle, TLS messages, generated WebAssembly bindings and OS keystore calls cross runtime boundaries that a static index cannot verify.
- The merged Android manifest exposes only the launcher/Share Sheet activity. The download service and AndroidX startup provider are private. The optional AndroidX profile-install broadcast receiver is excluded.

See [installation](INSTALLATION.md), [Android runtime review](ANDROID_RUNTIME.md) and [extractor setup](EXTRACTOR.md) for environment-specific requirements.

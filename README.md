# Download IT

Download authorized public YouTube media from Brave to a Windows PC or a paired Android phone. Android also accepts links through the Share Sheet without a computer. Download IT is independent of Brave, Google and YouTube.

| Output | Choices | Destination |
|---|---|---|
| MP3 with title, artist and optional cover | 128, **192**, 320 kbps | Music/DownloadIT on Android |
| MP4 with AVC video and AAC audio | Up to 480p, **720p**, 1080p | Movies/DownloadIT on Android |

Windows can save under Downloads or the corresponding Music/Videos folder. Android subfolders are configurable. Each device processes one job at a time and keeps its own queue. The extension and Android app support English and Spanish.

Use Download IT only for media you have permission to download. Availability depends on the public watch page offering a compatible direct stream. Login, DRM, challenge-dependent streams and adaptive video/audio merging are unsupported. MP3 requires a direct Opus stream and a supported codec sandbox. There is no account or hosted service.

**Build status:** The extension, Windows host and Android debug APK have been compiled. Live downloads, browser interaction, pairing and physical-device playback await acceptance. There is no signed release. [Current status](docs/PROJECT_STATUS.md)

## Getting started

1. Follow the [build and installation instructions](docs/INSTALLATION.md).
2. On Android, share a YouTube link to Download IT and confirm the format. In desktop Brave, select a download control on the video page and confirm the destination.
3. To send work to a phone, authorize your computer using [QR pairing](docs/PAIRING.md). The phone retrieves and saves the file itself.

[Architecture](docs/ARCHITECTURE.md) · [Permissions](docs/PERMISSIONS.md) · [Privacy](docs/PRIVACY.md) · [Threat model](docs/THREAT_MODEL.md) · [Security reporting](SECURITY.md) · [Third-party notices](THIRD_PARTY_NOTICES.md) · [Release procedure](docs/RELEASE.md)

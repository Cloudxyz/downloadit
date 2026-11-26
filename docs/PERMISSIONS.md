# Permissions and network access

| Component | Grant | Use |
|---|---|---|
| Extension | Content scripts on www.youtube.com, m.youtube.com and music.youtube.com over HTTPS | Resolve the current top-frame video and add download controls. |
| Extension | storage | Local output profile, artwork and destination preferences. |
| Extension | nativeMessaging | Communicate with the registered per-user companion through browser-owned pipes. |
| Extension | Camera prompt after **Scan Android QR** | Decode a short-lived pairing offer locally. Tracks stop when scanning ends. |
| Android | INTERNET | Fetch the authorized watch document and media. Serve authenticated peers only when the receiver is enabled. |
| Android | ACCESS_NETWORK_STATE | Enforce Wi-Fi preference and select the Wi-Fi interface for pairing. |
| Android | FOREGROUND_SERVICE and FOREGROUND_SERVICE_DATA_SYNC | Run a user-requested transfer with a foreground notification. |
| Android | POST_NOTIFICATIONS on API 33+ | Show download-service notifications. Requested when starting local work. |
| Windows | Per-user registry and application data | Native host registration, local queue and DPAPI-encrypted device credentials. |

Public retrieval uses DNS and HTTPS port 443 for the canonical YouTube watch page, a single-label googlevideo.com CDN host and, when enabled, i.ytimg.com cover artwork. The broker accepts public IPv4 addresses only and rejects redirects. IPv6-only networks and some captive portals are unsupported. The LAN receiver uses a separate pinned TLS channel on private Wi-Fi TCP 42189. Builds and optional extractor preparation contact their documented package sources. The app has no analytics, account server or external pairing relay.

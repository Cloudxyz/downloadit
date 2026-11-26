# Project status

The workspace, threat model, canonical ID parser and versioned IPC validators are implemented. Browser, Windows, Android and peer transport work is pending. No release or device compatibility has been verified.

The extension implements top-frame SPA controls, English/Spanish confirmation, local profile preferences, host IPC, status, retry and history deletion. Android uses the system share action when supported. Browser interaction is unverified.

The Windows host implements a single-worker persistent queue, bounded retries, cancellation, byte progress, public IPv4 egress checks and no-replace MP4 publication under Downloads/DownloadIT. MP3 conversion and yt-dlp are gated. Only muxed AVC/AAC MP4 URLs offered directly on a public watch page qualify. Requests that need login, redirects, decryption or challenges fail. Runtime transport and live media remain unverified.

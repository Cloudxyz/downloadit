# Architecture

| Component | Responsibility |
|---|---|
| apps/extension | Isolated top-frame controls resolve the current video. A separate extension page confirms download intent, selects destinations and displays bounded job snapshots. A service worker owns the native port. |
| packages/core, protocol, security | Canonical ID parsing, profile constraints, exact message shapes and shared MP3 encoding. The broker retains authority over network destinations and files. |
| apps/desktop | A per-user Native Messaging launcher admits the fixed extension origin. The Node host either handles a local queue command or contacts the selected phone using its pinned certificate. |
| apps/android | Compose handles Share Sheet confirmation and local controls. A visible Wi-Fi receiver can authorize a computer and accept authenticated commands. A foreground service owns downloads. |

## Retrieval and publication

The receiving device fetches a canonical watch document. Its HTTPS broker resolves approved hostnames, rejects special-purpose IPv4 addresses, connects to validated addresses, performs normal TLS identity verification and rejects redirects. Fetches have byte and time limits. A Windows installation can additionally require agreement with the [offline yt-dlp extractor](EXTRACTOR.md).

MP4 uses a directly offered progressive AVC/AAC stream under the requested height. MP3 uses directly offered Opus/WebM input and a bounded FFmpeg WebAssembly module in a disposable converter. The converter receives byte arrays, fixed parameters and bounded metadata. On Android it runs inside the system JavaScript sandbox. The optional thumbnail comes from a fixed YouTube JPEG path. The broker never executes remote player code.

Windows stores its bounded queue in an atomically replaced JSON file and publishes completed files using a no-replace hard link. Android journals jobs in private preferences, inserts a pending MediaStore row and clears the pending flag on completion. It reconciles interrupted jobs on startup. Both keep local history until the user clears it.

## Protocol

Native Messaging uses a four-byte little-endian length and UTF-8 JSON. Browser requests are capped at 4096 bytes. Commands are submit, cancel, retry, list, clear, peers, pair and forget. A target is desktop or an authorized peer UUID. Job responses contain a maximum of 64 validated jobs, or a fixed error category. The local management response contains a maximum of eight peer IDs. See [job request schema](protocol.schema.json) and [peer and result schemas](peer.schema.json).

LAN transport uses one TLS 1.3 connection per operation and four-byte big-endian lengths. Android sends a fresh 32-byte random nonce. Each client frame echoes it once on that connection. Pairing exchanges an unexpired, single-use QR challenge for a random credential. Normal job commands also carry the peer UUID and credential. A paired computer can read and manage the phone's local queue, including jobs started on the phone. Revoke it on Android to withdraw that authority. [Pairing instructions](PAIRING.md)

The [threat model](THREAT_MODEL.md) records assumptions and [project status](PROJECT_STATUS.md) records the runtime checks still outstanding.

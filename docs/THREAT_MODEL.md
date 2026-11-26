# Threat model

Assets include download intent, peer authority, local history, storage capacity and the contents of the user's device. A hostile website can mutate YouTube's DOM. Treat content-script input, the active document, metadata, media bytes, DNS, redirects, shared intents and every remote device as untrusted.

| Crossing | Required control | Residual risk or gate |
|---|---|---|
| Page to extension | Isolated script, trusted click, closed shadow tree, canonical URL and top-frame sender checks. Confirm authority in companion or extension UI. | A page can mislead a user about what a button does. |
| Browser to host | Exact installed extension origin, native pipe only, bounded length, strict version and field validation. | Same-user malware can control user processes. |
| Extractor to Internet | Fetch only the public watch document and directly offered media, allowlist HTTPS hosts and paths, pin each resolved public address inside the TLS connection, reject or revalidate every redirect. No ambient authentication. | Upstream may withhold compatible media. Reject challenges. |
| Downloader to storage | Bound time, bytes, duration, history, queue and workers. Generate file identities locally. Reserve unique output, keep partials private, publish on completion. | A compromised OS or malicious process with the same account is outside the boundary. |
| Decoder to OS | Isolate untrusted codecs from network, credentials and general filesystem. | Disable conversion when a verified isolated codec is unavailable. |
| Device to device | Physical QR bootstrap, explicit approval, time-limited single-use challenge, authenticated TLS and OS-protected per-peer credentials. | A listener must stay disabled until these controls exist. |
| Source to package | Pin dependencies, verify executable digests against upstream, inspect licenses. Separate build from signing. | Integrity alone does not establish that upstream code is safe. |

Do not expose local HTTP APIs or accept arbitrary URLs, commands, certificate exceptions, shell fragments or file paths from browser messages. Render user data as text. No cookie, playlist, private-content or external-player input. Diagnostics expose fixed error categories only. Theft of an unlocked device, OS compromise and upstream availability are outside the model. Physical-device and browser acceptance require separate verification.

MP3 conversion accepts at most 16 MiB of public Opus/WebM audio and 15 minutes of samples. The broker supplies bytes and bounded metadata to a separate offline codec process. Use a pinned, single-thread FFmpeg/libmp3lame WebAssembly image with a 128 MiB linear-memory maximum. Android requires the OS JavaScript sandbox, named-data transfer, promise returns, heap limit and termination features. Windows uses a time-limited child, restricted file reads and an in-memory codec filesystem. Never pass media or peer data as program source.

# Optional Windows yt-dlp worker

Close the browser before changing modes. Run the installer without switches for the native Windows broker, including when returning from `-WithExtractor`. Each install gets a new host directory. The registered manifest switches to it after compilation and copying succeed. Old generations may be removed with the browser closed after checking the active launcher path in the manifest. Queue data and credentials live outside these generations.

The normal Windows and Android paths read directly offered public formats using their bounded HTTPS brokers. Windows additionally supports the signed yt-dlp 2026.11.23 zipimport distribution as an offline extractor. Android uses the native public-page reader. Both reject streams requiring authentication, player-code execution or a challenge.

For the optional path, use a locally trusted WSL 2 Ubuntu distribution with a non-root default user, distribution-signed Python 3.10 or newer and bubblewrap supporting unprivileged user namespaces and `--disable-userns`. Availability depends on the Linux distribution and administrator policy. Keep its namespace protections enabled.

After the normal build run `apps/desktop/extractor/prepare.ps1` from PowerShell. It verifies the pinned release public key, detached OpenPGP signature, manifest and archive digest before copying assets to the build directory. Use Git for Windows' installed GnuPG for this preparation. Install the desktop host with `apps/desktop/install.ps1 -WithExtractor`.

The worker runs with an empty network namespace, read-only system libraries, private devices, a bounded address space, CPU and wall-clock deadlines, and no host drive mount. Its only input document arrives through stdin. The Python adapter serves that document from memory to the YouTube extractor. The Windows broker accepts only vetted formats present in both the original public page and the extractor result. It connects to the CDN itself. The optional mode can have lower compatibility with upstream watch pages. Installation or sandbox errors fail the job.

Normal use does not fetch updates, scripts or executables. The signed release includes third-party components whose license obligations apply if redistributing it. [Upstream release and checksums](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.11.23) · [Upstream license notices](https://github.com/yt-dlp/yt-dlp/blob/2026.11.23/THIRD_PARTY_LICENSES.txt)

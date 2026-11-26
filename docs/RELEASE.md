# Manual release procedure

No release is authorized by a source commit or push. Release credentials belong to the owner and stay outside the repository and ordinary CI.

1. Choose and review a clean source commit. Record the full commit, OS, tool versions, exact dependency graph, wrapper checksum and executable hashes. Review the threat model, platform limitations, licenses and current upstream security advisories.
2. Rebuild from the frozen pnpm lock and locked Gradle dependencies in a clean environment. Compare unsigned assets across independent builds when practical. Document nondeterminism including ZIP metadata, SDK paths and signatures.
3. Complete physical Windows/Brave and Android acceptance with authorized media before distribution. Confirm pairing, TLS identity, expiry, revocation, real playback, storage destinations, cancellation, interruption recovery and history deletion. Record the precise browser, OS, device ABI, WebView provider and results.
4. Assemble an SPDX or CycloneDX SBOM covering the extension, desktop components, Android runtime classpath, embedded FFmpeg variant and any optional extractor. Include artifact hashes, versions, licenses and component relationships. Include corresponding codec sources and rebuild instructions.
5. Sign the Android release APK with the owner's offline keystore. Verify using Android SDK `apksigner verify --verbose --print-certs` and compare the signing fingerprint through an independent owner-controlled channel. Do not distribute a debug APK as a signed product release.
6. Build the Windows installer from reviewed artifacts, Authenticode-sign the installer and native launcher, then verify with `Get-AuthenticodeSignature` against the expected publisher. Package the extension with the approved identity, inspect its permissions and bundle, and check the native host's allowed origin.
7. Generate SHA-256 sums of final signed artifacts and sign the checksum manifest. Publish the artifacts, signed checksums, SBOM, notices, corresponding source, build instructions and known limitations together only after explicit owner approval.

## GitHub owner settings

Enable the dependency graph, secret scanning, push protection and private vulnerability reporting in GitHub when available. Enable code scanning for this repository's advanced setup if required. Dependency review uses the dependency graph. Choose branch protection that rejects force pushes and deletion while preserving the owner's authorized direct-to-master workflow. Review whether required checks should apply to PRs or to the owner before enabling them.

Dependabot proposes reviewed updates. CodeQL scans trusted master pushes and manual requests. Dependency review reads PR dependency changes. Jobs use pinned action commits and narrowly scoped tokens. No release upload, deployment or signing credentials are configured.

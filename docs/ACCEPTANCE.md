# Manual acceptance on Windows and Android

Use the [installation guide](INSTALLATION.md) to build and install the reviewed commit. Use public media you have authorization to download. Record the commit, Windows version, Brave version, phone model/ABI, Android version, WebView provider/version, selected profile and observed outcome. Keep pairing codes, credentials, local identifiers and signed media URLs out of reports. The checks below await a human run.

## Windows and Brave

1. With Brave closed, install the default host from the repository root using `.\apps\desktop\install.ps1`. Open PowerShell and inspect the registered launcher. The first check below should return `True`. The second should return `False` for a standard installation, including after a previous opt-in extractor install.

   ```powershell
   $manifestPath = Join-Path $env:LOCALAPPDATA 'DownloadIT\host\host.json'
   $installedHost = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
   Test-Path -LiteralPath $installedHost.path -PathType Leaf
   Test-Path -LiteralPath (Join-Path (Split-Path -Parent $installedHost.path) 'extractor')
   ```

2. Load `dist\extension` at `brave://extensions`. Verify ID `gnjjgfaigfdmkfmjmjnokalgifpjfccd`. Open the extension from the toolbar. Select the local destination and verify the history loads. A Native Messaging error here is an installation failure independent of media availability.
3. Open an authorized public watch page, navigate to a second video within YouTube, then choose **Download MP4**. Verify the confirmation shows the second video's ID. Choose local Downloads and 720p. With an eligible progressive offer, expect one completed job and one playable MP4 under `%USERPROFILE%\Downloads\DownloadIT`. Check video, sound, duration and reported resolution. Repeat using the Videos library destination and another eligible profile.
4. For an authorized video with a direct Opus track, choose **Download MP3**, 192 kbps, Music library and optional cover. Open the resulting file under `%USERPROFILE%\Music\DownloadIT`. Verify playback, title, available artist metadata and requested cover. Repeat the identical request while the entry is still in history. Expect a duplicate response and no second file.
5. Cancel an active transfer and wait for its status to settle. Check the destination for a partial or newly published file from that job. Retry from history. Up to three total attempts are allowed. Clear finished history and confirm an earlier completed media file still plays.
6. Where authorized material is available, try a 16–25 minute direct Opus source at 192 kbps. The standard profile should reject duration. Close Brave, reinstall with `.\apps\desktop\install.ps1 -ExtendedLimits`, reopen Brave and retry. An input within 16 MiB is eligible up to 25 minutes, subject to the remaining limits. For MP4 the corresponding boundary case is a compatible offer over 256 MiB or one hour, within 512 MiB and two hours. Restore the standard profile by reinstalling without switches. Report the actual limiting condition if known.
7. Optional extractor users can follow the signed [WSL setup](EXTRACTOR.md), close Brave and install with `-WithExtractor`. Verify the active extractor directory is present. A missing sandbox prerequisite should fail the attempted job. Reinstall without switches and repeat steps 1–3 on the native host.

## Android installation, files and playback

1. Install the debug APK on a physical Android 10+ phone and open Download IT. Check the displayed defaults of Wi-Fi only, 720p, 192 kbps and the DownloadIT folder. On Wi-Fi, share an authorized watch link from Brave or YouTube using **Share → Download IT**. Verify the link appears and submission requires choosing a download button. Also exercise paste without a PC.
2. Submit a short eligible MP4 and allow notifications when prompted. After progress starts, press Home. Observe the foreground-service notification, return to the app and check completion. Using Files, find `Movies/DownloadIT/`. Open the item from Gallery and VLC and check video, sound and duration.
3. Submit an eligible MP3 with cover enabled. Find the result in `Music/DownloadIT/`, refresh Pulsar's library if needed, then check playback, tags and artwork. Record an unsupported WebView provider separately from an unavailable media offer when independently established. An MP4 success alone does not verify the audio codec.
4. To distinguish publication from a player's library filters, use the SDK Platform-Tools installed on the PC. Enter `adb shell` on the authorized phone, then run these read-only queries in that shell. Locate the job's filename. Expect the matching collection, path, MIME type and `is_pending=0` for a completed file. OEM restrictions can prevent shell queries. Record that as unverified and use Files and the named players for independent observations.

   ```sh
   content query --uri content://media/external_primary/audio/media --projection _display_name:mime_type:relative_path:is_pending --where "relative_path='Music/DownloadIT/'"
   content query --uri content://media/external_primary/video/media --projection _display_name:mime_type:relative_path:is_pending --where "relative_path='Movies/DownloadIT/'"
   ```

5. Cancel a transfer while it shows progress. Confirm it produces no newly visible completed file. Retry it from history. On a separate attempt, interrupt the app using Android Settings → Apps → Download IT → Force stop, then reopen it. Confirm an interrupted transfer can be retried and that earlier completed files survive recovery and clearing finished history. For a storage-cleanup error, restore access and restart the app before retrying. Use the phone's own **Extended limits** setting for the boundary cases in Windows step 6.
6. With Wi-Fi-only enabled, attempt a new job on cellular if available. Expect a connection failure and no publication. Restore Wi-Fi. An offer requiring login, a challenge or separate tracks for MP4 should produce no completed file. Record unavailable public offers separately from successful playback. Where no eligible input is available, mark playback and publication unverified.

## Two-device authorization and receiver lifecycle

1. Connect Windows and Android to the same private Wi-Fi with client-to-client access. Open Download IT on the phone. The receiver starts offline. Tap **Connect on Wi-Fi** and **Authorize one computer**. Let one QR expire after 90 seconds, then request a fresh QR. In the Brave extension choose **Scan Android QR**, grant camera access and scan the fresh code. Expect one matching eight-character peer ID prefix on both devices and the QR to disappear.
2. Select the phone as the destination in Brave. Submit an eligible item while the phone app is visible. Verify the job appears on the phone, and that the phone publishes the completed file in its selected folder. Press Home during an accepted transfer. Confirm that job can finish. Try another request while the app is hidden. Expect the PC to report the receiver unavailable and no new phone job.
3. Return to the phone, explicitly enable the receiver and create a new pairing offer. Switch the phone's default network or turn off Wi-Fi while the app is visible. Verify the receiver reports offline, the outstanding QR disappears and a command cannot reach the old session. Restoring Wi-Fi should require explicitly enabling the receiver again. If the address changed, revoke the old PC entry and forget the old phone entry before pairing afresh.
4. While the receiver is enabled, use **Revoke PC** on Android. A subsequent list or submission from that PC should fail, with no new job. Use **Forget selected device** on Windows and verify a new pairing requires fresh phone authorization. Record Wi-Fi client isolation, firewall policy, camera restrictions and TLS errors separately from media-format outcomes.

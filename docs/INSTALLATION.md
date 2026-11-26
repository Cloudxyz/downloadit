# Build and install

## Prerequisites

Use a reviewed checkout on Windows x64, Node 24.13.0 in the official Program Files installation, pnpm 11.1.1, and a local filesystem supporting hard links. The installer uses the Windows .NET Framework 4.x C# compiler. For Android use JDK 17, Android SDK Platform 36 and the pinned Gradle wrapper. Set JAVA_HOME and ANDROID_HOME to your installations. The development build was compiled on Windows. Node and Android OS security updates should be reviewed before release.

From the repository root run:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @download-it/android build
```

The Android pnpm build also prepares the verified codec assets. A direct Gradle invocation for APK packaging requires those assets in `dist/codec`. Build output and debug signing credentials are local.

## Windows and Brave

1. Review and run `apps/desktop/install.ps1` as the intended Windows user. This compiles the launcher, installs the host under LocalAppData/DownloadIT/host and registers the per-user native host for Brave, Chromium and Chrome.
2. In Brave's extensions page enable developer mode and **Load unpacked** from `dist/extension`. Confirm the unpacked extension ID is `gnjjgfaigfdmkfmjmjnokalgifpjfccd`. The checked-in public key provides a stable development identity. A future store identity needs a matching reviewed host registration.
3. Open an authorized public video. Choose **Download MP3** or **Download MP4** on the page. Confirm the video ID, profile and destination in the Download IT tab. That tab also opens from the toolbar and provides quality preferences and history.
4. For local downloads choose Downloads or the format-specific Music/Videos subfolder. Paths are under the user's profile with a DownloadIT subfolder. Junctions, network drives and redirected profile folders may be rejected. For Android follow [pairing](PAIRING.md).

The manifest targets Chromium 116 or later on desktop, including compatible Brave releases. This is an API floor. No browser version has been interactively certified. Use an up-to-date official browser. Keep the browser running for local jobs. Interrupted jobs can be retried after reopening the extension.

## Android

Install a locally built debug APK from `apps/android/app/build/outputs/apk/debug/app-debug.apk` using Android's normal package installation flow on a device you own. Debug APKs are for local development. The app requires Android 10 (API 29) or later. MP3 additionally needs a System WebView provider supporting AndroidX JavaScriptSandbox, WebAssembly compilation, named-data transfer, promises, heap limits and isolate termination.

In Brave or YouTube select **Share → Download IT**. Check the link and choose the desired format. The app also accepts a pasted canonical URL. Wi-Fi-only is enabled initially. Video defaults to 720p and audio to 192 kbps. Music and Movies each default to a DownloadIT subfolder. Completed items are published to the corresponding MediaStore collection. Allow notifications for visible background progress. Use the app to cancel, retry or clear finished history.

Brave's Android extensions feature has been tracked separately from desktop. When an official Android build exposes the required MV3 APIs the same content controls use Android's share action where available. The Share Sheet path works independently of extension installation. Exact mobile browser support and media indexing in Pulsar, Gallery and VLC require device checks. [Brave Android extension tracking](https://github.com/brave/brave-browser/issues/59354)

## Uninstall

Revoke computers on Android and forget them on Windows. Remove the unpacked extension in the browser. Close the browser before removing the per-user DownloadIT host directory and, if desired, queue and device data under LocalAppData/DownloadIT. Using Registry Editor, remove only the `org.downloadit.host` registration under each installed browser's `HKCU/Software/<vendor>/<browser>/NativeMessagingHosts` path, as recorded in `install.ps1`. Remove the Android app in Settings. Delete any completed media separately through your file manager or media app.

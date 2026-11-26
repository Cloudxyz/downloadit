# Build and install

## Prerequisites

Use a reviewed checkout on Windows x64, Node 24.13.0 in the official Program Files installation, pnpm 11.1.1, and a local filesystem supporting hard links. The installer uses the Windows .NET Framework 4.x C# compiler. For Android use JDK 17, Android SDK Platform 36 and the pinned Gradle wrapper. Set JAVA_HOME and ANDROID_HOME to your installations. The development build was compiled on Windows. Node and Android OS security updates should be reviewed before release.

From the repository root run:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm lint
pnpm build
```

For Windows downloads, continue directly to the Brave setup below. The Android SDK and JDK are needed only to build the phone app.

## Windows and Brave

1. Close Brave. In PowerShell at the repository root, run `.\apps\desktop\install.ps1` as the intended Windows user. The installer compiles the launcher, installs the host under LocalAppData/DownloadIT/host and registers it for Brave, Chromium and Chrome under HKCU. The default installation runs natively on Windows. WSL is needed only for the [optional offline extractor](EXTRACTOR.md).
2. Open `brave://extensions`, enable **Developer mode**, choose **Load unpacked** and select this checkout's `dist\extension` directory. Confirm the ID is `gnjjgfaigfdmkfmjmjnokalgifpjfccd`. Keep that directory in place while using the extension. The checked-in public key provides a stable development identity. A future store identity needs a matching reviewed host registration.
3. Open an authorized public video. Choose **Download MP3** or **Download MP4** on the page. Confirm the video ID, profile and destination in the Download IT tab. That tab also opens from the toolbar and provides quality preferences and history.
4. For local downloads choose Downloads or the format-specific Music/Videos subfolder. Paths are under the user's profile with a DownloadIT subfolder. Junctions, network drives and redirected profile folders may be rejected. For Android follow [pairing](PAIRING.md).

The manifest targets Chromium 116 or later on desktop, including compatible Brave releases. This is an API floor. No browser version has been interactively certified. Use an up-to-date official browser. Keep the browser running for local jobs. Interrupted jobs can be retried after reopening the extension.

## Android

1. Use Android 10 (API 29) or later on a phone you own. On the build PC, install JDK 17, Android SDK Platform 36, SDK Build Tools for the pinned Android Gradle Plugin and SDK Platform-Tools. Set `JAVA_HOME` to the JDK root and `ANDROID_HOME` to the SDK root. Android Studio's usual Windows SDK location is `$env:LOCALAPPDATA\Android\Sdk`.
2. From the repository root after the frozen dependency install above, run `pnpm --filter @download-it/android build`. This prepares the verified codec assets and assembles the locally signed debug APK.
3. Enable **USB debugging** on the phone, connect it by USB and approve this PC when Android asks. Run these commands in PowerShell. Select a single authorized device before installing.

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r .\apps\android\app\build\outputs\apk\debug\app-debug.apk
```

4. Open **Download IT** on the phone. Alternatively, transfer that same APK to the phone and open it with the system package installer. Keep existing app data when upgrading with the same signing key. A signature mismatch requires the original key for an in-place upgrade. Debug APKs are for local development. MP3 additionally needs a System WebView provider supporting AndroidX JavaScriptSandbox, WebAssembly compilation, named-data transfer, promises, heap limits and isolate termination.

In Brave or YouTube select **Share → Download IT**. Check the link and choose the desired format. The app also accepts a pasted canonical URL. Wi-Fi-only is enabled initially. Video defaults to 720p and audio to 192 kbps. Music and Movies each default to a DownloadIT subfolder. Completed items are published to the corresponding MediaStore collection. Allow notifications for visible background progress. Use the app to cancel, retry or clear finished history.

The Android Share Sheet entry is provided by the installed phone app and can be exercised without a browser extension. Where an official Android browser build supports the required extension APIs, the content controls can pass a link to the system share action. Verify the actual browser, WebView and player combination using the [manual acceptance steps](ACCEPTANCE.md). [Brave Android extension tracking](https://github.com/brave/brave-browser/issues/59354)

## Uninstall

Revoke computers on Android and forget them on Windows. Remove the unpacked extension in the browser. Close the browser before removing the per-user DownloadIT host directory and, if desired, queue and device data under LocalAppData/DownloadIT. Using Registry Editor, remove only the `org.downloadit.host` registration under each installed browser's `HKCU/Software/<vendor>/<browser>/NativeMessagingHosts` path, as recorded in `install.ps1`. Remove the Android app in Settings. Delete any completed media separately through your file manager or media app.

### Download limits

For extended limits, close Brave and run the desktop installer with the -ExtendedLimits switch, or turn on **Extended limits** in the Android app. Rerun the installer without that switch or turn off the Android setting to restore the defaults. Android applies its local choice to new attempts, including requests from paired computers. See the [profile ceilings](PROJECT_STATUS.md). Actual transfers must also meet the available disk space, direct-stream size, and elapsed-time limits.

# Pair a Windows browser with Android

Connect both devices to the same trusted private Wi-Fi network. Open Download IT on the phone and choose **Connect on Wi-Fi**, then **Authorize one computer**. In the extension's Download IT tab select **Scan Android QR** and point the camera at the phone. Grant camera access when prompted. The extension decodes camera frames locally and stops the track when the scan finishes. The QR expires after 90 seconds or one successful pairing.

Select the Android destination before confirming a download. Keep the app visible to receive commands. Leaving the app closes the listener. An accepted download continues in its foreground service. Reopen the receiver after returning. Android holds the TLS identity in Keystore. Windows verifies the exact QR certificate with TLS 1.3 and protects each random peer credential with current-user DPAPI. Each connection requires its own fresh challenge. Android keeps only credential verifiers. Both device lists display the first eight characters of the same peer ID.

**Revoke PC** on Android invalidates the credential. **Forget selected device** on Windows removes it locally. Guest Wi-Fi client isolation, a firewall or a changed phone IP can prevent connections. Re-pair after an address change. The receiver binds only its private Wi-Fi IPv4 address on TCP 42189 and accepts private clients while enabled. Remote access requires a separately configured private route and firewall policy on the owner's network. Never forward this port on a public router.

Pairing, revocation, certificate compatibility and camera operation have been build-checked only.

Loss of the selected default Wi-Fi network or its bound address closes the receiver and invalidates the outstanding QR. Reconnect explicitly on the phone after changing networks. Existing peer credentials remain available for future authorized receiver sessions.

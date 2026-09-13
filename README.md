# Neon Rift

Native Android light playground, built with Java and OpenGL ES 3. Drag to attract droplets, pinch to zoom, double tap to pulse, and switch among four palettes and three quality modes.

## Install on Android

**[Download Neon-Rift.apk](https://github.com/urbanrunnerx/neon-rift/releases/download/dev-2-1/Neon-Rift.apk)** — development build 2, Android version 0.1.0. [Successful build and emulator checks](https://github.com/urbanrunnerx/neon-rift/actions/runs/34764260238).

Open [GitHub Releases](https://github.com/urbanrunnerx/neon-rift/releases) and download **Neon-Rift.apk** from a successful development release. Open the downloaded file on your phone and follow Android’s install prompt. No Android Studio, source conversion, or APK-building service is needed to install a published APK. The source ZIP downloads are for development.

The app requires Android 8.0 or later and OpenGL ES 3.0. It has no accounts, ads, analytics, network permission, or WebView. It saves its controls locally on your device.

Development builds without configured signing secrets use a new signing key for each CI run. Installing a different such build requires uninstalling the old one first, which removes its saved settings. Stable update signing has not been configured or verified.

## Build and release status

[Android workflow](https://github.com/urbanrunnerx/neon-rift/actions/workflows/android.yml) · [Development releases](https://github.com/urbanrunnerx/neon-rift/releases)

Source pushes to `main` start the Android workflow; it can also be run manually from Actions. The workflow sets up JDK 17 and the Android SDK, runs motion/source tests, builds and signs the APK with SDK 35 tools, verifies the package, then installs and launches it in an emulator. Publication is gated on those checks. Test logs and Android screenshots are retained as workflow artifacts. Physical-phone performance remains a separate check.

The first workflow run identified a missing `sdkmanager` setup. The workflow now initializes the SDK explicitly. Build 2 succeeded on September 13, 2026: compilation, signature/package verification, emulator install/launch, renderer initialization, gesture input, and background/resume passed. Launch and resume screenshots were reviewed; the software emulator is not a phone-performance benchmark. `DELIVERY-STATUS.md` retains the earlier preparation history; it is not a current CI report.

## Continue development in Work

Use this repository as the canonical project for future programming and updates in ChatGPT Work. `AGENTS.md` documents the native/web structure, tests, and delivery requirements.

For Android Studio, follow [OPEN-IN-ANDROID-STUDIO.md](OPEN-IN-ANDROID-STUDIO.md). Gradle 8.11.1 and Android Gradle Plugin 8.9.2 are configured. Run the supplied Windows or macOS/Linux preparation script to retrieve and verify the Gradle wrapper. CI builds directly with Android SDK tools and does not require that bootstrap.

For local command-line builds, install JDK 17, Android SDK platform 35, build-tools 35.0.0, and platform-tools; set `ANDROID_HOME`, then run:

```sh
bash tools/test-motion.sh
bash tools/build-apk.sh
```

The signed output is `build/apk/Neon-Rift.apk`. To enable a stable signing identity in CI, configure `NEON_RIFT_KEYSTORE_B64`, `NEON_RIFT_STORE_PASSWORD`, `NEON_RIFT_KEY_PASSWORD`, and `NEON_RIFT_KEY_ALIAS` as repository secrets, with a securely backed-up private key. Never commit the key.

## Separate web edition

`docs/` contains an HTML/JavaScript/WebGL 2 edition with browser home-screen installation and a service worker. It shares shader assets with the native app but is a separate application.

To publish it with GitHub Pages, use repository Settings → Pages → Deploy from a branch → `main` → `/docs`. Confirm a successful Pages deployment before using the intended address `https://urbanrunnerx.github.io/neon-rift/install.html`. Uploading these files alone does not activate Pages.

```sh
node tests/test-web-motion.mjs
node tests/test-service-worker.cjs
```

The service-worker tests use mocked browser storage; actual offline relaunch and phone home-screen installation still need device checks. Increment the cache version in `docs/sw.js` when web assets change.

# Neon Rift — native and web editions

Two separate applications share the portal shader assets:

- **Native Android**: Java / OpenGL ES. No HTML, JavaScript, WebView, or browser in the Android app. See OPEN-IN-ANDROID-STUDIO.md.
- **Web Edition**: HTML / JavaScript / WebGL 2, with a manifest and service worker for browser-managed home-screen installation. It is not the native app without an APK. Chrome may use an internal WebAPK; users do not manually sideload an APK file.

The source and Android workflow are now in `urbanrunnerx/neon-rift`. Check [Android builds](https://github.com/urbanrunnerx/neon-rift/actions/workflows/android.yml) for current results and [Releases](https://github.com/urbanrunnerx/neon-rift/releases) for APKs. A development APK is published only after its build, signature verification, and emulator smoke test succeed.

The original local test history is in DELIVERY-STATUS.md. GitHub Pages and physical-phone installation remain separate verification steps.

## Publish both source and the web edition on GitHub

1. Create https://github.com/new?name=neon-rift&owner=urbanrunnerx&visibility=public and turn on Add README. Public repositories expose their source files; use no credentials or private material here.
2. Extract this GitHub-upload ZIP. Upload its CONTENTS into the repository root, not the ZIP itself and not an extra enclosing folder. `app/`, `docs/`, `settings.gradle` and this README should be at the top level. Preserve the `.github/` folder when uploading it. The reference video is not included.
3. In repository Settings > Pages, choose Deploy from a branch, then `main` and `/docs`, and Save. This branch/folder setting publishes the web edition without waiting for an Android build. A public repository is required for GitHub Pages on GitHub Free.
4. Wait for the GitHub Pages deployment to succeed and use the actual Visit site link in Settings > Pages. The intended installation page is `/neon-rift/install.html` on the user's GitHub Pages domain. It is not live merely because these files exist.

On Android, open the live page in Chrome or Samsung Internet, then tap its install button when offered, or use the browser menu's Add to Home screen / Install app. Use Open and explore to run it directly. Keep it open until Offline ready before testing offline relaunch.

## Development and checks

`node tests/test-web-motion.mjs` — JavaScript motion checks.

`node tests/test-service-worker.cjs` — service-worker logic with mocked CacheStorage, not an actual browser offline test.

`bash tools/test-motion.sh` — native Java motion/syntax checks, not an Android build.

For local browser testing on a computer with an unrestricted local server and WebGL 2, run `python -m http.server 8000 --directory docs` and open `http://localhost:8000/install.html`. Do not use file:// for PWA installation/service-worker testing.

When changing web files, increment the cache version in `docs/sw.js`. A service-worker install requires every listed precache asset to exist. Do not add nonexistent APK or download buttons to the page.

The `.github/workflows/android.yml` workflow runs on source pushes to `main` and supports manual runs from Actions. It uses official Android SDK command-line tools directly, so the Android Studio wrapper bootstrap is not required in CI. It does not deploy the web app. Its release is gated on Android build/emulator checks.

Without optional repository signing secrets, CI generates a temporary development signing key. Different development builds will require uninstalling the old app before installing the new one. For stable updates, configure `NEON_RIFT_KEYSTORE_B64`, `NEON_RIFT_STORE_PASSWORD`, `NEON_RIFT_KEY_PASSWORD`, and `NEON_RIFT_KEY_ALIAS` as repository secrets; never commit the private keystore.

Official references:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.android.com/build/releases/agp-8-9-0-release-notes

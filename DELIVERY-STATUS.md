# Neon Rift — two-edition delivery status

Prepared September 13, 2026.

**Historical preparation report.** The repository access and upload statements below describe the earlier attempt. The repository is now accessible with write permission. Follow the repository Actions and Releases pages for the current CI result; earlier renderer tests do not establish Android runtime success.

## Files supplied

- Native Java / OpenGL ES Android source, now with Android Gradle Plugin 8.9.2 / Gradle 8.11.1 project configuration, application module, and a Gradle-compatible manifest. Original manual SDK build script and manifest remain available.
- First-run Windows PowerShell and macOS/Linux scripts retrieve the official Gradle wrapper, check the wrapper JAR against Gradle's official SHA-256, and add the official distribution checksum. The wrapper JAR could not be downloaded in this environment and is NOT bundled. Run the appropriate setup script on your computer before using the command-line wrapper or importing.
- A separate WebGL 2 web-app edition under docs/, with an installation page, web app manifest, icons, touch controls, preferences, and a service worker. Both GLSL files are byte-identical to the supplied native renderer's assets.

## Executed this turn

- Java motion tests reran successfully: 4,321,123 mostly repeated bounds/finite checks. Five Java source files passed syntax parsing. These are NOT Android SDK type checking or an APK build.
- JavaScript motion tests passed 1,200 frames, deterministic reset/stepping, bounds/finite checks, and invalid input rejection (144,005 mostly repeated assertions).
- The actual service-worker script passed unit tests with mocked CacheStorage and offline fetch: all precached files exist; cached launch URLs with a query resolve; shader assets resolve; other applications' caches and requests are not affected.
- Web app JavaScript passed Node syntax checks. Manifests/resources parsed; all PNG icon dimensions matched the manifest. The copied GLSL files matched the native source byte-for-byte.
- The installation page was rendered in isolated Chromium and its manual-install fallback text was exercised. A screenshot of this local in-memory page is provided. It is NOT proof of GitHub hosting, PWA installation, or WebGL rendering.

## Attempted but not completed

- Browser navigation to the local test server was blocked with ERR_BLOCKED_BY_ADMINISTRATOR. No browser administrator policies were changed.
- An isolated in-memory browser run could not obtain a WebGL 2 context and displayed the app's graphics-unavailable message. This environment therefore did NOT execute the web renderer, touch/graphics integration, real service-worker offline reload, or installability checks end-to-end.
- The supplied shader files have the earlier native-renderer test report; that earlier report does not validate this web edition in an actual browser.
- No Android SDK packaging, Gradle sync, APK generation, emulator install, or physical-phone test occurred. The wrapper-download scripts have not been run successfully against the internet in this environment; direct runtime DNS resolution failed.
- No repository upload, GitHub workflow, release, or GitHub Pages deployment occurred. The connected account is urbanrunnerx. The repository lookup for urbanrunnerx/neon-rift returned 404. The GitHub tools currently exposed in this chat have no write/upload/Pages action.

## Intended deployment address — NOT LIVE OR VERIFIED

https://urbanrunnerx.github.io/neon-rift/install.html

This is a target derived from the selected account/repository name, not an existing installation link. It requires creating the repository, uploading the project files, selecting main /docs as the GitHub Pages publishing source, and completing a successful Pages deployment.

## Remaining verification

Open the hosted site on the intended Android phone. Confirm that the live WebGL view renders, controls and gestures work, the browser offers home-screen installation, and an installed app relaunches offline after its cache reports ready. Separately sync/build the native project and install/run its debug APK. Do not treat the source archive as an APK.

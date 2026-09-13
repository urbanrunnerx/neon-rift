# Neon Rift development

The canonical project is `urbanrunnerx/neon-rift`, branch `main`. Chris wants programming and updates handled in ChatGPT Work, with reviewed source changes uploaded to this repository and an actual APK download link after successful builds. Continue this project instead of creating another repository or replacing its native implementation.

## Application structure

- `app/src/main/java/com/urbanrunnerx/neonrift`: native Java Android UI, settings, gestures, simulation, and OpenGL ES 3 renderer. The native APK uses no HTML or WebView.
- `app/src/main/assets/shaders`: native shader sources. The separate `docs` web edition started with these shaders and now has its own Artist Kit uniforms and effects. Do not copy its shaders into native Android without implementing matching renderer controls.
- `tools/build-apk.sh`: builds with official Android SDK 35 tools, verifies the signed APK, and writes `build/apk/Neon-Rift.apk`.
- `.github/workflows/android.yml`: sets up the SDK, runs motion tests, builds the APK, performs an Android emulator smoke test, and publishes a development prerelease only after success.
- Android Studio uses the Gradle configuration and `app/src/studio/AndroidManifest.xml`. Run `prepare-studio.ps1` or `prepare-studio.sh` to retrieve and verify the missing wrapper before using it.

## Verification and delivery

For native changes, use the real Android workflow and inspect failed-job logs. Check published release assets and the exact build commit before returning an APK URL. Preserve the emulator release gate. A successful Java syntax test or shader render alone does not establish Android success.

For web motion/cache changes, run `node tests/test-web-motion.mjs` and `node tests/test-service-worker.cjs`; these do not replace browser or phone testing. Run `node tests/test-artist-state.mjs` and the `Test web Artist Kit` workflow for toolkit changes; the browser suite checks actual WebGL, PNG output, saved compositions, offline relaunch, install state, and responsive layouts. Increment `docs/sw.js` cache version for web changes. GitHub Pages requires its own repository Pages setup; do not claim it is deployed from source upload alone.

Do not commit private signing keys, credentials, APK build intermediates, or personal reference videos. Without the optional repository signing secrets documented in README.md, CI uses a new development key each run, so different builds require uninstall/reinstall. Do not imply seamless updates until stable signing is configured. Keep changes and version history in GitHub.

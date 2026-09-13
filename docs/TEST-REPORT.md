> Historical native-renderer report from the earlier source delivery.
> Current correction: the GitHub actions exposed in this chat are read-only. No upload, release, or Pages publication has occurred. The statement below that the connector exposes writes must not be relied on.
> See DELIVERY-STATUS.md at the repository root for this delivery.

# Neon Rift — validation report

Prepared September 13, 2026. This report distinguishes executable graphics/motion tests from an Android application build.

## Completed locally

**Native graphics execution:** The exact `fullscreen.vert` and `rift.frag` assets compiled, linked, drew frames, and returned nonblank colored images on native EGL/OpenGL ES. The environment reported `OpenGL ES 3.2 Mesa 25.0.7-2`, with the `llvmpipe (LLVM 19.1.7, 256 bits)` software renderer. No browser or WebGL runtime was used. This is not a measurement of a phone's GPU performance.

**Graphics parameter checks:** 36 combinations (four palettes × three quality levels × three droplet counts) passed at 320×640, and the same 36 passed at 640×320. Tests enabled touch/pulse uniforms and checked for OpenGL errors and blank/flat output. This verifies 72 draws across those parameter/aspect combinations, not 72 Android devices.

**Motion engine:** The pure-Java engine compiled and passed checks for deterministic initialization, deterministic stepping, reset, nonfinite/invalid input rejection, bounded positions/radii under repeated attraction and pulses, 30/60 fps correspondence, and held-touch correspondence at speed settings 0.15, 0.75, 1.3, and 2.0. Its stress loop covered 36,000 frames at 60 nominal frames per second with double-speed motion. The aggregate test counted 4,321,123 assertions, mostly repeated per-particle finite/bounds checks; this number is not a count of independent test scenarios.

**Source integrity:** Five Android Java source files passed Java syntax parsing. XML resources and the manifest parsed. Shell scripts passed Bash syntax checks. Python test files compiled to bytecode. Workflow YAML parsed. These checks do not resolve Android API types or validate GitHub permissions.

**Visual output:** Five stills and an eight-second 20 fps motion preview were rendered. The Android screenshot color-check utility was also exercised on a native-renderer PNG. The resulting images/video show the renderer alone, not the Android controls and not an emulator session.

## Not completed

- Android SDK compilation, resource packaging, DEX generation, APK signing, signature verification, or alignment verification.
- Installing or launching this application on an Android emulator or physical phone.
- Android UI interaction, cutout/inset placement, rotation behavior, process recreation, or pause/resume validation on a device.
- Physical-device performance, 30/60 fps targets, battery usage, thermals, or Android 17 compatibility.
- GitHub project upload, workflow execution, release publication, or an APK installation link.

A real invocation of `tools/build-apk.sh` exited with code 2 and the message `ERROR: Set ANDROID_HOME to an installed Android SDK.` No Android SDK/platform/build-tools were found in the environment. Direct acquisition attempts did not succeed. There is no APK in this delivery, and the source archive must not be renamed to `.apk`.

## Next executable gate

The prepared `.github/workflows/android.yml` performs an actual Android compile, signing/structure verification, emulator installation/launch, screenshot color check, basic touch injection, and background/resume check. It is configured to publish a downloadable **development** APK only after those steps pass. It has not run and may need changes in response to real build or emulator errors.

The connected GitHub account was verified and its existing repositories inspected. None is the new `neon-rift` project. The available connector exposes writes to existing repositories, but not creation of a new repository. An initialized repository is needed before that upload/build route can proceed.

## Evidence files

- `tests/final-test-results.txt`
- `tests/shader-results.txt`
- `tests/matrix-portrait-results.txt`
- `tests/matrix-landscape-results.txt`
- `tests/motion-render-results.txt`
- `tests/android-build-attempt.txt`
- `docs/renderer/preview-000.png` through `preview-004.png`

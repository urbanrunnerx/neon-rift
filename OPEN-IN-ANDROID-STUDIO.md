# Open Neon Rift in Android Studio

This is the native Java / OpenGL ES edition. There is no HTML or WebView in the Android application. It is SOURCE, not a compiled APK.

1. Extract the ZIP on your computer.
2. Prepare the official Gradle wrapper once, while connected to the internet:
   - Windows: right-click `prepare-studio.ps1` and choose Run with PowerShell, or run `powershell -File .\prepare-studio.ps1` from this folder. Review the script first. It downloads from Gradle's official repository and checks the wrapper JAR's official SHA-256. It does not change PowerShell execution policy. If your organization blocks scripts, ask its administrator rather than weakening the policy.
   - macOS/Linux: run `bash prepare-studio.sh` from this folder.
3. Android Studio > Open > select the extracted `neon-rift-android` folder containing `settings.gradle`. Do not select only the app folder or the ZIP.
4. Use JDK 17 for Gradle, allow dependency synchronization, and install Android SDK Platform 35 / Build Tools when requested. Internet access is required for the first setup.
5. Select the app run configuration and an emulator or connected Android phone, then Run. Android Studio builds and installs an APK for the native application; the source files alone are not installable.

Versions: Android Gradle Plugin 8.9.2; Gradle 8.11.1; compile/target SDK 35; minimum SDK 26; OpenGL ES 3.0 required. These are pinned project versions, not a claim they are the newest releases.

The earlier archive omitted Gradle project configuration. This delivery adds it. Gradle sync, Android SDK compilation and phone installation have NOT yet been validated. The official wrapper JAR is downloaded by the setup script rather than included; that download could not be executed in the development environment.

`tools/build-apk.sh` is the original separate command-line Android SDK route. `app/src/studio/AndroidManifest.xml` is used by Gradle; `app/src/main/AndroidManifest.xml` is retained for the original direct SDK builder.

Reference: https://developer.android.com/build/releases/agp-8-9-0-release-notes

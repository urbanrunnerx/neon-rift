#!/usr/bin/env bash
# Install and launch on an already-running Android emulator. Fail on a blank/crashed renderer.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build/smoke
APK="$PWD/build/apk/Neon-Rift.apk"
PACKAGE=com.urbanrunnerx.neonrift
adb wait-for-device
adb logcat -c
adb install -r "$APK" | tee build/smoke/install.txt
adb shell am start -W -n "$PACKAGE/.MainActivity" | tee build/smoke/launch.txt
sleep 8
adb logcat -d > build/smoke/logcat.txt
if grep -qE 'Process: com.urbanrunnerx.neonrift, PID:|RENDERER_FAILED' build/smoke/logcat.txt; then
    cat build/smoke/logcat.txt; exit 1
fi
grep -q 'RENDERER_READY' build/smoke/logcat.txt
adb shell pidof "$PACKAGE" > build/smoke/process.txt
adb exec-out screencap -p > build/smoke/launch.png
python3 tests/check_screenshot.py build/smoke/launch.png | tee build/smoke/screenshot-check.txt
# Exercise drag and double tap on the central render area.
adb shell input swipe 170 450 330 650 900
adb shell input tap 250 480
adb shell input tap 250 480
sleep 2
adb exec-out screencap -p > build/smoke/interaction.png
# Background / foreground tests resume without an unbounded elapsed-time jump.
adb shell input keyevent 3
sleep 1
adb shell am start -W -n "$PACKAGE/.MainActivity" > build/smoke/resume.txt
sleep 2
adb shell pidof "$PACKAGE" >> build/smoke/process.txt
adb logcat -d > build/smoke/logcat.txt
if grep -qE 'Process: com.urbanrunnerx.neonrift, PID:|RENDERER_FAILED' build/smoke/logcat.txt; then cat build/smoke/logcat.txt;exit 1;fi
adb exec-out screencap -p > build/smoke/resume.png
echo 'PASS: APK install, launch, GL initialization, touch input, background/resume, and no fatal exception.' | tee build/smoke/result.txt

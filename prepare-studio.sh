#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
base='https://raw.githubusercontent.com/gradle/gradle/v8.11.1'
jar='gradle/wrapper/gradle-wrapper.jar'
expected=$(curl -fLsS 'https://services.gradle.org/distributions/gradle-8.11.1-wrapper.jar.sha256' | tr -d '\r\n ')
[[ "$expected" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid official wrapper checksum'; exit 1; }
curl -fLsS "$base/gradle/wrapper/gradle-wrapper.jar" -o "$jar.tmp"
if command -v sha256sum >/dev/null; then actual=$(sha256sum "$jar.tmp" | cut -d' ' -f1); else actual=$(shasum -a 256 "$jar.tmp" | cut -d' ' -f1); fi
[[ "$expected" == "$actual" ]] || { rm -f "$jar.tmp"; echo 'Wrapper checksum mismatch'; exit 1; }
mv "$jar.tmp" "$jar"
curl -fLsS "$base/gradlew" -o gradlew
curl -fLsS "$base/gradlew.bat" -o gradlew.bat
chmod +x gradlew
distHash=$(curl -fLsS 'https://services.gradle.org/distributions/gradle-8.11.1-bin.zip.sha256' | tr -d '\r\n ')
[[ "$distHash" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid distribution checksum'; exit 1; }
grep -v '^distributionSha256Sum=' gradle/wrapper/gradle-wrapper.properties > gradle/wrapper/gradle-wrapper.properties.tmp
printf '\ndistributionSha256Sum=%s\n' "$distHash" >> gradle/wrapper/gradle-wrapper.properties.tmp
mv gradle/wrapper/gradle-wrapper.properties.tmp gradle/wrapper/gradle-wrapper.properties
echo 'Official Gradle wrapper verified. Open this folder in Android Studio.'

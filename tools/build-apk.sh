#!/usr/bin/env bash
# Build with official Android SDK tools; no Gradle, Node, WebView, or network at build time.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDK" ]]; then
    echo 'ERROR: Set ANDROID_HOME to an installed Android SDK.' >&2; exit 2
fi
BUILD_TOOLS="${RIFT_BUILD_TOOLS:-35.0.0}"
BT="$SDK/build-tools/$BUILD_TOOLS"
ANDROID_JAR="$SDK/platforms/android-35/android.jar"
for file in "$BT/aapt2" "$BT/d8" "$BT/zipalign" "$BT/apksigner" "$ANDROID_JAR"; do
    [[ -f "$file" ]] || { echo "ERROR: Missing $file. Install platforms;android-35 and build-tools;35.0.0." >&2; exit 2; }
done
for command in javac java jar keytool zip unzip python3; do
    command -v "$command" >/dev/null || { echo "ERROR: Missing $command." >&2; exit 2; }
done
SRC="$ROOT/app/src/main"
OUT="$ROOT/build/apk"
rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/gen" "$OUT/dex"
echo 'Compiling resources…'
"$BT/aapt2" compile --dir "$SRC/res" -o "$OUT/resources.zip"
"$BT/aapt2" link -o "$OUT/resources.apk" --manifest "$SRC/AndroidManifest.xml" \
    -I "$ANDROID_JAR" -A "$SRC/assets" --java "$OUT/gen" --auto-add-overlay "$OUT/resources.zip"
echo 'Compiling Java…'
find "$SRC/java" "$OUT/gen" -name '*.java' | sort > "$OUT/sources.txt"
javac -encoding UTF-8 -source 8 -target 8 -classpath "$ANDROID_JAR" \
    -d "$OUT/classes" @"$OUT/sources.txt"
jar cf "$OUT/classes.jar" -C "$OUT/classes" .
"$BT/d8" --release --min-api 26 --lib "$ANDROID_JAR" --output "$OUT/dex" "$OUT/classes.jar"
cp "$OUT/resources.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes*.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
# The first development build gets a locally private key, never committed to Git.
# CI does NOT cache or publish keys. Configure signing secrets for stable updates.
if [[ -z "${RIFT_KEYSTORE_PATH:-}" ]]; then
    export RIFT_KEYSTORE_PATH="$HOME/.android/neon-rift-development.jks"
    export RIFT_STORE_PASSWORD=android RIFT_KEY_PASSWORD=android RIFT_KEY_ALIAS=neon-rift
    if [[ ! -f "$RIFT_KEYSTORE_PATH" ]]; then
        mkdir -p "$(dirname "$RIFT_KEYSTORE_PATH")"
        keytool -genkeypair -noprompt -keystore "$RIFT_KEYSTORE_PATH" \
            -storepass "$RIFT_STORE_PASSWORD" -keypass "$RIFT_KEY_PASSWORD" -alias "$RIFT_KEY_ALIAS" \
            -keyalg RSA -keysize 2048 -validity 10000 \
            -dname 'CN=Neon Rift Development, OU=Personal App, O=Neon Rift, C=US'
    fi
fi
: "${RIFT_STORE_PASSWORD:?Set RIFT_STORE_PASSWORD for the supplied keystore}"
export RIFT_KEY_PASSWORD="${RIFT_KEY_PASSWORD:-$RIFT_STORE_PASSWORD}"
export RIFT_KEY_ALIAS="${RIFT_KEY_ALIAS:-neon-rift}"
export RIFT_STORE_PASSWORD
[[ -f "$RIFT_KEYSTORE_PATH" ]] || { echo 'ERROR: Signing keystore is missing.' >&2; exit 2; }
"$BT/apksigner" sign --ks "$RIFT_KEYSTORE_PATH" --ks-key-alias "$RIFT_KEY_ALIAS" \
    --ks-pass env:RIFT_STORE_PASSWORD --key-pass env:RIFT_KEY_PASSWORD \
    --out "$OUT/Neon-Rift.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs "$OUT/Neon-Rift.apk" | tee "$OUT/signature-verification.txt"
"$BT/zipalign" -c -v 4 "$OUT/Neon-Rift.apk" > "$OUT/alignment-verification.txt"
"$BT/aapt" dump badging "$OUT/Neon-Rift.apk" > "$OUT/package-information.txt"
python3 - "$OUT/Neon-Rift.apk" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    files=z.namelist()
    for required in ['classes.dex','AndroidManifest.xml','resources.arsc','assets/shaders/rift.frag']:
        assert required in files, 'Missing '+required
    assert not any(n.endswith(('.html','.htm','.js')) for n in files), 'Unexpected web content'
    assert not any(n.endswith('.jks') for n in files), 'Signing key must not ship in APK'
print('PASS: APK structure and absence of HTML/JavaScript/signing keys')
PY
(cd "$OUT" && sha256sum Neon-Rift.apk > Neon-Rift.apk.sha256)
echo "Built and verified: $OUT/Neon-Rift.apk"

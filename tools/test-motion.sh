#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build/tests
javac -d build/tests app/src/main/java/com/urbanrunnerx/neonrift/RiftSimulation.java tests/SimulationTest.java tests/JavaSyntaxCheck.java
java -cp build/tests SimulationTest | tee build/tests/simulation-results.txt
java -cp build/tests JavaSyntaxCheck app/src/main/java/com/urbanrunnerx/neonrift/*.java | tee build/tests/java-syntax-results.txt

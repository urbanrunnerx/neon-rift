# Downloads the official Gradle wrapper and checks its official SHA-256 before use.
# No execution-policy settings are changed. Run with PowerShell on your computer.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$base = 'https://raw.githubusercontent.com/gradle/gradle/v8.11.1'
$jar = Join-Path $PSScriptRoot 'gradle/wrapper/gradle-wrapper.jar'
function Get-RemoteChecksum([string]$Url) {
    $value = (Invoke-WebRequest -UseBasicParsing $Url).Content
    $text = if ($value -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($value) } else { [string]$value }
    return $text.Trim().ToLowerInvariant()
}
$expected = Get-RemoteChecksum 'https://services.gradle.org/distributions/gradle-8.11.1-wrapper.jar.sha256' 
if ($expected -notmatch '^[a-f0-9]{64}$') { throw 'Invalid official wrapper checksum response.' }
Invoke-WebRequest -UseBasicParsing "$base/gradle/wrapper/gradle-wrapper.jar" -OutFile "$jar.tmp"
$actual = (Get-FileHash "$jar.tmp" -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { Remove-Item "$jar.tmp"; throw 'Wrapper checksum mismatch. Nothing executed.' }
Move-Item -Force "$jar.tmp" $jar
Invoke-WebRequest -UseBasicParsing "$base/gradlew" -OutFile 'gradlew'
Invoke-WebRequest -UseBasicParsing "$base/gradlew.bat" -OutFile 'gradlew.bat'
$distHash = Get-RemoteChecksum 'https://services.gradle.org/distributions/gradle-8.11.1-bin.zip.sha256'
if ($distHash -notmatch '^[a-f0-9]{64}$') { throw 'Invalid Gradle distribution checksum response.' }
$properties = Get-Content 'gradle/wrapper/gradle-wrapper.properties' | Where-Object { $_ -notmatch '^distributionSha256Sum=' }
@($properties; "distributionSha256Sum=$distHash") | Set-Content -Encoding ASCII 'gradle/wrapper/gradle-wrapper.properties'
Write-Host 'Gradle wrapper verified. Open this folder in Android Studio, then sync and build.'

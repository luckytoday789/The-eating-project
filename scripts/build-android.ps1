param([switch]$Tests)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$webRoot = Join-Path $projectRoot 'daily-journal'
if (!(Test-Path -LiteralPath (Join-Path $webRoot 'app.js'))) { $webRoot = $projectRoot }
$toolRoot = 'E:\HH\tools'
$env:JAVA_HOME = Join-Path $toolRoot 'jdk\jdk-17.0.20.1+1'
$env:ANDROID_HOME = Join-Path $toolRoot 'android-sdk'
$env:ANDROID_USER_HOME = Join-Path $projectRoot '.build-cache\android-user'
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.build-cache\gradle'
$env:GRADLE_OPTS = '-Dorg.gradle.native=false -Dfile.encoding=UTF-8'
$private = Join-Path $projectRoot 'private'
$release = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Path $private,$release,$env:ANDROID_USER_HOME,(Join-Path $env:GRADLE_USER_HOME 'caches') -Force | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $env:GRADLE_USER_HOME 'caches\modules-2'))) {
    & robocopy (Join-Path $toolRoot 'gradle-cache\caches\modules-2') (Join-Path $env:GRADLE_USER_HOME 'caches\modules-2') /E /XF '*.lock' 'gc.properties' /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw 'Unable to copy the Android dependency cache' }
}
$config = Join-Path $private 'android-signing.properties'
$key = Join-Path $private 'dailytraces-release.p12'
if (!(Test-Path -LiteralPath $config)) {
    if (Test-Path -LiteralPath $key) { throw 'Signing key exists without its configuration. Restore it before building.' }
    $random = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $generator.GetBytes($random); $generator.Dispose()
    $env:DAILYTRACES_KEY_PASSWORD = [Convert]::ToBase64String($random)
    try {
        & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -genkeypair -keystore $key -storetype PKCS12 -alias dailytraces-release -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Daily Traces, O=Personal Journal, C=CN' -storepass:env DAILYTRACES_KEY_PASSWORD -keypass:env DAILYTRACES_KEY_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Release signing key generation failed' }
        $content = "storeFile=../../private/dailytraces-release.p12`nstorePassword=$env:DAILYTRACES_KEY_PASSWORD`nkeyAlias=dailytraces-release`nkeyPassword=$env:DAILYTRACES_KEY_PASSWORD`n"
        [IO.File]::WriteAllText($config,$content,(New-Object Text.UTF8Encoding $false))
    } finally { Remove-Item Env:DAILYTRACES_KEY_PASSWORD -ErrorAction SilentlyContinue }
}
$node = 'C:\Users\刘奥华\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --check (Join-Path $webRoot 'app.js')
if ($LASTEXITCODE -ne 0) { throw 'App script syntax check failed' }
& $node --check (Join-Path $webRoot 'mobile.js')
if ($LASTEXITCODE -ne 0) { throw 'Interaction script syntax check failed' }
& $node (Join-Path $webRoot 'tests\core.test.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Data checks failed' }
$tasks = @('assembleRelease')
if ($Tests) { $tasks += @('assembleDebug','assembleDebugAndroidTest') }
& (Join-Path $toolRoot 'gradle\gradle-8.11.1\bin\gradle.bat') -p (Join-Path $projectRoot 'android') --offline --no-daemon --console=plain @tasks
if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
$versionSource = [IO.File]::ReadAllText((Join-Path $projectRoot 'android\app\build.gradle'))
$version = [regex]::Match($versionSource, "versionName\s+'([^']+)'").Groups[1].Value
if (!$version) { throw 'Android versionName was not found' }
$output = Join-Path $release "日常有迹-$version.apk"
Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk') -Destination $output
& (Join-Path $toolRoot 'android-sdk\build-tools\35.0.0\apksigner.bat') verify --verbose --print-certs $output
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
$hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText(($output + '.sha256'),"$hash  日常有迹-$version.apk`n",(New-Object Text.UTF8Encoding $false))
Write-Output "APK: $output"

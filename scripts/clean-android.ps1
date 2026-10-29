param([switch]$Preview)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$prefix = $projectRoot + [IO.Path]::DirectorySeparatorChar
$generated = @('.build-cache','.android-test','android\.gradle','android\build','android\app\build','android\app\src\main\assets\www')
$checked = @()
foreach ($relative in $generated) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
    if (!$target.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe cleanup target: $target" }
    if (Test-Path -LiteralPath $target) {
        $resolved = (Resolve-Path -LiteralPath $target).Path
        if (!$resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Cleanup target escaped workspace: $resolved" }
        $item = Get-Item -LiteralPath $resolved -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Refusing linked cleanup target: $resolved" }
        $checked += $resolved
    }
}
foreach ($target in $checked) {
    if ($Preview) { Write-Output "Would remove: $target" }
    else { Remove-Item -LiteralPath $target -Recurse -Force; Write-Output "Removed: $target" }
}
Write-Output 'Source, release files and private signing key are preserved.'

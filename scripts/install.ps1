[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$DiscordPath,
    [ValidateSet('stable', 'ptb', 'canary')]
    [string]$Channel = 'stable',
    [switch]$Uninstall,
    [switch]$Restart
)

$ErrorActionPreference = 'Stop'
$appName = @{ stable = 'Discord'; ptb = 'DiscordPTB'; canary = 'DiscordCanary' }[$Channel]
$exeName = "$appName.exe"

if (-not $DiscordPath) {
    $DiscordPath = Join-Path $env:LOCALAPPDATA $appName
}
if (-not (Test-Path -LiteralPath $DiscordPath -PathType Container)) {
    throw "Discord was not found at '$DiscordPath'. Specify its installation directory with -DiscordPath."
}

$appDirectory = Get-Item -LiteralPath $DiscordPath
if (-not ((Test-Path -LiteralPath (Join-Path $appDirectory.FullName $exeName) -PathType Leaf) -and
    (Test-Path -LiteralPath (Join-Path $appDirectory.FullName 'resources\app.asar') -PathType Leaf))) {
    $appDirectory = Get-ChildItem -LiteralPath $DiscordPath -Directory |
        Where-Object {
            $_.Name -match '^app-\d+\.\d+\.\d+(\.\d+)?$' -and
            (Test-Path -LiteralPath (Join-Path $_.FullName $exeName) -PathType Leaf) -and
            (Test-Path -LiteralPath (Join-Path $_.FullName 'resources\app.asar') -PathType Leaf)
        } |
        Sort-Object { [version]$_.Name.Substring(4) } -Descending |
        Select-Object -First 1
}
if (-not $appDirectory) {
    throw "No installed $appName version containing resources\app.asar was found at '$DiscordPath'."
}

$executable = Join-Path $appDirectory.FullName $exeName
$running = Get-Process -Name $appName -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $executable }
if ($running) {
    throw "Close $appName completely, including its system tray icon, then run this command again."
}

$target = Join-Path $appDirectory.FullName 'resources\app.asar'
$backup = "$target.openasar-backup"
if ($Uninstall) {
    if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
        throw "No original Discord backup was found at '$backup'."
    }
    if (-not $PSCmdlet.ShouldProcess($target, 'Restore the original Discord app.asar')) {
        return
    }
    Copy-Item -LiteralPath $backup -Destination $target -Force
    Write-Host "Restored Discord from '$backup'."
} else {
    $source = Join-Path (Split-Path -Parent $PSScriptRoot) 'app.asar'
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Build '$source' first by running npm install and npm run build in the repository directory."
    }
    $stream = [System.IO.File]::OpenRead($source)
    try {
        $header = New-Object byte[] 4
        if ($stream.Length -lt 16 -or $stream.Read($header, 0, 4) -ne 4 -or
            [BitConverter]::ToUInt32($header, 0) -ne 4) {
            throw "'$source' is not a valid ASAR archive. Run npm run build again."
        }
    } finally {
        $stream.Dispose()
    }
    if (-not $PSCmdlet.ShouldProcess($target, 'Back up Discord and install OpenAsar')) {
        return
    }
    if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
        Copy-Item -LiteralPath $target -Destination $backup
    }
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Host "Installed OpenAsar into '$target'."
    Write-Host "Original Discord backup: '$backup'."
}

if ($Restart) {
    Start-Process -FilePath $executable -WindowStyle Hidden
} else {
    Write-Host "Start $appName normally to use the installed version."
}

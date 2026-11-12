[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidatePattern('^[a-zA-Z0-9_-]+$')]
    [string]$ProfileName = 'second',
    [ValidateSet('stable', 'ptb', 'canary')]
    [string]$Channel = 'stable'
)

$ErrorActionPreference = 'Stop'
$appName = @{ stable = 'Discord'; ptb = 'DiscordPTB'; canary = 'DiscordCanary' }[$Channel]
$installDirectory = Join-Path $env:LOCALAPPDATA $appName
$appDirectory = Get-ChildItem -LiteralPath $installDirectory -Directory |
    Where-Object {
        $_.Name -match '^app-\d+\.\d+\.\d+(\.\d+)?$' -and
        (Test-Path -LiteralPath (Join-Path $_.FullName "$appName.exe") -PathType Leaf)
    } |
    Sort-Object { [version]$_.Name.Substring(4) } -Descending |
    Select-Object -First 1
if (-not $appDirectory) {
    throw "No installed $appName version was found at '$installDirectory'."
}

$userData = Join-Path $env:APPDATA "OpenAsar\profiles\$Channel\$ProfileName"
if (-not $PSCmdlet.ShouldProcess($userData, "Open $appName with a separate profile")) {
    return
}
New-Item -ItemType Directory -Path $userData -Force | Out-Null
$settingsFile = Join-Path $userData 'settings.json'
if (-not (Test-Path -LiteralPath $settingsFile)) {
    [System.IO.File]::WriteAllText($settingsFile, '{"openasar":{"setup":true}}')
}

$previousUserData = [Environment]::GetEnvironmentVariable('DISCORD_USER_DATA_DIR', 'Process')
try {
    $env:DISCORD_USER_DATA_DIR = $userData
    Start-Process -FilePath (Join-Path $appDirectory.FullName "$appName.exe") -WindowStyle Hidden
} finally {
    [Environment]::SetEnvironmentVariable('DISCORD_USER_DATA_DIR', $previousUserData, 'Process')
}
Write-Host "Opened $appName profile '$ProfileName'. Sign in to the account for this profile."
Write-Host "Profile data: '$userData'. Reuse the same profile name to keep its login."

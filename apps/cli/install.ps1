# DepVault CLI installer for Windows
# Usage: irm https://get.depvault.com | iex

$ErrorActionPreference = "Stop"

$Repo = "suxrobGM/depvault"
$Rid = "win-x64"
$BinaryName = "depvault.exe"
$InstallDir = if ($env:DEPVAULT_INSTALL_DIR) { $env:DEPVAULT_INSTALL_DIR } else { "$env:USERPROFILE\.depvault\bin" }

function Write-Info($Message) {
    Write-Host $Message -ForegroundColor Green
}

function Get-LatestVersion {
    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" -Headers @{ "User-Agent" = "depvault-installer" }

    $cliRelease = $releases | Where-Object { $_.tag_name -like "cli/v*" } | Select-Object -First 1

    if (-not $cliRelease) {
        throw "Could not find a CLI release. Check https://github.com/$Repo/releases"
    }

    $version = $cliRelease.tag_name -replace "^cli/", ""
    return $version
}

function Install-DepVault {
    $version = Get-LatestVersion
    $tag = "cli/$version"
    $archive = "depvault-$Rid.zip"
    $url = "https://github.com/$Repo/releases/download/$tag/$archive"

    $tempDir = Join-Path $env:TEMP "depvault-install-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        Write-Info "Downloading DepVault CLI $version for $Rid..."
        $archivePath = Join-Path $tempDir $archive
        Invoke-WebRequest -Uri $url -OutFile $archivePath -UseBasicParsing

        Write-Info "Extracting to $InstallDir..."
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Expand-Archive -Path $archivePath -DestinationPath $InstallDir -Force
    }
    finally {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    # Add to user PATH if not already there
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$userPath", "User")
        Write-Info "Added $InstallDir to user PATH."
    }

    # Update current session PATH
    if ($env:Path -notlike "*$InstallDir*") {
        $env:Path = "$InstallDir;$env:Path"
    }

    Write-Host ""
    Write-Info "DepVault CLI $version installed successfully!"
    Write-Host ""
    Write-Host "  Location: $InstallDir\$BinaryName"
    Write-Host ""
    Write-Host "  Run 'depvault --help' to get started."
    Write-Host "  Run 'depvault login' to authenticate."
    Write-Host ""

    $installed = Get-Command depvault -ErrorAction SilentlyContinue
    if (-not $installed) {
        Write-Host "  NOTE: Restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
        Write-Host ""
    }
}

Install-DepVault

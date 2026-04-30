<#
.SYNOPSIS
    EZ AD -- Install or update from GitHub.

.DESCRIPTION
    Fresh install: clones the repo, installs dependencies, builds, registers a
    Windows Scheduled Task (SYSTEM), and opens the firewall.
    Update: pulls latest code, rebuilds, and restarts the task.
    Credentials are stored as a bcrypt hash -- never plaintext.

.PARAMETER InstallPath
    Where to install EZ AD. Defaults to C:\EzAD

.PARAMETER Port
    Port to serve on. Defaults to 3000.

.PARAMETER Username
    Admin username for the web UI. Defaults to "admin".

.PARAMETER Password
    Admin password for the web UI. Required for fresh install; prompted if omitted.

.PARAMETER Secret
    JWT signing secret. Auto-generated if not provided.

.PARAMETER ADGroup
    Active Directory group whose members may log in with their domain credentials.
    Defaults to "Domain Admins". Set to "" to disable AD authentication.

.PARAMETER RepoUrl
    Git repository URL.

.PARAMETER Update
    Pull latest code and rebuild without changing credentials or re-registering
    the scheduled task.

.EXAMPLE
    irm https://raw.githubusercontent.com/dalt0n0/EZAD/main/install.ps1 | iex
    .\install.ps1 -Update
    .\install.ps1 -Password x -Uninstall
#>

param(
    [string]$InstallPath = "C:\EzAD",
    [int]$Port = 3000,
    [string]$Username = "admin",
    [string]$Password = "",
    [string]$Secret = "",
    [string]$ADGroup = "Domain Admins",
    [string]$RepoUrl = "https://github.com/dalt0n0/EZAD.git",
    [switch]$Update,
    [switch]$SkipFirewall,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "EzAD"


# Require admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Run this script from an elevated (Administrator) PowerShell prompt." -ForegroundColor Red
    return
}

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "   [!!] $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "   [XX] $msg" -ForegroundColor Red; throw $msg }

# -- Uninstall ----------------------------------------------------------------
if ($Uninstall) {
    Write-Step "Uninstalling EZ AD"
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-OK "Scheduled task removed"
    }
    Remove-NetFirewallRule -DisplayName "EZ AD Web UI" -ErrorAction SilentlyContinue
    Write-OK "Firewall rule removed (if existed)"
    Write-Host ""
    Write-Host "To remove files: Remove-Item '$InstallPath' -Recurse -Force" -ForegroundColor Yellow
    return
}

Write-Host ""
Write-Host "  EZ AD -- Easy Active Directory" -ForegroundColor Blue
if ($Update) {
    Write-Host "  Updating from GitHub..." -ForegroundColor Blue
} else {
    Write-Host "  Installing from GitHub..." -ForegroundColor Blue
}
Write-Host ""

# -- Check: Node.js -----------------------------------------------------------
Write-Step "Checking prerequisites"

try {
    $nodeVersion = (node --version 2>&1).Trim()
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajor -lt 18) {
        Write-Fail "Node.js $nodeVersion found but v18+ required. Download from https://nodejs.org"
    }
    Write-OK "Node.js $nodeVersion"
} catch {
    Write-Fail "Node.js not found. Install from https://nodejs.org (v18 LTS or newer)"
}

try {
    $gitVersion = (git --version 2>&1).Trim()
    Write-OK "Git: $gitVersion"
} catch {
    Write-Fail "Git not found. Install from https://git-scm.com"
}

# -- Check: RSAT --------------------------------------------------------------
$adModule = Get-Module -ListAvailable -Name ActiveDirectory
$gpModule  = Get-Module -ListAvailable -Name GroupPolicy
if (-not $adModule) {
    Write-Warn "ActiveDirectory module not found -- AD features will fail. Install RSAT."
} else {
    Write-OK "ActiveDirectory module: $($adModule.Version)"
}
if (-not $gpModule) {
    Write-Warn "GroupPolicy module not found -- GPO features will fail. Install RSAT."
} else {
    Write-OK "GroupPolicy module found"
}

# -- Update path --------------------------------------------------------------
if ($Update) {
    if (-not (Test-Path "$InstallPath\.git")) {
        Write-Fail "No git repo found at $InstallPath. Run without -Update to do a fresh install."
    }

    Write-Step "Pulling latest code"
    Push-Location $InstallPath
    try {
        git pull
        if ($LASTEXITCODE -ne 0) { Write-Fail "git pull failed." }
    } finally {
        Pop-Location
    }

    Write-Step "Installing dependencies"
    Push-Location $InstallPath
    try {
        npm ci --loglevel=error
        if ($LASTEXITCODE -ne 0) { npm install --loglevel=error }
        Write-OK "Dependencies up to date"
    } finally {
        Pop-Location
    }

    Write-Step "Building"
    Push-Location $InstallPath
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed. Check Node.js version." }
        Write-OK "Build successful"
    } finally {
        Pop-Location
    }

    Write-Step "Restarting EZ AD"
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3
    Write-OK "Task restarted: $((Get-ScheduledTask -TaskName $TaskName).State)"

    Write-Host ""
    Write-Host "  EZ AD updated successfully." -ForegroundColor Green
    Write-Host ""
    return
}

# -- Fresh install: prompt for password if not provided -----------------------
if (-not $Password) {
    $securePass = Read-Host "  Enter web UI password for '$Username'" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass))
    if (-not $Password) { Write-Fail "Password cannot be empty." }
}

# -- Clone repo ---------------------------------------------------------------
Write-Step "Cloning repository"

if (Test-Path "$InstallPath\.git") {
    Write-OK "Repo already cloned at $InstallPath -- skipping clone"
} elseif (Test-Path $InstallPath) {
    Push-Location $InstallPath
    try {
        git clone $RepoUrl .
        if ($LASTEXITCODE -ne 0) { Write-Fail "Git clone failed." }
        Write-OK "Cloned into existing directory"
    } finally {
        Pop-Location
    }
} else {
    git clone $RepoUrl $InstallPath
    if ($LASTEXITCODE -ne 0) { Write-Fail "Git clone failed." }
    Write-OK "Cloned to $InstallPath"
}

# -- Install dependencies -----------------------------------------------------
Write-Step "Installing dependencies (this may take a minute)"
Push-Location $InstallPath
try {
    npm ci *>$null
    if ($LASTEXITCODE -ne 0) { npm install *>$null }
    Write-OK "Dependencies installed"
} finally {
    Pop-Location
}

# -- Hash the admin password --------------------------------------------------
Write-Step "Hashing admin password"

$env:EZAD_SETUP_PASS = $Password
try {
    # Capture stdout only; stderr goes to host without triggering NativeCommandError
    $hash = (node "$InstallPath\scripts\hash-password.mjs")
    if ($LASTEXITCODE -ne 0 -or -not $hash) { Write-Fail "Password hashing failed." }
    Write-OK "Password hashed (bcrypt, cost 12)"
} finally {
    Remove-Item Env:EZAD_SETUP_PASS -ErrorAction SilentlyContinue
}

# Clear plaintext password from memory as soon as we have the hash
$Password = $null

# -- Build --------------------------------------------------------------------
Write-Step "Building EZ AD (1-2 minutes)"
Push-Location $InstallPath
try {
    npm run build *>$null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed. Check Node.js version." }
    Write-OK "Build successful"
} finally {
    Pop-Location
}

# -- Write .env.local ---------------------------------------------------------
Write-Step "Writing configuration"

$secretValue = if ($Secret) {
    $Secret
} else {
    [System.Convert]::ToBase64String(
        [System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString())
    )
}

$envLines = @(
    "EZAD_USERNAME=$Username",
    "EZAD_PASSWORD_HASH=$hash",
    "EZAD_SECRET=$secretValue",
    "EZAD_AD_GROUP=$ADGroup",
    "PORT=$Port"
)
$envContent = $envLines -join "`r`n"
[System.IO.File]::WriteAllText("$InstallPath\.env.local", $envContent, [System.Text.Encoding]::UTF8)
Write-OK ".env.local written (password stored as bcrypt hash)"

# -- Scheduled Task -----------------------------------------------------------
Write-Step "Registering startup task (runs as SYSTEM)"

$nextBin    = "$InstallPath\node_modules\next\dist\bin\next"
$wrapperPs1 = "$InstallPath\start-ezad.ps1"

# Wrapper sets runtime env vars -- hash is safe to store, no plaintext password
$wrapperLines = @(
    "`$env:EZAD_USERNAME      = '$Username'",
    "`$env:EZAD_PASSWORD_HASH = '$hash'",
    "`$env:EZAD_SECRET        = '$secretValue'",
    "`$env:EZAD_AD_GROUP      = '$ADGroup'",
    "`$env:PORT               = '$Port'",
    "`$env:HOSTNAME           = '0.0.0.0'",
    "Set-Location '$InstallPath'",
    "& node '$nextBin' start --port $Port"
)
$wrapperContent = $wrapperLines -join "`r`n"
[System.IO.File]::WriteAllText($wrapperPs1, $wrapperContent, [System.Text.Encoding]::UTF8)

$action    = New-ScheduledTaskAction `
                -Execute "powershell.exe" `
                -Argument ("-NonInteractive -ExecutionPolicy Bypass -File `"" + $wrapperPs1 + "`"") `
                -WorkingDirectory $InstallPath
$trigger   = New-ScheduledTaskTrigger -AtStartup
$settings  = New-ScheduledTaskSettingsSet `
                -RestartCount 3 `
                -RestartInterval (New-TimeSpan -Minutes 1) `
                -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal `
    -Description "EZ AD -- Easy Active Directory web UI" | Out-Null
Write-OK "Task '$TaskName' registered (runs at startup as SYSTEM)"

# -- Start it now -------------------------------------------------------------
Write-Step "Starting EZ AD"
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 5
$taskState = (Get-ScheduledTask -TaskName $TaskName).State
Write-OK "Task state: $taskState"

# -- Firewall -----------------------------------------------------------------
if (-not $SkipFirewall) {
    Write-Step "Adding firewall rule for port $Port"
    Remove-NetFirewallRule -DisplayName "EZ AD Web UI" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "EZ AD Web UI" -Direction Inbound -Protocol TCP `
        -LocalPort $Port -Action Allow -Profile Domain,Private | Out-Null
    Write-OK "Firewall rule added (TCP $Port, Domain+Private)"
}

# -- Done ---------------------------------------------------------------------
$hostname = $env:COMPUTERNAME
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "  EZ AD installed successfully!" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL:      http://${hostname}:${Port}" -ForegroundColor Green
Write-Host "  Also:     http://localhost:${Port}" -ForegroundColor Green
Write-Host "  Username: $Username (local admin)" -ForegroundColor Green
Write-Host "  AD login: members of '$ADGroup'" -ForegroundColor Green
Write-Host ""
Write-Host "  To update:  .\install.ps1 -Update"
Write-Host "  To stop:    Stop-ScheduledTask -TaskName '$TaskName'"
Write-Host "  To start:   Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  To remove:  .\install.ps1 -Password x -Uninstall"
Write-Host ""

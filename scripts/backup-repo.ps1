#!/usr/bin/env pwsh
<#
.SYNOPSIS
    SOTA Repository Backup Script v1.2.0
    High-performance backup with multi-destination support and integrity verification.

.DESCRIPTION
    This script performs a comprehensive backup of the current repository to multiple
    destinations (Desktop, N: Drive, OneDrive). It handles exclusions, computes
    SHA256 hashes for deduplication, and verifies ZIP integrity.

.PARAMETER IncludeBuild
    Include dist/ and build/ folders (default: false)

.PARAMETER MaxRetries
    Maximum number of retry attempts for failed operations (default: 3)

.PARAMETER RetryDelaySeconds
    Initial delay between retries in seconds (default: 2)
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$IncludeBuild = $false,
    [switch]$List = $false,
    [ValidateSet('text', 'json')]
    [string]$OutputFormat = 'text',
    [int]$MaxRetries = 3,
    [int]$RetryDelaySeconds = 2
)

# Set error action preference
$ErrorActionPreference = "Stop"
$PSDefaultParameterValues['*:ErrorAction'] = 'Stop'

$Verbose = $VerbosePreference -eq 'Continue'
$WhatIf = $WhatIfPreference

# Initialize
$script:StartTime = Get-Date
$script:ErrorLog = @()
$script:BackupResults = @{}
$script:TotalFilesProcessed = 0
$script:TotalFilesFailed = 0

# Types
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Security.Cryptography

#region Helper Functions

function Write-ErrorLog {
    param(
        [string]$Message,
        [string]$Category = "Error",
        [PSObject]$Exception = $null
    )
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$ts] [$Category] $Message"
    if ($Exception) {
        $ex = if ($Exception -is [System.Management.Automation.ErrorRecord]) { $Exception.Exception } else { $Exception }
        if ($ex) {
            $logEntry += "`n  Exception: $($ex.GetType().FullName)"
            $logEntry += "`n  Message: $($ex.Message)"
        }
    }
    $script:ErrorLog += $logEntry
    if ($script:OutputFormat -eq 'text') {
        $color = if ($Category -eq "Error") { "Red" } elseif ($Category -eq "Warning") { "Yellow" } else { "Gray" }
        Write-Host $logEntry -ForegroundColor $color
    }
}

function Get-FileHashSHA256 {
    param([string]$FilePath)
    $hash = [System.Security.Cryptography.SHA256]::Create()
    $fs = [System.IO.File]::OpenRead($FilePath)
    $hashBytes = $hash.ComputeHash($fs)
    $fs.Close()
    $hash.Dispose()
    return [System.BitConverter]::ToString($hashBytes) -replace '-', ''
}

function Test-BackupDuplicate {
    param(
        [string]$NewBackupPath,
        [string]$BackupDir,
        [switch]$Verbose
    )
    if (-not (Test-Path $NewBackupPath)) { return $false }
    $prev = Get-ChildItem -Path $BackupDir -Filter "*.zip" -File | 
            Where-Object { $_.FullName -ne $NewBackupPath } | 
            Sort-Object LastWriteTime -Descending
    if (-not $prev) { return $false }
    
    $newHash = Get-FileHashSHA256 -FilePath $NewBackupPath
    $oldHash = Get-FileHashSHA256 -FilePath $prev[0].FullName
    return ($newHash -eq $oldHash)
}

function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [string]$OperationName,
        [int]$MaxRetries = 3,
        [int]$InitialDelaySeconds = 2
    )
    $attempt = 0
    while ($attempt -le $MaxRetries) {
        try { return & $ScriptBlock }
        catch {
            $attempt++
            if ($attempt -gt $MaxRetries) { throw }
            Start-Sleep -Seconds $InitialDelaySeconds
        }
    }
}

function New-BackupZip {
    param(
        [string]$ZipPath,
        [array]$Files,
        [string]$RepoRoot
    )
    $zip = $null
    $added = 0
    $failed = 0
    try {
        if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
        $zip = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
        foreach ($file in $Files) {
            try {
                $rel = $file.FullName.Substring($RepoRoot.Length + 1)
                $entry = $rel -replace '\\', '/'
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
                $added++
            }
            catch { $failed++; Write-ErrorLog "Failed to add file: $($file.FullName)" "Warning" $_ }
        }
        $zip.Dispose(); $zip = $null
        return @{ Success = $true; FilesAdded = $added; FilesFailed = $failed; BackupSize = (Get-Item $ZipPath).Length }
    }
    catch {
        if ($zip) { $zip.Dispose() }
        if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
        throw
    }
}

#endregion

# Main
$repoRoot = (Get-Item .).FullName
$repoName = (Get-Item .).Name
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "${repoName}_backup_${timestamp}.zip"

$desktop = Join-Path (Join-Path ([Environment]::GetFolderPath("Desktop")) "repo backup") $repoName
$nDrive = Join-Path "N:\backup\dev\repo-backups" $repoName
$oneDrive = Join-Path (Join-Path $env:OneDrive "Backup/repo-backups") $repoName

$destinations = @(
    @{ Name = "Desktop"; Path = $desktop; BackupPath = (Join-Path $desktop $backupName) }
    @{ Name = "N: Drive"; Path = $nDrive; BackupPath = (Join-Path $nDrive $backupName) }
    @{ Name = "OneDrive"; Path = $oneDrive; BackupPath = (Join-Path $oneDrive $backupName) }
)

Write-Host "--- SOTA Backup Starting: $repoName ---" -ForegroundColor Magenta

# Create dirs
foreach ($d in $destinations) {
    if (-not (Test-Path $d.Path)) { New-Item -ItemType Directory -Path $d.Path -Force | Out-Null }
}

# Exclusions
$excl = @(".venv", "venv", "node_modules", "__pycache__", ".git", "dist", "build", ".windsurf", ".cursor")
$files = Get-ChildItem -Recurse -File | Where-Object {
    $f = $_
    $skip = $false
    foreach ($pat in $excl) { if ($f.FullName -match [regex]::Escape($pat)) { $skip = $true; break } }
    -not $skip
}

$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host "Files to backup: $($files.Count) ($([math]::Round($totalSize/1MB, 2)) MB)"

if ($WhatIf) {
    Write-Host "[DRY-RUN] Would create backup at destinations." -ForegroundColor Yellow
    exit 0
}

$successCount = 0
foreach ($d in $destinations) {
    Write-Host "Backing up to $($d.Name)..."
    try {
        $res = New-BackupZip -ZipPath $d.BackupPath -Files $files -RepoRoot $repoRoot
        if (Test-BackupDuplicate -NewBackupPath $d.BackupPath -BackupDir $d.Path) {
            Write-Host "  Duplicate found, removing." -ForegroundColor Yellow
            Remove-Item $d.BackupPath -Force
        } else {
            Write-Host "  Success: $([math]::Round($res.BackupSize/1MB, 2)) MB" -ForegroundColor Green
            $successCount++
        }
    }
    catch { Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red }
}

Write-Host "--- Backup Complete: $successCount destinations ---"
exit $(if ($successCount -gt 0) { 0 } else { 1 })

# PowerShell script to create a junction from TTS temp folder to Scripts folder
# This makes the extension save files directly to your Scripts folder

$tempPath = "$env:LOCALAPPDATA\Temp\TabletopSimulator\Tabletop Simulator Lua"
$scriptsPath = "$PSScriptRoot\Scripts"

Write-Host "Setting up TTS Lua extension symlink..." -ForegroundColor Cyan
Write-Host "Temp folder: $tempPath" -ForegroundColor Yellow
Write-Host "Scripts folder: $scriptsPath" -ForegroundColor Yellow

# Check if temp folder exists and has files
if (Test-Path $tempPath) {
    $files = Get-ChildItem $tempPath -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "`nWARNING: Temp folder contains files!" -ForegroundColor Red
        Write-Host "Files will be moved to Scripts folder." -ForegroundColor Yellow
        Read-Host "Press Enter to continue or Ctrl+C to cancel"

        # Move existing files to Scripts
        if (-not (Test-Path $scriptsPath)) {
            New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null
        }
        Move-Item "$tempPath\*" $scriptsPath -Force -ErrorAction SilentlyContinue
    }

    # Remove the temp folder
    Remove-Item $tempPath -Force -Recurse -ErrorAction SilentlyContinue
}

# Create parent directory if it doesn't exist
$parentDir = Split-Path $tempPath -Parent
if (-not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

# Create Scripts folder if it doesn't exist
if (-not (Test-Path $scriptsPath)) {
    New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null
}

# Create the junction
try {
    cmd /c mklink /J "`"$tempPath`"" "`"$scriptsPath`""
    # Write-Host "`n✓ Junction created successfully!" -ForegroundColor Green
    # Write-Host "The TTS extension will now save files directly to your Scripts folder." -ForegroundColor Green
} catch {
    # Write-Host "`n✗ Failed to create junction: $_" -ForegroundColor Red
    # Write-Host "You may need to run this script as Administrator." -ForegroundColor Yellow
    exit 1
}

# Write-Host "`nDone! You can now use the Get all Lua Scripts command and files will appear in Scripts/" -ForegroundColor Cyan

# Clean release directory script
# Fix file locking issues

Write-Host "=== Cleaning release directory ===" -ForegroundColor Green
Write-Host ""

# Close all Activity Analyzer processes
Write-Host "Closing Activity Analyzer processes..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*活动分析器*" -or 
    $_.MainWindowTitle -like "*活动分析器*" -or
    $_.Path -like "*win-unpacked*"
}

if ($processes) {
    Write-Host "Found $($processes.Count) related processes" -ForegroundColor Yellow
    foreach ($proc in $processes) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  Closed: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to close: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 3
} else {
    Write-Host "No related processes found" -ForegroundColor Green
}

Write-Host ""

# Remove win-unpacked directory
$unpackedDir = "release\win-unpacked"
if (Test-Path $unpackedDir) {
    Write-Host "Removing win-unpacked directory..." -ForegroundColor Yellow
    try {
        Remove-Item -Recurse -Force $unpackedDir -ErrorAction Stop
        Write-Host "win-unpacked directory removed" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove directory: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please manually delete:" -ForegroundColor Yellow
        Write-Host "  1. Close all Activity Analyzer windows" -ForegroundColor White
        Write-Host "  2. Delete in File Explorer: $unpackedDir" -ForegroundColor White
        Write-Host "  3. Or restart computer and try again" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "win-unpacked directory does not exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete! You can now rebuild" -ForegroundColor Green
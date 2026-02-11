# NexInvo Backend Server Startup Script (PowerShell)
# Run with: powershell -ExecutionPolicy Bypass -File start_server.ps1

$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptPath

Write-Host "========================================"
Write-Host "  NexInvo Backend Server"
Write-Host "  Starting with Daphne (WebSocket Support)"
Write-Host "========================================"
Write-Host ""

# Paths
$VenvPath = Join-Path $ScriptPath "venv"
$PythonPath = Join-Path $VenvPath "Scripts\python.exe"
$DaphnePath = Join-Path $VenvPath "Scripts\daphne.exe"

# Check if virtual environment exists
if (-not (Test-Path $PythonPath)) {
    Write-Host "ERROR: Virtual environment not found at $VenvPath" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Virtual environment found: $VenvPath" -ForegroundColor Green
Write-Host "Starting Daphne server on http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Set environment to use the correct Python
$env:VIRTUAL_ENV = $VenvPath
$env:PATH = "$VenvPath\Scripts;$env:PATH"

# Start Daphne
try {
    & $PythonPath -m daphne -b 127.0.0.1 -p 8000 core.asgi:application
} catch {
    Write-Host ""
    Write-Host "ERROR: Server stopped unexpectedly" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
}

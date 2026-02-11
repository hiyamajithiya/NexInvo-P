@echo off
title NexInvo Backend Server
cd /d "%~dp0"

echo ========================================
echo   NexInvo Backend Server
echo   http://127.0.0.1:8000
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver 8000

if errorlevel 1 (
    echo.
    echo ERROR: Server stopped unexpectedly
    pause
)

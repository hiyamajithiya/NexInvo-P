@echo off
REM Setu Backend Setup Script for Windows
REM This script sets up the NexInvo backend for Setu integration

echo =========================================
echo Setu Backend Setup for NexInvo
echo =========================================
echo.

REM Check if we're in the backend directory
if not exist "manage.py" (
    echo Error: manage.py not found. Please run this script from the backend directory.
    pause
    exit /b 1
)

echo Step 1: Installing Django Channels and dependencies...
pip install channels==4.2.0 channels-redis==4.2.1 daphne==4.2.0
if %errorlevel% equ 0 (
    echo [OK] Dependencies installed successfully
) else (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Checking Redis installation...
where redis-server >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Redis is installed

    REM Try to ping Redis
    redis-cli ping >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Redis is running
    ) else (
        echo [WARNING] Redis is installed but not running
        echo   Start Redis with: redis-server
    )
) else (
    echo [WARNING] Redis is not installed
    echo   Download Redis for Windows from:
    echo   https://github.com/microsoftarchive/redis/releases
)

echo.
echo Step 3: Checking settings.py configuration...
findstr /C:"channels" nexinvo\settings.py >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 'channels' found in settings.py
) else (
    echo [WARNING] 'channels' not found in INSTALLED_APPS
    echo   Add the following to nexinvo/settings.py:
    echo.
    echo   INSTALLED_APPS = [
    echo       # ... existing apps
    echo       'channels',
    echo   ]
)

findstr /C:"ASGI_APPLICATION" nexinvo\settings.py >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] ASGI_APPLICATION configured
) else (
    echo [WARNING] ASGI_APPLICATION not configured
    echo   Add to nexinvo/settings.py:
    echo.
    echo   ASGI_APPLICATION = 'nexinvo.asgi.application'
)

findstr /C:"CHANNEL_LAYERS" nexinvo\settings.py >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] CHANNEL_LAYERS configured
) else (
    echo [WARNING] CHANNEL_LAYERS not configured
    echo   Add to nexinvo/settings.py:
    echo.
    echo   CHANNEL_LAYERS = {
    echo       'default': {
    echo           'BACKEND': 'channels_redis.core.RedisChannelLayer',
    echo           'CONFIG': {
    echo               'hosts': [('127.0.0.1', 6379)],
    echo           },
    echo       },
    echo   }
)

echo.
echo Step 4: Checking Setu files...
set all_files_exist=1

if exist "api\setu_consumer.py" (
    echo [OK] api\setu_consumer.py exists
) else (
    echo [ERROR] api\setu_consumer.py missing
    set all_files_exist=0
)

if exist "api\setu_views.py" (
    echo [OK] api\setu_views.py exists
) else (
    echo [ERROR] api\setu_views.py missing
    set all_files_exist=0
)

if exist "api\routing.py" (
    echo [OK] api\routing.py exists
) else (
    echo [ERROR] api\routing.py missing
    set all_files_exist=0
)

echo.
echo Step 5: Running Django checks...
python manage.py check 2>&1 | more

echo.
echo =========================================
echo Setup Summary
echo =========================================
echo.
echo Next steps:
echo 1. Make sure Redis is running: redis-server
echo 2. Update settings.py with the configurations shown above (if needed)
echo 3. Run migrations: python manage.py migrate
echo 4. Start the server: python manage.py runserver
echo    Or with Daphne: daphne -b 0.0.0.0 -p 8000 nexinvo.asgi:application
echo.
echo To test WebSocket connection:
echo   ws://localhost:8000/ws/setu/
echo.
echo For more details, see:
echo   - ..\Setu\BACKEND_INTEGRATION.md
echo   - ..\SETU_INTEGRATION_SUMMARY.md
echo.
pause

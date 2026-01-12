@echo off
echo Starting NexInvo Servers...

:: Start Backend Server in a new window
start "NexInvo Backend" cmd /k "cd /d d:\ADMIN\Documents\HMC AI\Invoice\NexInvo(P)\backend && python manage.py runserver 8000"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak > nul

:: Start Frontend Server in a new window
start "NexInvo Frontend" cmd /k "cd /d d:\ADMIN\Documents\HMC AI\Invoice\NexInvo(P)\frontend && npm start"

echo.
echo Servers are starting in separate windows...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3002
echo.
pause

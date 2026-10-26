@echo off
title FSKTM Facility Management System Launcher
echo ========================================================
echo   Starting FSKTM Facility Management System
echo ========================================================
echo.

:: Start Backend Server
echo [1/2] Starting Backend Server on port 5001...
start "FSKTM Backend Server (Port 5001)" cmd /k "cd /d "%~dp0server" && npm start"

:: Start Frontend Vite Client
echo [2/2] Starting Frontend Client on port 5173...
start "FSKTM Frontend Client (Port 5173)" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Opening http://localhost:5173 in your default browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

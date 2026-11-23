@echo off
title Helios Elements
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  echo Install Node.js from https://nodejs.org and run this again.
  pause
  exit /b 1
)

echo.
echo   HELIOS ELEMENTS
echo   Forge the sun. Hold the dark.
echo.

start "Helios Server" /min node server.js
timeout /t 2 /nobreak >nul
start "" "http://localhost:8091"

echo   The arena should now be open in your browser.
echo   Close the minimized "Helios Server" window to stop the game.
echo.
pause >nul

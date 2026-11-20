@echo off
chcp 65001 >nul
cd /d "%~dp0"
title RongGui ZhiQi - Launcher

echo.
echo   ==========================================
echo     RongGui ZhiQi  /  Launcher
echo   ==========================================
echo.
echo     1  Open finished page  (index.html, no server)
echo     2  Rebuild single-file  index.html  (after editing src)
echo     3  Dev server with hot reload
echo.
set /p c=Enter 1 / 2 / 3 then press Enter: 

if "%c%"=="1" (
  start "" "index.html"
  exit /b
)
if "%c%"=="2" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Node.js / npm not found. Install Node.js 18+ first.
    pause
    exit /b 1
  )
  if not exist "node_modules" call npm install
  call npm run build:standalone
  echo.
  echo Done. Now double-click index.html to view.
  pause
  exit /b
)
if "%c%"=="3" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Node.js / npm not found. Install Node.js 18+ first.
    pause
    exit /b 1
  )
  if not exist "node_modules" call npm install
  call npm run dev -- --open
  pause
  exit /b
)
echo Unknown choice.
pause

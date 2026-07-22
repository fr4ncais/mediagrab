@echo off
title MediaGrab - One Click Setup
color 0A

echo ========================================
echo    MediaGrab - One Click Setup
echo ========================================
echo.

:: Check admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting admin privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)

:: Config
set "REPO=https://github.com/fr3nchh/mediagrab"
set "FOLDER=%USERPROFILE%\MediaGrab"
set "FILE=server.js"

:: [1/6] Install Node.js
echo [1/6] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Node.js...
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    refreshenv >nul 2>&1
) else (
    echo Node.js already installed.
)

:: [2/6] Install Python
echo [2/6] Checking Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Python...
    winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
    refreshenv >nul 2>&1
) else (
    echo Python already installed.
)

:: [3/6] Install yt-dlp
echo [3/6] Checking yt-dlp...
pip install yt-dlp >nul 2>&1
echo yt-dlp installed.

:: [4/6] Install FFmpeg
echo [4/6] Checking FFmpeg...
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing FFmpeg...
    winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
    refreshenv >nul 2>&1
) else (
    echo FFmpeg already installed.
)

:: [5/6] Download MediaGrab
echo [5/6] Downloading MediaGrab...
if not exist "%FOLDER%\%FILE%" (
    where git >nul 2>&1
    if %errorlevel% neq 0 (
        echo Installing Git...
        winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
        refreshenv >nul 2>&1
    )
    git clone "%REPO%" "%FOLDER%"
) else (
    echo MediaGrab already downloaded. Updating...
    cd /d "%FOLDER%"
    git pull >nul 2>&1
)

:: [6/6] Install dependencies and start
echo [6/6] Installing dependencies...
cd /d "%FOLDER%"
if not exist "node_modules" (
    npm install
)

:: Kill old server
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================
echo    Starting MediaGrab...
echo    Open http://localhost:3000
echo ========================================
echo.
start "" http://localhost:3000
node server.js
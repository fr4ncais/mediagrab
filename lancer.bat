@echo off
title MediaGrab Launcher

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

:: Kill any existing node process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    echo Killing old server (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Download project if not exists
if not exist "%FOLDER%\%FILE%" (
    echo Downloading MediaGrab...
    echo.
    where git >nul 2>&1
    if %errorlevel% equ 0 (
        git clone "%REPO%" "%FOLDER%"
    ) else (
        echo Git not found, installing via winget...
        winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
        git clone "%REPO%" "%FOLDER%"
    )
) else (
    echo Updating MediaGrab...
    cd /d "%FOLDER%"
    git pull >nul 2>&1
)

:: Install dependencies
cd /d "%FOLDER%"
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

:: Launch
echo Starting server...
start "" http://localhost:3000
node server.js
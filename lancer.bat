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
set "REPO=https://github.com/fr4ncais/mediagrab"
set "FOLDER=%USERPROFILE%\Desktop\mediagrab"
set "FILE=server.js"

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
)

:: Launch
cd /d "%FOLDER%"
echo Starting MediaGrab...
start "" http://localhost:3000
node server.js
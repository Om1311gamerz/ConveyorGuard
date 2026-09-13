@echo off
setlocal
cd /d "%~dp0"
title ConveyorGuard Local Dashboard

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not available in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

node scripts\start-system.mjs
if errorlevel 1 (
  echo.
  echo ConveyorGuard stopped because startup failed. Read the message above.
  pause
)

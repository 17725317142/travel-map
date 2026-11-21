@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 旅行地图数据服务器
echo.
echo  正在启动旅行地图数据服务器...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [错误] 未找到 Node.js。
  echo  请先安装 Node.js（https://nodejs.org/）后重新运行本文件。
  echo.
  pause
  exit /b 1
)

rem 如果服务器已在运行，直接打开页面即可
netstat -ano | findstr "127.0.0.1:8345" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo  服务器已在运行，直接打开页面...
  start "" "%~dp0旅行地图.html"
  exit /b 0
)

start "" /min "node" server.js
timeout /t 2 /nobreak >nul
start "" "%~dp0旅行地图.html"
exit /b 0

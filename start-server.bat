@echo off
set "NODE_DIR=%~dp0.tools\node-v22.22.3-win-x64"
if not exist "%NODE_DIR%\node.exe" (
  echo Local Node.js was not found: "%NODE_DIR%\node.exe"
  exit /b 1
)
set "PATH=%NODE_DIR%;%PATH%"
call "%NODE_DIR%\node.exe" "%~dp0scripts\dev-server.mjs" --host 127.0.0.1 --port 5173 --strictPort

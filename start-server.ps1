$ErrorActionPreference = "Stop"

$nodeDir = Join-Path $PSScriptRoot ".tools\node-v22.22.3-win-x64"
$nodeExe = Join-Path $nodeDir "node.exe"
$serverScript = Join-Path $PSScriptRoot "scripts\dev-server.mjs"

if (-not (Test-Path $nodeExe)) {
  Write-Error "Local Node.js was not found. Expected: $nodeExe"
}

if (-not (Test-Path $serverScript)) {
  Write-Error "Dev server script was not found. Expected: $serverScript"
}

$env:Path = "$nodeDir;$env:Path"
& $nodeExe $serverScript --host 127.0.0.1 --port 5173 --strictPort

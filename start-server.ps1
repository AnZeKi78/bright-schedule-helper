$ErrorActionPreference = "Stop"

$nodeDir = Join-Path $PSScriptRoot ".tools\node-v22.22.3-win-x64"

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
  Write-Error "Локальный Node.js не найден. Запустите установку зависимостей или обратитесь к Codex."
}

$env:Path = "$nodeDir;$env:Path"
& (Join-Path $nodeDir "npm.cmd") run dev -- --host 127.0.0.1 --port 5173

$Repo = "G-DEVELOPER-707/a-finder"
$Branch = "main"
$ZipUrl = "https://github.com/$Repo/archive/refs/heads/$Branch.zip"
$Dir = Join-Path $env:USERPROFILE "javod-qidiruvchi"

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "Kengaytma yuklab olinmoqda..." -ForegroundColor Cyan
$tmpZip = Join-Path $env:TEMP ([Guid]::NewGuid().ToString() + ".zip")
$extractDir = Join-Path $env:TEMP ([Guid]::NewGuid().ToString())

try {
    Invoke-WebRequest -Uri $ZipUrl -OutFile $tmpZip
} catch {
    Write-Host "Xatolik: Repozitoriy topilmadi!" -ForegroundColor Red
    exit
}

Write-Host "Fayllar chiqarilmoqda..." -ForegroundColor Cyan
Expand-Archive -Path $tmpZip -DestinationPath $extractDir -Force

$ExtFolder = Get-ChildItem $extractDir -Directory | Select-Object -ExpandProperty FullName
if (Test-Path $Dir) { Remove-Item $Dir -Recurse -Force }
New-Item -ItemType Directory -Path $Dir | Out-Null
Copy-Item "$ExtFolder\*" $Dir -Recurse -Force

# Xatolarsiz tozalash
if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue }
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue }

Set-Clipboard $Dir
Write-Host ""
Write-Host "Tayyor! Papka yo'li nusxalandi: $Dir" -ForegroundColor Green
Write-Host "Chrome ochilmoqda..." -ForegroundColor Yellow
try { Start-Process chrome "chrome://extensions" } catch {}

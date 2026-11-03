$Repo = "G-DEVELOPER-707/a-finder"
$Branch = "main"
$ZipUrl = "https://github.com/$Repo/archive/refs/heads/$Branch.zip"
$Dir = Join-Path $env:USERPROFILE "javod-qidiruvchi"

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "Kengaytma yuklab olinmoqda..." -ForegroundColor Cyan
$tmp = New-TemporaryFile
$tmpZip = "$tmp.zip"
Remove-Item $tmp -Force

try {
    Invoke-WebRequest -Uri $ZipUrl -OutFile $tmpZip
} catch {
    Write-Host "Xatolik: Repozitoriy yoki ZIP fayl topilmadi! URL manzilini tekshiring." -ForegroundColor Red
    exit
}

Write-Host "Fayllar chiqarilmoqda..." -ForegroundColor Cyan
$extractDir = Join-Path $env:TEMP ([Guid]::NewGuid().ToString())
Expand-Archive -Path $tmpZip -DestinationPath $extractDir -Force

$ExtFolder = Get-ChildItem $extractDir -Directory | Select-Object -ExpandProperty FullName
if (Test-Path $Dir) { Remove-Item $Dir -Recurse -Force }
New-Item -ItemType Directory -Path $Dir | Out-Null
Copy-Item "$ExtFolder\*" $Dir -Recurse -Force

# Tozalash
Remove-Item $tmpZip -Force
Remove-Item $extractDir -Recurse -Force

Set-Clipboard $Dir
Write-Host ""
Write-Host "Tayyor! Papka yo'li nusxalandi: $Dir" -ForegroundColor Green
Write-Host "Chrome: chrome://extensions oching > Developer mode yoqing > Load unpacked tugmasini bosing va Ctrl+V qiling." -ForegroundColor Yellow
try { Start-Process chrome "chrome://extensions" } catch {}

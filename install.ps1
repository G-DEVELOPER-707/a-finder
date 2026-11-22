# Javob Qidiruvchi 5.0 — foydalanuvchi uchun bir buyruqli o'rnatuvchi
# Ishlatish: irm https://raw.githubusercontent.com/G-DEVELOPER-707/a-finder/main/install.ps1 | iex

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Repo = "G-DEVELOPER-707/a-finder"
$Branch = "main"
$ZipUrl = "https://github.com/$Repo/archive/refs/heads/$Branch.zip"
$InstallDir = Join-Path $env:USERPROFILE "proxyFast"
$WorkDir = Join-Path $env:TEMP ("javob-qidiruvchi-" + [guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path $WorkDir "source.zip"
$ExtractDir = Join-Path $WorkDir "extracted"

try {
  Write-Host "`nJavob Qidiruvchi 5.0 yuklanmoqda..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null
  Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing

  if (!(Test-Path $ZipPath) -or (Get-Item $ZipPath).Length -lt 1000) {
    throw "GitHub arxivi yuklanmadi yoki noto'g'ri."
  }

  Write-Host "Fayllar tekshirilmoqda..." -ForegroundColor Cyan
  Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force
  $repoFolder = Get-ChildItem $ExtractDir -Directory | Select-Object -First 1
  if (!$repoFolder) { throw "GitHub arxivi ichida loyiha topilmadi." }

  $sourceExtension = Join-Path $repoFolder.FullName "extension"
  if (!(Test-Path (Join-Path $sourceExtension "manifest.json"))) {
    throw "extension\manifest.json topilmadi. GitHub main branch 5.0 tuzilmasida emas."
  }

  $config = Get-Content (Join-Path $sourceExtension "config.js") -Raw
  if ($config -match "__WORKER_URL__") {
    throw "Loyiha egasi Cloudflare Worker'ni deploy qilib, config.js ni GitHub'ga yubormagan."
  }

  Write-Host "Chrome kengaytmasi o'rnatilmoqda..." -ForegroundColor Cyan
  if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  Copy-Item -Path (Join-Path $sourceExtension "*") -Destination $InstallDir -Recurse -Force

  if (!(Test-Path (Join-Path $InstallDir "manifest.json"))) {
    throw "O'rnatish yakunlanmadi: manifest.json yo'q."
  }

  Set-Clipboard $InstallDir
  Write-Host "`n============================================" -ForegroundColor Green
  Write-Host "JAVOB QIDIRUVCHI 5.0 YUKLANDI" -ForegroundColor Green
  Write-Host "============================================" -ForegroundColor Green
  Write-Host "Kengaytma papkasi: $InstallDir"
  Write-Host "Papka manzili Clipboard'ga nusxalandi."
  Write-Host "`nChrome sahifasida Developer mode > Load unpacked ni bosing." -ForegroundColor Yellow
  Write-Host "Ochilgan oynada Ctrl+V qilib, papkani tanlang." -ForegroundColor Yellow

  try { Start-Process "chrome.exe" "chrome://extensions" }
  catch { Write-Host "Chrome'ni oching: chrome://extensions" -ForegroundColor Yellow }
}
catch {
  Write-Host "`nORNATISH XATOSI: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
  if (Test-Path $WorkDir) {
    Remove-Item $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

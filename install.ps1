# Javob Qidiruvchi 5.0 - foydalanuvchi uchun bir buyruqli o'rnatuvchi
# Ishlatish: irm https://githubusercontent.com | iex

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "G-DEVELOPER-707/a-finder"
$Branch = "main"
$ZipUrl = "https://github.com"
$InstallDir = Join-Path $env:USERPROFILE "proxyFast"

# TEMP papkasining to'liq (uzun) yo'lini olish (TEMP~1 xatosini oldini olish uchun)
$TempBase = [System.IO.Path]::GetFullPath($env:TEMP)
$WorkDir = Join-Path $TempBase ("javob-qidiruvchi-" + [guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path $WorkDir "source.zip"
$ExtractDir = Join-Path $WorkDir "extracted"

try {
  Write-Host "`nJavob Qidiruvchi 5.0 yuklanmoqda..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null

  # GitHub redirectlarini to'g'ri yuklash uchun WebClient ishlatamiz
  $webClient = New-Object System.Net.WebClient
  $webClient.Headers.Add("User-Agent", "PowerShell-Installer")
  $webClient.DownloadFile($ZipUrl, $ZipPath)

  if (!(Test-Path -LiteralPath $ZipPath) -or (Get-Item -LiteralPath $ZipPath).Length -lt 1000) {
    throw "GitHub arxivi yuklanmadi yoki hajmi juda kichik."
  }

  # Fayl haqiqatan ham ZIP ekanligini (PK sarlavhasini) tekshirish
  $bytes = [System.IO.File]::ReadAllBytes($ZipPath)
  if ($bytes.Length -lt 4 -or $bytes[0] -ne 0x50 -or $bytes[1] -ne 0x4B) {
    throw "Yuklangan fayl ZIP emas. Repozitoriy 'private' (yopiq) emasligini yoki '$Branch' branch borligini tekshiring."
  }

  Write-Host "Fayllar tekshirilmoqda..." -ForegroundColor Cyan
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $ExtractDir -Force
  $repoFolder = Get-ChildItem -LiteralPath $ExtractDir -Directory | Select-Object -First 1
  if (!$repoFolder) { throw "GitHub arxivi ichida loyiha topilmadi." }

  $sourceExtension = Join-Path $repoFolder.FullName "extension"
  if (!(Test-Path -LiteralPath (Join-Path $sourceExtension "manifest.json"))) {
    throw "extension\manifest.json topilmadi. GitHub main branch 5.0 tuzilmasida emas."
  }

  $config = Get-Content -LiteralPath (Join-Path $sourceExtension "config.js") -Raw
  if ($config -match "__WORKER_URL__") {
    throw "Loyiha egasi Cloudflare Worker'ni deploy qilib, config.js ni GitHub'ga yubormagan."
  }

  Write-Host "Chrome kengaytmasi o'rnatilmoqda..." -ForegroundColor Cyan
  if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  Copy-Item -Path (Join-Path $sourceExtension "*") -Destination $InstallDir -Recurse -Force

  if (!(Test-Path -LiteralPath (Join-Path $InstallDir "manifest.json"))) {
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
  if (Test-Path -LiteralPath $WorkDir) {
    Remove-Item -LiteralPath $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

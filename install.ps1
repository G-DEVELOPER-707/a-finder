# Javob Qidiruvchi 5.0 - foydalanuvchi uchun bir buyruqli o'rnatuvchi
# Ishlatish: irm bit.ly/tatu00 | iex

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Repo = "G-DEVELOPER-707/a-finder"
$Branch = "main"
$ZipUrl = "{0}/{1}/archive/refs/heads/{2}.zip" -f "https://github.com", $Repo, $Branch
$InstallDir = Join-Path $env:USERPROFILE "proxyFast"

$TempBase = [System.IO.Path]::GetFullPath($env:TEMP)
$WorkDir = Join-Path $TempBase ("javob-qidiruvchi-" + [guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path $WorkDir "source.zip"
$ExtractDir = Join-Path $WorkDir "extracted"

try {
  Write-Host "`nJavob Qidiruvchi 5.0 yuklanmoqda..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null

  $webClient = New-Object System.Net.WebClient
  $webClient.Headers.Add("User-Agent", "PowerShell-Installer")
  $webClient.DownloadFile($ZipUrl, $ZipPath)

  if (!(Test-Path -LiteralPath $ZipPath) -or (Get-Item -LiteralPath $ZipPath).Length -lt 1000) {
    throw "GitHub arxivi yuklanmadi yoki hajmi juda kichik."
  }

  Write-Host "Fayllar tekshirilmoqda..." -ForegroundColor Cyan
  try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $ExtractDir)
  }
  catch {
    throw "Yuklangan fayl ZIP emas. Repozitoriy 'Public' (ochiq) ekanligini tekshiring."
  }

  $repoFolder = Get-ChildItem -LiteralPath $ExtractDir -Directory | Select-Object -First 1
  if (!$repoFolder) { throw "GitHub arxivi ichida loyiha topilmadi." }

  $sourceExtension = Join-Path $repoFolder.FullName "extension"
  if (!(Test-Path -LiteralPath (Join-Path $sourceExtension "manifest.json"))) {
    $sourceExtension = $repoFolder.FullName
  }

  if (!(Test-Path -LiteralPath (Join-Path $sourceExtension "manifest.json"))) {
    throw "manifest.json topilmadi. GitHub main branch'ga kengaytma fayllari yuklanganini tekshiring."
  }

  $configPath = Join-Path $sourceExtension "config.js"
  if (Test-Path -LiteralPath $configPath) {
    $config = Get-Content -LiteralPath $configPath -Raw
    if ($config -match "__WORKER_URL__") {
      throw "Loyiha egasi Cloudflare Worker'ni deploy qilib, config.js ni GitHub'ga yubormagan."
    }
  }

  Write-Host "Chrome kengaytmasi o'rnatilmoqda..." -ForegroundColor Cyan
  if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

  Get-ChildItem -LiteralPath $sourceExtension | Where-Object {
    $_.Name -notin @("install.ps1", "install.sh", "README.md", ".gitignore", ".git")
  } | Copy-Item -Destination $InstallDir -Recurse -Force

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


$Repo = "G-DEVELOPER-707/a-finder"
$Branch = "main"
$ZipUrl = "https://github.com/$Repo/archive/refs/heads/$Branch.zip"
$Dir = Join-Path $env:USERPROFILE "proxyFast"

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Yagona vaqtinchalik ishchi papka
$WorkDir = Join-Path $env:TEMP ([Guid]::NewGuid().ToString())
$ZipPath = Join-Path $WorkDir "repository.zip"
$ExtractDir = Join-Path $WorkDir "extracted"

try {
    Write-Host "Kengaytma yuklab olinmoqda..." -ForegroundColor Cyan

    New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null

    Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath

    if (!(Test-Path $ZipPath)) {
        throw "ZIP fayl yuklab olinmadi."
    }

    Write-Host "Fayllar chiqarilmoqda..." -ForegroundColor Cyan

    Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force

    # GitHub arxivining asosiy papkasini aniqlash
    $ExtFolder = Get-ChildItem $ExtractDir -Directory |
        Select-Object -First 1

    if (!$ExtFolder) {
        throw "Arxiv ichidan kengaytma papkasi topilmadi."
    }

    # Eski versiyani almashtirish
    if (Test-Path $Dir) {
        Remove-Item $Dir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $Dir -Force | Out-Null

    Copy-Item -Path (Join-Path $ExtFolder.FullName "*") `
        -Destination $Dir -Recurse -Force

    # Chrome kengaytmasi manifestini tekshirish
    if (!(Test-Path (Join-Path $Dir "manifest.json"))) {
        throw "manifest.json topilmadi. Kengaytma noto'g'ri tuzilgan."
    }

    # Papka yo'lini Clipboard'ga nusxalash
    Set-Clipboard $Dir

    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "MUVAFFAQIYATLI YAKUNLANDI!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "Papka: $Dir" -ForegroundColor White
    Write-Host "Papka yo'li Clipboard'ga nusxalandi." -ForegroundColor Green

    Write-Host ""
    Write-Host "Chrome: Developer mode > Load unpacked" -ForegroundColor Yellow
    Write-Host "Ctrl + V orqali papka yo'lini kiriting." -ForegroundColor Yellow

    try {
        Start-Process "chrome.exe" "chrome://extensions"
    }
    catch {
        Write-Host "Chrome avtomatik ochilmadi. Qo'lda oching." -ForegroundColor Yellow
    }
}
catch {
    Write-Host ""
    Write-Host "XATOLIK: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    # Vaqtinchalik fayllarni xavfsiz tozalash
    if (Test-Path $WorkDir) {
        Remove-Item $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

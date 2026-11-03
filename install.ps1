# Javob Qidiruvchi — Windows o'rnatuvchi / yangilovchi
$Repo      = "USERNAME/javob-qidiruvchi"   # <-- GitHub: foydalanuvchi_nomi/repo_nomi
$Branch    = "main"
$ConfigUrl = ""                            # ixtiyoriy: kalit yozilgan config.js ning (maxfiy gist) raw havolasi
$Dir       = Join-Path $env:USERPROFILE "javob-qidiruvchi"

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$tmp = Join-Path $env:TEMP ("jq" + (Get-Random))
New-Item -ItemType Directory -Path $tmp | Out-Null
Invoke-WebRequest "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile "$tmp\x.zip"
Expand-Archive "$tmp\x.zip" -DestinationPath $tmp -Force
$src = Get-ChildItem $tmp -Directory | Select-Object -First 1
New-Item -ItemType Directory -Path $Dir -Force | Out-Null
Copy-Item "$($src.FullName)\*" $Dir -Recurse -Force      # papka joyida qoladi, Chrome yo'li buzilmaydi
if ($ConfigUrl) { Invoke-WebRequest $ConfigUrl -OutFile (Join-Path $Dir "config.js") }
Remove-Item $tmp -Recurse -Force

Set-Clipboard $Dir
Write-Host ""
Write-Host "Tayyor! Papka: $Dir  (yo'li nusxalandi)" -ForegroundColor Green
Write-Host "Chrome: Developer mode yoqing > Load unpacked > papkani tanlang (yo'l: Ctrl+V)."
Write-Host "Yangilagan bo'lsangiz: chrome://extensions da extension'ni Reload qiling."
try { Start-Process chrome "chrome://extensions" } catch {}

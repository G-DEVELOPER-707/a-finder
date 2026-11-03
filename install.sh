#!/bin/sh
# Javob Qidiruvchi — macOS/Linux o'rnatuvchi / yangilovchi
REPO="USERNAME/javob-qidiruvchi"   # <-- GitHub: foydalanuvchi_nomi/repo_nomi
BRANCH="main"
CONFIG_URL=""                      # ixtiyoriy: kalit yozilgan config.js raw havolasi
DIR="$HOME/javob-qidiruvchi"
set -e
mkdir -p "$DIR"
curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" | tar xz --strip-components=1 -C "$DIR"
[ -n "$CONFIG_URL" ] && curl -fsSL "$CONFIG_URL" -o "$DIR/config.js"
echo "Tayyor! Papka: $DIR"
echo "Chrome: chrome://extensions > Developer mode > Load unpacked > $DIR"

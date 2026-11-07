#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "========== AMAANTRADERS AUTO UPDATER =========="

git rev-parse --is-inside-work-tree >/dev/null

git remote set-url origin https://github.com/ayaankhan96438-star/AMAANTRADERS.git 2>/dev/null || \
git remote add origin https://github.com/ayaankhan96438-star/AMAANTRADERS.git

BRANCH=$(git branch --show-current)

if [ -z "$BRANCH" ]; then
  echo "ERROR: No active Git branch."
  exit 1
fi

echo "[1] Checking project..."
npm run check

echo "[2] Building website..."
npm run build

echo "[3] Preparing changes..."


git add -A
git diff --cached --check

if git diff --cached --quiet; then
  echo "No new changes to upload."
  exit 0
fi

git commit -m "Update AmaanTrader website"

echo "[4] Uploading everything to GitHub..."
git push -u origin "$BRANCH"

echo "========== SUCCESS: GITHUB UPDATED =========="

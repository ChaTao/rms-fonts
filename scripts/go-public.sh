#!/usr/bin/env bash
set -euo pipefail

REPO="ChaTao/rms-fonts"
URL="https://chatao.github.io/rms-fonts/"

echo "[1/3] Setting repo public..."
gh api -X PATCH "repos/$REPO" -f private=false --silent

echo "[2/3] Enabling GitHub Pages (source: Actions)..."
gh api -X POST "repos/$REPO/pages" -f build_type=workflow --silent 2>/dev/null \
  || echo "      (Pages config already present)"

echo "[3/3] Triggering deploy workflow..."
gh workflow run deploy.yml --repo "$REPO" --ref main

echo ""
echo "Done. Site will be live at $URL in ~30-60s."
echo "Check:  curl -sI $URL | head -1"

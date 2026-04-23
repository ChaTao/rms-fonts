#!/usr/bin/env bash
set -euo pipefail

REPO="ChaTao/rms-fonts"

echo "Setting repo private..."
gh api -X PATCH "repos/$REPO" -f private=true --silent

echo ""
echo "Done. Repo is private, Pages is disabled (GitHub Free plan limitation)."
echo "To re-publish:  ./scripts/go-public.sh"

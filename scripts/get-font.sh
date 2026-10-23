#!/usr/bin/env bash
# Download one Google Font as a self-hosted woff2 (latin subset) into src/fonts/.
#   bash scripts/get-font.sh "Young Serif" 400
#   bash scripts/get-font.sh "Figtree" "300..800"        # variable weight range
#   bash scripts/get-font.sh "Fraunces" 400 italic
# Then load it in src/app/layout.tsx with next/font/local.
set -euo pipefail
FAMILY="${1:?family}"; WEIGHT="${2:-400}"; STYLE="${3:-normal}"
ITAL=0; [ "$STYLE" = "italic" ] && ITAL=1
Q=$(printf '%s' "$FAMILY" | sed 's/ /+/g')
CSS=$(curl -fsS -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=${Q}:ital,wght@${ITAL},${WEIGHT}&display=swap")
# The latin block is the last @font-face in the response.
URL=$(printf '%s\n' "$CSS" | awk '/\/\* latin \*\//{f=1} f && match($0, /https:[^)]*\.woff2/) {print substr($0, RSTART, RLENGTH); exit}')
[ -n "$URL" ] || { echo "no woff2 found for $FAMILY $WEIGHT $STYLE" >&2; exit 1; }
SLUG=$(printf '%s' "$FAMILY" | tr 'A-Z ' 'a-z-')
W=$(printf '%s' "$WEIGHT" | sed 's/\.\./-/')
SUFFIX=""
if [ "$ITAL" = 1 ]; then SUFFIX="-italic"; fi
OUT="src/fonts/${SLUG}-${W}${SUFFIX}.woff2"
mkdir -p src/fonts
curl -fsS "$URL" -o "$OUT"
echo "$OUT"

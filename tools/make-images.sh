#!/usr/bin/env bash
# Render the social card and the apple-touch icon from their HTML/SVG sources.
# Only needed if you change tools/og-template.html or img/favicon.svg —
# the outputs are committed, so the site never depends on this running.
set -euo pipefail

cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at $CHROME — skipping image render." >&2
  exit 1
fi

shot() { # source, width, height, destination
  local tmp
  tmp="$(mktemp -d)"
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 \
    --screenshot="$tmp/out.png" \
    --window-size="$2,$3" \
    "file://$(pwd)/$1" >/dev/null 2>&1
  mv "$tmp/out.png" "$4"
  rmdir "$tmp" 2>/dev/null || true
  echo "  $4  ($(du -h "$4" | cut -f1))"
}

echo "Rendering:"
shot tools/og-template.html 1200 630 img/og.png

# The touch icon needs a padded, opaque square rather than the bare favicon.
cat > /tmp/touch-icon.html <<'HTML'
<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;width:180px;height:180px;background:#1B2027}
  svg{display:block;width:180px;height:180px}
</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#1B2027"/>
  <path d="M12.6 9.2v13.6L24.2 16z" fill="#E8A33D"/>
  <rect x="7.4" y="12.4" width="2" height="7.2" rx="1" fill="#55616E"/>
</svg>
HTML
cp /tmp/touch-icon.html tools/.touch-icon.html
shot tools/.touch-icon.html 180 180 img/apple-touch-icon.png
rm -f tools/.touch-icon.html /tmp/touch-icon.html

if command -v pngquant >/dev/null 2>&1; then
  echo "Compressing:"
  for f in img/og.png img/apple-touch-icon.png; do
    pngquant --force --skip-if-larger --quality 70-95 --output "$f" "$f" 2>/dev/null || true
    echo "  $f  ($(du -h "$f" | cut -f1))"
  done
fi

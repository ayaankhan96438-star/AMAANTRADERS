#!/usr/bin/env bash
set -euo pipefail
PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(pwd)"
fail(){ echo "ERROR: $*" >&2; exit 1; }

[[ -f "$ROOT/package.json" ]] || fail "package.json not found. Run from the actual Vite/npm project root."
[[ -f "$ROOT/index.html" ]] || fail "index.html not found."
[[ -f "$ROOT/style.css" ]] || fail "style.css not found at project root."
grep -q 'src/main.tsx' "$ROOT/index.html" || grep -q 'type="module"' "$ROOT/index.html" || fail "No Vite/module entry detected."
grep -RqsE 'style\.css|style\(7\)\.css' "$ROOT/src" 2>/dev/null || fail "Cannot confirm src/ imports root style.css. Refusing to modify an unrelated stylesheet."

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.part1-backup/$STAMP"
mkdir -p "$BACKUP"
for f in style.css animations.js package.json package-lock.json index.html; do
  [[ -f "$ROOT/$f" ]] && cp -p "$ROOT/$f" "$BACKUP/$f"
done

# Append only the Part 1 hero override; preserve all other current CSS.
if ! grep -qF '/* ===== PART 1 HERO FIX =====' "$ROOT/style.css"; then
  printf '\n\n' >> "$ROOT/style.css"
  cat "$PACK_DIR/hero-part1.css" >> "$ROOT/style.css"
else
  echo "Hero patch marker already exists; stylesheet left unchanged."
fi

# Consolidate the two Motion imports without replacing the rest of your file.
if [[ -f "$ROOT/animations.js" ]]; then
  python3 - "$ROOT/animations.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old='import { animate } from "motion/mini";\nimport { inView, stagger, frame, cancelFrame } from "motion";'
new='import { animate, inView, stagger, frame, cancelFrame } from "motion";'
if old in s:
    s=s.replace(old,new,1)
elif new not in s and 'from "motion"' not in s:
    raise SystemExit("Could not identify the expected Motion imports; animations.js left unchanged.")
p.write_text(s)
PY
else
  cp "$PACK_DIR/animations.js" "$ROOT/animations.js"
fi

if ! grep -q 'animations\.js' "$ROOT/index.html"; then
  python3 - "$ROOT/index.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
if "</body>" not in s: raise SystemExit("No </body> tag; index left unchanged")
s=s.replace("</body>", '    <script type="module" src="/animations.js"></script>\n</body>', 1)
p.write_text(s)
PY
fi

npm install --save-exact motion@14.10.0 lenis@1.3.27
echo "Part 1 patch applied. Backup: $BACKUP"
echo "Run your production build and viewport tests before pushing. Nothing has been pushed."

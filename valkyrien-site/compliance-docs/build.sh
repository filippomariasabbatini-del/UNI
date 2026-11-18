#!/usr/bin/env bash
# Compliance docs pipeline
#   1. OCR      source/scans/*.pdf|png|jpg  -> source/text/<name>.md   (tesseract)
#   2. Typeset  source/text/*.md            -> build/<name>.pdf        (pandoc + xelatex, latex/policy.tex)
#   3. Protect  build/<name>.pdf            -> ../public/docs/<name>.pdf (qpdf, AES-256)
#
# Protection model: empty user password (anyone can open and print, it is a public policy),
# owner password required to modify or extract. Set COMPLIANCE_OWNER_PASSWORD in the environment.
#
# Requires: tesseract (OCR), pandoc, xelatex (TeX Live: texlive-xetex texlive-fonts-extra), qpdf.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
scans="$here/source/scans"
text="$here/source/text"
build="$here/build"
out="$here/../public/docs"
template="$here/latex/policy.tex"
mkdir -p "$text" "$build" "$out"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1 ($2)" >&2; return 1; }; }

# 1. OCR (optional step: skipped if there is nothing to scan)
shopt -s nullglob
scan_files=("$scans"/*.{pdf,png,jpg,jpeg,tif,tiff})
if ((${#scan_files[@]})); then
  need tesseract "apt-get install tesseract-ocr" || exit 1
  for f in "${scan_files[@]}"; do
    name="$(basename "${f%.*}")"
    [[ -f "$text/$name.md" ]] && { echo "skip OCR (text exists, review manually): $name"; continue; }
    if [[ "$f" == *.pdf ]]; then
      need pdftoppm "apt-get install poppler-utils" || exit 1
      tmp="$(mktemp -d)"; pdftoppm -r 300 -png "$f" "$tmp/p"
      for p in "$tmp"/p*.png; do tesseract "$p" - -l eng 2>/dev/null; done > "$text/$name.md"
      rm -rf "$tmp"
    else
      tesseract "$f" - -l eng 2>/dev/null > "$text/$name.md"
    fi
    echo "OCR -> $text/$name.md  (REVIEW before publishing: OCR output is not trusted text)"
  done
fi

# 2 + 3. Typeset and protect
md_files=("$text"/*.md)
((${#md_files[@]})) || { echo "No policy sources in $text"; exit 0; }
need pandoc "apt-get install pandoc" || exit 1
need xelatex "apt-get install texlive-xetex" || exit 1
need qpdf "apt-get install qpdf" || exit 1
: "${COMPLIANCE_OWNER_PASSWORD:?set COMPLIANCE_OWNER_PASSWORD}"

for md in "${md_files[@]}"; do
  name="$(basename "${md%.md}")"
  pandoc "$md" --from markdown --template "$template" --pdf-engine=xelatex \
    -V date="$(date +%d\ %B\ %Y)" -o "$build/$name.pdf"
  qpdf --encrypt "" "$COMPLIANCE_OWNER_PASSWORD" 256 --modify=none --extract=n -- \
    "$build/$name.pdf" "$out/$name.pdf"
  echo "built: public/docs/$name.pdf"
done

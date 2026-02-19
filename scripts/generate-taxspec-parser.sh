#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GRAMMAR_FILE="$ROOT_DIR/TaxSpec.g4"
OUTPUT_DIR="$ROOT_DIR/src/antlr"

if ! command -v antlr >/dev/null 2>&1; then
  echo "Error: 'antlr' command not found in PATH." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR"/TaxSpec*.js \
      "$OUTPUT_DIR"/TaxSpec*.interp \
      "$OUTPUT_DIR"/TaxSpec*.tokens

antlr -Dlanguage=JavaScript -visitor -o "$OUTPUT_DIR" "$GRAMMAR_FILE"

echo "Generated ANTLR JavaScript parser files in: $OUTPUT_DIR"

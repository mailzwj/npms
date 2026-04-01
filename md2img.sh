#!/bin/sh
# Wrapper script: sets required env vars and runs md2img
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUPPETEER_CACHE_DIR="/private/tmp/claude-501/puppeteer-cache" \
  node "$SCRIPT_DIR/bin/md2img.js" "$@"

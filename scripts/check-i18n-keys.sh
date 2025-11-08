#!/usr/bin/env bash
set -e
pattern=$'\\b([a-z0-9_]+)@([a-z0-9_]+)\\b'
if matches=$(rg -n --pcre2 --glob 'packages/**/src/**/*.{ts,tsx,vue,js}' "$pattern" || true); then
  if [ -n "$matches" ]; then
    echo "Found forbidden i18n keys containing '@':"
    echo "$matches"
    exit 1
  fi
fi

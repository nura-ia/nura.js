#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
warnings=0

# Ensure required community files exist
required_files=(
  "LICENSE"
  "README.md"
  "CODE_OF_CONDUCT.md"
  "CONTRIBUTING.md"
  "SECURITY.md"
  "SUPPORT.md"
  "CODEOWNERS"
  ".github/workflows/ci.yml"
  ".github/ISSUE_TEMPLATE/bug_report.md"
  ".github/ISSUE_TEMPLATE/feature_request.md"
  ".github/PULL_REQUEST_TEMPLATE.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "[ERROR] Missing required file: $file"
    failures=$((failures + 1))
  fi
done

# Fail if secrets are detected
if rg --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!scripts/oss-audit.sh' 'VERCEL_' >/dev/null 2>&1; then
  echo "[ERROR] VERCEL_* reference detected. Remove vendor-specific secrets."
  failures=$((failures + 1))
fi

# Fail if .env files are present (excluding examples)
mapfile -t env_files < <(find . \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
  -path './dist' -prune -o \
  -path './build' -prune -o \
  -type f \
  \( -name '.env' -o -name '.env.*' \) \
  -print)

for env_file in "${env_files[@]}"; do
  if [[ "$env_file" != *'.env.example' ]]; then
    echo "[ERROR] Disallowed environment file detected: $env_file"
    failures=$((failures + 1))
  fi
done

# Warn for large binaries (>5MB) not tracked by Git LFS
lfs_available=true
tracked_files=()
if ! git lfs --version >/dev/null 2>&1; then
  lfs_available=false
  echo "[WARNING] Git LFS not installed; unable to verify large file tracking."
  warnings=$((warnings + 1))
else
  while IFS= read -r line; do
    tracked_files+=("${line##* }")
  done < <(git lfs ls-files)
fi

while IFS= read -r -d '' file; do
  if [[ "$lfs_available" == true ]]; then
    match=false
    for tracked in "${tracked_files[@]}"; do
      if [[ "$file" == "./$tracked" || "$file" == "$tracked" ]]; then
        match=true
        break
      fi
    done
    if [[ "$match" == false ]]; then
      echo "[WARNING] Large file not managed by Git LFS: $file"
      warnings=$((warnings + 1))
    fi
  else
    echo "[WARNING] Large file detected (check LFS manually): $file"
    warnings=$((warnings + 1))
  fi
done < <(find . -path './.git' -prune -o -path './node_modules' -prune -o -path './dist' -prune -o -path './build' -prune -o -size +5M -type f -print0)

if [[ $failures -gt 0 ]]; then
  echo "OSS audit failed with $failures error(s)."
  exit 1
fi

if [[ $warnings -gt 0 ]]; then
  echo "OSS audit completed with $warnings warning(s)."
else
  echo "OSS audit passed with no warnings."
fi

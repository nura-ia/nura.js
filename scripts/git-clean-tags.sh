#!/usr/bin/env bash
set -euo pipefail
# Borra tags locales y remotos que empiecen con v0
git fetch --tags
for t in $(git tag -l "v0*"); do
  echo "Deleting local tag $t"
  git tag -d "$t" || true
  echo "Deleting remote tag $t"
  git push origin ":refs/tags/$t" || true
done
echo "Done."

$ErrorActionPreference = "Stop"
git fetch --tags
$tags = git tag -l "v0*"
foreach ($t in $tags) {
  Write-Host "Deleting local tag $t"
  git tag -d $t | Out-Null
  Write-Host "Deleting remote tag $t"
  git push origin ":refs/tags/$t" | Out-Null
}
Write-Host "Done."

$ErrorActionPreference = "Stop"
# Eliminar ramas locales que comienzan por v0/ o legacy/
$local = git branch --list "v0/*", "legacy/*"
foreach ($b in $local) {
  $name = $b.Trim()
  if ($name.StartsWith("*")) { continue }
  Write-Host "Deleting local branch $name"
  git branch -D $name | Out-Null
}
# Eliminar ramas remotas con mismo patrón
$remote = git branch -r | Select-String -Pattern "origin/v0/", "origin/legacy/"
foreach ($r in $remote) {
  $full = $r.Line.Trim()
  $name = $full.Replace("origin/","")
  Write-Host "Deleting remote branch origin/$name"
  git push origin ":$name" | Out-Null
}
Write-Host "Done."

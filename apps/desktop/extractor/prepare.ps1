# Build-time opt-in. Do not run this from the downloader.
$ErrorActionPreference = 'Stop'
Push-Location (Resolve-Path (Join-Path $PSScriptRoot '../../..'))
try {
  $work = '.work/yt-dlp-signature'
  $null = New-Item -ItemType Directory -Force -Path $work
  $base = 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.11.23'
  foreach ($name in @('yt-dlp','SHA2-256SUMS','SHA2-256SUMS.sig')) {
    Invoke-WebRequest "$base/$name" -OutFile "$work/$name"
  }
  Invoke-WebRequest 'https://raw.githubusercontent.com/yt-dlp/yt-dlp/2026.11.23/public.key' -OutFile "$work/public.key"
  if ((Get-FileHash "$work/public.key").Hash -ne '45D6B415928B5F3E228B461FA9E6D7EB56A824931C785ECE00279A06C7A6D6E5') { throw 'Signing key mismatch.' }
  $gpg = Join-Path $env:ProgramFiles 'Git/usr/bin/gpg.exe'
  & $gpg --batch --no-options --homedir $work --import "$work/public.key"
  if ($LASTEXITCODE) { throw 'Cannot import release verification key.' }
  $verified = & $gpg --batch --no-options --homedir $work --status-fd 1 --verify "$work/SHA2-256SUMS.sig" "$work/SHA2-256SUMS"
  if ($LASTEXITCODE -or !($verified -match '^\[GNUPG:\] VALIDSIG AC0CBBE6848D6A873464AF4E57CF65933B5A7581 ')) { throw 'Release signature mismatch.' }
  $hash = 'e8665ed64d6b9172773e812f891fb707a0cb1ee8d9ef4fc1acb00cabee4c5256'
  if ((Get-FileHash "$work/yt-dlp").Hash -ne $hash -or !(Select-String -Quiet -Path "$work/SHA2-256SUMS" -Pattern "^$hash\s+\*?yt-dlp$")) { throw 'Archive checksum mismatch.' }
  $out = 'dist/desktop/extractor'
  $null = New-Item -ItemType Directory -Force -Path $out
  Copy-Item -LiteralPath "$work/yt-dlp" -Destination "$out/yt-dlp.zip" -Force
  Copy-Item -LiteralPath 'apps/desktop/extractor/select.py' -Destination $out -Force
} finally { Pop-Location }

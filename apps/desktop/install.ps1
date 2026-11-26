# Run from a reviewed checkout after pnpm build. Installs for the current user.
param([switch]$WithExtractor,[switch]$ExtendedLimits)
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$nodePath = Join-Path $env:ProgramFiles 'nodejs/node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { throw 'Install the official 64-bit Node distribution in Program Files first.' }
$signature = Get-AuthenticodeSignature -LiteralPath $nodePath
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(^|, )O=OpenJS Foundation(,|$)') {
  throw 'Node must have a valid OpenJS Foundation Authenticode signature.'
}
# Publish through a stable manifest. An interrupted build leaves registrations
# pointing at the previous complete generation, including its extractor policy.
$hostRoot = $env:LOCALAPPDATA
foreach ($component in @('DownloadIT','host')) {
  $hostRoot = Join-Path $hostRoot $component
  if (!(Test-Path -LiteralPath $hostRoot)) { $null = New-Item -ItemType Directory -Path $hostRoot }
  $folder = Get-Item -LiteralPath $hostRoot -Force
  if (!$folder.PSIsContainer -or ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe installation directory.' }
}
$generation = [Guid]::NewGuid().ToString('N')
$destination = Join-Path $hostRoot $generation
$null = New-Item -ItemType Directory -Path $destination
if ($ExtendedLimits) { $null = New-Item -ItemType File -Path (Join-Path $destination 'extended-limits') }
Copy-Item -LiteralPath (Join-Path $sourceRoot 'dist/desktop/host.mjs') -Destination $destination -Force
$codec = Join-Path $destination 'codec'
$null = New-Item -ItemType Directory -Force -Path $codec
if ((Get-Item -LiteralPath $codec).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unsafe codec directory.' }
foreach ($asset in @('encode.cjs','factory.cjs','convert.js','av.wasm','package.json')) {
  Copy-Item -LiteralPath (Join-Path $sourceRoot "dist/desktop/codec/$asset") -Destination $codec -Force
}
if ($WithExtractor) {
  $extractor = Join-Path $destination 'extractor'
  $archive = Join-Path $sourceRoot 'dist/desktop/extractor/yt-dlp.zip'
  if ((Get-FileHash $archive).Hash -ne 'e8665ed64d6b9172773e812f891fb707a0cb1ee8d9ef4fc1acb00cabee4c5256') { throw 'Prepare the signed extractor first.' }
  $null = New-Item -ItemType Directory -Force -Path $extractor
  if ((Get-Item -LiteralPath $extractor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unsafe extractor directory.' }
  Copy-Item -LiteralPath $archive -Destination $extractor -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'extractor/select.py') -Destination $extractor -Force
}
$launcher = Join-Path $destination 'DownloadIT.exe'
$compiler = Join-Path ([Environment]::GetFolderPath('Windows')) 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:exe /optimize+ /reference:System.Security.dll "/out:$launcher" (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE) { throw 'Launcher compilation failed.' }
$manifest = Join-Path $hostRoot 'host.json'
$identity = 'org.downloadit.host'
$data = @{ name=$identity; description='Download IT'; path=$launcher; type='stdio'; allowed_origins=@('chrome-extension://gnjjgfaigfdmkfmjmjnokalgifpjfccd/') }
$stagedManifest = Join-Path $destination 'host.json'
[IO.File]::WriteAllText($stagedManifest, ($data | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
if (Test-Path -LiteralPath $manifest) {
  $old = Get-Item -LiteralPath $manifest -Force
  if ($old.PSIsContainer -or ($old.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe host manifest.' }
  [IO.File]::Replace($stagedManifest,$manifest,[NullString]::Value)
} else { [IO.File]::Move($stagedManifest,$manifest) }
foreach ($vendor in @('Google/Chrome','BraveSoftware/Brave-Browser','Chromium')) {
  $key = "HKCU:/Software/$vendor/NativeMessagingHosts/$identity"
  $null = New-Item -Path $key -Force
  Set-Item -Path $key -Value $manifest
}

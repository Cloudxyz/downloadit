# Run from a reviewed checkout after pnpm build. Installs for the current user.
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$destination = Join-Path $env:LOCALAPPDATA 'DownloadIT/host'
$nodePath = Join-Path $env:ProgramFiles 'nodejs/node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { throw 'Install the official 64-bit Node distribution in Program Files first.' }
$null = New-Item -ItemType Directory -Force -Path $destination
foreach ($folder in @((Split-Path $destination), $destination)) {
  if ((Get-Item -LiteralPath $folder).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Installation directory must be local.' }
}
Copy-Item -LiteralPath (Join-Path $sourceRoot 'dist/desktop/host.mjs') -Destination $destination -Force
$codec = Join-Path $destination 'codec'
$null = New-Item -ItemType Directory -Force -Path $codec
if ((Get-Item -LiteralPath $codec).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unsafe codec directory.' }
foreach ($asset in @('encode.cjs','factory.cjs','convert.js','av.wasm','package.json')) {
  Copy-Item -LiteralPath (Join-Path $sourceRoot "dist/desktop/codec/$asset") -Destination $codec -Force
}
$launcher = Join-Path $destination 'DownloadIT.exe'
$compiler = Join-Path ([Environment]::GetFolderPath('Windows')) 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:exe /optimize+ /reference:System.Security.dll "/out:$launcher" (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE) { throw 'Launcher compilation failed.' }
$manifest = Join-Path $destination 'host.json'
$identity = 'org.downloadit.host'
$data = @{ name=$identity; description='Download IT'; path=$launcher; type='stdio'; allowed_origins=@('chrome-extension://gnjjgfaigfdmkfmjmjnokalgifpjfccd/') }
[IO.File]::WriteAllText($manifest, ($data | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
foreach ($vendor in @('Google/Chrome','BraveSoftware/Brave-Browser','Chromium')) {
  $key = "HKCU:/Software/$vendor/NativeMessagingHosts/$identity"
  $null = New-Item -Path $key -Force
  Set-Item -Path $key -Value $manifest
}

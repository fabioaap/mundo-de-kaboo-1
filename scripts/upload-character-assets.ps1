param(
    [Parameter(Mandatory)]
    [string]$ProjectRef,

    [Parameter(Mandatory)]
    [string]$ServiceRoleKey
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$CharactersDir = Join-Path $RootDir "assets\images\characters"

if (-not (Test-Path $CharactersDir)) {
    throw "Diretório de personagens não encontrado: $CharactersDir"
}

$Headers = @{
    Authorization = "Bearer $ServiceRoleKey"
    apikey        = $ServiceRoleKey
    "x-upsert"    = "true"
}

$Files = Get-ChildItem $CharactersDir -File | Where-Object { $_.Extension -match '^\.(png|jpg|jpeg|webp)$' }

foreach ($File in $Files) {
    $UploadUrl = "https://$ProjectRef.supabase.co/storage/v1/object/collections/characters/$($File.Name)"
    $ContentType = switch ($File.Extension.ToLowerInvariant()) {
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.webp' { 'image/webp' }
        default { 'image/png' }
    }

    Invoke-WebRequest -Method Post -Uri $UploadUrl -Headers $Headers -ContentType $ContentType -InFile $File.FullName | Out-Null
    Write-Host "  Upload concluído: characters/$($File.Name)"
}
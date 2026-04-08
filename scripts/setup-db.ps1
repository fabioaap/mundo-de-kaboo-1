# ============================================================
# setup-db.ps1 — Vincula o CLI do Supabase ao projeto remoto,
#                aplica migrations, executa seeds e atualiza
#                o .env.local para o projeto hospedado.
#
# Pré-requisitos:
#   1. Supabase CLI instalado em %LOCALAPPDATA%\supabase\
#   2. Access Token em: https://app.supabase.com/account/tokens
#   3. Senha do banco   em: Dashboard → Project Settings → Database
#
# Uso:
#   .\scripts\setup-db.ps1 -ProjectRef "abc123def456"
#   .\scripts\setup-db.ps1 -ProjectRef "abc123def456" -IncludeVoucherSeed
#
# Observação:
#   Se ProjectRef, Token, DbPassword ou AnonKey não forem informados,
#   o script pede os valores de forma interativa.
# ============================================================

param(
    [string]$ProjectRef,

    [string]$Token,

    [string]$DbPassword,

    [string]$AnonKey,

    [switch]$IncludeCatalogSeed,

    [switch]$IncludeVoucherSeed,

    [switch]$SkipEnvUpdate
)

function Read-RequiredSecret {
    param(
        [Parameter(Mandatory)]
        [string]$Prompt
    )

    do {
        $value = [System.Net.NetworkCredential]::new('', (Read-Host $Prompt -AsSecureString)).Password
    }
    while ([string]::IsNullOrWhiteSpace($value))

    return $value
}

function Read-OptionalSecret {
    param(
        [Parameter(Mandatory)]
        [string]$Prompt
    )

    return [System.Net.NetworkCredential]::new('', (Read-Host $Prompt -AsSecureString)).Password
}

function Read-RequiredValue {
    param(
        [Parameter(Mandatory)]
        [string]$Prompt
    )

    do {
        $value = Read-Host $Prompt
    }
    while ([string]::IsNullOrWhiteSpace($value))

    return $value.Trim()
}

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
    $ProjectRef = Read-RequiredValue "Cole o Project Ref do projeto Supabase"
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    $Token = Read-RequiredSecret "Cole o Supabase Access Token"
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
    $DbPassword = Read-RequiredSecret "Cole a senha do banco remoto"
}

$env:SUPABASE_ACCESS_TOKEN = $Token
$env:SUPABASE_ANALYTICS_ENABLED = "false"
$env:PATH += ";$env:LOCALAPPDATA\supabase"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$uploadScript = Join-Path $ScriptDir "upload-character-assets.ps1"

Push-Location $RootDir

try {
    Write-Host "▶ Vinculando ao projeto remoto $ProjectRef ..."
    supabase link --project-ref $ProjectRef --password $DbPassword

    Write-Host "▶ Aplicando migrations remotas ..."
    "y" | supabase db push

    if ($IncludeCatalogSeed) {
        Write-Host "▶ Executando seed do catálogo (supabase/seed.sql) ..."
        supabase db query --linked -f supabase/seed.sql
        Write-Host "✅ Seed do catálogo concluído com sucesso!"
    }
    else {
        Write-Host "ℹ️  Seed do catálogo não executado. Use -IncludeCatalogSeed se quiser sincronizar os dados versionados."
    }

    if ($IncludeVoucherSeed) {
        Write-Host "▶ Executando seed de vouchers de homologação (supabase/seed.vouchers.sql) ..."
        supabase db query --linked -f supabase/seed.vouchers.sql
        Write-Host "✅ Seed de vouchers concluído com sucesso!"
    }
    else {
        Write-Host "ℹ️  Seed de vouchers não executado. Use -IncludeVoucherSeed para popular códigos de homologação."
    }

    if (Test-Path $uploadScript) {
        $apiKeysRaw = supabase projects api-keys --project-ref $ProjectRef --output json
        $serviceRoleKey = (($apiKeysRaw | ConvertFrom-Json) | Where-Object { $_.name -eq 'service_role' }).api_key
        if (-not [string]::IsNullOrWhiteSpace($serviceRoleKey)) {
            Write-Host "▶ Enviando personagens para o bucket collections ..."
            & $uploadScript -ProjectRef $ProjectRef -ServiceRoleKey $serviceRoleKey
            Write-Host "✅ Assets de personagens enviados com sucesso!"
        }
    }

    if ($SkipEnvUpdate) {
        Write-Host "ℹ️  Atualização do .env.local ignorada por -SkipEnvUpdate."
        return
    }

    if ([string]::IsNullOrWhiteSpace($AnonKey)) {
        $AnonKey = Read-OptionalSecret "Cole a ANON KEY do projeto (Dashboard → API)"
    }

    if ([string]::IsNullOrWhiteSpace($AnonKey)) {
        Write-Warning "ANON KEY não informada. O .env.local não foi atualizado."
        return
    }

    $envFile = Join-Path $RootDir ".env.local"
    @"
VITE_SUPABASE_URL=https://$ProjectRef.supabase.co
VITE_SUPABASE_ANON_KEY=$AnonKey
"@ | Set-Content $envFile

    Write-Host "✅ .env.local atualizado para o projeto remoto!"
}
finally {
    Pop-Location
}

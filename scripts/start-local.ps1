# ============================================================
# start-local.ps1 — Sobe o Supabase local, aplica schema +
#                   seed e gera o .env.local automaticamente.
#
# Pré-requisito único: Docker Desktop em execução.
#
# Uso:
#   .\scripts\start-local.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$env:SUPABASE_ANALYTICS_ENABLED = "false"
$env:PATH += ";$env:LOCALAPPDATA\supabase"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Push-Location $RootDir

# ── 1. Verificar Docker ─────────────────────────────────────
Write-Host "▶ Verificando Docker..."
try {
    $null = docker info 2>&1
}
catch {
    Write-Error "Docker Desktop não está em execução. Abra o Docker Desktop e tente novamente."
    exit 1
}

# ── 2. Subir Supabase local ─────────────────────────────────
Write-Host "▶ Iniciando Supabase local (pode demorar na 1ª vez)..."
$startOutput = supabase start 2>&1 | Tee-Object -Variable startOutput
Write-Host $startOutput

# ── 3. Aplicar migrations + seed ────────────────────────────
Write-Host "▶ Aplicando migrations e seed..."
supabase db reset --local

# ── 4. Capturar ANON KEY gerada ─────────────────────────────
$statusJson = supabase status --output json | ConvertFrom-Json
$anonKey = $statusJson.anon_key
$apiUrl = $statusJson.api_url

if (-not $anonKey) {
    Write-Warning "Não foi possível capturar a ANON KEY automaticamente."
    Write-Host "Execute 'supabase status' e copie o valor de 'anon key' para o .env.local"
}
else {
    # ── 5. Gravar .env.local ─────────────────────────────────
    $envFile = Join-Path $RootDir ".env.local"
    @"
VITE_SUPABASE_URL=$apiUrl
VITE_SUPABASE_ANON_KEY=$anonKey
"@ | Set-Content $envFile
    Write-Host "✅ .env.local criado!"
    Write-Host "   URL : $apiUrl"
    Write-Host "   KEY : $($anonKey.Substring(0,20))..."
}

Write-Host ""
Write-Host "✅ Supabase local pronto!"
Write-Host "   Supabase Studio: http://127.0.0.1:54323"
Write-Host "   API:             http://127.0.0.1:54321"
Write-Host ""
Write-Host "▶ Para parar:  supabase stop"
Write-Host "▶ Para resetar: supabase db reset --local"

Pop-Location

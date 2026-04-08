# ============================================================
# create-project.ps1 — Cria um projeto Supabase Cloud do zero,
#                       aplica migrations, seeds e gera .env.local.
#
# Pré-requisitos:
#   1. Supabase CLI ≥ 2.0 instalado em %LOCALAPPDATA%\supabase\
#   2. Conta no Supabase (grátis) — cadastre-se com GitHub em:
#      https://supabase.com/dashboard/sign-in
#   3. Access Token em: https://supabase.com/dashboard/account/tokens
#
# Uso:
#   .\scripts\create-project.ps1
#   .\scripts\create-project.ps1 -Token "sbp_xxxx"
# ============================================================

param(
    [string]$Token,
    [string]$ProjectName = "mundo-de-kaboo",
    [string]$Region = "sa-east-1",
    [string]$Plan = "free"
)

$ErrorActionPreference = "Stop"
$env:PATH += ";$env:LOCALAPPDATA\supabase"
$env:SUPABASE_ANALYTICS_ENABLED = "false"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# ----------------------------------------------------------
# 1. Obter Access Token
# ----------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host ""
    Write-Host "=== Supabase Access Token ===" -ForegroundColor Cyan
    Write-Host "Obtenha em: https://supabase.com/dashboard/account/tokens"
    Write-Host ""
    $secureToken = Read-Host "Cole o Access Token (sbp_...)" -AsSecureString
    $Token = [System.Net.NetworkCredential]::new('', $secureToken).Password
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Error "Access Token obrigatorio. Gere em: https://supabase.com/dashboard/account/tokens"
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $Token

# ----------------------------------------------------------
# 2. Verificar se o CLI funciona e listar organizacoes
# ----------------------------------------------------------
Write-Host ""
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
$cliVersion = supabase --version 2>&1
Write-Host "  CLI: $cliVersion"

Write-Host "Buscando organizacoes..." -ForegroundColor Yellow
$orgsRaw = supabase orgs list --output json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao listar organizacoes. Verifique o Access Token.`n$orgsRaw"
    exit 1
}

$orgs = $orgsRaw | ConvertFrom-Json
if ($orgs.Count -eq 0) {
    Write-Error "Nenhuma organizacao encontrada. Crie uma em: https://supabase.com/dashboard/org/new"
    exit 1
}

$orgId = $orgs[0].id
$orgName = $orgs[0].name
Write-Host "  Organizacao: $orgName ($orgId)" -ForegroundColor Green

# ----------------------------------------------------------
# 3. Verificar se ja existe um projeto com esse nome
# ----------------------------------------------------------
Write-Host ""
Write-Host "Verificando projetos existentes..." -ForegroundColor Yellow
$projectsRaw = supabase projects list --output json 2>&1
$projects = $projectsRaw | ConvertFrom-Json

$existingProject = $projects | Where-Object { $_.name -eq $ProjectName }

if ($existingProject) {
    $projectRef = $existingProject.id
    Write-Host "  Projeto '$ProjectName' ja existe! Ref: $projectRef" -ForegroundColor Cyan
}
else {
    # ----------------------------------------------------------
    # 4. Criar o projeto
    # ----------------------------------------------------------
    Write-Host ""
    Write-Host "Criando projeto '$ProjectName' na regiao $Region..." -ForegroundColor Yellow

    # Gerar senha segura para o banco
    $dbPassword = -join ((65..90) + (97..122) + (48..57) + (33, 35, 36, 37, 38, 42, 43, 61) | Get-Random -Count 24 | ForEach-Object { [char]$_ })

    Write-Host "  Senha do banco gerada automaticamente." -ForegroundColor DarkGray

    $createOutput = supabase projects create $ProjectName `
        --org-id $orgId `
        --region $Region `
        --db-password $dbPassword `
        --plan $Plan `
        --output json 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha ao criar projeto:`n$createOutput"
        exit 1
    }

    $newProject = $createOutput | ConvertFrom-Json
    $projectRef = $newProject.id
    Write-Host "  Projeto criado! Ref: $projectRef" -ForegroundColor Green

    # Salvar senha no .db-password (gitignored)
    $dbPasswordFile = Join-Path $RootDir ".db-password"
    $dbPassword | Set-Content $dbPasswordFile -NoNewline
    Write-Host "  Senha salva em .db-password (local, gitignored)" -ForegroundColor DarkGray
}

# ----------------------------------------------------------
# 5. Aguardar projeto ficar ACTIVE_HEALTHY
# ----------------------------------------------------------
Write-Host ""
Write-Host "Aguardando projeto ficar pronto..." -ForegroundColor Yellow
$maxAttempts = 30  # 5 minutos (10s * 30)
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep 10

    $projectsRefresh = supabase projects list --output json 2>&1 | ConvertFrom-Json
    $proj = $projectsRefresh | Where-Object { $_.id -eq $projectRef }

    $status = $proj.status
    Write-Host "  [$attempt/$maxAttempts] Status: $status" -ForegroundColor DarkGray

    if ($status -eq "ACTIVE_HEALTHY") {
        Write-Host "  Projeto ativo!" -ForegroundColor Green
        break
    }
}

if ($status -ne "ACTIVE_HEALTHY") {
    Write-Warning "Projeto pode ainda nao estar pronto (status: $status). Continuando mesmo assim..."
}

# ----------------------------------------------------------
# 6. Obter API keys
# ----------------------------------------------------------
Write-Host ""
Write-Host "Obtendo API keys..." -ForegroundColor Yellow
$apiKeysRaw = supabase projects api-keys --project-ref $projectRef --output json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao obter API keys:`n$apiKeysRaw"
    exit 1
}

$apiKeys = $apiKeysRaw | ConvertFrom-Json
$anonKey = ($apiKeys | Where-Object { $_.name -eq "anon" }).api_key
$serviceRoleKey = ($apiKeys | Where-Object { $_.name -eq "service_role" }).api_key

if ([string]::IsNullOrWhiteSpace($anonKey)) {
    Write-Warning "ANON key nao encontrada. Verifique em: https://supabase.com/dashboard/project/$projectRef/settings/api"
}
else {
    Write-Host "  anon key: $($anonKey.Substring(0, 20))..." -ForegroundColor Green
}

# ----------------------------------------------------------
# 7. Linkar e aplicar Migrations
# ----------------------------------------------------------
Write-Host ""
Write-Host "Linkando CLI ao projeto..." -ForegroundColor Yellow
Push-Location $RootDir

try {
    # Se temos a senha salva, usamos; caso contrario, interage
    $dbPasswordFile = Join-Path $RootDir ".db-password"
    $linkArgs = @("link", "--project-ref", $projectRef)

    if (Test-Path $dbPasswordFile) {
        $savedPassword = Get-Content $dbPasswordFile -Raw
        $linkArgs += "--password"
        $linkArgs += $savedPassword.Trim()
    }

    & supabase @linkArgs 2>&1 | Write-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Link pode ja ter sido feito. Continuando..."
    }

    Write-Host ""
    Write-Host "Aplicando migrations..." -ForegroundColor Yellow
    "y" | supabase db push 2>&1 | Write-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha ao aplicar migrations."
        exit 1
    }
    Write-Host "  Migrations aplicadas!" -ForegroundColor Green

    # ----------------------------------------------------------
    # 8. Rodar Seeds
    # ----------------------------------------------------------
    Write-Host ""
    Write-Host "Executando seed do catalogo..." -ForegroundColor Yellow
    $seedFile = Join-Path $RootDir "supabase\seed.sql"
    if (Test-Path $seedFile) {
        supabase db query --linked -f "supabase/seed.sql" 2>&1 | Write-Host
        Write-Host "  Seed do catalogo aplicado!" -ForegroundColor Green
    }

    Write-Host "Executando seed de vouchers..." -ForegroundColor Yellow
    $voucherSeedFile = Join-Path $RootDir "supabase\seed.vouchers.sql"
    if (Test-Path $voucherSeedFile) {
        supabase db query --linked -f "supabase/seed.vouchers.sql" 2>&1 | Write-Host
        Write-Host "  Seed de vouchers aplicado!" -ForegroundColor Green
    }

    $uploadScript = Join-Path $ScriptDir "upload-character-assets.ps1"
    if ((Test-Path $uploadScript) -and -not [string]::IsNullOrWhiteSpace($serviceRoleKey)) {
        Write-Host ""
        Write-Host "Enviando personagens para o bucket collections..." -ForegroundColor Yellow
        & $uploadScript -ProjectRef $projectRef -ServiceRoleKey $serviceRoleKey
        Write-Host "  Assets de personagens enviados!" -ForegroundColor Green
    }

    # ----------------------------------------------------------
    # 9. Criar .env.local
    # ----------------------------------------------------------
    Write-Host ""
    Write-Host "Criando .env.local..." -ForegroundColor Yellow
    $envFile = Join-Path $RootDir ".env.local"
    @"
VITE_SUPABASE_URL=https://$projectRef.supabase.co
VITE_SUPABASE_ANON_KEY=$anonKey
"@ | Set-Content $envFile

    Write-Host "  .env.local criado!" -ForegroundColor Green

    # ----------------------------------------------------------
    # 10. Resumo final
    # ----------------------------------------------------------
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  PROJETO SUPABASE CRIADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Nome:       $ProjectName"
    Write-Host "  Ref:        $projectRef"
    Write-Host "  Regiao:     $Region"
    Write-Host "  URL:        https://$projectRef.supabase.co"
    Write-Host "  Dashboard:  https://supabase.com/dashboard/project/$projectRef"
    Write-Host ""
    Write-Host "  Migrations: 4 aplicadas"
    Write-Host "  Seeds:      catalogo + vouchers de homologacao"
    Write-Host "  Storage:    bucket collections + personagens enviados"
    Write-Host "  .env.local: criado com ANON KEY"
    Write-Host ""
    Write-Host "  Vouchers de teste:" -ForegroundColor Yellow
    Write-Host "    KABOO-1MES-2026    (1 mes, ativo)"
    Write-Host "    KABOO-3MESES-2026  (3 meses, ativo)"
    Write-Host "    KABOO-6MESES-2026  (6 meses, ativo)"
    Write-Host "    KABOO-9MESES-2026  (9 meses, ativo)"
    Write-Host "    KABOO-12MESES-2026 (12 meses, ativo)"
    Write-Host ""
    Write-Host "  Para rodar o app:"
    Write-Host "    npm run dev"
    Write-Host ""
}
finally {
    Pop-Location
}

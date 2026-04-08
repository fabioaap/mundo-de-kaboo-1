param(
    [Parameter(Mandatory = $true)]
    [string]$Email,

    [switch]$ListPending
)

$ErrorActionPreference = 'Stop'
$env:PATH += ";$env:LOCALAPPDATA\supabase"
$env:SUPABASE_ANALYTICS_ENABLED = 'false'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Push-Location $RootDir

try {
    if ($ListPending) {
        supabase db query --linked "select email, created_at from auth.users where email_confirmed_at is null order by created_at desc;"
        exit $LASTEXITCODE
    }

    $safeEmail = $Email.Replace("'", "''").Trim().ToLower()
    if ([string]::IsNullOrWhiteSpace($safeEmail)) {
        throw 'Informe um e-mail válido.'
    }

    $query = @"
update auth.users
set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where lower(email) = '$safeEmail';

select email, email_confirmed_at, confirmed_at
from auth.users
where lower(email) = '$safeEmail';
"@

    supabase db query --linked $query
}
finally {
    Pop-Location
}
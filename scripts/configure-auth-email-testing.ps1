param(
    [string]$Token,
    [string]$ProjectRef = 'yevysgqlnhonhkczkyhu',
    [string]$SiteUrl = 'http://localhost:4174',
    [string[]]$RedirectUrls = @('http://localhost:4174/**', 'http://127.0.0.1:4173/**'),
    [bool]$MailerAutoconfirm = $true,
    [Nullable[int]]$RateLimitEmailSent = $null,
    [string]$SmtpHost,
    [Nullable[int]]$SmtpPort,
    [string]$SmtpUser,
    [string]$SmtpPass,
    [string]$SmtpAdminEmail,
    [string]$SmtpSenderName
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Token)) {
    $Token = $env:SUPABASE_ACCESS_TOKEN
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw 'Informe um Access Token do Supabase em -Token ou SUPABASE_ACCESS_TOKEN.'
}

$headers = @{
    Authorization  = "Bearer $Token"
    'Content-Type' = 'application/json'
}

$body = @{
    site_url           = $SiteUrl
    uri_allow_list     = ($RedirectUrls -join ',')
    mailer_autoconfirm = $MailerAutoconfirm
}

if ($null -ne $RateLimitEmailSent) {
    $body.rate_limit_email_sent = $RateLimitEmailSent
}

$hasCustomSmtp = -not [string]::IsNullOrWhiteSpace($SmtpHost) -and
-not [string]::IsNullOrWhiteSpace($SmtpUser) -and
-not [string]::IsNullOrWhiteSpace($SmtpPass) -and
-not [string]::IsNullOrWhiteSpace($SmtpAdminEmail) -and
$null -ne $SmtpPort

if ($hasCustomSmtp) {
    $body.smtp_host = $SmtpHost
    $body.smtp_port = $SmtpPort
    $body.smtp_user = $SmtpUser
    $body.smtp_pass = $SmtpPass
    $body.smtp_admin_email = $SmtpAdminEmail
    $body.smtp_sender_name = $SmtpSenderName
}

$response = Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" -Headers $headers -Body ($body | ConvertTo-Json -Depth 6)

$response | Select-Object site_url, uri_allow_list, mailer_autoconfirm, rate_limit_email_sent, smtp_host, smtp_port, smtp_admin_email, smtp_sender_name | Format-List

if (-not $hasCustomSmtp -and $MailerAutoconfirm -eq $false) {
    Write-Warning 'Sem SMTP customizado, o provedor nativo do Supabase continua limitado a 2 e-mails por hora no signup/recover.'
}
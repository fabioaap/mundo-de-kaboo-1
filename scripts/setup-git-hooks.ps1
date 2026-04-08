# Setup-GitHooks.ps1
# Script para configurar Git hooks automáticos no projeto (Windows)

Write-Host "🔧 Configurando Git hooks para auto-update de documentação..." -ForegroundColor Yellow

# Define o diretório de hooks
git config core.hooksPath .githooks

Write-Host ""
Write-Host "✅ Git hooks configurados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Próxima atualização de docs acontecerá:" -ForegroundColor Cyan
Write-Host "   • Antes de cada commit (pre-commit hook)"
Write-Host "   • Em cada push (GitHub Actions)"
Write-Host ""
Write-Host "💡 Para testar:" -ForegroundColor Yellow
Write-Host "   npm run update-docs"
Write-Host ""
Write-Host "🚀 Para fazer commit agora:" -ForegroundColor Cyan
Write-Host "   git add ."
Write-Host "   git commit -m 'feat: sua mensagem aqui'"
Write-Host ""

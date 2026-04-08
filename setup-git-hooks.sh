#!/bin/bash
# setup-git-hooks.sh
# Script para configurar Git hooks automáticos no projeto

echo "🔧 Configurando Git hooks para auto-update de documentação..."

# Define o diretório de hooks
git config core.hooksPath .githooks

# Torna os hooks executáveis
chmod +x .githooks/pre-commit

echo ""
echo "✅ Git hooks configurados com sucesso!"
echo ""
echo "📚 Próxima atualização de docs acontecerá:"
echo "   • Antes de cada commit (pre-commit hook)"
echo "   • Em cada push (GitHub Actions)"
echo ""
echo "💡 Para testar:"
echo "   npm run update-docs"
echo ""
echo "🚀 Para fazer commit agora:"
echo "   git add ."
echo "   git commit -m 'feat: sua mensagem aqui'"
echo ""

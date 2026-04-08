# Guide: Auto Update Documentation

## O que é o Script `update-docs.mjs`?

Um script Node.js que **escaneia automaticamente** o código-fonte do projeto e gera/atualiza documentações em Markdown.

## O que ele faz?

✅ **Analisa** componentes React, telas, hooks, tipos e API  
✅ **Extrai** JSDoc, comentários e estrutura de código  
✅ **Gera** documentações estruturadas em Markdown  
✅ **Atualiza** INFRAESTRUTURA.md com estatísticas  
✅ **Cria** changelog automático  
✅ **Mantém histórico** de mudanças  

## Como usar?

### 1. Rodar manualmente

```bash
npm run update-docs
```

### 2. Executar antes de commits (Pre-commit hook)

Adicione ao `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run update-docs
git add docs/ INFRAESTRUTURA.md
```

### 3. Executar em CI/CD (GitHub Actions)

```yaml
- name: Update documentation
  run: npm run update-docs
```

## Arquivos gerados/atualizados

| Arquivo | Propósito |
|---|---|
| `docs/COMPONENTES.md` | ✨ Lista de todos os componentes React |
| `docs/SCREENS.md` | 🎬 Documentação de todas as telas |
| `docs/HOOKS.md` | 🎣 Guia de React Hooks customizados |
| `docs/API.md` | 🔌 Documentação de funções de API |
| `docs/CHANGELOG.md` | 📝 Changelog automático |
| `INFRAESTRUTURA.md` | 🏗️ Atualiza seções com novos dados |

## Exemplo de output

```
🚀 Iniciando atualização automática de documentações...

📋 Analisando Componentes
✓ 23 componentes encontrados

📋 Analisando Telas
✓ 15 telas encontradas

📋 Analisando Hooks
✓ 7 hooks encontrados

📋 Analisando Types
✓ 45 tipos encontrados

📋 Gerando documentação de Componentes
📋 Gerando documentação de Hooks
📋 Gerando documentação de Telas
📋 Gerando documentação de API
📋 Gerando Changelog

📋 Escrevendo documentações
✓ COMPONENTES.md criado/atualizado
✓ HOOKS.md criado/atualizado
✓ SCREENS.md criado/atualizado
✓ API.md criado/atualizado
✓ CHANGELOG.md criado/atualizado

✅ Documentações atualizadas com sucesso!

📊 Resumo:
   - Componentes: 23
   - Telas: 15
   - Hooks: 7
   - Tipos: 45
   - Arquivos criados: 5/5

📁 Documentações em: /path/to/docs
```

## Como adicionar documentação ao código?

Para o script reconhecer melhor seu código, use JSDoc:

### Para Componentes
```tsx
/**
 * Card com efeito 3D para coleção
 * Exibe capa + título + nível educacional
 * 
 * @param props Props do componente
 * @returns Elemento React renderizado
 */
export const Card3D: React.FC<Card3DProps> = ({ ...props }) => {
  // ...
}

interface Card3DProps {
  title: string;
  imageUrl: string;
  level: string;
}
```

### Para Hooks
```typescript
/**
 * Hook para detectar orientação do device (portrait/landscape)
 * 
 * @returns 'portrait' | 'landscape'
 */
export const useOrientation = () => {
  // ...
}
```

### Para Funções de API
```typescript
/**
 * Valida um código de voucher sem resgatá-lo
 * 
 * @param code - Código do voucher (ex: KABOO-3MESES-2026)
 * @returns Promise<VoucherValidationResult>
 * 
 * @example
 * const result = await api.validateVoucher('KABOO-3MESES-2026');
 * if (result.success) {
 *   console.log('Voucher válido:', result.voucher);
 * }
 */
export async function validateVoucher(code: string): Promise<VoucherValidationResult> {
  // ...
}
```

## Próximas melhorias

- [ ] Detectar mudanças no git e só processar arquivos alterados
- [ ] Gerar documentação de API em OpenAPI/Swagger format
- [ ] Validar links nas documentações
- [ ] Gerar diagrama de dependências automático
- [ ] Sincronizar com Notion/Confluence
- [ ] Enviar notificação quando há mudanças significativas
- [ ] Validar cobertura de documentação (% do código documentado)

## Troubleshooting

### "Erro ao ler arquivo"
Verifique se o arquivo realmente existe e as permissões estão OK.

### "Nenhuma documentação gerada"
Verifique se há arquivos `.tsx` em `components/`, `screens/`, etc.

### Script muito lento
Se o projeto crescer, adicione filtros em `getAllFiles()` para pular diretórios.

---

**Última atualização**: 08/04/2026  
**Script**: `scripts/update-docs.mjs`

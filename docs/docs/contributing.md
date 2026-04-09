---
id: contributing
title: Guia de Contribuição
sidebar_position: 99
---

# Guia de Contribuição

Obrigado por querer contribuir com o Mundo de Kaboo! Este guia explica como adicionar novas funcionalidades mantendo a consistência do projeto.

## Workflow de Contribuição

1. Faça um fork do repositório (se aplicável)
2. Crie uma branch para sua feature:
   ```bash
   git checkout -b feature/minha-nova-funcionalidade
   ```
3. Implemente as mudanças
4. Teste localmente com `npm run dev`
5. Faça commit das mudanças:
   ```bash
   git commit -m 'feat: adiciona nova funcionalidade'
   ```
6. Abra um Pull Request

## Adicionando uma Nova Tela

### 1. Crie o arquivo da tela

```bash
# Crie em screens/
touch screens/MinhaNovaScreen.tsx
```

```tsx
// screens/MinhaNovaScreen.tsx
import React from 'react';
import { ScreenName } from '../types';
import { PageHeader } from '../components/PageHeader';

interface MinhaNovaScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
}

export const MinhaNovaScreen: React.FC<MinhaNovaScreenProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <PageHeader title="Minha Tela" onBack={() => onNavigate('home')} />
      <div className="flex-1 p-4">
        {/* Conteúdo da tela */}
      </div>
    </div>
  );
};
```

### 2. Adicione o tipo em `types.ts`

```typescript
export type ScreenName =
  | 'login'
  // ... telas existentes ...
  | 'minha_nova_tela'; // ← adicione aqui
```

### 3. Registre no `App.tsx`

```tsx
// Import
import { MinhaNovaScreen } from './screens/MinhaNovaScreen';

// No renderScreen()
case 'minha_nova_tela':
  return <MinhaNovaScreen onNavigate={navigate} />;
```

### 4. Adicione ao BottomNav (se necessário)

No `components/BottomNav.tsx`, adicione um item de navegação se a tela precisar de acesso pelo menu principal.

---

## Adicionando um Novo Componente

```bash
touch components/MeuComponente.tsx
```

```tsx
// components/MeuComponente.tsx
import React from 'react';

interface MeuComponenteProps {
  titulo: string;
  children?: React.ReactNode;
}

export const MeuComponente: React.FC<MeuComponenteProps> = ({ titulo, children }) => {
  return (
    <div className="rounded-lg bg-white shadow p-4">
      <h3 className="font-bold text-gray-800">{titulo}</h3>
      {children}
    </div>
  );
};
```

---

## Adicionando um Novo Hook

```bash
touch hooks/useMeuHook.ts
```

```typescript
// hooks/useMeuHook.ts
import { useState, useEffect } from 'react';

export function useMeuHook(parametro: string) {
  const [resultado, setResultado] = useState<string>('');

  useEffect(() => {
    // Lógica do hook
    setResultado(parametro.toUpperCase());
  }, [parametro]);

  return resultado;
}
```

---

## Adicionando uma Nova Rota de API

No `lib/api.ts`, adicione um método ao objeto `api`:

```typescript
export const api = {
  // ... métodos existentes ...

  /**
   * Meu novo método de API
   */
  async meuNovoMetodo(param: string): Promise<MeuTipo | null> {
    const { data, error } = await supabase
      .from('minha_tabela')
      .select('*')
      .eq('campo', param)
      .single();

    if (error) {
      logger.error('Erro no meu método:', error);
      return null;
    }

    return data;
  },
};
```

---

## Padrões de Código

### TypeScript

- Todo código deve ser tipado
- Evite `any` — use tipos específicos
- Use `interface` para objetos, `type` para unions

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `CollectionModal` |
| Arquivos de componentes | PascalCase | `CollectionModal.tsx` |
| Hooks | camelCase com `use` | `useIsMobile` |
| Arquivos de hooks | camelCase com `use` | `useIsMobile.ts` |
| Funções utilitárias | camelCase | `getCharacterColor` |
| Constantes | UPPER_SNAKE_CASE | `STORAGE_NAV_STATE` |

### CSS / Tailwind

- Use classes Tailwind CSS para estilos
- Use a função `cn()` de `lib/utils.ts` para classes condicionais
- Prefira classes responsivas `md:` para diferenciação mobile/desktop

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona nova funcionalidade
fix: corrige bug na tela de busca
docs: atualiza documentação do API
style: formata código
refactor: refatora componente de modal
```

---

## Atualizando a Documentação

Se adicionar uma nova funcionalidade, atualize também a documentação no Docusaurus:

```bash
cd docs
# Adicione ou edite arquivos em docs/docs/
# Atualize o sidebar em sidebars.ts se necessário
npm run start  # Para visualizar as mudanças
```

---

## Suporte

Para dúvidas sobre contribuição, entre em contato: **suporte@mundodekaboo.com**

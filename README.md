<div align="center">
  <img src="./assets/images/logo-kaboo.png" alt="Mundo de Kaboo Logo" width="200" />
  
  # Mundo de Kaboo
  
  *Plataforma educacional para professores do Ensino Fundamental*
</div>

## 📚 Sobre o Mundo de Kaboo

**Mundo de Kaboo** é uma plataforma educacional web desenvolvida para professores do Ensino Fundamental, oferecendo acesso organizado a uma vasta coleção de recursos educacionais digitais. A aplicação permite que educadores explorem, organizem e utilizem livros, audiobooks e vídeos educacionais de forma intuitiva e eficiente.

### 🎯 Principais Funcionalidades

- **📖 Biblioteca Digital**: Acesso a livros em PDF com visualizador interativo estilo flipbook
- **🎧 Audiobooks**: Player de áudio integrado para conteúdo educacional em formato de áudio
- **🎥 Vídeos Educacionais**: Player de vídeo para recursos audiovisuais
- **🔍 Busca Avançada**: Sistema de busca para encontrar conteúdo rapidamente
- **📁 Organização por Coleções**: Organize conteúdo por categorias e temas
- **👤 Perfil Personalizado**: Sistema de autenticação e perfis de usuário
- **📱 Design Responsivo**: Interface otimizada para desktop e dispositivos móveis
- **🎨 Temas Personalizados**: Cada coleção pode ter sua própria cor de tema
- **🏷️ Sistema de Tags**: Organize e filtre conteúdo com tags personalizadas

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** 18 ou superior
- **npm** (incluído com Node.js)
- Conta no **Supabase** para backend e autenticação, caso você vá sair do modo demonstração

### Instalação

1. **Clone o repositório** (se aplicável) ou navegue até o diretório do projeto:
   ```bash
   cd mundo-de-kaboo
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Escolha como quer rodar o backend**:

   **Modo demonstração**

   Não crie o `.env.local`. A aplicação entra automaticamente em modo demonstração e usa o catálogo local em `data/catalog.seed.json`.

   **Supabase local**

   Copie o arquivo de exemplo e suba o stack local:
   ```powershell
   Copy-Item .env.local.example .env.local
   .\scripts\start-local.ps1
   ```

   **Supabase hospedado (novo projeto — recomendado)**

   Se você **não tem um projeto Supabase**, o script cria tudo automaticamente:
   ```powershell
   .\scripts\create-project.ps1
   ```
   Ele pede apenas o **Access Token** (gere em [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)) e faz o resto:
   - Cria o projeto no Supabase Cloud (região `sa-east-1`)
   - Aguarda até o projeto ficar ativo
   - Aplica as migrations de schema, vouchers e storage
   - Roda os seeds (catálogo + vouchers de homologação)
   - Cria o bucket `collections` e envia os personagens para o storage
   - Cria o `.env.local` com URL e ANON KEY

   Observação: no plano free com SMTP padrão, o Supabase limita e-mails transacionais. Para homologação intensiva, prefira confirmar usuários manualmente ou configurar SMTP próprio.

   **Supabase hospedado (projeto existente)**

   Se já tem um projeto, use o setup-db para vincular:
   ```powershell
   .\scripts\setup-db.ps1 -ProjectRef "seu_project_ref"
   ```

   Flags opcionais:
   - `-IncludeCatalogSeed` — sincroniza catálogo versionado
   - `-IncludeVoucherSeed` — popula vouchers de homologação
   - `-IncludeCatalogSeed -IncludeVoucherSeed` — executa ambos

   O seed do catálogo pode sobrescrever dados existentes. O seed de vouchers usa códigos previsíveis. Evite em produção sem validar o impacto.

4. **Execute o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   
   A aplicação estará disponível em `http://localhost:4100` (ou outra porta indicada no terminal)

5. **Build para produção**:
   ```bash
   npm run build
   ```
   
   Os arquivos de produção serão gerados na pasta `dist/`

## 🌐 Publicação no GitHub Pages

O repositório de publicação agora é `educacrossgit/Mundo-de-Kaboo-V2`.

1. No GitHub, abra **Settings > Pages** e selecione **GitHub Actions** como source.
2. O workflow `.github/workflows/deploy-pages.yml` publica automaticamente em pushes para `main` e `v1.1`.
3. Se quiser publicar com Supabase real, cadastre os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Settings > Secrets and variables > Actions**.
4. Se os secrets não forem configurados, o deploy continua funcionando em modo demonstração, usando o catálogo local.
5. Para validar localmente a mesma base do Pages antes do push, rode no PowerShell:
   ```powershell
   $env:VITE_PUBLIC_BASE = '/Mundo-de-Kaboo-V2/'
   npm run build
   ```

## 👨‍💻 Guia para Desenvolvedores

### Estrutura do Projeto

```
mundo-de-kaboo/
├── assets/              # Recursos estáticos (imagens, etc.)
│   └── images/          # Imagens do projeto
├── components/          # Componentes React reutilizáveis
│   ├── flipbook/       # Componentes do visualizador de PDF
│   └── ...             # Outros componentes
├── data/                # Seeds e snapshots versionados do catálogo
├── hooks/              # Custom React Hooks
├── lib/                # Utilitários, clientes API e helpers
│   ├── api.ts          # Cliente da API
│   ├── auth.ts         # Lógica de autenticação
│   ├── supabase.ts     # Configuração do Supabase
│   └── ...             # Outros utilitários
├── screens/            # Telas principais da aplicação
│   ├── HomeScreen.tsx
│   ├── BookReaderScreen.tsx
│   ├── AudioPlayerScreen.tsx
│   └── ...             # Outras telas
├── types.ts            # Definições de tipos TypeScript
├── constants.ts        # Constantes e configurações
├── App.tsx             # Componente principal
└── index.tsx           # Ponto de entrada
```

### Tecnologias Utilizadas

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Vite** - Build tool e dev server moderno
- **Supabase** - Backend como serviço (BaaS) para autenticação e banco de dados
- **Tailwind CSS** - Framework CSS utility-first
- **React PDF** - Biblioteca para renderização de PDFs
- **react-pageflip** - Biblioteca para criar efeito de flipbook
- **react-zoom-pan-pinch** - Biblioteca para zoom e pan em imagens
- **lucide-react** - Biblioteca de ícones

### Principais Componentes

#### Screens (Telas)
- `HomeScreen` - Tela inicial com coleções
- `BookReaderScreen` - Visualizador de livros em PDF
- `AudioPlayerScreen` - Player de áudio
- `VideoPlayerScreen` - Player de vídeo
- `SearchScreen` - Tela de busca
- `ProfileScreen` - Perfil do usuário
- `AdminCollectionsScreen` - Administração de coleções

#### Componentes Importantes
- `FlipbookViewer` - Visualizador de PDF com efeito flipbook
- `BottomNav` - Navegação inferior (mobile) e lateral (desktop)
- `CollectionModal` - Modal para visualizar detalhes de coleções
- `FileUpload` - Componente para upload de arquivos

### Hooks Customizados

- `useOrientation` - Detecta orientação do dispositivo (portrait/landscape)
- `useIsMobile` - Detecta se o dispositivo é mobile
- `useScreenSize` - Obtém dimensões da tela
- `useDebounce` - Debounce de valores
- `useToast` - Sistema de notificações toast
- `useRefSize` - Obtém tamanho de elementos via ref

### Configuração do Supabase

A aplicação requer as seguintes configurações no Supabase:

1. **Tabelas necessárias**:
   - `profiles` - Perfil do professor e status de acesso
   - `vouchers` - Códigos de acesso e vigência
   - `collections` - Catálogo de coleções de conteúdo
   - `collection_resources` - Materiais extras de cada coleção

2. **RPCs necessárias**:
   - `validate_voucher` - Valida um código sem consumi-lo
   - `redeem_voucher` - Consome o voucher e atualiza a vigência do usuário

3. **Storage Buckets**:
   - Configurar bucket para armazenar PDFs, áudios e vídeos
   - Configurar políticas de acesso apropriadas

4. **Row Level Security (RLS)**:
   - Configurar políticas RLS para proteger dados dos usuários
   - Garantir que usuários só acessem seus próprios dados

### Padrões de Código

- **TypeScript**: Todo o código é tipado
- **Componentes Funcionais**: Uso de React Hooks
- **CSS**: Tailwind CSS para estilização
- **Nomenclatura**: 
  - Componentes em PascalCase
  - Arquivos de componentes seguem o nome do componente
  - Hooks começam com `use`

### Fluxo de Autenticação

1. Usuário acessa a tela de login
2. No cadastro, um código de acesso é obrigatório
3. Autenticação via Supabase Auth
4. Após login bem-sucedido, o app valida o status de acesso do perfil
5. Usuários com acesso pendente ou expirado são enviados para a tela de renovação
6. Tokens de autenticação são gerenciados automaticamente pelo Supabase

### Runbook do Supabase Hospedado

**Cenário 1: Projeto novo (do zero)**
1. Cadastre-se no Supabase com GitHub: https://supabase.com/dashboard/sign-in
2. Gere um Access Token: https://supabase.com/dashboard/account/tokens
3. Rode `.\scripts\create-project.ps1` e cole o token quando pedido.
4. O script cria o projeto, aplica migrations, roda seeds, provisiona o bucket `collections`, envia os personagens e gera o `.env.local`.
5. Suba o app com `npm run dev` e teste o fluxo completo.
6. Se for testar muitos cadastros por e-mail no plano free, configure SMTP próprio ou confirme usuários manualmente no dashboard para não cair no rate limit padrão do Supabase.

**Cenário 2: Projeto existente**
1. Garanta que você tem o `Project Ref`, o `Access Token`, a senha do banco e a ANON KEY.
2. Rode `.\scripts\setup-db.ps1 -ProjectRef "seu_project_ref"` para vincular o CLI, aplicar migrations, enviar os personagens do storage e atualizar o `.env.local`.
3. Use `-IncludeCatalogSeed` se quiser sincronizar o catálogo.
4. Use `-IncludeVoucherSeed` para carregar códigos de homologação.
5. Suba o app com `npm run dev` e valide cadastro, login, bloqueio por expiração e renovação.

### Adicionando Novas Funcionalidades

1. **Nova Tela**:
   - Criar arquivo em `screens/`
   - Adicionar rota em `App.tsx`
   - Adicionar tipo em `types.ts` (ScreenName)

2. **Novo Componente**:
   - Criar arquivo em `components/`
   - Exportar componente
   - Importar onde necessário

3. **Novo Hook**:
   - Criar arquivo em `hooks/`
   - Seguir padrão de nomenclatura `use*`

### Debugging

- Use `console.log` para debug (será removido em produção)
- React DevTools para inspecionar componentes
- Network tab do navegador para verificar chamadas à API

### Performance

- Componentes pesados são lazy-loaded (ex: BookReaderScreen)
- PDFs são carregados sob demanda
- Imagens são otimizadas quando possível

## 📝 Notas Importantes

- ✅ A aplicação está configurada para produção
- ✅ Build output directory é `dist/`
- ✅ Todas as rotas são tratadas pelo React Router (SPA)
- ⚠️ Certifique-se de que as políticas RLS do Supabase estão configuradas corretamente
- ⚠️ Verifique se o bucket de Storage do Supabase está configurado e público
- ⚠️ Teste os fluxos de autenticação antes de fazer deploy

## 🤝 Contribuindo

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 📧 Suporte

Para suporte, entre em contato através de: suporte@mundodekaboo.com

---

<div align="center">
  <p>Mundo de Kaboo © 2025</p>
  <p>Versão 2.1</p>
</div>

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
- Conta no **Supabase** para backend e autenticação

### Instalação

1. **Clone o repositório** (se aplicável) ou navegue até o diretório do projeto:
   ```bash
   cd mundo-de-kaboo
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**:
   
   Crie um arquivo `.env.local` na raiz do projeto:
   ```bash
   cp .env.example .env.local
   ```
   
   Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```
   
   Você pode obter essas credenciais em: https://supabase.com/dashboard/project/_/settings/api

4. **Execute o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   
   A aplicação estará disponível em `http://localhost:5173` (ou outra porta indicada no terminal)

5. **Build para produção**:
   ```bash
   npm run build
   ```
   
   Os arquivos de produção serão gerados na pasta `dist/`

## 👨‍💻 Guia para Desenvolvedores

### Estrutura do Projeto

```
mundo-de-kaboo/
├── assets/              # Recursos estáticos (imagens, etc.)
│   └── images/          # Imagens do projeto
├── components/          # Componentes React reutilizáveis
│   ├── flipbook/       # Componentes do visualizador de PDF
│   └── ...             # Outros componentes
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
   - `collections` - Armazena as coleções de conteúdo
   - `users` - Informações dos usuários (gerenciado pelo Supabase Auth)

2. **Storage Buckets**:
   - Configurar bucket para armazenar PDFs, áudios e vídeos
   - Configurar políticas de acesso apropriadas

3. **Row Level Security (RLS)**:
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
2. Autenticação via Supabase Auth
3. Após login bem-sucedido, redireciona para HomeScreen
4. Tokens de autenticação são gerenciados automaticamente pelo Supabase

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

# Backlog Central Coruja — Extração da Reunião 15/04/2026

> Gerado por: PO Agent (Pax) em 18/04/2026
> Fonte: Transcrição reunião 15/04/2026 (Gotardo, Cortez, Teodoro, Alves, Fujii, Rossato)
> Projeto: Central Coruja (white label Cabu) — React + TS + Vite + Supabase

---

## Legenda

| Sigla | Significado |
|-------|-------------|
| MVP | Mínimo viável para lançamento |
| PÓS-MVP | Necessário logo após lançamento |
| FUTURO | Roadmap posterior, não bloqueia lançamento |
| FE | Frontend |
| BE | Backend |
| INFRA | Infraestrutura / DevOps |
| DESIGN | UI/UX Design |
| DADOS | Modelagem de dados / seed / migração |

---

## 1. INFRAESTRUTURA E WHITE LABEL

### US-001 — Separação de infra Central Coruja
**Como** operador da Empatia, **quero** que a Central Coruja tenha servidor, banco de dados e autenticação Supabase completamente separados da Educa Cross, **para** garantir isolamento de dados, compliance e independência operacional.

**Critérios de aceite:**
- Projeto Supabase dedicado (não compartilhado com Educa Cross)
- Domínio/subdomínio próprio (ex: centralcoruja.com.br)
- Variáveis de ambiente apontando para projeto Supabase separado
- Nenhuma referência direta a endpoints da Educa Cross no runtime

**Classificação:** MVP | **Tipo:** INFRA | **Dependências:** Nenhuma

---

### US-002 — Conta de desenvolvedor Empatia nas lojas
**Como** operador da Empatia, **quero** registrar uma conta de desenvolvedor da Empatia nas lojas Google Play e Apple App Store, **para** publicar a Central Coruja separada da conta Educa Cross.

**Critérios de aceite:**
- Conta Google Play Console da Empatia criada e verificada
- Conta Apple Developer da Empatia criada e verificada
- Decisão documentada: se white labels precisarem ficar na mesma conta (guideline lojas), usar a conta Empatia como pior cenário
- App listing reservado com nome "Central Coruja"

**Classificação:** MVP | **Tipo:** INFRA | **Dependências:** Nenhuma
**Responsáveis mencionados:** Maxwell Cortez, Douglas Rossato, Rafael Fujii

---

### US-003 — White label engine
**Como** desenvolvedor, **quero** que o app suporte theming e branding via configuração (logo, cores, nome, domínio), **para** que o mesmo codebase sirva Cabu e Central Coruja sem fork.

**Critérios de aceite:**
- Configuração de branding (logo, nome do app, favicon, cores primárias) via variáveis de ambiente ou arquivo de config
- Build de produção renderiza marca Central Coruja por padrão
- Nenhum hardcode de "Cabu" visível para o usuário final na build Central Coruja

**Classificação:** MVP | **Tipo:** FE + INFRA | **Dependências:** Nenhuma

---

### US-004 — Publicar app mobile nas lojas
**Como** usuário da Central Coruja, **quero** instalar o app pela Google Play ou Apple App Store, **para** acessar o conteúdo nativamente no celular.

**Critérios de aceite:**
- PWA ou wrapper nativo (Capacitor/TWA) publicado na Google Play
- PWA ou wrapper nativo publicado na Apple App Store
- App aprovado pelas guidelines de cada loja
- Redirecionamento correto de deep links (voucher, coleção)
- Se lojas exigirem mesma conta para white labels similares, usar conta Empatia

**Classificação:** MVP | **Tipo:** INFRA + FE | **Dependências:** US-002

---

## 2. CADASTRO E AUTENTICAÇÃO

### US-005 — Cadastro com e-mail e senha
**Como** adulto (familiar ou educador), **quero** me cadastrar com e-mail e senha, **para** criar minha conta na Central Coruja.

**Critérios de aceite:**
- Formulário de cadastro com campos: nome completo, e-mail, senha
- Validação de e-mail (formato e confirmação)
- Senha com requisitos mínimos de segurança
- Confirmação de e-mail antes de acesso completo
- Feedback claro de erros (e-mail duplicado, senha fraca)

**Classificação:** MVP | **Tipo:** FE + BE | **Dependências:** US-001

---

### US-006 — Campo CPF no cadastro (ECA digital)
**Como** operador da Central Coruja, **quero** opcionalmente exigir CPF no cadastro, **para** garantir que o cadastrante é maior de idade conforme exigência do ECA digital.

**Critérios de aceite:**
- Campo CPF com validação de dígitos verificadores
- CPF pode ser obrigatório ou opcional conforme flag de configuração
- CPF não é exibido publicamente em nenhuma tela
- Dados armazenados com proteção adequada (LGPD)

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-005

---

### US-007 — Distinção de persona: familiar vs educador
**Como** usuário, **quero** indicar se sou familiar ou educador no cadastro, **para** que a Central personalize minha experiência e exiba materiais adequados ao meu perfil.

**Critérios de aceite:**
- Seletor no cadastro ou onboarding: "Familiar" ou "Educador (professor, coordenador)"
- Perfil armazena persona escolhida
- Futuramente pode influenciar exibição de materiais (guia do professor aparece para educador)
- Não bloqueia acesso a nenhum conteúdo (apenas personalização)

**Classificação:** PÓS-MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-005

---

### US-008 — Login com Educa Cross (SSO futuro)
**Como** professor que já usa a Educa Cross, **quero** acessar a Central Coruja com meu login da Educa Cross, **para** não precisar criar outra conta.

**Critérios de aceite:**
- Botão "Logar com Educa Cross" na tela de login
- OAuth ou redirect para autenticação na Educa Cross
- Criação automática de perfil na Central Coruja no primeiro acesso via SSO
- Mapeamento de perfil sem vazamento de dados entre plataformas

**Classificação:** FUTURO | **Tipo:** FE + BE + INFRA | **Dependências:** US-001, US-005, API Educa Cross

---

## 3. VOUCHER E MONETIZAÇÃO

### US-009 — Resgate de voucher temporal (1, 3, 6, 9, 12 meses)
**Como** comprador de um kit físico, **quero** resgatar o voucher que veio no kit para desbloquear o acesso digital por um período definido, **para** acessar o conteúdo complementar.

**Critérios de aceite:**
- Aceitar vouchers de 1, 3, 6, 9 ou 12 meses
- Validar código no momento do cadastro ou após login
- Exibir claramente o prazo de vigência após resgate
- Bloquear acesso após expiração com tela dedicada

**Classificação:** MVP | **Tipo:** FE + BE | **Dependências:** US-005
**[NOTA: já implementado no mock; precisa validar com Supabase real]**

---

### US-010 — Renovação/assinatura digital após voucher expirar
**Como** usuário com voucher expirado, **quero** renovar meu acesso assinando apenas o conteúdo digital, **para** continuar acessando sem comprar outro kit físico.

**Critérios de aceite:**
- Tela de expiração com CTA claro para renovação
- Integração com gateway de pagamento ou link de compra na loja
- Novo voucher ou assinatura estende access_expires_at
- Conteúdo anteriormente acessado permanece visível após renovação

**Classificação:** PÓS-MVP | **Tipo:** FE + BE + INFRA | **Dependências:** US-009

---

## 4. VITRINE / COLEÇÃO

### US-011 — Exibir capa de kit multimodal OU capa de livro
**Como** usuário, **quero** ver na vitrine a capa do kit multimodal completo ou a capa do livro avulso, dependendo do tipo de coleção, **para** identificar visualmente o que estou acessando.

**Critérios de aceite:**
- Campo no backend: `cover_type` (kit | book)
- Se tipo = kit: exibir imagem da capa do kit multimodal
- Se tipo = book: exibir capa do livro (comportamento atual)
- Admin CMS permite escolher qual imagem representar a coleção
- Fallback: se cover do kit não existir, usar cover do livro

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** Nenhuma
**[NOTA 19/04: fechado em modo mock/local com `collection_type`, `kit_cover_image`, badge visual na vitrine e fallback seguro para a capa do livro.]**

---

### US-012 — Tipo de coleção: kit multimodal vs livro avulso
**Como** administrador, **quero** classificar cada coleção como "kit multimodal completo" ou "livro avulso", **para** que a vitrine e os recursos reflitam o tipo correto.

**Critérios de aceite:**
- Campo `collection_type`: 'kit' | 'book' no schema
- Filtro por tipo na tela admin de coleções
- Exibição condicional de recursos (kit tem mais tipos de mídia)
- Seed/migration alinhados com os dados existentes

**Classificação:** MVP | **Tipo:** BE + DADOS + FE | **Dependências:** Nenhuma
**[NOTA 19/04: fechado localmente no tipo `Collection`, no seed mock e no CMS admin; filtro específico no admin continua opcional.]**

---

## 5. RECURSOS DE CONTEÚDO (Taxonomia Multimídia)

### US-013 — Recurso LER: flipbook do livro digital
**Como** usuário, **quero** ler o livro digital em formato flipbook, **para** ter a experiência de leitura página a página.

**Critérios de aceite:**
- Visualizador flipbook/PDF funcional
- Navegação por página (swipe, setas, índice)
- Suporte a mobile e desktop
- Possibilidade futura de marcação de página (bookmark)

**Classificação:** MVP | **Tipo:** FE | **Dependências:** Nenhuma
**[NOTA: já implementado; validar completude]**

---

### US-014 — Recurso OUVIR: contação de história em áudio
**Como** usuário, **quero** ouvir a contação de história do livro, **para** ter uma experiência auditiva complementar (diferente de audiodescrição página a página).

**Critérios de aceite:**
- Player de áudio integrado com controles (play, pause, progresso, volume)
- Áudio é a contação completa da história (não audiodescrição por página)
- Label na UI: "Contação da História" (não genérico "Ouvir")
- Funciona em background no mobile

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** Nenhuma

---

### US-015 — Recurso ASSISTIR: vídeo com cenário/animação
**Como** usuário, **quero** assistir um vídeo com cenário e animação baseado na história, **para** ter uma experiência visual e imersiva.

**Critérios de aceite:**
- Player de vídeo com controles padrão (play, pause, fullscreen, volume)
- Suporte a streaming (não requer download completo)
- Label na UI: nome descritivo do vídeo (não genérico "Assistir")
- Responsivo em mobile e desktop

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** Nenhuma

---

### US-016 — Recurso ASSISTIR ACESSÍVEL: vídeo com Libras
**Como** usuário com deficiência auditiva, **quero** assistir o vídeo com interpretação em Libras e legendas, **para** ter acesso completo ao conteúdo visual.

**Critérios de aceite:**
- Variante de vídeo com janela de Libras
- Legendas em português (closed captions)
- Seletor claro na UI para alternar entre versão padrão e acessível
- Label na UI: "Assistir Acessível" ou "Com Libras"

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** US-015
**[NOTA 19/04: superfície demonstrável em modo mock/local via `collection_assets` tipado; persistência/backend real continua pendente.]**

---

### US-017 — Recurso ASSISTIR ANIMADO (IA): desenho animado gerado
**Como** usuário, **quero** assistir uma versão animada da história gerada por IA (estilo "desenho animado"), **para** ter uma experiência visual diferenciada.

**Critérios de aceite:**
- Player de vídeo para conteúdo gerado por IA
- Label na UI: "Desenho Animado" (descritivo, não técnico)
- Identificação clara de que é conteúdo gerado por IA (se exigido por regulação)
- Pode ser adicionado progressivamente a coleções existentes

**Classificação:** PÓS-MVP | **Tipo:** FE + DADOS + INFRA (geração IA) | **Dependências:** US-015
**[NOTA 19/04: superfície demonstrável em modo mock/local via `collection_assets` tipado; geração IA real continua fora do escopo local.]**

---

### US-018 — Labels descritivos nos recursos
**Como** usuário, **quero** ver labels descritivos nos recursos de conteúdo (ex: "Contação da História", "Desenho Animado"), **para** entender claramente o que cada recurso oferece.

**Critérios de aceite:**
- Substituir labels genéricos ("Ouvir", "Assistir") por descritivos
- Backend suporta campo `resource_label` customizável por recurso
- Fallback para label baseado no type caso não exista customizado
- Consistência de nomenclatura em todo o app

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** Nenhuma

---

### US-019 — Marcação de página no flipbook (bookmark)
**Como** leitor, **quero** marcar a página onde parei, **para** retomar a leitura de onde parei.

**Critérios de aceite:**
- Botão de bookmark na interface do flipbook
- Persistência da última página lida por coleção/usuário
- Ao reabrir, perguntar se deseja continuar de onde parou
- Sincronização entre dispositivos via backend

**Classificação:** PÓS-MVP | **Tipo:** FE + BE | **Dependências:** US-013

---

## 6. MATERIAIS DE APOIO

### US-020 — Materiais de apoio por componente
**Como** educador, **quero** acessar materiais de apoio específicos de cada componente (livro ou kit), como guia do professor, **para** usar o material pedagógico de forma direcionada.

**Critérios de aceite:**
- Seção "Materiais" dentro da tela de detalhes da coleção
- Lista de arquivos (PDF, DOC, etc.) associados ao componente específico
- Download ou visualização inline
- Guia do professor identificado claramente

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** Nenhuma

---

### US-021 — Materiais extras genéricos
**Como** educador, **quero** acessar materiais genéricos que se aplicam a toda a Central ou a uma coleção inteira, **para** ter recursos transversais de apoio.

**Critérios de aceite:**
- Seção separada ou sub-seção de materiais genéricos
- Escopo: material pode ser global (Central inteira) ou por coleção
- Estilo "ajudas e materiais" simplificado
- Diferenciação visual clara entre material específico do componente e genérico

**Classificação:** PÓS-MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-020
**[NOTA 19/04: MVP local antecipado com materiais estruturados em modo mock; a home atual não mantém esse bloco como seção pública fixa.]**

---

## 7. MAPEAMENTO PEDAGÓGICO E BNCC

### US-022 — Tooltip com descrição da habilidade BNCC
**Como** educador, **quero** ver a descrição completa da habilidade BNCC ao passar o mouse sobre o código, **para** entender rapidamente o que cada código significa.

**Critérios de aceite:**
- Hover/tap sobre código BNCC (ex: EF01LP01) exibe tooltip com texto descritivo completo
- Dados BNCC armazenados no backend (tabela de referência)
- Tooltip legível em mobile (tap para abrir, tap fora para fechar)
- Performance: tooltip não requer chamada de API por interação (preload ou cache)

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-023

---

### US-023 — Tabela de referência BNCC no backend
**Como** desenvolvedor, **quero** ter a tabela de referência da BNCC populada no banco, **para** que o frontend consiga exibir descrições das habilidades.

**Critérios de aceite:**
- Tabela `bncc_skills` com campos: code, description, area, year_grades
- Seed com dados oficiais da BNCC
- Endpoint ou RPC para consulta (ou preload via coleção)
- Mapeamento coleção ↔ habilidade BNCC funcional

**Classificação:** MVP | **Tipo:** BE + DADOS | **Dependências:** Nenhuma
**Responsáveis mencionados:** Fabio Alves, Mario Teodoro

---

### US-024 — Tooltips para outros mapeamentos pedagógicos
**Como** educador, **quero** ver descrições de outros mapeamentos pedagógicos (CASEL, etc.) ao interagir com os códigos, **para** entender o alinhamento curricular completo.

**Critérios de aceite:**
- Mesmo padrão de tooltip para CASEL e outros mapeamentos existentes
- Dados de referência no backend para cada taxonomia
- Consistência visual com tooltip BNCC

**Classificação:** PÓS-MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-022
**[NOTA 19/04: tooltip CASEL rico fechado localmente com lookup estático e metadados próprios, mantendo backend taxonômico como evolução futura.]**

---

### US-025 — Filtro por ano escolar
**Como** educador, **quero** filtrar coleções por ano escolar, **para** encontrar rapidamente conteúdo adequado à faixa etária dos meus alunos.

**Critérios de aceite:**
- Filtro por ano escolar disponível na home / busca
- Anos escolares derivados da BNCC ou cadastrados por coleção
- Seleção múltipla (ex: 1º e 2º ano simultaneamente)
- Resultados atualizados em tempo real

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-023

---

## 8. BUSCA E FILTRO

### US-026 — Busca unificada com filtros na home
**Como** usuário, **quero** buscar e filtrar coleções em uma única interface na home, **para** encontrar conteúdo sem trocar de tela.

**Critérios de aceite:**
- Campo de busca textual integrado à home (acima da grade)
- Filtros rápidos (chips) visíveis: Nível, Personagem, Idade/Série, BNCC, CASEL
- OR dentro da mesma faceta, AND entre facetas e texto
- Resultados atualizados em tempo real
- Estado persistido ao navegar para coleção e voltar

**Classificação:** MVP | **Tipo:** FE | **Dependências:** Nenhuma
**[NOTA 19/04: implementação local concluída na HomeScreen, com busca unificada, persistência de estado, filtros rápidos e refinamento BNCC dentro do drawer de filtros.]**
**[NOTA 19/04: no filtro BNCC, o MVP final ficou em entrada-resumo no drawer, picker dedicado com busca + multisseleção + aplicar e seleção direta no primeiro card; afuniladores por etapa/componente/faixa seguem como evolução.]**

---

### US-027 — Filtro por personagem com fotos
**Como** usuário, **quero** filtrar coleções por personagem e ver a foto do personagem no filtro, **para** encontrar histórias do meu personagem favorito.

**Critérios de aceite:**
- Chips ou dropdown com foto/avatar do personagem
- Fotos carregadas do storage (CHAR_IMG_BASE_URL existente)
- Seleção múltipla de personagens (OR)
- Consistência com paleta de cores por personagem (CHARACTER_COLORS existente)

**Classificação:** MVP | **Tipo:** FE | **Dependências:** US-026

---

### US-028 — Busca aberta dentro da coleção
**Como** usuário, **quero** buscar recursos dentro de uma coleção específica, **para** encontrar rapidamente um material ou recurso dentro do kit.

**Critérios de aceite:**
- Campo de busca dentro da tela de detalhes da coleção
- Busca filtra recursos (PDF, áudio, vídeo, materiais) por título
- Resultados destacados visualmente
- Funcional em coleções com muitos recursos

**Classificação:** PÓS-MVP | **Tipo:** FE | **Dependências:** Nenhuma

---

## 9. GAMIFICAÇÃO

### US-029 — Gamificação leve para adulto (progresso e metas)
**Como** adulto, **quero** ver meu progresso de leitura e alcançar metas simples, **para** me sentir motivado a continuar consumindo o conteúdo.

**Critérios de aceite:**
- Barra de progresso por coleção (% lido/consumido)
- Metas simples (ex: "Leia 3 livros este mês")
- Recompensa visual (badge, animação discreta)
- Tom adulto, sem infantilização
- Não é jogo: sem ranking, sem competição, sem economia virtual complexa

**Classificação:** PÓS-MVP | **Tipo:** FE + BE + DESIGN | **Dependências:** Nenhuma

---

## 10. PERFIL INFANTIL

### US-030 — Adulto cadastra criança como dependente
**Como** adulto, **quero** cadastrar uma criança vinculada à minha conta, **para** que ela acesse o conteúdo consumível em uma interface própria.

**Critérios de aceite:**
- Tela de gerenciamento de perfis infantis dentro da conta adulta
- Dados da criança: nome, idade/data de nascimento, avatar
- Sem e-mail próprio da criança
- Máximo de perfis configurável
- Compliance com LGPD para dados de menores

**Classificação:** FUTURO | **Tipo:** FE + BE + DADOS | **Dependências:** US-005

---

### US-031 — Acesso infantil via código/carteirinha
**Como** criança, **quero** acessar meu perfil com um código simples ou carteirinha, **para** entrar sem precisar digitar e-mail e senha.

**Critérios de aceite:**
- Login simplificado: código numérico, PIN ou seleção de avatar
- Sem exposição de e-mail ou senha
- Sessão vinculada à conta do adulto responsável
- Timeout de sessão configurável

**Classificação:** FUTURO | **Tipo:** FE + BE | **Dependências:** US-030

---

### US-032 — Interface infantil focada no universo do personagem
**Como** criança, **quero** ver uma interface colorida e focada nos personagens, **para** navegar no conteúdo de forma divertida e intuitiva.

**Critérios de aceite:**
- Layout diferenciado do adulto (mais visual, menos texto)
- Navegação simplificada (ícones grandes, personagens como guias)
- Exibe apenas conteúdo consumível (sem materiais pedagógicos/complementares)
- Benchmark: referência no app Edu (mencionado na reunião)

**Classificação:** FUTURO | **Tipo:** FE + DESIGN | **Dependências:** US-030, US-031

---

### US-033 — Restrição de conteúdo no perfil infantil
**Como** adulto responsável, **quero** que o perfil infantil mostre apenas conteúdo consumível (leitura, áudio, vídeo), **para** que a criança não veja materiais complementares do educador.

**Critérios de aceite:**
- Perfil infantil oculta: guia do professor, materiais de apoio, área de formação
- Exibe: flipbook, áudio (contação), vídeos
- Gamificação pode ser mais forte no perfil infantil (segundo passo)
- Controle de visibilidade baseado no tipo de perfil

**Classificação:** FUTURO | **Tipo:** FE + BE | **Dependências:** US-030, US-032

---

## 11. ACADEMIA / FORMAÇÃO

### US-034 — Área de formação com minicursos
**Como** educador, **quero** acessar minicursos e vídeos de formação, **para** aprender a usar os kits e aprofundar temas pedagógicos.

**Critérios de aceite:**
- Seção "Academia" ou "Formação" no menu principal
- Vídeos organizados por tema: uso geral do kit, uso de kit específico, temas genéricos (socioemocional)
- Player de vídeo com progresso
- Conteúdo pode ser global ou vinculado a coleção

**Classificação:** FUTURO | **Tipo:** FE + BE + DADOS + DESIGN | **Dependências:** Nenhuma

---

### US-035 — Trilha de formação
**Como** educador, **quero** seguir uma trilha de formação estruturada, **para** me capacitar progressivamente no uso dos materiais.

**Critérios de aceite:**
- Trilha com etapas sequenciais
- Progresso salvo e exibido
- Certificado ou badge ao completar trilha (opcional)
- Conteúdo modular (pode adicionar novos módulos)

**Classificação:** FUTURO | **Tipo:** FE + BE + DADOS + DESIGN | **Dependências:** US-034

---

## 12. ANTI-STORIES (Restrições de Escopo Negativo)

### AS-001 — NÃO incluir jogos ou gamificação escolar massiva
**A Central Coruja NÃO deve** incluir jogos educativos, game engines, ou conteúdo escolar massivo interativo. Isso é domínio exclusivo da Educa Cross.

**Critérios de verificação:**
- Nenhuma tela de "jogar" ou "atividade interativa" estilo quiz/game
- Nenhum módulo de atividade do aluno
- Gamificação permitida é apenas leve (progresso, metas, badges discretos)

---

### AS-002 — NÃO criar cadastro de turma, aluno ou escola
**A Central Coruja NÃO deve** ter funcionalidades de turma, matrícula de aluno, ou cadastro de escola. O público é individual (familiar ou educador), não institucional.

**Critérios de verificação:**
- Nenhum campo "escola" no cadastro ou perfil ativo
- Nenhuma funcionalidade de criação de turma
- Nenhum fluxo de atribuição de atividade para aluno
- `school_name` deve aparecer apenas como limpeza de legado

---

### AS-003 — NÃO misturar dados com Educa Cross
**A Central Coruja NÃO deve** compartilhar banco de dados, autenticação ou servidor com a Educa Cross, exceto no cenário futuro de SSO (US-008).

**Critérios de verificação:**
- Projeto Supabase separado
- Nenhum join ou referência cruzada de tabelas entre os dois sistemas
- Credenciais e tokens separados
- Conta de loja separada (ou na mesma conta Empatia se exigido pelas lojas)

---

### AS-004 — NÃO complicar o backoffice com gestão BNCC
**O backoffice NÃO deve** exigir gestão manual complexa de dados BNCC. Os dados BNCC devem ser importados como tabela de referência e o mapeamento deve ser simples (associação coleção ↔ código BNCC).

**Critérios de verificação:**
- Sem editor WYSIWYG para textos BNCC
- Sem fluxo de aprovação para mapeamentos
- Seed ou importação em lote como mecanismo principal
- Admin apenas associa códigos existentes a coleções

---

### AS-005 — NÃO expor audiodescrição página a página como "Ouvir"
**O recurso "Ouvir" NÃO é** audiodescrição página por página (que existe na Educa Cross). É exclusivamente contação de história em áudio completo.

**Critérios de verificação:**
- Áudio da coleção é faixa única ou segmentada por capítulo, não por página
- Label não usa "audiodescrição"
- Diferenciação clara na documentação e na UI

---

### AS-006 — NÃO usar labels genéricos nos recursos
**A UI NÃO deve** exibir labels genéricos como "Ouvir", "Assistir" ou "Ler" sem contexto. Labels devem ser descritivos.

**Critérios de verificação:**
- "Contação da História" em vez de "Ouvir"
- "Desenho Animado" em vez de "Assistir Animado"
- "Com Libras" ou "Acessível" claramente indicado
- Cada recurso tem label customizável no backend

---

## 13. REQUISITOS DE ARQUITETURA IMPLÍCITOS

### AR-001 — Schema de recursos multimídia extensível
O schema de `CollectionResource` atual suporta `type: 'pdf' | 'audio' | 'video' | 'zip'`. Precisa evoluir para suportar a nova taxonomia:

| Recurso reunião | type proposto | subtipo/flag |
|----------------|---------------|-------------|
| LER (flipbook) | `book` | — |
| OUVIR (contação) | `audio` | `subtype: 'storytelling'` |
| ASSISTIR (vídeo cenário) | `video` | `subtype: 'standard'` |
| ASSISTIR ACESSÍVEL | `video` | `subtype: 'accessible'`, `accessibility: ['libras', 'captions']` |
| ASSISTIR ANIMADO (IA) | `video` | `subtype: 'ai_animated'` |
| MATERIAIS | `document` | `scope: 'component' | 'generic'` |

**Classificação:** MVP | **Tipo:** BE + DADOS

---

### AR-002 — Modelo de dados para coleção/kit
Coleção precisa de novos campos:
- `collection_type: 'kit' | 'book'`
- `cover_kit_image: string | null` (capa do kit, alternativa à capa do livro)
- `year_grades: string[]` (anos escolares, derivado ou explícito)
- Relacionamento N:N com `bncc_skills` (tabela intermediária)

**Classificação:** MVP | **Tipo:** DADOS

---

### AR-003 — Suporte a materiais com dois escopos
Materiais de apoio precisam de escopo:
- `scope: 'component'` — vinculado a uma coleção/componente específico
- `scope: 'global'` — disponível para toda a Central ou coleção inteira

**Classificação:** MVP | **Tipo:** DADOS

---

### AR-004 — MediaType expandido
O type `MediaType = 'book' | 'audio' | 'video' | 'extra'` atual em [types.ts](types.ts) precisa ser expandido ou ter subtipos para acomodar a nova taxonomia de recursos sem perder retrocompatibilidade.

**Classificação:** MVP | **Tipo:** FE + DADOS

---

## 14. DELTA COMPLEMENTAR — 18/04/2026

### 14.1 Novas Stories

### DELTA-US-001 — Segmentação editorial multissegmento ✅ 100%
**Status**: Implementado em 18/04/2026 (ISS-03, ISS-04, ISS-06, ISS-07, ISS-10)
**Como** administrador do catálogo, **quero** cadastrar uma coleção em um ou mais segmentos e manter uma sinopse editorial, **para** que a vitrine e o detalhe reflitam corretamente o público e o posicionamento da obra.

**Critérios de aceite:**
- A experiência nova passa a usar `Segmento` no lugar de `Nível`
- `Fundamental I` é renomeado para `E.F. Anos Iniciais`
- A coleção aceita multissegmentos com um segmento principal para fallback
- O catálogo pode ordenar coleções por ano escolar
- A sinopse pode ser cadastrada no CMS e exibida no detalhe público

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-025, US-026

---

### DELTA-US-002 — Modelo rico de ativos multimídia ✅ 100%
**Status**: Implementado em 18/04/2026 (ISS-14, ISS-15). Modelo `collection_assets` tipado, slots fixos no CMS, sincronização com campos legados e biblioteca estruturada no detalhe.

**Como** administrador do catálogo, **quero** cadastrar ativos tipados por coleção, **para** que a Central publique apenas os recursos realmente disponíveis e com semântica clara.

**Critérios de aceite:**
- Suportar, no mínimo: contação da história, animação, como jogar, videoaula e PDF de orientações para o professor
- Cada ativo deve armazenar título, arquivo ou URL, descrição, tipo de mídia e categoria
- A UI não exibe CTA nem bloco para recursos sem arquivo cadastrado
- O mesmo modelo atende detalhe da coleção e biblioteca de materiais extras
- O recurso legado de vídeo único continua funcionando durante a transição

**Classificação:** MVP | **Tipo:** FE + BE + DADOS | **Dependências:** US-014, US-015, US-020, US-021, AR-001

---

### DELTA-US-003 — Página de personagens ✅ 100%
**Status**: Implementado em 18/04/2026 (ISS-12). CharactersScreen com 8 personagens, rota e navegação.
**Como** usuário, **quero** navegar por uma página de personagens com descrição e mídia, **para** explorar o universo narrativo e descobrir conteúdos relacionados.

**Critérios de aceite:**
- Cadastro estruturado com nome, descrição, características, imagens e vídeos
- Tela pública própria para descoberta por personagem
- Vínculo opcional entre personagem e coleção
- Reuso do cadastro no filtro por personagem já existente na home

**Classificação:** PÓS-MVP | **Tipo:** FE + BE + DADOS + DESIGN | **Dependências:** US-027

---

### 14.2 Stories existentes que devem ser alteradas

- **Iniciativa de CMS de vouchers**: acrescentar usuário ou e-mail do resgate, data de ativação, exportação XLSX para gráfica e teto operacional de 12 meses.
- **US-009**: reforçar que a duração disponível é fechada em `1, 3, 6, 9, 12` meses.
- **US-013**: ampliar o leitor para incluir modo texto acessível, mantendo zoom e navegação atual.
- **US-014, US-015, US-016, US-017 e US-018**: alinhar com o novo modelo de ativos tipados, sem depender de um único `video_url` genérico.
- **US-020**: explicitar o PDF de orientações para o professor como ativo dedicado.
- **US-021**: evoluir de lista simples para biblioteca estruturada de materiais extras.
- **US-023 e US-024**: passar a usar a planilha BNCC como fonte estruturada e abrir caminho para taxonomias complementares.
- **US-025 e US-026**: trocar `nível` por `segmento` e absorver ordenação por ano escolar.
- **US-027**: passar a depender do cadastro estruturado de personagens, não só de constantes estáticas.

### 14.3 Itens que não viram story nova

- Campo para inserir voucher: já implementado no login e no cadastro, não deve abrir nova story.
- Geração e gestão de vouchers: já existe como iniciativa, o delta é refinamento operacional.
- Exportação XLSX: tratar como evolução do fluxo atual de exportação, não como módulo novo.
- Regra de expiração em 12 meses: tratar como ajuste de domínio e validação, não capability nova.
- Regra de ocultar recurso sem arquivo: critério transversal das stories de mídia e materiais, não feature separada.

## 14. ACTION ITEMS DA REUNIÃO (Rastreamento)

| # | Responsável(is) | Item | Status |
|---|----------------|------|--------|
| 1 | Maxwell, Douglas, Rafael | Registrar conta Empatia nas lojas Google e Apple | ⬜ Pendente |
| 2 | Fabio Alves | Benchmark no app Edu (cadastro adulto-criança) | ⬜ Pendente |
| 3 | Mario Teodoro | Encaminhar e-mail de ajustes site/app para Fabio | ⬜ Pendente |
| 4 | Fabio, Mario | Discutir implementação BNCC e lógica de ano escolar | 🟡 Parcial, escopo local validado; evolução de afuniladores e backend ainda pendente |

---

## 15. RESUMO DE PRIORIZAÇÃO

### MVP (lançamento)
| ID | Título |
|----|--------|
| US-001 | Separação de infra |
| US-002 | Conta Empatia nas lojas |
| US-003 | White label engine |
| US-004 | App mobile nas lojas |
| US-005 | Cadastro e-mail/senha |
| US-006 | CPF no cadastro (ECA) |
| US-009 | Resgate de voucher temporal |
| US-011 | Capa kit vs livro |
| US-012 | Tipo de coleção |
| US-013 | Flipbook |
| US-014 | Contação em áudio |
| US-015 | Vídeo cenário |
| US-016 | Vídeo acessível (Libras) |
| US-018 | Labels descritivos |
| US-020 | Materiais por componente |
| US-022 | Tooltip BNCC |
| US-023 | Tabela BNCC no backend |
| US-025 | Filtro por ano escolar |
| US-026 | Busca unificada na home |
| US-027 | Filtro personagem com fotos |
| DELTA-US-001 | Segmentação editorial multissegmento |
| DELTA-US-002 | Modelo rico de ativos multimídia |
| AR-001 | Schema recursos extensível |
| AR-002 | Modelo dados coleção/kit |
| AR-003 | Materiais dois escopos |
| AR-004 | MediaType expandido |

### PÓS-MVP
| ID | Título |
|----|--------|
| US-007 | Persona familiar vs educador |
| US-010 | Renovação/assinatura digital |
| US-017 | Vídeo animado IA |
| US-019 | Bookmark flipbook |
| US-021 | Materiais extras genéricos |
| US-024 | Tooltips outros mapeamentos |
| US-028 | Busca dentro da coleção |
| US-029 | Gamificação leve adulto |
| DELTA-US-003 | Página de personagens |

### FUTURO
| ID | Título |
|----|--------|
| US-008 | Login com Educa Cross (SSO) |
| US-030 | Cadastro de criança |
| US-031 | Acesso infantil código/carteirinha |
| US-032 | Interface infantil |
| US-033 | Restrição conteúdo perfil infantil |
| US-034 | Academia/formação minicursos |
| US-035 | Trilha de formação |

---

## 16. DEPENDÊNCIAS CRÍTICAS (Grafo Simplificado)

```
US-001 (Infra separada)
  └─► US-005 (Cadastro)
       ├─► US-006 (CPF)
       ├─► US-009 (Voucher) ──► US-010 (Renovação)
       └─► US-030 (Perfil infantil) ──► US-031, US-032, US-033

US-002 (Conta lojas) ──► US-004 (App mobile)

US-023 (Tabela BNCC)
  ├─► US-022 (Tooltip BNCC)
  └─► US-025 (Filtro ano escolar)

US-015 (Vídeo) ──► US-016 (Libras) ──► US-017 (IA animado)

US-013 (Flipbook) ──► US-019 (Bookmark)

US-020 (Materiais componente) ──► US-021 (Materiais genéricos)

US-034 (Academia) ──► US-035 (Trilha formação)
```

---

*Documento gerado automaticamente. Revisar com stakeholders antes de comprometer no sprint.*

---

## 17. PROGRESSO DE IMPLEMENTAÇÃO — Delta Issues (18/04/2026)

> **Progresso geral: 100% (15/15 itens do delta resolvidos)**

### Sprint 1 — Ajustes Imediatos (100%)

| ISS | Título | Agente | Status | % |
|-----|--------|--------|--------|---|
| ISS-01 | Teto vouchers 12 meses | aiox-dev | ✅ | 100% |
| ISS-02 | Ocultar recursos sem arquivo | aiox-dev | ✅ | 100% |
| ISS-03 | Rename Nível→Segmento | aiox-dev | ✅ | 100% |
| ISS-04 | Rename Fundamental I→E.F. Anos Iniciais | aiox-dev | ✅ | 100% |
| ISS-05 | Labels descritivos nos recursos | aiox-dev | ✅ | 100% |

### Sprint 2 — Features Médias (100%)

| ISS | Título | Agente | Status | % |
|-----|--------|--------|--------|---|
| ISS-06 | Campo sinopse | aiox-dev | ✅ | 100% |
| ISS-07 | Ordenação por ano escolar | aiox-dev | ✅ | 100% |

### Sprint 2.5 — Estrutura Editorial e Operação (100%)

| ISS | Título | Agente | Status | % |
|-----|--------|--------|--------|---|
| ISS-08 | Exportação XLSX vouchers | aiox-dev | ✅ | 100% |
| ISS-09 | Dados de resgate no CMS | aiox-dev | ✅ | 100% |
| ISS-10 | Multissegmentos no modelo | aiox-dev | ✅ | 100% |
| ISS-11 | BNCC estruturado pela planilha | aiox-data-engineer + aiox-dev | ✅ | 100% |
| ISS-12 | Página de personagens | aiox-dev | ✅ | 100% |
| ISS-13 | Leitor modo texto | aiox-dev | ✅ | 100% |
| ISS-14 | Modelo de ativos tipados | aiox-dev | ✅ | 100% |
| ISS-15 | Biblioteca estruturada de materiais extras | aiox-dev | ✅ | 100% |

### Fechamento do escopo local — 19/04/2026

- **Sprint 1, Sprint 2 e Sprint 2.5**: 100% concluídas no repositório local.
- **Issues restantes no escopo local**: 0.
- **Validação final**: `npx vite build` ok, home mock com cards de distinção `Kit`/`Livro`, detalhe com CTAs tipados, tooltip CASEL rico e picker BNCC com seleção direta confirmados em browser.

### Placar executivo consolidado — 19/04/2026

| Frente | Status | % | O que ainda falta |
|--------|--------|---|-------------------|
| Planejamento, backlog e delta local | ✅ | 100% | Nenhum item documental crítico pendente no repo local |
| Escopo v1.2 demonstrável em mock/local | ✅ | 100% | Encerrado no repositório local |
| Descoberta pedagógica e BNCC | 🟡 | 75% | Afuniladores por etapa/componente/faixa e persistência taxonômica no backend real |
| v1.3 produção real | ⬜ | 20% | Backend Supabase validado, persistência real, conta Empatia, build nativo e lojas |
| v2.0 expansão | ⬜ | 0% | Academia, gamificação, perfil infantil e OAuth Educa Cross |

### Restante fora do repo local

1. **Persistência e produção** — migrations Supabase, persistência real de `collection_type`, `kit_cover_image`, assets tipados e materiais globais.
2. **Descoberta pedagógica remanescente** — afuniladores por etapa, componente e faixa no picker BNCC e consolidação da taxonomia no backend.
3. **Fluxos operacionais/jurídicos** — CPF opcional, assinatura digital pós-voucher e validações de produção.
4. **Distribuição** — conta Empatia nas lojas, build nativo e publicação mobile.
5. **Expansão** — academia, gamificação, perfil infantil e OAuth Educa Cross.

---

## 18. QA PROGRAM E SEPARAÇÃO DE CATÁLOGO POR MARCA (09/05/2026)

> Adicionado após execução do programa de validação de jornadas de gerenciamento de conteúdo e da separação completa de dados por marca.

### US-QA-001 — Controle de acesso por papel no CMS ✅ CONCLUÍDO

**Como** administrador, **quero** que editores e viewers só vejam e executem as ações que seu papel permite, **para** evitar alterações acidentais ou acesso indevido a módulos sensíveis.

**Critérios de aceite:**
- ✅ Editor não vê módulo Usuários
- ✅ Editor não vê botão `+ Novo modelo` em Vouchers
- ✅ Viewer não consegue salvar alterações em White Label
- ✅ Admin tem acesso completo a todos os módulos

**Arquivos modificados:** `AdminScreen.tsx`, `VouchersModule.tsx`, `AdminWhiteLabelScreen.tsx`, `lib/mockData.ts`

**Classificação:** MVP | **Tipo:** FE | **Status:** ✅ Concluído (Sprint QA-1, 09/05/2026)

---

### US-QA-002 — Ciclo de vida de coleções sem bug de cache ✅ CONCLUÍDO

**Como** editor, **quero** que o conteúdo que eu crio, edito ou deleto apareça imediatamente atualizado nas telas públicas, **para** não publicar dados desatualizados.

**Critérios de aceite:**
- ✅ Criar/editar/deletar coleção limpa o cache de sessionStorage automaticamente
- ✅ Home pública reflete as alterações sem precisar de recarga manual

**Bug corrigido:** BUG-005 — `kaboo_collections_cache` não limpava após CRUD mock
**Arquivo:** `lib/api.ts` — `clearCollectionsCache()` chamado em create/update/delete
**Teste de regressão:** `lib/api.regression-1.test.ts`

**Classificação:** MVP | **Tipo:** FE | **Status:** ✅ Concluído (Sprint QA-2, 09/05/2026)

---

### US-QA-003 — Personagens inativos não aparecem no catálogo público ✅ CONCLUÍDO

**Como** usuário, **quero** ver apenas personagens ativos nas coleções, **para** não encontrar conteúdo descontinuado.

**Critérios de aceite:**
- ✅ Personagens com status `inactive` não aparecem na lista pública da coleção
- ✅ Personagens reativados voltam a aparecer

**Bug corrigido:** BUG-006 — personagens inativos vinculados apareciam na view pública
**Arquivo:** `lib/characters.ts` — opção `{ excludeInactive }` em `resolveCharacterNamesFromIds`
**Teste de regressão:** `lib/characters.regression-1.test.ts`

**Classificação:** MVP | **Tipo:** FE | **Status:** ✅ Concluído (Sprint QA-2, 09/05/2026)

---

### US-QA-004 — Ativos de mídia criados no admin aparecem na Biblioteca Hub pública ✅ CONCLUÍDO

**Como** usuário, **quero** que os vídeos, músicas, formações e materiais que o editor adiciona às coleções apareçam nos hubs públicos correspondentes, **para** ter acesso ao conteúdo publicado.

**Critérios de aceite:**
- ✅ Vídeos adicionados a uma coleção aparecem em `#videos`
- ✅ Músicas adicionadas aparecem em `#music`
- ✅ Guias de professor/vídeo-aula aparecem em `#formations`
- ✅ Materiais extras aparecem em `#materials`

**Bug corrigido:** BUG-007 — atalhos de mídia do admin escreviam em `collection_assets` mas a Biblioteca Hub lia o mock estático `LIBRARY_HUB_MOCKS`
**Arquivos:** `lib/api.ts` (bridge `collection_assets` → hubs), `screens/LibraryHubScreen.tsx` (contrato live)
**Testes de regressão:** `lib/api.regression-2.test.ts`, `lib/api.regression-3.test.ts`

**Classificação:** MVP | **Tipo:** FE | **Status:** ✅ Concluído (Sprint QA-2, 09/05/2026)

---

### US-QA-005 — Central Coruja começa com catálogo vazio, isolado do Kaboo ✅ CONCLUÍDO

**Como** operador da Central Coruja, **quero** que a plataforma inicie sem nenhum conteúdo do Kaboo (coleções, personagens, hubs de mídia), **para** poder inserir o catálogo próprio da Central Coruja sem interferência.

**Critérios de aceite:**
- ✅ `http://localhost:4100/central-coruja/#admin` → Coleções: vazio; Personagens: vazio
- ✅ `http://localhost:4100/central-coruja/#formations` → 0 resultados, empty state
- ✅ `http://localhost:4100/#` → Kaboo: 16 coleções seed intactas, 8+ personagens
- ✅ Conteúdo criado na Central Coruja não aparece no Kaboo e vice-versa
- ✅ Troca de marca em runtime reseta cache in-memory (snapshot de personagens)

**Solução:** chaves de armazenamento por marca (`kaboo_mock_collections`, `kaboo_mock_characters`, `kaboo_collections_cache` com sufixo `_${slug}` para outras marcas); seed só carregado quando slug = `kaboo`.

**Arquivos:** `lib/mockData.ts`, `lib/api.ts`, `lib/characters.ts`, `App.tsx`
**Testes de regressão:** `lib/api.regression-3.test.ts`, `lib/characters.regression-2.test.ts`

**Classificação:** MVP | **Tipo:** FE | **Status:** ✅ Concluído (09/05/2026)

---

### US-QA-006 — Validação visual dos hubs de mídia da Central Coruja ⬜ PENDENTE

**Como** QA, **quero** verificar visualmente que os hubs `#videos` e `#formations` da Central Coruja exibem conteúdo correto depois de inserir ativos reais, **para** fechar a caveat do Sprint 3.

**Critérios de aceite:**
- Inserir pelo menos 1 ativo de vídeo e 1 formação via admin da Central Coruja
- Verificar que aparecem nos hubs públicos correspondentes em browser real
- Screenshot de evidência salvo em `.gstack/qa-reports/`

**Dependência:** US-CAT-001 (inserção do catálogo real da Central Coruja)

**Classificação:** MVP | **Tipo:** QA | **Status:** ⬜ Pendente

---

### US-CAT-001 — Inserir catálogo real da Central Coruja ⬜ PENDENTE

**Como** administrador da Central Coruja, **quero** criar as primeiras coleções, personagens e ativos de mídia reais da Central Coruja via interface de admin, **para** poder validar o produto com conteúdo verdadeiro.

**Critérios de aceite:**
- Pelo menos 3 coleções da Central Coruja criadas via admin mock
- Pelo menos 2 personagens da Central Coruja criados
- Pelo menos 1 ativo por tipo (vídeo, música, formação, material) adicionado a uma coleção
- Todos visíveis nas telas públicas da Central Coruja
- Nada aparece no Kaboo

**Classificação:** PÓS-MVP | **Tipo:** DADOS | **Status:** ⬜ Pendente

---

### Placar executivo consolidado — 09/05/2026

| Frente | Status | % | O que ainda falta |
|--------|--------|---|-------------------|
| v1.2 local demonstrável | ✅ | 100% | Encerrado e QA validado |
| QA — controle de acesso por papel | ✅ | 100% | Nenhum item pendente |
| QA — ciclo de vida de conteúdo | ✅ | 100% | 3 bugs corrigidos, 4 testes de regressão |
| Separação de catálogo por marca | ✅ | 100% | Central Coruja limpa; Kaboo preservado |
| QA — regressão pública | 🟡 | 90% | Hubs `#videos` e `#formations` sem validação visual (caveat) |
| Inserção de catálogo real da CC | ⬜ | 0% | US-CAT-001 |
| v1.3 produção real | ⬜ | 20% | Supabase real, conta Empatia, build nativo |
| v2.0 expansão | ⬜ | 0% | Não iniciado |

---

## 19. SPRINT NOVOS RECURSOS — 09/05/2026

> Sprint com 4 itens: 2 quick wins (P), 1 spike técnico (P), 1 feature média (M) e 1 feature grande (G).

### US-BTN-001 — Ajustar botão "Ler o Livro" ✅ CONCLUÍDO

**Como** usuário, **quero** que o botão "Ler livro" tenha formato quadrado (não pill), **para** não confundir com as tags de segmento/nível que usam o mesmo shape arredondado.

**Critérios de aceite:**
- ✅ Botão "Ler livro" usa `rounded-2xl` em vez de `rounded-full`
- ✅ Visual consistente com CTAs de coleção
- ✅ Não parece tag

**Arquivo:** `screens/DetailsScreen.tsx` linha 708 — `rounded-full` → `rounded-2xl`

**Classificação:** MVP | **Tipo:** FE/DESIGN | **Tamanho:** P | **Status:** ✅ Concluído (09/05/2026)

---

### US-DRM-001 — Spike: YouTube DRM e download offline 🔬 SPIKE ENCERRADO

**Como** equipe técnica, **queremos** saber se é possível baixar vídeos do YouTube localmente para uso offline, **para** decidir se incluímos essa funcionalidade no produto.

**Resultado do spike:**

> **Resposta: NÃO É POSSÍVEL.**
>
> Vídeos do YouTube são protegidos por DRM (Digital Rights Management) via Widevine (Chrome/Android), FairPlay (Safari/iOS) e PlayReady (Edge). Os tokens de descifração são emitidos por servidores de licença do Google e nunca saem do dispositivo em texto claro — mesmo com acesso root ao dispositivo, o conteúdo descriptografado não pode ser persistido.
>
> A captura via `yt-dlp` ou ferramentas similares funciona apenas para vídeos sem DRM ativo e viola os Termos de Serviço do YouTube (ToS §4.b), expondo a empresa a risco legal.
>
> **Decisão de produto:** para offline, usar apenas conteúdo hospedado internamente (não YouTube). Vídeos próprios hospedados em CDN sem DRM podem ser baixados via `fetch` + Cache API / Service Worker. Vídeos do YouTube permanecem sempre online-only.
>
> **Alternativa viável (escopo v1.3):** vídeos internos marcados como `offline_available` podem ser cacheados via Service Worker. Implementação separada em US-OFF-001.

**Classificação:** Spike | **Status:** 🔬 Encerrado — decisão tomada (09/05/2026)

---

### US-MUS-001 — Letra da Música ⬜ PENDENTE

**Como** usuário, **quero** ver a letra de uma música enquanto ela toca no player, **para** acompanhar e aprender a canção.

**Critérios de aceite:**
- [ ] Campo `lyrics_url` adicionado em `CollectionAsset` (opcional, só relevante para assets de audio)
- [ ] No admin (slot `storytelling`), campo de upload de arquivo de letra aparece
- [ ] No `AudioPlayerScreen`, botão "Ver Letra" aparece quando `lyrics_url` está preenchido
- [ ] Letra exibida em painel deslizável sobre o player
- [ ] Botão alterna entre "Ver Letra" e "Ocultar Letra"

**Arquivos estimados:** `types.ts`, `screens/AdminCollectionsScreen.tsx`, `screens/AudioPlayerScreen.tsx`

**Classificação:** PÓS-MVP | **Tipo:** FE | **Tamanho:** M | **Status:** ⬜ Pendente

---

### US-OFF-001 — Disponibilidade Offline (Feature Flag + UI) ⬜ PENDENTE

**Como** administrador, **quero** marcar quais coleções podem ser baixadas para uso offline, **para** que usuários possam consumir conteúdo sem internet.

**Critérios de aceite:**
- [ ] Campo `offline_available: boolean` adicionado em `Collection`
- [ ] Toggle "Disponível offline" no form de edição de coleção no admin
- [ ] Botão "Baixar para offline" exibido em `DetailsScreen` quando `offline_available = true`
- [ ] Mock de download em localStorage (armazena flag de que a coleção está "baixada")
- [ ] Botão muda para "Conteúdo offline disponível" após o download mock
- [ ] Sem Service Worker nesta iteração (mock apenas)

**Nota técnica:** baseado no spike US-DRM-001 — apenas conteúdo interno (não YouTube) pode ser marcado como offline_available. Admin deve receber aviso sobre isso.

**Arquivos estimados:** `types.ts`, `screens/AdminCollectionsScreen.tsx`, `screens/DetailsScreen.tsx`, `lib/mockData.ts`

**Classificação:** PÓS-MVP | **Tipo:** FE | **Tamanho:** G | **Status:** ⬜ Pendente

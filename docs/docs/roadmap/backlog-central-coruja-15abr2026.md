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

## 2. AUTENTICAÇÃO E CONTA

### US-005 — Cadastro com e-mail e senha
**Como** usuário adulto, **quero** me cadastrar com e-mail e senha, **para** acessar o conteúdo protegido por voucher.

**Critérios de aceite:**
- Formulário de signUp com validação de e-mail
- Fluxo de confirmação por e-mail (quando ativo no Supabase)
- Tratamento de caso: usuário criado sem sessão quando confirmação por e-mail ativada (UX: tela "Confirme seu e-mail")

**Classificação:** MVP | **Tipo:** FE + BE | **Dependências:** Supabase

### US-006 — CPF opcional para compliance ECA
**Como** produto, **queremos** coletar CPF opcional para validar conformidade com ECA em usos futuros.

**Critérios de aceite:**
- Campo CPF opcional no cadastro
- Validação de formato local (pt-BR)
- Não bloqueia cadastro quando ausente

**Classificação:** PÓS-MVP | **Tipo:** FE + BE | **Dependências:** Consulta legal finalizada

---

## 3. VOUCHERS

### US-009 — Voucher com duração configurável (1–12 meses)
**Como** administrador, **quero** emitir vouchers com duração de 1 a 12 meses, **para** vender códigos com validade controlada.

**Critérios de aceite:**
- Campo `duration_months` no admin (1..12)
- Cálculo de validade e expiração no backend e exibição no admin
- Lote com `max_quantity` e opção de exportar em CSV/Excel

**Classificação:** MVP | **Tipo:** FE + BE | **Dependências:** Migration no Supabase (voucher_model)

### US-010 — Assinatura digital pós-voucher
**Como** operador, **quero** que o usuário possa assinar digitalmente um termo após ativar um voucher, **para** garantir auditoria e responsabilidade.

**Critérios de aceite:**
- Fluxo de aceite com timestamp e IP (armazenado no audit log)
- Termo texto configurável no admin

**Classificação:** PÓS-MVP | **Tipo:** FE + BE | **Dependências:** Legal review

---

## 4. CATALOGO, COLEÇÕES E RECURSOS

### US-011 — Distinção Kit vs Livro na vitrine
**Como** usuário, **quero** identificar rapidamente se uma coleção é um kit (multicase) ou um livro único, **para** entender se há vários recursos embutidos.

**Critérios de aceite:**
- Campo `collection_type: 'kit' | 'book'` no seed
- Badge visual na vitrine e no detalhe
- Modal de kit lista os itens que compõem o kit

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** Seed atualizado

### US-013 — Leitor (Flipbook) — Modo leitura
**Como** usuário, **quero** abrir o flipbook e ler as páginas com zoom e rolagem, **para** consumir conteúdos com layout paginado.

**Critérios de aceite:**
- Navegação página a página (prev/next)
- Zoom e acessibilidade básica
- Toggle entre modo texto (reflow) e modo página

**Classificação:** MVP | **Tipo:** FE | **Dependências:** Assets PDF legível

### US-014 — Contação de história (áudio por recurso)
**Como** usuário, **quero** ouvir a contação de uma história atrelada a um recurso, **para** uma experiência multimodal.

**Critérios de aceite:**
- Player de áudio embutido no detalhe com play/pause/seek
- Metadados do áudio no asset

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** Assets legados convertidos

### US-015 — Vídeo cenário (material audiovisual simples)
**Como** usuário, **quero** ver um vídeo relacionado ao recurso (curta animação), **para** reforçar o conteúdo pedagógico.

**Critérios de aceite:**
- Campo `video_url` no asset/collection
- Player responsivo com poster

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** Assets

### US-016 — Vídeo acessível (Libras)
**Como** usuário com necessidade de acessibilidade, **quero** versão em Libras do vídeo, **para** garantir acesso ao conteúdo.

**Critérios de aceite:**
- Campo `accessible_video_url` no asset/collection
- Player alterna entre legendas/versão Libras quando disponível

**Classificação:** PÓS-MVP | **Tipo:** FE + DADOS | **Dependências:** Assets Libras produzidos

### US-017 — Vídeo animado IA (desenho)
**Como** produto, **queremos** exibir vídeos animados gerados (ou importados) para crianças, **para** aumentar engajamento visual.

**Critérios de aceite:**
- Campo `animated_video_url` no asset
- Player com carregamento otimizado

**Classificação:** FUTURO | **Tipo:** FE + DADOS

---

## 5. TAXONOMIA E MAPEAMENTOS

### US-022 — BNCC agregado (tooltip rico)
**Como** professor, **quero** ver a descrição completa do código BNCC ao tocar/hover no chip, **para** entender como o recurso se alinha ao currículo.

**Critérios de aceite:**
- `data/bncc-lookup.json` com chave `code -> description` disponível
- Tooltip/popover com título, competência e pequena explicação
- Mobile: bottom-sheet para o mesmo conteúdo

**Classificação:** MVP | **Tipo:** FE + DADOS | **Dependências:** JSON BNCC

### US-024 — Outros mapeamentos (CASEL, ODS)
**Como** equipe de conteúdo, **queremos** mapeamentos complementares (CASEL, ODS), **para** enriquecer metadados pedagógicos.

**Critérios de aceite:**
- `data/casel-lookup.json` e `data/ods-lookup.json` (se aplicável)
- Chips com tooltip idêntico ao BNCC

**Classificação:** MVP | **Tipo:** FE + DADOS

---

## 6. DESCUBERTA E FILTROS

### US-025 — Filtro por ano escolar (chip)
**Como** usuário, **quero** filtrar por ano escolar rapidamente, **para** encontrar conteúdos adequados ao ano.

**Critérios de aceite:**
- Chip de ano escolar persistente na home
- Compatibilidade com busca textual

**Classificação:** PÓS-MVP | **Tipo:** FE

### US-026 — Busca unificada na home
**Como** usuário, **quero** uma barra de busca que funcione junto com os chips e filtros, **para** encontrar conteúdo sem navegar por várias telas.

**Critérios de aceite:**
- Barra de busca inline na HomeScreen
- Resultados filtrados atualizam a grade em tempo real

**Classificação:** MVP | **Tipo:** FE

---

## 7. OUTROS

### US-030 — Perfil infantil (fluxo de cadastro de criança)
**Como** adulto, **quero** cadastrar um perfil infantil associado ao meu, **para** personalizar recomendacoes.

**Critérios de aceite:**
- Perfil infantil com nome, idade e avatar
- Switch de modo infantil na UI

**Classificação:** FUTURO | **Tipo:** FE + BE

---

*Arquivos complementares e mapeamentos estão documentados em `docs/` e no `consolidado-backlog-reuniao-15abr2026.md`.*

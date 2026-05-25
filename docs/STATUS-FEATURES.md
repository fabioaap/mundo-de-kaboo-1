# Status de Features — Central Coruja / Mundo de Kaboo

> Gerado automaticamente por `scripts/update-feature-status.mjs`
> Última atualização: **2026-05-25** · atualizado por: Copilot

---

## Placar geral

| Status | Qtd | % |
|--------|-----|---|
| ✅ Entregue | 44 | — |
| 🟡 Parcial  | 2 | — |
| 🔴 Pendente | 9 | — |
| **Total**   | **55** | **82% entregue** |

---

## Auth e acesso

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Login e cadastro por e-mail/senha | ✅ Entregue | v1.2 | 2026-04-10 | — |
| Voucher temporal (resgate, renovação, expiração) | ✅ Entregue | v1.2 | 2026-04-10 | — |
| Duração de voucher 1/3/6/9/12 meses | ✅ Entregue | v1.2 | 2026-04-10 | — |
| Content grants (liberação de conteúdo por voucher) | ✅ Entregue | v1.2 | 2026-04-10 | — |
| Convite de colaboradores (invite flow) | ✅ Entregue | v1.2 | 2026-04-15 | — |
| CPF opcional no cadastro (ECA digital) | 🔴 Pendente | v1.3 | — | Pendente validação jurídica ECA |
| Assinatura digital pós-voucher | 🔴 Pendente | v1.3 | — | UX do fluxo ainda não definida |
| Login com Educa Cross (OAuth) | 🔴 Pendente | v2.0 | — | Depende de API OAuth do Educa Cross |

## Catálogo e vitrine

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| 16 coleções reais com covers | ✅ Entregue | v1.2 | 2026-04-12 | — |
| Distinção kit vs livro com badge visual e capa própria | ✅ Entregue | v1.2 | 2026-04-19 | — |
| Segmentos editoriais (E.F. Anos Iniciais, Ed. Infantil) | ✅ Entregue | v1.2 | 2026-04-19 | — |
| Sinopse por coleção | ✅ Entregue | v1.2 | 2026-04-19 | — |
| Ordenação por ano escolar | ✅ Entregue | v1.2 | 2026-04-15 | — |

## Detalhe da coleção

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Leitor de PDF (flipbook) | ✅ Entregue | v1.2 | 2026-04-12 | — |
| Modo texto acessível no leitor | ✅ Entregue | v1.2 | 2026-04-15 | — |
| CTAs tipados (Leitura, Contação, Animado, Libras, Como Jogar, Videoaula) | ✅ Entregue | v1.2 | 2026-04-19 | — |
| Biblioteca estruturada de Materiais da Coleção | ✅ Entregue | v1.2 | 2026-04-19 | — |
| Tooltip BNCC rico (1.397 habilidades) | ✅ Entregue | v1.2 | 2026-04-18 | — |
| Tooltip CASEL rico (5 competências) | ✅ Entregue | v1.2 | 2026-04-19 | — |
| Vídeo com Libras (campo existe, UX não exposta sem arquivo real) | 🟡 Parcial | v1.3 | — | Campo accessible_video_url presente no modelo; aguarda arquivos reais |
| Vídeo animado/IA | 🟡 Parcial | v1.3 | — | Campo animated_video_url presente no modelo; aguarda arquivos reais |

## Descoberta / Home

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Busca inline com overlay sobre a grade | ✅ Entregue | v1.2 | 2026-04-20 | — |
| Filtro puro mostra grade direta com chip ativa | ✅ Entregue | v1.2 | 2026-04-20 | — |
| Chips de ano escolar na Home | ✅ Entregue | v1.2 | 2026-04-15 | — |
| Filtro por personagem com avatares | ✅ Entregue | v1.2 | 2026-04-20 | — |
| Afuniladores avançados de BNCC no mobile (BnccPickerSheet) | ✅ Entregue | v1.3 | 2026-04-20 | [2026-04-20] Afuniladores por etapa, componente e faixa entregues no BnccPickerSheet |

## Personagens

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Catálogo canônico com 8 personagens | ✅ Entregue | v1.2 | 2026-04-20 | — |
| CMS admin: CRUD, foto, aliases, status | ✅ Entregue | v1.2 | 2026-04-20 | — |
| Persistência remota de personagens no Supabase | ✅ Entregue | v1.2 | 2026-04-20 | — |
| Página pública de personagens | ✅ Entregue | v1.2 | 2026-04-20 | — |

## CMS Admin

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| CRUD de coleções (kit e livro) | ✅ Entregue | v1.2 | 2026-04-15 | — |
| CMS de vouchers (modelos, lotes, códigos, auditoria) | ✅ Entregue | v1.2 | 2026-04-12 | — |
| Exportação XLSX para gráfica | ✅ Entregue | v1.2 | 2026-04-15 | — |
| Dados de resgate: usuário, e-mail, data de ativação | ✅ Entregue | v1.2 | 2026-04-15 | — |
| Gestão de usuários com convite e exclusão | ✅ Entregue | v1.2 | 2026-04-16 | — |

## Infraestrutura

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Deploy GitHub Pages (modo demo) | ✅ Entregue | v1.2 | 2026-04-16 | — |
| Design system (17+ componentes) | ✅ Entregue | v1.2 | 2026-04-15 | — |
| Backend Supabase remoto (validação end-to-end) | ✅ Entregue | v1.3 | 2026-05-25 | Migrations aplicadas no projeto remoto yevysgqlnhonhkczkyhu (São Paulo). Push validado via CLI. |
| Servidor/banco separado para Central Coruja | 🔴 Pendente | v1.3 | — | Depende de conta Empatia e decisão de infra (Maxwell) |
| Conta Empatia registrada no Google Play e Apple | 🔴 Pendente | v1.3 | — | Responsável: Douglas + Rafael + Maxwell |
| Build nativo (Capacitor/TWA) | 🔴 Pendente | v1.3 | — | Depende de conta nas lojas e build estável |

## White Label / Branding

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Engine white-label com slug, tema, menu e feature flags por marca | ✅ Entregue | v1.3 | 2026-04-29 | Bootstrap de marca via useBrandConfig; rotas por slug; isolamento Kaboo vs Central Coruja |
| Backbone de mídia privada (storage por marca) | ✅ Entregue | v1.3 | 2026-04-25 | Migration 20260425000100_private_media_backbone.sql aplicada |
| Controle de acesso por marca (RLS por brand) | ✅ Entregue | v1.3 | 2026-04-29 | Migrations 20260426000100 e 20260429000100 aplicadas |
| Flag de conteúdo offline por item de catálogo | ✅ Entregue | v1.3 | 2026-05-13 | Migration 20260513000100_add_content_offline_flag.sql aplicada no remoto |

## CMS Admin — Mídia e Vinculação

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Seleção de frame de vídeo como capa no admin | ✅ Entregue | v1.3 | 2026-05-13 | Extração de frame com canvas; upload automático para storage |
| Segregação de mídia por tipo no painel admin (vídeos, áudios, PDFs, materiais) | ✅ Entregue | v1.3 | 2026-05-13 | — |
| Vínculo de mídia com radio buttons visuais (card com thumbnail) | ✅ Entregue | v1.3 | 2026-05-25 | Thumbnails 64x64 harmônicas, deduplicação por URL, radio single-select |
| Botão Limpar remove asset vinculado corretamente | ✅ Entregue | v1.3 | 2026-05-25 | Fix em buildNextFormFromAssets: sync legacy URL fields do array assets antes de inferCollectionAssets |
| SearchableMultiSelect com herança automática de campos pedagógicos | ✅ Entregue | v1.3 | 2026-05-25 | — |

## QA / Testes de Usabilidade

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Suíte Playwright — Central Coruja (50 testes: jornadas, JTBD, edge cases) | ✅ Entregue | v1.3 | 2026-05-25 | 39 passed, 11 skipped (data-dependent). Cobre JN-COL-001 a 017, EDGE-001 a 014 |
| Suíte Playwright — Kaboo (23 testes: fix verifications + módulos) | ✅ Entregue | v1.3 | 2026-05-25 | 23/23 passed. Verifica FIX-001/002/003 e 9 módulos admin |

## v2.0 — Expansão

| Feature | Status | Versão | Entregue em | Notas |
|---------|--------|--------|-------------|-------|
| Academia/formação do professor | 🔴 Pendente | v2.0 | — | Pré-condição: v1.3 estável, conteúdo de formação produzido |
| Gamificação adulta (metas, progresso, conquistas) | 🔴 Pendente | v2.0 | — | Pré-condição: design de mecânicas aprovado |
| Perfil infantil com interface simplificada | 🔴 Pendente | v2.0 | — | Pré-condição: validação jurídica ECA, design infantil aprovado |

---

## Próximos passos críticos

> Features com `status: pending` em `v1.3` são o caminho de crítico para Go To Market real:

- **CPF opcional no cadastro (ECA digital)** (`cpf-cadastro`) — v1.3: Pendente validação jurídica ECA
- **Assinatura digital pós-voucher** (`assinatura-digital`) — v1.3: UX do fluxo ainda não definida
- **Vídeo com Libras (campo existe, UX não exposta sem arquivo real)** (`video-libras`) — v1.3: Campo accessible_video_url presente no modelo; aguarda arquivos reais
- **Vídeo animado/IA** (`video-animado`) — v1.3: Campo animated_video_url presente no modelo; aguarda arquivos reais
- **Servidor/banco separado para Central Coruja** (`servidor-separado`) — v1.3: Depende de conta Empatia e decisão de infra (Maxwell)
- **Conta Empatia registrada no Google Play e Apple** (`conta-lojas`) — v1.3: Responsável: Douglas + Rafael + Maxwell
- **Build nativo (Capacitor/TWA)** (`app-nativo`) — v1.3: Depende de conta nas lojas e build estável

---

_Este arquivo é gerado automaticamente. Para atualizar, use `node scripts/update-feature-status.mjs`._

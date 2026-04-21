# Roadmap Central Coruja — Pós-Reunião 15/04/2026

> Gerado em: 18/04/2026  
> Fonte: reunião de produto 15/04/2026 + estado do código em `feature/invite-flow`  
> Responsável pelo roadmap: PM (Bob)  
> Aprovação pendente: Mario (produto), Reginaldo (direção)

---

## Visão de produto

A Central Coruja é um **"Netflix de conteúdo extra, só consumível"**: complemento digital a kits e livros físicos, acesso via voucher, cadastro adulto (familiar ou educador), sem jogos, sem turmas, sem alunos. O app deve entregar valor percebido imediato no primeiro acesso e escalar em funcionalidades de descoberta e conteúdo antes de tocar em gamificação, perfil infantil ou academia.

---

## Estado atual do código (baseline)

| Área | Status |
|------|--------|
| Auth (email+senha, mock local) | ✅ Completo |
| Voucher temporal (resgate, renovação, expiração) | ✅ Completo |
| Voucher CMS admin (modelos, lotes, códigos, auditoria) | ✅ Completo |
| Content grants (liberação por conteúdo) | ✅ Completo |
| Catálogo mock (16 coleções reais) | ✅ Completo |
| Leitor de PDF (flipbook) | ✅ Completo |
| Design system (17 componentes + Storybook) | ✅ Completo |
| Convite de colaboradores (invite flow) | ✅ Em finalização (`feature/invite-flow`) |
| Busca/filtros unificados na home | ✅ Implementado na `HomeScreen` |
| Deploy GitHub Pages (modo demo) | ✅ Configurado |
| Backend Supabase remoto | ⚠️ Preparado, não validado em produção |

### Atualização local — 19/04/2026

- `data/casel-lookup.json` e tooltip CASEL rico entregues no detalhe da coleção.
- Distinção kit vs livro entregue localmente com badge visual, `collection_type` no seed/mock e `kit_cover_image` opcional.
- Materiais da Central estruturados em modo mock/local, sem exposição fixa na home atual.
- Catálogo mock enriquecido com `collection_assets` para Libras, animação, como jogar e videoaula, usando a superfície tipada já existente.
- Especificação de UX para seleção mobile da BNCC documentada em `docs/spec-bncc-mobile-filter.md`, consolidando a direção de full-screen sheet com seleção direta na lista no lugar da grade extensa de chips.

### Atualização local — 20/04/2026

- A UX final da busca inline na Home foi fechada em `HomeScreen`: clicar na barra não abre mais uma tela intermediária errada.
- Busca textual agora funciona como overlay sobre a grade existente, com fechamento e entrada em linha no próprio campo, sem CTA redundante no header desktop.
- Quando há apenas filtros ativos, sem texto de busca, o estado final passou a mostrar diretamente a grade filtrada com a chip ativa, sem card flutuante de resultados sobreposto.
- Build e QA manual/browser foram refeitos após esse ajuste final, mantendo `v1.2 local demonstrável` em 100%.

---

## Fase 1 — Sprint Atual (v1.2-alpha) — "Polimento de vitrine"

**Objetivo**: entregar as melhorias de UX que o usuário final percebe imediatamente, usando apenas frontend e dados estáticos. Zero dependência de backend.

**Duração estimada**: 2 semanas (19/04 → 02/05)  
**Responsável principal**: Fabio

| # | Item | Tam. | Dependência | Critério de done |
|---|------|------|-------------|------------------|
| 1 | **Renomear labels das abas de recurso** (Ler→Leitura, Ouvir→Contação da História, Assistir→Desenho Animado) | P | Nenhuma | Labels atualizados em `constants.ts` e refletidos no detalhe da coleção. Validação visual em mock. |
| 2 | **JSON estático BNCC** (códigos → descrições completas) | P | Nenhuma | Arquivo `data/bncc-lookup.json` com pelo menos os códigos usados no catálogo atual. Fonte: documento oficial da BNCC. |
| 3 | **Tooltip BNCC no detalhe** (hover mostra descrição rica) | M | Item 2 | Ao hover/tap no código BNCC, tooltip exibe campo de conhecimento, componente e descrição. Mobile: tap abre popover. Acessível (aria-describedby). |
| 4 | **JSON estático CASEL** (competências → descrições) | P | Nenhuma | Arquivo `data/casel-lookup.json` com as 5 competências CASEL + sub-skills. |
| 5 | **Tooltip descritivo para outros mapeamentos** (CASEL, ODS, etc.) | M | Item 4 | Mesma UX do tooltip BNCC para todos os chips de mapeamento no detalhe. |
| 6 | **Distinção kit vs livro na vitrine** | M | Dados mock (item 13) | Campo `collection_type: 'kit' \| 'book'` no seed. Card da home exibe badge visual diferenciador. Modal de coleção mostra composição do kit quando aplicável. |
| 7 | **Merge branch invite-flow → v1.2** | P | Finalização do invite flow | Branch `feature/invite-flow` merged em `v1.2`. Sem conflitos. Build passa. |

**Ordem de execução recomendada**: 7 → 2 → 4 → 1 → 3 → 5 → 6

**Dados estáticos necessários (pré-requisito dos itens 2, 4, 6)**:

| # | Dado | Tam. | Responsável |
|---|------|------|-------------|
| 11 | `data/bncc-lookup.json` | P | Fabio (extrair do documento BNCC oficial) |
| 12 | `data/casel-lookup.json` | P | Fabio (fonte: casel.org) |
| 13 | Campo `collection_type` no `catalog.seed.json` | P | Fabio (Mario valida classificação) |

---

## Fase 2 — Próxima Sprint (v1.2-beta) — "Descoberta e novos recursos"

**Objetivo**: implementar filtros unificados e os novos campos de conteúdo audiovisual. Completar a experiência de "vitrine Netflix".

**Duração estimada**: 2 semanas (03/05 → 16/05)  
**Responsável principal**: Fabio

| # | Item | Tam. | Dependência | Critério de done |
|---|------|------|-------------|------------------|
| 4h | **Filtro rápido por ano escolar na home** | M | Plano de busca/filtros (session plan) | Chip de ano escolar funcional na home. Filtra catálogo por metadado de faixa etária/série. Persiste ao voltar de coleção. |
| 8 | **Grid adaptativo para 4-6 botões no detalhe** | M | Nenhuma | Grid responsivo no detalhe da coleção comporta até 6 botões de recurso sem quebra de layout. Testado em 320px, 375px, 768px e 1024px. |
| 6v | **Botão + campo para vídeo acessível (Libras)** | M | Nenhuma (frontend puro, campo mock) | Botão "Assistir Acessível" aparece no detalhe quando `accessible_video_url` existe. Player embarcado ou link externo. Campo no mock/seed. |
| 7v | **Botão + campo para vídeo animado (IA)** | M | Nenhuma (frontend puro, campo mock) | Botão "Desenho Animado" aparece no detalhe quando `animated_video_url` existe. Mesma UX do vídeo acessível. |
| 9 | **Área de materiais genéricos** (nível Central/coleção) | G | Decisão de produto sobre modelo de dados | Seção "Materiais" visível na home ou no detalhe da coleção. Aceita PDFs/links genéricos não atrelados a um recurso específico. Mock com 2-3 materiais de exemplo. |
| BF | **Busca + filtros unificados na home (plano completo)** | G | Session plan já aprovado | Barra de busca + chips rápidos + sheet avançado na HomeScreen. SearchScreen vira alias. Persistência de estado ao navegar. |

**Ordem de execução recomendada**: BF → 4h → 8 → 6v → 7v → 9

---

## Fase 3 — Backlog Curto Prazo (v1.2-rc → v1.3) — "Produção e backend"

**Objetivo**: validar o backend real, implementar campos no Supabase e preparar para publicação nas lojas.

**Duração estimada**: 3-4 semanas (17/05 → 13/06)  
**Responsáveis**: Fabio (frontend-backend integration), Maxwell (infra), Mario (validação)

| # | Item | Tam. | Responsável | Dependência |
|---|------|------|-------------|-------------|
| 14 | **Tabela BNCC no Supabase** (migrar JSON para banco) | M | Fabio | Supabase remoto validado |
| 15 | **Campo `accessible_video_url` na collection** | P | Fabio | Migration Supabase |
| 16 | **Campo `animated_video_url` na collection** | P | Fabio | Migration Supabase |
| 17 | **Campo `collection_type` na collection** | P | Fabio | Migration Supabase |
| 18 | **Materiais genéricos como entidade separada** | M | Fabio | Decisão de modelagem |
| 10 | **Campo CPF opcional no cadastro** | M | Fabio | Validação jurídica (ECA digital) |
| 19 | **Assinatura digital pós-voucher** | G | Fabio + Mario | Definição de fluxo de UX |
| 22 | **Servidor/banco separado para Central Coruja** | G | Maxwell | Conta Empatia definida |
| 20 | **Conta Empatia nas lojas Google/Apple** | M | Maxwell + Douglas + Rafael | Decisão de conta confirmada |
| 21 | **Build nativo (Capacitor/Expo)** | G | Douglas + Rafael | Conta nas lojas + build estável |

---

## Fase 4 — Backlog Longo Prazo (v2.0+) — "Expansão"

**Objetivo**: funcionalidades de segundo passo que ampliam o público e a proposta de valor.

| # | Item | Tam. | Responsável | Pré-condição |
|---|------|------|-------------|--------------|
| 23 | **Academia/formação** (módulo novo) | XG | Fabio + Mario | v1.3 estável, conteúdo de formação produzido |
| 24 | **Gamificação adulto** (metas, progresso, conquistas) | G | Fabio | v1.3 estável, design de mecânicas aprovado |
| 25 | **Perfil infantil** (cadastro criança, interface infantil) | G | Fabio | Validação jurídica ECA, design infantil |
| 26 | **Login com Educa Cross (OAuth)** | M | Fabio + Maxwell | API de OAuth do Educa Cross disponível |

---

## Métricas de entrega

### O que define "v1.2 entregue"

- [x] Convite de colaboradores funcionando (invite flow merged)
- [x] Labels de abas renomeados
- [x] Tooltips BNCC e CASEL funcionando com dados estáticos
- [x] Distinção kit vs livro visível na vitrine
- [x] Busca + filtros unificados na home
- [x] Botões de vídeo acessível e animado presentes no detalhe
- [x] Grid adaptativo para 4-6 recursos
- [x] Build de produção atual passa, com QA manual validado em modo mock local
- [x] Catálogo mock atualizado com todos os novos campos

**Definição**: v1.2 é a versão "vitrine completa" que pode ser demonstrada para stakeholders e testada por usuários beta via voucher, sem depender de backend real.

---

## Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | **Dados BNCC incompletos ou imprecisos** — o JSON precisa cobrir os códigos usados no catálogo | Média | Alto | Fabio extrai do documento oficial; Mario valida uma amostra. Se faltar código, tooltip mostra "Descrição não disponível" como fallback. |
| R2 | **Conta Empatia nas lojas demora** — depende de Douglas/Rafael/Maxwell e aprovação das lojas | Alta | Alto | Iniciar processo de registro na semana de 21/04. Não bloqueia v1.2 (que roda em demo/web). |
| R3 | **Fabio é gargalo único no frontend** — todo item de código depende dele | Alta | Crítico | Priorização rígida: sprint atual contém apenas itens P e M. Itens G ficam na sprint seguinte. Nenhum item G em paralelo. |
| R4 | **Backend Supabase com migrations divergentes** — histórico remoto pode conflitar com local | Média | Médio | Antes de rodar migrations remotas, fazer `supabase db diff` e alinhar. Manter fallback mock funcional. |
| R5 | **Escopo creep de produto** — reunião mencionou academia, gamificação, perfil infantil | Média | Médio | Todos classificados como v2.0. Qualquer promoção de item precisa de aprovação explícita do Mario com re-estimativa. |
| R6 | **Classificação kit vs livro ambígua** — nem toda coleção tem classificação clara | Baixa | Baixo | Mario classifica manualmente as 16 coleções atuais. Campo aceita null como "não classificado". |
| R7 | **Busca/filtros unificados estouram a sprint** — item G com várias superfícies | Média | Médio | Dividir em 2 PRs: (1) migração de lógica, (2) redesign da barra + chips. Se estourar, finalizar na sprint seguinte sem bloquear release dos tooltips. |

---

*Documento vivo. Atualizar a cada sprint review com itens concluídos, re-estimativas e mudanças de prioridade.*

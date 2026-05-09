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

### Validação local final — 19/04/2026

- `npx vite build` executado com sucesso no bundle atual.
- QA manual em modo mock/local confirmou a vitrine com badges de kit/livro, o detalhe com CTAs tipados (`Leitura`, `Contação da História`, `Desenho Animado`, `Com Libras`, `Materiais da Coleção`), tooltip CASEL rico e o picker BNCC com seleção direta no primeiro card.
- Com isso, o escopo viável local de v1.2 fica encerrado; o restante do roadmap começa na fase dependente de backend real, lojas e integrações externas.

### Fechamento adicional da Home — 20/04/2026

- O fluxo de busca/filtro da Home foi refinado até o estado de mercado esperado: overlay apenas para busca textual e grade direta para filtro puro.
- A validação final confirmou chip ativa, grade filtrada visível e ausência do card flutuante quando a seleção é apenas por filtro.

### Placar executivo — 19/04/2026

| Frente | % | Leitura |
|--------|---|---------|
| v1.2 local demonstrável | 100% | Escopo mock/local encerrado e validado |
| Descoberta pedagógica e BNCC | 75% | MVP entregue; afuniladores avançados e persistência real seguem pendentes |
| v1.3 produção real | 20% | Preparação e arquitetura prontas, validação real ainda aberta |
| v2.0 expansão | 0% | Não iniciado |

**Leitura executiva**: se for necessário reportar um único número para o roadmap macro, usar **40%** de avanço, considerando v1.2, v1.3 e v2.0 como três blocos de mesmo peso. Para gestão diária, manter os percentuais por frente acima, porque eles separam demo local, produção real e expansão futura.

### O que define "v1.3"

- [ ] Backend Supabase validado em produção
- [ ] Campos novos persistidos no banco (BNCC, vídeos, tipo, materiais)
- [ ] CPF opcional no cadastro
- [ ] Servidor/banco separado configurado
- [ ] App publicado nas lojas (conta Empatia)

**Definição**: v1.3 é a versão "produção real" publicada nas lojas com backend próprio.

### O que define "v2.0"

- [ ] Pelo menos um módulo de expansão implementado (academia OU gamificação OU perfil infantil)
- [ ] OAuth com Educa Cross funcional

**Definição**: v2.0 é a versão que expande o público além do adulto consumidor de kits.

---

## Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | **Dados BNCC incompletos ou imprecisos** — o JSON precisa cobrir os códigos usados no catálogo | Média | Alto | Fabio extrai do documento oficial; Mario valida uma amostra. Se faltar código, tooltip mostra "Descrição não disponível" como fallback. |
| R2 | **Conta Empatia nas lojas demora** — depende de Douglas/Rafael/Maxwell e aprovação das lojas | Alta | Alto (bloqueia v1.3) | Iniciar processo de registro na semana de 21/04. Não bloqueia v1.2 (que roda em demo/web). |
| R3 | **Fabio é gargalo único no frontend** — todo item de código depende dele | Alta | Crítico | Priorização rígida: sprint atual contém apenas itens P e M. Itens G ficam na sprint seguinte. Nenhum item G em paralelo. |
| R4 | **Backend Supabase com migrations divergentes** — histórico remoto pode conflitar com local | Média | Médio | Antes de rodar migrations remotas, fazer `supabase db diff` e alinhar. Manter fallback mock funcional. |
| R5 | **Escopo creep de produto** — reunião mencionou academia, gamificação, perfil infantil | Média | Médio | Todos classificados como v2.0. Qualquer promoção de item precisa de aprovação explícita do Mario com re-estimativa. |
| R6 | **Classificação kit vs livro ambígua** — nem toda coleção tem classificação clara | Baixa | Baixo | Mario classifica manualmente as 16 coleções atuais. Campo aceita null como "não classificado". |
| R7 | **Busca/filtros unificados estouram a sprint** — item G com várias superfícies | Média | Médio | Dividir em 2 PRs: (1) migração de lógica, (2) redesign da barra + chips. Se estourar, finalizar na sprint seguinte sem bloquear release dos tooltips. |

---

## Dependências entre equipes

```
Fabio (frontend)
  └─ Sprint atual: autônomo (dados estáticos + frontend puro)
  └─ Sprint 2: autônomo (ainda frontend puro com mock)
  └─ v1.3: precisa de Maxwell (infra Supabase) + Mario (validação)

Maxwell (infra)
  └─ v1.3: servidor/banco separado + suporte a deploy
  └─ v1.3: auxiliar registro de conta Empatia

Douglas + Rafael (mobile/lojas)
  └─ v1.3: build nativo + publicação nas lojas
  └─ Dependem de: conta Empatia registrada + build web estável

Mario (produto)
  └─ Sprint atual: validar classificação kit vs livro
  └─ Sprint atual: validar amostra de dados BNCC
  └─ v1.3: definir fluxo de assinatura digital + CPF
```

---

## Decisões automáticas do PM

| Decisão | Contexto | Escolha | Razão |
|---------|----------|---------|-------|
| [AUTO-DECISION] Backend na Fase 3, não na Fase 1 | Reunião disse "focar frontend" | Backend fica no backlog curto prazo | Time definiu que Fabio foca frontend; backend sem responsável imediato |
| [AUTO-DECISION] Busca/filtros na Sprint 2, não na Sprint 1 | Item G vs itens P/M da Sprint 1 | Busca fica na próxima sprint | Sprint 1 deve ter itens menores e de impacto visual imediato (tooltips, labels); busca é G e tem plano separado |
| [AUTO-DECISION] CPF na Fase 3 | Reunião disse "talvez CPF" | CPF fica no backlog curto prazo | Requer validação jurídica (ECA) e campo no backend; não bloqueia demo |
| [AUTO-DECISION] Materiais genéricos na Sprint 2 | Reunião priorizou | Sprint 2 com decisão de modelagem | Precisa de definição de produto (onde exibir, como organizar) antes de implementar |
| [AUTO-DECISION] Ordem Sprint 1: merge primeiro | Invite flow pronto | Merge antes de novos itens | Evita divergência de branches e conflitos |

---

## Revisão Delta — 18/04/2026

O delta complementar validado em código não muda a direção do produto, mas altera duas premissas do plano atual: a taxonomia editorial do catálogo e o modelo operacional de vouchers para gráfica. Por isso, além dos ajustes em Sprint 1 e Sprint 2, entra uma fase intermediária nova antes do v1.3.

### Ajustes imediatos na Sprint atual

- Fechar o teto de vouchers em `1, 3, 6, 9, 12` meses, removendo a faixa customizada até 120 meses.
- Esconder recursos sem arquivo na tela de detalhe, em vez de apenas desabilitar botões.
- Manter a sprint de BNCC com lookup estático, mas usando a planilha BNCC como fonte-base do JSON temporário.
- Aplicar o rename visível de `Nível` para `Segmento` onde hoje o impacto é apenas textual.

### Ajustes na próxima sprint

- Subir `sinopse` como novo metadado editorial no catálogo.
- Adicionar ordenação por ano escolar como expansão dos filtros pedagógicos.
- Trocar a ideia genérica de materiais por um MVP de biblioteca estruturada de Materiais Extras.
- Subir uma versão leve da página de Personagens, conectada à descoberta por filtro.
- Trocar a implementação de vídeos isolados por um renderer baseado em ativos tipados.

### Nova Fase 2.5 — Estrutura Editorial e Operação

| # | Item | Tam. | Responsável | Dependência |
|---|------|------|-------------|-------------|
| 2.5.1 | Exportação XLSX para gráfica, mantendo CSV como fallback | M | Fabio | Fluxo atual de lotes estável |
| 2.5.2 | Exibir usuário, e-mail e data de ativação no admin de vouchers | M | Fabio | Fonte de dados de resgate definida |
| 2.5.3 | Fechar taxonomia de `segmento` e habilitar multissegmentos | G | Fabio + Mario | Regra editorial aprovada |
| 2.5.4 | Consolidar modelo rico de ativos multimídia e materiais | G | Fabio | Decisão de produto sobre taxonomia |
| 2.5.5 | Estruturar página de Personagens com dado próprio | G | Fabio + Mario | Entidade de personagem definida |

**Objetivo da fase 2.5**: fechar catálogo, operação e semântica dos ativos antes de congelar migrations, backend real e publicação nas lojas.

### Itens que sobem para v1.3 com o delta

- Pipeline definitivo de BNCC a partir da planilha-base, com persistência e versionamento.
- Persistência real de `segmentos` e vínculos multissegmento no Supabase.
- Leitor com modo texto acessível, sem depender apenas do zoom visual.
- Consolidação do rastreamento de resgate de vouchers no backend real.

---

## Calendário resumido

```
Semana 1-2 (19/04 - 02/05)  Sprint 1: Polimento de vitrine
                              Labels, tooltips BNCC/CASEL, kit vs livro
                              
Semana 3-4 (03/05 - 16/05)  Sprint 2: Descoberta e novos recursos
                              Busca/filtros, grid adaptativo, vídeos, materiais

Semana 5-6 (17/05 - 30/05)  Sprint 2.5: Estrutura editorial e operação
                              XLSX, dados de resgate, segmentos, ativos, personagens

Semana 7-10 (31/05 - 27/06) Fase 3: Produção e backend
                              Supabase real, migrations, conta lojas, build nativo

Semana 11+ (28/06 →)         Fase 4: Expansão
                              Academia, gamificação, perfil infantil, OAuth
```

---

---

## Revisão — 09/05/2026

### Contexto da sessão

Sprint de QA e preparação de catálogo da Central Coruja. Foco em dois eixos: (1) garantia de qualidade de ponta a ponta com ciclo de teste → correção → regressão; (2) isolamento de dados por marca para que a Central Coruja possa começar seu próprio catálogo limpo, sem herdar seeds do Kaboo.

---

### UX — Melhorias de sidebar e navegação

| Item | Status |
|------|--------|
| Tooltip hover nos ícones quando sidebar recolhida | ✅ Entregue |
| Auto-colapso da sidebar principal ao entrar em Gerenciar | ✅ Entregue |
| Botão de expandir sidebar reposicionado (não cobre logo) | ✅ Entregue |
| Crash `showInlineFilterTrigger is not defined` no HomeScreen | ✅ Corrigido |

---

### Sprint QA — 3 sprints executados e fechados

**Sprint 1 — Auth e controle de acesso (09/05)**

| Arquivo | Mudança |
|---------|---------|
| `screens/AdminScreen.tsx` | Filtragem de módulos por papel (editor só vê módulos editáveis) |
| `screens/VouchersModule.tsx` | Botão `+ Novo modelo` ocultado para não-admins |
| `screens/AdminWhiteLabelScreen.tsx` | Ações de escrita desabilitadas para viewers e editors |
| `lib/mockData.ts` | Fixtures de mock para usuários editor e viewer adicionados |

Commits: `aed5548`, `41b4bd8`, `38829e1`, `53ce665`

**Sprint 2 — Ciclo de vida de conteúdo (09/05)**

| Bug | Arquivo | Correção |
|-----|---------|----------|
| BUG-005: Cache não limpava após CRUD mock | `lib/api.ts` | `clearCollectionsCache()` chamado em create/update/delete |
| BUG-006: Personagens inativos apareciam no catálogo público | `lib/characters.ts` | Opção `{ excludeInactive }` em `resolveCharacterNamesFromIds` |
| BUG-007: Ativos de mídia gravados no admin não apareciam na Biblioteca Hub pública | `lib/api.ts`, `screens/LibraryHubScreen.tsx` | Bridge `collection_assets` → todos os 4 hubs; contrato live ativo |

Testes de regressão adicionados: `lib/api.regression-1.test.ts`, `lib/api.regression-2.test.ts`, `lib/characters.regression-1.test.ts`

Commits: `7126b20`, `bfa1f33`, `105d4e5`, `929e6b2`

**Sprint 3 — Regressão pública (09/05)**

- Jornada completa validada: Home → Detalhes → BookReader → AudioPlayer → VideoPlayer
- Hub `#materials` validado visualmente após BUG-007
- **Sign-off:** aprovado com ressalvas (hubs `#videos` e `#formations` verificados apenas via teste unitário, não visualmente)

---

### Separação de catálogo por marca — ✅ Entregue (09/05)

Problema: Central Coruja herdava todo o conteúdo seed do Kaboo (coleções, personagens, hubs de mídia).

Solução implementada em 3 camadas:

| Camada | Arquivo | Mudança |
|--------|---------|---------|
| Coleções | `lib/mockData.ts` | `getCollectionsStorageKey()` por slug de marca; seed do Kaboo não carregado para outras marcas |
| Cache de sessão | `lib/api.ts` | `getCollectionsCacheKey()` por slug; `setActiveBrandForApi(slug)` exportado |
| Personagens | `lib/characters.ts` | `getCharactersStorageKey()` por slug; seed vazio para marcas não-Kaboo; `setActiveBrandForCharacters(slug)` exportado |
| Raiz | `App.tsx` | `useEffect` sincroniza brand slug para os 3 módulos em cada mudança de marca |
| Hubs de mídia | `lib/api.ts` | Fallback estático de Formações/Vídeos/Músicas/Materiais não carregado para marcas sem coleções |

Testes de regressão: `lib/api.regression-3.test.ts`, `lib/characters.regression-2.test.ts`

**Resultado verificado em browser:**
- `http://localhost:4100/central-coruja/#formations` → 0 resultados, empty state correto
- `http://localhost:4100/central-coruja/#admin` → Gerenciar Coleções: vazio, Gerenciar Personagens: vazio
- `http://localhost:4100/#formations` → Kaboo: conteúdo seed intacto (16 coleções, 8+ personagens)

---

### Placar executivo — 09/05/2026

| Frente | % | Leitura |
|--------|---|---------|
| v1.2 local demonstrável | 100% | Concluído e QA validado com 3 sprints |
| Separação de catálogo por marca | 100% | Central Coruja começa limpa; Kaboo preservado |
| QA — controle de acesso por papel | 100% | Sprint 1 concluída e testada |
| QA — ciclo de vida de conteúdo | 100% | Sprint 2 concluída, 3 bugs corrigidos, 4 testes de regressão |
| QA — regressão pública | 90% | Hubs `#videos` e `#formations` sem validação visual (caveat) |
| v1.3 produção real | 20% | Arquitetura pronta, dados mock isolados, Supabase real ainda pendente |
| v2.0 expansão | 0% | Não iniciado |

**Leitura executiva**: a plataforma em modo mock está pronta para onboarding editorial da Central Coruja — o administrador pode criar coleções, personagens e ativos de mídia sem ver nenhum conteúdo do Kaboo. O próximo passo natural é inserir o catálogo real da Central Coruja e validar o fluxo de publicação antes de conectar ao Supabase de produção.

---

### Próximos passos recomendados

| Prioridade | Item | Tamanho |
|------------|------|---------|
| 🔴 Alta | **Inserir catálogo real da Central Coruja** — criar coleções, personagens e ativos via admin mock | M |
| 🔴 Alta | **Validar hubs `#videos` e `#formations` visualmente** com ativos reais inseridos | P |
| 🟡 Média | **Conectar Supabase de produção** — validar que a separação de storage por marca funciona com backend real | G |
| 🟡 Média | **Pipeline de BNCC** — migrar JSON estático para persistência real | M |
| 🟢 Baixa | **Validação visual dos hubs de mídia da Central Coruja** após inserção de conteúdo real | P |
| 🟢 Baixa | **Testes visuais para sidebar colapsada** (tooltips, toggle) | P |

---

*Documento vivo. Atualizar a cada sprint review com itens concluídos, re-estimativas e mudanças de prioridade.*

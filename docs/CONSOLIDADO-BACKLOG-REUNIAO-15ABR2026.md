# Consolidado Final: Reunião 15/04/2026 + Delta Complementar 18/04/2026

> **Objetivo**: absorção exaustiva dos requisitos da reunião e dos deltas complementares posteriores, cruzamento com o código atual, e distribuição em demandas priorizadas.
>
> **Agentes consultados**: PO (Pax), UX (Uma), Analyst (Atlas), PM (Bob)
>
> **Data**: 18/04/2026 | **Confiança**: 95%

---

## 1. Cobertura — Nada escapou?

| Tópico da reunião | Coberto? | Onde |
|:---|:---:|:---|
| White label Central Coruja | ✅ | US-001, US-003 |
| Infra separada (servidor/banco) | ✅ | US-001, AR-002 |
| Conta Empatia nas lojas | ✅ | US-002 |
| Cadastro e-mail + senha | ✅ | US-005 |
| CPF (ECA digital) | ✅ | US-006 |
| Público adulto (familiar/educador) sem turma | ✅ | US-007, AS-002 |
| Coleção = kit vs livro na vitrine | ✅ | US-011, US-012 |
| Ler (flipbook) | ✅ | US-013 (já implementado) |
| Ouvir (contação de história em áudio) | ✅ | US-014 (já implementado, label parcial) |
| Assistir (vídeo cenário) | ✅ | US-015 (já implementado, label parcial) |
| Assistir Acessível (Libras) | ✅ | US-016 (ausente) |
| Assistir Animado/IA (desenho) | ✅ | US-017 (ausente) |
| Labels descritivos | ✅ | US-018, AS-006 |
| Marcação de página (bookmark) | ✅ | US-019 (futuro) |
| Materiais por componente | ✅ | US-020 (já implementado) |
| Materiais genéricos (Central/coleção) | ✅ | US-021 (ausente) |
| BNCC tooltip rico | ✅ | US-022, US-023 |
| Outros mapeamentos (CASEL, ODS) descritivos | ✅ | US-024 |
| Filtro por ano escolar | ✅ | US-025 |
| Busca unificada na home | ✅ | US-026 (já implementado) |
| Filtro por personagem com fotos | ✅ | US-027 |
| Busca dentro de coleção | ✅ | US-028 |
| Voucher 1-12 meses | ✅ | US-009 (já implementado) |
| Assinatura digital pós-voucher | ✅ | US-010 |
| App mobile publicado nas lojas | ✅ | US-004 |
| Gamificação leve adulto | ✅ | US-029 |
| Perfil infantil (adulto cadastra criança) | ✅ | US-030, US-031, US-032, US-033 |
| Interface infantil simplificada | ✅ | US-032 |
| Academia/formação professor | ✅ | US-034, US-035 |
| Login com Educa Cross (SSO futuro) | ✅ | US-008 |
| Benchmark app Edu | ✅ | Next steps (Fabio action item) |
| E-mail de ajustes (Mario → Fabio) | ✅ | Next steps (operacional) |
| Contação áudio ≠ audiodescrição por página | ✅ | AS-005 |
| Netflix de conteúdo extra (sem jogos, turmas) | ✅ | AS-001, AS-002 |
| Backoffice BNCC simples (sem CMS complexo) | ✅ | AS-004 |
| Publicação white label mesma conta (guideline) | ✅ | US-002 nota |

**Base da reunião**: 35 user stories + 6 anti-stories + 4 requisitos de arquitetura + 4 action items operacionais.

**Após o delta complementar de 18/04**: 3 novas delta stories, 11 refinamentos sobre stories existentes e 1 falso positivo puro já implementado.

---

## 1A. Delta Complementar — 18/04/2026

> **Progresso geral do delta: 100% (15/15 itens resolvidos)**

| Novo ponto | Status | ISS | Consolidação |
|:---|:---:|:---:|:---|
| Campo para inserir voucher | ✅ 100% | — | Já implementado antes do delta |
| Admin vouchers com usuário, e-mail e data de ativação | ✅ 100% | ISS-09 | `consumed_by_name` e `consumed_by_email` no detalhe do código e nas exportações |
| Exportar Excel para gráfica | ✅ 100% | ISS-08 | Botão "Exportar Excel" via SheetJS ao lado do CSV existente |
| Teto de vouchers em 12 meses | ✅ 100% | ISS-01 | `MAX_CUSTOM_DURATION_MONTHS` reduzido de 120 para 12 |
| Multissegmentos | ✅ 100% | ISS-10 | `segments[]` + `primary_segment` em types, mock, CMS multi-select e card |
| Renomear `nível` para `segmento` | ✅ 100% | ISS-03 | `formatSegmentLabel()` em constants, aplicado em toda a UI |
| Renomear `Fundamental I` para `E.F. Anos Iniciais` | ✅ 100% | ISS-04 | Mesmo helper, todas as telas atualizadas |
| Sinopse | ✅ 100% | ISS-06 | `synopsis` em types, mock, detalhe público e CMS admin |
| Ativos multimídia tipados: contação, animação, como jogar, videoaula | ✅ 100% | ISS-14 | `collection_assets` tipado com slots fixos no CMS, sincronização com campos legados e CTAs dinâmicos no detalhe |
| PDF de orientações para o professor | ✅ 100% | ISS-14 | Ativo dedicado `teacher_guide` no CMS e na biblioteca estruturada |
| Ocultar recurso sem arquivo | ✅ 100% | ISS-02 | Botões condicionais + flex wrap adaptativo no detalhe |
| Leitor com modo texto e zoom acessível | ✅ 100% | ISS-13 | Toggle modo texto no leitor, zoom existente preservado |
| Ordenar coleção por ano escolar | ✅ 100% | ISS-07 | Sort por `age_grade` com chip toggle na home |
| Cadastro BNCC estruturado pela planilha | ✅ 100% | ISS-11 | 1397 skills extraídas para JSON, tooltip rico no detalhe |
| Página Materiais Extras estruturados | ✅ 100% | ISS-15 | Biblioteca estruturada por categoria, tipo, descrição, preview e download, deduplicando assets e recursos legados |
| Página Personagens | ✅ 100% | ISS-12 | CharactersScreen com 8 personagens, rota, navegação e link no menu |

**Status líquido atualizado**: 15 itens resolvidos (✅), 0 itens parciais e 0 ausentes. O delta complementar de 18/04 está totalmente absorvido no produto e na documentação.

---

## 2. Matriz de Status (Analyst) — Atualizada 18/04/2026

| Status | Qtd | IDs |
|:---|:---:|:---|
| ✅ Implementado | 17 | Ler, Ouvir, Assistir, Materiais/componente, Voucher, Infra separada, Busca unificada, PWA, Auth, Labels descritivos, BNCC tooltip rico, Segmentos, Sinopse, Personagens, Modo texto, Ativos tipados, Biblioteca estruturada de materiais |
| 🟡 Parcial | 2 | CASEL hover, Filtro ano escolar (sort ok, filtro avançado pendente) |
| 🔴 Ausente | 11 | Libras, Animado/IA, Academia, Kit vs Livro, Assinatura digital, CPF, App nativo, Conta lojas, Gamificação, Perfil infantil, OAuth |

**Nota**: a matriz acima cobre a extração base da reunião. O delta complementar de 18/04 está consolidado na seção **1A** para evitar contagem dupla em itens como vouchers, BNCC, materiais e taxonomia do catálogo.

### Atualização local — 19/04/2026

- CASEL deixou de ser apenas gap parcial: o detalhe da coleção agora usa lookup estático com tooltip rico, alinhado ao padrão já usado em BNCC.
- Kit vs Livro ficou demonstrável localmente: `collection_type` e `kit_cover_image` entraram no tipo, no seed mock, no CMS admin e na vitrine com badge clara.
- Os materiais da Central seguem estruturados em modo mock/local, mas não ficam expostos como bloco fixo na home atual.
- O catálogo mock passou a carregar exemplos tipados de `accessible_video`, `animation`, `how_to_play` e `video_lesson`, o que permite validar a UX desses recursos sem depender de backend externo.

### Fechamento operacional — 19/04/2026

- `npm run build` passou no bundle atual.
- QA manual em modo mock/local confirmou a distinção `Kit`/`Livro` nos cards e no hero, os CTAs tipados do detalhe e a tooltip CASEL rica.
- No recorte viável do repo local, Fase 1, Fase 2 e Fase 2.5 ficam encerradas em 100%.
- O backlog remanescente começa na Fase 3 e depende de backend real, lojas, jurídico e integrações externas.

### Atualização local — 20/04/2026

- A sequência final de UX da Home foi concluída: a busca permanece inline em `HomeScreen`, sem tela intermediária, mantendo os cards ao fundo quando existe query textual.
- O fluxo de filtro puro foi separado da busca textual: com apenas filtros ativos, a home agora mostra diretamente a grade filtrada com chip ativa, sem card grande de resultados sobreposto.
- O comportamento foi revalidado com build e browser, fechando o último ajuste de experiência da descoberta local antes das pendências de produção real.

---

## 3. Roadmap em 4 Fases (PM)

### Fase 1: Sprint Atual (v1.2-alpha) — "Polimento de vitrine"
> **2 semanas** | Frontend puro + dados estáticos | Responsável: Fabio

| # | Item | Tam | Critério de done |
|---|------|:---:|---|
| 1 | Merge invite-flow → v1.2 | P | Branch merged, build OK |
| 2 | JSON estático BNCC (`data/bncc-lookup.json`) | P | Códigos do catálogo com descrições oficiais |
| 3 | JSON estático CASEL (`data/casel-lookup.json`) | P | 5 competências + sub-skills |
| 4 | Renomear labels das abas de recurso | P | "Contação da História", "Leitura", etc. |
| 5 | Tooltip BNCC rico no detalhe | M | Hover/tap mostra descrição completa |
| 6 | Tooltip CASEL e outros mapeamentos | M | Mesmo padrão da BNCC |
| 7 | Distinção kit vs livro na vitrine (badge + campo mock) | M | Campo `collection_type` no seed, visual diferenciado |

**Ordem**: 1 → 2 → 3 → 4 → 5 → 6 → 7

### Fase 2: Próxima Sprint (v1.2-beta) — "Descoberta e novos recursos"
> **2 semanas** | Frontend puro com mock | Responsável: Fabio

| # | Item | Tam | Critério de done |
|---|------|:---:|---|
| 8 | Busca + filtros unificados (session plan) | G | Barra + chips + sheet avançado na home |
| 9 | Filtro rápido por ano escolar | M | Chips na home, filtra catálogo |
| 10 | Grid adaptativo 4-6 botões no detalhe | M | Responsivo, 5 itens funciona |
| 11 | Botão vídeo acessível (Libras) + campo mock | M | Aparece quando `accessible_video_url` existe |
| 12 | Botão vídeo animado (IA) + campo mock | M | Aparece quando `animated_video_url` existe |
| 13 | Área de materiais genéricos | G | Seção nova com 2-3 materiais de exemplo |

### Fase 3: Backlog Curto Prazo (v1.3) — "Produção e backend"
> **3-4 semanas** | Backend real + lojas | Fabio + Maxwell + Douglas/Rafael

- Migrations Supabase (BNCC, vídeos, tipo, materiais)
- CPF opcional no cadastro
- Servidor/banco separado configurado
- Conta Empatia registrada nas lojas
- Build nativo (Capacitor/TWA)
- Assinatura digital pós-voucher

### Fase 4: Backlog Longo Prazo (v2.0+) — "Expansão"

- Academia/formação professor
- Gamificação adulto (metas, progresso, conquistas)
- Perfil infantil (cadastro criança + interface infantil)
- Login com Educa Cross (OAuth)

### Revisão com o delta complementar de 18/04

- **Sprint atual** concluiu quatro correções de rumo: teto de vouchers em 12 meses ✅, ocultar recursos sem arquivo ✅, BNCC via planilha com 1397 skills ✅ e rename visível de `nível` para `segmento` ✅. Também implementou labels descritivos ✅.
- **Sprint 2** concluiu `sinopse` ✅ e ordenação por ano escolar ✅.
- **Sprint 2.5** concluiu: exportação XLSX ✅, dados de resgate no CMS ✅, multissegmentos ✅, página de personagens ✅, modo texto no leitor ✅, BNCC estruturado pela planilha ✅, modelo de ativos tipados ✅ e biblioteca estruturada de materiais extras ✅.

| Fase intermediária | Objetivo |
|---|---|
| Sprint 2.5 — Estrutura editorial e operação | Fechar multissegmentos, taxonomia dos ativos multimídia, exportação XLSX, dados operacionais do resgate de vouchers e o dado próprio de personagens antes do backend final |

---

## 4. UX: Componentes Novos Necessários

| Componente | Uso | Prioridade |
|---|---|---|
| `RichTooltip` | BNCC/CASEL hover (desktop: popover, mobile: bottom sheet) | Sprint 1 |
| `AdaptiveResourceGrid` | 4-6 botões de recurso no detalhe | Sprint 2 |
| `AgeGradeFilterBar` | Chips de ano escolar na home | Sprint 2 |
| `CharacterFilterChip` | Filtro por personagem com fotos | Sprint 2 |
| `GenericMaterialsSection` | Materiais de nível Central/coleção | Sprint 2 |
| `ProgressDashboard` | Gamificação leve (barra, streak, conquistas) | v2.0 |
| `ChildProfileCard` | Interface infantil simplificada | v2.0 |

### Delta UX de 18/04

| Componente / bloco | Uso | Prioridade |
|---|---|---|
| `SegmentBar` | Troca `Nível` por `Segmento` e suporta multissegmentos | Sprint 2.5 |
| `SynopsisBlock` | Dá contexto editorial no detalhe da coleção | Sprint 2 |
| `CollectionAssetGrid` | Renderiza apenas recursos com arquivo disponível | Sprint 2 |
| `ReaderModeSwitch` | Alterna entre modo visual e modo texto no leitor | v1.3 |
| `StructuredMaterialCard` | Exibe material com descrição, mídia e categoria | Sprint 2 |
| `CharacterProfileCard` | Sustenta a página de Personagens com mídia própria | Sprint 2.5 |

---

## 4A. Delta de Arquitetura de Dados

O rollout correto para o delta é **aditivo**, com um modelo canônico novo e projeções legadas temporárias, não um rename destrutivo.

| Entidade / camada | Papel no delta |
|---|---|
| `segments` + `collection_segments` | Substituem semanticamente `level` e habilitam multissegmentos |
| `collection_assets` | Unificam vídeos, PDFs, orientações do professor e materiais extras com metadados ricos |
| `characters` + vínculos | Transformam personagens de tags livres em entidade própria reutilizável |
| `bncc_import_batches` + `bncc_skills` + vínculos | Estruturam a importação da planilha BNCC sem virar um CMS manual complexo |
| `voucher_redemptions` | Registram usuário, e-mail e data de ativação com rastreabilidade melhor que o `audit_log` genérico |

**Compatibilidade temporária obrigatória**:

- `collections.level` deve continuar existindo por um ciclo como projeção legada do segmento principal.
- `pdf_url`, `audio_url`, `video_url` e `extra_materials` devem continuar expostos enquanto a UI migra para ativos tipados.
- `bncc_skills` e `characters` em arrays antigos só podem sair depois do dual read completo.

---

## 5. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados BNCC incompletos | Alto | Extrair do doc oficial; fallback "Descrição não disponível" |
| Conta Empatia demora nas lojas | Alto (bloqueia v1.3) | Iniciar registro semana de 21/04; não bloqueia v1.2 |
| Fabio como gargalo único | Crítico | Sprint 1 só com itens P/M; nenhum G em paralelo |
| Tooltip em mobile sem hover | Médio | Tap-to-reveal com bottom sheet |
| Grid com 5 botões (ímpar) | Baixo | `col-span-2` no último item |
| Escopo creep (academia, gamificação) | Médio | Tudo v2.0; promoção precisa de aprovação explícita |
| Rename superficial de `nível` para `segmento` | Alto | Fechar taxonomia e multissegmentos antes de trocar o modelo de dados |
| Exportação XLSX divergente do CSV | Médio | Manter CSV como formato canônico de auditoria e XLSX como derivação |
| Modo texto do leitor sem fonte textual confiável | Alto | Não extrair texto automaticamente sem critério; definir fonte editorial e fallback |

---

## 6. Anti-Requisitos (Escopo Negativo)

| # | Regra | Citação Reginaldo |
|---|---|---|
| AS-001 | NÃO jogos/games | "Não quero misturar jogo na central coruja" |
| AS-002 | NÃO turmas/escola/aluno | "Não é ter um cadastro de turma, de aluno" |
| AS-003 | NÃO misturar banco com Educa Cross | "Servidor, banco de dados, etc. Separado" |
| AS-004 | NÃO backoffice complexo para BNCC | "Não viu complexidade no backoffice" (lookup estático) |
| AS-005 | NÃO audiodescrição por página como "Ouvir" | "O ouvir é diferente. O Educa Cross é audiodescrição" |
| AS-006 | NÃO labels genéricos | "A gente pode mudar esses nomes para ficar com mais cara" |

---

## 7. Métricas de Definição de Versão

| Versão | Definição |
|---|---|
| **v1.2** | Vitrine completa: labels, tooltips, kit vs livro, filtros, novos botões de mídia. Demo via GitHub Pages + mock. |
| **v1.3** | Produção real: backend Supabase validado, campos persistidos, CPF, app nas lojas, conta Empatia. |
| **v2.0** | Expansão: pelo menos 1 módulo de academia OU gamificação OU perfil infantil. OAuth Educa Cross. |

---

## 8. Glossário Operacional de Produto e UI

### 8.1 Camada de produto

| Termo | Significado | Uso recomendado |
|---|---|---|
| Livro | Item avulso, centrado na leitura | Usar quando a experiência principal for o conteúdo editorial único |
| Kit | Pacote multimodal com livro e outros recursos | Usar quando houver composição de mídias e materiais além do livro |
| Coleção | Unidade de catálogo usada para descoberta e navegação | Usar como contêiner de vitrine e agrupamento, não como rótulo principal do formato |
| Recurso | Cada modo de consumo dentro do item | Usar para leitura, contação, vídeo, Libras, desenho animado e materiais |

### 8.2 Regra de UX

1. A vitrine descobre por coleção, mas rotula por tipo real de experiência.
2. O usuário final deve enxergar primeiro se aquilo é **Kit** ou **Livro**.
3. O termo coleção fica reservado para navegação, catálogo e contexto administrativo.
4. A interface não deve depender só da capa para comunicar formato.

### 8.3 Tradução em interface

| Superfície | Regra |
|---|---|
| Card da home | Exibir badge de tipo, capa condicional e evitar que a palavra coleção seja a única pista de formato |
| Hero do detalhe | Repetir o badge e a lógica de tipo logo no topo |
| Grid de recursos | Se for kit, mostrar composição multimodal; se for livro, manter foco na leitura e nos recursos realmente existentes |
| Copy dos botões | Preferir labels descritivos, como Ler o Livro, Contação da História e Assistir com Libras |
| CMS admin | Tornar explícito o tipo do item e o preview correspondente para evitar cadastro ambíguo |

### 8.4 Frase-guia para decisão futura

**Coleção é o contêiner de descoberta. Kit e livro são os formatos que a UI precisa comunicar.**

---

## Documentos detalhados gerados

| Documento | Agente | Conteúdo |
|---|---|---|
| [backlog-central-coruja-15abr2026.md](backlog-central-coruja-15abr2026.md) | PO (Pax) | 35 user stories + 6 anti-stories + 4 arch requirements |
| [ux-report-reuniao-15abr2026.md](ux-report-reuniao-15abr2026.md) | UX (Uma) | 6 telas impactadas, 7 componentes, 4 fluxos, 3 riscos UX |
| [roadmap-central-coruja-v1.2.md](roadmap-central-coruja-v1.2.md) | PM (Bob) | 4 fases, sprints detalhadas, métricas, riscos |
| *(inline acima)* | Analyst (Atlas) | 25 requisitos × status × esforço × prioridade |

**Atualização 18/04**: o backlog e o roadmap acima já foram complementados com o delta posterior do usuário, incluindo DELTA-US-001 a DELTA-US-003, revisão de vouchers, taxonomia editorial e arquitetura de dados.

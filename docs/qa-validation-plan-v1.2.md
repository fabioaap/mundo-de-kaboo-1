# Plano de Validacao QA — Mundo de Kaboo v1.2

> Ultima atualizacao: 20/04/2026
> Base de escopo: docs/STATUS-FEATURES.md + docs/roadmap-central-coruja-v1.2.md
> Objetivo: validar se tudo que esta marcado como entregue em v1.2 esta correto e se os itens parciais nao quebram a experiencia.

---

## 1. Objetivo da rodada

Esta rodada de QA existe para responder quatro perguntas:

1. As features entregues em v1.2 funcionam como esperado nos fluxos principais?
2. Existe regressao entre home, detalhe, auth, CMS e personagens?
3. Os itens parciais estao com fallback seguro, sem quebrar a UX?
4. O produto esta apto para demonstracao controlada e para continuar rumo ao v1.3?

---

## 2. Escopo oficial

### Em escopo

- Auth e acesso com voucher
- Catalogo e vitrine
- Detalhe da colecao e leitores
- Descoberta na Home
- Personagens
- CMS Admin
- Infra funcional de demonstracao

### Fora de escopo desta rodada

- Funcionalidades marcadas como pendentes em v1.3
- Funcionalidades de v2.0
- Publicacao em lojas
- Integracoes externas ainda nao liberadas para producao

---

## 3. Estrategia de execucao com @qa

### Fase 1 — Quick QA

Objetivo: detectar apenas bugs criticos e altos.

- Login e cadastro
- Resgate e renovacao de voucher
- Home com busca, filtros e BNCC mobile
- Abertura de colecao e detalhe
- Leitor PDF e modo texto
- Fluxos centrais de CMS

### Fase 2 — Standard QA

Objetivo: validar regressao funcional completa do que esta entregue.

- Reexecutar tudo da fase Quick
- Adicionar cenarios alternativos, estados vazios e combinacoes de filtros
- Validar personagens, tooltips, exportacoes e exclusoes
- Validar comportamento responsivo basico

### Fase 3 — Revalidacao

Objetivo: confirmar correcao apos ajustes.

- Reexecutar os casos impactados por cada fix
- Reexecutar sempre a smoke suite critica

---

## 4. Criterios de entrada

Antes de rodar a rodada, confirmar:

1. Build de producao passando.
2. Ambiente local acessivel.
3. Dados mock ou remotos carregando sem erro fatal.
4. Escopo congelado para a rodada.
5. Fonte de verdade do status atualizada em docs/STATUS-FEATURES.md.

---

## 5. Criterios de saida

A rodada so pode ser considerada aprovada se:

1. Nao houver bug critico aberto.
2. Nao houver bug alto aberto nos fluxos de login, voucher, home, detalhe ou CMS.
3. Todos os testes da smoke suite estiverem aprovados.
4. Todo bug medio aceito tiver decisao explicita de risco.
5. O relatorio final indicar status aprovado, aprovado com ressalvas ou reprovado.

---

## 6. Matriz de ambientes

### Ambiente principal

- App web local demonstravel
- Navegacao pela propria UI, nao por hash isolado
- Dados mock como baseline confiavel

### Cobertura minima de viewport

- Mobile pequeno: 320px
- Mobile comum: 375px
- Tablet: 768px
- Desktop: 1024px ou superior

---

## 7. Smoke suite critica

Executar em toda rodada e em toda revalidacao.

| ID | Caso | Resultado esperado |
|----|------|--------------------|
| SMK-01 | Login com usuario valido | Usuario entra sem erro e vai para a tela correta |
| SMK-02 | Cadastro com voucher valido | Conta criada e acesso concedido conforme fluxo |
| SMK-03 | Voucher expirado ou invalido | Mensagem clara, sem quebrar a jornada |
| SMK-04 | Home abre com grade e filtros | Cards carregam e filtros nao quebram layout |
| SMK-05 | Busca textual na Home | Overlay abre, resultados aparecem e fechamento funciona |
| SMK-06 | Filtro puro na Home | Grade filtrada aparece sem card flutuante indevido |
| SMK-07 | BNCC mobile | Sheet abre, filtros funcionam em conjunto e lista atualiza |
| SMK-08 | Abrir detalhe de colecao | Dados, CTAs e metadata aparecem corretamente |
| SMK-09 | Leitor PDF | Abre sem erro fatal e permite leitura |
| SMK-10 | CMS de colecoes | Listar, editar e salvar sem erro fatal |
| SMK-11 | CMS de vouchers | Subabas carregam e acoes principais funcionam |
| SMK-12 | Gestao de usuarios | Convite e exclusao funcionam no fluxo esperado |

---

## 8. Suites por dominio

## 8.1 Auth e acesso

### Casos obrigatorios

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| AUTH-01 | Login com credenciais validas | Alta | Pendente |
| AUTH-02 | Login com senha invalida | Alta | Pendente |
| AUTH-03 | Cadastro com voucher valido | Alta | Pendente |
| AUTH-04 | Cadastro com voucher usado | Alta | Pendente |
| AUTH-05 | Cadastro com voucher expirado | Alta | Pendente |
| AUTH-06 | Logout e retorno a tela inicial | Alta | Pendente |
| AUTH-07 | Renovacao de acesso na tela de expiracao | Alta | Pendente |

### Pontos de observacao

- Mensagens claras de erro
- Persistencia de sessao
- Regras corretas para viewer versus admin/editor

## 8.2 Home e descoberta

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| HOME-01 | Abertura da Home com grade inicial | Alta | Pendente |
| HOME-02 | Busca textual com overlay | Alta | Pendente |
| HOME-03 | Fechar busca e retornar ao estado base | Alta | Pendente |
| HOME-04 | Filtro por ano escolar | Alta | Pendente |
| HOME-05 | Filtro por personagem com avatar | Alta | Pendente |
| HOME-06 | Filtro puro sem texto | Alta | Pendente |
| HOME-07 | BNCC mobile por etapa | Alta | Pendente |
| HOME-08 | BNCC mobile por componente | Alta | Pendente |
| HOME-09 | BNCC mobile por faixa | Alta | Pendente |
| HOME-10 | BNCC mobile com filtros combinados | Alta | Pendente |
| HOME-11 | Limpeza de filtros e restauracao da grade | Media | Pendente |

### Pontos de observacao

- Overlay so para busca textual
- Grade direta para filtro puro
- Nenhum estado vazio quebrado
- Performance perceptiva aceitavel

## 8.3 Catalogo e vitrine

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| CAT-01 | Renderizar 16 colecoes com cover | Alta | Pendente |
| CAT-02 | Exibir badge kit versus livro | Alta | Pendente |
| CAT-03 | Mostrar segmento editorial | Media | Pendente |
| CAT-04 | Mostrar sinopse correta | Media | Pendente |
| CAT-05 | Ordenacao por ano escolar | Media | Pendente |

## 8.4 Detalhe da colecao e leitores

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| DET-01 | Abrir detalhe com metadata completa | Alta | Pendente |
| DET-02 | Renderizar CTAs tipados corretos | Alta | Pendente |
| DET-03 | Tooltip BNCC rico | Alta | Pendente |
| DET-04 | Tooltip CASEL rico | Media | Pendente |
| DET-05 | Leitor PDF abre corretamente | Alta | Pendente |
| DET-06 | Modo texto acessivel funciona | Alta | Pendente |
| DET-07 | Materiais da colecao aparecem estruturados | Media | Pendente |

### Itens parciais a validar sem bloquear demo

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| DET-P01 | Sem arquivo de Libras, UX nao quebra | Alta | Pendente |
| DET-P02 | Sem arquivo animado, UX nao quebra | Alta | Pendente |

## 8.5 Personagens

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| CHAR-01 | Tela publica de personagens carrega | Media | Pendente |
| CHAR-02 | CRUD admin de personagem | Alta | Pendente |
| CHAR-03 | Alias preservado apos rename | Alta | Pendente |
| CHAR-04 | Imagem ausente mostra placeholder correto | Media | Pendente |
| CHAR-05 | Vínculo de personagem reflete nas colecoes | Alta | Pendente |

## 8.6 CMS Admin

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| CMS-01 | CRUD de colecoes | Alta | Pendente |
| CMS-02 | Exclusao de colecao limpa o estado local | Alta | Pendente |
| CMS-03 | Aba modelos de vouchers | Alta | Pendente |
| CMS-04 | Aba lotes de vouchers | Alta | Pendente |
| CMS-05 | Aba codigos de vouchers | Alta | Pendente |
| CMS-06 | Aba auditoria | Media | Pendente |
| CMS-07 | Exportacao XLSX | Alta | Pendente |
| CMS-08 | Gestao de usuarios, convite | Alta | Pendente |
| CMS-09 | Gestao de usuarios, exclusao | Alta | Pendente |

## 8.7 Infra e robustez

| ID | Caso | Prioridade | Status |
|----|------|------------|--------|
| INF-01 | Build de producao passa | Alta | Pendente |
| INF-02 | Sem tela branca nas rotas principais | Alta | Pendente |
| INF-03 | Erro de rede ou dado ausente nao derruba a UI | Media | Pendente |
| INF-04 | Persistencia remota essencial nao quebra no fluxo ja entregue | Media | Pendente |

---

## 9. Cobertura nao funcional

### Acessibilidade basica

- Ordem de foco coerente
- Navegacao por teclado nos fluxos principais
- Tooltips e controles acionaveis com semantica minima
- Contraste suficiente em CTAs e estados de erro

### Responsividade

- Home
- Detalhe
- BNCC mobile sheet
- CMS em viewport menor

### Estabilidade

- Nao travar em reload
- Nao perder estado essencial ao voltar da navegacao
- Nao apresentar erro fatal em console como criterio de bloqueio

---

## 10. Severidade de bugs

| Severidade | Definicao | Exemplo |
|-----------|-----------|---------|
| Critico | Impede uso do produto ou quebra fluxo principal sem contorno | Nao consegue logar, home nao abre, erro fatal no detalhe |
| Alto | Fluxo principal funciona parcialmente, mas com grande impacto | Voucher nao renova, CMS nao salva, filtros BNCC nao filtram |
| Medio | Problema relevante com contorno simples | Estado vazio incorreto, tooltip inconsistente, layout ruim em tablet |
| Baixo | Cosmetic ou detalhe de polimento | Texto truncado, espacamento, copy menor |

---

## 11. Evidencias obrigatorias

Para cada bug encontrado, registrar:

1. ID do caso de teste
2. Ambiente
3. Passos para reproduzir
4. Resultado esperado
5. Resultado atual
6. Severidade
7. Captura de tela ou video curto

### Template de registro

| Campo | Conteudo |
|------|----------|
| Caso | EXEMPLO-01 |
| Ambiente | Local mock |
| Passos | 1. Abrir Home 2. Buscar termo 3. Aplicar filtro |
| Esperado | Lista filtrada sem quebrar overlay |
| Atual | Overlay fecha sozinho ao aplicar filtro |
| Severidade | Alta |
| Evidencia | Inserir link ou captura |

---

## 12. Relatorio final da rodada

O relatorio final deve sair neste formato:

### Resumo executivo

- Status: aprovado, aprovado com ressalvas, ou reprovado
- Total de casos executados
- Total de bugs por severidade
- Recomendacao de proxima acao

### Tabela de bugs

| ID | Titulo | Severidade | Status | Dominio |
|----|--------|------------|--------|---------|

### Fechamento

- Riscos aceitos para demonstracao
- Pendencias bloqueadoras para v1.3
- Recomendacao de nova rodada, se necessaria

---

## 13. Ordem recomendada de execucao

1. Auth e vouchers
2. Home e descoberta
3. Catalogo e detalhe
4. Leitores e materiais
5. Personagens
6. CMS Admin
7. Regressao rapida final

---

## 14. Prompt operacional para usar com @qa

Use este prompt base para disparar a rodada:

```text
@qa Rode uma validacao Standard no Mundo de Kaboo v1.2 com foco nas features marcadas como entregues em docs/STATUS-FEATURES.md. Priorize fluxos criticos de auth, voucher, home, detalhe de colecao, BNCC mobile, CMS de colecoes, CMS de vouchers, gestao de usuarios e personagens. Classifique bugs por severidade, registre evidencias e entregue um parecer final de release para demonstracao.
```

Se a rodada voltar com bugs, usar na revalidacao:

```text
@qa Revalide os bugs corrigidos e reexecute a smoke suite critica do plano em docs/qa-validation-plan-v1.2.md. Confirme o que foi resolvido, o que persiste e o risco residual para demonstracao.
```

---

## 15. Fonte de verdade desta rodada

- Status de features: docs/STATUS-FEATURES.md
- Roadmap: docs/roadmap-central-coruja-v1.2.md
- Plano de QA: docs/qa-validation-plan-v1.2.md

Este documento nao substitui o status de produto. Ele operacionaliza a validacao do que ja foi considerado implementado.
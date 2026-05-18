# Handoff Executivo - 1 Pagina - Board / CEO

Data de corte: 16/05/2026  
Documento-base: [handoff completo](./handoff-evolucao-produto-2026-05.md)

## Headline

**Voucher e Kaboo vieram antes. Central Coruja veio depois como camada de escala.**

O historico do git mostra uma sequencia mais precisa: houve uma fundacao tecnica do Kaboo no inicio do projeto, depois a primeira frente funcional relevante foi voucher e acesso, em seguida veio o amadurecimento do Kaboo e do catalogo, e so depois entrou Central Coruja como white-label e camada de operacao por marca. Hoje o produto sustenta demo, onboarding editorial e piloto controlado, mas ainda depende de catalogo real, backend homologado, operacao de vouchers com grafica e caminho de publicacao em lojas para ser tratado como producao real.

## Leitura rapida

| Frente | Status | Leitura executiva |
| --- | --- | --- |
| v1.2 local demonstravel | 100% | Vitrine, busca, taxonomia, consumo multimidia e admin local/mock estao fechados |
| QA e separacao por marca | 90% | Controle de acesso, ciclo de conteudo e isolamento Kaboo x Central Coruja foram validados; falta fechar hubs com catalogo real |
| v1.3 producao real | 20% | Shell tecnico existe, mas operacao real ainda nao foi homologada |
| v2.0 expansao | 0% | Academia, gamificacao, perfil infantil e OAuth seguem fora do rollout atual |

## De onde saimos

O historico visivel no git organiza a origem em quatro camadas:

- **Fundacao tecnica do Kaboo em janeiro**: leitor, home, navegacao, cards, responsividade, admin e estrutura-base do produto.
- **Frente voucher em 08-10/04**: voucher-only access, duas rotas de login, login com voucher, lead capture e jornadas completas de acesso.
- **Evolucao do Kaboo e do catalogo em 16/04**: design system, catalogo v2 e adaptacao das superficies para contrato canonico.
- **Central Coruja e white-label a partir de 21/04**: roadmap proprio, baseline de brand config, runtime branding, redesign white-label e depois hardening em maio.

Ou seja: Central Coruja nao e o ponto de partida tecnico do projeto. Ela e a camada posterior de organizacao, escala e operacao por marca em cima da base Kaboo e da frente de vouchers.

## O que foi entregue

- Shell white-label por marca com branding, menu e feature flags.
- Jornadas de autenticacao, voucher e acesso expirado.
- Catalogo multimidia consumivel com leitura, audio, video e materiais.
- CMS editorial com ativos tipados, segmentacao, sinopse e biblioteca estruturada.
- Busca e filtros com BNCC, CASEL e descoberta pedagogica local.
- Pagina de personagens e hubs publicos por tipo de conteudo.
- QA de acesso por papel, sincronizacao admin-publico e separacao de catalogo por marca.
- Hardening recente de plataforma: health check white-label, cache seletivo e offline real no codigo para conteudo interno.

## Epicos x backlog

Para leitura executiva, usar esta regra simples:

- **Epico** = frente macro de produto.
- **Backlog** = entregas pendentes dentro de cada epico.

| Epico | Backlog principal ainda aberto |
| --- | --- |
| White-label e isolamento por marca | homologar backend real e storage por marca |
| Vouchers e operacao grafica | rodar piloto real com grafica e validar ponta a ponta |
| Auth e jornadas de acesso | CPF opcional e integracoes futuras |
| Catalogo multimidia consumivel | persistencia real de campos e rollout consistente |
| CMS editorial e ativos tipados | inserir catalogo real minimo da Central Coruja |
| Busca, filtros e taxonomias | consolidar afuniladores e taxonomia em backend real |
| Personagens | inserir personagens reais da marca e validar descoberta |
| Materiais e biblioteca estruturada | popular materiais reais e persistir escopos no backend |
| Formacoes e hubs publicos | fechar validacao visual final com catalogo real |
| Offline e hardening | homologar rollout real e processo operacional |

## O que ainda nao esta pronto para chamar de producao

- Catalogo real da Central Coruja ainda nao foi inserido e validado ponta a ponta.
- Hubs de videos e formacoes ainda precisam de validacao visual final com dados reais.
- Backend real e storage por marca ainda precisam ser homologados fora do mock/local.
- Fluxo operacional de vouchers com grafica esta muito bem desenhado, mas nao comprovado em operacao live.
- Publicacao em lojas ainda depende de decisao e execucao sobre conta Empatia, build e submissao.

## Riscos executivos

| Risco | Impacto | Decisao / owner sugerido |
| --- | --- | --- |
| Confundir demo com producao | Alto | Board e Produto devem comunicar o triplo: demonstravel, operavel, publicado |
| Catalogo real ainda ausente | Alto | Fabio Alves + editorial precisam carregar um minimo viavel real da Central Coruja |
| Backend real por marca nao homologado | Alto | Maxwell Cortez precisa fechar staging/real com storage e isolamento |
| Grafica nao rodada ponta a ponta | Alto | Fabio Alves + operacao devem executar lote piloto com comprovacao de envio e resgate |
| Lojas e conta Empatia indefinidas | Alto | Douglas Rossato + Rafael Fujii + Maxwell Cortez precisam fechar caminho de publicacao |

## Recomendacao executiva

A recomendacao e tratar a Central Coruja neste momento como:

- **pronta para demo e piloto controlado**;
- **nao pronta para producao publicada**;
- **com v1.3 devendo focar em operacao real, nao em novas telas**.

A decisao mais valiosa agora nao e expandir escopo. E fechar os gates que transformam a base atual em produto operavel.

## Proximos 30/60/90 dias

### 30 dias

- Inserir catalogo real minimo da Central Coruja via admin.
- Fechar a validacao visual final de videos e formacoes.
- Travar o escopo formal de v1.3.
- Homologar ambiente real ou staging por marca.
- Fechar estrategia de lojas e conta Empatia.

### 60 dias

- Rodar fluxo real ponta a ponta: cadastro, voucher, acesso e consumo fora do mock.
- Validar operacao editorial real com ativos e colecoes da marca.
- Controlar rollout de offline apenas para conteudo interno elegivel.
- Fechar release candidate sem caveats de bloqueio.

### 90 dias

- Executar piloto controlado de producao real.
- Rodar lote real de vouchers com grafica e resgate sem ruptura.
- Fazer decisao de go/no-go para expansao v2.0.

## Mensagem final para Board

O projeto evoluiu bem onde mais importava no curto prazo: clareza de tese, base white-label, experiencia demonstravel, admin editorial e reducao de risco tecnico. O trabalho restante agora e menos sobre produto conceitual e mais sobre operacionalizacao real. O proximo marco relevante nao e "mais uma feature". E provar que a Central Coruja roda com dados reais, operacao real e distribuicao real.

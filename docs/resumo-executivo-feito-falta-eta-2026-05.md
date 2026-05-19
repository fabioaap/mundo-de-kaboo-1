# Resumo Executivo - Feito, Falta e ETA

Data de corte: 16/05/2026  
Base: [handoff 1 pagina](./handoff-board-ceo-1pagina-2026-05.md) e [handoff completo](./handoff-evolucao-produto-2026-05.md)

## Resposta curta

### O que fizemos desde o comeco do projeto

O historico do git mostra uma sequencia mais precisa de evolucao:

1. **Fundacao tecnica do Kaboo em janeiro**  
  Leitor, home, navegacao, cards, responsividade, admin e base da experiencia.

2. **Voucher e acesso em 08-10/04**  
  Voucher-only access, login com duas rotas, CTA para usuarios sem voucher, fluxo code-first e jornadas documentadas.

3. **Kaboo e catalogo v2 em 16/04**  
  Design system, contrato canonico do catalogo e atualizacao das superficies existentes.

4. **Central Coruja e white-label a partir de 21/04**  
  Roadmap, docs dedicadas, admin white-label, branding runtime, redesign por marca e depois QA/hardening em maio.

Em resumo: a base do produto nao nasceu na Central Coruja. Primeiro vieram a base do Kaboo e a frente de voucher. Depois o Kaboo amadureceu. So depois a Central Coruja entrou como camada white-label de escala.

Essa evolucao virou uma base funcional do produto com:

- identidade de marca por white-label;
- jornada de login, voucher e acesso expirado;
- catalogo consumivel com leitura, audio, video e materiais;
- CMS editorial para colecoes, personagens e ativos de midia;
- busca, filtros e camada pedagogica com BNCC e CASEL;
- separacao de catalogo entre Kaboo e Central Coruja;
- hardening recente de plataforma com feature flags, health check por marca e base de offline.

### O que foi entregue ate agora

- **v1.2 local demonstravel: 100%**  
  Vitrine, navegacao, consumo multimidia, CMS local/mock, badges kit/livro, BNCC, CASEL, busca e filtros estao entregues para demo.

- **QA e separacao por marca: 90%**  
  Controle de acesso por papel, ciclo de vida de conteudo, sincronizacao admin-publico e isolamento Kaboo x Central Coruja estao entregues. O caveat restante e validar os hubs de videos e formacoes com catalogo real da Central Coruja.

- **v1.3 producao real: 20%**  
  A casca tecnica existe, mas ainda faltam ambiente real, catalogo real, homologacao de storage/dados por marca, operacao real de vouchers com grafica e caminho de lojas.

- **v2.0 expansao: 0%**  
  Academia, gamificacao, perfil infantil e OAuth continuam como backlog futuro.

### O que falta entregar com base no roadmap

Falta fechar quatro blocos:

1. **Operacao real da v1.3**  
   Catalogo real da Central Coruja, QA visual final, backend/staging por marca, vouchers ponta a ponta e publicacao.

2. **Distribuicao**  
   Conta Empatia, build nativo e submissao em lojas.

3. **Homologacao da camada recente de hardening**  
   Offline, feature flags e health checks precisam sair do nivel tecnico e virar processo validado.

4. **v2.0 expansao**  
   Academia, gamificacao, perfil infantil e OAuth.

## O que e epico e o que e backlog

Para ficar visivel e sem misturar nivel de detalhe:

- **Epico** = a frente macro de produto.
- **Backlog** = a lista de entregas que ainda faltam dentro daquele epico.

### Epicos do projeto

1. White-label e isolamento de marca.
2. Vouchers e operacao grafica.
3. Auth e jornadas de acesso.
4. Catalogo multimidia consumivel.
5. CMS editorial e ativos tipados.
6. Busca, filtros e taxonomias pedagogicas.
7. Personagens.
8. Materiais e biblioteca estruturada.
9. Formacoes e hubs publicos.
10. Offline e hardening de plataforma.

### Backlog principal ainda aberto por epico

| Epico | Backlog aberto |
| --- | --- |
| White-label e isolamento de marca | homologar backend real e storage por marca |
| Vouchers e operacao grafica | piloto real com grafica, renovacao digital e operacao live |
| Auth e jornadas de acesso | CPF opcional e integracoes futuras |
| Catalogo multimidia consumivel | persistencia real dos campos novos e rollout com dados reais |
| CMS editorial e ativos tipados | inserir catalogo real minimo da Central Coruja |
| Busca, filtros e taxonomias pedagogicas | consolidar afuniladores e persistencia taxonomica em backend real |
| Personagens | inserir personagens reais da marca e validar descoberta |
| Materiais e biblioteca estruturada | popular materiais reais e persistir escopos |
| Formacoes e hubs publicos | fechar validacao visual final de videos e formacoes com catalogo real |
| Offline e hardening de plataforma | homologar rollout e operacao real do offline |

## ETA - estimativa de termino

### Algoritmo usado

Em vez de misturar tudo num numero so, separei em **dois trilhos independentes**:

$$
ETA_{v1.3} = \frac{esforco\ operacional\ restante}{velocidade\ operacional}
$$

$$
ETA_{v2.0} = \frac{esforco\ de\ expansao}{velocidade\ de\ expansao}
$$

Onde:

- **esforco operacional restante** = tudo que falta para transformar a base atual em operacao real;
- **esforco de expansao** = o que ainda nem entrou em rollout real e abre nova frente de produto;
- **velocidade operacional** = ritmo recente ajustado para entrega real, nao para volume bruto de commits;
- **velocidade de expansao** = ritmo mais conservador, porque v2.0 e menos acabamento e mais produto novo.

### Trilho 1 - ETA da v1.3 operacional

#### Blocos considerados

| Bloco v1.3 | Peso base | Restante | Fator de dependencia | Esforco restante |
| --- | --- | --- | --- | --- |
| Catalogo real + QA visual final | 1.0 | 100% | 1.2 | 1.2 |
| Backend real + storage por marca | 1.2 | 100% | 1.4 | 1.7 |
| Vouchers com grafica + distribuicao | 1.1 | 100% | 1.5 | 1.7 |
| Homologacao de hardening recente | 0.7 | 100% | 1.1 | 0.8 |
| **Total v1.3** | - | - | - | **5.4 unidades** |

#### Velocidade usada

- Historico visivel desde 01/04/2026: **136 commits**, media de **15.6 commits por semana**.
- Como parte grande de maio foi QA, hardening e polimento, a velocidade usada para v1.3 foi a de **fechamento operacional**, nao a de volume bruto.
- Velocidade calibrada para v1.3: **1.0 a 1.3 unidades por semana**.

#### Resultado

| Escopo | ETA estimada | Janela provavel |
| --- | --- | --- |
| Fechar v1.3 producao real | 4 a 6 semanas | metade de junho a fim de junho/2026 |

### Trilho 2 - ETA da v2.0 expansao

#### Blocos considerados

| Bloco v2.0 | Peso base | Restante | Fator de dependencia | Esforco restante |
| --- | --- | --- | --- | --- |
| Academia e formacoes estruturadas | 3.0 | 100% | 1.2 | 3.6 |
| Gamificacao adulto | 2.0 | 100% | 1.1 | 2.2 |
| Perfil infantil | 3.0 | 100% | 1.2 | 3.6 |
| OAuth Educa Cross | 1.5 | 100% | 1.3 | 2.0 |
| Integracao e estabilizacao de expansao | 1.5 | 100% | 1.1 | 1.7 |
| **Total v2.0** | - | - | - | **13.1 unidades** |

#### Velocidade usada

- Para v2.0 eu usei uma velocidade menor que a da v1.3, porque aqui o trabalho e de **produto novo**, nao de fechamento operacional.
- Velocidade calibrada para v2.0: **0.8 a 1.0 unidade por semana**, assumindo que essa frente anda depois do fechamento principal da v1.3.

#### Resultado

| Escopo | ETA estimada | Janela provavel |
| --- | --- | --- |
| Fechar v2.0 apos iniciar a expansao | 13 a 16 semanas adicionais | setembro a outubro/2026 |
| Fechar tudo desde hoje, contando v1.3 + v2.0 | 17 a 22 semanas | setembro a novembro/2026 |

## Leitura correta dessa ETA

Essa previsao so vale se:

- o escopo nao crescer;
- o catalogo real da Central Coruja entrar logo;
- backend, grafica e lojas nao virarem gargalo maior que o previsto;
- a equipe mantiver o ritmo atual.

Se houver travamento em **lojas**, **infra real** ou **operacao de vouchers com grafica**, a ETA da v1.3 sobe para algo entre **6 e 8 semanas**, e a ETA total ate v2.0 pode ir para **20 a 26 semanas**.

## Frase pronta para uso

**O historico mostra que a gente primeiro consolidou a base tecnica do Kaboo, depois fechou voucher e acesso, depois amadureceu Kaboo e catalogo, e so depois subiu Central Coruja e white-label. Hoje a gente ja tem 100% da v1.2 local, 90% da camada de QA e separacao por marca, e 20% da v1.3 real. O que falta agora e operacao real: catalogo proprio, backend homologado, vouchers com grafica e lojas. Mantido o ritmo atual, a v1.3 fecha em 4 a 6 semanas. A v2.0 eu trato separado, porque e expansao de produto, e ela levaria mais 13 a 16 semanas depois que essa operacao principal estiver fechada.**

## Fala pronta de reuniao

**Se eu resumir em fala: a gente nao comecou pela Central Coruja. A gente primeiro consolidou a base do Kaboo, depois entrou forte em voucher e acesso, amadureceu o catalogo, e so depois estruturou Central Coruja como white-label. Hoje o que esta pronto mesmo e a v1.2 local e a camada de QA por marca. O que falta agora nao e inventar muita tela nova, e fechar operacao real: catalogo proprio, backend, vouchers com grafica e lojas. Nesse ritmo, eu vejo a v1.3 fechando em 4 a 6 semanas. Ja a v2.0 eu nao misturo nessa conta, porque ela e expansao. Ela pediria mais 13 a 16 semanas adicionais depois que a v1.3 estiver redonda.**
# Checklist de Go-Live v1.3

> Última atualização: 18/05/2026
> Objetivo: definir o que precisa estar fechado para considerar a v1.3 pronta para produção.

## 1. Leitura executiva

Fechar este checklist significa que a fase atual pode ser tratada como pronta para produção.

Isso nao significa 100% do backlog total do produto. Itens como letra da musica, academia, gamificacao, perfil infantil e OAuth permanecem como backlog pos-MVP ou de expansao.

## 2. Critérios críticos que bloqueiam a liberação para produção

Os 9 itens abaixo são PRÉ-REQUISITOS OBRIGATÓRIOS. A v1.3 não sai pra produção enquanto qualquer um deles estiver aberto.

| Item | O que precisa estar fechado | Evidencia minima |
| --- | --- | --- |
| Catalogo real da Central Coruja | Pelo menos 3 colecoes reais, 2 personagens reais e 1 ativo por tipo cadastrados e visiveis na marca correta | Validacao em ambiente alvo e navegacao publica conferida |
| QA visual final dos hubs | Hubs de videos e formacoes da Central Coruja validados com conteudo real, incluindo thumbnails, titulos, descricoes, navegacao e estados vazios | Evidencia visual salva e checklist de QA concluido |
| Isolamento por marca homologado | Backend, staging e storage operando com separacao correta entre Kaboo e Central Coruja | Teste de escrita e leitura cruzada sem vazamento |
| Vouchers ponta a ponta | Geracao, distribuicao, resgate e operacao com grafica funcionando sem depender de mock | Execucao de fluxo real de ponta a ponta |
| Ambiente real pronto para operacao | Variaveis, autenticacao, permissoes, storage e rotinas minimas de suporte revisadas | Homologacao tecnica registrada |
| Distribuicao pronta | Conta Empatia, build nativo e caminho de publicacao em loja sem bloqueio operacional | Build gerado e checklist de submissao pronto |
| Hardening operacional aprovado | Offline, feature flags e health checks homologados como processo real, nao apenas como capacidade tecnica | Validacao operacional e runbook revisado |
| Gate tecnico final | Build de producao passando, smoke test final aprovado e nenhum bug critico ou alto aberto para o escopo da release | Build verde e evidencias de smoke |
| Aprovacao de go-live | Produto, operacao e tecnica concordam com a subida sem caveat aberto de producao | Registro explicito de aprovacao |

## 3. Pendencias abertas na data desta revisao

Na leitura consolidada dos documentos mais recentes, o que ainda aparece aberto para fechar a v1.3 real e:

1. Inserir catalogo real da Central Coruja.
2. Fechar QA visual final dos hubs de videos e formacoes com conteudo real.
3. Homologar backend, staging e storage por marca.
4. Validar vouchers ponta a ponta com grafica.
5. Fechar conta Empatia, build nativo e caminho de lojas.
6. Transformar offline, feature flags e health checks em processo homologado de operacao real.

## 4. O que fica fora deste gate

Os itens abaixo nao devem bloquear o go-live da v1.3, embora continuem no backlog do produto:

- Letra da musica.
- Academia.
- Gamificacao.
- Perfil infantil.
- OAuth.

## 5. Definicao pratica de pronto

A v1.3 pode ser chamada de pronta para producao quando:

1. Existe conteudo real suficiente da Central Coruja para validar a experiencia publica.
2. O comportamento publico dos hubs foi validado visualmente em browser real.
3. A infraestrutura real por marca foi homologada sem vazamento de dados.
4. O fluxo comercial e operacional de vouchers foi exercitado de ponta a ponta.
5. O pacote tecnico final passa em build, smoke e aprovacao conjunta de produto, operacao e tecnologia.

## 6. Fontes de referencia

- Resumo executivo: feito, falta e ETA (`resumo-executivo-feito-falta-eta-2026-05.md`, na raiz da pasta `docs/`)
- Handoff de evolucao do produto (`handoff-evolucao-produto-2026-05.md`, na raiz da pasta `docs/`)
- [Backlog Central Coruja 15/04/2026](./backlog-central-coruja-15abr2026)

Esta pagina deve ser atualizada sempre que uma pendencia de go-live mudar de status ou quando algum item deixar de bloquear a release.
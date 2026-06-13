# Backlog — Cadastro de conteúdo em lote (carga inicial em massa)

> Data: 12/06/2026
> Escopo: importação em massa de livros/coleções (PDF + metadados + capa) por fora da UI
> Tipo: backlog (diferido) — não implementar durante a validação do MVP
> Status: 📋 Planejado / em backlog

---

## 1. Contexto

Hoje o cadastro de livro é feito **pela UI do produto** (Coleções/Livros → criar → upload do
PDF), agora com automações que aceleram o fluxo:

- auto-preenchimento de **título** e **nível** pelo nome do arquivo;
- **capa automática** gerada da 1ª página do PDF (`lib/pdfCover.ts`);
- **"Sugerir com IA"** para a sinopse (integração de IA do White Label).

Para a operação normal, esse fluxo de UI é suficiente. Este backlog cobre apenas o cenário de
**carga inicial em massa** (ex.: subir os 16 livros do acervo Kaboo de uma vez, sem abrir a UI
16 vezes), que é tarefa pontual de operação/admin — não faz parte do produto.

## 2. Proposta (quando sair do backlog)

Script de linha de comando `scripts/import-books-to-prod.mjs` (service-role via `.env.local`):

1. Renderiza a capa da pág.1 de cada PDF (Node: `pdfjs-dist` + `@napi-rs/canvas`).
2. Sobe PDF + capa ao bucket `collections` (espelhando o naming de `lib/storage.ts`).
3. Monta o payload a partir do registro curado do seed (`data/catalog.seed.json`): mantém
   tema/objetivos/BNCC/CASEL/personagens/faixa etária; define `brand_id` = Kaboo, UUID novo,
   `pdf_url` = URL nova; remove URLs mortas. O app deriva o asset de leitura de `pdf_url` via
   `inferCollectionAssets` (`lib/collectionAssets.ts`).
4. Insere a coleção.

**Segurança:** dry-run por padrão (só grava com `--commit`); guarda anti-duplicata (`--force`);
`--publish` opcional; assert de marca (só Kaboo, nunca Central Coruja). Mapa explícito
título→arquivo (nomes EI são CamelCase).

**Dependência:** `@napi-rs/canvas` (devDependency, binários pré-compilados; só para o script).
Alternativa sem a dep: pular a capa no script (preenchida depois via a capa automática da UI).

## 3. Por que está no backlog

- É operação pontual (carga inicial), não fluxo recorrente do produto.
- Escreve direto em storage + banco de produção, por fora da UI/validações do app.
- Adiciona dependência nativa só para um utilitário de migração.

Decisão (12/06/2026): **focar no cadastro pela UI agora**; revisitar a carga em lote se/quando
houver um acervo grande para importar de uma vez.

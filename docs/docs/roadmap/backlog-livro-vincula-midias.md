# Backlog — Livro vincula mídias cadastradas (modelo da Coleção)

> Data: 13/06/2026
> Escopo: cadastro de livro passa a **vincular** áudios/vídeos/materiais já cadastrados (biblioteca), em vez de upload inline com toggle de publicação por mídia
> Tipo: mudança estrutural (diferida) — **não implementar durante a validação do MVP**
> Status: 📋 Planejado / em backlog

---

## 1. Problema (o que motivou)

Hoje o drawer de cadastro de **livro** faz **upload inline** de PDF/Áudio/Vídeo, e cada mídia
primária ganha seu **próprio toggle de publicação** dentro do drawer (ex.: "Publicar audiolivro").
Isso coloca **dois toggles parecidos** na mesma tela:

- **"Publicar audiolivro"** (nível do *asset*) — controla **só o áudio** na vitrine.
- **"Status de publicação"** (nível do *livro*) — controla **o livro** na vitrine.

Ambos exibem o mesmo texto auxiliar (*"Visível na vitrine pública / Rascunho — apenas no admin"*)
e, depois que a seção **Conteúdo** foi reordenada pra cima, o do áudio aparece **primeiro**.
Resultado: é fácil ligar/desligar o do **áudio** achando que está publicando/despublicando o
**livro** — o livro fica preso no estado errado, sem erro aparente. (Incidente real em 13/06/2026.)

## 2. Direção adotada — livro = vincula assets, como a Coleção

O livro deve seguir o **mesmo modelo da Coleção**: em vez de subir arquivo inline, o cadastro
**puxa conteúdos já cadastrados** (áudios, vídeos, materiais) da **Biblioteca de Mídias**, do
mesmo jeito que a coleção vincula na aba "Mídias vinculadas".

Consequências:

- O toggle **"Publicar audiolivro" sai do drawer do livro**. A publicação de cada mídia passa a
  ser gerida **no módulo dela** (Áudios / Vídeos / Materiais), onde o asset vive.
- O drawer do livro fica com **um único** controle de publicação: **"Status de publicação" do livro**.
- Conteúdo é cadastrado **uma vez** e reaproveitado em vários livros/coleções (sem reupload, sem
  título/descrição divergentes).
- Livro e coleção passam a funcionar **igual** (menos código duplicado, menos surpresa de UX).

## 3. Dependência — fundação canônica de mídia

Esta mudança **depende** (ou se beneficia muito) da
[Identidade Canônica de Mídia (`media_assets`)](./backlog-midia-canonica): a "Biblioteca de Mídias"
que o picker do livro consumiria é exatamente a `AdminMediaLibraryScreen` +
`media_assets` / `collection_media_assets` descritos lá. Sem ela, dá pra fazer um picker que lista
assets existentes por URL, mas herda os problemas de dedup/título já mapeados.

**Ordem sugerida:** (1) backbone canônico de mídia → (2) picker de mídia no livro + remoção do
upload inline e do toggle de publicação por asset.

## 4. Impacto (alto nível)

- **UI:** `AdminCollectionsScreen` (modo livro) — substituir os `FileUpload` inline + toggle de
  asset por um **picker da biblioteca**; manter só "Status de publicação" do livro. Reaproveitar o
  picker que a coleção já usa.
- **Dados:** vínculo livro→mídia passa a ser relacional (ou segue na projeção `collection_assets`
  como cache, conforme a fundação canônica). A publicação do asset migra pro asset/módulo.
- **Fluxo:** cadastrar o livro pressupõe que a mídia **já exista**; senão, o admin cadastra antes em
  Áudios/Vídeos/Materiais. (Decidir se o drawer oferece um atalho "cadastrar nova mídia" que cria o
  asset e já vincula.)
- **Migração:** livros atuais com mídia inline precisam ter os assets "promovidos" pra biblioteca —
  casa com o backfill da fundação canônica.

## 5. Mitigação interina (MVP, sem refatorar)

Enquanto não sai do backlog, dá pra reduzir a confusão **só com rótulo/UX** (não estrutural):

- Renomear os toggles: **"Publicar áudio na vitrine"** (asset) vs **"Status de publicação do livro"**
  (livro).
- Dar destaque visual diferente e/ou mover o "Status de publicação do livro" pro **topo** do drawer.

## 6. Itens relacionados

- [Identidade Canônica de Mídia (`media_assets`)](./backlog-midia-canonica) — fundação.
- [Regra de Negócio — Coleção × Artefatos](../architecture/colecao-artefatos) — modelo que o livro vai espelhar.
- [Backlog — Capa por Mídia](./backlog-capa-por-midia) — mesmo princípio de desacoplar atributos da mídia × coleção.

## 7. Pré-condições para sair do backlog

- MVP estabilizado e jornadas validadas.
- Fundação canônica de mídia (`media_assets`) decidida/entregue.
- Aprovação explícita (mexe no fluxo de cadastro em produção das **duas marcas**).

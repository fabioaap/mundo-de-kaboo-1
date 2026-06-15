# Checklist & Estrutura — Catálogo Real da Central Coruja

> Gate P0 de go-live: **"Catálogo real da Central Coruja (≥3 coleções, 2 personagens, 1 ativo por tipo, visíveis)"**.
> Auditoria do estado atual em 2026-06-15 (banco de produção). Marca `central-coruja` = `bb43daa4-31d7-4517-9acd-423949d09239`.

## 1. Critério de aceite (P0)

A Central Coruja entra no go-live quando, **logada como um usuário real da marca**:
- vê **≥3 coleções** publicadas;
- vê **≥2 personagens** da marca;
- tem **≥1 ativo de cada tipo** acessível: **livro, áudio, vídeo, material**;
- todo o conteúdo é **da marca** (sem vazar Kaboo) e **abre** de fato.

## 2. Estado atual (auditoria real)

| Requisito | Atual | Status |
|---|---|---|
| Coleções publicadas (≥3) | **18** (todas `book`) | ✅ |
| Livro (≥1) | 18 com `pdf_url` | ✅ |
| Áudio (≥1) | 7 com `audio_url` | ✅ |
| Vídeo (≥1) | **1** com `video_url` | ⚠️ no limite |
| Material (≥1) | 10 com `extra_materials` | ✅ |
| Personagens (≥2) | **0 cadastrados** | 🔴 |
| Usuário da marca p/ validar | **0** | 🔴 |
| Formações (opcional) | 0 | 🟡 |

**Problema de dados:** 12 coleções da Coruja referenciam `character_ids` que **pertencem à Kaboo** (6 ids distintos). Como a RLS de `characters` é por marca, um viewer Coruja **não lê** esses personagens → chips de personagem quebram. Precisa ser corrigido.

## 3. O que falta (prioridade)

1. 🔴 **Cadastrar ≥2 personagens da Central Coruja** (Admin → Personagens).
2. 🔴 **Remapear/limpar os `character_ids` Kaboo** nas 12 coleções da Coruja → apontar para os personagens da Coruja (ou limpar até existirem).
3. 🔴 **Criar 1 usuário viewer da Coruja** (ou usar preview) para **homologar visibilidade**.
4. ⚠️ **Reforçar vídeo** — só 1 coleção tem vídeo; idealmente +2.
5. 🟡 (Opcional) Cadastrar ≥1 **Formação** se a biblioteca Formações for entrar no go-live.

## 4. Estrutura do catálogo (como o conteúdo se organiza)

- A unidade é a **Coleção** (`collection_type = 'book'`). Cada coleção carrega os ativos **inline**: `pdf_url` (livro), `audio_url` (áudio), `video_url` (vídeo), `extra_materials` (materiais), `teacher_guidance_url` (guia do professor), `video_libras_url` (Libras).
- As bibliotecas (Áudios/Vídeos/Materiais) são **alimentadas pelas coleções** (collection-backed) — não precisam de cadastro separado; aparecem conforme a coleção tem o ativo vinculado.
- **Personagens** são entidades próprias (Admin → Personagens), vinculadas às coleções por `character_ids`.
- Publicar exige **pelo menos um livro/mídia vinculado** (gate: "Vincule um livro ou mídia para poder publicar").

## 5. Passo a passo no Admin (para o time de conteúdo)

> Pré-requisito: gerenciar a marca Central Coruja. A conta **`admin@mundodekaboo.dev` já tem membership das DUAS marcas** (gerencia Coruja), então **já consegue cadastrar** conteúdo da Coruja — basta operar no contexto da marca Coruja (front `central-coruja` ou seleção de marca no admin). O que falta é um **viewer** da Coruja para validar a visão do usuário final (§6/§7).

### 5.1 Cadastrar personagem
1. Admin → **Personagens** → Novo.
2. Nome + imagem (upload) + descrição.
3. Salvar. Repetir para **≥2 personagens**.

### 5.2 Vincular personagens às coleções
1. Admin → **Coleções** → editar a coleção → aba de dados → campo de personagens.
2. Selecionar os personagens **da Coruja** (substituindo os da Kaboo).
3. Salvar. (Ver §7 para corrigir em lote os `character_ids` Kaboo.)

### 5.3 Completar ativos faltantes (vídeo)
1. Admin → **Coleções** → editar → aba **Mídias vinculadas**.
2. Adicionar **vídeo** (`.mp4` no Storage da marca ou YouTube) a +2 coleções.
3. Conferir que livro/áudio/material estão presentes onde fizer sentido.

### 5.4 Publicar
1. Garantir livro/mídia vinculado → ativar **Publicado**.
2. Conferir que aparece nas bibliotecas (Coleções/Livros/Áudios/Vídeos/Materiais).

## 6. Validação de "visível" (homologação)

1. Criar/usar **1 viewer da Coruja** (perfil com `brand_id = bb43daa4...`, `access_status='active'`).
2. Logar como esse viewer e confirmar:
   - Home mostra ≥3 coleções **da Coruja** (e **nenhuma** da Kaboo);
   - cada biblioteca (Livros/Áudios/Vídeos/Materiais) tem ≥1 item que **abre**;
   - personagens aparecem (chips não quebram);
   - identidade visual da Coruja aplicada (navy/dourado, logo).
3. Marcar o gate P0 como concluído.

## 7. Pendências de dados / suporte (posso executar com sua autorização)

- **Limpar/remapear `character_ids` Kaboo** nas 12 coleções da Coruja (migration). Limpar agora (até existirem personagens Coruja) evita chips quebrados; remapear quando os personagens forem cadastrados.
- **Criar 1 viewer de teste da Coruja** (`brand_id=bb43daa4…`, `active`) para homologar a visão do usuário final. (Admin já existe: `admin@mundodekaboo.dev` gerencia as duas marcas.)
- **Cadastrar o conteúdo** (personagens/vídeos) — depende dos arquivos do time; posso cadastrar assim que vierem.

## 8. Checklist final de aceite

- [ ] ≥2 personagens da Coruja cadastrados e ativos
- [ ] `character_ids` Kaboo removidos/remapeados nas coleções da Coruja
- [ ] ≥3 coleções publicadas (✅ já 18)
- [ ] ≥1 livro, ≥1 áudio, ≥1 vídeo, ≥1 material acessíveis (vídeo: reforçar)
- [ ] 1 viewer da Coruja criado e usado para validar
- [ ] Homologação visual feita logado como Coruja (sem vazar Kaboo)
- [ ] (Opcional) ≥1 Formação

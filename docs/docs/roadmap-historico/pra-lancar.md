---
id: pra-lancar
title: Pra lançar / Go-live
sidebar_position: 3
---

# Pra lançar / Go-live

{/* Consolida o que falta pra produção: Release manual, offline OFF no Kaboo, flip do bucket (SEC-58/T2) e os gates de docs/docs/roadmap/checklist-go-live-v1-3.md. */}

O que falta para colocar em produção. Diferente do [Backlog](./roadmap) (que é o "a fazer" amplo),
esta página é o **caminho crítico do go-live**: sem estes itens, não sobe. Vale para as duas marcas
(Kaboo e Central Coruja); onde há diferença, está marcado.

## Ações operacionais do cutover (2026-07)

O cutover MVP → produção está em andamento. Regras práticas desta fase:

- **Release manual (merge ≠ prod).** Um merge em `main`/`v1.1` **só builda**; quem decide o que
  realmente vai ao ar é uma **Release manual separada**. Não tratar merge como deploy automático de
  produção.
- **Parar de preservar o modo mock.** A base virou produção; o modo mock deixa de ser o alvo.
- **Offline sobe OFF no Kaboo.** No PR #81 o offline virou **interruptor-mestre** e sobe
  **desligado** por padrão. Go-live do Kaboo inclui **ligar o toggle** de offline quando validado.
- **Flip do bucket `collections` (SEC-58 / T2).** A migration de RLS já foi aplicada em prod (PR
  #74), mas o **flip do bucket para privado** ficou em **backlog deliberado até a próxima janela de
  deploy**. Enquanto público, o bucket permite listagem cross-brand — fechar no go-live.

## Gates críticos de go-live (checklist v1.3)

Os itens abaixo são **pré-requisitos obrigatórios**. A release não sai enquanto qualquer um estiver
aberto. Fonte: `checklist-go-live-v1-3`.

| Gate | O que precisa estar fechado | Status atual |
|---|---|---|
| **Catálogo real da Central Coruja** | ≥3 coleções, 2 personagens, 1 ativo por tipo, visíveis na marca correta | ✅ atendido (banco de prod, 2026-07-13) — **57 coleções publicadas**, **12 personagens**, **23 leituras + 42 vídeos**; viewer brand-agnostic. Resta publicar 12 coleções restantes (ver [checklist](../operacao/checklist-catalogo-coruja)) |
| **QA visual final dos hubs** | Hubs de vídeos/formações da Coruja validados com conteúdo real (thumbnails, títulos, navegação, estados vazios) | 🟡 conteúdo já existe; falta o passe visual final em browser real (specs E2E JTBD de vídeo/áudio/livro já no repo) |
| **Isolamento por marca homologado** | Backend/storage com separação correta Kaboo × Coruja, sem vazamento | ✅ APROVADO 2026-06-15 (ver [homologação](../operacao/homologacao-isolamento-marca)) |
| **Vouchers ponta a ponta** | Geração → distribuição → resgate → operação com a gráfica, sem mock | 🟡 código integrado; falta o fluxo real com a gráfica |
| **Ambiente real pronto** | Variáveis, auth, permissões, storage e rotinas mínimas de suporte revisadas | ~ runbook criado; ver pendências de hardening |
| **Distribuição pronta** | Conta Empatia, build nativo e caminho de loja sem bloqueio | 🔴 aberto — depende de infra/lojas |
| **Hardening operacional aprovado** | Offline, feature flags e health checks homologados como processo real | ~ runbook + hardening de DB aplicados; pendências não-bloqueantes |
| **Gate técnico final** | Build de produção verde, smoke final aprovado, nenhum bug crítico/alto aberto | 🔴 fechar no fim |
| **Aprovação de go-live** | Produto, operação e técnica concordam sem caveat aberto | 🔴 registro explícito no fim |

## Pendências abertas para fechar a release

1. **Publicar as 12 coleções restantes** da Central Coruja (57 de 69 já publicadas; personagens, leitura e vídeo já cadastrados).
2. Fechar o **QA visual final** dos hubs de vídeos e formações com conteúdo real, em browser real.
3. Validar **vouchers ponta a ponta** com a gráfica.
4. Fechar **conta Empatia, build nativo e caminho de lojas**.
5. **Ligar o offline** no Kaboo (interruptor-mestre) após validação.
6. **Flipar o bucket `collections`** para privado (SEC-58 / T2) na próxima janela de deploy.
7. Rodar a **Release manual** e registrar a **aprovação de go-live** (produto + operação + técnica).

## Fora deste gate (não bloqueiam o go-live)

Continuam no [backlog](./roadmap), mas **não** bloqueiam a release: letra da música, academia,
gamificação, perfil infantil, OAuth.

## Definição prática de "pronto"

A release pode ser chamada de pronta para produção quando:

1. Existe **conteúdo real suficiente da Central Coruja** para validar a experiência pública.
2. O comportamento público dos hubs foi **validado visualmente em browser real**.
3. A infraestrutura por marca foi **homologada sem vazamento** (bucket privado incluído).
4. O fluxo comercial/operacional de **vouchers foi exercitado de ponta a ponta**.
5. O pacote técnico final **passa em build + smoke** e tem **aprovação conjunta** de produto,
   operação e tecnologia — via **Release manual**, não por merge automático.

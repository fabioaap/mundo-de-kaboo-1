---
id: gtm-index
title: GTM / Growth — Hub
sidebar_position: 1
slug: /gtm
---

# Go-to-Market (GTM) — Hub

Documento-índice para organizar o trabalho de GTM (Kaboo + Central Coruja). Trabalhamos **por partes**.
Fonte canônica (o `AUDITORIA-UX-PRODUTO-2026-07-01.md` original nunca foi committado).
Última atualização: 2026-07-08.

## Diagnóstico do funil (auditoria 2026-07-01, re-verificado 2026-07-08)

| Etapa | Estado | Nota |
|---|---|---|
| **Aquisição** | 🔴 cega | 0% instrumentado (confirmado: nenhum `track()` no app), sem landing |
| **Ativação** | 🟢 forte | resgate de voucher + upsell tecnicamente sólidos |
| **Retenção / Renovação** | 🔴 furada | banner sem CTA + tela de expirado sem recompra |

**North Star proposta:** "coleções únicas consumidas por conta ativa/mês" — hoje **não mensurável** (sem eventos de play/leitura).

## Sub-páginas

- 🎨 [Figma — artefatos fora da plataforma](./marketing-figma) — **LP, e-mails, posts de rede social** (só o que vive fora do app).
- 💻 [Backlog de código](./code-backlog) — tudo **dentro da plataforma** (banner, expirado, telemetria, value prop, paywall…).
- 📋 [Inventário do app (referência)](./figma-inventory) — telas/componentes que já existem em código.

> **Régua de corte:** fora da plataforma (LP/e-mail/social) = **Figma**. Dentro do app = **código**.

## Roadmap por partes

1. **Renovação** (GTM-01/02) — 💰 maior ROI, `store_url` já existe.
2. **Instrumentação** (GTM-03) — eventos de consumo → North Star mensurável.
3. **Reconciliação Figma × Código** — quando o link do Figma chegar.
4. **Marca/mensagem** (GTM-05, G-MKT-10).
5. **Aquisição** (landing).

## Log de decisões

- **2026-07-08** — Hub criado na wiki. Achados 🔴 re-confirmados no código pós-PR #81. Aguardando link do Figma para a reconciliação.

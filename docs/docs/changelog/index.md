---
id: index
title: Changelog Técnico
sidebar_position: 1
---

# Changelog Técnico

Registro técnico das sessões de desenvolvimento, organizado por data. Cada
entrada descreve o que mudou no código, por quê, e cita os arquivos afetados
(âncora `arquivo:linha` ou `arquivo:função`) para rastreabilidade.

{/* Este índice é mantido manualmente. Não confundir com os docs auto-gerados
    da raiz do repositório (docs/*.md), que são reescritos pelo bot. */}

## Como ler

- **Marcas:** o produto é único; **Kaboo** (tema claro) e **Central Coruja**
  (tema escuro imersivo) diferem apenas por **tema + feature flags**. Quando uma
  mudança é exclusiva de uma marca, isso está sinalizado na entrada.
- **Âncoras de código:** cada afirmação de comportamento aponta para o arquivo
  de origem. Para migrações de banco, ver a seção de operação/DB — aqui só
  registramos o efeito.
- **PR:** cada sessão referencia o Pull Request que a consolidou.

## Sessões

| Data | Sessão | PR | Resumo |
|------|--------|----|--------|
| 2026-07-08 | [Tema Central Coruja + Admin White Label](./2026-07-sessao-tema-e-admin.md) | #81 | Unificação do tema Central Coruja no consumidor, gate autoritativo de download offline, tipografia por marca, fix de anti-enumeração no cadastro e suíte BDD Playwright |

## Convenções de entrada

Cada entrada de sessão segue o formato:

1. **Contexto** — o que motivou o trabalho.
2. **Mudanças** — agrupadas por área (consumidor, admin, segurança, testes).
3. **Arquivos** — lista de arquivos tocados com âncoras.
4. **Impacto por marca** — o que muda para Kaboo vs Central Coruja.

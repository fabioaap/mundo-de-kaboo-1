---
id: admin-configuracoes
title: Configurações (White-label)
sidebar_position: 9
---

# Módulo Configurações (White-label)

## Para que serve

Controla a **identidade visual**, as **capacidades** e as **integrações** da marca —
é o coração do white-label. É aqui que Kaboo e Central Coruja ganham cara própria sobre
o mesmo código (`screens/AdminWhiteLabelScreen.tsx`). Exclusivo de **admin**
(`module.white_label`, no código `AdminModule = 'white_label'`).

## Como abrir

Administração → **Configurações**. O cabeçalho "Configurações" mostra se a marca está
em **Supabase** ou **Mock local** (`screens/AdminWhiteLabelScreen.tsx:504`) e apresenta
**cinco abas** (`:524`):

![Painel administrativo, ponto de entrada das Configurações da marca (ainda sem captura dedicada da tela de white-label)](/screenshots/09-admin.png)

1. Identidade Visual
2. Operações
3. Menus
4. Integrações de IA
5. Auditoria de menus

---

## Aba 1 — Identidade Visual

Define a aparência da marca (`:547`).

- **Dados da marca** — Nome exibido e Família tipográfica (fonte) (`:552`).
- **Imagens** — Logo (512×512, fundo transparente) e Fundo do login (1920×1080)
  (`:595`). Só na Central Coruja aparece o campo **Hero da home** (2400×1200,
  `:623` — `isCentralCorujaBrand`).
- **Paleta de cores** — Cor principal, clara, de fundo e de destaque, cada uma com
  seletor de cor (`:645`).
- **Links da marca** — usados nos CTAs de upsell/primeiro acesso/suporte
  (`:679`): **Loja (upsell de voucher)**, **Captação de lead / comprar acesso** e
  **Contato de suporte**. Em branco, usa o padrão.
- **Tokens de design** — ajustes finos de estilo (`:708`), com **prévia** ao lado.

Passo a passo: edite os campos → as mudanças refletem na prévia → **Salvar**.

---

## Aba 2 — Operações

Liga/desliga **feature flags** da marca (`:858`). Mostra o contador de flags ativas.

- **Hero Parallax** (só Central Coruja) — escolha a intensidade do movimento do hero
  entre as opções de modo (`:872`).
- **Download Offline** (`content.offline`) — interruptor que permite ao usuário baixar
  conteúdos para uso sem internet (`:911`).
- **Contexto da alteração** — campo opcional que acompanha a mudança no log de auditoria
  (`:932`).
- **Preset rápido → Baseline padrão** — atalho que devolve as flags ao baseline esperado
  da aplicação (`:945`).

---

## Aba 3 — Menus

Liga/desliga **itens de navegação** da marca (`:967`). Os menus `admin` e `gestao` não
aparecem aqui (`:976`). Para cada item há um interruptor.

- Alterações valem **imediatamente para novos acessos** (`:972`).
- Ao desligar **Coleções**, o app redireciona o usuário para o primeiro menu disponível
  (aviso em `:987`).
- **Contexto da alteração** acompanha cada mudança no log de auditoria (`:1006`).

É esta aba que faz um módulo sumir do menu de uma marca sem tocar no código — a base do
"mesmo produto, marcas diferentes".

---

## Aba 4 — Integrações de IA

Configura o **provedor de IA** da marca (`:1023`). Mostra um selo de estado —
**IA ativa** / **IA desligada** — e alerta quando a chave ainda não foi configurada
(`:1035`). Ajuste provedor e credenciais e salve.

---

## Aba 5 — Auditoria de menus

Registra o histórico das mudanças de menu/flags (`:1190`). Cada entrada pode ser
**revertida** — o botão de rollback desfaz uma alteração de feature flag
(`rollbackAuditEntry`, `:490`).

---

## O que muda no consumidor

- **Identidade** muda logo, cores, fonte e imagens em todo o app da marca.
- **Menus/flags** definem o que o usuário vê (ex.: sem aba de Músicas se `menu.music`
  estiver desligado).
- **Download offline** habilita/desabilita o botão de baixar conteúdo.

## Kaboo × Central Coruja

Toda esta tela opera **por marca**. Central Coruja tem campos extras (Hero da home e
Hero Parallax) que não existem na Kaboo. Sempre confirme qual marca está selecionada
antes de salvar.

---
id: gtm-code-backlog
title: Backlog de código (GTM)
sidebar_position: 3
---

# Backlog de código — GTM

O que falta **implementar** para fechar os gaps de GTM. Estado verificado no código pós-PR #81 (2026-07-08).

**Legenda:** 🎨 = precisa de design no Figma antes · 🔌 = alavanca já existe (`store_url`/`lead_capture_url`), é fiação · 🗄️ = precisa migration/DB.

| ID | O que fazer | Onde (arquivos) | Depende de | Esforço |
|---|---|---|---|---|
| **GTM-01** 🔌 | Botão CTA "Renovar/Comprar" no banner de pré-expiração → abre `store_url` (hoje só "Fechar") | `components/AccessStatusBanner.tsx`, `screens/HomeScreen.tsx:1380/1390` | 🎨 C1 | **baixo** |
| **GTM-02** 🔌 | Caminho de recompra na tela de acesso expirado → botão pra `store_url` (hoje só pede código novo) | `screens/AccessExpiredScreen.tsx` | 🎨 C2 | **baixo** |
| **Upsell-track** | Instrumentar clique "Comprar na loja" do modal de upsell | `components/VoucherUpsellModal.tsx` | GTM-03 | baixo |
| **MKT-C4** | Estados do banner por urgência (dias restantes / expira hoje / expirado) | `components/AccessStatusBanner.tsx` | 🎨 | baixo |
| **MKT-B3** | Badge de cadeado / paywall em conteúdo bloqueado nas bibliotecas | `screens/LibraryHubScreen.tsx`, `components/Card3D.tsx`, `screens/DetailsScreen.tsx` | 🎨 E3 | baixo-médio |
| **MKT-B2** | Empty states com CTA (biblioteca/acervo vazio → explorar/adquirir) | `screens/LibraryHubScreen.tsx`, `screens/HomeScreen.tsx` | 🎨 | baixo |
| **GTM-03** | Camada de telemetria (`lib/analytics.ts`) + eventos: play/leitura, conclusão, clique upsell, renovação, resgate | novo `lib/analytics.ts` + instrumentar players (`Video/Audio/BookReader/FormationPlayer`), upsell, resgate | escolher provider | **médio** |
| **GTM-05** 🗄️ | Campo `value_prop`/`tagline` por marca: migration + admin (Identidade Visual) + consumo no hero | migration `brand_settings`, `lib/whiteLabelAdminApi.ts`, `screens/AdminWhiteLabelScreen.tsx`, `hooks/useBrandConfig.ts`, `screens/HomeScreen.tsx` | 🎨 A2 | médio |
| **G-MKT-10** 🗄️ | E-mails: reativar/parametrizar templates + passar `brand_id` no **envio** (o layout visual é Figma) | `supabase/config.toml:220-238`, templates (edge/SMTP), `lib/api.ts` (`resetPasswordForEmail`/`inviteUserByEmail`) | Figma EM1-5 | médio-alto |

> **Fora deste backlog (são Figma/externos):** Landing Pages, captura de lead, posts de rede social — ver [Figma — artefatos fora da plataforma](./marketing-figma). Aqui fica só o que é **dentro da plataforma**.

## Ordem recomendada (destrava métricas cedo)

1. **GTM-03 (telemetria)** — sem isso, nada abaixo é mensurável. Provider + eventos mínimos.
2. **GTM-01 + GTM-02** (renovação) — 🔌 fiação do `store_url`; maior ROI. *(design C1/C2 em paralelo)*
3. **MKT-B3 + MKT-C4** (paywall + urgência) — ganchos de conversão no meio do funil.
4. **GTM-05** (value prop) + **G-MKT-10** (fiação do envio de e-mail) — marca/mensagem.

> Aquisição (LP, lead, social) não aparece aqui: é design/externo (Figma), com fiação mínima (`store_url`/`lead_capture_url` já existem).

## Notas de verificação (2026-07-08)

- ✅ **`store_url` existe** — campo em `brand_settings` (via `mergeBrandLinks` em `lib/whiteLabelAdminApi.ts`) e já consumido por `VoucherUpsellModal` ("Comprar na loja"). Logo GTM-01/02/A5 são fiação, não infra nova.
- ✅ **Zero telemetria no app** — grep por `track(`/`analytics`/`posthog`/`gtag`/`mixpanel` só acha nos arquivos do site Docusaurus, nada em `screens/`/`lib/`/`components/`.
- ✅ **Sem `value_prop`/`tagline`** em `brand_settings` nem no código do app.
- ⚠️ Itens 🎨 dependem de design (ver [Marketing no Figma](./marketing-figma)) — implementar sem design fixo gera retrabalho.

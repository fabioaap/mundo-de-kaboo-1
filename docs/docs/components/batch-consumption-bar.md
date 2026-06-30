---
id: batch-consumption-bar
title: Barra de Consumo de Lote
sidebar_position: 8
---

# Barra de Consumo de Lote

**Local:** `screens/VouchersModule.tsx` (lista de Lotes do módulo de Vouchers)

## Descrição

Padrão visual que resume, num lote de vouchers, quantos códigos já foram resgatados, quantos seguem disponíveis e quantos foram desativados. Combina uma barra horizontal segmentada com um breakdown textual logo abaixo.

## Barra segmentada

Barra horizontal (`flex h-2 w-full overflow-hidden rounded-full bg-gray-100`) dividida em até 3 segmentos com largura proporcional ao total do lote:

| Segmento | Cor (Tailwind) | Significado |
|----------|----------------|-------------|
| Resgatados | `bg-emerald-500` | Códigos já resgatados |
| Disponíveis | `bg-brand-primary/30` | Códigos ainda não usados |
| Desativados | `bg-red-300` | Códigos desativados |

Cada segmento só é renderizado quando sua contagem é maior que zero; a largura vem de `pct(valor)` (percentual sobre o total). O fundo `bg-gray-100` aparece caso o total seja zero.

```tsx
<div
  className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100"
  role="img"
  aria-label={`${redeemed} resgatados, ${available} disponíveis, ${disabled} desativados de ${total}`}
>
  {redeemed > 0 && <div className="bg-emerald-500" style={{ width: `${pct(redeemed)}%` }} />}
  {available > 0 && <div className="bg-brand-primary/30" style={{ width: `${pct(available)}%` }} />}
  {disabled > 0 && <div className="bg-red-300" style={{ width: `${pct(disabled)}%` }} />}
</div>
```

## Breakdown textual

Abaixo da barra, uma linha (`text-xs`) detalha as contagens, com o total alinhado à direita:

```
X resgatados   Y disponíveis   Z desativados                de N
```

- `X resgatados` — `font-semibold text-emerald-600`
- `Y disponíveis` — `text-gray-500`
- `Z desativados` — `text-red-500` (renderizado só quando `disabled > 0`)
- `de N` — `text-gray-400`, empurrado para a direita com `ml-auto`

## Acessibilidade

A barra é puramente visual e usa `role="img"` com `aria-label` descritivo, garantindo que leitores de tela anunciem o resumo completo:

> `"{X} resgatados, {Y} disponíveis, {Z} desativados de {N}"`

## Fonte dos dados

As contagens vêm de `getVoucherBatches` em `lib/apiVouchers.ts`, que retorna por lote os campos agregados:

| Campo | Significado |
|-------|-------------|
| `redeemed_count` | Total de códigos resgatados |
| `available_count` | Total de códigos disponíveis |
| `disabled_count` | Total de códigos desativados |

O total (`N`) é a soma dos três (ou `batch.quantity`).

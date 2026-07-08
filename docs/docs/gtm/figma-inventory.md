---
id: gtm-figma-inventory
title: Inventário do app (referência)
sidebar_position: 4
---

# Inventário do app — referência

Telas/componentes que **já existem em código** (brownfield). Referência do universo **de código** (dentro da
plataforma). Os artefatos de Figma (fora do app) estão em [Figma — artefatos fora da plataforma](./marketing-figma).

**Legenda:** 🏷️×2 = 2 variantes de marca · 💰 = caminho de GTM · 🔒 = admin (tema único).

## Telas (28)

- **Aquisição/Auth** 💰: Portal 🏷️×2, Login 🏷️×2, EmailConfirmation, SetPassword, ForgotPassword, WrongBrand, **AccessExpired** 💰
- **Descoberta/Biblioteca** 💰: **Home** 🏷️×2 (contém banner de renovação), LibraryHub 🏷️×2, Library, Search, Characters, Details, ExtraTools
- **Players**: BookReader, VideoPlayer, AudioPlayer, FormationPlayer
- **Conta**: Profile, MyData
- **Admin** 🔒: AdminScreen, Collections, Characters, Formations, Materials, WhiteLabel (5 tabs), VouchersModule, DesignSystem

## Componentes-chave (25)

- **Nav/layout**: BottomNav 🏷️×2, PageHeader, Tabs
- **Cards** 💰: Card3D 🏷️×2 (default branco + coruja escuro c/ borda dourada), CollectionCoverSection, UserIdentityCard, CharacterAvatar
- **Modais**: CollectionModal 🏷️×2, CollectionFiltersModal, FilePreviewModal, ConfirmationModal, CriticalConfirmationModal, VoucherUpsellModal 💰
- **Banners/feedback** 💰: AccessStatusBanner 💰, VouchersOnboardingBanner 💰, Toast, ModalSkeleton
- **Inputs/form**: FileUpload, MultipleFileUpload, ColorPicker, SearchableMultiSelect, TagInput, VideoFramePicker
- **Fundos**: GalaxyBackground, HeroParallaxBackdrop (Central Coruja), Icons

## Fluxos (jornadas multi-tela)

1. 💰 Aquisição→Resgate: Portal → Cadastro (voucher) → EmailConfirmation → Login → Home desbloqueada
2. 💰 Renovação: Banner (Home) → loja **e** AccessExpired → recompra
3. Descoberta: Home → CollectionModal → drill-down → Player → volta
4. 🔒 Admin: criar coleção/kit + vincular mídia · emitir lote de voucher

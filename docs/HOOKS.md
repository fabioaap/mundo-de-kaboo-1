# Documentação de React Hooks Customizados

**Atualizado em**: 14/07/2026, 17:14:51

## Índice

- [brandSlug](#brandslug)
- [useBrandConfig.test](#usebrandconfig.test)
- [useBrandConfig](#usebrandconfig)
- [useDebounce](#usedebounce)
- [useIsMobile](#useismobile)
- [useModalA11y](#usemodala11y)
- [useOfflineDownload](#useofflinedownload)
- [useOrientation](#useorientation)
- [useParallaxMotion](#useparallaxmotion)
- [usePrefersReducedMotion](#useprefersreducedmotion)
- [useRefSize](#userefsize)
- [useScreenSize](#usescreensize)
- [useThemeBackground](#usethemebackground)
- [useToast](#usetoast)

---

## brandSlug

**Arquivo**: `hooks/brandSlug.ts`

**Descrição**: Sem descrição



**Exports**: `resolveBrandSlugFromSearch`, `resolveBrandSlugFromPathname`

---

## useBrandConfig.test

**Arquivo**: `hooks/useBrandConfig.test.ts`

**Descrição**: Sem descrição



**Exports**: 

---

## useBrandConfig

**Arquivo**: `hooks/useBrandConfig.ts`

**Descrição**: /   useBrandConfig — bootstrap único de marca por sessão.  Fluxo: 1. Resolve o brandSlug (VITE_BRAND


```
/   useBrandConfig — bootstrap único de marca por sessão.  Fluxo: 1. Resolve o brandSlug (VITE_BRAND_SLUG > hostname > 'kaboo'). 2. Tenta carregar do cache de sessionStorage (invalidado por versão). 3. Em modo mock / sem Supabase, usa defaults locais. 4. Com Supabase, chama RPC get_brand_bootstrap(slug). 5. Aplica tema via applyTheme e disponibiliza o contrato ao app. /
```

**Exports**: `BrandMenuItem`, `BrandSettings`, `BrandFeatureState`, `BrandBootstrap`, `BrandConfig`, `buildMockBootstrap`, `invalidateBrandBootstrapCache`, `useBrandConfig`

---

## useDebounce

**Arquivo**: `hooks/useDebounce.ts`

**Descrição**: Sem descrição



**Exports**: `useDebounce`

---

## useIsMobile

**Arquivo**: `hooks/useIsMobile.ts`

**Descrição**: Sem descrição



**Exports**: 

---

## useModalA11y

**Arquivo**: `hooks/useModalA11y.ts`

**Descrição**: /   Keyboard/focus accessibility for modals: closes on Escape, traps Tab/Shift+Tab focus inside the 


```
/   Keyboard/focus accessibility for modals: closes on Escape, traps Tab/Shift+Tab focus inside the container while open, moves initial focus into the modal on open, and restores focus to the previously-focused element on close.  Attach the returned ref to the modal's outermost container element. /
```

**Exports**: `useModalA11y`

---

## useOfflineDownload

**Arquivo**: `hooks/useOfflineDownload.ts`

**Descrição**: /  Per-asset override. null/undefined = inherits collection-level flag. false = disabled even if col


```
/  Per-asset override. null/undefined = inherits collection-level flag. false = disabled even if collection allows. /
```

**Exports**: `useOfflineDownload`

---

## useOrientation

**Arquivo**: `hooks/useOrientation.ts`

**Descrição**: Sem descrição



**Exports**: 

---

## useParallaxMotion

**Arquivo**: `hooks/useParallaxMotion.ts`

**Descrição**: Sem descrição



**Exports**: `useParallaxMotion`

---

## usePrefersReducedMotion

**Arquivo**: `hooks/usePrefersReducedMotion.ts`

**Descrição**: Sem descrição



**Exports**: `usePrefersReducedMotion`

---

## useRefSize

**Arquivo**: `hooks/useRefSize.ts`

**Descrição**: Sem descrição



**Exports**: `useRefSize`

---

## useScreenSize

**Arquivo**: `hooks/useScreenSize.ts`

**Descrição**: Sem descrição



**Exports**: 

---

## useThemeBackground

**Arquivo**: `hooks/useThemeBackground.ts`

**Descrição**: /   Hook to set the browser background color to match the screen theme This ensures the mobile brows


```
/   Hook to set the browser background color to match the screen theme This ensures the mobile browser background matches the screen background /
```

**Exports**: `useThemeBackground`

---

## useToast

**Arquivo**: `hooks/useToast.ts`

**Descrição**: Sem descrição



**Exports**: `useToast`

---


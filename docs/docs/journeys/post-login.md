---
title: Pós-Login
sidebar_position: 3
---

# Jornadas — Pós-Login

> Screenshots capturados em viewport **1440×900 (desktop)**.

---

## 1. Jornada 3 — Acesso expirado / Renovação

Fluxo de um usuário cujo acesso expirou (ou nunca teve voucher) e precisa informar um novo código para continuar.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant App as App.tsx
    participant AE as AccessExpiredScreen
    participant API as api.ts
    participant SB as Supabase / Mock

    U->>App: signIn() → profile.access_status = 'expired'
    App->>AE: redireciona (tela protegida bloqueada)

    AE->>U: Alerta "Acesso expirado em DD/MM/AAAA"
    AE->>U: Campo de código + botão "Ativar acesso"

    U->>AE: Digita novo código de voucher
    U->>AE: Clica "Ativar acesso"
    AE->>API: redeemVoucher(code)
    API->>SB: rpc('redeem_voucher', {p_code, p_user_id})

    alt Sucesso (voucher de catálogo completo)
        SB-->>API: {success, profile:{access_status:'active'}}
        API-->>AE: {success:true, profile}
        AE->>App: onAccessRecovered(profile)
        App->>U: navega → HomeScreen
    else Sucesso (voucher por conteúdo)
        SB-->>API: {success, profile, grantedCollectionIds}
        API-->>AE: {success, grantedCollectionIds}
        AE->>U: Lista de coleções liberadas
        U->>AE: Clica "Começar a explorar"
        AE->>App: navega → HomeScreen
    else Falha
        SB-->>API: {success:false, error}
        API-->>AE: mensagem de erro
        AE->>U: Alerta de erro
    end
```

| Acesso expirado |
|:---:|
| ![Acesso expirado](/screenshots/20-access-expired.png) |

---

## 2. Jornada 4 — Navegação principal (Home → Coleção)

Fluxo do professor navegando nas coleções, filtrando por nível, e abrindo o detalhe de uma coleção.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant HS as HomeScreen
    participant CM as CollectionModal
    participant DS as DetailsScreen
    participant API as api.ts

    U->>HS: Visualiza grid de coleções
    HS->>API: getCollections() (cache-first)
    API-->>HS: coleções[]

    U->>HS: Filtra por "Ed. Infantil" ou "Fund I"
    HS->>HS: filtro client-side por age_grade

    U->>HS: Clica em card da coleção
    HS->>CM: abre CollectionModal(collection)

    CM->>DS: renderiza DetailsScreen dentro do modal
    DS->>API: getCollectionResources(collectionId)
    API-->>DS: recursos[] (livro, áudio, vídeo, extras)

    DS->>U: Mostra capa, descrição, BNCC, CASEL, personagens

    alt Ler Livro
        U->>DS: Clica "Ler Livro"
        DS->>CM: fecha modal
        CM->>HS: onNavigate('player_book', {collectionId})
    else Ouvir Áudio
        U->>DS: Clica "Ouvir Áudio"
        DS->>CM: fecha modal
        CM->>HS: onNavigate('player_audio', {collectionId})
    else Assistir Vídeo
        U->>DS: Clica "Assistir Vídeo"
        DS->>CM: fecha modal
        CM->>HS: onNavigate('player_video', {collectionId})
    else Materiais da Coleção
        U->>DS: Clica "Materiais da Coleção"
        DS->>DS: abre ExtraToolsScreen inline
    end
```

| Home (grid de coleções) | Detalhe da coleção (modal) |
|:---:|:---:|
| ![Home](/screenshots/08-home.png) | ![Modal](/screenshots/12-collection-modal.png) |

---

## 3. Jornada 5 — Busca

Busca client-side unificada por título, personagem, BNCC, CASEL e competências.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant SS as SearchScreen
    participant API as api.ts
    participant CM as CollectionModal

    U->>SS: Navega via sidebar "Buscar"
    SS->>API: getCollections()
    API-->>SS: coleções[]

    SS->>U: Exibe personagens (avatares clicáveis)
    SS->>U: Exibe competências CASEL

    alt Busca por texto
        U->>SS: Digita "Kaboo" no campo de busca
        SS->>SS: filtra client-side (normaliza acentos)
        SS->>U: Grid com N resultados
    else Busca por personagem
        U->>SS: Clica avatar "Kaboo"
        SS->>SS: preenche campo com "Kaboo"
        SS->>U: Grid com coleções que incluem o personagem
    else Busca por competência CASEL
        U->>SS: Clica "Autoconsciência"
        SS->>SS: preenche campo com "Autoconsciência"
        SS->>U: Grid com coleções com essa competência
    end

    U->>SS: Clica em card de resultado
    SS->>CM: abre CollectionModal(collection)
```

| Busca (padrão) | Busca com resultados |
|:---:|:---:|
| ![Busca](/screenshots/13-search.png) | ![Resultados](/screenshots/14-search-results.png) |

---

## 4. Jornada 6 — Perfil e Meus Dados

Fluxo do professor visualizando e editando seus dados pessoais.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant PS as ProfileScreen
    participant MD as MyDataScreen
    participant API as api.ts

    U->>PS: Navega via sidebar "Perfil"
    PS->>API: getProfile(forceRefresh: true)
    API-->>PS: profile

    PS->>U: Avatar, nome, e-mail, badge de acesso

    alt Trocar avatar
        U->>PS: Clica no avatar → abre modal
        PS->>U: Grid de personagens + opção "Usar Sigla"
        U->>PS: Seleciona personagem
        PS->>API: updateProfile({avatar_id})
    end

    U->>PS: Clica "Meus Dados"
    PS->>MD: navega para MyDataScreen

    MD->>API: getProfile(forceRefresh: true)
    API-->>MD: profile

    MD->>U: Formulário: nome, e-mail, senha
    U->>MD: Edita campos desejados
    U->>MD: Clica "Salvar"
    MD->>API: updateProfile({full_name, email, avatar_id})

    alt Senha alterada
        MD->>API: updateProfile + updatePassword
    end

    API-->>MD: {success}
    MD->>U: Toast "Dados salvos com sucesso"
```

| Perfil | Meus Dados |
|:---:|:---:|
| ![Perfil](/screenshots/15-profile.png) | ![Meus Dados](/screenshots/16-my-data.png) |

---

## 5. Jornada 8 — Admin CMS

### Navegação do Admin

```mermaid
flowchart LR
    Sidebar["Sidebar Desktop\n(Coleções / Usuários / Vouchers)"]

    Sidebar --> Collections["AdminCollectionsScreen\nAba: Coleções"]
    Sidebar --> Users["AdminCollectionsScreen\nAba: Usuários"]
    Sidebar --> Vouchers["VouchersModule"]

    Vouchers --> Models["Sub-aba: Modelos"]
    Vouchers --> Batches["Sub-aba: Lotes"]
    Vouchers --> Codes["Sub-aba: Códigos"]
    Vouchers --> Audit["Sub-aba: Auditoria"]
```

### Gerenciamento de Coleções e Usuários

O admin pode criar, editar e excluir coleções. Visualização de todos os usuários com resumo de status de acesso (total, ativos, pendentes, expirados).

### Módulo de Vouchers

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant VM as VouchersModule
    participant API as api.ts

    note over A,VM: 1. Criar Modelo
    A->>VM: Aba "Modelos" → "Criar Modelo"
    VM->>A: Wizard 3 passos
    A->>VM: Passo 1: Nome, tipo, duração, prazo de resgate
    A->>VM: Passo 2: Seleciona coleções do catálogo
    A->>VM: Passo 3: Revisa e salva
    VM->>API: createVoucherModel(data)
    API-->>VM: modelo criado

    note over A,VM: 2. Gerar Lote
    A->>VM: Aba "Lotes" → "Gerar Lote"
    A->>VM: Escolhe modelo + quantidade
    VM->>API: createVoucherBatch(modelId, qty)
    API-->>VM: lote com N códigos únicos

    note over A,VM: 3. Exportar e Distribuir
    A->>VM: Clica "Exportar CSV"
    VM->>API: generateBatchCsv(batchId)
    API-->>A: download CSV com códigos

    note over A,VM: 4. Monitorar
    A->>VM: Aba "Códigos": busca, filtra, desativa
    A->>VM: Aba "Auditoria": histórico completo
```

| Coleções | Usuários | Vouchers |
|:---:|:---:|:---:|
| ![Admin Coleções](/screenshots/17-admin-collections.png) | ![Admin Usuários](/screenshots/18-admin-users.png) | ![Admin Vouchers](/screenshots/19-admin-vouchers.png) |

---

## 6. Telas Capturadas

Todas as telas abaixo foram capturadas em viewport **1440 × 900 px** (desktop).

### Autenticação

| Entry | Voucher (vazio) | Voucher (validado) |
|:---:|:---:|:---:|
| ![01](/screenshots/01-entry.png) | ![02](/screenshots/02-voucher-vazio.png) | ![03](/screenshots/03-voucher-validado.png) |

| Cadastro | Login Direto | Esqueci Senha |
|:---:|:---:|:---:|
| ![05](/screenshots/05-register.png) | ![07](/screenshots/07-login-direto.png) | ![11](/screenshots/11-forgot-password.png) |

### App Principal

| Home | Modal Coleção | Busca | Busca (resultados) |
|:---:|:---:|:---:|:---:|
| ![08](/screenshots/08-home.png) | ![12](/screenshots/12-collection-modal.png) | ![13](/screenshots/13-search.png) | ![14](/screenshots/14-search-results.png) |

| Perfil | Meus Dados | Acesso Expirado |
|:---:|:---:|:---:|
| ![15](/screenshots/15-profile.png) | ![16](/screenshots/16-my-data.png) | ![20](/screenshots/20-access-expired.png) |

### Admin

| Coleções | Usuários | Vouchers |
|:---:|:---:|:---:|
| ![17](/screenshots/17-admin-collections.png) | ![18](/screenshots/18-admin-users.png) | ![19](/screenshots/19-admin-vouchers.png) |

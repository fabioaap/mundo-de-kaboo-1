---
id: deploy-environments
title: Ambientes & Deploy
sidebar_position: 5
---

Estratégia de ambientes para a migração a produção.

Decisão de negócio: **GitHub Pages** cobre desenvolvimento, teste e a wiki;
**Azure Storage (static website)** hospeda **apenas produção** das duas marcas.

O app é uma **SPA estática** (Vite + React). A marca é resolvida em **tempo de
build** por `VITE_BRAND_SLUG` (`kaboo` | `central-coruja`) — mesmo código, dois
artefatos. Não há servidor de aplicação nem Docker.

## Visão geral (topologia)

```mermaid
flowchart LR
    subgraph REPO["Repositorio (git)"]
        DEVB["branch develop"]
        MAINB["branch main"]
    end

    subgraph GHP["GitHub Pages - DEV / TESTE"]
        WIKI["Wiki (Docusaurus)"]
        APPDEV["App preview (marca por hostname)"]
    end

    subgraph AZ["Azure - PRODUCAO"]
        SAK["Storage Account Kaboo<br/>container web"]
        SAC["Storage Account Central Coruja<br/>container web"]
    end

    DEVB -->|"deploy-pages.yml"| GHP
    MAINB -->|"kaboo-prd.yml + central-coruja-prd.yml"| AZ

    USR["Usuarios"] --> GHP
    USR --> AZ
```

| Ambiente | Onde | Branch | Trigger | Acesso |
|---|---|---|---|---|
| **Wiki** | GitHub Pages | `develop` | push | Cloudflare Access |
| **DEV / Teste** | GitHub Pages | `develop` | push | Cloudflare Access |
| **Produção — Kaboo** | Azure Storage `$web` | `main` | pipeline → Release | público |
| **Produção — Central Coruja** | Azure Storage `$web` | `main` | pipeline → Release | público |

## Estratégia de branches

```mermaid
flowchart LR
    FEAT["feature/*"] --> DEV["develop"]
    DEV -->|"deploy automatico"| PAGES["GitHub Pages (dev/teste)"]
    DEV -->|"PR + validacao"| MAIN["main"]
    MAIN -->|"pipelines Azure"| AZURE["Azure (producao)"]
```

- **`develop`** — branch de trabalho. Todo push publica no GitHub Pages
  (dev/teste + wiki). Pode conter artefatos de debug locais (ignorados).
- **`main`** — branch de produção, **limpa** (higienizada). Cada push dispara o
  build de produção no Azure DevOps. Promoção real ao `$web` passa por
  aprovação no Release.

## Fluxo de produção (Azure)

Push na `main` → pipeline faz o build e **publica o artefato** (não sobe nada
direto). Um **Release com aprovação** consome o artefato e faz o deploy.

```mermaid
flowchart TD
    PUSH["git push --> main"] --> P1["Pipeline kaboo-prd.yml"]
    PUSH --> P2["Pipeline central-coruja-prd.yml"]

    subgraph BUILD["Stage Build (agente Microsoft-hosted)"]
        P1 --> B1["npm ci + vite build<br/>VITE_BRAND_SLUG=kaboo"]
        P2 --> B2["npm ci + vite build<br/>VITE_BRAND_SLUG=central-coruja"]
        B1 --> A1["Artefato dist (kaboo)"]
        B2 --> A2["Artefato dist (central-coruja)"]
    end

    A1 --> R1["Release Kaboo"]
    A2 --> R2["Release Central Coruja"]

    R1 --> G1{"Aprovacao<br/>pre-deploy?"}
    R2 --> G2{"Aprovacao<br/>pre-deploy?"}

    G1 -->|aprovado| D1["Azure CLI: SAS acdlrw 1h + azcopy"]
    G2 -->|aprovado| D2["Azure CLI: SAS acdlrw 1h + azcopy"]
    G1 -->|rejeitado| X1["Deploy bloqueado"]
    G2 -->|rejeitado| X2["Deploy bloqueado"]

    D1 --> W1["container web - Kaboo"]
    D2 --> W2["container web - Central Coruja"]
```

**Por que separar build (pipeline) de deploy (Release)?** O artefato é o gate:
nada chega em produção sem aprovação explícita no Release.

## Detalhe do deploy (Release → `$web`)

A task **Azure CLI** do Release roda `release-deploy-web.sh`. A ordem do azcopy
é proposital: o `index.html` sobe **por último**, garantindo que ele só passe a
ser servido depois que todos os assets que referencia já estejam no storage.

```mermaid
sequenceDiagram
    participant REL as Release
    participant CLI as Azure CLI (service connection)
    participant STG as Storage web

    REL->>CLI: baixa artefato dist
    CLI->>CLI: az storage container generate-sas (acdlrw, 1h, user-delegation)
    CLI->>STG: azcopy copy dist/* (exceto index.html) - overwrite ifSourceNewer
    CLI->>STG: azcopy copy index.html (por ultimo) - overwrite true
    STG-->>REL: site publicado
```

:::note
SAS de **user-delegation** (`--auth-mode login --as-user`): sem account key.
Requisito: o Service Principal da Service Connection precisa do papel
**Storage Blob Data Contributor** no Storage Account.
:::

## Fluxo dev/teste (GitHub Pages)

```mermaid
flowchart TD
    PUSH["git push --> develop"] --> WF["deploy-pages.yml"]
    WF --> B1["build app (npm run build)"]
    WF --> B2["build wiki (docs - Docusaurus)"]
    B1 --> M["merge wiki em dist/wiki"]
    B2 --> M
    M --> ART["artifact Pages"]
    ART --> PAGES["GitHub Pages<br/>mundodekaboo.educacross.dev"]
    PAGES --> CF["Cloudflare Access (privado)"]
```

No Pages o app e a wiki convivem no mesmo site (wiki em `/wiki/`). A marca é
resolvida por hostname (preview cai em `kaboo` por padrão).

## Variáveis de build por ambiente

| Variável | DEV/Teste (Pages) | Produção (Azure) |
|---|---|---|
| `VITE_BRAND_SLUG` | resolvido por hostname | `kaboo` / `central-coruja` (fixo no pipeline) |
| `VITE_PUBLIC_BASE` | `./` | `/` (raiz do `$web`) |
| `VITE_SUPABASE_URL` | secret do GitHub | variable group `mundo-de-kaboo-prd` |
| `VITE_SUPABASE_ANON_KEY` | secret do GitHub | variable group `mundo-de-kaboo-prd` |
| `VITE_PUBLIC_APP_URL` | domínio do Pages | domínio público da marca |

## Estado da transição

```mermaid
flowchart LR
    subgraph DONE["Concluido"]
        H["Higiene da main"]
        DB["Branch develop criada"]
        PIPE["YMLs de producao criados"]
        DK["Docker removido"]
    end

    subgraph TODO["Pendente"]
        SC["Service Connection + RBAC"]
        VG["Variable group mundo-de-kaboo-prd"]
        RELDEF["Definir Releases (por marca)"]
        FLIP["Virar trigger do Pages: main -> develop"]
    end

    DONE --> TODO
```

:::warning
O trigger do Pages só deve mudar para `develop` **após** o Azure prod estar
validado — senão um push na `main` deixa de atualizar o Pages enquanto o Azure
ainda não publica (gap em produção).
:::

## Arquivos no repositório

Os pipelines e o script de deploy ficam em `azure-pipelines/`:

- `azure-pipelines/README.md` — setup detalhado (Service Connection, RBAC, variable group, Release)
- `azure-pipelines/kaboo-prd.yml` / `azure-pipelines/central-coruja-prd.yml` — pipelines de build por marca
- `azure-pipelines/templates/build-app.yml` — build Vite reutilizável
- `azure-pipelines/release-deploy-web.sh` — deploy do Release (SAS + azcopy)

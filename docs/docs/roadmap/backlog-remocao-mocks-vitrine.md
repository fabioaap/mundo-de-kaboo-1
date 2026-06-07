# Backlog: Remoção de Dados Mock da Vitrine

> **Status:** Pendente — bloqueado pela fase de validação do MVP  
> **Prioridade:** Alta (pós-MVP)  
> **Contexto:** Auditoria realizada em 2026-06-07 identificou todos os dados mock presentes na plataforma. Este documento é o plano de remoção completo.

---

## Por que isso existe

A vitrine pública (LibraryHubScreen) e alguns módulos do admin foram construídos sobre dados mock enquanto o backend era validado. Agora que o banco de dados real está operando, esses mocks precisam ser substituídos por dados dinâmicos.

O principal sintoma que desencadeou esta auditoria: **o usuário vê labels como "Continue ouvindo", "Faixa em destaque", chips "Roda", "Acolhimento"** na vitrine de Áudios — mas nunca os configurou no modal de cadastro. Eles vêm do arquivo `music.mock.ts`, não do banco.

---

## Inventário completo de mocks

### 1. Vitrines públicas (alto impacto — usuário final vê)

Todos os 4 módulos de área de biblioteca têm a vitrine **100% baseada em mock**:

| Arquivo | Módulo | O que é mock |
|---|---|---|
| `data/library-hubs/music.mock.ts` | Áudios | Rails, eyebrows, chips, stat cards, featured item, progress bars |
| `data/library-hubs/videos.mock.ts` | Vídeos | idem |
| `data/library-hubs/formations.mock.ts` | Formações | idem |
| `data/library-hubs/materials.mock.ts` | Materiais | idem |
| `data/library-hubs/index.ts` | Todos | URLs de fallback para assets de teste; lógica de binding mock → coleção real |

**Exemplos do que aparece hardcoded na tela:**
- Seções: "Continue ouvindo", "Para ouvir agora", "Ligadas a obras"
- Labels nos cards: "Faixa em destaque", "Pausa guiada", "Escuta coletiva"
- Chips editoriais: `['Roda', 'Acolhimento', '1º ao 3º ano']`
- Stat cards: `"03 faixas"`, `"02 listas"`, `"06 entradas"`, `"05 vídeos"`
- Barra de progresso falsa: `progress: 38`

**8 `collectionId`s hardcoded** nos arquivos mock (precisam existir no banco):

| ID | Coleção esperada |
|---|---|
| `784b3238-0916-4922-af3c-8627d74cc16c` | Kaboo e a Carta Misteriosa |
| `c6334710-6117-426f-995c-07be8d87d872` | Mensageiro e a Canção Certa |
| `6a93b60f-b4e9-4fe6-9fed-7c6f7391745c` | Baratinha e Baratão no Labirinto do Eco |
| `66627622-235a-43f6-ba4b-35522086165c` | Gaio e a Hora de Voar Alto |
| `ad037be3-ad9f-43d3-a913-549337aef9ef` | Kaboo e o Desafio das Cores |
| `ce726511-73df-422d-b5fb-b2d0518e164a` | Papa e o Plano Furado |
| `33efdbb5-abed-4037-9eed-bb7017d19f7a` | Gaio e o Vento da Coragem |
| `410acf81-6d7d-4569-85e4-02ed2fb28762` | Onde está Gaio? |

---

### 2. VouchersModule (impacto baixo — admin only)

| Arquivo | O que é mock |
|---|---|
| `screens/VouchersModule.tsx` | Módulo inteiro de gerenciamento de vouchers — 100% mock |
| `lib/mockVoucherData.ts` | 2 modelos, 3 lotes, 50 códigos fake; nomes como "Maria Silva", "João Santos" |
| `lib/mockData.ts` | 10 vouchers default de seed; 4 usuários de teste (demo@, admin@, viewer@, editor@) |

> ⚠️ Este módulo já está documentado como bloqueador G2 nos gaps de testes de usabilidade.

---

### 3. Dados de seed (não são mocks — manter)

| Arquivo | O que é |
|---|---|
| `data/characters.ts` | 8 personagens reais do projeto (Kaboo, Gaio, Baratinha, etc.) — seed legítimo |
| `constants.ts` | Filtros de idade, labels de UI — configuração legítima |

---

## O que NÃO é trivial de remover

Os arquivos `*.mock.ts` **não podem simplesmente ser deletados**. Eles são a estrutura que monta a vitrine. Sem eles, as telas de Áudios, Vídeos, Formações e Materiais ficam **em branco**.

A remoção exige uma refatoração da `LibraryHubScreen` para:
1. Buscar as coleções do banco por hub (`music`, `videos`, `formations`, `materials`)
2. Montar os rails dinamicamente com os dados reais
3. Eliminar os labels editoriais hardcoded (eyebrows, chips, rail titles) — ou torná-los configuráveis pelo admin

---

## Plano de migração por módulo

### Fase 1 — Stat cards dinâmicos (menor esforço, impacto imediato)

Substituir os números hardcoded ("03 faixas", "06 entradas") por contagem real do banco.

- **Fonte:** `api.getCollections()` filtrado por hub → contar assets por categoria
- **Esforço estimado:** Baixo (1–2 horas por módulo)
- **Risco:** Baixo

### Fase 2 — Rails dinâmicos sem estrutura editorial (médio esforço)

Substituir os rails hardcoded por uma lista dinâmica de coleções do banco, agrupadas por critério simples (mais recentes, publicadas).

- Elimina: eyebrows, chips editoriais, rail titles hardcoded
- Mantém: estrutura de cards e players existentes
- **Esforço estimado:** Médio (refatoração da `LibraryHubScreen`)
- **Risco:** Médio — requer decisão de produto sobre como organizar os rails sem curadoria manual

### Fase 3 — Curadoria configurável pelo admin (maior esforço)

Criar no admin a capacidade de definir quais coleções aparecem em destaque, em qual ordem, com qual label editorial.

- Elimina: todos os `collectionId`s hardcoded
- Requer: nova tabela no banco (`hub_curation` ou similar), nova UI no admin
- **Esforço estimado:** Alto
- **Risco:** Alto — mudança estrutural de produto

### Fase 4 — VouchersModule real (separado)

Conectar o VouchersModule ao Supabase real. Estrutura já existe; é questão de ativar e migrar dados.

- Ver gaps de usabilidade: [backlog-gaps-testes-usabilidade-2026-06-06](./backlog-gaps-testes-usabilidade-2026-06-06)

---

## Decisão de produto necessária antes da Fase 2

A remoção dos mocks de vitrine levanta uma pergunta que o produto precisa responder:

> **Os rails da vitrine serão curados manualmente pelo admin, ou gerados automaticamente com base nos dados do banco?**

- **Curadoria manual** → precisa de UI de curadoria no admin (Fase 3)
- **Geração automática** → rails como "Adicionados recentemente", "Mais acessados" (Fase 2, mais simples)
- **Híbrido** → alguns rails fixos (destaque) + outros automáticos

Enquanto essa decisão não for tomada, remover os mocks sem substituto deixa as vitrines vazias.

---

## Checklist de remoção (quando aprovado para execução)

- [ ] Substituir stat cards por contagem real (`api.getCollections`)
- [ ] Definir estratégia de rails (curadoria vs automático) com produto
- [ ] Refatorar `LibraryHubScreen` para consumir dados dinâmicos
- [ ] Remover `data/library-hubs/music.mock.ts`
- [ ] Remover `data/library-hubs/videos.mock.ts`
- [ ] Remover `data/library-hubs/formations.mock.ts`
- [ ] Remover `data/library-hubs/materials.mock.ts`
- [ ] Refatorar `data/library-hubs/index.ts` (remover binding mock→real, passar a ser puro)
- [ ] Remover progress bars fake
- [ ] Conectar VouchersModule ao Supabase (ver gap G2)
- [ ] Remover usuários e vouchers fake de `mockData.ts`
- [ ] Remover `lib/mockVoucherData.ts`
- [ ] Validar que os 8 `collectionId`s hardcoded existem no banco de produção

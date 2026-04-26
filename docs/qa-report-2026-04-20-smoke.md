# Relatório de Smoke QA — 20/04/2026

## Escopo da rodada

Rodada inicial de smoke QA executada sobre o app local do Mundo de Kaboo, com foco em fluxos críticos já entregues em v1.2.

Cobertura executada nesta rodada:

- Auth de login
- Home e vitrine
- Busca textual
- Filtro puro por segmento
- Abertura de detalhe da coleção
- Tooltips pedagógicos de BNCC e CASEL
- Entrada do módulo de Gerenciar
- CMS de coleções
- Gestão de usuários
- Gestão de personagens
- CMS de vouchers
- Renovação de acesso em modo mock local

Cobertura ainda não executada nesta rodada:

- Cadastro real com criação de conta no Supabase
- Leitores e players ponta a ponta
- CRUD completo do CMS com persistência
- Fluxos administrativos com ações destrutivas ou de envio
- Validação e2e de Supabase remoto

---

## Resultado executivo

- Status da rodada: aprovado com correções aplicadas
- Bugs críticos encontrados: 0
- Bugs altos encontrados: 3
- Bugs médios encontrados: 0
- Bugs baixos encontrados: 0

Leitura rápida:

- O login responde corretamente para credenciais inválidas e válidas no ambiente de dev.
- A Home está íntegra no fluxo principal.
- A busca inline e o filtro puro estão funcionando no comportamento esperado.
- O detalhe de coleção carrega CTAs e informações pedagógicas corretamente.
- O admin de Coleções, Usuários, Personagens e Vouchers sobe e navega sem erro fatal após correções.
- A renovação automática de acesso em sessão mock local voltou a funcionar após correção na camada de API.
- Houve três bugs altos na rodada, todos corrigidos e revalidados no mesmo ciclo.

---

## Casos executados

| ID | Caso | Resultado | Observação |
|----|------|-----------|------------|
| SMK-HOME-01 | Abrir Home com grade inicial | Passou | 16 coleções renderizadas, chips e badges visíveis |
| SMK-HOME-02 | Abrir busca inline | Passou | Overlay abre sem trocar de tela |
| SMK-HOME-03 | Buscar termo único de título | Passou | "Furado" retornou 1 resultado correto |
| SMK-HOME-04 | Limpar busca e restaurar estado | Passou | Home voltou ao estado base sem quebra |
| SMK-HOME-05 | Filtro puro por segmento | Passou | "Ed. Infantil" mostrou grade direta com 8 itens |
| SMK-DETAIL-01 | Abrir detalhe de coleção | Passou | Modal carregou capa, CTAs e informações pedagógicas |
| SMK-DETAIL-02 | Validar CTAs tipados visíveis | Passou | Leitura, Contação da História, Desenho Animado e Materiais da Coleção presentes |
| SMK-DETAIL-03 | Tooltip BNCC rico no detalhe | Passou após correção | Antes redirecionava indevidamente para busca |
| SMK-DETAIL-04 | Tooltip CASEL rico no detalhe | Passou após correção | Revalidado com tooltip renderizado em portal |
| SMK-AUTH-01 | Login com senha inválida | Passou | Mensagem exibida: "E-mail ou senha incorretos." |
| SMK-AUTH-02 | Login válido em dev com demo local | Passou | `demo@mundodekaboo.local` entrou na home |
| SMK-AUTH-03 | Login viewer pendente com resgate automático mock | Passou após correção | `qa.pending2@mundodekaboo.local` entrou com voucher pendente e caiu na home com acesso ativo |
| SMK-CMS-01 | Abrir entrada Gerenciar | Passou | Tela de Coleções do admin carregou sem erro fatal |
| SMK-CMS-02 | Buscar coleção no admin | Passou | Busca por "Gaio" retornou 3 cards coerentes |
| SMK-CMS-03 | Abrir aba Usuários | Passou | Lista e contadores principais carregaram |
| SMK-CMS-04 | Abrir aba Personagens | Passou após correção | Runtime error foi corrigido e a listagem voltou |
| SMK-CMS-05 | Buscar e filtrar personagem inativo | Passou | "Papa" isolado corretamente com filtro Inativos |
| SMK-CMS-06 | Abrir Vouchers em Modelos | Passou | Modelos listados com busca e filtro de status |
| SMK-CMS-07 | Abrir subabas Lotes, Códigos e Auditoria | Passou | As três subabas renderizaram dados sem erro |

---

## Bug encontrado

### QA-001 — Chips pedagógicos do detalhe desviavam para busca

- Severidade: Alta
- Área: Detalhe da coleção
- Sintoma: ao clicar em um chip BNCC no detalhe, o fluxo podia sair do contexto do modal e ir para a busca na Home, em vez de manter o tooltip rico no próprio detalhe.
- Causa raiz: o hover/focus já armava o estado do tooltip antes do clique. Quando o clique acontecia, o handler entendia que o tooltip já estava ativo e executava o ramo secundário indevido.
- Correção aplicada: ajuste do clique em chips BNCC e CASEL para sempre abrir ou manter o tooltip no detalhe quando houver lookup válido.
- Arquivo alterado: screens/DetailsScreen.tsx
- Status: Corrigido e revalidado

### Evidência da revalidação

- BNCC: clique em EI03EF03 passou a manter a URL em #home e renderizar tooltip com descrição rica.
- CASEL: clique em Autogerenciamento passou a renderizar tooltip com título, dimensão, foco, descrição e skills.

### QA-002 — Aba Personagens do admin quebrava por import ausente

- Severidade: Alta
- Área: CMS Admin, Personagens
- Sintoma: ao abrir a aba Personagens, a tela quebrava em branco no browser.
- Causa raiz: a tela usava `getCharacterImageUrl` no preview e fallback de avatar sem importar a função.
- Correção aplicada: adição do import ausente em `screens/AdminCharactersScreen.tsx`.
- Status: Corrigido e revalidado

### Evidência da revalidação

- Aba Personagens voltou a carregar cards, badges de status e ações de edição.
- Busca por "Papa" retornou apenas o personagem esperado.
- Filtro "Inativos" manteve apenas o card correto visível.
- Vouchers também foi revalidado na sequência, com Modelos, Lotes, Códigos e Auditoria carregando normalmente.

### QA-003 — Sessão mock de dev não conseguia validar nem resgatar voucher com Supabase configurado

- Severidade: Alta
- Área: Auth, renovação de acesso, modo mock local
- Sintoma: viewers mock com `pending_voucher` ficavam presos no fluxo de ativação ou erro ao tentar aplicar um voucher salvo, mesmo em ambiente de desenvolvimento.
- Causa raiz: `getVoucherSamples`, `validateVoucher` e `redeemVoucher` em `lib/api.ts` respeitavam apenas `isSupabaseConfigured`, mas ignoravam `devMockSession`; com isso, o login podia usar o bypass mock e, ainda assim, o resgate continuava tentando o caminho Supabase.
- Correção aplicada: os três métodos passaram a respeitar `devMockSession` e a reutilizar a camada mock de vouchers quando o usuário está autenticado via sessão mock local.
- Status: Corrigido e revalidado

### Evidência da revalidação

- `demo@mundodekaboo.local` continuou entrando normalmente no fluxo local de dev.
- `qa.pending2@mundodekaboo.local` entrou com voucher pendente salvo em `KABOO-3MESES-2026` e foi redirecionado para a home.
- O perfil do usuário passou a exibir `Acesso ativo` com vigência até `20/07/2026`.

---

## Riscos e observações

- Requests abortados de mídia externa apareceram durante a inspeção da Home, mas não se materializaram como erro funcional bloqueador nesta rodada.
- Houve erros de fetch relacionados a profile no Supabase remoto durante a navegação do admin, mas Coleções, Usuários, Personagens e Vouchers permaneceram funcionais na rodada.
- O cadastro real com criação de usuário no Supabase não foi executado nesta rodada para evitar poluir a homologação; a tela atual expõe o formulário completo de cadastro, sem uma etapa separada de validação segura do voucher.
- Esta rodada não cobre ainda a confiabilidade dos players nem o fluxo administrativo completo de salvar, excluir, convidar e exportar.
- O status desta rodada não substitui a rodada Standard prevista no plano principal.

---

## Próximos passos recomendados

1. Executar um cadastro real controlado no Supabase com e-mail descartável e voucher reservado para homologação.
2. Validar players de leitura, áudio e vídeo ponta a ponta.
3. Executar CRUD real no CMS de coleções, vouchers, usuários e personagens.
4. Consolidar a próxima rodada em relatório Standard usando o plano em docs/qa-validation-plan-v1.2.md.
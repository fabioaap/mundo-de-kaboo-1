# Backlog — Gaps Encontrados nos Testes de Usabilidade MVP
> Data: 2026-06-06  
> Origem: execução completa das jornadas MVP em produção (`mundodekaboo.educacross.dev`)  
> Relatório completo: [`docs/relatorio-usabilidade-mvp-2026-06-06.md`](../../relatorio-usabilidade-mvp-2026-06-06.md)

---

## 🔴 Críticos (bloqueiam o evento ou a operação)

### G1 — Cloudflare Access bloqueia usuários externos

**Problema:** A URL de produção `mundodekaboo.educacross.dev` exige autenticação Cloudflare com conta `@educacross.com.br`. Qualquer professor ou aluno sem essa conta recebe tela de login corporativo antes de chegar à plataforma.

**Impacto:** Bloqueio total para o evento Vitrine de Santo Antão e para qualquer usuário real.

**Ação necessária:** Decidir a estratégia de acesso antes do evento:
- Opção A: criar subdomínio público sem Cloudflare Access (ex.: `app.mundodekaboo.com.br`)
- Opção B: configurar bypass por IP do local do evento no painel Cloudflare
- Opção C: gerar link de acesso direto com token temporário de 1 dia via Cloudflare Access

**Arquivo:** configuração no painel Cloudflare (fora do código da aplicação)

---

### G2 — VouchersModule é 100% mock (zero integração com Supabase)

**Problema:** As quatro abas do painel Admin → Vouchers (Códigos, Lotes, Modelos, Auditoria) leem exclusivamente do `localStorage`. Nenhum dado real chega ao componente. Vouchers inseridos diretamente no Supabase são invisíveis para o admin.

**Impacto:** O admin não consegue:
- Ver quais vouchers foram resgatados
- Ver quantas ativações ocorreram
- Auditar acessos
- Gerenciar códigos em produção

**Arquivos afetados:**
- `screens/VouchersModule.tsx` (inteiro — todo o módulo é mock)
- Nenhuma função em `lib/api.ts` serve o VouchersModule

**Ação necessária:** Implementar integração Supabase para cada aba:
- **Códigos:** `SELECT * FROM vouchers WHERE brand_id = ?`
- **Lotes:** agregação por `batch_label` com contagem de `redeemed`
- **Modelos:** `SELECT * FROM voucher_templates WHERE brand_id = ?`
- **Auditoria:** `SELECT * FROM voucher_audit_log WHERE brand_id = ?` (verificar se tabela existe)

> Ver também: [PRD — Gestão Administrativa de Vouchers por Conteúdo](./prd-vouchers-por-conteudo.md)

---

## 🟡 Moderados (criam fricção ou risco operacional)

### G3 — Redeem de voucher depende de localStorage entre etapas

**Problema:** Após validar o código na tela de voucher, o código é salvo em `localStorage`. Quando o usuário confirma o e-mail e faz login, o sistema lê o `localStorage` para completar o redeem automaticamente.

Se o usuário:
- Abrir o link de confirmação em outro dispositivo
- Limpar o cache/dados do navegador
- Usar modo privado para o link de e-mail

...o código pendente se perde e o usuário fica com `access_status = 'pending_voucher'` sem saber o que fazer.

**Arquivo:** `lib/api.ts:1541` · `lib/auth.ts` (lógica de redeem pós-login)

**Ação necessária:** Persistir `pending_voucher_code` na coluna `profiles.pending_voucher_code` (ou tabela auxiliar) no momento da validação, antes do cadastro. O redeem pós-login leria do banco, não do localStorage.

---

### G10 — Verificação de acesso não é real-time durante sessão ativa

**Problema:** `getProfileAccessStatus()` é chamado apenas no carregamento da página. Um usuário cujo `access_status` expire (via SQL direto ou processo automatizado) durante uma sessão ativa continua vendo a HomeScreen até o próximo reload.

**Arquivo:** `lib/access.ts:20` · `lib/access.ts:49`

**Ação necessária:** Implementar polling leve (ex.: verificação a cada 5 minutos via `setInterval`) ou Supabase Realtime subscription na tabela `profiles` filtrando pelo `id` do usuário logado.

---

### G11 — Formações e Materiais não imediatamente visíveis no mobile

**Problema:** No BottomNav mobile, Formações e Materiais ficam dentro do dropdown "Mais" (5º botão). Não há indicador de quantos itens existem. Usuários novos exploram os 4 botões principais e não descobrem essas seções.

**Arquivo:** `components/BottomNav.tsx`

**Ação necessária:** Avaliar se Formações ou Materiais devem substituir Livros ou Vídeos como item primário do BottomNav, ou adicionar badge numérico ao botão "Mais".

---

### G12 — Sidebar de vídeos relacionados ausente entre 768px e 1024px

**Problema:** A sidebar de relacionados no `VideoPlayerScreen` só aparece em `lg:` (1024px+). Em tablets (768–1023px), o player ocupa toda a largura mas não exibe relacionados, desperdiçando espaço.

**Arquivo:** `screens/VideoPlayerScreen.tsx`

**Ação necessária:** Considerar mostrar a sidebar a partir de `md:` (768px) com largura reduzida, ou adicionar lista de relacionados abaixo do player em tablets.

---

## 🟢 Leves (melhorias de UX sem impacto funcional)

### G4 — Posição de leitura não salva

O leitor de PDF sempre abre na página 1, sem restaurar a última posição lida. Para livros longos, o usuário precisa navegar manualmente até onde parou.

**Ação:** Salvar `{book_id, page}` no `localStorage` (solução rápida) ou em `profiles.reading_progress` (solução persistente entre dispositivos).

---

### G5 — Sem loader no player de áudio durante buffer

O player de áudio não exibe spinner enquanto faz buffer. A tela fica sem resposta por alguns segundos, passando a impressão de travamento.

**Ação:** Escutar evento `waiting` do elemento `<audio>` e exibir spinner; remover no evento `canplay`.

---

### G6 — Botões Ler/Ouvir/Assistir aparecem mesmo sem ativo disponível

No modal de detalhes do livro, os três botões são exibidos independentemente de o livro ter PDF, audiolivro ou vídeo vinculado. Clicar em um botão de ativo ausente não faz nada.

**Ação:** Condicionar a visibilidade de cada botão à existência do ativo (`book.pdf_url`, `book.audio_url`, `book.video_url`).

---

### G7 — Busca da HomeScreen não indexa Formações e Materiais

O campo de busca principal (`Título, BNCC, personagem, competência...`) filtra apenas coleções e livros. Formações e materiais são excluídos dos resultados de busca.

**Ação:** Expandir o índice de busca para incluir os tipos de conteúdo das Bibliotecas, ou criar um campo de busca global acessível de todas as telas.

---

## 📸 Documentação com Screenshots (pós-MVP)

Criar documentação visual navegando pelas telas em produção e salvando prints. Possíveis entregas:

| Documento | Público-alvo | Telas a cobrir |
|-----------|-------------|----------------|
| Tutorial do usuário | Professor / aluno | Voucher → cadastro → HomeScreen → consumo de conteúdo |
| Guia do editor | Editor de conteúdo | Admin → criar livro / coleção / formação / material |
| Guia do administrador | Admin | Usuários → Vouchers → Coleções → visão geral |
| Handoff de produto | Designer / Dev | Todas as telas principais com anotações de comportamento |

**Pré-condição:** resolver G1 (Cloudflare) primeiro, para que os prints reflitam o ambiente que o usuário real vai ver.

---

## Resumo de Prioridade

| # | Gap | Severidade | Antes do evento? |
|---|-----|-----------|-----------------|
| G1 | Cloudflare Access externo | 🔴 CRÍTICO | Sim — bloqueador |
| G2 | VouchersModule mock | 🔴 CRÍTICO | Sim — gestão cega |
| G3 | localStorage voucher | 🟡 MODERADO | Desejável |
| G10 | Access check não real-time | 🟡 MODERADO | Não (edge case) |
| G11 | BottomNav "Mais" oculto | 🟡 MODERADO | Não |
| G12 | Sidebar vídeo 768–1024px | 🟡 MODERADO | Não |
| G4 | Posição leitura | 🟢 LEVE | Não |
| G5 | Loader áudio | 🟢 LEVE | Não |
| G6 | Botões sem ativo | 🟢 LEVE | Não |
| G7 | Busca parcial | 🟢 LEVE | Não |

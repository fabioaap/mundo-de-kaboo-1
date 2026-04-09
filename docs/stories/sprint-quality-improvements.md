<!-- PROGRESS-CHART:START -->
```
╔══════════════════════════════════════════════════════════════════════════╗
║  SPRINT : Quality Improvements                                           ║
║  Branch : fix/quality-improvements   |   Atualizado: 2026-04-09          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  [MUST HAVE]    ██████████████████████████████████████  13/13  100%      ║
║                                                                          ║
║  US-C1            .gitignore para credenciais       [x]  batch 1         ║
║  US-I3            URL Supabase → variável de am...  [x]  batch 1         ║
║  US-DevOps4       Headers de segurança Vercel       [x]  batch 1         ║
║  US-DB4           Índices faltantes nas queries...  [x]  batch 3         ║
║  US-DevOps3       Prebuild cross-platform Windows   [x]  batch 1         ║
║  US-C3            Skeleton nos players ao recar...  [x]  batch 2         ║
║  US-C6            History API / botão Voltar do...  [x]  batch 3         ║
║  US-C2            createUser sem sobrescrever s...  [x]  batch 3         ║
║  US-I9-I10-I11    Erros silenciosos players e b...  [x]  batch 1         ║
║  US-I14           Splash com logo + spinner         [x]  batch 2         ║
║  US-I15           Toast safe-area iPhones           [x]  batch 2         ║
║  US-DB2           deleteCollection sem cascata      [x]  batch 3         ║
║  US-I1            Bloquear modo demo em produção    [x]  batch 2         ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  [SHOULD HAVE]  ██████████████████████████████████████  7/7  100%        ║
║                                                                          ║
║  US-C7            BookReader portrait fallback      [x]  batch 3         ║
║  US-I13           Confirmação antes de logout       [x]  batch 2         ║
║  US-I12           Aviso re-confirmação de e-mail    [x]  batch 2         ║
║  US-D9            console.* substituído por logger  [x]  batch 2         ║
║  US-DevOps2       GEMINI_API_KEY fora do bundle     [x]  batch 1         ║
║  US-D6-D7         Remover screens mortas do App...  [x]  batch 2         ║
║  US-I16-I17       A11y: labels e ARIA nos forms...  [x]  batch 2         ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  [COULD HAVE]   █████████████████████████████░░░░░░░░░  3/4   75%        ║
║                                                                          ║
║  US-O1            Velocidade 0.75x AudioPlayer      [x]  batch 3         ║
║  US-O3            EmailConfirmation redirect se...  [x]  batch 3         ║
║  US-D8            Remover GEMINI_API_KEY sem in...  [x]  batch 1         ║
║  US-DB1           profiles.email sync com auth....  [ ]  pendente        ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  GERAL          ████████████████████████████████████░░  23/24   96%      ║
╚══════════════════════════════════════════════════════════════════════════╝

  Legenda : [x] Concluido  [~] Em andamento  [ ] Pendente
  Commits : batch 1 + batch 3 + batch 2
```
<!-- PROGRESS-CHART:END -->

# Sprint Planning — Quality Improvements
**Branch:** `fix/quality-improvements` from `v1.1`  
**Sprint:** 2 semanas · Time: 2-3 devs (2 full-stack + 1 DevOps/Data)  
**Data:** Abril 2026

---

## Capacidade estimada

| Tamanho | Horas equiv. | Pts |
|---------|-------------|-----|
| XS      | 0.5 – 2h    | 0.5 |
| S       | meio dia    | 1   |
| M       | 1 – 2 dias  | 2   |
| L       | 3 – 4 dias  | 3   |
| XL      | sprint inteiro | 5 |

> Capacidade: ~20–25 pts por sprint (2 devs full-stack + 1 DevOps/Data × 2 semanas)

---

## 🔴 MUST HAVE — 13 histórias · ~14 pts

---

### US-C1 — Remover senha do banco do controle de versão

**Como** desenvolvedor do time,  
**quero** que o arquivo `.db-password` (e outros arquivos de credencial) esteja no `.gitignore`  
**para** que senhas não sejam expostas acidentalmente no repositório remoto.

**Critérios de aceite:**
- [ ] `.db-password` listado no `.gitignore` raiz
- [ ] `.env*.local`, arquivos `.key`, `.pem` e variantes adicionados como regra genérica
- [ ] `git status` não exibe mais o arquivo como untracked após o commit
- [ ] Arquivo de credencial existente (se já commitado) removido do histórico via `git rm --cached`

**Estimativa:** XS  
**Responsável:** Dev

---

### US-I3 — Mover URL do Supabase para variável de ambiente

**Como** administrador da infra,  
**quero** que a URL de produção do Supabase não esteja hardcoded em `constants.ts`  
**para** que diferentes ambientes (dev, staging, prod) usem configurações sem recompilação.

**Critérios de aceite:**
- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` lidas de `import.meta.env`
- [ ] `constants.ts` não contém mais strings de URL de banco de dados
- [ ] `.env.example` atualizado com os nomes das variáveis (sem valores)
- [ ] Build não quebra se as vars não estiverem definidas (erro explícito na inicialização)

**Estimativa:** XS  
**Responsável:** Dev

---

### US-DevOps4 — Adicionar headers de segurança no vercel.json

**Como** usuário da aplicação,  
**quero** que o servidor envie headers HTTP de segurança  
**para** que meu navegador esteja protegido contra XSS, clickjacking e sniffing de conteúdo.

**Critérios de aceite:**
- [ ] `vercel.json` inclui headers globais: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Content-Security-Policy` básico configurado (permite Supabase e CDNs conhecidos)
- [ ] `Strict-Transport-Security` adicionado (HSTS, max-age mínimo de 6 meses)
- [ ] Deploy de preview validado com `curl -I` ou DevTools

**Estimativa:** XS  
**Responsável:** DevOps

---

### US-DB4 — Criar índices faltantes nas queries críticas

**Como** professor/gestor acessando o app,  
**quero** que a tela inicial e o histórico de progresso carreguem com agilidade  
**para** não precisar aguardar queries lentas ao abrir o app.

**Critérios de aceite:**
- [ ] Migration criada com `CREATE INDEX CONCURRENTLY idx_user_progress_user_id ON user_progress(user_id)`
- [ ] Migration criada com `CREATE INDEX CONCURRENTLY idx_collection_resources_collection_id ON collection_resources(collection_id)`
- [ ] Migration versionada em `supabase/migrations/` com timestamp no nome
- [ ] `EXPLAIN ANALYZE` antes/depois documentado no PR (evidência de melhoria)

**Estimativa:** XS  
**Responsável:** Data Engineer

---

### US-DevOps3 — Corrigir script prebuild no Windows

**Como** desenvolvedor rodando Windows,  
**quero** que `npm run build` funcione sem erros de comandos Unix  
**para** não ter builds quebradas apenas por causa do SO.

**Critérios de aceite:**
- [ ] Script `prebuild` substituído por equivalente cross-platform (ex.: pacote `mkdirp` ou `shx`)
- [ ] `mkdir -p` e `cp` Unix substituídos por comandos Node/npm-script compatíveis
- [ ] `npm run build` executa sem erro no Windows 10/11
- [ ] CI futuro (Linux) também deve continuar funcionando

**Estimativa:** XS  
**Responsável:** DevOps

---

### US-C3 — Corrigir tela em branco ao recarregar AudioPlayer e VideoPlayer

**Como** professor acessando um conteúdo de áudio ou vídeo,  
**quero** que ao recarregar a página o player seja exibido normalmente  
**para** não perder meu acesso ao conteúdo por acidente.

**Critérios de aceite:**
- [ ] `AudioPlayerScreen` e `VideoPlayerScreen` não retornam `null` em nenhum estado inicial
- [ ] Na ausência de parâmetro de navegação, a tela exibe skeleton/placeholder com botão de voltar
- [ ] Reload direto na URL do player não gera tela em branco
- [ ] Testado em Chrome/Safari mobile e desktop

**Estimativa:** M  
**Responsável:** Dev

---

### US-C6 — Corrigir navegação com botão Voltar do browser

**Como** professor navegando no app,  
**quero** que o botão Voltar do browser me leve para a tela anterior  
**para** não precise usar botões internos e a navegação fique natural.

**Critérios de aceite:**
- [ ] History API integrada: cada troca de tela faz `history.pushState` com identificador de rota
- [ ] Botão nativo Voltar (browser e Android) aciona transição de tela correta
- [ ] Deep link em `/book/:id`, `/audio/:id`, `/video/:id` funcionam após F5
- [ ] `NavState` atualizado sem quebrar fluxo atual (sem regressão em navegação por clique)

**Estimativa:** M  
**Responsável:** Dev

---

### US-C2 — Corrigir criação de usuário admin sem sobrescrever sessão ativa

**Como** administrador gerenciando usuários,  
**quero** criar novos usuários sem que minha sessão atual seja encerrada  
**para** continuar meu trabalho administrativo sem precisar relogar.

**Critérios de aceite:**
- [ ] `api.createUser()` usa Supabase Admin API (`supabase.auth.admin.createUser`) em vez de `signUp()` client-side
- [ ] Criação de usuário requer service role key disponível somente server-side (Edge Function ou RPC com `SECURITY DEFINER`)
- [ ] Sessão do admin logado permanece ativa após criar qualquer usuário
- [ ] Usuário criado aparece na listagem sem redirecionamento para login

**Estimativa:** M  
**Responsável:** Dev + Data Engineer

---

### US-I9-I10-I11 — Tratar erros silenciosos em Player e Search

**Como** professor usando o app em rede instável,  
**quero** ver uma mensagem de erro clara quando o áudio, vídeo ou busca falham  
**para** entender o que aconteceu e poder tentar novamente.

**Critérios de aceite:**
- [ ] `VideoPlayerScreen.play()` usa `await player.play().catch(err => showToast(err.message))` 
- [ ] `AudioPlayerScreen` exibe toast de erro de rede em vez de apenas `console.error`
- [ ] `SearchScreen.fetchResults()` tem `.catch()` que encerra o estado de loading e exibe mensagem
- [ ] Toast de erro contém ação "Tentar novamente" quando aplicável
- [ ] Nenhum dos três estados de erro deixa loading spinning indefinidamente

**Estimativa:** S  
**Responsável:** Dev

---

### US-I14 — Tela de loading inicial com identidade visual

**Como** professor abrindo o app,  
**quero** ver o logo do Mundo de Kaboo com um spinner durante o carregamento inicial  
**para** ter percepção de que o app está respondendo e saber que é o app correto.

**Critérios de aceite:**
- [ ] Splashscreen ou overlay exibe logo do app + spinner enquanto `Carregando...` ocorre
- [ ] Substituída a string de texto puro `"Carregando..."` por componente de splash
- [ ] Transição suave (fade-out) quando o app estiver pronto
- [ ] Funciona tanto no carregamento inicial quanto em sessões restauradas

**Estimativa:** S  
**Responsável:** Dev

---

### US-I15 — Corrigir posicionamento do Toast em iPhones com notch

**Como** professor usando iPhone com notch ou Dynamic Island,  
**quero** que as notificações toast apareçam abaixo da área do sistema  
**para** que não sejam cortadas ou sobrepostas pela interface do iOS.

**Critérios de aceite:**
- [ ] Toast usa `padding-top: env(safe-area-inset-top)` ou equivalente Tailwind `pt-safe`
- [ ] Posição `top-4 right-4` ajustada para respeitar `safe-area-inset-top`
- [ ] Testado via DevTools com simulação de iPhone 14 Pro e iPhone 12
- [ ] Toast permanece visível e legível em todos os modelos simulados

**Estimativa:** XS  
**Responsável:** Dev

---

### US-DB2 — Corrigir deleção de coleção sem cascata

**Como** administrador removendo uma coleção do catálogo,  
**quero** que todos os recursos associados sejam removidos junto com a coleção  
**para** não deixar arquivos órfãos no banco e no storage.

**Critérios de aceite:**
- [ ] `deleteCollection()` em `lib/api.ts` deleta recursos em `collection_resources` antes da coleção
- [ ] Arquivos relacionados no Supabase Storage também são removidos
- [ ] Transação garante que falha parcial não deixa estado inconsistente
- [ ] Teste manual: criar coleção com 3 recursos, deletar coleção, verificar ausência de órfãos

**Estimativa:** S  
**Responsável:** Dev + Data Engineer

---

### US-I1 — Bloquear modo demo em produção

**Como** administrador do sistema,  
**quero** que o modo demo não possa ser ativado se as variáveis de ambiente de produção estiverem ausentes  
**para** impedir que usuários acessem o app sem autenticação real em produção.

**Critérios de aceite:**
- [ ] Modo demo só ativável se `VITE_DEMO_MODE=true` explicitamente e ambiente não for produção
- [ ] Verificação via `import.meta.env.PROD` que desativa demo em builds de produção
- [ ] Se `VITE_SUPABASE_URL` ausente em produção, app exibe erro claro em vez de fallback demo
- [ ] `.env.example` documenta que `VITE_DEMO_MODE` nunca deve ir para produção

**Estimativa:** S  
**Responsável:** Dev

---

## 🟡 SHOULD HAVE — 7 histórias · ~8.5 pts

---

### US-C7 — Alternativa funcional para BookReader em portrait

**Como** professor lendo no celular em modo retrato,  
**quero** conseguir ler o conteúdo (mesmo que em layout simplificado) sem o app travar  
**para** não perder acesso ao livro quando não posso girar o dispositivo.

**Critérios de aceite:**
- [ ] Em portrait, BookReader exibe mensagem orientacional com botão de rotação OU renderiza modo single-page
- [ ] Não bloqueia totalmente (tela preta/branca) em portrait — sempre há conteúdo ou instrução visible
- [ ] Indicador de orientação usa ícone + texto claro
- [ ] No modo fallback, o livro pode ser scrollado verticalmente página a página

**Estimativa:** M  
**Responsável:** Dev

---

### US-I13 — Confirmação antes de logout

**Como** professor usando o app,  
**quero** uma confirmação antes de ser desconectado  
**para** não perder minha sessão por um toque acidental no botão de Sair.

**Critérios de aceite:**
- [ ] Toque em "Sair" abre modal de confirmação com ações "Cancelar" e "Sair"
- [ ] Usa `ConfirmationModal` já existente no projeto
- [ ] Modal não aparece se o usuário estiver na tela de login (sem sessão ativa)
- [ ] Confirmação concluída em ≤ 2 toques a partir do menu

**Estimativa:** S  
**Responsável:** Dev

---

### US-I12 — Aviso de re-confirmação ao trocar e-mail

**Como** professor atualizando meu e-mail,  
**quero** ser avisado que preciso confirmar o novo endereço antes de a mudança valer  
**para** não achar que o e-mail foi atualizado quando na verdade está pendente de confirmação.

**Critérios de aceite:**
- [ ] Após salvar novo e-mail em `MyDataScreen`, exibe banner/toast explicando o fluxo de confirmação do Supabase
- [ ] Mensagem informa que o e-mail atual permanece ativo até confirmação do novo
- [ ] Se usuário tentar logar com o novo e-mail antes de confirmar, erro é apresentado com instrução clara
- [ ] Componente `EmailConfirmationScreen` reaproveitado onde aplicável

**Estimativa:** S  
**Responsável:** Dev

---

### US-D9 — Substituir console.* pelo logger centralizado

**Como** desenvolvedor do time,  
**quero** que todos os logs de debug e erro usem `lib/logger.ts`  
**para** ter controle de nível de log por ambiente e facilitar rastreamento de erros.

**Critérios de aceite:**
- [ ] `lib/logger.ts` atualizado para suportar níveis `debug`, `info`, `warn`, `error`
- [ ] Em produção (`import.meta.env.PROD`), `debug` e `info` são suprimidos
- [ ] Todos os 44 `console.*` encontrados substituídos por `logger.*` equivalente
- [ ] Nenhum `console.*` remanescente em código de produção (validado por grep ou lint rule)

**Estimativa:** S  
**Responsável:** Dev

---

### US-DevOps2 — Remover API key de IA do bundle do Vite

**Como** administrador preocupado com segurança,  
**quero** que `GEMINI_API_KEY` não seja injetada e exposta no bundle JavaScript do cliente  
**para** que chaves de API não vazem para qualquer usuário que inspecione o app.

**Critérios de aceite:**
- [ ] `GEMINI_API_KEY` removida do `vite.config.ts` (define ou env injection)
- [ ] Se a integração Gemini for necessária, movida para Edge Function no Supabase
- [ ] Build de produção não contém strings com `AIza` (padrão de API key Google)
- [ ] `.env.example` atualiza comentário indicando que essa key deve ser server-side only

**Estimativa:** S  
**Responsável:** DevOps + Dev

---

### US-D6-D7 — Remover screens mortas do App.tsx

**Como** desenvolvedor mantendo o projeto,  
**quero** remover `LibraryScreen` e `DetailsScreen` não utilizadas  
**para** não confundir o time com código morto que parece funcional.

**Critérios de aceite:**
- [ ] `LibraryScreen` e `DetailsScreen` removidas dos imports de `App.tsx`
- [ ] Se arquivos `.tsx` das screens não forem usados em nenhum outro lugar, movidos para `_archive/` ou deletados (decisão documentada no PR)
- [ ] Nenhuma referência pendente no router/navegação do `App.tsx`
- [ ] TypeScript e build passam sem erros após remoção

**Estimativa:** XS  
**Responsável:** Dev

---

### US-I16-I17 — Acessibilidade básica: labels e ARIA em formulários e nav

**Como** professor que usa leitores de tela ou navegação por teclado,  
**quero** que os formulários e a navegação inferior tenham labels e atributos ARIA corretos  
**para** conseguir usar o app com tecnologia assistiva.

**Critérios de aceite:**
- [ ] Todo `<input>` e `<select>` tem `id` correspondente ao `htmlFor` do `<label>` (WCAG 2.1 SC 1.3.1)
- [ ] `BottomNav` tem `aria-label="Navegação principal"`
- [ ] `PageHeader` tem `aria-label` descritivo por contexto de tela
- [ ] Itens ativos do `BottomNav` têm `aria-current="page"`
- [ ] Validado com axe DevTools (zero violações críticas nas telas afetadas)

**Estimativa:** S  
**Responsável:** Dev

---

## 🟢 COULD HAVE — 4 histórias · ~3 pts

---

### US-O1 — Velocidade 0.75x no AudioPlayer para acessibilidade

**Como** professor com dificuldade de acompanhar o ritmo padrão de narração,  
**quero** reduzir a velocidade de reprodução do áudio para 0.75x  
**para** entender melhor o conteúdo sem precisar pausar constantemente.

**Critérios de aceite:**
- [ ] Controle de velocidade com opções 0.75x, 1x, 1.25x, 1.5x
- [ ] Velocidade padrão permanece 1x
- [ ] Preferência é mantida durante a sessão (não precisa persistir entre sessões)
- [ ] Integrado no layout atual do `AudioPlayerScreen` sem impacto visual significativo

**Estimativa:** XS  
**Responsável:** Dev

---

### US-O3 — Redirecionar EmailConfirmationScreen se sessão já ativa

**Como** professor que já confirmou e-mail e reabre o link de confirmação,  
**quero** ser redirecionado direto para a home  
**para** não ver uma tela de confirmação confusa quando já estou logado.

**Critérios de aceite:**
- [ ] `EmailConfirmationScreen` verifica sessão ao montar
- [ ] Se sessão ativa, redireciona para home sem mostrar a tela de confirmação pendente
- [ ] Comportamento testado com sessão ativa e sem sessão — ambos os fluxos corretos

**Estimativa:** XS  
**Responsável:** Dev

---

### US-D8 — Remover GEMINI_API_KEY sem integração real

**Como** desenvolvedor do time,  
**quero** limpar referências a `GEMINI_API_KEY` em `vite.config.ts` enquanto a integração não existe  
**para** reduzir ruído no config e não criar falsa expectativa de funcionalidade.

**Critérios de aceite:**
- [ ] `GEMINI_API_KEY` removida do `define` do `vite.config.ts`
- [ ] Se houver código que referencia `GEMINI_API_KEY`, extraído para feature flag desativada ou removido
- [ ] Build continua passando sem warnings sobre variável indefinida

**Estimativa:** XS  
**Responsável:** Dev

> **Nota:** Coberto parcialmente por US-DevOps2. Se ambas forem feitas, consolidar em um único PR.

---

### US-DB1 — Sincronizar email de profiles com auth.users

**Como** administrador consultando perfis de usuário,  
**quero** que `profiles.email` reflita sempre o e-mail atual de `auth.users`  
**para** não ver e-mails desatualizados na listagem de usuários.

**Critérios de aceite:**
- [ ] Trigger `AFTER UPDATE ON auth.users` atualiza `profiles.email` quando e-mail muda
- [ ] Migration versionada em `supabase/migrations/`
- [ ] Função trigger com `SECURITY DEFINER` no schema correto
- [ ] Cenário testado: trocar e-mail, verificar que `profiles.email` atualizou

**Estimativa:** M  
**Responsável:** Data Engineer

---

## ⚪ WON'T HAVE (this sprint) — Backlog futuro

| ID | Descrição | Tamanho | Motivo do adiamento |
|----|-----------|---------|---------------------|
| C4 | Bundle 584KB sem lazy loading | L | Requer code splitting global, alto risco de regressão |
| C5 | RLS versionado para AdminScreen | L | Depende de pipeline de migrations (DevOps-5) |
| D1 | Refactor App.tsx god component | XL | Maior risco da sprint, prerequisito de outros itens |
| D2 | Tipar `NavState.params` por screen | M | Bloqueado pelo refactor de D1/C6 |
| D3 | Centralizar chamadas Supabase em lib/api.ts | L | Escopo grande, dependente de D1 |
| D10 | Configurar Vitest + cobertura de testes | XL | Fundação necessária mas sprint já está carregada |
| DevOps-1 | Pipeline CI/CD GitHub Actions | L | Pode ser feito em sprint paralela de DevOps |
| DevOps-5 | Pipeline de migrations Supabase | L | Depende de DevOps-1 |
| DB-3 | Storage PDFs com signed URLs (RLS) | L | Impacta fluxo de vouchers — alinhar com sprint de vouchers |
| O2 | FilePreviewModal inline em ExtraTools | S | Nice-to-have, valor baixo para estabilidade |
| O4 | Tooltips BNCC/CASEL nos filtros | S | Feature nova, fora do escopo de qualidade |

---

## 📊 Resumo do Sprint Backlog

| Prioridade | Qtd stories | Pts estimados |
|-----------|-------------|---------------|
| Must Have  | 13          | ~14 pts       |
| Should Have| 7           | ~8.5 pts      |
| Could Have | 4           | ~3 pts        |
| **TOTAL**  | **24**      | **~25.5 pts** |

> A capacidade estimada é de ~20–25 pts. **Must + Should = ~22.5 pts** é o núcleo realista do sprint.  
> Could Have entra apenas se Must+Should terminarem antes do final da sprint.

---

## 🚀 Top 5 — Faça primeiro amanhã de manhã

Estes itens têm o maior ROI imediato: alta criticidade, baixo esforço, zero dependências.

| # | Story | Por quê primeiro |
|---|-------|-----------------|
| 1 | **US-C1** — `.db-password` no `.gitignore` | Risco de segurança ativo; fix de 10 minutos. Credencial pode já estar exposta. |
| 2 | **US-I3** — URL Supabase hardcoded → env var | Prerequisito para CI/CD e múltiplos ambientes; muda 2 linhas, impacto enorme. |
| 3 | **US-DevOps4** — Headers de segurança no vercel.json | 1 commit em JSON, protege todos os usuários em produção imediatamente. |
| 4 | **US-DevOps3** — Corrigir prebuild no Windows | Todo dev do time que trabalha em Windows não consegue fazer build limpo agora. |
| 5 | **US-I9-I10-I11** — Erros silenciosos em players e search | Três bugs de UX crítica em uma história; impacta toda sessão de uso de conteúdo. |

> **Regra de ouro:** itens 1–3 podem ser commitados em sequência em menos de 1 hora. Não deixe essa segurança para o final do sprint.

---

## 📋 Backlog completo por responsável

### Dev (full-stack)
| Story | Prioridade | Pts |
|-------|-----------|-----|
| US-C1 — .gitignore senha | Must | 0.5 |
| US-I3 — Env vars Supabase | Must | 0.5 |
| US-C3 — Player null no reload | Must | 2 |
| US-C6 — History API navigation | Must | 2 |
| US-C2 — createUser sem sobrescrever sessão | Must | 2 |
| US-I9-I10-I11 — Erros silenciosos | Must | 1 |
| US-I14 — Loading com identidade visual | Must | 1 |
| US-I15 — Toast safe-area iPhones | Must | 0.5 |
| US-I1 — Bloquear demo em produção | Must | 1 |
| US-C7 — BookReader portrait fallback | Should | 2 |
| US-I13 — Logout com confirmação | Should | 1 |
| US-I12 — Aviso re-confirmação e-mail | Should | 1 |
| US-D9 — console.* → logger | Should | 1 |
| US-D6-D7 — Remover screens mortas | Should | 0.5 |
| US-I16-I17 — A11y labels e ARIA | Should | 1 |
| US-O1 — Velocidade 0.75x áudio | Could | 0.5 |
| US-O3 — EmailConfirmation redirect | Could | 0.5 |
| US-D8 — Remover GEMINI key | Could | 0.5 |

### DevOps
| Story | Prioridade | Pts |
|-------|-----------|-----|
| US-DevOps4 — Headers segurança vercel.json | Must | 0.5 |
| US-DevOps3 — Prebuild cross-platform | Must | 0.5 |
| US-DevOps2 — API key fora do bundle | Should | 1 |

### Data Engineer
| Story | Prioridade | Pts |
|-------|-----------|-----|
| US-DB4 — Índices ausentes | Must | 0.5 |
| US-DB2 — deleteCollection cascata | Must | 1 |
| US-DB1 — profiles.email sync trigger | Could | 2 |

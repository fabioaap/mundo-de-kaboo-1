# Tasks: Sistema de Autenticação Simples

**Input**: Spec e plan de `/specs/000-example-feature/`  
**Prerequisites**: spec.md ✅, plan.md ✅

> ⚠️ **NOTA**: Este é um exemplo didático. Mostra como quebrar uma feature em tasks executáveis organizadas por user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (diferentes arquivos, sem dependências)
- **[Story]**: Qual user story (US1, US2, US3)
- Caminhos exatos incluídos

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Projeto básico e estrutura comum

- [ ] T001 Criar estrutura de diretórios: `backend/src/modules/auth/`, `backend/src/utils/`, `tests/{unit,integration,e2e}/auth/`
- [ ] T002 Instalar dependências: `express`, `prisma`, `bcrypt`, `jsonwebtoken`, `express-rate-limit`, `jest`, `supertest`
- [ ] T003 [P] Configurar Prisma em `backend/prisma/schema.prisma`
- [ ] T004 [P] Configurar Jest em `backend/jest.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure que TODAS as user stories dependem

**⚠️ CRITICAL**: Nenhuma user story pode começar até este phase estar completo

- [ ] T005 Criar model User no Prisma schema: `id UUID`, `email String @unique`, `passwordHash String`, `name String`, `createdAt DateTime`, `lastLoginAt DateTime?`
- [ ] T006 Gerar migration: `npx prisma migrate dev --name create-users-table`
- [ ] T007 [P] Criar `backend/src/utils/hash.util.ts` com funções `hashPassword()` e `comparePassword()` (bcrypt)
- [ ] T008 [P] Criar `backend/src/utils/jwt.util.ts` com funções `generateToken()` e `verifyToken()`
- [ ] T009 [P] Criar `backend/src/modules/auth/auth.validation.ts` com validações de email e senha
- [ ] T010 Criar `backend/src/modules/auth/auth.types.ts` com interfaces `LoginDTO`, `RegisterDTO`, `AuthResponse`

**Checkpoint**: Foundation ready - user story implementation pode começar

---

## Phase 3: User Story 1 - Login (Priority: P1) 🎯 MVP

**Goal**: Usuário pode fazer login com email e senha

**Independent Test**: Criar usuário de teste no banco, fazer POST /auth/login, verificar que token JWT é retornado

### Tests for User Story 1 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHEM antes da implementação**

- [ ] T011 [P] [US1] Unit test para `hashPassword()` e `comparePassword()` em `tests/unit/auth/hash.util.spec.ts`
- [ ] T012 [P] [US1] Unit test para `generateToken()` e `verifyToken()` em `tests/unit/auth/jwt.util.spec.ts`
- [ ] T013 [P] [US1] Unit test para validações em `tests/unit/auth/auth.validation.spec.ts`
- [ ] T014 [US1] Integration test para POST /auth/login (success e failure cases) em `tests/integration/auth/login.spec.ts`

### Implementation for User Story 1

- [ ] T015 [US1] Implementar `auth.service.ts` com método `login(email, password)`: buscar user, compare hash, gerar token
- [ ] T016 [US1] Implementar `auth.controller.ts` com endpoint `POST /auth/login`: validar input, chamar service, retornar token
- [ ] T017 [US1] Criar middleware `auth.middleware.ts` com `verifyToken`: extrair JWT do header, verificar validade, adicionar user ao request
- [ ] T018 [US1] Implementar rate limiting em `backend/src/utils/ratelimit.util.ts`: 5 tentativas por 15min por IP
- [ ] T019 [US1] Aplicar rate limiting ao endpoint POST /auth/login
- [ ] T020 [US1] Adicionar logs estruturados: `[AuthService] Login attempt`, `[AuthService] Login success/failure`
- [ ] T021 [US1] Adicionar métricas: `auth.login.success`, `auth.login.failure`, `auth.login.duration`

**Checkpoint**: User Story 1 está funcional e testável independentemente ✅

---

## Phase 4: User Story 2 - Logout (Priority: P2)

**Goal**: Usuário pode fazer logout seguro

**Independent Test**: Autenticar usuário, fazer POST /auth/logout, tentar usar o mesmo token e verificar que é rejeitado

### Tests for User Story 2 ⚠️

- [ ] T022 [US2] Integration test para POST /auth/logout em `tests/integration/auth/logout.spec.ts`
- [ ] T023 [US2] Test que token após logout não é mais aceito

### Implementation for User Story 2

- [ ] T024 [US2] Criar tabela `token_blacklist` no Prisma schema: `jti String @unique`, `expiresAt DateTime`
- [ ] T025 [US2] Gerar migration para token_blacklist
- [ ] T026 [US2] Implementar `auth.service.ts` método `logout(token)`: adicionar jti à blacklist
- [ ] T027 [US2] Atualizar middleware para verificar blacklist antes de aceitar token
- [ ] T028 [US2] Implementar endpoint `POST /auth/logout` em controller
- [ ] T029 [US2] Adicionar logs e métricas para logout

**Checkpoint**: User Stories 1 E 2 funcionam independentemente ✅

---

## Phase 5: User Story 3 - Register (Priority: P2)

**Goal**: Novos usuários podem se registrar

**Independent Test**: Fazer POST /auth/register com dados válidos, verificar que usuário é criado e token é retornado

### Tests for User Story 3 ⚠️

- [ ] T030 [US3] Integration test para POST /auth/register (success) em `tests/integration/auth/register.spec.ts`
- [ ] T031 [US3] Integration test para email duplicado (deve falhar)
- [ ] T032 [US3] Integration test para senha fraca (deve falhar)

### Implementation for User Story 3

- [ ] T033 [US3] Implementar `auth.service.ts` método `register(email, password, name)`: validar email único, hashear senha, criar user, retornar token
- [ ] T034 [US3] Implementar endpoint `POST /auth/register` em controller
- [ ] T035 [US3] Adicionar validação de senha forte (min 8 chars)
- [ ] T036 [US3] Adicionar logs e métricas para registro

**Checkpoint**: Todas as user stories funcionam independentemente ✅

---

## Phase 6: E2E & Polish

**Purpose**: Testes de ponta a ponta e refinamentos

- [ ] T037 E2E test: Jornada completa Register → Login → Logout em `tests/e2e/auth-journeys.spec.ts`
- [ ] T038 [P] Adicionar documentação da API (Swagger/OpenAPI) para endpoints de auth
- [ ] T039 [P] Code cleanup e refactoring (se necessário)
- [ ] T040 Security review: verificar bcrypt config, JWT secret, rate limiting
- [ ] T041 Performance test: simular 1000 logins simultâneos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Setup - BLOQUEIA todas as user stories
- **User Stories (Phase 3-5)**: Dependem de Foundational
  - US1, US2, US3 podem ser feitas em paralelo (por pessoas diferentes)
  - Ou sequencialmente na ordem de prioridade: US1 → US2 → US3
- **E2E & Polish (Phase 6)**: Depende de todas as user stories desejadas

### Within Each User Story

- **Tests PRIMEIRO**: Escrever, garantir que falham, DEPOIS implementar
- **Service antes de Controller**: Lógica de negócio antes de endpoints
- **Logs e métricas**: Adicionar conforme implementa, não deixar para depois

### Parallel Opportunities

**Em Foundational (Phase 2):**
- T007 (hash.util), T008 (jwt.util), T009 (validation) podem rodar em paralelo

**Em US1 Tests:**
- T011, T012, T013 podem ser escritos em paralelo

**Entre User Stories:**
- US1, US2, US3 podem ser implementadas por pessoas diferentes simultaneamente

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Login está funcionando?
5. Deploy em staging e teste manual

### Incremental Delivery

1. Setup + Foundational → Foundation ready ✅
2. Add US1 (Login) → Test → Deploy → **MVP entregue!** 🎉
3. Add US2 (Logout) → Test → Deploy
4. Add US3 (Register) → Test → Deploy
5. Add E2E → Complete feature ✅

---

## Notes

- Sempre escrever testes ANTES (Test-First é NON-NEGOTIABLE)
- Commit após cada task ou grupo lógico
- Cada user story deve ser independentemente validável
- Use feature flags se deploying incrementalmente

**Este tasks.md serve como exemplo de breakdown executável e bem organizado.**

Use como referência ao criar seus próprios task breakdowns! 🚀

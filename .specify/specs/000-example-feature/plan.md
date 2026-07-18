# Implementation Plan: Sistema de Autenticação Simples

**Branch**: `000-example-feature` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)

> ⚠️ **NOTA**: Este é um exemplo didático. Use como referência para criar seus próprios plans.

## Summary

Implementar sistema de autenticação básico com login via email/senha, logout seguro, e registro de novos usuários. Abordagem: JWT para tokens, bcrypt para hash de senhas, rate limiting para segurança.

## Technical Context

**Language/Version**: Node.js 18+ com TypeScript 5.x  
**Primary Dependencies**: Express.js 4.x, Prisma 5.x, bcrypt 5.x, jsonwebtoken 9.x  
**Storage**: PostgreSQL 15+  
**Testing**: Jest para unit tests, Supertest para integration, Playwright para E2E  
**Target Platform**: Linux server (Docker container)  
**Performance Goals**: Login < 3s (p95), 1000 req/min suportados  
**Constraints**: Rate limiting em 5 tentativas/15min por IP  
**Scale/Scope**: MVP para até 10k usuários

## Constitution Check

✅ **SPEC VALIDATION**: Spec completa em `.specify/specs/000-example-feature/spec.md` com user stories priorizadas (P1/P2)

✅ **TEST-FIRST**: Testes definidos na spec:
- Unit: Validação de email, hash de senha, geração de JWT
- Integration: Fluxos de login, logout, registro
- E2E: Jornadas completas de usuário

✅ **SECURITY & PRIVACY**: 
- Senhas hasheadas com bcrypt (salt rounds = 12)
- JWT_SECRET em variável de ambiente
- Rate limiting para prevenir brute force
- Review de segurança necessário antes de merge

✅ **OBSERVABILITY**: 
- Métricas: auth.login.success/failure/duration, auth.rate_limit.blocked
- Logs estruturados para todas as operações de auth
- Backend team instrumenta, DevOps configura dashboards

✅ **VERSION & BRANCHING**: 
- Branch: `000-example-feature`
- Version: 0.1.0 → 0.2.0 (MINOR - nova funcionalidade)
- Sem breaking changes

## Project Structure

### Documentation (this feature)

```text
.specify/specs/000-example-feature/
├── spec.md              # Especificação completa
├── plan.md              # Este arquivo
├── tasks.md             # Breakdown de tarefas
└── data-model.md        # Schema do banco (opcional)
```

### Source Code (backend focus)

```text
backend/
├── src/
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.controller.ts      # Endpoints de login, logout, register
│   │       ├── auth.service.ts         # Lógica de negócio
│   │       ├── auth.middleware.ts      # Middleware de autenticação
│   │       ├── auth.validation.ts      # Validações (email, senha)
│   │       └── auth.types.ts           # Types/Interfaces
│   ├── models/
│   │   └── user.model.ts               # Prisma User model
│   └── utils/
│       ├── jwt.util.ts                 # Geração/validação JWT
│       ├── hash.util.ts                # Bcrypt helpers
│       └── ratelimit.util.ts           # Rate limiting logic
│
tests/
├── unit/
│   └── auth/
│       ├── hash.util.spec.ts
│       ├── jwt.util.spec.ts
│       └── auth.validation.spec.ts
├── integration/
│   └── auth/
│       ├── login.spec.ts
│       ├── logout.spec.ts
│       └── register.spec.ts
└── e2e/
    └── auth-journeys.spec.ts
```

## Complexity Tracking

> Nenhuma violação da constitution detectada. Plan está em conformidade.

## Implementation Approach

### Phase 1: Foundation (US1 - Login) 🎯 P1

**Goal**: Usuário pode fazer login com email e senha

**Technical Steps**:
1. Setup Prisma schema com model User
2. Criar migration para tabela users
3. Implementar hash.util.ts (bcrypt)
4. Implementar jwt.util.ts (jsonwebtoken)
5. Criar auth.validation.ts (email, senha)
6. Implementar auth.service.ts (login logic)
7. Criar auth.controller.ts (POST /auth/login)
8. Adicionar auth.middleware.ts (verify JWT)
9. Implementar rate limiting

### Phase 2: Logout (US2) 🔒 P2

**Goal**: Usuário pode fazer logout seguro

**Technical Steps**:
1. Implementar blacklist de tokens (Redis opcional ou DB)
2. Adicionar endpoint POST /auth/logout
3. Limpar token do client (sessionStorage)

### Phase 3: Register (US3) 📝 P2

**Goal**: Novos usuários podem se registrar

**Technical Steps**:
1. Adicionar validação de email único
2. Implementar endpoint POST /auth/register
3. Auto-login após registro (gerar token)

## Dependencies

- **External**: Express, Prisma, bcrypt, jsonwebtoken, express-rate-limit
- **Internal**: Nenhuma (primeira feature de auth)
- **Blocking**: Database setup deve estar completo antes de iniciar

## Testing Strategy

1. **Unit Tests**: Escrever primeiro para utils (hash, jwt, validation)
2. **Integration Tests**: Testar endpoints isoladamente
3. **E2E Tests**: Jornadas completas (register → login → logout)
4. **Manual Testing**: Validar UI no browser (se houver frontend)

## Security Considerations

- [ ] Bcrypt salt rounds configurado >= 12
- [ ] JWT_SECRET forte e único (>= 32 caracteres)
- [ ] Rate limiting ativo (5 tentativas/15min)
- [ ] HTTPS obrigatório em produção
- [ ] Mensagens de erro não revelam se email existe
- [ ] Validação de inputs em todos os endpoints

## Rollout Plan

1. Deploy em staging com feature flag `auth_enabled=false`
2. Testes manuais em staging
3. Security review
4. Feature flag `auth_enabled=true` em staging
5. Monitorar métricas por 24h
6. Deploy em production
7. Gradual rollout: 10% → 50% → 100%

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Tokens JWT roubados | Alto | Médio | Expiração curta (7 dias), HTTPS obrigatório |
| Brute force attack | Alto | Médio | Rate limiting, CAPTCHA após 3 falhas |
| Database down durante login | Médio | Baixo | Retry logic, circuit breaker |
| Migration quebra users existentes | Alto | Baixo | Backup antes da migration, rollback plan |

---

**Este plan serve como exemplo de estrutura e completude esperada.**

Use como referência ao criar seus próprios implementation plans! 🚀

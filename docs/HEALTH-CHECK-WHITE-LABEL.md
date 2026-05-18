# Health Check Automático - White Label

## Visão Geral

O health check automático valida a integridade operacional de cada marca em tempo real. Executado a cada carregamento da marca no painel, o sistema verifica consistências críticas e gera avisos/erros.

## Checagens Implementadas

### 1. Feature Flags
- **Status Pass**: Pelo menos 1 feature flag habilitada
- **Status Warn**: Nenhuma flag habilitada (marca vazia?)
- **Status Fail**: Erro ao carregar flags

**Por quê**: Uma marca sem flags não faz sentido operacionalmente.

### 2. Rollout & Publicação
- **Status Fail**: Rollout em "geral" sem nenhuma publicação registrada
- **Status Pass**: Rollout em "geral" COM publicação OU rollout ainda em fase piloto/grupo

**Por quê**: Colocar em "geral" sem publicação violaria o contrato de governança. Detecta violação de pré-requisitos.

### 3. Alertas Externos
- **Status Fail**: Alertas habilitados mas webhook_url vazio
- **Status Warn**: Último dispatch retornou erro
- **Status Pass**: Webhook configurado e pronto OU alertas desabilitados

**Por quê**: Detecta misconfiguração crítica que impediria alertas de funcionar.

### 4. Integridade de Métricas
- **Status Warn**: Mudanças registradas mas nenhuma flag ativa
- **Status Pass**: Métricas consistentes

**Por quê**: Pode indicar dados legados ou inconsistência no evento de flag.

## Status Geral

```
healthCheck.status: 'healthy' | 'warning' | 'critical'
```

- **Healthy**: Todos os checks passam
- **Warning**: Um ou mais checks retornam "warn"
- **Critical**: Um ou mais checks retornam "fail"

## UI no Painel

```tsx
// Renderizado na seção "Status de Saúde" no topo do painel
- Ícone com cor (verde/amarelo/vermelho)
- Label do status (Saudável/Aviso/Crítico)
- Timestamp da última execução
- Lista de checks com detalhes específicos
```

## Fluxo de Carregamento

```
1. Usuário seleciona marca
2. hydrateBrandFeatures() chamado
3. getWhiteLabelHealthCheck(brandId) async
4. Sistema retorna WhiteLabelHealthCheck com timestamp
5. UI renderiza section com status + checks
```

## Função Principal

```typescript
export async function getWhiteLabelHealthCheck(brandId: string): Promise<WhiteLabelHealthCheck>

// Retorna
{
  status: 'warning' | 'critical' | 'healthy',
  checks: [
    { name: 'Feature Flags', status: 'pass' | 'warn' | 'fail', message: string },
    { name: 'Rollout & Publicação', status: 'pass' | 'warn' | 'fail', message: string },
    { name: 'Alertas Externos', status: 'pass' | 'warn' | 'fail', message: string },
    { name: 'Integridade de Métricas', status: 'pass' | 'warn' | 'fail', message: string },
  ],
  timestamp: '2024-12-19T10:30:45.123Z'
}
```

## Extensões Futuras

- **Rate limiting**: Validar se webhook não está sendo bombardeado
- **Cache validation**: Comparar brand_settings contra cache
- **Audit trail**: Verificar lacunas na auditoria
- **Webhook reachability**: Testar conectividade antes de crítica
- **Event ordering**: Validar ordem cronológica da timeline

## Comportamento em Produção

- Health check roda silenciosamente durante hidratação
- Falhas não bloqueiam o painel; apenas renderizam na UI
- Status é **informativo** (não impede ações)
- Usuário pode ignorar avisos, mas recebe feedback claro

---

**Última atualização**: Fase 3 - Hardening Operacional Completo

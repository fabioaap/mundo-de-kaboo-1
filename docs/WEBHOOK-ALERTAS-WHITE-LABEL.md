# Webhook de Alertas - White Label

Data: 2026-04-27
Escopo: configuração operacional de destinos externos para alertas do painel White Label.

## Campos suportados

- `enabled`: ativa/desativa a automação externa.
- `webhook_url`: destino HTTP do alerta.
- `channel`: canal lógico de roteamento operacional.
- `changes_24h_threshold`: limite para alerta de alta taxa de mudanças.
- `notify_on_general_without_publish`: sinaliza rollout geral sem publicação.
- `updated_at`: última atualização da configuração.
- `last_reason`: motivo operacional da última alteração.
- `last_dispatch_at`: última tentativa de envio de teste.
- `last_dispatch_status`: resultado do último envio (`idle`, `success`, `error`).
- `last_dispatch_http_status`: status HTTP da última tentativa, quando houver.
- `last_dispatch_error`: mensagem de erro da última tentativa, quando houver.
- `last_live_alert_signature`: assinatura do último conjunto de alertas operacionais enviado automaticamente.
- `white_label_alerting_history`: últimas entregas registradas para homologação operacional.
- `mode`: diferencia dispatch de `test` e `live` no histórico.

## Estrutura persistida

A configuração é salva em `brand_settings.menu_config.white_label_alerting`.

## Payload de referência

```json
{
  "brand": {
    "id": "<brand-id>",
    "slug": "central-coruja",
    "name": "Central Coruja"
  },
  "rollout": {
    "wave": "pilot",
    "last_changed_at": "2026-04-27T12:00:00.000Z"
  },
  "metrics": {
    "enabled_flags": 2,
    "total_changes": 8,
    "changes_24h": 3,
    "last_publish_at": "2026-04-27T11:45:00.000Z"
  },
  "active_alerts": [],
  "destination": {
    "channel": "ops-central-coruja",
    "webhook_url": "[configured]"
  },
  "generated_at": "2026-04-27T12:05:00.000Z"
}
```

## Regras operacionais

- alterações de configuração exigem motivo;
- rollout `general` continua dependente de publicação prévia;
- preview do payload no painel serve para homologação do contrato antes do disparo real.
- o botão `Enviar teste de alerta` dispara um POST para o webhook configurado e persiste o resultado da tentativa.
- o dispatch de teste usa retry/backoff básico de até 3 tentativas e guarda histórico resumido das últimas entregas.
- o botão `Disparar alertas ativos` envia apenas quando houver alertas operacionais ativos, usando payload real de operação e registrando modo `live` no histórico.
- quando a automação externa está habilitada, o painel também faz auto-dispatch deduplicado ao detectar mudança material no conjunto de alertas ativos.
- o alerta crítico de rollout geral sem publicação só entra no fluxo externo quando `notify_on_general_without_publish` estiver habilitado.
- a timeline consolidada de eventos operacionais agrupa dispatch events, mudanças de flags, mudanças de rollout wave e publicações em uma visualização unificada e ordenada por timestamp.
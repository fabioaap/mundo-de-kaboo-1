# Spec Tecnico - Hero Parallax Central Coruja

Data: 2026-04-26
Status: pronto para implementacao
Escopo: adicionar profundidade visual na Home da marca Central Coruja, sem alterar a arquitetura de informacao e sem degradar performance no mobile.

## 1. Objetivo

Criar uma experiencia visual de marca no hero da Home com efeito de parallax em camadas, usando a gravura de floresta como base e sem elemento de coruja gigante adicional.

Resultado esperado:
- assinatura visual mais premium para Central Coruja;
- pagina continua legivel e rapida;
- comportamento controlado por configuracao de marca.

## 2. Onde entra no app

Ponto de integracao principal:
- `screens/HomeScreen.tsx` no bloco superior da home (area de cabecalho e busca).

Sem alterar:
- ordenacao de informacao, tabs, filtros, cards e navegacao.

## 3. Modelo de camadas

Camadas recomendadas (z-index baixo para alto):
1. bg-far
- gradiente + imagem base da floresta, movimento minimo.
2. bg-mid
- nevoa, luzes e folhagens, movimento medio.
3. bg-near
- particulas, glow e folhas proximas, movimento maior.
4. ui-content
- busca, tabs, chips, titulos, sempre estavel e sem deslocamento.

## 4. Regra de movimento

Movimento deve responder ao scroll vertical e opcionalmente ao ponteiro no desktop.

Valores iniciais:
- desktop:
  - far: fator 0.08
  - mid: fator 0.16
  - near: fator 0.26
- mobile:
  - far: fator 0.03
  - mid: fator 0.06
  - near: fator 0.10

Limites:
- deslocamento maximo por camada: 24px no desktop, 10px no mobile.
- nunca mover camada de conteudo (ui-content).

## 5. Performance e seguranca

Regras obrigatorias:
- animar apenas transform e opacity;
- usar requestAnimationFrame para leitura/aplicacao de movimento;
- evitar qualquer recalculo de layout em loop;
- pausar efeito quando tab ficar inativa;
- fallback estatico em hardware fraco.

Heuristica de fallback:
- deviceMemory <= 2 ou hardwareConcurrency <= 2 -> modo estatico.

Meta tecnica:
- manter 55-60fps em desktop moderno;
- manter fluidez no mobile sem travamentos perceptiveis.

## 6. Acessibilidade e conforto

- respeitar prefers-reduced-motion: reduce;
- quando reduce estiver ativo, renderizar visual estatico com mesma identidade;
- evitar movimento lateral agressivo e oscilacao brusca;
- transicoes suaves com easing de saida.

## 7. Configuracao no bootstrap white label

Adicionar no payload de marca:

```json
{
  "visual": {
    "heroParallax": {
      "enabled": true,
      "mode": "standard",
      "intensityDesktop": 1,
      "intensityMobile": 0.4,
      "pointerInfluence": 0.35,
      "disableOnReducedMotion": true,
      "disableOnLowPerf": true
    }
  }
}
```

Modos sugeridos:
- off
- subtle
- standard

## 8. Controles no Admin (white label)

Nova secao em `Admin > White Label > Experiencia Visual`:
- toggle: ativar parallax no hero;
- seletor de modo: subtle | standard;
- intensidade desktop: slider 0.4 a 1.2;
- intensidade mobile: slider 0.2 a 0.8;
- preview antes de publicar.

Governanca:
- salvar rascunho;
- publicar versao;
- auditar usuario, data, diff e motivo.

## 9. Fases de implementacao

Fase A - Prova de conceito local
- inserir 3 camadas no hero da Home;
- scroll parallax apenas, sem ponteiro;
- fallback por reduced-motion.

Fase B - Endurecimento
- adicionar throttle por requestAnimationFrame;
- adicionar deteccao low-performance;
- ajustar contraste do conteudo para legibilidade.

Fase C - Productizacao white label
- ligar parametros ao bootstrap de marca;
- expor controles no Admin;
- publicar com versao e rollback.

## 10. Critérios de aceite

Funcional:
- efeito aparece apenas quando marca habilita;
- Home continua com mesma IA e mesma ordem de elementos;
- modo off deixa hero estatico.

Qualidade:
- nao causar jank visivel no scroll mobile;
- sem regressao de usabilidade em busca/filtros;
- reduced-motion desliga animacao de forma confiavel.

Operacao:
- alteracao via Admin sem deploy;
- rollback para versao anterior em uma acao.

## 11. Riscos e mitigacoes

Risco 1: poluicao visual e perda de legibilidade
- Mitigacao: overlay escuro leve e QA de contraste no hero.

Risco 2: queda de performance em celular intermediario
- Mitigacao: intensidade reduzida no mobile e fallback automatico.

Risco 3: inconsistencia entre preview e producao
- Mitigacao: preview usar o mesmo resolver de bootstrap da runtime.

## 12. Checklist de implementacao imediata

- [ ] Criar componente `HeroParallaxBackdrop` isolado.
- [ ] Integrar no topo de `HomeScreen` sem alterar fluxo funcional.
- [ ] Adicionar suporte a `prefers-reduced-motion`.
- [ ] Adicionar parametros de `visual.heroParallax` no bootstrap.
- [ ] Criar controles no Admin para ligar/desligar e ajustar intensidade.
- [ ] Validar desktop e mobile com captura comparativa antes/depois.

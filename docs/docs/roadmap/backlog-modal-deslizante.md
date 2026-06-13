# Backlog — Modal deslizante (drill-down sem empilhar modais)

> Data: 13/06/2026
> Escopo: navegação Coleção → Livro → Player dentro de um único container, com slide
> Tipo: melhoria de UX (diferido) — não implementar durante a validação do MVP
> Status: 📋 Planejado / em backlog

---

## Problema

Pela [regra de Coleção × Artefatos](../architecture/colecao-artefatos), tocar num **livro**
dentro da coleção deve abrir **o modal do livro** (com Leitura/Áudio/Vídeo). Fazer isso abrindo
um **segundo modal por cima** do modal da coleção gera **modal-sobre-modal**:

- empilhamento de z-index e de overlays (escurecimento sobre escurecimento);
- "voltar" ambíguo (fecha qual modal?);
- sensação de profundidade perdida.

## Direção adotada — drill-down deslizante (padrão Apple iPad)

Em vez de empilhar, usar **um único container** (sheet/modal) com **pilha de navegação interna**:

- **Aprofundar** (coleção → livro → player): o próximo nível **desliza da direita pra esquerda**.
- **Voltar**: desliza de volta (esquerda pra direita), revelando o nível anterior.
- Header do container mostra o **breadcrumb/voltar** do nível atual.

É o comportamento de *push navigation* que a Apple usa em sheets no iPad (não modais
empilhados). Referências:
- Apple — Sheets vs Modals: https://medium.com/@designwithkabi/ux-drill-06-how-apple-uses-sheets-783f6d6be5a8
- WWDC22 — Explore navigation design for iOS: https://developer.apple.com/videos/play/wwdc2022/10001/
- Modern iOS Navigation Patterns: https://frankrausch.com/ios-navigation/

## Implementação sugerida (web/React)

- Um componente de **modal com pilha de níveis** (ex.: `["colecao", "livro", "player"]`).
- Transição **slide horizontal** com `framer-motion` (`AnimatePresence` + `initial/animate/exit`
  em `x`), direção dependente de avançar/voltar.
  - Guia: https://medium.com/@joeysuberu/modal-transition-animation-made-with-react-and-framer-motion-6dd2de36e996
- Acessibilidade: foco preso ao nível ativo; `Esc`/botão voltar = `pop`; gesto de arrastar (mobile).
- Reaproveitar os conteúdos já existentes (modal da coleção, modal do livro, players) como
  "telas" empilháveis dentro do container.

## Itens relacionados

- Correção funcional mínima (antes da UX completa): toque no livro da coleção **abre o modal do
  livro** (em vez de ir direto pro leitor) — pode ser entregue primeiro; o slide é o polimento.
- Ver [Regra de Negócio — Coleção × Artefatos](../architecture/colecao-artefatos).

# Especificação UX — BNCC no Filtro Mobile

> Data: 19/04/2026  
> Contexto: refinamento do filtro pedagógico da Home com foco em mobile  
> Escopo: descoberta e explicação de habilidades BNCC sem criar uma sessão BNCC dedicada

---

## 1. Decisão

O fluxo de BNCC deve continuar dentro da jornada de busca e filtros da Home, mas a interação mobile deixa de depender de chips de código expostos em massa.

### Decisão de produto

1. A Home continua sendo a superfície principal de descoberta.
2. A seção BNCC do filtro vira um seletor dedicado, não uma grade de dezenas de códigos.
3. A seleção da habilidade acontece direto na lista, com affordance visual clara no próprio card.
4. Não criar uma nova seção fixa de navegação chamada BNCC nesta fase.

### Razão

1. Reduz poluição visual na Home e no drawer de filtros.
2. Resolve desktop e mobile sem depender de hover como padrão principal.
3. Aproveita o lookup já existente em [mundo-de-kaboo-main/lib/bnccLookup.ts](mundo-de-kaboo-main/lib/bnccLookup.ts) e o dado estático em [mundo-de-kaboo-main/data/bncc-lookup.json](mundo-de-kaboo-main/data/bncc-lookup.json).
4. Mantém a interação leve para quem já chega sabendo o código ou reconhece a habilidade pelo texto humano.

---

## 2. Benchmarks que orientam a solução

### Referências consideradas

1. CommonLit: standards entram como filtro avançado, não como camada dominante da busca.
2. Newsela: seleção de standards em modal com Apply Filters e explicação separada da seleção principal.
3. OER Commons: filtros complexos ficam atrás de Open Filters no mobile.
4. PBS LearningMedia: explicação do standard aparece em uma segunda camada ligada ao recurso.
5. BrainPOP e Discovery Education: navegação hierárquica antes da lista de standards quando a taxonomia é extensa.

### Padrões de mercado confirmados

1. Standards curriculares não ficam expostos em massa na primeira camada mobile.
2. Mobile usa drawer, modal ou full-screen sheet para taxonomia complexa.
3. A explicação do código aparece sob demanda, não aberta por padrão.
4. Hover pode existir no desktop, mas não resolve sozinho a experiência.
5. A melhor camada principal no mobile é um seletor resumido com aplicação explícita.

---

## 3. Fluxo proposto

## 3.1. Nível 1, Home e filtro principal

No filtro principal da Home, a seção BNCC deixa de renderizar todos os códigos de imediato.

### Antes

1. O usuário vê uma grade de chips com códigos como `EF15LP03`, `EF15LP10`, `EI03EF03`.
2. No mobile, falta uma interação intuitiva para entender o significado do código.

### Depois

O usuário vê apenas uma linha de entrada para BNCC:

1. Título: `Habilidades BNCC`
2. Texto de apoio: `Procure por código, descrição ou componente`
3. Resumo de estado:
   1. `Nenhuma selecionada`
   2. `3 habilidades selecionadas`
4. Ação principal: tocar na linha inteira abre o seletor BNCC.

### Microcopy sugerida

**Título**  
Habilidades BNCC

**Apoio**  
Procure por código, descrição ou componente

**Estado vazio**  
Nenhuma selecionada

**Estado com seleção**  
3 habilidades selecionadas

### Comportamento

1. Tocar na linha abre uma tela cheia ou sheet dedicado de BNCC.
2. Não existe long press.
3. Não existe tooltip nessa camada.
4. O resumo da seleção substitui a grade extensa de códigos.

---

## 3.2. Nível 2, seletor BNCC em tela cheia

Essa é a superfície principal de seleção no mobile.

### Nome sugerido do componente

`BnccPickerSheet`

### Anatomia

1. Header com título e fechar.
2. Campo de busca.
3. Texto de apoio curto.
4. Filtros de afunilamento.
5. Lista de habilidades.
6. Rodapé fixo com ações.

### Header

**Título**  
Selecionar BNCC

**Subtítulo**  
Encontre habilidades por código ou pelo texto da habilidade

### Busca

**Placeholder**  
Ex.: EF15LP03, leitura, escuta

**Texto de apoio**  
Você pode buscar pelo código BNCC ou pela descrição da habilidade.

### Afuniladores

Antes da lista de habilidades, o usuário pode reduzir o universo por contexto.

1. Etapa
2. Componente
3. Faixa

### Exemplos de grupos

**Etapa**

1. Todos
2. Ed. Infantil
3. Fund I

**Componente**

1. Todos os componentes
2. Língua Portuguesa
3. Arte
4. Ciências

**Faixa**

1. Todas as faixas
2. 3 anos
3. 4 anos
4. 5 anos
5. 1º ano
6. 2º ano
7. 3º ano

### Regra

Se a busca textual já estiver forte, os filtros de afunilamento podem ser recolhíveis para reduzir densidade visual.

---

## 3.3. Nível 3, lista de habilidades BNCC

Cada item da lista deve priorizar linguagem humana em vez de código puro.

### Estrutura do item

1. Título humano da habilidade.
2. Linha secundária com código, componente e ano.
3. Área de seleção em toda a linha.

### Exemplo real

**Linha principal**  
Localizar informações explícitas em textos.

**Linha secundária**  
EF15LP03 • Língua Portuguesa • 1º ao 5º ano

Exemplos válidos do lookup atual:

1. `EF15LP03`: Localizar informações explícitas em textos.
2. `EF15LP10`: Escutar, com atenção, falas de professores e colegas, formulando perguntas pertinentes ao tema e solicitando esclarecimentos sempre que necessário.
3. `EI03EF03`: Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas.

### Regras de interação do item

1. Tocar na linha principal seleciona ou remove a habilidade.
2. Selecionar não fecha a tela.
3. Múltiplas habilidades podem ser marcadas antes de aplicar.

### Estado visual do item

1. Estado padrão: fundo branco, tipografia neutra.
2. Estado selecionado: check visível, borda forte, leve realce de fundo.
3. Estado pressionado: escala sutil, até `0.98`.

---

## 3.4. Conteúdo e profundidade no MVP

No MVP, o picker de BNCC não tem segundo nível de navegação.

### Decisão

1. A lista do picker concentra busca, leitura rápida e seleção.
2. O card já mostra código, descrição e metadados suficientes para decidir.
3. O aprofundamento pedagógico mais amplo continua existindo no detalhe da coleção, onde o usuário já está em modo de compreensão, não de filtro.
4. Se surgir necessidade real de expansão futura, a evolução preferencial é accordion inline, nunca uma nova overlay dentro da sheet.

### Regra

1. Continua proibido abrir um segundo modal dentro do picker.
2. Não existe navegação lista -> detalhe dentro da mesma sheet nesta versão.
3. A busca e a seleção acontecem na mesma superfície, sem clique intermediário.

---

## 3.5. Rodapé fixo do seletor BNCC

O seletor BNCC precisa de um footer fixo, previsível e sempre visível.

### Botões

1. Secundário: `Limpar`
2. Primário: `Aplicar 3 habilidades`

### Estados do CTA primário

1. `Aplicar filtros`, quando não houver itens selecionados.
2. `Aplicar 1 habilidade`, quando houver uma.
3. `Aplicar 3 habilidades`, quando houver várias.

### Regras

1. A seleção só é confirmada para o filtro principal quando o usuário toca em Aplicar.
2. Fechar sem aplicar descarta mudanças temporárias, a menos que a implementação escolha autosave local do draft.

---

## 4. Regras de UX e acessibilidade

### O que fazer

1. Usar full-screen sheet no mobile para taxonomia extensa.
2. Usar hover card ou tooltip no desktop apenas como atalho, não como solução principal.
3. Mostrar texto humano primeiro, código depois.
4. Garantir que a própria linha seja autoexplicativa o suficiente para suportar a seleção.
5. Garantir áreas de toque generosas, com pelo menos 44x44.

### O que evitar

1. Não usar long press.
2. Não depender de hover no mobile.
3. Não exibir dezenas de chips com códigos puros na primeira camada.
4. Não empilhar modal sobre modal para explicar uma habilidade durante o filtro.
5. Não abrir uma nova seção BNCC fixa na navegação agora.

### Acessibilidade

1. O header e o footer fixos não podem comprometer rolagem ou leitura do conteúdo.
2. O estado selecionado precisa ser visível por cor e ícone, não só por cor.
3. Cada linha precisa ser inteira clicável e semanticamente consistente para teclado e leitor de tela.

---

## 5. Mapeamento para o código atual

### Superfícies já existentes

1. Filtro principal da Home em [mundo-de-kaboo-main/screens/HomeScreen.tsx](mundo-de-kaboo-main/screens/HomeScreen.tsx).
2. Lookup BNCC em [mundo-de-kaboo-main/lib/bnccLookup.ts](mundo-de-kaboo-main/lib/bnccLookup.ts).
3. Dados estáticos BNCC em [mundo-de-kaboo-main/data/bncc-lookup.json](mundo-de-kaboo-main/data/bncc-lookup.json).
4. Padrão atual de explicação rica no detalhe em [mundo-de-kaboo-main/screens/DetailsScreen.tsx](mundo-de-kaboo-main/screens/DetailsScreen.tsx).

### Áreas que devem ser tocadas na implementação

1. [mundo-de-kaboo-main/screens/HomeScreen.tsx](mundo-de-kaboo-main/screens/HomeScreen.tsx): trocar a grade atual de chips BNCC por uma entrada-resumo e integrar o seletor dedicado.
2. [mundo-de-kaboo-main/components](mundo-de-kaboo-main/components): criar os componentes de sheet e lista, se o time optar por extrair da HomeScreen.
3. [mundo-de-kaboo-main/design-system](mundo-de-kaboo-main/design-system): opcionalmente consolidar padrão reutilizável de full-screen sheet e rich info sheet.

---

## 6. Proposta de componentes

### Componentes novos

1. `BnccFilterEntry`
2. `BnccPickerSheet`
3. `BnccResultRow`
4. `BnccSelectionSummary`

### Responsabilidades

**BnccFilterEntry**

1. Renderiza a linha-resumo dentro do modal de filtros.
2. Mostra estado vazio ou quantidade selecionada.
3. Abre o seletor BNCC.

**BnccPickerSheet**

1. Controla busca, afuniladores e seleção temporária.
2. Renderiza a lista de habilidades com seleção direta.
3. Aplica ou descarta mudanças.

**BnccResultRow**

1. Mostra título humano e metadados.
2. Expõe o estado selecionado já no primeiro nível.
3. Expõe o estado selecionado sem depender de hover.

**BnccSelectionSummary**

1. Resume seleção já aplicada no filtro principal.
2. Exibe até dois códigos e um agregador, por exemplo `+3`.

---

## 7. Microcopy consolidada

### Entrada da seção BNCC

**Título**  
Habilidades BNCC

**Apoio**  
Procure por código, descrição ou componente

**Estado vazio**  
Nenhuma selecionada

**Estado preenchido**  
3 habilidades selecionadas

### Tela cheia

**Título**  
Selecionar BNCC

**Subtítulo**  
Encontre habilidades por código ou pelo texto da habilidade

**Placeholder**  
Ex.: EF15LP03, leitura, escuta

**Apoio**  
Você pode buscar pelo código BNCC ou pela descrição da habilidade.

**Empty state**  
Nenhuma habilidade encontrada  
Tente outro código, componente ou palavra-chave.

### Nota de produto

No MVP, o picker resolve a seleção no próprio card. O contexto pedagógico mais completo permanece no detalhe da coleção.

---

## 8. Critérios de aceite

1. A Home continua limpa, sem grade extensa de códigos BNCC visíveis no mobile.
2. O usuário consegue abrir a seleção BNCC com um único toque na seção BNCC do filtro.
3. O usuário consegue buscar por código e por descrição.
4. O usuário consegue reduzir a lista por etapa, componente e faixa.
5. O usuário consegue selecionar ou remover uma habilidade direto no primeiro card, sem abrir uma segunda visão.
6. O usuário consegue selecionar múltiplas habilidades e aplicar de uma vez.
7. O estado selecionado volta resumido para o filtro principal.
8. Em desktop, a experiência continua compatível com hover ou clique sem quebrar mobile.

---

## 9. Tarefas sugeridas

### Fase 1, MVP funcional

1. Substituir a grade de chips BNCC por `BnccFilterEntry` no modal de filtros da Home.
2. Implementar `BnccPickerSheet` com busca textual.
3. Integrar `lookupBncc` à lista de resultados.
4. Adicionar seleção direta nos cards, com check visível e card inteiro clicável.
5. Adicionar seleção múltipla com CTA Aplicar.
6. Voltar a seleção resumida para o filtro principal.

### Fase 2, compreensão e refinamento

1. Adicionar filtros por etapa, componente e faixa.
2. Melhorar resumo da seleção com códigos e agregador.
3. Validar rolagem, foco e comportamento de fechamento no mobile.
4. Se necessário, testar accordion inline em desktop e mobile sem mudar o modelo mental principal.

### Fase 3, polish e consistência

1. Reaproveitar o mesmo padrão para CASEL, se fizer sentido.
2. Uniformizar desktop e mobile com o mesmo modelo mental.
3. Medir se existe demanda real por uma superfície de aprofundamento futura, como glossário BNCC consultivo.

---

## 10. Fora de escopo por enquanto

1. Criar uma nova seção fixa de navegação chamada BNCC.
2. Exibir descrições longas da BNCC abertas dentro do filtro principal.
3. Implementar long press como affordance principal.
4. Transformar BNCC em CMS manual no backoffice.

---

## 11. Próximo passo recomendado

Antes de codar, alinhar este documento com produto e UX e validar três decisões objetivas:

1. A seleção BNCC confirma com botão Aplicar ou salva automaticamente.
2. O afunilamento por etapa e componente entra já no MVP ou na segunda fase.
3. A mesma arquitetura será usada depois para CASEL ou ficará exclusiva da BNCC.

# JTBD — Testes de Usabilidade Visual

> Guia completo: cada JTBD mapeado com teste visual correspondente
> 
> Data: 15/05/2026 | Base: Consolidado 15/04/2026 + Delta 18/04/2026

---

## 🔐 AUTENTICAÇÃO & ACESSO (5 JTBD)

### JTBD 1.1: Fazer login com e-mail + senha
**Status**: ✅ Implementado  
**User Story**: US-005

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Abrir app em estado deslogado | Tela LoginScreen exibida com campos visíveis |
| 2 | Verificar campo E-mail | Input com placeholder "seu@email.com", ícone Mail visível |
| 3 | Verificar campo Senha | Input mascarado, ícone Lock visível, toggle mostrar/ocultar |
| 4 | Inserir dados válidos | Campos preenchidos, botão "Entrar" habilitado (cor destaque) |
| 5 | Clicar "Entrar" | Loading spinner visível, transição suave |
| 6 | Validar sucesso | Redirecionamento para HomeScreen, perfil carregado no topo |
| 7 | Testar erro | Campo erro em vermelho, mensagem abaixo do input com ícone alerta |
| 8 | Testar validação visual | Botão desabilitado (cinza) quando campos vazios |

**Dispositivos**: Desktop (1440×900), Mobile (375×667), Tablet (768×1024)

**Checklist de Design**:
- ☐ Inputs com focus state (border azul, shadow)
- ☐ Placeholder visível mas leve
- ☐ Ícones alinhados à esquerda do input
- ☐ Mensagem de erro em tom vermelho (#EF4444)
- ☐ Botão primário com hover (escurece) e active (aprofunda)
- ☐ Loader centralizado com animação suave

---

### JTBD 1.2: Resgatar código de acesso (voucher)
**Status**: ✅ Implementado  
**User Story**: US-009

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na LoginScreen, clicar "Inserir código de acesso" | Transição para RegisterScreen |
| 2 | Verificar campos do formulário | Nome, E-mail, Senha, Código de acesso visíveis |
| 3 | Verificar campo Código | Input com máscara (XXXX-XXXX-XXXX), placeholder claro |
| 4 | Inserir código válido | Campo muda cor para verde (ou badge ✓) |
| 5 | Inserir código inválido | Campo bordas vermelhas, mensagem de erro clara |
| 6 | Clicar "Continuar" | Validação visual do código antes de submeter |
| 7 | Após resgate | Badge "Acesso até [data]" exibido no perfil |
| 8 | Testar em mobile | Teclado numérico surge, input adaptado, sem sobreposição |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Input com máscara visualmente clara
- ☐ Badge de sucesso com ícone ✓ em verde
- ☐ Mensagem de erro alinhada com input
- ☐ Tooltip com texto "Código encontrado no seu e-mail ou cartão"
- ☐ Botão desabilitado até código válido

---

### JTBD 1.3: Renovar acesso pós-expiração
**Status**: ✅ Implementado  
**User Story**: US-010

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Logar com usuário com acesso expirado | Redirecionamento para AccessExpiredScreen |
| 2 | Verificar layout | Mensagem grande "Acesso Expirado", data clara |
| 3 | Verificar botões | "Renovar com código" e "Entrar em contato" visíveis |
| 4 | Clicar "Renovar" | Modal abre com campo de código (mesmo de JTBD 1.2) |
| 5 | Inserir novo código | Validação visual, badge de sucesso |
| 6 | Confirmar | Redirect para Home, nova data de expiração visível |
| 7 | Testar feedback | Mensagem toast "Acesso renovado até [data]" |
| 8 | Testar visual de urgência | Ícone ⚠️ ou cor destacada (laranja/vermelho) |

**Dispositivos**: Desktop, Mobile

**Checklist de Design**:
- ☐ Fundo com cor de alerta (tom laranja/vermelho suave)
- ☐ Tipografia grande e legível (h2)
- ☐ Data em destaque (bold, maior)
- ☐ Botões com spacing adequado
- ☐ Modal com backdrop (overlay dark)
- ☐ Toast notification no topo com auto-dismiss

---

### JTBD 1.4: Confirmar e-mail para segurança
**Status**: ✅ Implementado  
**User Story**: US-005 (após cadastro)

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Após cadastro com novo e-mail | Modal exibindo "Confirme seu e-mail" |
| 2 | Verificar layout | Ícone Mail, mensagem clara, CTA "Enviar código" |
| 3 | Clicar "Enviar código" | Button state muda para "Reenviando..." |
| 4 | Inserir código | Input para 6 dígitos, mascarado |
| 5 | Validar código | Cor verde quando correto, vermelho se errado |
| 6 | Após confirmação | Modal fecha, toast "E-mail confirmado" |
| 7 | Verificar timeout | Se código expirado, mensagem clara com "Reenviar" |
| 8 | Testar em mobile | Input sem overflow, botões respeitam thumb zone |

**Dispositivos**: Desktop, Mobile

**Checklist de Design**:
- ☐ Ícone Mail animado (suave)
- ☐ Countdown timer visível (se houver)
- ☐ Input com 6 campos separados (UX comum)
- ☐ Focus automático entre campos
- ☐ Mensagens de erro/sucesso em tom certo (vermelho/verde)

---

### JTBD 1.5: Fazer login com Educa Cross (SSO)
**Status**: 🔴 Ausente (v1.3)  
**User Story**: US-008

#### Teste de Usabilidade Visual *(Protótipo para v1.3)*
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na LoginScreen | Botão "Entrar com Educa Cross" abaixo do formulário |
| 2 | Verificar botão | Logo Educa Cross visível, botão destaque (azul/marca) |
| 3 | Clicar botão | Transição suave, loader, possível redirecionamento |
| 4 | Validar retorno | Modal/popup oauth (se web) ou deep link (se app) |
| 5 | Após autenticação | Redirect para Home com perfil pré-preenchido |
| 6 | Testar em mobile | Botão com altura thumb-friendly (48px+) |
| 7 | Verificar fallback | Se SSO falhar, mensagem clara com CTA secundária |
| 8 | Testar estado deslogado | Link "Fazer login com Educa Cross" disponível |

**Dispositivos**: Desktop, Mobile

**Checklist de Design** *(protótipo)*:
- ☐ Logo Educa Cross com qualidade e spacing
- ☐ Cor de marca da Educa Cross consistente
- ☐ Separação visual entre "Email/Senha" e "SSO"
- ☐ Loader customizado (marca)
- ☐ Mensagem de erro em tom neutro/informativo

---

## 🎯 DESCOBERTA DE CONTEÚDO (6 JTBD)

### JTBD 2.1: Navegar home com descoberta curada
**Status**: ✅ Implementado  
**User Story**: US-026 (Busca unificada), vitrine

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Após login bem-sucedido | HomeScreen carrega com hero parallax |
| 2 | Verificar hero | Background com padrão parallax, tema dinâmico (via personagem) |
| 3 | Verificar grid de coleções | Cards em grid 2 colunas (mobile), 3-4 (desktop) |
| 4 | Verificar card individual | Imagem de capa, título, sinopse breve, badge segmento |
| 5 | Verificar badge kit/livro | Distinção visual clara (ícone + label) |
| 6 | Scroll down | Parallax mantém velocidade reduzida (efeito profundidade) |
| 7 | Testar lazy load | Cards carregam progressivamente, skeleton visível |
| 8 | Verificar menu nav | BottomNav (mobile) ou sidebar (desktop) acessível |

**Dispositivos**: Desktop (1440×900), Mobile (375×667), Tablet (768×1024)

**Checklist de Design**:
- ☐ Hero com imagem de fundo nítida, sem text overflow
- ☐ Parallax suave (velocity 0.5-0.7)
- ☐ Grid cards com gap consistente (16px)
- ☐ Skeleton loader cinza (não muito escuro)
- ☐ Badge com ícone + label (ex: 🎁 Kit)
- ☐ Hover effect em card (lift, shadow)
- ☐ Menu nav com icons + labels

---

### JTBD 2.2: Buscar por texto unificado
**Status**: ✅ Implementado  
**User Story**: US-026

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na HomeScreen | Barra de busca visível no topo (inline ou topo do hero) |
| 2 | Verificar input | Placeholder "Buscar por título, personagem..." visível |
| 3 | Clicar input | Focus state, cursor visível, teclado surge (mobile) |
| 4 | Digitar texto | Resultados aparecem progressivamente (sem delay > 200ms) |
| 5 | Verificar resultados | Grid filtrada exibida abaixo/ao lado da barra |
| 6 | Query com poucos resultados | Mensagem "Nenhum resultado encontrado" com ícone sugestivo |
| 7 | Limpar busca | X botão limpa, volta grid original |
| 8 | Busca case-insensitive | "kaboo" = "Kaboo" = "KABOO" retorna resultado |
| 9 | Testar em mobile | Input adaptado, teclado não sobrepõe resultados |
| 10 | Verificar highlight | Termo buscado destacado nos títulos (opcional, nice-to-have) |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Input com lupa icon alinhada
- ☐ Clear (X) button só aparece com conteúdo
- ☐ Transition suave entre estado vazio e com resultados
- ☐ Resultados em tempo real (debounce ~300ms)
- ☐ Mensagem "Nenhum resultado" com ícone (🔍 ou 😢)
- ☐ Spacing dos resultados consistente
- ☐ Testar com queries longas (overflow no input)

---

### JTBD 2.3: Filtrar por ano escolar
**Status**: ✅ Parcial (sort implementado, filtro avançado pendente)  
**User Story**: US-025

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na HomeScreen | Chips de anos escolares visíveis abaixo/ao lado da busca |
| 2 | Verificar chips | "Educação Infantil", "1º ao 5º", "6º ao 9º", "Ensino Médio" |
| 3 | Clicar em um chip | Chip ativa (cor de fundo, texto destacado) |
| 4 | Validar grid | Grid filtra em tempo real, apenas coleções do ano selecionado |
| 5 | Multi-select (se implementado) | Múltiplos chips ativos, grid intersecção |
| 6 | Desativar filtro | Clicar chip ativo desativa, grid volta ao original |
| 7 | Combinar com busca | Filtro + busca funcionam juntos |
| 8 | Verificar estado | Estado de filtro salvo (durante sessão ou permanente) |
| 9 | Testar mobile | Chips em horizontal scroll (não quebram layout) |
| 10 | Verificar badges | Badge "3 selecionados" (se multi-select) |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Chips com background claro, border sutil
- ☐ Chip ativo com cor de marca (azul/primária)
- ☐ Transição suave de cor
- ☐ Spacing entre chips (8-12px)
- ☐ Overflow em mobile: horizontal scroll ou wrap
- ☐ Badge com contador (ex: "3")
- ☐ Clear all filter button (se multi-select)

---

### JTBD 2.4: Filtrar por personagem
**Status**: ✅ Implementado  
**User Story**: US-027

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na HomeScreen | Seção "Filtrar por Personagem" com avatares |
| 2 | Verificar avatares | 6-8 personagens com fotos/ícones, nomes abaixo |
| 3 | Avatar design | Circular, 56-64px, border sutil, shadow suave |
| 4 | Clicar personagem | Avatar ativa (ring border em cor de marca) |
| 5 | Validar grid | Grid filtra para apenas coleções com essa personagem |
| 6 | Múltiplos personagens | Vários avatares podem estar ativos (ou single-select) |
| 7 | Reset | Clicar avatar ativo desativa, volta grid original |
| 8 | Combinar filtros | Personagem + ano escolar funcionam juntos |
| 9 | Mobile layout | Avatares em scroll horizontal ou grid adaptável |
| 10 | Testar tooltip | Hover em avatar exibe nome completo (desktop) |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Avatares circular com qualidade de imagem (96x96 mín)
- ☐ Ring border ao ativar (3-4px, cor de marca)
- ☐ Nome legível abaixo do avatar (12-14px)
- ☐ Tooltip na hover (desktop) com nome completo
- ☐ Spacing entre avatares (12-16px)
- ☐ Overflow mobile: horizontal scroll smooth
- ☐ Loading skeleton enquanto avatares carregam

---

### JTBD 2.5: Filtrar por segmento/nível
**Status**: ✅ Implementado (Delta: rename `Nível` → `Segmento`)  
**User Story**: US-025, ISS-03

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Verificar rótulo | "Segmento" exibido (não "Nível") |
| 2 | Verificar opções | "E.F. Anos Iniciais" (não "Fundamental I") |
| 3 | Verificar segmentos | "Educação Infantil", "E.F. Anos Iniciais", "E.F. Anos Finais", "Ensino Médio" |
| 4 | Clicar segmento | Chip ou dropdown ativa, grid filtra |
| 5 | Validar intersecção | Multi-segmento (se ativo): coleções em múltiplos segmentos |
| 6 | Verificar badge | Badge "Multissegmento" (se coleção aplica a múltiplos) |
| 7 | Desativar filtro | Grid volta ao original |
| 8 | Combinar com outros filtros | Segmento + personagem + busca funcionam juntos |
| 9 | Mobile layout | Chips adaptados ou dropdown |
| 10 | Testar retraçamento | Label correto em todo o app (detalhe, CMS, etc) |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Rótulo atualizado globalmente ("Segmento", não "Nível")
- ☐ Opções com nomes corretos ("E.F. Anos Iniciais", não "Fundamental I")
- ☐ Chips com cor por segmento (opcional, nice-to-have)
- ☐ Transição suave
- ☐ Badge "Multissegmento" visível se aplicável
- ☐ Dropdown arrow (se dropdown) com rotação suave

---

### JTBD 2.6: Explorar coleção específica
**Status**: ✅ Implementado  
**User Story**: US-011, US-012

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na HomeScreen, clicar em card | Transição para DetailScreen |
| 2 | Verificar hero | Imagem de capa grande (full-width), título sobreposto |
| 3 | Verificar informações | Sinopse, segmento badge, personagens, icons de recursos |
| 4 | Verificar badges | "Kit" ou "Livro" exibido com ícone claro |
| 5 | Scroll content | Informações pedagógicas (BNCC, CASEL) abaixo |
| 6 | Verificar grid de recursos | Botões para Leitura, Áudio, Vídeo, Materiais (adaptive) |
| 7 | Botão desabilitado | Se recurso sem arquivo, botão cinza com ícone 🔒 |
| 8 | Back button | Navegação de volta funciona, scroll position preservado (nice-to-have) |
| 9 | Testar mobile | Layout adaptado, sem overflow, toque responsivo |
| 10 | Verificar loading | Imagens carregam progressivamente, skeleton visível |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Hero imagem com height 220-240px (mobile), 300-360px (desktop)
- ☐ Título com shadow/gradient overlay (legibilidade)
- ☐ Badge "Kit" ou "Livro" posicionado no topo-direito
- ☐ Sinopse em font 14-16px (mobile), max-width 600px (desktop)
- ☐ Grid de botões com 4-6 colunas adaptável
- ☐ Botão desabilitado com opacidade 0.5 e cursor not-allowed
- ☐ Spacing entre seções (24-32px)
- ☐ Back button com ícone + text (mobile) ou ícone (desktop)

---

## 📖 CONSUMO DE CONTEÚDO (5 JTBD)

### JTBD 3.1: Ler flipbook (modo visual)
**Status**: ✅ Implementado  
**User Story**: US-013

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen, clicar "Leitura" | BookReaderScreen carrega com página 1 |
| 2 | Verificar página | PDF/livro renderizado full-screen sem overflow |
| 3 | Verificar controles | Setas de navegação (< >) ou gestos de swipe |
| 4 | Clicar seta | Página muda com transição suave (fade/slide) |
| 5 | Verificar counter | "Página 5 de 120" ou similar visível |
| 6 | Testar zoom | Pinch-zoom (mobile) ou zoom button (desktop) |
| 7 | Testar modo texto | Toggle "Modo Texto" (nova feature ISS-13) |
| 8 | Bookmarks (future) | Heart/bookmark icon para marcar página |
| 9 | Fullscreen | Button para expandir (mobile: landscape) |
| 10 | Exit | Back button para voltar ao detalhe |

**Dispositivos**: Mobile (landscape), Tablet (landscape), Desktop

**Checklist de Design**:
- ☐ PDF renderizado nítido (sem blur/distorção)
- ☐ Setas de navegação grandes e tappable (44-48px)
- ☐ Counter visível (topo/rodapé, contraste)
- ☐ Zoom button com ícone lupa clara
- ☐ Transição suave entre páginas (100-200ms)
- ☐ Modo fullscreen remove header/footer (mobile)
- ☐ Toggle "Modo Texto" com ícone de texto visível

---

### JTBD 3.2: Ler flipbook (modo texto) — NOVO
**Status**: ✅ Implementado (Delta ISS-13)  
**User Story**: US-013 (evolved)

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No BookReaderScreen, clicar toggle "Modo Texto" | Layout muda para texto fluido |
| 2 | Verificar tipografia | Fonte legível (16-18px), contraste suficiente |
| 3 | Verificar spacing | Line-height adequado (1.5-1.8), margin entre parágrafos |
| 4 | Verificar zoom | Aumenta/diminui tamanho da fonte (A+/A-) |
| 5 | Testar scroll | Conteúdo scrollável vertically, sem horizontal overflow |
| 6 | Voltar modo visual | Toggle de volta, volta à página anterior |
| 7 | Testar mobile | Texto adaptado à largura, sem cut-off |
| 8 | Verificar alinhamento | Texto justificado ou left-aligned (conforme design) |
| 9 | Dark mode (optional) | Se existir, modo texto respeita tema escuro |
| 10 | Performance | Transição suave, sem lag |

**Dispositivos**: Mobile (portrait/landscape), Tablet, Desktop

**Checklist de Design**:
- ☐ Toggle com ícone de livro (visual) e ícone de texto
- ☐ Tipografia base 16px, zoom range 14-24px
- ☐ Line-height 1.6
- ☐ Contraste WCAG AA (4.5:1 mínimo)
- ☐ Padding horizontal 16-24px (mobile), 40px (desktop)
- ☐ Margin entre parágrafos (0.5em)
- ☐ A+/A- buttons com tamanho thumb-friendly

---

### JTBD 3.3: Ouvir contação de história em áudio
**Status**: ✅ Implementado  
**User Story**: US-014

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen, clicar "Contação da História" | AudioPlayerScreen carrega com player visível |
| 2 | Verificar visualização | Artwork grande (200-300px), título, artista |
| 3 | Verificar player controls | Play/pause button, seta anterior, próxima (se múltiplas) |
| 4 | Clicar play | Ícone muda para pause, áudio inicia |
| 5 | Verificar timeline | Barra de progresso mostra tempo atual / duração |
| 6 | Drag timeline | Drag funciona, áudio salta para novo tempo |
| 7 | Verificar volume | Volume slider visível ou button (mobile) |
| 8 | Verificar speed (optional) | 0.75x, 1x, 1.25x, 1.5x (nice-to-have) |
| 9 | Fullscreen | Button para expandir (mobile) |
| 10 | Exit | Back button para voltar |

**Dispositivos**: Mobile, Tablet, Desktop

**Checklist de Design**:
- ☐ Artwork com qualidade (240px mín, sem pixelação)
- ☐ Play/pause button grande (56-64px)
- ☐ Player controls com ícones claros
- ☐ Timeline barra com track color clara
- ☐ Tempo em formato MM:SS legível (14-16px)
- ☐ Volume slider com ícone speaker
- ☐ Color accent em play (verde/marca)
- ☐ Smooth transitions (100-150ms)

---

### JTBD 3.4: Assistir vídeo regular
**Status**: ✅ Implementado  
**User Story**: US-015

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen, clicar "Desenho Animado" | VideoPlayerScreen carrega |
| 2 | Verificar player | Vídeo renderizado full-width, aspect ratio preservado |
| 3 | Verificar controls | Play/pause, timeline, volume, fullscreen, subtitle (se houver) |
| 4 | Play automático (optional) | Se ativado, vídeo inicia ao carregar |
| 5 | Clicar play | Ícone muda para pause, vídeo inicia |
| 6 | Drag timeline | Seek funciona, vídeo salta para novo tempo |
| 7 | Fullscreen (mobile) | Player expande, landscape automático |
| 8 | Testar loading | Buffering visível com spinner |
| 9 | Quality selector (optional) | 360p/720p/1080p dropdown |
| 10 | Exit | Back button para voltar |

**Dispositivos**: Mobile (landscape), Tablet, Desktop

**Checklist de Design**:
- ☐ Player aspect ratio 16:9 (ou conforme vídeo)
- ☐ Controls bar com semi-transparent background
- ☐ Play button grande e centrado
- ☐ Timeline com visual de progresso (cor de marca)
- ☐ Tempo em formato MM:SS
- ☐ Fullscreen button com ícone claro
- ☐ Volume slider responsivo
- ☐ Loader spinner durante buffering
- ☐ Qualidade de vídeo nítida (sem compression artifacts)

---

### JTBD 3.5: Assistir vídeo com Libras
**Status**: 🔴 Ausente (v1.3)  
**User Story**: US-016

#### Teste de Usabilidade Visual *(Protótipo para v1.3)*
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Botão "Assistir com Libras" exibido (se vídeo existe) |
| 2 | Verificar ícone | Ícone de linguagem gestual clara (ex: 🤟) |
| 3 | Clicar botão | VideoPlayerScreen com layout de Libras |
| 4 | Verificar layout | Vídeo principal + vídeo interprete (PiP - Picture-in-Picture) |
| 5 | PiP posição | Interprete no canto (top-right ou bottom-right) |
| 6 | PiP tamanho | ~25-30% da tela (móvel), ~20% (desktop) |
| 7 | Testar resize | Arrastar/redimensionar PiP (desktop - nice-to-have) |
| 8 | Testar fullscreen | PiP mantém-se visível mesmo em fullscreen |
| 9 | Testar controls | Play/pause/timeline funcionam normalmente |
| 10 | Exit | Back button para voltar |

**Dispositivos**: Mobile (landscape), Tablet, Desktop

**Checklist de Design** *(protótipo)*:
- ☐ Ícone de Libras claro e reconhecível
- ☐ Badge "Com Libras" ao lado do botão
- ☐ PiP com border sutil (1-2px)
- ☐ PiP com shadow suave
- ☐ Contraste entre vídeo principal e PiP
- ☐ PiP não obstrui legendas (se houver)
- ☐ Responsivo em todos os devices

---

### JTBD 3.6: Assistir conteúdo animado/IA
**Status**: 🔴 Ausente (v1.3)  
**User Story**: US-017

#### Teste de Usabilidade Visual *(Protótipo para v1.3)*
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Botão "Desenho Animado" exibido (se vídeo existe) |
| 2 | Verificar ícone | Ícone de animação clara (ex: ✨ ou 🎬) |
| 3 | Badge "Novo" ou "IA" | Diferencia do vídeo regular |
| 4 | Clicar botão | VideoPlayerScreen carrega animação |
| 5 | Testar play | Animação inicia sem delay excessivo |
| 6 | Verificar qualidade | Renderização suave, sem stuttering |
| 7 | Testar fullscreen | Landscape automático (mobile) |
| 8 | Testar timeline | Seek funciona normalmente |
| 9 | Verificar metadata | Duração e resolução corretas |
| 10 | Exit | Back button funciona |

**Dispositivos**: Mobile (landscape), Tablet, Desktop

**Checklist de Design** *(protótipo)*:
- ☐ Ícone diferenciado de animação
- ☐ Badge "Novo" ou "IA" sutil (não invasivo)
- ☐ Player idêntico ao vídeo regular (consistência)
- ☐ Cor de fundo contrasta com artwork
- ☐ Performance otimizada (sem lag)
- ☐ Qualidade de vídeo nítida

---

### JTBD 3.7: Acessar materiais de apoio estruturados
**Status**: ✅ Implementado (Delta ISS-15)  
**User Story**: US-020, US-021

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Seção "Materiais de Apoio" abaixo de recursos |
| 2 | Verificar cards | Cada material em card com ícone, título, descrição |
| 3 | Verificar categorias | "Materiais por Componente" + "Materiais Genéricos da Coleção" |
| 4 | Clicar material | Modal ou download iniciado |
| 5 | Verificar preview | Se PDF, preview inline ou abrir em nova aba |
| 6 | Testar download | PDF baixa com nome correto |
| 7 | Verificar ícones | Cada tipo tem ícone claro (PDF, DOCX, etc) |
| 8 | Testar mobile | Cards adaptam, sem overflow horizontal |
| 9 | Verificar vazio | Se sem materiais, mensagem clara |
| 10 | Testar filtro (se existe) | Filtrar por tipo/categoria |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Card com ícone grande (32-40px)
- ☐ Título bold, descrição em cinza (14px)
- ☐ Download button com ícone seta (↓)
- ☐ Spacing entre cards (12-16px)
- ☐ Hover effect em card (lift)
- ☐ Categoria label em topo (chip pequeno)
- ☐ Mensagem vazio com ícone sugestivo

---

## 📚 CONTEXTO PEDAGÓGICO (5 JTBD)

### JTBD 4.1: Consultar código BNCC
**Status**: ✅ Implementado  
**User Story**: US-022

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Seção "BNCC" com badges de códigos |
| 2 | Verificar badges | EF15LP01, EF15LP02, etc. em chips |
| 3 | Hover/tap badge | Tooltip ou modal abre com descrição |
| 4 | Verificar tooltip | Descrição longa e clara da habilidade |
| 5 | Testar mobile | Tap abre modal (not-hover), não hover-only |
| 6 | Modal layout | Código em destaque, descrição, área (Linguagens, etc) |
| 7 | Modal fechar | X button ou backdrop tap fecha |
| 8 | Verificar contraste | Texto legível em popup |
| 9 | Múltiplos códigos | Vários badges, cada um com tooltip próprio |
| 10 | Verificar performance | Tooltips não causam lag |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Badge BNCC em cor clara (azul claro, ex: #E0F2FE)
- ☐ Tooltip com background escuro (almost-black)
- ☐ Texto branco/claro em tooltip
- ☐ Arrow pointer (se tooltip)
- ☐ Max-width tooltip 300-400px (mobile), 500px (desktop)
- ☐ Padding tooltip 12-16px
- ☐ Modal com border-radius (8-12px)
- ☐ Modal com padding 24-32px
- ☐ Font size tooltip 13-14px

---

### JTBD 4.2: Ver descrição de habilidade BNCC
**Status**: ✅ Implementado (Delta ISS-11)  
**User Story**: US-022, US-023

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Abrir tooltip BNCC | Descrição completa exibida |
| 2 | Verificar estrutura | Código, nome habilidade, área, ano escolar |
| 3 | Verificar tipografia | Código em bold, descrição em regular |
| 4 | Verificar altura modal | Scroll interno se conteúdo longo |
| 5 | Testar legibilidade | Contraste suficiente (white on dark) |
| 6 | Testar mobile modal | Full-width, topo-aligned, scrollável |
| 7 | Verificar CTA | "Ver Mais" link para BNCC oficial (optional) |
| 8 | Testar multiple badges | Cada badge com descrição diferente |
| 9 | Performance | Modal abre em < 200ms |
| 10 | Accessibility | Modal com focus-trap, escapar com ESC |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Descrição em font 14-16px
- ☐ Código em font 12-14px, mono (monospace)
- ☐ Padding interno 16-20px
- ☐ Scroll smooth (se necessário)
- ☐ Cor de fundo escura (#1F2937 ou similar)
- ☐ Texto branco (#FFFFFF)
- ☐ Modal border-radius 8-12px
- ☐ Shadow escuro (drop-shadow)

---

### JTBD 4.3: Consultar competência CASEL
**Status**: ✅ Implementado (agora com tooltip rico, igual BNCC)  
**User Story**: US-024

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Seção "CASEL" com badges de competências |
| 2 | Verificar badges | "Autoconhecimento", "Relacionamento", etc. em chips |
| 3 | Hover/tap badge | Tooltip abre com sub-habilidades |
| 4 | Verificar tooltip | Descrição clara e estruturada |
| 5 | Verificar layout | Competência principal + sub-skills em lista |
| 6 | Testar mobile | Tap abre modal, não hover-only |
| 7 | Verificar cores | Badge em cor diferente de BNCC (verde ou outra) |
| 8 | Múltiplos badges | Vários CASEL, cada um com tooltip próprio |
| 9 | Combinar BNCC + CASEL | Ambas seções na mesma tela, sem conflito visual |
| 10 | Performance | Carregamento e interação suave |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Badge CASEL em cor diferente (verde, ex: #D1FAE5)
- ☐ Tooltip com padrão consistente com BNCC
- ☐ Descrição + sub-skills em estrutura clara
- ☐ Modal com scroll se conteúdo longo
- ☐ Font 14-16px em tooltip
- ☐ Padding 16-20px
- ☐ Contraste white on dark

---

### JTBD 4.4: Baixar guia para professor
**Status**: ✅ Implementado (Delta ISS-14)  
**User Story**: US-020

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Material "Guia para Professor" em destaque |
| 2 | Verificar card | Ícone de livro/documento, título, descrição |
| 3 | Clicar card | Download inicia ou modal de preview |
| 4 | Verificar ícone | Ícone claro (ex: 📖 ou 📄) |
| 5 | Verificar CTA | "Baixar" ou "Abrir" botão proeminente |
| 6 | Testar download | PDF baixa com nome claro (ex: guia_kaboo_collection.pdf) |
| 7 | Mobile layout | Card adaptado, download funciona em mobile |
| 8 | Verificar metadata | Tamanho arquivo exibido (ex: "2.4 MB") |
| 9 | Toast feedback | "Download iniciado" ou confirmação |
| 10 | Testar offline | Se guia offline, indicador (ex: ✓ Download) |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Card com ícone proeminente (48-64px)
- ☐ Título bold, descrição em cinza
- ☐ CTA button com ícone de download (↓)
- ☐ Size info em small text (12px)
- ☐ Hover effect (lift, shadow)
- ☐ Feedback toast com check (✓)
- ☐ Responsivo mobile (full-width ou adaptado)

---

### JTBD 4.5: Acessar ODS relacionados
**Status**: ✅ Implementado  
**User Story**: US-024 (mappings)

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No DetailScreen | Seção "ODS" com ícones de objetivos |
| 2 | Verificar ícones | Até 3-4 ODS com cores oficiais (UN guidelines) |
| 3 | Verificar cores | Cada ODS com cor distinta |
| 4 | Hover/tap ícone | Tooltip exibe nome + breve descrição |
| 5 | Verificar tooltip | "ODS 1 - Erradicação da Pobreza" + contexto |
| 6 | Testar mobile | Ícones em grid 2x2 ou wrap, tap abre tooltip |
| 7 | Verificar tamanho | Ícones 48-56px, tappable |
| 8 | Verificar legenda | Nome ODS embaixo (optional) |
| 9 | Link externo (optional) | Ícone com link para ODS oficial (nice-to-have) |
| 10 | Responsividade | Sem overlap, spacing consistente |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ ODS icons com cores oficiais (verificar UN guidelines)
- ☐ Ícone tamanho 56-64px
- ☐ Tooltip com nome completo + breve descrição (50-100 chars)
- ☐ Background tooltip escuro (like BNCC/CASEL)
- ☐ Spacing entre ícones (12-16px)
- ☐ Grid responsivo (2 colunas mobile, 4+ desktop)
- ☐ Legenda opcional embaixo (12px)

---

## 👤 GESTÃO DE PERFIL & PROGRESSO (4 JTBD)

### JTBD 5.1: Atualizar dados pessoais
**Status**: ✅ Implementado  
**User Story**: US-005 (no cadastro), perfil pós-login

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Navigate to Perfil/Configurações | ProfileScreen exibido |
| 2 | Verificar form | Campos: Nome, E-mail, Foto (avatar) |
| 3 | Clicar "Editar" | Campos se tornam editáveis (border highlight) |
| 4 | Digitar mudanças | Valores atualizam em tempo real |
| 5 | Verificar validação | E-mail com @ validado, nome não vazio |
| 6 | Clicar "Salvar" | Loading spinner, sucesso toast |
| 7 | Após salvar | Campos voltam read-only, dados atualizados |
| 8 | Testar erro | E-mail duplicado = error message em vermelho |
| 9 | Avatar upload (optional) | Trocar foto de perfil (nice-to-have) |
| 10 | Mobile layout | Form adaptado, sem overflow |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Botão "Editar" com ícone (✏️)
- ☐ Campo read-only com background cinza claro
- ☐ Campo editable com border azul
- ☐ Focus state com shadow sutil
- ☐ Botões "Salvar" / "Cancelar" lado a lado
- ☐ Loading spinner durante save
- ☐ Toast success em verde, erro em vermelho
- ☐ Feedback visual clara

---

### JTBD 5.2: Recuperar senha
**Status**: ✅ Implementado  
**User Story**: US-005

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na LoginScreen, clicar "Esqueci a senha" | Transição para ForgotPasswordScreen |
| 2 | Verificar layout | Mensagem clara, input para e-mail |
| 3 | Digitar e-mail | Input com validação inline (opcional) |
| 4 | Clicar "Enviar" | Button state muda para "Enviando..." |
| 5 | Após envio | Modal exibindo "E-mail enviado" com instrução |
| 6 | Verificar feedback | "Verifique sua caixa de entrada" com ícone ✓ |
| 7 | Clicar link email | Reset password form abre |
| 8 | Nova senha | Input "Nova Senha" + "Confirmar Senha" |
| 9 | Validação | Senha com 8+ caracteres, match validation |
| 10 | Submit | Loading, redirect para LoginScreen com success |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Input com placeholder claro
- ☐ Ícone Mail ao lado do input
- ☐ Button com loading state
- ☐ Modal success com ícone ✓ verde
- ☐ Mensagem clara em 16px
- ☐ Link expiração (optional): "Link expirou?"
- ☐ Novo form com password requirements
- ☐ Password strength indicator (nice-to-have)

---

### JTBD 5.3: Cadastrar perfil infantil (para criança)
**Status**: 🔴 Ausente (v2.0)  
**User Story**: US-030, US-031

#### Teste de Usabilidade Visual *(Protótipo para v2.0)*
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No ProfileScreen, botão "+ Adicionar Criança" | Modal abre |
| 2 | Verificar form | Nome, idade, foto (avatar predefinido ou custom) |
| 3 | Selecionar avatar | 6-8 opções de avatar cartoon |
| 4 | Escolher idade | Dropdown ou radio 3-12 anos |
| 5 | Clicar "Criar Perfil" | Loading, novo perfil aparece em lista |
| 6 | Verificar lista | Cards com cada criança, ícone de edição/delete |
| 7 | Trocar perfil | Tap em card muda para interface infantil |
| 8 | Verificar switch | Selector claro de "Perfil Adulto" / "Perfil [Nome]" |
| 9 | Mobile layout | Cards em grid, sem overflow |
| 10 | Validação | Nome não vazio, idade obrigatória |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design** *(protótipo)*:
- ☐ Modal com title "Adicionar Criança"
- ☐ Avatar gallery com scroll/grid
- ☐ Avatar de qualidade, cores alegres
- ☐ Dropdown idade com options 3-12
- ☐ CTA button em cor destacada
- ☐ Card infantil com avatar grande + nome
- ☐ Edit/delete icons no card
- ☐ Profile switcher no topo (claro, destacado)

---

### JTBD 5.4: Monitorar progresso da criança
**Status**: 🔴 Ausente (v2.0)  
**User Story**: US-029

#### Teste de Usabilidade Visual *(Protótipo para v2.0)*
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No ProfileScreen, seção "Progresso" | Dashboard com resumo |
| 2 | Verificar cards | Livros lidos, tempo de escuta, vídeos assistidos |
| 3 | Verificar estatísticas | Números grandes, ícones relacionados |
| 4 | Verificar timeline | Linha do tempo com datas de atividades (optional) |
| 5 | Verificar badges | Conquistadas (visual destaque) vs bloqueadas (opacas) |
| 6 | Clicar badge | Modal com descrição da conquista |
| 7 | Verificar gráfico | Se gamificação: chart de progresso visual |
| 8 | Mobile layout | Cards em coluna, sem overflow |
| 9 | Testar performance | Dashboard carrega rápido (< 1s) |
| 10 | Testar real-time | Progresso atualiza ao consumir conteúdo |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design** *(protótipo)*:
- ☐ Card com ícone grande + número destaque
- ☐ Card com background gradiente suave
- ☐ Typography: número em 32px, label em 14px
- ☐ Badge com cor (destaque) ou opacidade (bloqueado)
- ☐ Modal badge com descrição + data conquistada
- ☐ Gráfico (se houver) com cores alegres
- ☐ Responsive cards em mobile

---

### JTBD 5.5: Acessar interface simplificada para criança
**Status**: 🔴 Ausente (v2.0)  
**User Story**: US-033

#### Teste de Usabilidade Visual *(Protótipo para v2.0)*
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Login como criança | Interface totalmente diferente (cores, tipografia, layout) |
| 2 | Verificar cores | Paleta alegre, primária em azul/roxo/verde |
| 3 | Verificar tipografia | Fonts playful (arredondadas), maiores |
| 4 | Verificar elementos | Menos botões, opções simplificadas |
| 5 | Verificar nav | Menu com ícones grandes + labels em português infantil |
| 6 | Verificar home | Grid grande de coleções, com personagens em destaque |
| 7 | Verificar busca | Busca simplificada, pode ser por personagem visual |
| 8 | Filtros desativados | Filtros por BNCC/CASEL ocultos (adulto-only) |
| 9 | Testar segurança | Sem acesso a admin, perfil adulto oculto |
| 10 | Mobile-first | Design pensado para crianças em mobile (touch-friendly) |

**Dispositivos**: Mobile (portrait), Tablet, Desktop

**Checklist de Design** *(protótipo)*:
- ☐ Paleta de cores alegre (azul #3B82F6, verde #10B981, roxo #8B5CF6)
- ☐ Fonts arredondadas (Rounded family)
- ☐ Tamanho mínimo 16px (acessibilidade infantil)
- ☐ Spacing maior entre elementos (20-24px)
- ☐ Botões grandes (48-56px)
- ☐ Ícones emojis grandes (personagens com maior destaque)
- ☐ Sem jargão técnico (ex: "Biblioteca" em vez de "Catálogo")
- ☐ Navegação simplificada (3-5 tabs)

---

## ⚙️ OPERAÇÃO ADMINISTRATIVA (6 JTBD)

### JTBD 6.1: Criar modelo de voucher
**Status**: ✅ Implementado (Delta ISS-08, ISS-09)  
**User Story**: ISS-08

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Navigate Admin → Vouchers | AdminVouchersScreen exibido |
| 2 | Clicar "+ Novo Modelo" | Modal abre com form |
| 3 | Verificar campos | Nome, Duração (1-12 meses), Validade (dias), Conteúdo |
| 4 | Selecionar conteúdo | Multi-select coleções, kit, livro ou conjunto |
| 5 | Verificar preview | Ao selecionar, preview com contagem de itens |
| 6 | Clicar "Criar" | Modal validação, loader, sucesso |
| 7 | Após criação | Modelo aparece em lista, editável |
| 8 | Testar validação | Nome vazio = error, duração inválida = error |
| 9 | Mobile layout | Form adaptado, sem overflow |
| 10 | Testar UX de seleção | Checkboxes grandes, scroll se muitos itens |

**Dispositivos**: Desktop, Tablet, Mobile (landscape)

**Checklist de Design**:
- ☐ Modal com title "Criar Modelo de Voucher"
- ☐ Form fields com labels claros
- ☐ Input duração com spinner (±) ou dropdown
- ☐ Multi-select com checkboxes grandes (24-32px)
- ☐ Preview card com resumo (5-10 itens exibidos)
- ☐ Button CTA "Criar Modelo" destaque (azul, primária)
- ☐ Validação inline (border vermelha em erro)
- ☐ Loading spinner durante submit

---

### JTBD 6.2: Gerar lotes de vouchers
**Status**: ✅ Implementado (Delta ISS-09)  
**User Story**: ISS-09

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No Admin Vouchers, clicar em modelo | Detalhe do modelo abre |
| 2 | Verificar preview | Resumo: conteúdo, duração, validade |
| 3 | Clicar "+ Gerar Lote" | Modal abre com campo "Quantidade" |
| 4 | Digitar quantidade | Input numérico (ex: 100, 500, 1000) |
| 5 | Verificar validação | Máximo 10.000 por lote (safe-guard) |
| 6 | Clicar "Gerar" | Loading progressivo, spinner com % (nice-to-have) |
| 7 | Após geração | Lote aparece em tabela com status "Ativo" |
| 8 | Verificar columns | Lote ID, quantidade, data criação, status, actions |
| 9 | Mobile layout | Tabela scroll horizontal (se necessário) |
| 10 | Testar feedback | Toast "Lote gerado com sucesso: 500 vouchers" |

**Dispositivos**: Desktop, Tablet, Mobile (landscape)

**Checklist de Design**:
- ☐ Modal com título "Gerar Lote"
- ☐ Input quantity com spinner (↑↓)
- ☐ Help text "Limite: 10.000 vouchers por lote"
- ☐ CTA button "Gerar Lote"
- ☐ Progress bar durante geração (nice-to-have)
- ☐ Tabela com linhas destacadas em hover
- ☐ Toast sucesso em verde
- ☐ Responsive tabela (scroll mobile)

---

### JTBD 6.3: Visualizar consumo de voucher
**Status**: ✅ Implementado (Delta ISS-01, ISS-09)  
**User Story**: ISS-09

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No Admin Vouchers → Tabela | Lista de vouchers individuais |
| 2 | Verificar columns | Código, Status, Consumidor, E-mail, Data consumo, Ações |
| 3 | Verificar status | "Ativo", "Usado", "Expirado" em cores diferentes |
| 4 | Hover row | Row se destaca levemente (background claro) |
| 5 | Clicar row | Detalhe abre (modal ou page) |
| 6 | Verificar detalhe | Código, modelo, consumidor completo, timestamp |
| 7 | Verificar campos consumo | Nome + e-mail do usuário que consumiu (novo) |
| 8 | Verificar data | Data formatada legível (ex: "15/05/2026 14:32") |
| 9 | Status color-coding | Ativo (verde), Usado (cinza), Expirado (vermelho) |
| 10 | Mobile layout | Tabela responsiva ou card view |

**Dispositivos**: Desktop, Tablet, Mobile

**Checklist de Design**:
- ☐ Tabela com header sticky (se necessário)
- ☐ Rows com altura adequada (44-48px)
- ☐ Status badge com cor e ícone
- ☐ Hover row com subtle background
- ☐ Font codes em monospace (legibilidade)
- ☐ Data em formato consistente
- ☐ Modal detalhe com 400-600px width
- ☐ Card view mobile com dados empilhados

---

### JTBD 6.4: Exportar para gráfica (CSV/XLSX)
**Status**: ✅ Implementado (Delta ISS-08)  
**User Story**: ISS-08

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | Na tabela de vouchers | Botão "Exportar" no topo (direita) |
| 2 | Verificar botão | Ícone download (↓), label "Exportar" |
| 3 | Clicar dropdown | Menu com opções "CSV" e "XLSX" |
| 4 | Selecionar formato | Arquivo inicia download |
| 5 | Verificar arquivo | CSV/XLSX com colunas: Código, Modelo, Status, Consumidor, Email, Data |
| 6 | Verificar dados | Todos os vouchers (ou selecionados) inclusos |
| 7 | Verificar formatação | XLSX com cores de status (nice-to-have) |
| 8 | Testar filtering | Exportar apenas vouchers filtrados (current view) |
| 9 | Testar toast | "Arquivo gerado com sucesso" |
| 10 | Mobile layout | Botão acessível, não hidden |

**Dispositivos**: Desktop, Mobile, Tablet

**Checklist de Design**:
- ☐ Button "Exportar" com ícone download
- ☐ Dropdown com opções CSV/XLSX
- ☐ Button com hover (escurece)
- ☐ Toast confirmation com checkmark
- ☐ Arquivo com nome descritivo (ex: vouchers_2026-05-15.xlsx)
- ☐ Responsivo em mobile (button não hidden)
- ☐ XLSX com formatação (headers bold, cores status)

---

### JTBD 6.5: Editar metadados (BNCC, CASEL, sinopse)
**Status**: ✅ Implementado (Delta ISS-06, ISS-11, ISS-14)  
**User Story**: ISS-06, ISS-11, ISS-14

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No CMS Admin → Coleções | Lista de coleções editáveis |
| 2 | Clicar em coleção | Form abre com abas: Geral, BNCC, CASEL, Materiais |
| 3 | Aba "Geral" | Título, sinopse (textarea grande), tipo (kit/livro) |
| 4 | Sinopse field | Textarea com char count (ex: "180/500") |
| 5 | Aba "BNCC" | Multi-select com códigos, checkboxes |
| 6 | BNCC select | Campo com search/filter, lista longa scrollável |
| 7 | Aba "CASEL" | Similar BNCC, multi-select competências |
| 8 | Preview BNCC | Ao selecionar, preview com descrição (tooltip) |
| 9 | Clicar "Salvar" | Loading, validação, sucesso |
| 10 | Após salvar | Dados persistem, toast "Salvo com sucesso" |

**Dispositivos**: Desktop, Tablet (mobile em landscape se necessário)

**Checklist de Design**:
- ☐ Tabs com visual de estado (ativa destacada)
- ☐ Textarea com height 120-150px mínimo
- ☐ Char counter em cinza, muda cor se perto do limite
- ☐ Multi-select com checkboxes 24-32px
- ☐ Search field em multi-select
- ☐ Scroll vertical em select list
- ☐ Preview tooltips com descrição
- ☐ Button "Salvar" destaque
- ☐ Loading spinner
- ☐ Toast sucesso em verde

---

### JTBD 6.6: Gerenciar ativos multimídia (vídeo, áudio, animação)
**Status**: ✅ Implementado (Delta ISS-14)  
**User Story**: ISS-14

#### Teste de Usabilidade Visual
| Passo | Ação | Validação Visual |
|------|------|------------------|
| 1 | No CMS Admin, aba "Ativos" | Seção com slots: Contação, Animação, Videoaula, Como Jogar |
| 2 | Verificar layout | Card por tipo de ativo, com ícone + título |
| 3 | Card vazio | Ícone "+" e CTA "Adicionar [Tipo]" |
| 4 | Card com arquivo | Título, preview (thumbnail se vídeo), botão remover |
| 5 | Clicar "Adicionar" | File picker abre (video/audio) |
| 6 | Upload arquivo | Progressbar durante upload |
| 7 | Após upload | Thumbnail/preview exibido, botão remover |
| 8 | Drag & drop | Arrastar arquivo para card (nice-to-have) |
| 9 | Mobile layout | Cards em coluna única, upload adaptado |
| 10 | Validação | Tamanho máximo 500MB com message clara |

**Dispositivos**: Desktop, Tablet, Mobile

**Checklist de Design**:
- ☐ Card com border dashed (vazio)
- ☐ Card com border solid (preenchido)
- ☐ Ícone + para upload
- ☐ Thumbnail com tamanho 120-150px
- ☐ Progress bar durante upload
- ☐ Button remover (X) em hover card
- ☐ Mensagem erro tamanho em vermelho
- ☐ Drag & drop overlay (visual feedback)
- ☐ Responsive cards mobile

---

## 📊 SUMÁRIO VISUAL FINAL

| Categoria | JTBD | Implementado | Status Visual |
|-----------|------|:---:|:---:|
| **Autenticação** | 1.1-1.5 | 4/5 | ✅🔴🔴🔴 |
| **Descoberta** | 2.1-2.6 | 5.5/6 | ✅✅✅✅✅🟡 |
| **Consumo** | 3.1-3.7 | 4/7 | ✅✅✅✅🔴🔴✅ |
| **Pedagógico** | 4.1-4.5 | 5/5 | ✅✅✅✅✅ |
| **Perfil** | 5.1-5.5 | 2/5 | ✅✅🔴🔴🔴 |
| **Admin** | 6.1-6.6 | 6/6 | ✅✅✅✅✅✅ |
| **TOTAL** | **25** | **26.5/31** | **✅ 85%** |

---

## 🎨 GUIA DE CORES PARA TESTES

### Estados
- **Ativo/Sucesso**: Verde `#10B981` (EmeraldGreen)
- **Erro/Alerta**: Vermelho `#EF4444` (Red-500)
- **Pendente/Parcial**: Laranja `#F59E0B` (Amber-500)
- **Informativo**: Azul `#3B82F6` (Blue-500)
- **Desabilitado**: Cinza `#D1D5DB` (Gray-300)

### Backgrounds
- **Modal backdrop**: Preto com opacidade `rgba(0,0,0,0.5)`
- **Tooltip**: `#1F2937` (Gray-800)
- **Success toast**: `#DBEAFE` (Blue-100) bg, `#0369A1` text
- **Error toast**: `#FEE2E2` (Red-100) bg, `#991B1B` text

### Tipografia
- **Heading 1**: 32px, bold
- **Heading 2**: 24px, bold
- **Body**: 16px, regular
- **Small**: 14px, regular
- **Tiny**: 12px, regular

---

**Próximo passo**: Rodadas de QA visual por categoria, começando por **Autenticação** (1.1-1.5), depois **Pedagógico** (4.1-4.5).

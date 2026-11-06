# Revisão visual — SHOOT’E R! e BrigaLoka

## Diagnóstico dos prints do usuário
- Botões quase sem estilo e seleção de personagem com textos apertados: CSS da fase anterior não aparecia corretamente no navegador e era frágil diante do restante da cascata.
- SHOOT’E R! apresentava fachadas longas e planas, proporções de corredor e uma arma simplificada, muito abaixo da expectativa de arena FPS 3D.
- BrigaLoka tinha lutadores excessivamente simples, todos com silhuetas parecidas, e um cenário pouco elaborado.

## Correções feitas

### CSS novo, separado
- `arcade-polish.css` é carregado **depois de `styles.css`**, com URL versionada e seletores específicos de `#game-content`. Isso deve impedir que regras anteriores devolvam o estilo de botão branco padrão.
- Menu do SHOOT’E R!: três cartões grandes para solo, multiplayer beta e tutorial, com ícones, descrição e ação.
- Seleção de mapas: cartões com estilos distintos e estado selecionado.
- BrigaLoka: cards verticais dos cinco lutadores, retratos vetoriais renderizados em canvas, cabeçalho mais forte, barra de HP, cronômetro, botões de combate e layout responsivo.

### BrigaLoka
- Módulo novo `brigaloka-art.js`: cinco desenhos vetoriais próprios em vez de formas genéricas, cada um com rosto, cabelo, roupa e acessórios diferentes. O desenho de **Liner** usa os traços informados pelo criador (cabelo escuro volumoso, pele clara, roupa cinza e gravata vermelha).
- Ataques agora têm poses diferenciadas, efeitos de golpes especiais, flash de dano, partículas/hit sparks.
- Arena com gradientes, montanhas em parallax, estrutura decorativa, portões, lanternas, chão em perspectiva e pétalas animadas.
- Luta continua Canvas 2D, não personagens 3D fotorrealistas como Street Fighter 6.
- Luta solo/contra CPU e dois jogadores locais preservados; controles de toque adicionados para jogador 1 no celular.

### SHOOT’E R!
- `shooter-world3d.js`: nova renderização de cenário usando **Three.js WebGL**, carregada apenas no SHOOT’E R!. Casas têm volumetria, telhados físicos, caixilhos, janelas, vigas, pisos com texturas procedurais, escadas em altura, vegetação, postes e iluminação. Robôs também são modelos tridimensionais. A Vila da Folha possui um marco circular ao fundo.
- O novo motor usa o mesmo mapa de colisão do jogo (`shooter-maps.js`) e mantém as quatro arenas, a câmera em primeira pessoa, as armas e o sistema de salas/votos.
- Há **fallback automático para raycasting 2,5D** se a biblioteca Three.js ou a GPU não funcionarem. O jogo não deveria ficar inacessível por falta de WebGL.
- `shooter-fps.js`: arma de primeiro plano redesenhada, formas específicas para pistola, submetralhadora, sniper e faca; mira com zoom e disparos continuam.
- A apresentação é estilizada e procedural, não tem texturas ou modelos realistas de um estúdio profissional. O servidor multiplayer continua beta, baseado em Firestore e sem autoridade sobre dano/LCoin.

## Validação executada
- Sintaxe JavaScript de `app.js`, `brigaloka.js`, `brigaloka-art.js`, `shooter-menu.js`, `shooter-fps.js` e `shooter-world3d.js`.
- Simulações do BrigaLoka (renderização dos cinco previews, início da luta, frame da arena e limpeza de eventos) concluídas.
- Simulações do SHOOT’E R! com renderizador 3D simulado e fallback sem WebGL; inicialização, mapa, HUD e descarte passaram.
- Conferência de versionamento de JS/CSS no `index.html`.
- Não foi realizado teste visual automatizado real em contas Firebase; a renderização WebGL depende da compatibilidade do navegador com a biblioteca externa.

## Fontes da dependência gráfica
Three.js, módulo ESM importado de CDN em versão fixa `0.187.0` quando o jogo carrega. Se a CDN estiver bloqueada ou o dispositivo não tiver WebGL, permanece o renderizador anterior.

## Observação
Mesmo após a revisão, os jogos são **protótipos estilizados**. A referência enviada de Street Fighter 6 é um jogo 3D AAA com modelos e efeitos de produção profissional; esta entrega melhora substancialmente os layouts, elementos do cenário e sprites, mas não é equivalente àqueles recursos.

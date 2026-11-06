# Liner Story — Capítulo 1: O Herói sem Nome (remake 2026-11-06)

## Entrega
O antigo protótipo Canvas 480×270 foi substituído por um motor de plataforma em 960×540. A arte é original e procedural, construída sem copiar imagens de outros jogos. A direção visual busca biomas com mais profundidade e detalhes, mas NÃO tem sprites pintados profissionalmente como as referências: esses ainda podem ser adicionados futuramente.

Cinco áreas contínuas:
1. A Carta e a Longa Estrada — carta do Bardo, cabana, monstros, buracos e checkpoints.
2. A Floresta das Ruínas — monstros, plataformas e caminho prolongado.
3. A Vila e os Portões do Castelo — fontes, estátuas, guardas que confundem o herói com impostor; plano do Bardo.
4. Montanha Sagrada — miniboss peixe, chave, canção que adormece o peixe, goblins, dragão, fuga pelas moedas e revelação do chocolate.
5. A Torre de Malacord — casamento, baú, mapa, poção flamejante, POV do Bardo com a princesa, explosão, cópia de névoa e solução sem atacar, golpe de alaúde, gaiola em chamas e resgate com cordas, encerramento GANONDORF.

## Combate
- Ataque do herói: área de espada separada do corpo, à frente da direção em que o personagem olha; janela ativa, cooldown, knockback e um acerto por golpe.
- Dano do jogador: hurtbox própria e 1,3s de invulnerabilidade.
- BrigaLoka: alcance separado por soco/chute/especial, hurtbox dos lutadores e pushboxes para não atravessar o adversário.
- Peixe: barra de 8 HP, contato danoso, canção do Bardo no meio da luta, chave quando derrotado.
- Cópia de névoa: usar a espada provoca contra-ataque; ficar sem atacar por 5,5 segundos resolve a luta.

## Controles
- Movimento: A/D ou setas; touch ◀ / ▶
- Pulo: Espaço, W, seta cima; touch ↑ Pular
- Golpe de espada: X ou J; touch ⚔ Golpear
- Interação e cortar cordas: E; touch ✦ Ação
- Pausa: P
- Fuga do dragão: ↑ / ↓ ou W / S; touch Pular / Golpear mudam de faixa

## Dados e implantação
- Persistência local por UID, versão 3, para não carregar saves incompatíveis da versão anterior.
- Autosave a cada 5 segundos e em checkpoints, persistindo inimigos derrotados e flags do roteiro.
- Sem custo de LCoins durante o beta. Cobrança de 2.000 LCoins deve aguardar validação do capítulo e ser aplicada pela loja, não pelo motor Canvas.
- Não altera dados do Firestore nem as regras de multiplayer.
- Módulos novos: story-chapter-v3.js, story-combat-v3.js, story-art-v3.js, story-v3.css.
- story-game.js substituído preservando contrato público mountStory(root,onExit,uid).
- brigaloka.js reutiliza o motor de colisão geométrico.
- index.html importa CSS com cache-busting e app.js importa o motor atualizado.

## Revisão e verificações
- Sintaxe dos seis arquivos JavaScript inspecionada.
- Canvas simulado percorreu todos os cinco biomas e a fuga do dragão.
- Simulação de input/DOM passou menu, diálogos, mapas, miniboss peixe e fuga do dragão até a torre.
- Simulação isolada do castelo passou resolução da névoa, resgate e tela final.
- Testes de geometria em tests/story-v3.test.js, rodáveis com npm test.

## Limites conhecidos
- Falta sessão visual real em navegador com login no site publicado e acabamento dos sprites refinado por artista.
- O dragão e o peixe são desenhados proceduralmente; são representações originais, não iguais às imagens de referência.
- A resolução maior exige conferir desempenho em PC fraco e celulares.
- A aventura possui eventos lineares, sem escolhas ramificadas nem efeitos sonoros gravados.
- O BrigaLoka continua com multiplayer local/CPU, sem modo online.

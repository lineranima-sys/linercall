# SHOOT’E R! — 4 mapas, Singleplayer e Multiplayer 1v1

## Interface

O menu novo permite **Singleplayer**, **Multiplayer** e **Tutorial**.

Quatro arenas originais feitas em JavaScript/CSS, sem imagens extraídas de séries:
- **Casa do Tanjiro:** casa de madeira, bosque e chão nevado;
- **Vila da Folha:** ruas ninja, telhados e lanternas;
- **Vila do Chaves:** pátio com barril, bancos e casas amarelas;
- **Undefined:** mapa original futurista.

Singleplayer permite escolher qualquer mapa, treinar contra drones, trocar as quatro armas, mirar com zoom e receber a recompensa atual de até 45 LCoins por dia na carteira local.

## Multiplayer 1v1 — como jogar

1. Ambos entram em suas contas do LinerCall.
2. Jogador 1 abre **Minigames → SHOOT’E R! → Multiplayer → Criar sala**.
3. O jogo fornece um **código de seis caracteres**. Compartilhe com o amigo.
4. Jogador 2 entra em **Multiplayer → Entrar na sala**, usando o código.
5. Cada jogador seleciona seu mapa. Quando os dois votarem, **o servidor escolhe aleatoriamente um dos mapas votados**. Votos iguais levam ao mesmo mapa.
6. Ambos clicam em **Entrar no duelo**. A partida dura até 150 segundos. A API valida os disparos, a munição, a recarga, a mira, a distância, paredes e HP. Quem eliminar o rival vence. Ao fim do tempo, vence quem tiver mais HP ou empata se igual.
7. O resultado e a premiação ficam registrados pelo servidor, com limite de três partidas premiadas por conta por dia. Vitórias por eliminação: +90 LCoins para vencedor e +15 para perdedor. Empate por tempo com pelo menos seis tiros no total: +25 para cada um. Saída antecipada não premia.

O multiplayer sincroniza posições pelo Firestore (~230 ms) e desenha o rival em perspectiva 3D. É um **beta de FPS 1v1**, não um servidor dedicado de baixa latência como Counter-Strike. Movimentos ainda vêm do navegador sem verificação robusta de velocidade/teleporte, então o anticheat não é completo.

## Configuração obrigatória

Essas duas etapas precisam acontecer **fora do GitHub**:

1. Vercel: configurar **FIREBASE_SERVICE_ACCOUNT_JSON** com credenciais de conta de serviço do Firebase Admin (projeto linercalls) nas Environment Variables e refazer o deploy. Se já estiver configurada para o ranking Pokémon ou o TERMO, ela é reaproveitada. **Nunca publique a chave no GitHub ou em uma conversa.**
2. Firebase Console → Firestore Database → Rules: publicar o arquivo **firestore.rules** atualizado. Apenas participantes leem a sala; somente cada jogador altera a própria posição; criação, sorteio, resultado e prêmios são controlados pelo servidor.

Sem essas configurações o multiplayer informa um erro — não simula jogadores fictícios. O modo solo permanece utilizável.

## LCoins e segurança

O prêmio online é registrado com Firebase Admin em arcadeWallets e refletido na carteira local ao consultar a partida. **A carteira principal do LinerCall ainda usa localStorage** e pode ser alterada no navegador; não é uma economia segura entre dispositivos. Não converta LCoins em dinheiro real.

## Testes recomendados depois do deploy

- Duas janelas com contas diferentes, votos distintos, votação igual e sorteio;
- Disparos, colisão de tiros com paredes, vida, munição, recarga e resultado;
- Retorno ao menu, desistência, prêmio único por partida e limites diários;
- Celular e computador; mensagens de configuração ausente;
- Quedas de conexão. Salas antigas ainda não têm limpeza automática.

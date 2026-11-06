# LinerCall — SHOOT’E R! cenários + BrigaLoka (protótipo)

## SHOOT’E R! — melhorias pedidas pelos fãs
A atualização troca o labirinto de paredes fechadas por **quatro mapas de homenagem estilizados**:
- **Vila do Chaves**: pátio central, portas e casas acessíveis, degraus, plantas e barris.
- **Casa do Tanjiro**: casa ampla e cômodos acessíveis, bosque e trilha com degraus.
- **Vila da Folha**: ruas abertas, prédios acessíveis, centro de vila, árvores e escadaria.
- **Undefined**: variante aberta do mapa de treinamento original.

A geometria fica em `shooter-maps.js` (32 × 27 células por cenário, casa/porta/escada, decoração e limite **invisível** tipo `X`). O FPS em `shooter-fps.js` agora usa o mapa escolhido, cores temáticas, portas acessíveis, objetos do cenário, câmera olhando para cima/baixo com o mouse ou PgUp/PgDn e altura da câmera ao caminhar por degraus.

**Importante:** o motor ainda é **raycasting 2,5D**, não um ambiente poligonal 3D completo. As escadas elevam a perspectiva, mas ainda não existem andares 3D empilhados, tetos reais, pulo com física ou complexas escadas internas de vários níveis. Os cenários são *inspirados* em lugares famosos, não reproduções exatas de arquitetura oficial.

### Modos disponíveis
- **Singleplayer**: seleciona um dos quatro mapas, enfrenta drones de treinamento e mantém os 45 LCoins locais da missão diária, uma vez no navegador.
- **Multiplayer beta**: duas contas autenticadas. Uma cria a sala e envia o ID; a outra entra com o ID. Cada uma vota em um dos quatro mapas. Com ambos os votos, uma função determinística usando o ID aleatório da sala e os votos escolhe **um dos dois cenários**, igual para as duas contas. Posições e disparos são transmitidos pelo Firestore.
- **Tutorial**: explica movimentação, exploração e armas.

O PvP é **beta**, ainda sem backend autoritativo, reconciliação de movimentos/lag, proteção anticheat ou pontuação segura. **Não concede LCoins nem entra em ranking.** Tiros, mira e dano no alvo ainda são calculados no cliente, e a sincronização pode sofrer atraso. Ainda não equivale à infraestrutura completa de Counter-Strike.

### Configuração do Firebase
- Subir `firestore.rules` na aba **Firebase Console > Firestore Database > Rules > Publish**. Apenas push para GitHub **não aplica as regras**.
- Regras para `shooterRooms/{roomId}` limitam duas contas, restringem os campos de ingresso e permitem que cada participante vote apenas uma vez; limitam escrita/leitura de `players` e `shots` aos integrantes da sala.
- Não armazenar dados pessoais nem credenciais em URLs ou arquivos. Compartilhar somente ID da sala com amigos.
- Como Firestore cobra operações, o beta limita atualização de movimento e restringe a quantidade de disparos visíveis no cliente. Para multiplayer grande é melhor WebSocket/servidor dedicado.

## BrigaLoka!
Jogo de luta local 2D inspirado em arcades clássicos. Não usa códigos, gráficos oficiais ou trilhas comerciais dos jogos citados.

**Elenco selecionável:** Liner, Gemaplys, Link, Tanjiro e Satoru Gojo. O Liner tem desenho procedural inspirado nos dois anexos do criador e inclui retrato derivado da imagem colorida enviada por ele.

**Modos:** singleplayer contra CPU e dois jogadores no mesmo teclado, com tutorial e seleção dos personagens 1 e 2.

**Golpes e regras:** soco, chute, especial ao encher energia, pulo, defesa, movimento lateral, 100 HP, rounds de 90 segundos, revanche e troca de lutadores.
- Jogador 1: A/D andar, W pular, J soco, K chute, L especial, S defender.
- Jogador 2: setas mover/pular/defender, teclas 1/2/3 soco/chute/especial.
- Vitória singleplayer: 30 LCoins locais, uma vez por conta/navegador por dia. Dois jogadores locais sem premiação.
- **Não há modo online do BrigaLoka nesta versão**.

## Testes feitos
- Sintaxe JavaScript validada para os módulos novos e código de integração.
- BFS por célula: **100% das células transitáveis** dos quatro mapas são acessíveis desde o ponto inicial, inclusive interiores; a borda é invisível.
- Simulação de Canvas + eventos do SHOOT’E R! nos quatro mapas sem erros de execução; teste de renderização, pose e não aplicação de dano PvP no solo.
- Teste de BrigaLoka com interface, seletor de cinco personagens, início do combate e limpeza dos listeners.
- Voto de mapa determinístico validado para mesmos votos/sala.
- Sem testes end-to-end reais em dois navegadores com contas Firebase; verificar autenticação, regras e qualidade da conexão após publicar.

## Limites conhecidos
A carteira principal de LCoins permanece local no navegador e não é segura contra adulteração. O PvP beta não deve pagar moedas. Áreas internas ainda são construídas sobre grade 2,5D e podem parecer simples, não um jogo AAA; o objetivo desta fase é melhorar a sensação de exploração e testar salas e controles.

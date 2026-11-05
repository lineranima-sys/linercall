# LinerCall Arcade — jogos dos fãs (2026-11-05)

## O que já existe nesta atualização

| Jogo | Entrega | LCoins | Rede |
| --- | --- | --- | --- |
| TERMO Online | 2.500 palavras, 5 letras, 6 palpites, palavra compartilhada por dia, placar por conta, efeitos de letra repetida | 60 por vitória, uma vez por dia | API Firebase Admin + placar Firestore |
| Detetive | 8 casos originais, pistas, suspeitos, resolução e progresso | 35 por caso, uma vez por navegador/conta | Solo local |
| SHOOT’E R! | Treino de arena 2D contra robôs, quatro armas (pistola, submetralhadora, fuzil, faca), munição finita e recarga para as armas de fogo, WASD, mouse, 1–4 e R | 45 por desafio concluído, uma vez por dia no navegador | Solo local; PvP em tempo real **não implementado** |
| Adivinhe a Música! | 18 melodias originais divididas em Geek, Aberturas e Sertanejo, 5 opções de título por faixa | 23 por acerto inédito | Solo local; sem áudios comerciais |
| Pokémon Arena | 4% MISS, 2% SUPER EFETIVO raro (multiplicador ×2) nos golpes que acertam; também no PvP com verificação determinística no servidor | Mantém recompensas anteriores | PvP por turnos no Firestore |

### Configuração do TERMO Online

1. No projeto Firebase **linercalls**, configure as regras de `firestore.rules` na aba **Firestore Database → Rules → Publish**. Apenas o servidor pode gravar tentativas e vencedores; usuários logados podem ler o placar.
2. Na Vercel, em **Project Settings → Environment Variables**, configure `FIREBASE_SERVICE_ACCOUNT_JSON` com a credencial de conta de serviço de Firebase Admin, no painel seguro. **Nunca cole a chave em conversas, commits ou arquivos publicados.** Se a variável já foi configurada para o ranking Pokémon, ela é reaproveitada.
3. Faça novo deploy no projeto Vercel após alterar a variável e as regras.
4. Ao abrir **Minigames → TERMO Online**, a interface pede `/api/termo` por token de autenticação. A resposta diária é determinada no servidor (data America/Sao_Paulo, HMAC de chave privada), não pela UI.
5. Sem configuração de servidor, o jogador pode usar o **modo treino local**, claramente marcado como sem LCoins. Não é competição online.

### Precificação e segurança
- A API valida identidade Firebase e registra tentativas e recompensa diária do TERMO **uma única vez** em transação no Firestore. Um vencedor ganha 60 `termoEarnedTotal` na carteira protegida `arcadeWallets/<uid>`. Ao voltar a jogar, o cliente credita a diferença correspondente na carteira local do navegador.
- **A carteira de LCoins principal do LinerCall continua em `localStorage`; ela NÃO é resistente a adulteração e NÃO sincroniza pagamentos entre dispositivos.** Recompensas de Detetive, SHOOT’E R! e Música são locais, com limites também locais, portanto não são apropriadas para uma economia competitiva segura.
- Para recompensas globalmente confiáveis, migrar toda a carteira LCoins para transações Firebase Admin, conferir eventos de partidas com registros autoritativos e nunca aceitar saldos enviados pelo navegador.
- O SHOOT’E R! multiplayer em tempo real requer um servidor de partidas, sincronização de ações, proteção contra cheats e validação de recompensas no servidor. **O protótipo desta atualização é intencionalmente de treino solo**, não se anuncia como multiplayer.
- Adivinhe a Música! usa sons sintetizados via Web Audio, compostos para este protótipo; não há gravações de Cavaleiros do Zodíaco ou músicas comerciais. Faixas reais só devem ser integradas com permissão de uso.

### Testes automáticos de código realizados
- Sintaxe JS dos novos módulos e dos módulos alterados.
- 2.500 palavras com 2.500 entradas únicas.
- MISS determinístico aproximadamente 4% e golpe super-raro aproximadamente 2%.
- Reconstituição simulada de duelo Pokémon por 36 turnos com mesmo vencedor no navegador e validador de servidor.
- Conferência de IDs de botões e regras do placar.

### Limitações de testes
Não foi possível realizar neste ambiente uma sessão multijogador real ou testar o deploy Vercel/Firebase com credenciais reais. Ainda é necessário realizar o teste de interface no navegador e publicar regras do Firestore.

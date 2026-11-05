# LinerCall — Ranking semanal global

## Funcionamento
- Ranking exibe **todos os perfis cadastrados**, incluindo 0 vitórias.
- Quadro **Jogadores online** exibe **todos** com presença nos últimos 3 minutos.
- Exibe nome, foto, vitórias, derrotas, pontuação e posição.
- Posição: primeiro **mais vitórias**; desempate: mais pontos, menos derrotas e nome.
- Cada vitória PvP validada = **+1 vitória, +100 pontos**. Cada derrota PvP validada = **+1 derrota, +10 pontos**.
- Reinício automático por semana ISO, **segunda-feira às 00:00 de Brasília**. Semanas passadas ficam arquivadas.
- PvE permanece histórico local; o ranking global usa apenas partidas PvP validadas pelo servidor.

## 1. Publicar as regras Firestore
1. Acesse https://console.firebase.google.com/ e abra o projeto Firebase do LinerCall (ID do projeto: linercalls).
2. Vá em **Firestore Database → Rules**.
3. Copie todo o arquivo firestore.rules do GitHub e clique em **Publish**.
4. Isso libera a leitura da coleção semanal pelos usuários autenticados. Apenas o backend pode escrever vitórias, derrotas e pontos.

## 2. Configurar o servidor na Vercel
**O GitHub por si só não cria credenciais de acesso administrativo.**
1. No Firebase Console, selecione **Project Settings → Service accounts** e gere uma chave privada de conta de serviço do projeto linercalls.
2. Na Vercel, abra **Project → Settings → Environment Variables**.
3. Configure **FIREBASE_SERVICE_ACCOUNT_JSON**, usando como valor o JSON completo da conta de serviço (Production; Preview se necessário).
4. Faça um novo deploy para aplicar a variável.
5. **Nunca** publique essa chave no GitHub, no frontend, nem envie a chave aqui no chat. A configuração pública firebase-config.js não é a chave de serviço.

## 3. Teste com dois jogadores
1. Faça login em duas contas diferentes, e forme três Pokémon por conta.
2. Conclua uma partida online inteira.
3. O servidor verifica os turnos, Pokémon, HP, PE e vencedor antes de contar pontos.
4. O vencedor ganha 100 pontos e uma vitória; o derrotado ganha 10 pontos e uma derrota.
5. Recarregue: resultados continuam e o mesmo ID de partida não pode gerar pontuação duplicada.
6. Se houve falha temporária, use o botão **Sincronizar ranking semanal** na Arena para tentar de novo.

## Observações
- Sem configurar FIREBASE_SERVICE_ACCOUNT_JSON, o servidor retorna 503 e as pontuações globais ficam zeradas.
- Sem publicar firestore.rules, os dados do placar podem retornar permissão negada.
- Os LCoins no navegador ainda são locais e não seguros contra manipulação. O servidor do ranking não utiliza esse saldo.
- Não existe exclusão semanal de contas ou documentos: o ranking começa uma nova semana, mantendo histórico arquivado.

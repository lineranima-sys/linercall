# LinerCall — publicação do Pokémon Online

O código da interface vai para a Vercel pelo GitHub, mas **as regras do Firestore não são publicadas pela Vercel**. Sem isso, convites e turnos PvP podem retornar `permission-denied`.

## Publicar as regras

1. Abra o [Firebase Console](https://console.firebase.google.com/) e selecione o projeto Firebase usado pelo LinerCall.
2. Vá em **Firestore Database → Rules**.
3. Copie o conteúdo completo do arquivo [firestore.rules](../firestore.rules) e cole no editor.
4. Clique em **Publish** e aguarde a confirmação.
5. Teste com **duas contas Google diferentes**, cada uma com três Pokémon selecionados: convidar, aceitar, atacar, descansar, trocar e concluir.

Alternativa para quem tem Firebase CLI configurado com o projeto correto:

```bash
firebase deploy --only firestore:rules
```

O arquivo `firebase.json` aponta para as regras deste repositório.

## Limitações conhecidas

- Partidas PvP sincronizam convites e turnos no Firestore, mas **não dão LCoins nem contam no ranking público**, até existir validação confiável no backend.
- O ranking local das batalhas PvE é salvo neste navegador. Dados locais não são prova segura para placares públicos.
- Os cálculos de ataque são determinísticos para que os dois jogadores vejam o mesmo resultado. Teste a sincronização em dois navegadores/dispositivos.
- O modo história está em **versão de teste**: artes desenhadas via Canvas, quatro áreas jogáveis e todos os principais eventos do Capítulo 1.
- O LightyFlix exibe as séries ainda não lançadas como bloqueadas; Demon Slayer tem o primeiro episódio cadastrado, mas nenhum vídeo hospedado para reprodução.

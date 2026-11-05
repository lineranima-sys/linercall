# LinerCall — Amizades, notificações e LightyFlix

## Controles de amizade
No perfil de outra pessoa ou na lista de amigos, abra **⚙ Gerenciar**:
- **Apelido**: um nome privado que só a sua conta vê na lista de amigos e na DM.
- **Silenciar**: as mensagens continuam chegando, mas deixam de aumentar o contador de notificações daquela DM.
- **Bloquear**: impede novas DMs, novos convites de amizade e desafios Pokémon entre as duas contas, com verificação nas regras do Firestore. Também desfaz a amizade.
- **Desfazer amizade**: apaga a relação `friendships/{pairId}`; mensagens antigas não são apagadas automaticamente, mas a DM fica inacessível sem amizade.
- **Desbloquear**: no quadro *Jogadores bloqueados* da página Amigos. Desbloquear não restaura automaticamente a amizade.

As preferências ficam em `socialSettings/{uid}/contacts/{otherUid}` e só podem ser lidas pela própria conta. O campo `blocked` é consultado pelas regras do Firestore para proteção real. Essas regras precisam ser publicadas no Firebase Console, pois um deploy da Vercel não publica regras Firestore.

## Foto da loja
Uma foto comprada, cortada e salva pela loja é publicada no perfil `users/{uid}.avatarData`, com restrições de formato/tamanho nas regras Firestore. O card dos membros online, o painel da Arena, o perfil e o ranking usam a foto publicada; se não houver, exibem iniciais. **A foto fica visível para outras contas autenticadas**.

## LightyFlix
*Pokémon: Mewtwo Contra-ataca — Evolução* está cadastrado como filme no catálogo e nos destaques, com capa, sinopse e link à página oficial da Netflix. Isso não licencia nem hospeda o filme no LightyFlix. Ele está marcado como **Em breve**, não pode ser comprado por LCoins, e seu vídeo completo não está incluído no projeto.

Os avisos de episódios indisponíveis passaram a usar uma camada superior à do modal de detalhes para não ficarem borrados.

## Testes
Após publicar as regras Firestore, teste com duas contas: criar amizade, renomear contato, silenciar DM, bloquear e tentar enviar mensagens/convites da outra conta, desbloquear e refazer amizade, verificar a foto de perfil e conferir notificações.

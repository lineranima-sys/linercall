# LightyFlix — Compras de episódios e temporadas

## Preços
- Episódios com duração aproximada de **10 minutos** (até 15 minutos no cadastro): **150 LCoins**.
- Episódios com duração aproximada de **20 minutos** (mais de 15 minutos): **300 LCoins**.
- O preço de uma temporada comprada avulsa é a soma de seus episódios.
- Ao comprar **uma temporada com pelo menos 2 episódios de uma vez**, aplica-se **20% de desconto** sobre o preço avulso total.
- Para **completar uma temporada depois de comprar episódios individuais**, o que já foi pago é abatido do valor com desconto. O valor restante nunca é negativo.
- Se todos os episódios já estiverem desbloqueados, a temporada fica completa sem nova cobrança. Uma temporada com apenas um episódio registrado não recebe desconto de pacote.

### Exemplos
| Temporada | Avulso | Pacote | Se 2 episódios já foram comprados |
| --- | ---: | ---: | ---: |
| 10 episódios de ~10 min | 1.500 | 1.200 | 900 para completar |
| 10 episódios de ~20 min | 3.000 | 2.400 | 1.800 para completar |
| 1 episódio de ~20 min | 300 | 300 | — |

## Implementação
- O arquivo `lightyflix-pricing.js` contém funções puras de tabela de preços, posse de episódios, e cotação de temporadas; o app calcula tudo a partir de `LIGHTY_SERIES` e `duration` do catálogo.
- Cada episódio possui um botão de compra em todas as séries cadastradas. Uma temporada comprada desbloqueia todos os episódios daquele pacote.
- O saldo e os totais são atualizados após cada compra. Antes de cobrar, uma confirmação mostra o saldo anterior e o novo saldo.
- Chaves: `episode:<id>:<temporada>:<episódio>` e `season:<id>:<temporada>`.
- Compras e LCoins **continuam locais no navegador**, associadas ao UID; não são uma economia segura contra adulteração nem sincronizada entre aparelhos. Sincronização segura requer backend autoritativo.

## Reprodução
- Este trabalho **não** adiciona nem hospeda vídeos protegidos. Os vídeos ainda não disponíveis são marcados claramente como indisponíveis, inclusive depois da compra; a confirmação explica isso. Para publicar reprodução online, será necessária uma fonte autorizada para a distribuição.
- A compra aqui é um desbloqueio de catálogo antecipado, não garante que um vídeo esteja pronto para assistir. Recomendado testar primeiro com conteúdo próprio ou autorizado.

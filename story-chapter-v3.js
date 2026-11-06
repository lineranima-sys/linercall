// Capítulo 1 — O Herói sem Nome. Distâncias grandes e marcos próprios por área.
export const WIDTH=960,HEIGHT=540,FLOOR=432;
export const chapter=[
 {id:'estrada',name:'A Carta e a Longa Estrada',biome:'meadow',length:4550,
  ground:[[0,840],[950,1610],[1715,2600],[2705,3530],[3630,4590]],
  platforms:[[820,342,150],[1590,324,148],[2580,338,147],[3510,319,150]],
  enemies:[[430,'slime'],[700,'goblin'],[1120,'slime'],[1440,'goblin'],[1950,'goblin'],[2310,'slime'],[2910,'goblin'],[3160,'slime'],[3900,'goblin'],[4220,'goblin']],
  checkpoints:[1250,3020],landmarks:[[120,'cabin'],[2140,'sign'],[3960,'ruin']]},
 {id:'floresta',name:'A Floresta das Ruínas',biome:'forest',length:3550,
  ground:[[0,760],[845,1340],[1430,2250],[2350,2990],[3080,3600]],
  platforms:[[744,335,118],[1321,319,135],[2220,323,151],[2965,328,150]],
  enemies:[[300,'goblin'],[510,'goblin'],[1030,'slime'],[1230,'goblin'],[1620,'goblin'],[1930,'slime'],[2550,'goblin'],[2820,'goblin'],[3270,'goblin']],
  checkpoints:[1460,2520],landmarks:[[600,'ruin'],[1800,'ruin'],[2770,'bridge']]},
 {id:'vila',name:'A Vila e os Portões do Castelo',biome:'village',length:2140,
  ground:[[0,2180]],platforms:[],enemies:[],checkpoints:[1060],
  landmarks:[[220,'statue'],[720,'fountain'],[1120,'statue'],[1820,'gate']]},
 {id:'montanha',name:'Montanha Sagrada',biome:'mountain',length:4140,
  ground:[[0,950],[1040,1900],[1990,2670],[2770,3460],[3560,4180]],
  platforms:[[918,329,145],[1870,321,143],[2640,317,152],[3422,316,164]],
  enemies:[[1400,'goblin'],[1670,'goblin'],[2300,'goblin'],[2560,'slime'],[3000,'goblin'],[3310,'goblin']],
  checkpoints:[1120,2350,3140],landmarks:[[380,'fish'],[1670,'ruin'],[3880,'dragon']]},
 {id:'castelo',name:'A Torre de Malacord',biome:'castle',length:3920,
  ground:[[0,3970]],platforms:[],enemies:[],checkpoints:[1250,2450],
  landmarks:[[300,'wedding'],[1160,'chest'],[2030,'dungeon'],[2690,'mist'],[3490,'cage']]}
];
export const lore={
 intro:[
  ['NARRADOR','A cabana distante','Longe de sua vila, o Herói sem Nome descansa em uma cabana. Uma carta selada chega à sua porta.'],
  ['BARDO','Uma carta desesperada','Meu amigo! Malacord capturou a princesa, roubou o seu rosto e tomou nosso castelo. Os guardas acreditam que ELE é você. Venha depressa!'],
  ['HERÓI','De volta ao reino','Nossa vila, a princesa, o Bardo... Vou atravessar o que for preciso. Minha espada ainda conhece o caminho.']
 ],
 arrival:[
  ['NARRADOR','O herói que todos conhecem','Depois de uma longa jornada, o herói retorna à vila. Seu rosto aparece em fontes, estátuas e bandeiras do reino.'],
  ['GUARDA','Pare, impostor!','Impossível! O Herói já está no castelo. Você é uma imitação enviada por Malacord. Ninguém passa por estes portões!'],
  ['BARDO','Um plano nas alturas','Eu sei quem você é. Vamos até a Montanha Sagrada. Há um dragão sob uma árvore no topo. Se ele aceitar nos levar, entraremos pela torre.']
 ],
 fish:[
  ['BARDO','MINHA MÃO!','Uma chave é necessária para seguir, mas... AI! Tem um peixe enorme DEVORANDO MINHA MÃO! Faça ele me soltar!'],
  ['HERÓI','Sem chegar perto demais','A espada precisa atingir o peixe de longe. Vou manter distância de sua mordida!']
 ],
 fishSong:[
  ['BARDO','Uma última canção','Minha mão está machucada, mas ainda consigo tocar meu alaúde. Ouça, peixinho... durma, durma...'],
  ['NARRADOR','O peixe adormece','O peixe luta contra o sono. Aproveite a abertura para acertar o golpe final!']
 ],
 fishWin:[['BARDO','A chave dentro do peixe','Ele finalmente dormiu! E... incrível! Uma chave caiu de sua boca. Agora podemos abrir a passagem.']],
 dragon:[
  ['DRAGÃO','Nada de recompensas!','Vocês vieram me tirar do meu descanso?! Estas moedas são minhas! E AGORA VOU DEVORAR OS DOIS!'],
  ['NARRADOR','Uma descida impossível','O herói agarra o Bardo e desliza pela pilha dourada. O dragão se lança atrás deles, cuspindo fogo!'],
  ['HERÓI','Não são moedas...','Esta embalagem está aberta. MALACORD PAGOU O DRAGÃO COM MOEDAS DE CHOCOLATE?!'],
  ['DRAGÃO','Não contem a ninguém!','QUE VERGONHA! Ajudarei vocês a entrar no castelo. Mas prometam voltar com moedas de verdade e deixar minha humilhação em segredo.'],
  ['BARDO','A promessa','Combinado. Fique junto à árvore da montanha. Voltaremos depois de resolver tudo com Malacord.']
 ],
 castle:[
  ['NARRADOR','A torre do castelo','O dragão pousa no alto do castelo. Os dois descem uma escada em espiral. Não há inimigos à vista. Estranho...'],
  ['MALACORD','O noivo!', 'Vestido para seu próprio casamento, Malacord gargalha: Hoje eu me caso com a princesa! E este reino será meu!'],
  ['BARDO','Vamos nos separar','Eu procuro a princesa no calabouço. Você investiga o salão e acha uma maneira de parar a cerimônia.']
 ],
 potion:[
  ['HERÓI','O baú do casamento','Um mapa dos lugares da cerimônia, um plano escrito por Malacord e... uma poção? Que tipo de presente de casamento é esse?'],
  ['NARRADOR','A espada flamejante','Desconfiado, o herói despeja a poção na lâmina. A espada se incendeia em um brilho vermelho deslumbrante.']
 ],
 princess:[
  ['NARRADOR','Enquanto isso, no calabouço...','O Bardo encontra a princesa, abre sua cela e a ajuda a levantar.'],
  ['PRINCESA','É UMA ARMADILHA!','Não é isso que Malacord quer! Ele quer que o herói derrame uma poção na espada! Você precisa avisá-lo AGORA!']
 ],
 explosion:[
  ['NARRADOR','A espada pisca...', 'Quando o Bardo e a princesa chegam ao salão, já é tarde. A espada explode, ferindo o herói. A fumaça envolve tudo!'],
  ['MALACORD','Seu pior inimigo','A princesa é acorrentada. Da névoa surge uma cópia do próprio herói. Cada ataque seu será devolvido por ela!'],
  ['HERÓI','Talvez vencer seja parar','Se a névoa repete tudo o que faço, talvez a única maneira de derrotá-la seja... guardar a espada.']
 ],
 cloneWin:[
  ['NARRADOR','O silêncio vence','O herói para de atacar. Sem golpes para imitar, a cópia enfraquece, se desfaz e vira pó.'],
  ['BARDO','ACABOU A FESTA!','Com a mão ferida, o Bardo reúne forças e acerta seu alaúde na cara de Malacord, lançando-o pelos ares.'],
  ['NARRADOR','A gaiola da princesa','Malacord desmaia. A princesa também. Sua gaiola começa a esquentar: as grades vão pegar fogo em UM MINUTO!']
 ],
 finale:[
  ['HERÓI','Há outra saída!','A chave está presa ao braço da princesa. Mas não vou machucá-la! A estrutura da gaiola está amarrada por cordas.'],
  ['NARRADOR','O último pedaço da espada','O herói arremessa o resto da lâmina nas cordas. Elas se rompem, as grades se soltam e a princesa fica livre!'],
  ['BARDO','Malacord atrás das grades','Juntos, levam Malacord desacordado ao calabouço. Quando ele acorda, proclama um nome terrível para si mesmo...'],
  ['MALACORD','GANONDORF!', 'Assim serei chamado!'],
  ['NARRADOR','FIM DO CAPÍTULO 1','O Herói sem Nome, o Bardo e a princesa salvaram o reino. O dragão ainda aguarda suas moedas verdadeiras, debaixo da árvore...']
 ]
};

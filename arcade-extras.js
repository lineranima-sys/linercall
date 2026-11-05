// Detetive — investigação com pistas e recompensas locais.
// Música e shooter FPS agora estão em módulos próprios.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rewardOnce(uid,key,coins,addCoins){
 const stamp='linercall-arcade-earned-'+uid+'-'+key;
 if(localStorage.getItem(stamp))return false;
 localStorage.setItem(stamp,'1');
 addCoins(coins);
 return true;
}
const CASES=[
 {name:'O Museu das Sombras',place:'Museu Aurora',intro:'A pedra lunar sumiu de uma vitrine trancada às 21h. Três pessoas tinham acesso ao prédio.',people:['O segurança','A restauradora','O curador','O jornalista'],answer:1,
  clues:['A vitrine não foi quebrada: alguém usou uma chave de conservação.','Uma gota de tinta azul fresca apareceu no chão, perto da reserva técnica.','A restauradora havia acabado de pintar uma réplica da pedra e devolveu as chaves com atraso.'],ending:'A restauradora trocou a pedra original por uma réplica. A tinta revelou o trajeto.'},
 {name:'O Relógio de Vidro',place:'Hotel Mirante',intro:'Todos os relógios do hotel pararam às 03h15 e um hóspede recebeu um bilhete anônimo.',people:['A gerente','O relojoeiro','O cozinheiro','O músico'],answer:1,
  clues:['Os relógios foram desligados pela mesma chave mestra da sala de manutenção.','Na sala havia uma lupa com marca de óleo de engrenagem.','O relojoeiro deixou uma fatura por reparar o sistema na manhã seguinte, mas esteve no hotel durante a madrugada.'],ending:'O relojoeiro armou a interrupção para esconder a troca de uma peça raríssima.'},
 {name:'O Rádio da Estação',place:'Estação Primavera',intro:'Um rádio antigo transmitiu a frase: “A meia-noite, a plataforma quatro”.',people:['A maquinista','O colecionador','O fotógrafo','A inspetora'],answer:1,
  clues:['A transmissão usou frequências antigas, não o rádio moderno da estação.','Um envelope trazia um desenho da antena desmontada no depósito.','O colecionador comprou recentemente o mesmo modelo de transmissor, segundo o recibo encontrado.'],ending:'O colecionador queria atrair a inspetora para mostrar um vagão histórico esquecido.'},
 {name:'A Última Luz do Farol',place:'Farol do Norte',intro:'O farol ligou sozinho apesar da falta de energia na costa.',people:['O eletricista','A bióloga','O marinheiro','O vigia'],answer:0,
  clues:['A luz estava conectada a uma bateria portátil, escondida atrás do painel.','Havia uma maleta de ferramentas com fios de cobre novos.','O eletricista havia anotado uma visita ao farol, mas disse que não entrou no prédio.'],ending:'O eletricista instalou uma bateria de emergência em segredo para testar a antiga lente.'},
 {name:'O Quarto do Espelho',place:'Teatro Anil',intro:'Uma mensagem surge num espelho do camarim sempre que o palco fica vazio.',people:['A atriz','O iluminador','O diretor','A costureira'],answer:1,
  clues:['A mensagem só é visível sob luz ultravioleta.','O fio da lâmpada especial vai diretamente à cabine de iluminação.','O iluminador tinha tinta invisível e um controle remoto da cabine.'],ending:'O iluminador criou a mensagem como pista para uma cápsula do tempo escondida no cenário.'},
 {name:'As Estrelas Sumiram',place:'Observatório Lince',intro:'O mapa digital do céu foi substituído por símbolos misteriosos.',people:['O astrônomo','A programadora','A visitante','O guia'],answer:1,
  clues:['O código do painel foi alterado usando uma conta de manutenção.','O arquivo contém comentários escritos numa linguagem de programação.','A programadora disse que atualizou o programa ontem, mas o registro mostra uma mudança hoje.'],ending:'A programadora escondeu um mapa de um cometa novo no sistema.'},
 {name:'O Segredo da Biblioteca',place:'Biblioteca das Marés',intro:'Um livro aparece numa estante diferente a cada noite, sem registro de empréstimo.',people:['O bibliotecário','A escritora','O estudante','A arquivista'],answer:3,
  clues:['Há um elevador estreito entre as duas estantes.','O piso perto do elevador tem marcas de carrinho.','A arquivista estava catalogando livros raros na sala escondida.'],ending:'A arquivista usava uma passagem secreta para restaurar o livro e devolvê-lo.'},
 {name:'O Trem Sem Passageiros',place:'Linha Azul',intro:'Um trem foi ouvido às 02h apesar de não haver viagens programadas.',people:['O despachante','A mecânica','O fiscal','O vendedor'],answer:1,
  clues:['As câmeras mostram um vagão de testes, não um trem comercial.','O trilho de serviço possui marcas recentes de lubrificação.','A mecânica assinou a revisão do vagão, com horário próximo às 02h.'],ending:'A mecânica fez um teste de freios fora do horário, sem avisar ao despacho.'}
];
export function mountDetective({root,user,addCoins}){
 let current=0,revealed=0,wrong=0;
 root.innerHTML='<div class="arcade-game detective-game"><span class="eyebrow">AGÊNCIA LINERCALL · INVESTIGAÇÃO</span>'+
 '<h2>🔎 Minigame Detetive</h2><p>Investigue oito casos originais, analise as evidências e descubra o responsável. Uma recompensa por caso resolvido.</p>'+
 '<div id="detective-cases" class="detective-case-picker"></div><div id="detective-case"></div></div>';
 const casePicker=root.querySelector('#detective-cases'),caseStage=root.querySelector('#detective-case');
 const key=n=>'detective-'+n;
 function paint(){
  const mystery=CASES[current];
  casePicker.innerHTML=CASES.map((c,i)=>'<button type="button" class="btn '+(current===i?'btn-primary':'')+'" data-case="'+i+'">'+
   'Caso '+(i+1)+(localStorage.getItem('linercall-arcade-earned-'+user.uid+'-'+key(i))?' ✓':'')+'</button>').join('');
  const solved=!!localStorage.getItem('linercall-arcade-earned-'+user.uid+'-'+key(current));
  caseStage.innerHTML='<div class="arcade-case-panel"><span class="eyebrow">'+esc(mystery.place)+'</span><h3>'+esc(mystery.name)+'</h3><p>'+esc(mystery.intro)+'</p>'+
   '<h4>📁 Caderno de evidências</h4><div class="detective-evidence">'+mystery.clues.slice(0,revealed).map((clue,i)=>'<p><b>Pista '+(i+1)+':</b> '+esc(clue)+'</p>').join('')+
   '</div>'+(revealed<mystery.clues.length?'<button class="btn" data-reveal>Examinar próxima pista</button>':'<p class="arcade-note">Todas as provas coletadas.</p>')+
   '<h4>🕵️ Quem está por trás do mistério?</h4><div class="detective-suspects">'+mystery.people.map((name,i)=>'<button class="btn" data-suspect="'+i+'" '+(revealed<2||solved?'disabled':'')+'>'+esc(name)+'</button>').join('')+'</div>'+
   '<p id="detective-result" class="arcade-note">'+(solved?'✓ Caso encerrado! '+esc(mystery.ending):revealed<2?'Encontre pelo menos duas pistas antes de acusar alguém.':'Faça sua dedução. Erros: '+wrong+'.')+'</p></div>';
 }
 function onClick(e){
  const item=e.target.closest('[data-case]');
  if(item){current=Number(item.dataset.case);revealed=0;wrong=0;paint();return;}
  if(e.target.closest('[data-reveal]')){revealed=Math.min(CASES[current].clues.length,revealed+1);paint();return;}
  const suspect=e.target.closest('[data-suspect]');
  if(!suspect)return;
  if(Number(suspect.dataset.suspect)===CASES[current].answer){
   const newReward=rewardOnce(user.uid,key(current),35,addCoins);
   paint();
   root.querySelector('#detective-result').textContent='✅ '+CASES[current].ending+(newReward?' +35 LCoins!':'');
  }else{
   wrong++;root.querySelector('#detective-result').textContent='Essa hipótese não bate com as pistas. Analise novamente. Tentativas incorretas: '+wrong+'.';
  }
 }
 root.addEventListener('click',onClick);
 paint();
 return ()=>root.removeEventListener('click',onClick);
}

// Pequenas melodias criadas para este minigame; não reproduzem músicas comerciais ou aberturas protegidas.

// Este módulo oferece apenas o jogo Detetive.

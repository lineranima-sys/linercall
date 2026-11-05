// Minigames de demonstração: detetive, músicas ORIGINAIS e arena solo Shoot'E R!
// Esses jogos usam carteira LCoins local. O jogo multiplayer real exigirá servidor autoritativo.
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
const TRACKS=[
 ['Geek','Fuga da Fortaleza',142,'square',[60,64,67,72,71,67,64,60,62,65,69,74,72,69,65,62]],
 ['Geek','Pixel Espacial',158,'triangle',[72,74,76,79,81,79,76,74,72,69,67,69,72,76,74,72]],
 ['Geek','Código do Herói',136,'sawtooth',[57,60,64,69,67,64,60,57,59,62,65,69,67,65,62,59]],
 ['Geek','Chefe da Masmorra',112,'square',[48,48,55,48,51,55,58,55,48,48,55,58,60,58,55,51]],
 ['Geek','Nave Sem Volta',148,'triangle',[64,67,71,76,74,71,67,64,62,64,67,71,69,67,64,62]],
 ['Geek','Portal Secreto',128,'square',[60,63,67,70,72,70,67,63,60,58,60,63,67,65,63,60]],
 ['Aberturas','Além do Horizonte',138,'sawtooth',[67,69,72,76,74,72,69,67,65,67,69,72,76,79,76,72]],
 ['Aberturas','Coração Flamejante',146,'triangle',[64,67,71,72,76,79,76,72,71,67,64,67,69,71,72,76]],
 ['Aberturas','Jornada Infinita',124,'sawtooth',[60,62,65,69,72,69,65,62,60,64,67,72,74,72,67,64]],
 ['Aberturas','O Despertar',152,'square',[62,65,69,74,72,69,65,62,65,69,72,77,74,72,69,65]],
 ['Aberturas','Luz da Vitória',132,'triangle',[67,72,74,76,79,76,74,72,69,72,76,81,79,76,72,69]],
 ['Aberturas','Destino nas Estrelas',118,'sawtooth',[60,64,67,71,72,76,74,71,69,67,64,62,60,64,67,72]],
 ['Sertanejo','Estrada de Terra',102,'triangle',[60,64,67,69,67,64,62,60,57,60,64,67,64,62,60,57]],
 ['Sertanejo','Céu do Interior',94,'sine',[64,67,69,72,69,67,64,62,60,62,64,67,69,67,64,60]],
 ['Sertanejo','Saudade no Sertão',88,'triangle',[57,60,64,65,64,60,57,55,57,60,62,65,64,62,60,57]],
 ['Sertanejo','Lua na Varanda',98,'sine',[60,62,64,67,69,67,64,62,60,57,60,64,67,64,62,60]],
 ['Sertanejo','Volta Pro Meu Lar',110,'triangle',[65,69,72,74,72,69,67,65,62,65,69,72,69,67,65,62]],
 ['Sertanejo','Poeira e Girassóis',106,'sine',[60,64,65,69,67,65,64,60,59,62,64,67,65,64,62,60]]
];
export function mountMusic({root,user,addCoins}){
 let genre='Geek',current=null,audio=null,playingNodes=[],usedByCategory={Geek:[],Aberturas:[],Sertanejo:[]};
 root.innerHTML='<section class="arcade-game music-game"><span class="eyebrow">GAME SHOW · 5 ALTERNATIVAS</span><h2>🎵 Adivinhe a Música!</h2>'+
 '<p>Ouça a melodia e escolha o <b>título certo</b>, não o nome da série. Trilhas originais de demonstração, sem gravações comerciais.</p>'+
 '<div class="music-genres">'+['Geek','Aberturas','Sertanejo'].map(g=>'<button class="btn" data-music-genre="'+g+'">'+g+'</button>').join('')+'</div>'+
 '<div id="music-round"></div></section>';
 const round=root.querySelector('#music-round');
 function stopAudio(){
  for(const n of playingNodes){try{n.stop()}catch{}}
  playingNodes=[];
 }
 function draw(){
  const candidates=TRACKS.filter(t=>t[0]===genre),c=current;
  const choices=[...candidates.filter(t=>t!==c)].sort(()=>Math.random()-.5).slice(0,4).concat([c]).sort(()=>Math.random()-.5);
  round.innerHTML='<div class="arcade-case-panel"><span class="eyebrow">'+genre.toUpperCase()+' · '+candidates.length+' músicas originais</span>'+
   '<h3>Qual é o título desta melodia?</h3><p>Recompensa: <b>23 LCoins</b> por acerto inédito. Cada melodia só paga uma vez.</p>'+
   '<button class="btn btn-primary" data-play-music>▶ Ouvir trecho</button><div class="music-choices">'+choices.map(t=>'<button class="btn" data-music-answer="'+esc(t[1])+'">'+esc(t[1])+'</button>').join('')+'</div>'+
   '<p id="music-result" class="arcade-note">Clique para ouvir a melodia.</p><button class="btn" data-music-next>Próxima música ↻</button></div>';
 }
 function next(){
  stopAudio();
  const options=TRACKS.filter(t=>t[0]===genre);
  let available=options.filter(t=>!usedByCategory[genre].includes(t[1]));
  if(!available.length){usedByCategory[genre]=[];available=options;}
  current=available[Math.floor(Math.random()*available.length)];
  usedByCategory[genre].push(current[1]);
  draw();
 }
 function play(){
  stopAudio();
  try{
   if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
   if(audio.state==='suspended')audio.resume();
   const [,name,bpm,type,notes]=current;
   const beat=60/bpm,start=audio.currentTime+.08;
   notes.forEach((midi,i)=>{
    const t=start+i*beat*.45,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=type;osc.frequency.value=440*Math.pow(2,(midi-69)/12);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(.13,t+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,t+beat*.41);
    osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+beat*.42);playingNodes.push(osc);
   });
  }catch(error){round.querySelector('#music-result').textContent='Seu navegador não conseguiu iniciar o áudio: '+error.message;}
 }
 let solved=false;
 function onClick(e){
  const g=e.target.closest('[data-music-genre]');
  if(g){genre=g.dataset.musicGenre;solved=false;next();return;}
  if(e.target.closest('[data-play-music]')){play();return;}
  if(e.target.closest('[data-music-next]')){solved=false;next();return;}
  const ans=e.target.closest('[data-music-answer]');
  if(!ans||solved)return;
  solved=true;
  const correct=ans.dataset.musicAnswer===current[1];
  const label=round.querySelector('#music-result');
  if(correct){
   const unique=rewardOnce(user.uid,'song-'+current[1],23,addCoins);
   label.textContent='🎉 Acertou! Era '+current[1]+'. '+(unique?'+23 LCoins!':'Você já havia recebido a recompensa desta música.');
  }else label.textContent='Não foi dessa vez! Era '+current[1]+'.';
  round.querySelectorAll('[data-music-answer]').forEach(b=>{b.disabled=true;b.classList.toggle('music-right-answer',b.dataset.musicAnswer===current[1]);});
 }
 root.addEventListener('click',onClick);
 next();
 return ()=>{root.removeEventListener('click',onClick);stopAudio();audio?.close().catch(()=>{});};
}

// SHOOT'E R!: treinamento solo com inimigos robóticos, sem violência gráfica.
export function mountShooter({root,user,addCoins}){
 const W=780,H=450,DURATION=75;
 const weapons=[
  {name:'Pistola',ammo:12,mag:12,reserve:72,damage:25,delay:235,range:620,reload:950},
  {name:'Submetralhadora',ammo:30,mag:30,reserve:180,damage:12,delay:86,range:510,reload:1350},
  {name:'Fuzil de precisão',ammo:5,mag:5,reserve:25,damage:95,delay:900,range:900,reload:1950},
  {name:'Faca',ammo:Infinity,mag:Infinity,reserve:Infinity,damage:65,delay:560,range:58,reload:0}
 ];
 let player={x:W/2,y:H/2,hp:100},enemies=[],bullets=[],particles=[],pressed=new Set(),mouse={x:W/2+100,y:H/2},slot=0;
 let kills=0,started=0,last=0,raf=0,lastSpawn=0,shotAt=0,finished=false,reloadUntil=0,mouseDown=false;
 root.innerHTML='<section class="arcade-game shooter-game"><span class="eyebrow">ARCADE SHOOTER · TREINAMENTO SOLO</span>'+
 '<h2 class="shooter-logo">SHOOT<span>’E</span> R!</h2><p>Arena retrô inspirada em jogos de tiro. Multijogador online ainda não disponível.</p>'+
 '<div class="shooter-hud"><span id="shoot-hp">❤️ 100 HP</span><span id="shoot-weapon"></span><span id="shoot-score">Alvos: 0</span><span id="shoot-timer">75s</span></div>'+
 '<canvas id="shoot-canvas" width="780" height="450" tabindex="0" aria-label="Arena de tiro vista de cima"></canvas>'+
 '<div class="shooter-keys"><b>WASD</b> mover · <b>Mouse / clique</b> mirar e atirar · <b>1-4</b> escolher arma · <b>R</b> recarregar</div>'+
 '<p id="shoot-message" class="arcade-note">Elimine 12 robôs de treino e sobreviva por 75 segundos para ganhar 45 LCoins, uma vez por dia.</p>'+
 '<div class="shooter-actions"><button class="btn btn-primary" data-shoot-start>▶ Iniciar partida</button><button class="btn" data-shoot-reload>R Recarregar</button></div></section>';
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),hud=root.querySelector('#shoot-weapon'),hint=root.querySelector('#shoot-message');
 let wallPositions=[[190,115,45,90],[545,240,45,90],[365,60,50,50],[365,340,50,50]];
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function updateHud(time=DURATION){
  root.querySelector('#shoot-hp').textContent='❤️ '+Math.ceil(player.hp)+' HP';
  const gun=weapons[slot];
  hud.textContent=gun.name+' · '+(slot===3?'∞':gun.ammo+'/'+gun.reserve)+(reloadUntil?' · RECARGANDO':'');
  root.querySelector('#shoot-score').textContent='Alvos: '+kills;
  root.querySelector('#shoot-timer').textContent=Math.max(0,Math.ceil(time))+'s';
 }
 function blocked(x,y,r=12){
  if(x<r||y<r||x>W-r||y>H-r)return true;
  return wallPositions.some(([wx,wy,ww,wh])=>x+r>wx&&x-r<wx+ww&&y+r>wy&&y-r<wy+wh);
 }
 function start(){
  enemies=[];bullets=[];particles=[];player={x:W/2,y:H/2,hp:100};
  weapons[0].ammo=12;weapons[0].reserve=72;
  weapons[1].ammo=30;weapons[1].reserve=180;
  weapons[2].ammo=5;weapons[2].reserve=25;
  slot=0;kills=0;lastSpawn=0;shotAt=0;reloadUntil=0;finished=false;pressed.clear();
  started=performance.now();last=started;canvas.focus();
  hint.textContent='Treino em andamento! Acerte 12 robôs antes do tempo acabar.';
  cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
 }
 function reload(now=performance.now()){
  const gun=weapons[slot];if(slot===3||gun.reserve<=0||gun.ammo===gun.mag||reloadUntil)return;
  reloadUntil=now+gun.reload;hint.textContent='Recarregando '+gun.name+'...';
 }
 function bulletFire(now){
  const gun=weapons[slot];
  if(now-shotAt<gun.delay||reloadUntil||finished)return;
  if(gun.ammo<=0){reload(now);return;}
  shotAt=now;
  if(slot!==3)gun.ammo--;
  const theta=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  let hit=null,dist=gun.range;
  for(const enemy of enemies){
   const dx=enemy.x-player.x,dy=enemy.y-player.y,projection=dx*Math.cos(theta)+dy*Math.sin(theta);
   if(projection<0||projection>dist)continue;
   const perpendicular=Math.abs(-dx*Math.sin(theta)+dy*Math.cos(theta));
   if(perpendicular<(slot===3?25:enemy.radius+5)){
    const spot={x:player.x+Math.cos(theta)*projection,y:player.y+Math.sin(theta)*projection};
    if(wallPositions.some(([x,y,w,h])=>{
      const steps=Math.ceil(projection/10);
      for(let i=1;i<steps;i++){const tx=player.x+Math.cos(theta)*projection*i/steps,ty=player.y+Math.sin(theta)*projection*i/steps;if(tx>x&&tx<x+w&&ty>y&&ty<y+h)return true;}
      return false;
    }))continue;
    dist=projection;hit=enemy;
   }
  }
  if(hit){hit.hp-=gun.damage;particles.push({x:hit.x,y:hit.y,ttl:.24});if(hit.hp<=0){enemies.splice(enemies.indexOf(hit),1);kills++;}}
  if(slot!==3)bullets.push({x1:player.x,y1:player.y,x2:player.x+Math.cos(theta)*dist,y2:player.y+Math.sin(theta)*dist,ttl:.09,slot});
 }
 function spawn(){
  const corners=[[40,40],[W-40,40],[40,H-40],[W-40,H-40]];
  const pick=corners[Math.floor(Math.random()*corners.length)];
  if(Math.hypot(pick[0]-player.x,pick[1]-player.y)<160)return;
  enemies.push({x:pick[0],y:pick[1],hp:60,radius:15,speed:38+Math.random()*28,hitAt:0});
 }
 function end(success){
  finished=true;cancelAnimationFrame(raf);mouseDown=false;
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let prize=false;
  if(success&&kills>=12)prize=rewardOnce(user.uid,'shooter-'+day,45,addCoins);
  hint.textContent=success&&kills>=12?'🏆 Treino completo! '+(prize?'+45 LCoins!':'A recompensa diária já foi recebida.'):'Fim de treino: '+kills+' robôs atingidos. Faça 12 ou mais para ganhar.';
  updateHud(0);
 }
 function frame(now){
  if(finished)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  const remaining=DURATION-(now-started)/1000;
  if(remaining<=0){end(player.hp>0);return;}
  if(reloadUntil&&now>=reloadUntil){const gun=weapons[slot],amount=Math.min(gun.mag-gun.ammo,gun.reserve);gun.ammo+=amount;gun.reserve-=amount;reloadUntil=0;}
  let dx=Number(pressed.has('d')||pressed.has('arrowright'))-Number(pressed.has('a')||pressed.has('arrowleft'));
  let dy=Number(pressed.has('s')||pressed.has('arrowdown'))-Number(pressed.has('w')||pressed.has('arrowup'));
  const mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag;
  if(!blocked(player.x+dx*220*dt,player.y))player.x+=dx*220*dt;
  if(!blocked(player.x,player.y+dy*220*dt))player.y+=dy*220*dt;
  if(mouseDown)bulletFire(now);
  if(now-lastSpawn>1700){spawn();lastSpawn=now;}
  for(const enemy of enemies){
   const ex=player.x-enemy.x,ey=player.y-enemy.y,len=Math.hypot(ex,ey)||1;
   if(len>29){
    const nx=enemy.x+(ex/len)*enemy.speed*dt,ny=enemy.y+(ey/len)*enemy.speed*dt;
    if(!blocked(nx,enemy.y,enemy.radius))enemy.x=nx;
    if(!blocked(enemy.x,ny,enemy.radius))enemy.y=ny;
   }else if(now-enemy.hitAt>900){player.hp=Math.max(0,player.hp-8);enemy.hitAt=now;}
  }
  if(player.hp<=0){end(false);return;}
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#101b29';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#26384a';ctx.lineWidth=1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(const [x,y,w,h] of wallPositions){ctx.fillStyle='#3b5067';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#84adc4';ctx.strokeRect(x,y,w,h);}
  bullets=bullets.filter(b=>{b.ttl-=dt;if(b.ttl<=0)return false;ctx.strokeStyle=b.slot===2?'#ffe69c':'#a1e9ff';ctx.lineWidth=b.slot===2?5:3;ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.stroke();return true;});
  particles=particles.filter(p=>{p.ttl-=dt;if(p.ttl<=0)return false;ctx.fillStyle='#fff3a3';ctx.beginPath();ctx.arc(p.x,p.y,26*p.ttl,0,Math.PI*2);ctx.fill();return true;});
  for(const e of enemies){
   ctx.fillStyle='#f4ad5c';ctx.beginPath();ctx.arc(e.x,e.y,e.radius,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#472f30';ctx.fillRect(e.x-7,e.y-3,14,6);
  }
  const theta=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  ctx.fillStyle='#40d3d7';ctx.beginPath();ctx.arc(player.x,player.y,16,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f4faff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(player.x+Math.cos(theta)*22,player.y+Math.sin(theta)*22);ctx.stroke();
  ctx.strokeStyle='#ffdf88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mouse.x,mouse.y,9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(mouse.x-13,mouse.y);ctx.lineTo(mouse.x+13,mouse.y);ctx.moveTo(mouse.x,mouse.y-13);ctx.lineTo(mouse.x,mouse.y+13);ctx.stroke();
  updateHud(remaining);raf=requestAnimationFrame(frame);
 }
 function onKeyDown(event){
  if(!root.isConnected||!root.contains(document.activeElement)&&['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))event.preventDefault();
  const key=event.key.toLowerCase();pressed.add(key);
  if('1234'.includes(key)&&key.length===1){slot=Number(key)-1;reloadUntil=0;updateHud();}
  if(key==='r')reload();
 }
 function onKeyUp(event){pressed.delete(event.key.toLowerCase());pressed.delete(event.key);}
 function onMove(e){const rect=canvas.getBoundingClientRect();mouse={x:clamp((e.clientX-rect.left)*W/rect.width,0,W),y:clamp((e.clientY-rect.top)*H/rect.height,0,H)};}
 function onDown(e){e.preventDefault();canvas.focus();mouseDown=true;bulletFire(performance.now());}
 function onUp(){mouseDown=false;}
 function onClick(e){if(e.target.closest('[data-shoot-start]'))start();if(e.target.closest('[data-shoot-reload]'))reload();}
 document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
 canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerdown',onDown);
 document.addEventListener('pointerup',onUp);root.addEventListener('click',onClick);
 updateHud();ctx.fillStyle='#101b29';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffbd65';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('SHOOT’E R! · APERTE INICIAR',W/2,H/2);
 return ()=>{cancelAnimationFrame(raf);finished=true;document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);document.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerdown',onDown);root.removeEventListener('click',onClick);};
}

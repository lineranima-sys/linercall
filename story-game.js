// Herói em um mundo Luminoso · Capítulo 1 — aventura 2D original em Canvas.
// A arte é desenhada no próprio jogo: não exige imagens externas.
const CW=480, CH=270, FLOOR=220;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const r01=n=>{const f=Math.sin(n*13.713+7.19)*43758.5453;return f-Math.floor(f);};
const levels=[
 {name:'A longa estrada',length:3400,kind:'field',ground:[[0,480],[555,980],[1055,1470],[1545,1990],[2060,2520],[2590,3020],[3090,3470]],platforms:[[473,178,88],[972,176,90],[1460,180,92],[1980,174,90],[2510,174,92],[3010,180,90]],mobs:[360,670,880,1130,1330,1670,1810,2230,2410,2760,2950,3260]},
 {name:'A vila e o castelo',length:1250,kind:'village',ground:[[0,1280]],platforms:[],mobs:[]},
 {name:'Montanha Sagrada',length:2400,kind:'mountain',ground:[[0,820],[895,1260],[1335,1710],[1785,2440]],platforms:[[815,178,90],[1255,169,90],[1703,178,90]],mobs:[990,1160,1430,1650,1890,2010]},
 {name:'O castelo de Malacord',length:2380,kind:'castle',ground:[[0,2420]],platforms:[],mobs:[]}
];
const heroPixels=['...HHHH....','..HHHHHH...','..HSSSSH...','..HSESSH...','...SSSS....','..CCCCC....','..CCCCCC...','..CCYCCC...','..CCCCC....','...BB.BB...','...BB.BB...','..BBB.BBB..'];
const bardoPixels=['..PPPPP...','..PSSSP...','...SSS....','..GGGGG...','..GGGGG.O.','..GGGGG/O.','...DDDDD..','...DD.DD..','...DD.DD..'];
const goblinPixels=['..GGGGG..','.GGGGGGG.','GGEGGEGGG','GGGGGGGGG','.GTTTTTG.','..RRRRR..','..RR.RR..'];
const colors={H:'#6e3b35',S:'#f7c69b',E:'#182b4c',C:'#4677bc',Y:'#f7ca63',B:'#40324e',P:'#76543b',G:'#4eb77a',D:'#60416e',O:'#f3be6a',R:'#674461',T:'#e1bc93'};
export function mountStory(root,onExit){
 let dead=false,frame=0,scene=0,paused=true,pending=null,last=0,camera=0;
 const key={left:false,right:false};
 const flags={guards:false,fishNotice:false,fish:false,key:false,dragon:false,wedding:false,potion:false,princess:false,explosion:false,clone:false,bardo:false,rescue:false,win:false};
 const player={x:40,y:FLOOR-24,vy:0,ground:true,face:1,hp:5,iframes:0,swing:0,cooldown:0,fishHP:3,peace:0,timer:60};
 let mobs=[];
 function build(){
  root.innerHTML='<div class="luminous-shell"><header class="luminous-header"><div><span>LINERCALL ORIGINAL · CAPÍTULO 1</span><h2>Herói em um mundo Luminoso</h2><p>Uma aventura de plataforma 2D pixel art</p></div><button class="btn" data-story-exit-new>← Minigames</button></header>'+
   '<div class="luminous-hud"><b id="luminous-zone">A longa estrada</b><span id="luminous-hp">♥ ♥ ♥ ♥ ♥</span><b id="luminous-distance">0%</b></div>'+
   '<div class="luminous-screen"><canvas id="luminous-canvas" width="480" height="270" aria-label="Jogo de plataforma 2D em pixel art"></canvas>'+
   '<div class="luminous-dialog" id="luminous-dialog"><small id="luminous-speaker">NARRADOR</small><h3 id="luminous-dialog-title"></h3><p id="luminous-dialog-body"></p><button class="btn btn-primary" data-story-next-new>Continuar →</button></div></div>'+
   '<div class="luminous-touch"><div><button data-story-hold="left">◀</button><button data-story-hold="right">▶</button></div><div><button data-story-act="jump">▲ PULAR</button><button data-story-act="attack">⚔ ATACAR</button></div></div>'+
   '<p class="luminous-instructions">A / D ou ← → mover · Espaço pular · X atacar ou interagir · O jogo é gratuito durante os testes.</p></div>';
 }
 build();
 const c=root.querySelector('#luminous-canvas').getContext('2d',{alpha:false});
 c.imageSmoothingEnabled=false;
 const modal=root.querySelector('#luminous-dialog');
 function dialogue(who,title,body,next){
  paused=true;key.left=false;key.right=false;pending=next||null;
  root.querySelector('#luminous-speaker').textContent=who;
  root.querySelector('#luminous-dialog-title').textContent=title;
  root.querySelector('#luminous-dialog-body').textContent=body;
  modal.classList.remove('hidden');
 }
 function resume(){modal.classList.add('hidden');paused=false;const f=pending;pending=null;if(f)f();}
 function initActors(){
  player.x=35;player.y=FLOOR-24;player.vy=0;player.hp=5;player.iframes=0;player.peace=0;
  mobs=levels[scene].mobs.map((x,i)=>({x,hp:2,alive:true,seed:i+scene*13}));
 }
 function nextLevel(who,title,body){
  scene++;initActors();dialogue(who,title,body);
 }
 const box=(x,y,w,h,fill)=>{c.fillStyle=fill;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
 function sprite(rows,x,y,s=2,palette=colors){
  for(let iy=0;iy<rows.length;iy++)for(let ix=0;ix<rows[iy].length;ix++){
   const col=palette[rows[iy][ix]];if(col)box(x+ix*s,y+iy*s,s,s,col);
  }
 }
 function clouds(x,y,size){
  box(x+8,y,40*size,17*size,'#f0ffff');box(x,y+10*size,70*size,18*size,'#cff7ff');
  box(x+18*size,y-7*size,35*size,20*size,'#ffffff');box(x+9*size,y+24*size,55*size,5*size,'#79d9ef');
 }
 function backdrop(){
  const kind=levels[scene].kind;
  const gradient=c.createLinearGradient(0,0,0,CH);
  if(kind==='castle'){gradient.addColorStop(0,'#2a3259');gradient.addColorStop(1,'#97718b');}
  else{gradient.addColorStop(0,'#00b1f9');gradient.addColorStop(.65,'#77dcf5');gradient.addColorStop(1,'#c4f7e3');}
  c.fillStyle=gradient;c.fillRect(0,0,CW,CH);
  if(kind!=='castle'){box(364,18,40,40,'#f5fce0');box(370,12,28,28,'#fffcdb');}
  for(let i=0;i<10;i++){const x=((i*123-camera*.21)%(CW+150)+(CW+150))%(CW+150)-100;clouds(x,33+(i%4)*24,.6+(i%3)*.2);}
  for(let i=0;i<12;i++){
   const x=i*102-camera*.37;const h=kind==='mountain'?105:kind==='castle'?140:72;
   c.fillStyle=kind==='castle'?'#50466b':kind==='mountain'?'#59aabf':'#62b9ca';
   c.beginPath();c.moveTo(x-70,220);c.lineTo(x+15,220-h-(i%3)*12);c.lineTo(x+98,220);c.fill();
  }
  for(let i=0;i<18;i++){
   const x=((i*99-camera*.58)%(CW+130)+(CW+130))%(CW+130)-60;
   if(kind==='castle'){box(x,130,40,90,'#615574');box(x+9,109,23,25,'#83758e');}
   else{box(x+15,167,8,56,'#765a45');box(x,143+(i%3)*5,43,29,'#208e65');box(x+8,129+(i%3)*5,26,30,kind==='mountain'?'#31a88a':'#45c883');}
  }
 }
 function land(x,y,w,height=CH-y){
  const sx=x-camera;if(sx>520||sx+w< -40)return;
  const castle=levels[scene].kind==='castle';
  box(sx,y,w,height,castle?'#64516e':'#5a3b49');box(sx,y,w,4,castle?'#d0b8ca':'#70d54c');box(sx,y+4,w,4,castle?'#9c8ba4':'#9ce757');
  for(let i=0;i<w;i+=11){if(r01(x+i)>.2)box(sx+i,y+16+(i%7)*3,6,4,castle?'#8e7b93':'#a26c4f');if(r01(x+i+31)>.5)box(sx+i+3,y+35,4,4,'#c08b63');}
 }
 function fish(x,y){
  box(x-46,y-16,80,44,'#3f97aa');box(x-24,y-26,47,19,'#6ac8d0');box(x-66,y-32,22,65,'#257489');
  box(x+18,y-7,8,8,'#fff');box(x+21,y-4,4,4,'#192b3e');
  for(let i=0;i<4;i++)box(x+i*10,y+25,6,10,'#e5e8db');
 }
 function decorations(){
  const at=x=>x-camera;
  if(scene===0)for(let i=0;i<35;i++){const x=at(i*108+45);if(x<0||x>480)continue;
   if(i%4===0){box(x,209,4,9,'#36a66a');box(x-3,206,10,5,'#f9d560');}
   if(i%7===0){box(x,194,19,22,'#b17b38');box(x+4,199,10,10,'#f9d75a');}
  }
  if(scene===1){
   for(const x of [180,415,640]){let t=at(x);box(t,146,41,72,'#e6dfd2');box(t+6,114,29,32,'#9ab6c9');box(t+9,107,23,13,'#f7ecd4');}
   let t=at(350);box(t-30,196,75,22,'#e1e1e3');box(t-23,192,61,7,'#5fcaf2');box(t,176,8,19,'#fff');
   t=at(1030);box(t-110,69,205,150,'#a7a0b9');box(t-87,43,53,175,'#8f89aa');box(t+40,42,53,176,'#8f89aa');
   box(t-25,141,52,78,'#463b65');box(t-13,155,25,64,'#2c2449');
   for(let i=0;i<6;i++)box(t-85+i*30,97,14,18,'#514c70');
   sprite(bardoPixels,at(1175),FLOOR-22);
  }
  if(scene===2){
   for(let i=0;i<10;i++){const x=at(i*245+170);box(x,167,22,51,'#81707b');box(x-7,161,36,9,'#c9ae9a');}
   if(!flags.fish)fish(at(485),163);
   const x=at(2220);if(x>-140&&x<560){
    box(x+45,85,14,130,'#765047');
    for(let i=0;i<5;i++)box(x+i*17,59+(i%3)*8,47,37,i%2?'#3ab883':'#288e72');
    for(let i=0;i<34;i++)box(x-14+i%10*13,201-Math.floor(i/10)*7,12,8,'#f8cc64');
    box(x+9,166,98,39,'#367b98');box(x+26,145,50,26,'#62bda5');box(x+84,146,33,25,'#57a99e');box(x+95,150,6,6,'#122e41');
    box(x+5,201,29,12,'#b78060');box(x+9,205,21,7,'#fce0a4');
   }
  }
  if(scene===3){
   for(let i=0;i<18;i++){const x=at(i*152+100);box(x,66,19,155,'#6c577d');box(x-9,53,37,17,'#aa93ae');box(x+33,104,12,49,'#d36573');box(x+37,104,4,49,'#ffe0a8');}
   if(!flags.potion){const x=at(850);box(x-15,189,38,30,'#9a653b');box(x-17,182,42,8,'#e0a05b');box(x,194,8,12,'#fdd74b');}
   if(flags.explosion&&!flags.clone){const x=at(1680);sprite(heroPixels,x,FLOOR-24,2,{...colors,C:'#a6b4c6',H:'#b8d8dd',S:'#bad5df'});}
   if(flags.clone){const x=at(2000);sprite(bardoPixels,x,FLOOR-22);}
   if(flags.rescue){const x=at(2240);box(x-33,129,81,89,'#5e516e');for(let i=0;i<9;i++)box(x-30+i*9,131,3,85,'#dec4cf');box(x+5,173,21,30,'#eeb8b9');box(x+8,163,15,11,'#ffd2a8');box(x+43,144,9,60,'#e4c28d');}
  }
 }
 function draw(){
  camera=clamp(player.x-145,0,levels[scene].length-CW+30);
  backdrop();
  levels[scene].ground.forEach(g=>land(g[0],FLOOR,g[1]-g[0]));
  levels[scene].platforms.forEach(p=>land(p[0],p[1],p[2],10));
  decorations();
  for(const m of mobs){if(!m.alive)continue;const x=m.x-camera;if(x>-35&&x<500)sprite(goblinPixels,x,FLOOR-18+Math.sin(frame*.07+m.seed)*2,2);}
  const px=player.x-camera;
  if(player.swing>0){box(px+player.face*19,player.y+12,player.face*17,5,'#fff5ac');box(px+player.face*28,player.y+2,player.face*5,19,'#fafff0');}
  if(player.iframes<=0||Math.floor(player.iframes/6)%2===1)sprite(heroPixels,px,player.y);
  box(7,7,116,19,'#233b57');box(10,10,player.hp*22,12,'#f17480');
  c.font='bold 11px monospace';c.fillStyle='#fff';c.fillText('♥ '+player.hp+'    ✦',13,40);
  if(scene===3&&flags.rescue&&!flags.win){box(147,7,186,26,'#963f62');c.fillStyle='white';c.fillText('RESGATE: '+Math.ceil(player.timer)+'s',164,23);}
  if(scene===3&&flags.explosion&&!flags.clone){for(let i=0;i<28;i++)box(r01(i*42+Math.floor(frame/5))*CW,r01(i*23+Math.floor(frame/9))*200,5,5,'#d9dfec88');}
  root.querySelector('#luminous-zone').textContent=levels[scene].name;
  root.querySelector('#luminous-hp').textContent='♥ '.repeat(player.hp).trim();
  root.querySelector('#luminous-distance').textContent=Math.floor(clamp(player.x/levels[scene].length,0,1)*100)+'%';
 }
 function damage(){
  if(player.iframes>0)return;
  player.hp--;player.iframes=65;
  if(player.hp<=0){player.hp=5;player.x=Math.max(25,player.x-240);dialogue('NARRADOR','Você ainda não foi derrotado','O herói retorna a um ponto seguro e recupera o fôlego. Continue tentando!');}
 }
 function attack(){
  if(paused||player.cooldown>0)return;
  player.swing=13;player.cooldown=28;
  for(const m of mobs){if(!m.alive)continue;if(Math.abs(m.x-player.x)<48){m.hp--;if(m.hp<=0)m.alive=false;}}
  if(scene===2&&!flags.fish&&Math.abs(485-player.x)<70){
   player.fishHP--;
   if(player.fishHP<=0){flags.fish=true;flags.key=true;dialogue('BARDO','A canção e a chave','Apesar da mão ferida, o Bardo toca uma melodia que adormece o peixe. Uma chave cai de dentro dele! Vamos subir a montanha.');}
  }
  if(scene===3&&flags.explosion&&!flags.clone){player.peace=0;damage();dialogue('CÓPIA DE NÉVOA','Ele copia seus golpes!','Cada vez que você ataca, a cópia de névoa também ataca. Talvez seja melhor guardar a espada...');}
  if(scene===3&&flags.rescue&&!flags.win&&Math.abs(2240-player.x)<85){
   flags.win=true;
   dialogue('HERÓI','Não precisamos machucá-la!','O herói arremessa o resto da espada nas cordas que prendem as grades. A princesa é libertada sem que ninguém perca um braço!',()=>{
    dialogue('BARDO','Malacord foi preso!','O Bardo e o herói colocam Malacord no calabouço. Ao acordar, ele anuncia seu novo nome...',()=>{
     dialogue('FIM DO CAPÍTULO 1','GANONDORF!','E assim acaba Herói em um mundo Luminoso — Capítulo 1. Obrigado por jogar!');});
   });
  }
 }
 function events(dt){
  if(scene===0&&player.x>3320)nextLevel('NARRADOR','O reino está próximo','Após uma longa viagem enfrentando monstros do perverso Malacord, o herói chega ao lugar onde todos conhecem seu rosto.');
  if(scene===1){
   if(player.x>790&&!flags.guards){flags.guards=true;dialogue('GUARDA','O verdadeiro herói está lá dentro!','Seu rosto é igual ao do herói de nossas estátuas, mas você é uma farsa! Os guardas se recusam a deixá-lo passar.',()=>{
    dialogue('BARDO','A Montanha Sagrada','O Bardo sugere buscar o dragão que vive na Montanha Sagrada. Com ele, talvez possam entrar pelo alto do castelo.');});}
   if(player.x>1190)nextLevel('BARDO','Precisamos de uma chave','Vamos subir a montanha. Mas a passagem está trancada... Espera. O QUE É ISSO NA MINHA MÃO?!');
  }
  if(scene===2){
   if(player.x>275&&!flags.fishNotice){flags.fishNotice=true;dialogue('BARDO','O peixe está mordendo minha mão!','Derrote o peixe monstruoso. Vou tentar ajudá-lo com meu alaúde!');}
   if(!flags.fish&&player.x>415)player.x=415;
   if(player.x>2135&&!flags.dragon){
    flags.dragon=true;
    dialogue('DRAGÃO','Não me incomodem!','Eu não quero compensar vocês. Vou devorá-los!',()=>{
     dialogue('HERÓI','Moedas de chocolate?!','O herói desliza pela pilha de moedas. Uma embalagem entreaberta revela que Malacord enganou o dragão com moedas falsas!',()=>{
      dialogue('DRAGÃO','Não contem a ninguém!','Envergonhado, o dragão implora para ajudar. Os dois prometem pagar moedas verdadeiras. Ele ficará esperando sob sua árvore.',()=>{
       nextLevel('NARRADOR','O castelo por cima','O dragão leva os dois à torre do castelo. Eles descem por uma escada e encontram Malacord vestido para o próprio casamento.');
      });});});
   }
  }
  if(scene===3){
   if(player.x>390&&!flags.wedding){flags.wedding=true;dialogue('MALACORD','Eu vou me casar com a princesa!','O vilão, disfarçado de herói, está vestido para o casamento. O herói e o Bardo se separam para procurar a princesa.');}
   if(player.x>800&&!flags.potion){flags.potion=true;dialogue('HERÓI','A espada flamejante','Em um baú estão o mapa do casamento e uma poção. O herói derrama o líquido sobre sua espada, que começa a arder em chamas!');}
   if(player.x>1100&&!flags.princess){flags.princess=true;dialogue('POV DO BARDO','A princesa avisa','No calabouço, o Bardo encontra e solta a princesa. Ela grita: “Não é isso que o Malacord quer! Que ele derrame uma poção os caramba!”');}
   if(player.x>1410&&!flags.explosion){flags.explosion=true;dialogue('NARRADOR','A ESPADA EXPLODE!','A espada flamejante pisca e explode, ferindo o herói. A névoa enche o salão. A princesa é acorrentada e surge uma cópia do herói feita de fumaça.');}
   if(flags.explosion&&!flags.clone){
    if(player.x>1580)player.x=1580;
    player.peace+=dt;
    if(player.peace>220){flags.clone=true;dialogue('NARRADOR','A cópia se desfez','O herói parou de atacar. Como a névoa copiava os seus ataques, ela simplesmente perdeu a forma e virou pó.');}
   }
   if(player.x>1940&&flags.clone&&!flags.bardo){flags.bardo=true;dialogue('BARDO','Toma esta, Malacord!','Mesmo com uma mão machucada, o Bardo acerta a cara do Malacord com o alaúde. O vilão voa e cai desacordado.');}
   if(player.x>2130&&flags.bardo&&!flags.rescue){flags.rescue=true;player.timer=60;dialogue('HERÓI','UM MINUTO PARA SALVÁ-LA!','A chave está presa ao braço da princesa?! Não vamos arrancar o braço dela! As grades entrarão em chamas. Acerte as cordas da gaiola com X para soltá-las.');}
   if(flags.rescue&&!flags.win){
    player.timer-=dt/60;
    if(player.timer<=0){player.timer=60;dialogue('NARRADOR','Tente de novo!','O herói afasta a gaiola das chamas. Você ganhou mais uma chance: aproxime-se das cordas e aperte X.');}
   }
  }
 }
 function step(dt){
  if(paused)return;
  frame+=dt;player.swing=Math.max(0,player.swing-dt);player.cooldown=Math.max(0,player.cooldown-dt);player.iframes=Math.max(0,player.iframes-dt);
  const speed=((key.right?1:0)-(key.left?1:0))*2.7*dt;
  if(speed)player.face=Math.sign(speed);
  player.x=clamp(player.x+speed,0,levels[scene].length);
  const oldBottom=player.y+24;
  player.vy=Math.min(10,player.vy+.37*dt);player.y+=player.vy*dt;player.ground=false;
  for(const [a,b] of levels[scene].ground){
   if(player.x+12>a&&player.x+7<b&&player.vy>=0&&oldBottom<=FLOOR+3&&player.y+24>=FLOOR){player.y=FLOOR-24;player.vy=0;player.ground=true;}
  }
  for(const [x,y,w] of levels[scene].platforms){
   if(player.x+12>x&&player.x<x+w&&player.vy>=0&&oldBottom<=y+3&&player.y+24>=y){player.y=y-24;player.vy=0;player.ground=true;}
  }
  if(player.y>CH+35){damage();player.x=Math.max(20,player.x-175);player.y=FLOOR-24;player.vy=0;}
  for(const mob of mobs)if(mob.alive&&Math.abs(mob.x-player.x)<18&&Math.abs((FLOOR-18)-player.y)<24)damage();
  events(dt);
 }
 function loop(t){
  if(dead)return;
  const dt=clamp((t-(last||t))/16.667,.35,2);last=t;
  step(dt);draw();frame=requestAnimationFrame(loop);
 }
 function jump(){if(!paused&&player.ground){player.ground=false;player.vy=-8.7;}}
 function onKeyDown(e){
  if(dead||e.target?.matches('input, textarea, select'))return;
  const k=e.key.toLowerCase();
  if(['arrowleft','arrowright','arrowup','a','d','w',' ','x','z'].includes(k))e.preventDefault();
  if(k==='arrowleft'||k==='a')key.left=true;
  if(k==='arrowright'||k==='d')key.right=true;
  if(!e.repeat&&(k==='arrowup'||k==='w'||k===' '))jump();
  if(!e.repeat&&(k==='x'||k==='z'))attack();
  if(k==='enter'&&!modal.classList.contains('hidden'))resume();
 }
 function onKeyUp(e){const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')key.left=false;if(k==='arrowright'||k==='d')key.right=false;}
 function onBlur(){key.left=false;key.right=false;}
 function onClick(e){
  if(e.target.closest('[data-story-next-new]'))resume();
  if(e.target.closest('[data-story-exit-new]')){destroy();onExit();}
  const action=e.target.closest('[data-story-act]')?.dataset.storyAct;
  if(action==='jump')jump();if(action==='attack')attack();
 }
 function onHold(e){const btn=e.target.closest('[data-story-hold]');if(!btn)return;e.preventDefault();key[btn.dataset.storyHold]=true;btn.setPointerCapture?.(e.pointerId);}
 function onRelease(e){const btn=e.target.closest('[data-story-hold]');if(btn)key[btn.dataset.storyHold]=false;}
 root.addEventListener('click',onClick);root.addEventListener('pointerdown',onHold);root.addEventListener('pointerup',onRelease);root.addEventListener('pointercancel',onRelease);
 window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
 function destroy(){
  dead=true;cancelAnimationFrame(frame);root.removeEventListener('click',onClick);
  root.removeEventListener('pointerdown',onHold);root.removeEventListener('pointerup',onRelease);root.removeEventListener('pointercancel',onRelease);
  window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',onBlur);
  root.innerHTML='';
 }
 initActors();
 dialogue('CARTA DO BARDO','A princesa foi capturada!','O herói sem nome está longe da vila. Seu amigo Bardo envia uma carta: Malacord tomou o castelo disfarçado de herói e capturou a princesa. Uma longa viagem começa.');
 frame=requestAnimationFrame(loop);
 return destroy;
}

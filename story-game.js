import {chapter,lore,WIDTH,HEIGHT,FLOOR} from './story-chapter-v3.js';
import {overlaps,swordBox,bodyBox} from './story-combat-v3.js?v=wall-sword-fix';
import {drawWorld,drawSlide} from './story-art-v3.js?v=wall-sword-fix';

// Liner Story — Capítulo 1. Novo jogo, sem dependência de Firebase para salvar.
const W=WIDTH,HERO_W=50,HERO_H=72,MAX_HP=7;
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const safeUid=s=>String(s||'guest').replace(/[^A-Za-z0-9_-]/g,'').slice(0,96);
const hudHearts=hp=>'♥'.repeat(Math.max(0,hp))+'♡'.repeat(Math.max(0,MAX_HP-hp));

export function mountStory(root,onExit=()=>{},uid='guest'){
 let zoneIndex=0,paused=true,menu=true,finished=false,mode='world',last=0,elapsed=0,raf=0,saveAccumulator=0;
 let camera=0,checkpoint=40,dialogueLines=[],dialogueIndex=0,afterDialogue=null,notice='',noticeTime=0;
 let enemies=[],fx=[],slide={progress:0,hearts:3,lane:0,hazards:[],spawn:0,invul:0};
 let defeated=chapter.map(()=>[]);
 let flags={guards:false,fishTriggered:false,fishSong:false,fishWon:false,key:false,
  dragon:false,dragonComplete:false,castleIntro:false,wedding:false,potion:false,princess:false,
  exploded:false,cloneWon:false,rescue:false,win:false};
 let fishHP=8,fishInvul=0,cloneCalm=0,rescueTime=60,attackHits=new Set();
 const p={x:44,y:FLOOR-HERO_H,w:HERO_W,h:HERO_H,vx:0,vy:0,ground:true,face:1,hp:MAX_HP,
  invul:0,swing:0,attackCooldown:0,coyote:0,jumpBuffer:0};
 const keys={left:false,right:false,up:false,down:false};
 const SAVE='linercall-story-ch1-v3-'+safeUid(uid);
 root.innerHTML='<section class="story3" aria-label="Liner Story: O Herói sem Nome">'+
  '<header class="story3-top"><div><span class="story3-overline">LINERCALL STORY · CAPÍTULO 1</span>'+
  '<h2>O HERÓI <em>SEM NOME</em></h2></div><button class="story3-back" type="button" data-story3="exit">← Voltar aos jogos</button></header>'+
  '<div class="story3-status"><b id="story3-area">A CARTA</b><span id="story3-hearts" aria-label="Vida">♥♥♥♥♥♥♥</span>'+
  '<span id="story3-percent">0%</span><span class="story3-status-end" id="story3-save">SALVO LOCALMENTE</span></div>'+
  '<div class="story3-objective" id="story3-goal">Sua aventura começa com uma carta...</div>'+
  '<div class="story3-screen"><canvas id="story3-canvas" width="960" height="540" aria-label="Jogo 2D de plataforma em pixel art detalhada"></canvas>'+
  '<div class="story3-menu" id="story3-menu"><div class="story3-panel"><small>LINERCALL APRESENTA</small>'+
  '<h3>O HERÓI<br><span>SEM NOME</span></h3><p>Uma carta. Uma longa jornada. Um reino que esqueceu seu verdadeiro herói.</p>'+
  '<div class="story3-actions"><button data-story3="continue" type="button">▶ Continuar aventura</button>'+
  '<button data-story3="new" type="button">✦ Novo jogo</button>'+
  '<button data-story3="help" type="button">⌨ Controles</button></div>'+
  '<p class="story3-small">Capítulo 1 · versão reimaginada em beta. Sem cobrança de LCoins durante os testes.</p></div></div>'+
  '<div class="story3-dialog hidden" id="story3-dialog" role="dialog" aria-live="polite" aria-label="Diálogo da história">'+
  '<small id="story3-speaker">NARRADOR</small><h3 id="story3-dialog-title"></h3>'+
  '<p id="story3-dialog-copy"></p><div class="story3-dialog-bottom"><span id="story3-dialog-count">1 / 3</span>'+
  '<button data-story3="next" type="button">Continuar →</button></div></div>'+
  '<div class="story3-complete hidden" id="story3-complete"><div class="story3-panel"><small>FIM DO CAPÍTULO 1</small>'+
  '<h3>GANONDORF!</h3><p>O reino foi salvo. Mas o dragão ainda espera seu pagamento...</p>'+
  '<button data-story3="new" type="button">↻ Rejogar capítulo</button>'+
  '<button data-story3="exit" type="button">← Voltar aos minigames</button></div></div>'+
  '</div><div class="story3-touch"><div class="story3-direction">'+
  '<button type="button" data-hold="left" aria-label="Mover para esquerda">◀</button>'+
  '<button type="button" data-hold="right" aria-label="Mover para direita">▶</button></div>'+
  '<div class="story3-interact"><button type="button" data-story3="jump">↑ Pular</button>'+
  '<button type="button" data-story3="attack">⚔ Golpear</button>'+
  '<button type="button" data-story3="interact">✦ Ação</button></div></div>'+
  '<p class="story3-help">A / D ou ← → mover · Espaço pular · X / J atacar · E interagir · P pausar · Progresso salvo neste dispositivo.</p>'+
  '</section>';
 const canvas=root.querySelector('#story3-canvas'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx){root.querySelector('.story3-help').textContent='Canvas indisponível neste navegador.';return ()=>{};}
 ctx.imageSmoothingEnabled=false;
 const q=id=>root.querySelector('#'+id), zone=()=>chapter[zoneIndex];
 const note=(text,duration=3)=>{notice=text;noticeTime=duration;};
 function objective(){
  if(mode==='slide')return 'DESAFIO DO DRAGÃO · ↑ ou ↓ para trocar de faixa e desviar do fogo!';
  if(zoneIndex===0)return 'Atravesse a longa estrada e derrote os monstros de Malacord.';
  if(zoneIndex===1)return 'Explore a floresta e alcance as ruínas do reino.';
  if(zoneIndex===2)return flags.guards?'Acompanhe o Bardo até a Montanha Sagrada.':'Descubra por que os guardas bloqueiam o castelo.';
  if(zoneIndex===3)return !flags.fishWon?'Derrote o PEIXE GIGANTE sem encostar nele!':!flags.dragonComplete?'Encontre o dragão no topo da montanha.':'Entre no castelo pelo alto.';
  if(flags.rescue&&!flags.win)return 'A gaiola vai pegar fogo! Corra até a princesa e pressione E para cortar as cordas.';
  if(flags.exploded&&!flags.cloneWon)return 'A névoa copia os ataques. Pare de atacar e mantenha-se vivo!';
  if(!flags.potion)return 'Procure o baú com o mapa do casamento e a poção.';
  if(!flags.princess)return 'Descubra o que o Bardo encontrou no calabouço.';
  return 'Continue pelo salão do casamento.';
 }
 function updateHUD(){
  q('story3-area').textContent=mode==='slide'?'FUGA DO DRAGÃO':zone().name.toUpperCase();
  q('story3-hearts').textContent=mode==='slide'?'♥'.repeat(slide.hearts):hudHearts(p.hp);
  q('story3-percent').textContent=(mode==='slide'?Math.floor(slide.progress*100):Math.floor(clamp(p.x/zone().length,0,1)*100))+'%';
  q('story3-goal').textContent=noticeTime>0?notice:objective();
 }
 function spawnMobs(){
  enemies=zone().enemies.map(([x,kind],i)=>({x,y:FLOOR-(kind==='goblin'?68:55),w:48,h:kind==='goblin'?68:55,
   hp:kind==='goblin'?3:2,maxHp:kind==='goblin'?3:2,kind,home:x,dir:i%2?1:-1,
   ai:Math.random()*4,index:i,stun:0})).filter(m=>!defeated[zoneIndex].includes(m.index));
 }
 function setZone(index,spawnX=46){
  zoneIndex=index;mode='world';checkpoint=spawnX;
  p.x=spawnX;p.y=FLOOR-p.h;p.vx=0;p.vy=0;p.ground=true;p.coyote=0;
  p.hp=Math.max(4,p.hp);p.invul=1.7;camera=0;spawnMobs();save();
 }
 function save(){
  if(menu||finished||mode==='slide')return;
  try{
   localStorage.setItem(SAVE,JSON.stringify({
    version:3,zone:zoneIndex,x:Math.round(p.x),hp:p.hp,checkpoint,
    flags:{...flags},fishHP,defeated,ts:Date.now()
   }));
   q('story3-save').textContent='PROGRESSO SALVO';
  }catch{q('story3-save').textContent='SALVAMENTO INDISPONÍVEL';}
 }
 function readSave(){
  try{
   const v=JSON.parse(localStorage.getItem(SAVE)||'null');
   return v?.version===3&&Number.isInteger(v.zone)&&v.zone>=0&&v.zone<chapter.length?v:null;
  }catch{return null;}
 }
 function reset(){
  flags={guards:false,fishTriggered:false,fishSong:false,fishWon:false,key:false,
   dragon:false,dragonComplete:false,castleIntro:false,wedding:false,potion:false,princess:false,
   exploded:false,cloneWon:false,rescue:false,win:false};
  defeated=chapter.map(()=>[]);fishHP=8;fishInvul=0;cloneCalm=0;rescueTime=60;
  p.hp=MAX_HP;p.invul=0;finished=false;menu=false;mode='world';elapsed=0;attackHits.clear();
  q('story3-menu').classList.add('hidden');q('story3-complete').classList.add('hidden');
  setZone(0);sequence(lore.intro);
 }
 function continueGame(){
  const saved=readSave();if(!saved){reset();return;}
  menu=false;finished=false;flags={...flags,...saved.flags};
  defeated=chapter.map((_,i)=>Array.isArray(saved.defeated?.[i])?saved.defeated[i].filter(Number.isInteger):[]);
  fishHP=clamp(Number(saved.fishHP)||8,1,8);p.hp=clamp(saved.hp||MAX_HP,1,MAX_HP);
  zoneIndex=saved.zone;checkpoint=clamp(saved.checkpoint||40,40,zone().length-50);
  const x=clamp(saved.x||checkpoint,40,zone().length-80);
  if(zoneIndex===3&&!flags.fishWon&&x>475)checkpoint=40;
  if(zoneIndex===3&&flags.dragon&&!flags.dragonComplete&&x>3620){flags.dragon=false;checkpoint=3020;}
  if(zoneIndex===4&&flags.rescue&&!flags.win)rescueTime=60;
  spawnMobs();p.x=zoneIndex===3&&!flags.fishWon&&x>475?40:x;
  if(zoneIndex===3&&flags.dragon&&!flags.dragonComplete)p.x=Math.min(p.x,3470);
  p.y=FLOOR-p.h;p.vx=p.vy=0;p.ground=true;p.invul=2;
  mode='world';q('story3-menu').classList.add('hidden');
  sequence([['NARRADOR','Bem-vindo de volta!','A aventura continua de onde você parou. Seu progresso anterior está preservado.']]);
 }
 function sequence(lines,done=null){
  if(!lines?.length){done?.();return;}
  dialogueLines=lines;dialogueIndex=0;afterDialogue=done;paused=true;
  keys.left=keys.right=keys.up=keys.down=false;showDialogue();
 }
 function showDialogue(){
  const [who,title,body]=dialogueLines[dialogueIndex];
  q('story3-speaker').textContent=who;q('story3-dialog-title').textContent=title;q('story3-dialog-copy').textContent=body;
  q('story3-dialog-count').textContent=(dialogueIndex+1)+' / '+dialogueLines.length;
  q('story3-dialog').classList.remove('hidden');
 }
 function advance(){
  if(q('story3-dialog').classList.contains('hidden'))return;
  if(++dialogueIndex<dialogueLines.length){showDialogue();return;}
  q('story3-dialog').classList.add('hidden');dialogueLines=[];paused=false;
  const done=afterDialogue;afterDialogue=null;done?.();save();
 }
 function showHelp(){
  q('story3-menu').classList.add('hidden');
  sequence([['CONTROLES','Movimentação','A e D / setas: andar. Espaço / W: pular. X ou J: espada. E: interagir. No celular, use os botões na tela.'],
   ['COMBATE','Não encoste nos inimigos','O golpe acerta à frente do corpo, antes de você se aproximar demais. Depois de sofrer dano, você fica invulnerável por um instante.'],
   ['DICAS','Salvamento e checkpoints','Seu progresso é salvo automaticamente. Use a espada para atacar de longe e procure plataformas para atravessar buracos.']],()=>{
    if(menu)q('story3-menu').classList.remove('hidden');
   });
 }
 function jump(){
  if(mode==='slide'){slide.lane=0;return;}
  if(menu||finished||paused)return;
  p.jumpBuffer=.16;
 }
 function attack(){
  if(mode==='slide'){slide.lane=1;return;}
  if(menu||finished||paused||p.attackCooldown>0)return;
  if(flags.rescue&&Math.abs(p.x-3480)<195){interact();return;}
  p.swing=.30;p.attackCooldown=.48;attackHits=new Set();
  if(zoneIndex===4&&flags.exploded&&!flags.cloneWon){
   cloneCalm=0;damage(1,true);note('A CÓPIA REPETIU SEU GOLPE! Pare de atacar.',3);
  }
 }
 function interact(){
  if(menu||finished||paused)return;
  if(zoneIndex===4&&flags.rescue&&!flags.win){
   if(Math.abs(p.x-3480)<195){
    flags.win=true;rescueTime=Math.max(0,rescueTime);
    sequence(lore.finale,()=>{
     finished=true;paused=true;try{localStorage.removeItem(SAVE);}catch{}
     q('story3-complete').classList.remove('hidden');
    });
   }else note('A gaiola está mais à frente. Corra!',2.4);
  }else note('Procure algo importante pelo caminho.',1.4);
 }
 function damage(amount=1,shadow=false){
  if(p.invul>0||menu||paused)return;
  p.hp=clamp(p.hp-amount,0,MAX_HP);p.invul=1.3;
  p.vx+=shadow?(p.face>0?-150:150):(-p.face*135);
  fx.push({kind:'spark',x:p.x+22,y:p.y+20,life:1,max:1,color:'#ff7590'});
  if(p.hp<=0){
   p.hp=MAX_HP;p.x=checkpoint;p.y=FLOOR-p.h;p.vx=p.vy=0;p.invul=2.5;
   if(zoneIndex===4&&flags.rescue)rescueTime=60;
   note('Você se recuperou no último checkpoint.',4);save();
  }
 }
 function markDefeated(m){
  m.hp=0;defeated[zoneIndex].push(m.index);
  for(let i=0;i<8;i++)fx.push({kind:'spark',x:m.x+10+Math.random()*38,y:m.y+Math.random()*30,life:.5+Math.random()*.6,max:1,color:'#ffe19c'});
 }
 function hitTest(){
  if(p.swing<.08||p.swing>.245)return;
  const box=swordBox(p,76);
  for(const mob of enemies){
   if(mob.hp<=0||attackHits.has(mob.index)||!overlaps(box,bodyBox(mob)))continue;
   attackHits.add(mob.index);mob.hp--;mob.stun=.3;mob.x+=p.face*38;
   fx.push({kind:'spark',x:mob.x+20,y:mob.y+24,life:.8,max:.8,color:'#f8eab1'});
   if(mob.hp<=0)markDefeated(mob);
  }
  if(zoneIndex===3&&!flags.fishWon&&!attackHits.has('fish')){
   const hit={x:270,y:FLOOR-145,w:208,h:128};
   if(overlaps(box,hit)&&fishInvul<=0){
    attackHits.add('fish');fishHP--;fishInvul=.26;
    fx.push({kind:'spark',x:345,y:FLOOR-80,life:1,max:1,color:'#d4faff'});
    if(fishHP<=4&&!flags.fishSong){flags.fishSong=true;sequence(lore.fishSong);}
    if(fishHP<=0){flags.fishWon=true;flags.key=true;sequence(lore.fishWin);save();}
   }
  }
 }
 function transition(index,text){
  const carryHP=Math.max(4,p.hp);setZone(index);p.hp=carryHP;
  sequence([['NARRADOR',chapter[index].name,text]],()=>{
   if(index===4&&!flags.castleIntro){flags.castleIntro=true;sequence(lore.castle);}
  });
 }
 function startDragonSlide(){
  mode='slide';paused=false;slide={progress:0,hearts:3,lane:0,hazards:[],spawn:.3,invul:0};
  q('story3-goal').textContent=objective();
 }
 function updateSlide(dt){
  slide.progress+=dt/20;
  slide.spawn-=dt;slide.invul=Math.max(0,slide.invul-dt);
  if(slide.spawn<=0){
   slide.spawn=1.15+Math.random()*.45;
   slide.hazards.push({x:W+40,y:250+(Math.random()<.5?0:110),speed:310+slide.progress*130});
  }
  for(const a of slide.hazards){
   a.x-=a.speed*dt;
   if(a.x<240&&a.x>135&&Math.abs(a.y-(250+slide.lane*110))<35&&!a.hit&&slide.invul===0){
    a.hit=true;slide.hearts--;slide.invul=1.2;
    if(slide.hearts<=0){
     slide.progress=0;slide.hearts=3;slide.hazards=[];slide.spawn=2;
     note('O dragão alcançou vocês! A descida recomeça.',3);
    }
   }
  }
  slide.hazards=slide.hazards.filter(a=>a.x> -55&&!a.hit);
  if(slide.progress>=1){
   slide.progress=1;mode='world';paused=true;flags.dragonComplete=true;
   sequence(lore.dragon.slice(2),()=>transition(4,'O dragão os deixou sobre a torre. O castelo está silencioso demais.'));
  }
 }
 function updateWorld(dt){
  if(p.attackCooldown>0)p.attackCooldown=Math.max(0,p.attackCooldown-dt);
  if(p.swing>0)p.swing=Math.max(0,p.swing-dt);
  p.invul=Math.max(0,p.invul-dt);fishInvul=Math.max(0,fishInvul-dt);
  p.coyote=p.ground ? .13 : Math.max(0,p.coyote-dt);
  p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
  if(p.jumpBuffer>0&&p.coyote>0){
   p.vy=-680;p.ground=false;p.coyote=0;p.jumpBuffer=0;
   fx.push({kind:'dust',x:p.x+25,y:p.y+70,life:.8,max:.8});
  }
  const direction=(keys.right?1:0)-(keys.left?1:0);
  const target=direction*260;
  p.vx+=(target-p.vx)*Math.min(1,dt*(p.ground?15:10));
  if(direction)p.face=direction;
  // Plataformas são sólidos completos: laterais e parte de baixo bloqueiam passagem.
  const solids=zone().platforms.map(([x,y,w])=>({x,y,w,h:FLOOR-y}));
  const oldX=p.x,oldY=p.y;
  p.x=clamp(p.x+p.vx*dt,0,zone().length-p.w);
  for(const wall of solids){
   if(p.y+p.h<=wall.y+1||p.y>=wall.y+wall.h-1)continue;
   if(p.x+p.w>wall.x&&p.x<wall.x+wall.w){
    if(p.vx>0&&oldX+p.w<=wall.x+3){p.x=wall.x-p.w;p.vx=0;}
    else if(p.vx<0&&oldX>=wall.x+wall.w-3){p.x=wall.x+wall.w;p.vx=0;}
    else if(oldX+p.w>wall.x&&oldX<wall.x+wall.w){
     // Se o personagem já estiver dentro do bloco, expulse-o pelo lado mais próximo.
     const leftDist=Math.abs(p.x+p.w-wall.x),rightDist=Math.abs(wall.x+wall.w-p.x);
     p.x=leftDist<=rightDist?wall.x-p.w:wall.x+wall.w;p.vx=0;
    }
   }
  }
  const before=p.y+p.h;
  p.vy=Math.min(950,p.vy+1740*dt);
  p.y+=p.vy*dt;p.ground=false;
  if(p.vy<0)for(const wall of solids){
   if(p.x+p.w-8>wall.x&&p.x+8<wall.x+wall.w&&oldY>=wall.y+wall.h-2&&p.y<wall.y+wall.h&&p.y+p.h>wall.y){
    p.y=wall.y+wall.h;p.vy=0;break;
   }
  }
  if(p.vy>=0){
   const surfaces=[...zone().platforms.map(v=>[v[0],v[0]+v[2],v[1]]),
    ...zone().ground.map(v=>[v[0],v[1],FLOOR])].sort((a,b)=>a[2]-b[2]);
   const feet=p.y+p.h;
   for(const [left,right,top] of surfaces){
    if(p.x+p.w-10>left&&p.x+10<right&&before<=top+14&&feet>=top){
     p.y=top-p.h;p.vy=0;p.ground=true;break;
    }
   }
  }
  if(p.y>HEIGHT+100){
   damage(1);p.x=checkpoint;p.y=FLOOR-p.h;p.vx=p.vy=0;p.invul=Math.max(p.invul,1.5);note('Cuidado com os buracos! Checkpoint restaurado.',2.6);
  }
  hitTest();
  for(const m of enemies){
   if(m.hp<=0)continue;
   m.stun=Math.max(0,m.stun-dt);m.ai+=dt;
   const delta=p.x-m.x;
   if(m.stun===0&&Math.abs(delta)<230)m.dir=Math.sign(delta)||m.dir;
   if(m.stun===0)m.x+=m.dir*(m.kind==='goblin'?46:27)*dt;
   m.x=clamp(m.x,m.home-66,m.home+66);
   m.y=FLOOR-m.h;
   if(Math.abs(m.x-m.home)>=65)m.dir*=-1;
   if(overlaps(bodyBox(p),bodyBox(m)))damage(1);
  }
  if(zoneIndex===3&&!flags.fishWon&&overlaps(bodyBox(p),{x:294,y:FLOOR-130,w:155,h:120}))damage(1);
  for(const f of fx)f.life-=dt*1.7;fx=fx.filter(f=>f.life>0).slice(-90);
  const stops=zone().checkpoints;
  for(const at of stops)if(p.x>at&&checkpoint<at){checkpoint=at;note('Checkpoint ativado!',2);save();}
  if(zoneIndex===0&&p.x>=zone().length-110)transition(1,'A estrada termina, mas a floresta de Malacord ainda separa o herói de casa.');
  else if(zoneIndex===1&&p.x>=zone().length-110)transition(2,'Depois de derrotar os monstros, o herói avista as estátuas e fontes de sua vila.');
  else if(zoneIndex===2){
   if(p.x>1530&&!flags.guards){flags.guards=true;sequence(lore.arrival);}
   if(p.x>2030&&flags.guards)transition(3,'A passagem pela montanha está trancada. O Bardo avista uma criatura estranha no caminho.');
  }else if(zoneIndex===3){
   if(!flags.fishWon&&p.x>160&&!flags.fishTriggered){flags.fishTriggered=true;sequence(lore.fish);}
   if(!flags.fishWon&&p.x>490){p.x=490;p.vx=0;}
   if(p.x>3730&&!flags.dragon){
    flags.dragon=true;
    sequence(lore.dragon.slice(0,2),startDragonSlide);
   }
  }else if(zoneIndex===4){
   if(p.x>1030&&!flags.potion){flags.potion=true;sequence(lore.potion);}
   if(p.x>1900&&!flags.princess){flags.princess=true;sequence(lore.princess);}
   if(p.x>2600&&!flags.exploded){flags.exploded=true;cloneCalm=0;sequence(lore.explosion);}
   if(flags.exploded&&!flags.cloneWon){
    p.x=Math.min(p.x,2910);
    if(p.invul<=0&&Math.abs(p.x-2760)<105&&Math.abs(p.vx)>130)damage(1);
    if(p.swing<=0)cloneCalm+=dt;else cloneCalm=0;
    if(cloneCalm>5.5){
     flags.cloneWon=true;sequence(lore.cloneWin,()=>{
      flags.rescue=true;rescueTime=60;p.x=Math.max(p.x,2915);checkpoint=3000;save();
     });
    }
   }else if(flags.rescue&&!flags.win){
    rescueTime-=dt;
    if(rescueTime<=0){
     rescueTime=60;p.x=3030;p.y=FLOOR-p.h;p.vx=0;
     note('O fogo cresceu! Volte depressa até a princesa.',4);
    }
   }
  }
  saveAccumulator+=dt;
  if(saveAccumulator>5){saveAccumulator=0;save();}
 }
 function draw(){
  camera=clamp(p.x-W*.36,0,Math.max(0,zone().length-W));
  if(mode==='slide'){drawSlide(ctx,elapsed*1000,slide.progress,slide.lane,slide.hazards);}
  else{drawWorld(ctx,zone(),camera,elapsed*1000,p,enemies, {...flags,fishHP},fx);}
  if(!menu&&!finished&&zoneIndex===3&&!flags.fishWon&&mode==='world'){
   ctx.fillStyle='#21334dd0';ctx.fillRect(W/2-143,14,286,25);
   ctx.fillStyle='#e4778f';ctx.fillRect(W/2-139,18,278*clamp(fishHP/8,0,1),17);
   ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillStyle='#ffffff';
   ctx.fillText('O PEIXE MONSTRUOSO',W/2,35);
  }
  if(flags.rescue&&!flags.win&&zoneIndex===4){
   ctx.fillStyle='#552c42d9';ctx.fillRect(W/2-110,13,220,49);
   ctx.textAlign='center';ctx.font='bold 29px monospace';ctx.fillStyle='#ffddc3';
   const secs=Math.max(0,Math.ceil(rescueTime));
   const clock=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
   ctx.fillText(clock,W/2,47);
  }
  if(flags.exploded&&!flags.cloneWon&&zoneIndex===4&&!menu){
   ctx.fillStyle='#d4e6f7';ctx.font='bold 15px monospace';ctx.textAlign='center';
   ctx.fillText('Não ataque. Deixe a névoa imitar o silêncio.',W/2,76);
  }
  updateHUD();
 }
 function frame(now){
  if(!root.isConnected)return;
  const dt=last?clamp((now-last)/1000,0,.033):0;last=now;
  elapsed+=dt;
  if(!paused&&!menu&&!finished){
   if(mode==='slide')updateSlide(dt);else updateWorld(dt);
  }
  if(noticeTime>0)noticeTime=Math.max(0,noticeTime-dt);
  draw();raf=requestAnimationFrame(frame);
 }
 function onKeyDown(e){
  if(e.target?.matches?.('input,textarea,select'))return;
  const k=e.key.toLowerCase();
  if(['arrowleft','arrowright','arrowup','arrowdown',' ','a','d','w','s','x','j','e','p','enter'].includes(k))e.preventDefault();
  if(!q('story3-dialog').classList.contains('hidden')){
   if(!e.repeat&&['enter',' ','e'].includes(k))advance();return;
  }
  if(menu){if(k==='enter')continueGame();return;}
  if(finished)return;
  if(k==='p'&&!e.repeat){paused=!paused;note(paused?'Pausado. Pressione P para continuar.':'De volta à aventura.',3);return;}
  if(k==='a'||k==='arrowleft')keys.left=true;
  if(k==='d'||k==='arrowright')keys.right=true;
  if(k==='w'||k==='arrowup'){keys.up=true;if(!e.repeat)jump();}
  if(k==='s'||k==='arrowdown'){keys.down=true;if(mode==='slide')slide.lane=1;}
  if(k===' '&&!e.repeat)jump();
  if(['x','j'].includes(k)&&!e.repeat)attack();
  if(k==='e'&&!e.repeat)interact();
 }
 function onKeyUp(e){
  const k=e.key.toLowerCase();
  if(k==='a'||k==='arrowleft')keys.left=false;
  if(k==='d'||k==='arrowright')keys.right=false;
  if(k==='w'||k==='arrowup')keys.up=false;
  if(k==='s'||k==='arrowdown')keys.down=false;
 }
 function onClick(e){
  const action=e.target.closest?.('[data-story3]')?.dataset.story3;
  if(!action)return;
  if(action==='exit'){onExit();return;}
  if(action==='new'){try{localStorage.removeItem(SAVE);}catch{}reset();}
  if(action==='continue')continueGame();
  if(action==='help')showHelp();
  if(action==='next')advance();
  if(action==='jump')jump();
  if(action==='attack')attack();
  if(action==='interact')interact();
 }
 const pointerKeys=new Map();
 function onPointerDown(e){
  const b=e.target.closest?.('[data-hold]');if(!b)return;
  e.preventDefault();const k=b.dataset.hold;keys[k]=true;pointerKeys.set(e.pointerId,k);
  b.setPointerCapture?.(e.pointerId);
 }
 function onPointerUp(e){const k=pointerKeys.get(e.pointerId);if(k){keys[k]=false;pointerKeys.delete(e.pointerId);}}
 function onVisibility(){if(document.hidden){keys.left=keys.right=keys.up=keys.down=false;last=0;}}
 root.addEventListener('click',onClick);
 root.addEventListener('pointerdown',onPointerDown);
 root.addEventListener('pointerup',onPointerUp);
 root.addEventListener('pointercancel',onPointerUp);
 document.addEventListener('keydown',onKeyDown);
 document.addEventListener('keyup',onKeyUp);
 document.addEventListener('visibilitychange',onVisibility);
 if(readSave()){q('story3-menu').querySelector('[data-story3="continue"]').textContent='▶ Continuar do último checkpoint';}
 else q('story3-menu').querySelector('[data-story3="continue"]').textContent='▶ Começar aventura';
 spawnMobs();
 raf=requestAnimationFrame(frame);
 return ()=>{
  cancelAnimationFrame(raf);keys.left=keys.right=keys.up=keys.down=false;
  root.removeEventListener('click',onClick);
  root.removeEventListener('pointerdown',onPointerDown);
  root.removeEventListener('pointerup',onPointerUp);
  root.removeEventListener('pointercancel',onPointerUp);
  document.removeEventListener('keydown',onKeyDown);
  document.removeEventListener('keyup',onKeyUp);
  document.removeEventListener('visibilitychange',onVisibility);
 };
}

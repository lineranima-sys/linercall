import {createShooterWorld3D} from './shooter-world3d.js?v=20261105-polish';
import {loadShooterMap,shooterBlocked,shooterElevation,shooterCell} from './shooter-maps.js';
// SHOOT’E R! — FPS retro em raycasting (visão em primeira pessoa).
// Treino contra drones 3D estilizados. Não é PvP online e não envolve violência gráfica.
const TAU=Math.PI*2;
const FOV=1.18;
const DEG=Math.PI/180;
const COLS=3;
const DURATION=85;
const TARGET=12;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
let ACTIVE_MAP=loadShooterMap('undefined');
function wall(x,y){return shooterBlocked(ACTIVE_MAP,x,y);}
function canStand(x,y,r=.19){
 return !wall(x-r,y-r)&&!wall(x+r,y-r)&&!wall(x-r,y+r)&&!wall(x+r,y+r);
}
function castRay(x,y,angle){
 const dx=Math.cos(angle),dy=Math.sin(angle);
 let mapX=Math.floor(x),mapY=Math.floor(y);
 const deltaX=Math.abs(dx)<.00001?1e10:Math.abs(1/dx),deltaY=Math.abs(dy)<.00001?1e10:Math.abs(1/dy);
 const stepX=dx<0?-1:1,stepY=dy<0?-1:1;
 let sideX=(dx<0?x-mapX:mapX+1-x)*deltaX;
 let sideY=(dy<0?y-mapY:mapY+1-y)*deltaY;
 let side=0,dist=24;
 for(let i=0;i<32;i++){
  if(sideX<sideY){mapX+=stepX;dist=sideX;sideX+=deltaX;side=0;}
  else{mapY+=stepY;dist=sideY;sideY+=deltaY;side=1;}
  if(mapX<0||mapY<0||mapX>=ACTIVE_MAP.width||mapY>=ACTIVE_MAP.height){dist=25;break;}
  if(shooterCell(ACTIVE_MAP,mapX,mapY)==='1')break;
 }
 return {dist:clamp(dist,.06,25),side,hitX:x+dx*dist,hitY:y+dy*dist};
}
const GUNS=[
 {name:'Pistola',mag:12,ammo:12,reserve:84,delay:280,reload:1300,damage:31,reach:13,color:'#8feaff'},
 {name:'Submetralhadora',mag:30,ammo:30,reserve:180,delay:86,reload:1700,damage:14,reach:10,color:'#ffd886'},
 {name:'Fuzil de precisão',mag:5,ammo:5,reserve:30,delay:900,reload:2400,damage:125,reach:22,color:'#ffdd80'},
 {name:'Faca',mag:Infinity,ammo:Infinity,reserve:Infinity,delay:520,reload:0,damage:68,reach:1.25,color:'#e1eaf2'}
];
export function mountShooterFPS({root,user,addCoins,mapId='undefined',mode='solo',spawnIndex=0,onPose=null,onFire=null,getOpponents=null}){
 ACTIVE_MAP=loadShooterMap(mapId);
 const guns=GUNS.map(g=>({...g}));
 const el=document.createElement('section');
 el.className='arcade-game shooter-game shooter-fps';
 el.innerHTML='<span class="eyebrow">FPS 3D · CENÁRIOS EXPLORÁVEIS</span>'+
 '<h2 class="shooter-logo">SHOOT<span>’E</span> R!</h2>'+
 '<p><b>Mapa: '+ACTIVE_MAP.name+'</b> · '+ACTIVE_MAP.subtitle+'. Explore casas, escadas, vielas e arredores. Nova renderização 3D quando disponível.</p>'+
 '<div class="shooter-hud"><span id="shoot-hp">❤️ 100 HP</span><span id="shoot-weapon">Pistola</span><span id="shoot-score">0/12</span><span id="shoot-timer">85 s</span></div>'+
 '<div class="shoot-fps-screen"><canvas id="shoot-world-3d" width="900" height="520" aria-hidden="true"></canvas><canvas id="shoot-canvas" width="900" height="520" tabindex="0" aria-label="Visão em primeira pessoa do SHOOT’E R!"></canvas>'+
 '<div class="shoot-fps-paused" id="shoot-overlay"><b>SHOOT’E R!</b><span>FPS EM PRIMEIRA PESSOA</span><small>Clique em Iniciar para controlar o personagem.</small></div></div>'+
 '<div class="shooter-keys"><b>WASD</b> mover · <b>Mouse</b> olhar · <b>Esquerdo</b> atirar · <b>Direito</b> mira do fuzil · <b>1–4</b> armas · <b>R</b> recarregar · <b>Esc</b> solta mouse · <b>PgUp/PgDn</b> olhar vertical</div>'+
 '<p id="shoot-message" class="arcade-note">Elimine 12 drones antes do fim do tempo para ganhar 45 LCoins (uma vez por dia).</p>'+
 '<div class="shooter-actions"><button type="button" class="btn btn-primary" data-shoot-start>▶ Iniciar partida</button>'+
 '<button type="button" class="btn" data-shoot-reload>Recarregar (R)</button>'+
 '<button type="button" class="btn" data-shoot-scope>🔭 Zoom do fuzil</button>'+
 '<button type="button" class="btn" data-shoot-mouse>🎯 Capturar mouse</button></div>'+
 '<div class="shoot-touch-controls"><div class="shoot-touch-weaponbar"><button type="button" data-shoot-weapon="0">Pistola</button><button type="button" data-shoot-weapon="1">SMG</button><button type="button" data-shoot-weapon="2">Sniper</button><button type="button" data-shoot-weapon="3">Faca</button></div><div class="shoot-touch-nav"><button type="button" data-hold-key="w">▲</button><div><button type="button" data-hold-key="a">◀</button><button type="button" data-hold-key="s">▼</button><button type="button" data-hold-key="d">▶</button></div></div><div class="shoot-touch-actions"><button type="button" data-hold-fire>🎯 ATIRAR</button><button type="button" data-hold-scope>🔭 ZOOM</button></div><small>Arraste a visão com o dedo na arena para virar. Toque nas armas acima para trocar (1–4 no teclado).</small></div>';
 root.replaceChildren(el);
 const $=s=>el.querySelector(s),canvas=$('#shoot-canvas'),worldCanvas=$('#shoot-world-3d'),ctx=canvas.getContext('2d',{alpha:true}),hud=$('#shoot-weapon'),message=$('#shoot-message'),overlay=$('#shoot-overlay');
 const W=canvas.width,H=canvas.height;
 let world3D=null,disposed=false;
 createShooterWorld3D({canvas:worldCanvas,mapId:ACTIVE_MAP.id}).then(view=>{
  if(disposed){view.dispose();return;}
  world3D=view;el.classList.add('shooter-webgl-ready');worldCanvas.style.display='block';
 }).catch(error=>{console.warn('SHOOT’E R!: iniciando renderizador alternativo.',error);worldCanvas.style.display='none';});

 let px=ACTIVE_MAP.spawn[0],py=ACTIVE_MAP.spawn[1],look=0,pitch=0,kills=0,life=100,pressed=new Set(),enemies=[],particles=[];
 let lastPosePublish=0;
 let playing=false,done=false,shooting=false,scope=false,shotAt=-1e4,flashAt=0,hitAt=0,spawnAt=0,reloadEnds=0;
 let current=0,startTime=0,lastFrame=0,raf=0,dragX=null,frame=0,rewarded=false;
 const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const todayKey=()=> 'linercall-arcade-earned-'+user.uid+'-shooter-'+day();
 function gun(){return guns[current];}
 function setHint(text){message.textContent=text;}
 function updateHud(time=DURATION){
  const g=gun();
  $('#shoot-hp').textContent='❤️ '+Math.ceil(life)+' HP';
  $('#shoot-weapon').textContent=g.name+' · '+(current===3?'∞':g.ammo+'/'+g.reserve)+(reloadEnds?' · RECARREGANDO':'');
  $('#shoot-score').textContent='🤖 '+kills+'/'+TARGET+' drones';
  $('#shoot-timer').textContent=Math.max(0,Math.ceil(time))+' s';
 }
 function start(){
  if(raf)cancelAnimationFrame(raf);
  px=mode==='multi'&&spawnIndex===1?24:ACTIVE_MAP.spawn[0];py=mode==='multi'&&spawnIndex===1?14:ACTIVE_MAP.spawn[1];look=mode==='multi'?(spawnIndex===1?Math.PI:0):-Math.PI/2;pitch=0;life=100;kills=0;playing=true;done=false;shooting=false;scope=false;
  startTime=performance.now();lastFrame=startTime;spawnAt=startTime-800;shotAt=-1e4;flashAt=0;hitAt=0;
  enemies=[];particles=[];reloadEnds=0;current=0;pressed.clear();
  guns.forEach((g,i)=>{g.ammo=GUNS[i].ammo;g.reserve=GUNS[i].reserve;});
  overlay.classList.add('hidden');
  setHint(mode==='multi'?'Duelo online beta: encontre o outro jogador e acerte seus disparos. Sem LCoins.':'Treinamento iniciado! Elimine '+TARGET+' drones antes do fim do tempo.');
  canvas.focus({preventScroll:true});
  if(canvas.requestPointerLock)canvas.requestPointerLock().catch(()=>setHint('Clique na tela para controlar a câmera. Você também pode usar ← →.'));
  updateHud();
  raf=requestAnimationFrame(tick);
 }
 function spawn(){
  if(mode==='multi'||enemies.length>=8)return;
  const spots=[];
  for(let row=1;row<ACTIVE_MAP.height-1;row++)
   for(let col=1;col<ACTIVE_MAP.width-1;col++)
    if(canStand(col+.5,row+.5,.24)&&Math.hypot(col+.5-px,row+.5-py)>3.2)spots.push([col+.5,row+.5]);
  if(!spots.length)return;
  const [x,y]=spots[Math.floor(Math.random()*spots.length)];
  enemies.push({x,y,hp:65,speed:.65+Math.random()*.43,attackAt:0,anim:Math.random()*TAU});
 }
 function startReload(now=performance.now()){
  const g=gun();
  if(!playing||current===3||reloadEnds||g.ammo===g.mag||g.reserve<=0)return;
  reloadEnds=now+g.reload;
  setHint('Recarregando '+g.name+'...');
  updateHud();
 }
 function finish(success){
  if(done)return;
  done=true;playing=false;shooting=false;scope=false;
  const won=success&&(mode==='multi'||kills>=TARGET);
  if(mode!=='multi'&&won&&!localStorage.getItem(todayKey())){
   localStorage.setItem(todayKey(),'1');
   addCoins(45);rewarded=true;
  }
  const result=mode==='multi'?'Rodada encerrada (beta): retorne ao menu para jogar novamente.':won?'🏆 Missão concluída! '+(rewarded?'+45 LCoins!':'Você já coletou as moedas de hoje.'):
   'Treinamento encerrado. '+kills+'/'+TARGET+' drones eliminados. Tente de novo!';
  setHint(result);
  overlay.classList.remove('hidden');
  overlay.innerHTML='<b>'+(won?'VITÓRIA!':'FIM DE PARTIDA')+'</b><span>'+kills+'/'+TARGET+' drones</span><small>Use Iniciar partida para tentar novamente.</small>';
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
 }
 function fire(now=performance.now()){
  if(!playing||reloadEnds||now-shotAt<gun().delay)return;
  const g=gun();
  if(g.ammo<=0){startReload(now);return;}
  shotAt=now;flashAt=now;
  if(current!==3)g.ammo--;
  if(onFire){try{onFire({x:px,y:py,angle:look,pitch,weapon:current,time:now});}catch{}}
  const range=g.reach,wallHit=castRay(px,py,look),wallDist=wallHit.dist;
  const maxDist=Math.min(range,wallDist+.02);
  let victim=null,nearest=maxDist;
  for(const e of enemies){
   const dx=e.x-px,dy=e.y-py,dist=Math.hypot(dx,dy);
   if(dist>nearest+.15)continue;
   const difference=angleDelta(Math.atan2(dy,dx),look);
   const radius=current===3?.30:.27;
   if(Math.abs(difference)>Math.atan2(radius,Math.max(.1,dist)))continue;
   if(current===3&&dist>1.28)continue;
   const los=castRay(px,py,Math.atan2(dy,dx)).dist;
   if(los<dist-.3)continue;
   if(dist<nearest){nearest=dist;victim=e;}
  }
  if(victim){
   victim.hp-=g.damage;
   hitAt=now;
   particles.push({x:victim.x,y:victim.y,expires:now+230});
   if(victim.hp<=0){kills++;enemies.splice(enemies.indexOf(victim),1);}
   if(kills>=TARGET&&mode!=='multi')finish(true);
  }
  updateHud(Math.max(0,DURATION-(now-startTime)/1000));
 }
 function move(dt){
  const forward=Number(pressed.has('w')||pressed.has('arrowup'))-Number(pressed.has('s')||pressed.has('arrowdown'));
  const side=Number(pressed.has('d'))-Number(pressed.has('a'));
  const dx=Math.cos(look)*forward-Math.sin(look)*side;
  const dy=Math.sin(look)*forward+Math.cos(look)*side;
  const mag=Math.hypot(dx,dy)||1;
  const speed=(scope?1.5:3.05)*dt;
  const nextX=px+dx/mag*speed,nextY=py+dy/mag*speed;
  if(canStand(nextX,py))px=nextX;
  if(canStand(px,nextY))py=nextY;
  if(pressed.has('arrowleft'))look-=dt*2.2;
  if(pressed.has('arrowright'))look+=dt*2.2;
  if(pressed.has('pageup'))pitch=clamp(pitch+dt*.85,-.62,.62);
  if(pressed.has('pagedown'))pitch=clamp(pitch-dt*.85,-.62,.62);
  look=(look+TAU)%TAU;
 }
 function think(dt,now){
  if(mode!=='multi'&&now-spawnAt>1700){spawn();spawnAt=now;}
  for(const e of enemies){
   e.anim+=dt*3;
   const dx=px-e.x,dy=py-e.y,distance=Math.hypot(dx,dy);
   const los=distance<9&&castRay(e.x,e.y,Math.atan2(dy,dx)).dist>=distance-.3;
   if(distance>1.6){
    const step=e.speed*dt;
    let vx=dx/Math.max(.001,distance)*step,vy=dy/Math.max(.001,distance)*step;
    if(!los){vx+=Math.cos(e.anim*.5)*dt*.36;vy+=Math.sin(e.anim*.5)*dt*.36;}
    if(canStand(e.x+vx,e.y,.23))e.x+=vx;
    if(canStand(e.x,e.y+vy,.23))e.y+=vy;
   }
   if(distance<5.2&&los&&now-e.attackAt>1850){
    e.attackAt=now+Math.random()*400;
    life=Math.max(0,life-(distance<2.2?11:5));
    if(life<=0){finish(false);return;}
   }
  }
 }
 function background(){
  const horizon=H/2+Math.tan(pitch)*H*.62;
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,ACTIVE_MAP.sky[0]);sky.addColorStop(1,ACTIVE_MAP.sky[1]);
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,Math.max(0,Math.min(H,horizon)));
  const floor=ctx.createLinearGradient(0,Math.max(0,horizon),0,H);
  floor.addColorStop(0,ACTIVE_MAP.floor[0]);floor.addColorStop(1,ACTIVE_MAP.floor[1]);
  ctx.fillStyle=floor;ctx.fillRect(0,Math.max(0,horizon),W,H);
  // Horizonte com silhuetas do cenário, não com a parede do mapa.
  ctx.fillStyle=ACTIVE_MAP.style==='tanjiro'?'#3152475c':ACTIVE_MAP.style==='folha'?'#82675238':'#59473938';
  for(let x=-40;x<W+100;x+=75){const y=horizon-25-18*Math.sin(x/130);ctx.fillRect(x,y,80,H/18);}
 }
 function drawWalls(fov){
  const depth=new Float32Array(Math.ceil(W/COLS)),a=look-fov/2;
  const horizon=H/2+Math.tan(pitch)*H*.62;
  const elevation=shooterElevation(ACTIVE_MAP,px,py);
  for(let c=0;c<depth.length;c++){
   const screenX=c*COLS,rayAngle=a+(screenX/W)*fov;
   const hit=castRay(px,py,rayAngle);
   const distance=Math.max(.09,hit.dist*Math.cos(rayAngle-look));
   depth[c]=distance;
   // Limite invisível: castRay termina na borda sem desenhar muro.
   if(distance>=24)continue;
   const height=Math.min(H*4,H/(distance*Math.tan(fov/2)*2)*1.75);
   const top=horizon-height*.67+elevation*height*.45;
   const [wr,wg,wb]=ACTIVE_MAP.wall;
   const shade=clamp(1-distance/24,.24,1)*(hit.side?.83:1);
   const r=Math.round(wr*shade),g=Math.round(wg*shade),b=Math.round(wb*shade);
   const pattern=Math.abs((hit.side?hit.hitX:hit.hitY)%1-.5);
   ctx.fillStyle='rgb('+r+','+g+','+b+')';ctx.fillRect(screenX,top,COLS+1,height);
   if(pattern<.05){ctx.fillStyle='#212a3277';ctx.fillRect(screenX,top,COLS+1,height);}
   // Fachada: madeira, janelas, telhado/cobertura com traços distintos por mapa.
   ctx.fillStyle=ACTIVE_MAP.roof;
   ctx.fillRect(screenX,top,COLS+1,Math.max(2,height*.12));
   if(ACTIVE_MAP.style==='chaves'||ACTIVE_MAP.style==='folha'){
    ctx.fillStyle='#462f2850';ctx.fillRect(screenX,top+height*.35,COLS+1,3);
    ctx.fillRect(screenX,top+height*.70,COLS+1,2);
   }else if(ACTIVE_MAP.style==='tanjiro'){
    ctx.fillStyle='#ddd3ba66';ctx.fillRect(screenX,top+height*.44,COLS+1,2);
   }
   if(pattern>.25&&pattern<.32&&distance>1.7){
    ctx.fillStyle='#7cbbd0aa';ctx.fillRect(screenX,top+height*.28,COLS+1,height*.20);
   }
  }
  return depth;
 }
 function drawEnemies(fov,depth,now){
  const visible=[];
  for(const e of enemies){
   const dx=e.x-px,dy=e.y-py,dist=Math.hypot(dx,dy);
   const offset=angleDelta(Math.atan2(dy,dx),look);
   if(Math.abs(offset)>fov/2+.23||dist<.12)continue;
   if(castRay(px,py,Math.atan2(dy,dx)).dist<dist-.26)continue;
   visible.push({...e,dist,offset});
  }
  visible.sort((a,b)=>b.dist-a.dist);
  for(const e of visible){
   const x=W/2+Math.tan(e.offset)/(Math.tan(fov/2))*W/2;
   const height=clamp(H/(e.dist*Math.tan(fov/2)*2)*1.2,10,H*2.3),width=height*.60;
   const ground=H/2+Math.tan(pitch)*H*.62+height*.35,top=ground-height;
   const col=clamp(Math.floor(x/COLS),0,depth.length-1);
   if(depth[col]<e.dist-.1)continue;
   const body=ctx.createLinearGradient(0,top,0,ground);
   body.addColorStop(0,'#f7c17b');body.addColorStop(1,'#97582f');
   ctx.fillStyle='#20252a';ctx.fillRect(x-width*.4,top+height*.34,width*.8,height*.5);
   ctx.fillStyle=body;
   ctx.fillRect(x-width*.32,top+height*.19,width*.64,height*.58);
   ctx.fillStyle='#e7a85e';ctx.fillRect(x-width*.28,top,width*.56,height*.27);
   ctx.fillStyle='#263d4b';ctx.fillRect(x-width*.22,top+height*.10,width*.44,height*.07);
   ctx.fillStyle='#9ff7ff';
   ctx.fillRect(x-width*.17,top+height*.12,width*.34,height*.035);
   ctx.fillStyle='#4b6872';
   ctx.fillRect(x-width*.29,ground-height*.15,width*.18,height*.15);
   ctx.fillRect(x+width*.10,ground-height*.15,width*.18,height*.15);
   ctx.fillStyle='#131d26';ctx.fillRect(x-width*.4,top+height*.32,width*.15,height*.25);ctx.fillRect(x+width*.25,top+height*.32,width*.15,height*.25);
   ctx.fillStyle='#1f2934';ctx.fillRect(x-width*.35,top-height*.08,width*.70,height*.075);
   ctx.fillStyle='#80ecbe';ctx.fillRect(x-width*.35,top-height*.08,width*.70*(e.hp/65),height*.075);
  }
 }
 function drawProps(fov,depth){
  const horizon=H/2+Math.tan(pitch)*H*.62;
  const objects=[...ACTIVE_MAP.props,...(typeof getOpponents==='function'?(getOpponents()||[]).map(p=>({...p,type:'opponent'})):[])];
  objects.sort((a,b)=>Math.hypot(b.x-px,b.y-py)-Math.hypot(a.x-px,a.y-py));
  for(const prop of objects){
   const dist=Math.hypot(prop.x-px,prop.y-py);
   if(dist<.35||dist>18)continue;
   const bearing=angleDelta(Math.atan2(prop.y-py,prop.x-px),look);
   if(Math.abs(bearing)>fov/2+.2||castRay(px,py,Math.atan2(prop.y-py,prop.x-px)).dist<dist-.3)continue;
   const sx=W/2+Math.tan(bearing)/Math.tan(fov/2)*W/2;
   const height=Math.min(H*1.7,H/(dist*Math.tan(fov/2)*2)*.95);
   if(depth[Math.min(depth.length-1,Math.max(0,Math.floor(sx/COLS)))]<dist-.25)continue;
   const top=horizon-height*.48;
   if(prop.type==='tree'){
    ctx.fillStyle='#5c4731';ctx.fillRect(sx-height*.07,top,height*.14,height);
    ctx.fillStyle='#447659';ctx.beginPath();ctx.arc(sx,top+height*.18,height*.34,0,TAU);ctx.fill();
   }else if(prop.type==='plant'){
    ctx.fillStyle='#5b4838';ctx.fillRect(sx-height*.18,top+height*.46,height*.36,height*.42);
    ctx.fillStyle='#4d8655';ctx.beginPath();ctx.arc(sx,top+height*.30,height*.30,0,TAU);ctx.fill();
   }else if(prop.type==='opponent'){
    ctx.fillStyle='#d6dce5';ctx.beginPath();ctx.arc(sx,top+height*.16,height*.23,0,TAU);ctx.fill();
    ctx.fillStyle='#e17b57';ctx.fillRect(sx-height*.23,top+height*.36,height*.46,height*.50);
   }else{
    ctx.fillStyle=prop.type==='barrel'?'#94674b':'#72533d';
    ctx.fillRect(sx-height*.30,top+height*.44,height*.60,height*.42);
    ctx.fillStyle='#dbc49f';ctx.fillRect(sx-height*.31,top+height*.46,height*.62,height*.08);
   }
  }
 }
 function gunView(now){
  if(scope&&current===2){
   ctx.fillStyle='#070b11';ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(W/2,H/2,H*.43,0,TAU,true);ctx.fill('evenodd');
   ctx.strokeStyle='#101823';ctx.lineWidth=14;ctx.beginPath();ctx.arc(W/2,H/2,H*.43,0,TAU);ctx.stroke();
   ctx.strokeStyle='#b3f9ff88';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
   ctx.strokeStyle='#e5ffff';ctx.beginPath();ctx.arc(W/2,H/2,7,0,TAU);ctx.stroke();
   ctx.fillStyle='#ecf3f4';ctx.font='12px Space Grotesk,sans-serif';ctx.fillText('8×',W/2+H*.43-37,H/2+20);return;
  }
  const cx=W*.65,cy=H+35,aiming=scope&&current===2;
  const firing=now-flashAt<110&&current!==3;
  const kick=firing?Math.max(0,1-(now-flashAt)/110)*12:0;
  const sway=(playing?Math.sin(now/190)*2.5:0);
  ctx.save();ctx.translate(cx,cy+kick+sway);ctx.rotate(-.12);
  // Gloved forearm and sleeve, much closer to a FPS viewmodel.
  ctx.fillStyle='#344653';ctx.beginPath();ctx.moveTo(-9,-70);ctx.lineTo(73,-38);ctx.lineTo(178,37);ctx.lineTo(13,37);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#14212b';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#526776';ctx.beginPath();ctx.moveTo(4,-74);ctx.lineTo(44,-62);ctx.lineTo(96,-4);ctx.lineTo(32,17);ctx.closePath();ctx.fill();
  const isKnife=current===3;
  if(isKnife){
   ctx.fillStyle='#181e29';ctx.beginPath();ctx.moveTo(-28,-55);ctx.lineTo(12,-40);ctx.lineTo(15,7);ctx.lineTo(-40,5);ctx.closePath();ctx.fill();
   ctx.fillStyle='#d7dce3';ctx.beginPath();ctx.moveTo(-47,-42);ctx.lineTo(-125,-209);ctx.lineTo(-73,-177);ctx.lineTo(-12,-60);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#647b86';ctx.lineWidth=4;ctx.stroke();
   ctx.fillStyle='#f8fafb';ctx.beginPath();ctx.moveTo(-117,-199);ctx.lineTo(-53,-53);ctx.lineTo(-65,-57);ctx.closePath();ctx.fill();
  }else{
   const smg=current===1,sniper=current===2;
   const long=sniper?221:smg?165:111;
   const rear=sniper?42:smg?34:22;
   // Rear stock
   ctx.fillStyle='#1c2937';ctx.beginPath();ctx.moveTo(40,-97);ctx.lineTo(122,-75);ctx.lineTo(137,-42);ctx.lineTo(79,-56);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#627487';ctx.lineWidth=4;ctx.stroke();
   // Grip, receiver, body
   ctx.fillStyle='#263444';ctx.beginPath();ctx.moveTo(45,-85);ctx.lineTo(-long+20,-106);ctx.lineTo(-long+7,-134);ctx.lineTo(31,-141);ctx.lineTo(61,-112);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#111b27';ctx.lineWidth=5;ctx.stroke();
   // Raised metal top and tactical rails
   ctx.fillStyle='#6c8393';ctx.beginPath();ctx.moveTo(-long+17,-135);ctx.lineTo(33,-145);ctx.lineTo(47,-131);ctx.lineTo(-long+15,-124);ctx.closePath();ctx.fill();
   for(let i=0;i<8;i++){
    ctx.strokeStyle='#16232e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-long+22+i*17,-133);ctx.lineTo(-long+20+i*17,-127);ctx.stroke();
   }
   // barrel and suppressor
   ctx.fillStyle='#0f1e2a';ctx.fillRect(-long-31,-125,65,13);
   ctx.fillStyle='#829aaa';ctx.fillRect(-long-39,-127,11,17);
   ctx.fillStyle='#4f667a';ctx.fillRect(-long-28,-125,32,4);
   // magazine, trigger guard and pistol grip
   ctx.fillStyle='#101d2b';ctx.beginPath();ctx.moveTo(-25,-87);ctx.lineTo(2,-82);ctx.lineTo(-11,-19);ctx.lineTo(-34,-24);ctx.closePath();ctx.fill();
   ctx.fillStyle='#445463';ctx.beginPath();ctx.moveTo(6,-88);ctx.lineTo(23,-83);ctx.lineTo(35,-38);ctx.lineTo(9,-42);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#0d1620';ctx.lineWidth=3;ctx.stroke();
   ctx.strokeStyle='#111925';ctx.lineWidth=5;ctx.beginPath();ctx.arc(6,-71,16,-1.5,2.2);ctx.stroke();
   // Optic: meaningful for the sniper.
   if(sniper){
    ctx.fillStyle='#111c27';ctx.fillRect(-103,-171,109,27);
    ctx.fillStyle='#60788b';ctx.fillRect(-95,-167,89,7);
    ctx.fillStyle='#1d2a38';ctx.beginPath();ctx.ellipse(-101,-157,14,17,0,0,TAU);ctx.fill();
    ctx.fillStyle='#9dd8db';ctx.beginPath();ctx.ellipse(-101,-157,8,11,0,0,TAU);ctx.fill();
    ctx.fillStyle='#171e28';ctx.fillRect(-71,-148,11,18);ctx.fillRect(-10,-148,11,18);
   }else if(smg){
    ctx.fillStyle='#0c151e';ctx.fillRect(-27,-158,20,24);
    ctx.fillStyle='#9bc0ca';ctx.fillRect(-21,-157,8,8);
   }else{
    ctx.fillStyle='#0d141e';ctx.fillRect(-2,-156,6,20);
    ctx.fillStyle='#617786';ctx.fillRect(-4,-159,10,5);
   }
   if(firing){
    ctx.fillStyle='#ffe7a4';ctx.beginPath();ctx.moveTo(-long-43,-119);ctx.lineTo(-long-91,-160);ctx.lineTo(-long-75,-122);ctx.lineTo(-long-101,-93);ctx.lineTo(-long-43,-108);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff9e3';ctx.beginPath();ctx.arc(-long-49,-119,12,0,TAU);ctx.fill();
   }
  }
  // Front hand braces weapon; visible finger separation.
  ctx.fillStyle='#2b3f4d';ctx.beginPath();ctx.moveTo(-64,-83);ctx.quadraticCurveTo(-37,-119,1,-93);ctx.lineTo(25,-60);ctx.lineTo(-19,-40);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#111a25';ctx.lineWidth=4;ctx.stroke();
  for(let i=0;i<3;i++){ctx.strokeStyle='#60707d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-47+i*10,-83+i*2);ctx.lineTo(-33+i*10,-65+i*2);ctx.stroke();}
  ctx.restore();
  // Sight
  ctx.lineWidth=2;ctx.strokeStyle=now-hitAt<190?'#9bffa4':'#efffffe6';
  ctx.beginPath();ctx.moveTo(W/2-14,H/2);ctx.lineTo(W/2-5,H/2);
  ctx.moveTo(W/2+5,H/2);ctx.lineTo(W/2+14,H/2);
  ctx.moveTo(W/2,H/2-14);ctx.lineTo(W/2,H/2-5);
  ctx.moveTo(W/2,H/2+5);ctx.lineTo(W/2,H/2+14);ctx.stroke();
 }
 function render(now){
  const fov=scope&&current===2?.29:FOV;
  if(world3D){
   try{
    world3D.draw({x:px,y:py,look,pitch,scope,enemies,opponents:typeof getOpponents==='function'?(getOpponents()||[]):[],time:now});
    ctx.clearRect(0,0,W,H);
   }catch(error){
    console.warn('SHOOT’E R!: fallback do WebGL',error);
    try{world3D.dispose();}catch{}
    world3D=null;worldCanvas.style.display='none';el.classList.remove('shooter-webgl-ready');
   }
  }
  if(!world3D){
   background();
   const depths=drawWalls(fov);
   drawEnemies(fov,depths,now);
   drawProps(fov,depths);
  }
  gunView(now);
  if(now-hitAt<180){ctx.fillStyle='#caffbd';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.fillText('✕',W/2,H/2-30);}
  const vignette=ctx.createRadialGradient(W/2,H/2,H*.12,W/2,H/2,W*.68);
  vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#00000099');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 }
 function tick(now){
  if(!playing)return;
  const dt=clamp((now-lastFrame)/1000,0,.05);lastFrame=now;
  const remaining=DURATION-(now-startTime)/1000;
  if(remaining<=0){finish(mode==='multi'||kills>=TARGET&&life>0);render(now);return;}
  if(reloadEnds&&now>=reloadEnds){
   const g=gun(),amount=Math.min(g.mag-g.ammo,g.reserve);
   g.ammo+=amount;g.reserve-=amount;reloadEnds=0;
   setHint('Arma recarregada!');
  }
  move(dt);think(dt,now);
  if(shooting)fire(now);
  render(now);updateHud(remaining);
  if(onPose&&now-lastPosePublish>175){lastPosePublish=now;try{onPose({x:px,y:py,angle:look,pitch,weapon:current,hp:life});}catch{}}
  if(playing)raf=requestAnimationFrame(tick);
 }
 function keyDown(event){
  if(!el.isConnected)return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  const key=event.key.toLowerCase();
  if(['w','a','s','d','r','arrowup','arrowdown','arrowleft','arrowright','pageup','pagedown','1','2','3','4',' '].includes(key))event.preventDefault();
  pressed.add(key);
  if(['1','2','3','4'].includes(key)&&playing){
   current=Number(key)-1;scope=false;reloadEnds=0;updateHud(DURATION-(performance.now()-startTime)/1000);
  }
  if(key==='r')startReload();
  if(key===' ')fire();
 }
 function keyUp(event){pressed.delete(event.key.toLowerCase());}
 function mouseMove(event){
  if(!playing)return;
  if(document.pointerLockElement===canvas){look+=event.movementX*.0028*(scope?.48:1);pitch=clamp(pitch-event.movementY*.0026,-.62,.62);}
  else if(dragX!==null){look+=(event.clientX-dragX)*.004;dragX=event.clientX;}
 }
 function down(event){
  if(!playing)return;
  event.preventDefault();
  if(event.button===2){scope=current===2;return;}
  if(event.button!==0)return;
  if(event.pointerType==='touch'){dragX=event.clientX;canvas.setPointerCapture?.(event.pointerId);return;}
  shooting=true;fire();
  if(document.pointerLockElement!==canvas){dragX=event.clientX;canvas.requestPointerLock?.().catch(()=>{});}
 }
 function up(event){if(event.target?.closest?.('[data-hold-key],[data-hold-fire],[data-hold-scope]'))return;
  if(event.button===2){scope=false;return;}shooting=false;dragX=null;}
 function pointerMove(e){if(!playing||e.pointerType!=='touch'||dragX===null)return;
  look+=(e.clientX-dragX)*.006;pitch=clamp(pitch-(e.movementY||0)*.002,-.62,.62);dragX=e.clientX;}
 function touchDown(e){
  const key=e.target.closest('[data-hold-key]');
  if(key){e.preventDefault();pressed.add(key.dataset.holdKey);key.setPointerCapture?.(e.pointerId);return;}
  if(e.target.closest('[data-hold-fire]')){e.preventDefault();shooting=true;fire();e.target.setPointerCapture?.(e.pointerId);return;}
  if(e.target.closest('[data-hold-scope]')){e.preventDefault();scope=current===2;e.target.setPointerCapture?.(e.pointerId);}
 }
 function touchUp(e){
  const key=e.target.closest('[data-hold-key]');if(key)pressed.delete(key.dataset.holdKey);
  if(e.target.closest('[data-hold-fire]'))shooting=false;
  if(e.target.closest('[data-hold-scope]'))scope=false;
 }
 function contextMenu(e){e.preventDefault();}
 function click(e){
  if(e.target.closest('[data-shoot-start]')){rewarded=false;start();}
  else if(e.target.closest('[data-shoot-weapon]')){const index=Number(e.target.closest('[data-shoot-weapon]').dataset.shootWeapon);if(playing&&Number.isInteger(index)&&index>=0&&index<guns.length){current=index;scope=false;reloadEnds=0;updateHud(DURATION-(performance.now()-startTime)/1000);}}
  else if(e.target.closest('[data-shoot-reload]'))startReload();
  else if(e.target.closest('[data-shoot-scope]'))scope=current===2?!scope:false;
  else if(e.target.closest('[data-shoot-mouse]'))canvas.requestPointerLock?.().catch(()=>setHint('Seu navegador bloqueou a captura do mouse.'));
 }
 function lockChanged(){
  if(!el.isConnected)return;
  if(document.pointerLockElement!==canvas&&playing){shooting=false;setHint('Mouse liberado. Clique na arena para mirar novamente.');}
 }
 document.addEventListener('keydown',keyDown);
 document.addEventListener('keyup',keyUp);
 document.addEventListener('mousemove',mouseMove);
 document.addEventListener('pointerup',up);
 document.addEventListener('pointerlockchange',lockChanged);
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('contextmenu',contextMenu);
 el.addEventListener('pointerdown',touchDown);
 el.addEventListener('pointerup',touchUp);
 el.addEventListener('pointercancel',touchUp);
 el.addEventListener('click',click);
 look=-Math.PI/2;render(performance.now());updateHud();
 const cleanup=()=>{
  disposed=true;if(world3D){try{world3D.dispose();}catch{}world3D=null;}
  playing=false;done=true;cancelAnimationFrame(raf);
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  document.removeEventListener('keydown',keyDown);
  document.removeEventListener('keyup',keyUp);
  document.removeEventListener('mousemove',mouseMove);
  document.removeEventListener('pointerup',up);
  document.removeEventListener('pointerlockchange',lockChanged);
  canvas.removeEventListener('pointerdown',down);
  canvas.removeEventListener('pointermove',pointerMove);
  canvas.removeEventListener('contextmenu',contextMenu);
  el.removeEventListener('pointerdown',touchDown);
  el.removeEventListener('pointerup',touchUp);
  el.removeEventListener('pointercancel',touchUp);
  el.removeEventListener('click',click);
 };
 cleanup.damage=amount=>{
  if(mode!=='multi'||!playing||!Number.isFinite(amount)||amount<=0)return;
  life=Math.max(0,life-Math.min(100,amount));hitAt=performance.now();updateHud();
  if(life<=0){finish(false);setHint('Você foi eliminado! Retorne ao menu para outra partida.');}
 };
 cleanup.getPose=()=>({x:px,y:py,angle:look,pitch,hp:life,weapon:current});
 return cleanup;
}

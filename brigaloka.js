// BrigaLoka — jogo de luta 2D em Canvas, homenagens visuais desenhadas por código.
// Liner é inspirado nos dois desenhos compartilhados pelo criador.
const ROSTER=[
 {id:'liner',name:'Liner',tag:'O DONO DA ARENA',color:'#46535f',accent:'#e52c42',hair:'#23242b',skin:'#f3f2eb',special:'Explosão de Comunidade',power:16,speed:1.07},
 {id:'gemaplys',name:'Gemaplys',tag:'REI DOS COMBOS',color:'#3a5b8e',accent:'#ffb84a',hair:'#3b2b32',skin:'#e9bd97',special:'Combo Insano',power:15,speed:1.12},
 {id:'link',name:'Link',tag:'GUARDIÃO DA CORAGEM',color:'#38784c',accent:'#cdb55b',hair:'#ceab68',skin:'#f4d0a6',special:'Corte Giratório',power:17,speed:1.0},
 {id:'tanjiro',name:'Tanjiro',tag:'ESPADACHIM DA MONTANHA',color:'#317d71',accent:'#142a34',hair:'#51282e',skin:'#efd5c0',special:'Respiração da Água',power:18,speed:1.0},
 {id:'gojo',name:'Satoru Gojo',tag:'FEITICEIRO DO INFINITO',color:'#273244',accent:'#88e3f4',hair:'#f0edf3',skin:'#eed0bd',special:'Vazio Roxo',power:18,speed:1.04}
];
export const BRIGALOKA_ROSTER=ROSTER.map(({id,name,special})=>({id,name,special}));
const W=960,H=540,FLOOR=458,ROUND=90;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function paintFighter(ctx,f,now){
 const c=f.data;if(!c)return;
 ctx.save();ctx.translate(f.x,FLOOR-f.y);
 if(f.face<0)ctx.scale(-1,1);
 const bob=Math.sin(now/280+f.x)*1.6;
 ctx.translate(0,bob);
 if(f.hitUntil>now){ctx.globalAlpha=.72;}
 ctx.fillStyle='#0a1425a8';ctx.beginPath();ctx.ellipse(0,0,27,7,0,0,7);ctx.fill();
 const kicking=f.attackUntil>now&&f.attackType==='kick';
 const punching=f.attackUntil>now&&f.attackType==='punch';
 ctx.lineWidth=13;ctx.strokeStyle=c.color;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(-13,-60);ctx.lineTo(-17,0);ctx.moveTo(12,-60);ctx.lineTo(kicking?58:17,kicking?-60:0);ctx.stroke();
 ctx.fillStyle='#18232f';ctx.fillRect(-23,-8,19,7);ctx.fillRect(kicking?44:4,kicking?-66:-8,20,7);
 ctx.fillStyle=c.color;ctx.beginPath();ctx.moveTo(-27,-119);ctx.lineTo(25,-119);ctx.lineTo(24,-53);ctx.lineTo(-28,-53);ctx.closePath();ctx.fill();
 if(c.id==='tanjiro'){
   ctx.strokeStyle='#163f40';ctx.lineWidth=6;for(let y=-111;y<-58;y+=22){ctx.beginPath();ctx.moveTo(-27,y);ctx.lineTo(26,y);ctx.stroke();}
   for(let x=-20;x<27;x+=21){ctx.beginPath();ctx.moveTo(x,-120);ctx.lineTo(x,-57);ctx.stroke();}
 }
 if(c.id==='liner'){ctx.fillStyle='#ec294a';ctx.beginPath();ctx.moveTo(-4,-116);ctx.lineTo(6,-107);ctx.lineTo(-1,-75);ctx.lineTo(-14,-94);ctx.closePath();ctx.fill();}
 if(c.id==='link'){ctx.fillStyle='#e8c67d';ctx.fillRect(-11,-100,21,8);ctx.fillStyle='#a9b7cc';ctx.fillRect(-12,-88,25,12);}
 if(c.id==='gemaplys'){ctx.fillStyle='#ffb84a';ctx.fillRect(-26,-85,53,7);}
 if(c.id==='gojo'){ctx.fillStyle='#283146';ctx.fillRect(-22,-118,45,14);}
 ctx.strokeStyle=c.color;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-20,-108);ctx.lineTo(punching?67:-35,punching?-108:-69);ctx.moveTo(19,-105);ctx.lineTo(34,-72);ctx.stroke();
 if(c.id==='link'||c.id==='tanjiro'){
  ctx.strokeStyle='#d7e5ef';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(punching?67:34,punching?-108:-72);ctx.lineTo(punching?120:85,punching?-147:-95);ctx.stroke();
 }
 ctx.fillStyle=c.skin;ctx.beginPath();ctx.ellipse(0,-145,34,36,0,0,Math.PI*2);ctx.fill();
 // Olhos grandes e cabelos inclinados do Liner, conforme referência.
 ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(-35,-146);ctx.lineTo(-39,-180);ctx.lineTo(-26,-186);ctx.lineTo(-36,-199);ctx.lineTo(5,-185);ctx.lineTo(18,-207);ctx.lineTo(30,-189);ctx.lineTo(41,-184);ctx.lineTo(32,-158);ctx.lineTo(13,-173);ctx.lineTo(-11,-164);ctx.closePath();ctx.fill();
 if(c.id==='gojo'){ctx.fillStyle='#131927';ctx.fillRect(-28,-155,57,13);}
 else{
  ctx.fillStyle=c.id==='liner'?'#171e2a':'#20232d';
  ctx.beginPath();ctx.ellipse(-12,-140,c.id==='liner'?8:4,c.id==='liner'?12:6,0,0,7);ctx.ellipse(15,-140,c.id==='liner'?8:4,c.id==='liner'?12:6,0,0,7);ctx.fill();
 }
 ctx.strokeStyle='#44404a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,-119);ctx.lineTo(10,-120);ctx.stroke();
 if(f.specialUntil>now){ctx.strokeStyle=c.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-101,70+Math.sin(now/40)*8,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
export function mountBrigaLoka({root,user,addCoins}){
 let page='menu',p1=ROSTER[0],p2=ROSTER[3],versusCPU=true,raf=0,keys=new Set(),last=0,started=0,roundEnd=false;
 let p=null,enemy=null,notice='',rewarded=false,rounds=0;
 root.innerHTML='<section class="arcade-game brigaloka-game"><header class="brigaloka-head"><span class="eyebrow">LINERCALL FIGHTING CLUB</span><h2>BRIGA<span>LOKA</span>!</h2><p>Jogo de luta 2D com cinco personagens. Escolha seu lutador e vença a batalha!</p></header><div id="brig-stage"></div></section>';
 const stage=root.querySelector('#brig-stage');
 const choose=(label,selected,prefix)=>'<div class="brig-roster"><h3>'+label+'</h3><div class="brig-roster-grid">'+ROSTER.map(c=>'<button type="button" class="brig-fighter-card '+(c.id===selected.id?'selected':'')+'" data-brig-'+prefix+'="'+c.id+'"><span style="--brig-color:'+c.accent+'">●</span><b>'+c.name+'</b><small>'+c.tag+'</small></button>').join('')+'</div></div>';
 function menu(){
  page='menu';stopFrame();
  stage.innerHTML='<div class="brig-menu"><p>Escolha como você quer lutar:</p><div class="brig-actions">'+
   '<button class="btn btn-primary" data-brig-mode="cpu">🥊 Singleplayer VS CPU</button>'+
   '<button class="btn" data-brig-mode="local">👥 Dois jogadores no mesmo teclado</button>'+
   '<button class="btn" data-brig-mode="help">📖 Como jogar</button></div>'+
   '<p class="arcade-note">O modo para duas pessoas usa o mesmo computador. Partidas de BrigaLoka pela internet ainda não estão disponíveis.</p></div>';
 }
 function select(mode){
  page='select';versusCPU=mode==='cpu';
  stage.innerHTML='<div class="brig-selection"><span class="eyebrow">'+(versusCPU?'UM JOGADOR':'DOIS JOGADORES LOCAIS')+'</span>'+
   choose('Jogador 1',p1,'one')+choose(versusCPU?'Adversário controlado pela CPU':'Jogador 2',p2,'two')+
   '<div class="brig-actions"><button class="btn btn-primary" data-brig-start>⚔ Começar a luta</button><button class="btn" data-brig-back>← Voltar</button></div></div>';
 }
 function help(){
  page='help';stage.innerHTML='<div class="arcade-case-panel"><h3>🥊 Como jogar BrigaLoka</h3>'+
   '<p><b>Jogador 1:</b> A/D mover, W pular, J soco, K chute, L golpe especial (gasta energia), S defender.</p>'+
   '<p><b>Jogador 2:</b> ←/→ mover, ↑ pular, 1 soco, 2 chute, 3 especial, ↓ defender (teclado numérico ou teclas 1/2/3).</p>'+
   '<p>Acerte golpes para encher sua barra especial. Uma luta dura 90 segundos. Se acabar o tempo, vence quem tiver mais vida.</p>'+
   '<button class="btn" data-brig-back>← Voltar</button></div>';
 }
 function resetFighter(data,x,face){
  return {data,x,y:0,vy:0,face,hp:100,energy:0,attackUntil:0,attackType:'',nextAttack:0,specialUntil:0,hitUntil:0,block:false,wins:0};
 }
 function start(){
  page='fight';stopFrame();roundEnd=false;notice='LUTEM!';rewarded=false;
  p=resetFighter(p1,270,1);enemy=resetFighter(p2,690,-1);last=performance.now();started=last;keys.clear();
  stage.innerHTML='<div class="brig-hud"><div><b id="brig-p-name">'+p1.name+'</b><div class="brig-meter"><i id="brig-p-hp"></i></div><small id="brig-p-special"></small></div><strong id="brig-time">90</strong><div><b id="brig-e-name">'+p2.name+'</b><div class="brig-meter"><i id="brig-e-hp"></i></div><small id="brig-e-special"></small></div></div>'+
   '<canvas id="brig-canvas" width="960" height="540" tabindex="0" aria-label="Arena de luta BrigaLoka"></canvas>'+
   '<p class="arcade-note" id="brig-notice">LUTEM!</p>'+
   '<div class="brig-actions"><button type="button" class="btn" data-brig-rematch>↻ Revanche</button><button type="button" class="btn" data-brig-select>Trocar personagens</button><button type="button" class="btn" data-brig-back>Menu</button></div>';
  stage.querySelector('canvas').focus();
  raf=requestAnimationFrame(tick);
 }
 function stopFrame(){cancelAnimationFrame(raf);raf=0;}
 function strike(a,b,type,now){
  if(roundEnd||a.nextAttack>now||a.hp<=0)return;
  const special=type==='special';
  if(special&&a.energy<70)return;
  if(special)a.energy-=70;
  const cooldown=special?1250:type==='kick'?700:430;
  a.nextAttack=now+cooldown;
  a.attackUntil=now+(special?520:230);
  a.attackType=type;
  a.face=a.x<b.x?1:-1;
  if(special)a.specialUntil=now+560;
  const dist=Math.abs(a.x-b.x);
  const reach=special?185:type==='kick'?105:86;
  if(dist>reach||Math.abs(a.y-b.y)>90)return;
  const dmg=(type==='punch'?7:type==='kick'?11:25)*((a.data.power||16)/16)*(b.block?.24:1);
  b.hp=clamp(b.hp-dmg,0,100);b.hitUntil=now+180;a.energy=clamp(a.energy+(special?0:19),0,100);
  b.x=clamp(b.x+(a.face*clamp(dmg*.85,3,18)),55,W-55);
  notice=special?a.data.special+'!':type==='kick'?'CHUTE!':'SOCO!';
  if(b.hp<=0)endRound(a===p?'Você venceu!':'O rival venceu!');
 }
 function actions(a,b,controls,dt,now){
  if(!a||roundEnd)return;
  a.block=keys.has(controls.block);
  const dir=Number(keys.has(controls.right))-Number(keys.has(controls.left));
  if(dir&&!a.block){a.x=clamp(a.x+dir*(195*a.data.speed)*dt,48,W-48);}
  if(keys.has(controls.jump)&&a.y===0){a.vy=390;}
  a.vy-=870*dt;a.y=clamp(a.y+a.vy*dt,0,210);if(a.y===0)a.vy=0;
  a.face=a.x<b.x?1:-1;
  if(keys.has(controls.punch))strike(a,b,'punch',now);
  else if(keys.has(controls.kick))strike(a,b,'kick',now);
  else if(keys.has(controls.special))strike(a,b,'special',now);
 }
 const first={left:'a',right:'d',jump:'w',punch:'j',kick:'k',special:'l',block:'s'};
 const second={left:'arrowleft',right:'arrowright',jump:'arrowup',punch:'1',kick:'2',special:'3',block:'arrowdown'};
 function cpu(now,dt){
  if(!enemy||roundEnd)return;
  const delta=p.x-enemy.x,dist=Math.abs(delta);
  enemy.face=delta>0?1:-1;
  enemy.block=dist<120&&Math.sin(now/400)>0.86;
  if(dist>102)enemy.x=clamp(enemy.x+Math.sign(delta)*125*dt,48,W-48);
  if(dist<150&&now>=enemy.nextAttack){
   const type=enemy.energy>=70&&Math.random()<.19?'special':Math.random()<.35?'kick':'punch';
   strike(enemy,p,type,now);
  }
 }
 function endRound(message){
  if(roundEnd)return;roundEnd=true;notice=message;
  // LCoins apenas no singleplayer, por vitória diária neste navegador.
  if(versusCPU&&p.hp>enemy.hp){
   const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const key='linercall-brigaloka-'+user.uid+'-'+day;
   if(!localStorage.getItem(key)){localStorage.setItem(key,'1');addCoins(30);notice+=' +30 LCoins!';rewarded=true;}
  }
  stage.querySelector('#brig-notice').textContent=notice+' · use Revanche ou Trocar personagens.';
 }
 function render(now){
  const c=stage.querySelector('canvas');if(!c)return;
  const ctx=c.getContext('2d');
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#201d52');sky.addColorStop(.7,'#78659b');sky.addColorStop(1,'#dba98d');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#e9d59d';ctx.beginPath();ctx.arc(730,115,60,0,Math.PI*2);ctx.fill();
  for(let i=0;i<12;i++){const x=i*100;ctx.fillStyle=i%2?'#313c59':'#3a3d64';ctx.fillRect(x,225+Math.sin(i*4)*30,100,235);}
  ctx.fillStyle='#2b3444';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#5b7182';ctx.fillRect(0,FLOOR,W,9);
  for(let x=0;x<W;x+=85){ctx.strokeStyle='#9da6b240';ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.lineTo(x-60,H);ctx.stroke();}
  for(let y=0;y<5;y++){ctx.strokeStyle='#9da6b230';ctx.beginPath();ctx.moveTo(0,FLOOR+y*y*8);ctx.lineTo(W,FLOOR+y*y*8);ctx.stroke();}
  paintFighter(ctx,p,now);paintFighter(ctx,enemy,now);
  if(roundEnd){ctx.fillStyle='#101628cc';ctx.fillRect(0,170,W,115);ctx.fillStyle='#ffe9a5';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText(notice,W/2,230);}
  stage.querySelector('#brig-p-hp').style.width=p.hp+'%';
  stage.querySelector('#brig-e-hp').style.width=enemy.hp+'%';
  stage.querySelector('#brig-p-special').textContent='ESPECIAL '+Math.floor(p.energy)+'%';
  stage.querySelector('#brig-e-special').textContent='ESPECIAL '+Math.floor(enemy.energy)+'%';
  stage.querySelector('#brig-time').textContent=String(Math.max(0,Math.ceil(ROUND-(now-started)/1000)));
  stage.querySelector('#brig-notice').textContent=notice;
 }
 function tick(now){
  if(page!=='fight')return;
  const dt=clamp((now-last)/1000,0,.04);last=now;
  if(!roundEnd){
   actions(p,enemy,first,dt,now);
   if(versusCPU)cpu(now,dt);else actions(enemy,p,second,dt,now);
   if((now-started)/1000>=ROUND)endRound(p.hp===enemy.hp?'EMPATE!':p.hp>enemy.hp?'Você venceu!':'O rival venceu!');
  }
  render(now);
  if(!roundEnd)raf=requestAnimationFrame(tick);
 }
 function onClick(event){
  const mode=event.target.closest('[data-brig-mode]');if(mode){if(mode.dataset.brigMode==='help')help();else select(mode.dataset.brigMode);return;}
  const one=event.target.closest('[data-brig-one]');if(one){p1=ROSTER.find(x=>x.id===one.dataset.brigOne)||p1;select(versusCPU?'cpu':'local');return;}
  const two=event.target.closest('[data-brig-two]');if(two){p2=ROSTER.find(x=>x.id===two.dataset.brigTwo)||p2;select(versusCPU?'cpu':'local');return;}
  if(event.target.closest('[data-brig-start]'))start();
  else if(event.target.closest('[data-brig-rematch]'))start();
  else if(event.target.closest('[data-brig-select]'))select(versusCPU?'cpu':'local');
  else if(event.target.closest('[data-brig-back]'))menu();
 }
 function onKeyDown(e){if(page!=='fight'||!stage.contains(document.activeElement))return;const k=e.key.toLowerCase();if(['a','d','w','s','j','k','l','arrowleft','arrowright','arrowup','arrowdown','1','2','3'].includes(k)){e.preventDefault();keys.add(k);}}
 function onKeyUp(e){keys.delete(e.key.toLowerCase());}
 root.addEventListener('click',onClick);document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
 menu();
 return ()=>{stopFrame();root.removeEventListener('click',onClick);document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);};
}

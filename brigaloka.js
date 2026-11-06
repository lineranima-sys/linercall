import {drawFighterArt,drawStage,drawHitSparks} from './brigaloka-art.js?v=20261105-polish';
import {LINER_PORTRAIT} from './liner-portrait.js';
import {fightersInRange} from './story-combat-v3.js';
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
export function mountBrigaLoka({root,user,addCoins}){
 let page='menu',p1=ROSTER[0],p2=ROSTER[3],versusCPU=true,raf=0,keys=new Set(),last=0,started=0,roundEnd=false;
 let p=null,enemy=null,notice='',rewarded=false,rounds=0;
 root.innerHTML='<section class="arcade-game brigaloka-game"><header class="brigaloka-head"><span class="eyebrow">LINERCALL FIGHTING CLUB</span><h2>BRIGA<span>LOKA</span>!</h2><p>Jogo de luta 2D com cinco personagens. Escolha seu lutador e vença a batalha!</p></header><div id="brig-stage"></div></section>';
 const stage=root.querySelector('#brig-stage');
 const choose=(label,selected,prefix)=>'<div class="brig-roster"><h3>'+label+'</h3><div class="brig-roster-grid">'+ROSTER.map(c=>
  '<button type="button" class="brig-fighter-card '+(c.id===selected.id?'selected':'')+'" style="--fighter-accent:'+c.accent+'" data-brig-'+prefix+'="'+c.id+'">'+
  '<span class="brig-fighter-art"><canvas width="150" height="160" data-brig-preview="'+c.id+'" aria-hidden="true"></canvas></span>'+
  '<b>'+c.name+'</b><small>'+c.tag+'</small></button>').join('')+'</div></div>';
 function paintRoster(){
  stage.querySelectorAll('[data-brig-preview]').forEach((canvas,i)=>{
   const c=ROSTER.find(f=>f.id===canvas.dataset.brigPreview);
   if(!c)return;
   const cx=canvas.getContext('2d');cx.clearRect(0,0,150,160);
   drawFighterArt(cx,{data:c,x:75,y:0,face:1,attackUntil:0,hitUntil:0,block:false},0,{floor:158,scale:.58,preview:true});
  });
 }
 function menu(){
  page='menu';stopFrame();
  stage.innerHTML='<div class="brig-menu"><div class="brig-menu-intro"><span class="eyebrow">VERSUS · ARENA 2D</span><h3>Quem vai dominar a arena?</h3><p>Escolha o modo, selecione seu lutador e prepare seus combos. Cada personagem tem seu estilo de luta.</p></div>'+
   '<div class="brig-actions">'+
   '<button type="button" class="btn btn-primary" data-brig-mode="cpu">🥊 <b>ARCADE SOLO</b><small>Enfrente a CPU e conquiste a vitória.</small></button>'+
   '<button type="button" class="btn" data-brig-mode="local">👥 <b>VERSUS LOCAL</b><small>Duelo para dois no mesmo teclado.</small></button>'+
   '<button type="button" class="btn" data-brig-mode="help">📖 <b>COMO JOGAR</b><small>Comandos, especiais e defesa.</small></button></div>'+
   '<p class="arcade-note">Modo versus é local. Partidas online ainda não estão disponíveis.</p></div>';
 } function select(mode){
  page='select';versusCPU=mode==='cpu';
  stage.innerHTML='<div class="brig-selection"><span class="brig-selection-title">'+(versusCPU?'ARCADE · CONTRA CPU':'VERSUS LOCAL · DOIS JOGADORES')+'</span>'+
   choose('JOGADOR 1',p1,'one')+choose(versusCPU?'RIVAL CONTROLADO PELA CPU':'JOGADOR 2',p2,'two')+
   '<div class="brig-actions"><button type="button" class="btn btn-primary" data-brig-start>⚔ INICIAR COMBATE</button><button type="button" class="btn" data-brig-back>← Menu de luta</button></div></div>';
  paintRoster();
 } function help(){
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
  stage.innerHTML='<div class="brig-hud"><div><b id="brig-p-name">'+p1.name+'</b><div class="brig-meter"><i id="brig-p-hp"></i></div><small id="brig-p-special">ESPECIAL 0%</small></div>'+
   '<strong id="brig-time">90</strong><div><b id="brig-e-name">'+p2.name+'</b><div class="brig-meter"><i id="brig-e-hp"></i></div><small id="brig-e-special">ESPECIAL 0%</small></div></div>'+
   '<div class="brig-fight-wrapper"><canvas id="brig-canvas" width="960" height="540" tabindex="0" aria-label="Arena de luta BrigaLoka"></canvas></div>'+
   '<p class="arcade-note" id="brig-notice">ROUND 1 · LUTEM!</p>'+
   '<div class="brig-fight-controls"><button type="button" data-brig-hold="a">◀ Andar</button><button type="button" data-brig-hold="d">Andar ▶</button><button type="button" data-brig-hold="w">▲ Pular</button><button type="button" data-brig-hold="s">🛡 Defender</button><button type="button" data-brig-hold="j">👊 Soco</button><button type="button" data-brig-hold="k">🦶 Chute</button><button type="button" data-brig-hold="l">✨ Especial</button><span class="brig-controls-hint">Jogador 1: A/D/W/S + J/K/L. Jogador 2: setas + 1/2/3.</span></div>'+
   '<div class="brig-actions"><button type="button" class="btn btn-primary" data-brig-rematch>↻ REVANCHE</button><button type="button" class="btn" data-brig-select>Trocar lutadores</button><button type="button" class="btn" data-brig-back>Menu</button></div>';
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
  // Hitbox da mão/pé estende-se à frente do lutador; não exige contato entre corpos.
  if(!fightersInRange(a,b,type))return;
  const dmg=(type==='punch'?7:type==='kick'?11:25)*((a.data.power||16)/16)*(b.block?.24:1);
  b.hp=clamp(b.hp-dmg,0,100);b.hitUntil=now+180;b.lastHitAt=now;a.energy=clamp(a.energy+(special?0:19),0,100);
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
  if(dist>173)enemy.x=clamp(enemy.x+Math.sign(delta)*125*dt,48,W-48);
  if(dist<223&&now>=enemy.nextAttack){
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
  const canvas=stage.querySelector('canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  drawStage(ctx,now,W,H,FLOOR);
  drawFighterArt(ctx,p,now,{floor:FLOOR,scale:1.24});
  drawFighterArt(ctx,enemy,now,{floor:FLOOR,scale:1.24});
  if(p.lastHitAt&&now-p.lastHitAt<280)drawHitSparks(ctx,p.x+15,FLOOR-140-p.y,now-p.lastHitAt,p.data.accent);
  if(enemy.lastHitAt&&now-enemy.lastHitAt<280)drawHitSparks(ctx,enemy.x-15,FLOOR-140-enemy.y,now-enemy.lastHitAt,enemy.data.accent);
  if(p.specialUntil>now||enemy.specialUntil>now){
   ctx.save();ctx.globalAlpha=.08;ctx.fillStyle='#fff3f9';ctx.fillRect(0,0,W,H);ctx.restore();
  }
  if(roundEnd){
   ctx.fillStyle='#101424ce';ctx.fillRect(0,185,W,125);
   ctx.fillStyle='#ffe7a7';ctx.font='900 46px Space Grotesk, sans-serif';ctx.textAlign='center';
   ctx.shadowColor='#ab4e79';ctx.shadowBlur=16;ctx.fillText(notice,W/2,265);
   ctx.shadowBlur=0;
  }
  stage.querySelector('#brig-p-hp').style.width=p.hp+'%';
  stage.querySelector('#brig-e-hp').style.width=enemy.hp+'%';
  stage.querySelector('#brig-p-special').textContent='ENERGIA '+Math.floor(p.energy)+'%'+(p.energy>=70?' · ESPECIAL PRONTO!':'');
  stage.querySelector('#brig-e-special').textContent='ENERGIA '+Math.floor(enemy.energy)+'%'+(enemy.energy>=70?' · ESPECIAL PRONTO!':'');
  stage.querySelector('#brig-time').textContent=String(Math.max(0,Math.ceil(ROUND-(now-started)/1000)));
  stage.querySelector('#brig-notice').textContent=roundEnd?notice:notice+' · use J/K/L ou os botões na tela';
 }
 function tick(now){
  if(page!=='fight')return;
  const dt=clamp((now-last)/1000,0,.04);last=now;
  if(!roundEnd){
   actions(p,enemy,first,dt,now);
   if(versusCPU)cpu(now,dt);else actions(enemy,p,second,dt,now);
   if((now-started)/1000>=ROUND)endRound(p.hp===enemy.hp?'EMPATE!':p.hp>enemy.hp?'Você venceu!':'O rival venceu!');
  }
  // Pushboxes impedem que lutadores atravessem um ao outro.
  if(!roundEnd&&p&&enemy){
   const delta=enemy.x-p.x,overlap=78-Math.abs(delta);
   if(overlap>0){
    const side=delta>=0?1:-1;
    p.x=clamp(p.x-side*overlap*.5,48,W-48);
    enemy.x=clamp(enemy.x+side*overlap*.5,48,W-48);
   }
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
 function onHoldStart(event){
  const control=event.target.closest?.('[data-brig-hold]');
  if(!control||page!=='fight')return;
  event.preventDefault();
  keys.add(control.dataset.brigHold);
  control.setPointerCapture?.(event.pointerId);
 }
 function onHoldEnd(event){
  const control=event.target.closest?.('[data-brig-hold]');
  if(control)keys.delete(control.dataset.brigHold);
 }
 root.addEventListener('pointerdown',onHoldStart);
 root.addEventListener('pointerup',onHoldEnd);
 root.addEventListener('pointercancel',onHoldEnd);
 root.addEventListener('click',onClick);document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
 menu();
 return ()=>{stopFrame();root.removeEventListener('click',onClick);root.removeEventListener('pointerdown',onHoldStart);root.removeEventListener('pointerup',onHoldEnd);root.removeEventListener('pointercancel',onHoldEnd);document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);};
}

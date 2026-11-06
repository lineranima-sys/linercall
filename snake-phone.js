// Cobrinha dos Telefones — Arcade do LinerCall.
// Recompensas usam a carteira local existente; cada telefone capturado rende exatamente 10 LCoins.
export const BOARD_SIZE=22,PHONE_REWARD=10;
export const DIRECTION={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
export function nextPhone(snake,random=Math.random){
 const occupied=new Set(snake.map(p=>p.x+','+p.y)),cells=[];
 for(let y=0;y<BOARD_SIZE;y++)for(let x=0;x<BOARD_SIZE;x++)
  if(!occupied.has(x+','+y))cells.push({x,y});
 return cells.length?cells[Math.min(cells.length-1,Math.floor(random()*cells.length))]:null;
}
export function moveSnake(snake,dir,food){
 const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
 const ate=!!food&&head.x===food.x&&head.y===food.y;
 const occupied=ate?snake:snake.slice(0,-1);
 const dead=head.x<0||head.y<0||head.x>=BOARD_SIZE||head.y>=BOARD_SIZE||
 occupied.some(p=>p.x===head.x&&p.y===head.y);
 return {dead,ate,snake:dead?snake:[head,...snake.slice(0,ate?snake.length:snake.length-1)]};
}
export function mountPhoneSnake({root,user,addCoins}){
 const unit=24,side=BOARD_SIZE*unit,key='lc-phone-snake-record-'+String(user?.uid||'guest').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
 let body=[{x:7,y:11},{x:6,y:11},{x:5,y:11}],face=DIRECTION.right,queued=face,food=nextPhone(body);
 let active=false,paused=false,ended=false,count=0,gained=0,best=0,interval=145,accum=0,prev=0,raf=0,noticeUntil=0;
 try{best=Math.max(0,Number(localStorage.getItem(key))||0);}catch{}
 root.innerHTML='<section class="phone-snake"><header class="phone-snake-header"><div><small>LINERCALL ARCADE · CLÁSSICOS</small><h3>COBRINHA DOS TELEFONES</h3><p>Coma os telefones, cresça e não morda a própria cauda.</p></div><span class="phone-snake-reward">📱 +10 LCoins<br><small>por telefone</small></span></header>'+
 '<div class="phone-snake-stats"><span>📱 Telefones: <b data-sn="count">0</b></span><span>🪙 Ganhos: <b data-sn="coins">0</b></span><span>🏆 Recorde: <b data-sn="best">0</b></span></div>'+
 '<div class="phone-snake-board"><canvas width="528" height="528" tabindex="0" aria-label="Jogo da cobrinha"></canvas><div class="phone-snake-cover" data-sn="cover"><div><strong data-sn="cover-title">Cobrinha dos Telefones</strong><p data-sn="cover-info">Cada telefone capturado vale 10 LCoins. Use as setas ou WASD.</p><button data-sn-action="start" type="button">▶ Começar</button></div></div></div>'+
 '<div class="phone-snake-buttons"><div class="phone-snake-dpad"><button data-sn-dir="up" type="button">▲</button><div><button data-sn-dir="left" type="button">◀</button><button data-sn-dir="down" type="button">▼</button><button data-sn-dir="right" type="button">▶</button></div></div><div class="phone-snake-actions"><button data-sn-action="pause" type="button">⏸ Pausar</button><button data-sn-action="restart" type="button">↻ Reiniciar</button><button data-minigame-back type="button">← Voltar</button></div></div>'+
 '<p class="phone-snake-foot">Setas ou WASD para movimentar · Espaço ou P para pausar · funciona também no celular.</p></section>';
 const el=selector=>root.querySelector(selector),canvas=el('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx){el('[data-sn="cover-info"]').textContent='Canvas indisponível.';return ()=>{};}
 ctx.imageSmoothingEnabled=false;
 const setText=(n,text)=>{el('[data-sn="'+n+'"]').textContent=String(text);};
 const stats=()=>{setText('count',count);setText('coins',gained);setText('best',best);};
 const cover=(title,info,button)=>{setText('cover-title',title);setText('cover-info',info);el('[data-sn="cover"]').classList.remove('hidden');el('[data-sn="cover"] button').textContent=button;};
 const hideCover=()=>el('[data-sn="cover"]').classList.add('hidden');
 function reset(){
  body=[{x:7,y:11},{x:6,y:11},{x:5,y:11}];face=DIRECTION.right;queued=face;food=nextPhone(body);
  active=true;paused=false;ended=false;count=0;gained=0;interval=145;accum=0;prev=0;stats();hideCover();canvas.focus();
 }
 function pause(){
  if(!active||ended)return;
  paused=!paused;prev=0;accum=0;
  if(paused)cover('Jogo pausado','Pressione P ou Espaço para continuar.','▶ Continuar');else hideCover();
  el('[data-sn-action="pause"]').textContent=paused?'▶ Continuar':'⏸ Pausar';
 }
 function direction(name){
  if(!active||paused||ended)return;
  const next=DIRECTION[name];
  if(next&&(next.x!==-face.x||next.y!==-face.y))queued=next;
 }
 function tick(){
  face=queued;
  const result=moveSnake(body,face,food);
  if(result.dead){active=false;ended=true;cover('Fim de jogo!','Você comeu '+count+' telefone(s) e ganhou '+gained+' LCoins.','↻ Jogar novamente');return;}
  body=result.snake;
  if(result.ate){
   count++;gained+=PHONE_REWARD;
   try{addCoins(PHONE_REWARD);}catch(err){console.warn('Crédito da cobrinha:',err);}
   if(count>best){best=count;try{localStorage.setItem(key,String(best));}catch{}}
   interval=Math.max(82,145-count*2);food=nextPhone(body);noticeUntil=performance.now()+850;stats();
   if(!food){active=false;ended=true;cover('Tabuleiro completo!','Você preencheu o tabuleiro e ganhou '+gained+' LCoins.','↻ Recomeçar');}
  }
 }
 function box(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
 function paint(ms){
  box(0,0,side,side,'#112136');
  for(let y=0;y<BOARD_SIZE;y++)for(let x=0;x<BOARD_SIZE;x++)if((x+y)%2===0)box(x*unit,y*unit,unit,unit,'#172c43');
  for(let i=0;i<BOARD_SIZE;i++){box(i*unit,0,unit,3,'#667995');box(i*unit,side-3,unit,3,'#667995');box(0,i*unit,3,unit,'#667995');box(side-3,i*unit,3,unit,'#667995');}
  if(food){
   const x=food.x*unit,y=food.y*unit;
   box(x+3,y+1,18,22,'#e7b4f7');box(x+6,y+4,12,14,'#6de1e8');box(x+8,y+6,8,9,'#d2fdff');box(x+10,y+19,4,2,'#37405f');box(x+4,y+1,16,2,'#fff3be');
  }
  body.forEach((p,i)=>{
   const x=p.x*unit,y=p.y*unit;
   box(x+1,y+1,22,22,i===0?'#b5ee73':i%2?'#48bda2':'#58cfad');
   box(x+3,y+3,18,3,i===0?'#ebffbd':'#92eed0');
   if(i===0){
    const eyes=face.y?[[6,face.y<0?5:15],[15,face.y<0?5:15]]:[[face.x>0?15:5,6],[face.x>0?15:5,15]];
    eyes.forEach(([ex,ey])=>box(x+ex,y+ey,4,4,'#1b2b41'));
   }
  });
  if(noticeUntil>ms){ctx.fillStyle='#ffe9a5';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.fillText('+10 LCoins!',side/2,40);}
 }
 function frame(ms){
  if(!root.isConnected)return;
  const dt=prev?Math.min(200,ms-prev):0;prev=ms;
  if(active&&!paused&&!ended){
   accum+=dt;while(accum>=interval&&active){accum-=interval;tick();}
  }
  paint(ms);raf=requestAnimationFrame(frame);
 }
 const keydown=e=>{
  if(e.target?.matches?.('input,textarea,select'))return;
  const names={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
  const name=e.key.toLowerCase();
  if(names[name]){e.preventDefault();direction(names[name]);}
  else if((name===' '||name==='p')&&!e.repeat){e.preventDefault();pause();}
  else if(name==='enter'&&!e.repeat&&(!active||ended)){e.preventDefault();reset();}
 };
 const click=e=>{
  const d=e.target.closest('[data-sn-dir]')?.dataset.snDir;if(d){direction(d);return;}
  const button=e.target.closest('[data-sn-action]')?.dataset.snAction;
  if(button==='pause')pause();
  else if(button==='start'){if(active&&paused&&!ended)pause();else reset();}
  else if(button==='restart')reset();
 };
 const onBlur=()=>{if(active&&!paused)pause();};
 const onVisibility=()=>{if(document.hidden&&active&&!paused)pause();};
 root.addEventListener('click',click);document.addEventListener('keydown',keydown);
 window.addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVisibility);
 stats();raf=requestAnimationFrame(frame);
 return ()=>{cancelAnimationFrame(raf);root.removeEventListener('click',click);document.removeEventListener('keydown',keydown);
  window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVisibility);};
}

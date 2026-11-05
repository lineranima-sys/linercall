/* Herói em um mundo Luminoso — desafio original "Descida de Ouro"
   Deslize automático, desvio vertical com ↑/↓ e bolas de fogo do dragão.
   Sem novos downloads nem dependências externas. */
const W=480,H=270;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const rand=(n)=>{const x=Math.sin(n*91.73+16.1)*43758.5453;return x-Math.floor(x);};
export function createCoinSlide(ctx,{drawHero,onWin,onLose}={}){
 let elapsed=0,spawnAt=40,index=0,done=false,invulnerable=0,hearts=4,shake=0,heroY=128;
 const shots=[];
 const total=1260; // aproximadamente 21 segundos a 60fps
 const bx=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
 function projectile(x,y,r=12,phase=0){
  const flicker=Math.floor(phase/7)%2;
  bx(x-r-8,y-4,9,9,'#fca241');
  bx(x-r-15,y-2,9,5,'#fb5b36');
  bx(x-r,y-r,r*2,r*2,'#b63240');
  bx(x-r+3,y-r-4,r*2-6,r*2+3,flicker?'#fd873e':'#e9532e');
  bx(x-r+5,y-r+2,r*2-10,r*2-5,'#ffcb60');
  bx(x-r+8,y-r+6,r*2-15,r*2-13,'#fff8b0');
 }
 function drawBackground(){
  const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#19406e');grd.addColorStop(.48,'#3989a4');grd.addColorStop(1,'#ddb45f');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  // Cliffs receding behind the sliding coin avalanche.
  const shift=elapsed*.58;
  for(let i=0;i<9;i++){
   const x=((i*93-shift*.48)%(W+130)+(W+130))%(W+130)-100;
   const height=70+(i%3)*23;
   bx(x,151-height,48,height+109,'#345e76');
   bx(x+8,147-height,28,12,'#6c9bac');
   bx(x+39,145-height,11,height+101,'#254763');
  }
  bx(0,218,W,52,'#61435b');
  bx(0,229,W,41,'#3b314f');
  // Coins form a long, steep shimmering ramp, scrolling independently.
  ctx.save();ctx.beginPath();
  ctx.moveTo(0,184);ctx.lineTo(145,169);ctx.lineTo(280,195);ctx.lineTo(480,219);ctx.lineTo(480,270);ctx.lineTo(0,270);ctx.closePath();ctx.clip();
  bx(0,172,W,98,'#a7674d');
  for(let i=0;i<175;i++){
   const xx=((i*47-shift*1.7)%(W+70)+(W+70))%(W+70)-25;
   const yy=183+(i*19)%93;
   const colors=['#ffca51','#ecac46','#f9e483','#b87a48','#ffda73'];
   bx(xx,yy,14,7,colors[i%colors.length]);
   bx(xx+2,yy+1,8,2,'#fff1aa');
   bx(xx+9,yy+5,4,2,'#9b663e');
  }
  ctx.restore();
  // Continuous golden slope and little dust particles under the rider.
  for(let i=0;i<14;i++){
   const xx=((i*67-elapsed*3)%(W+70)+(W+70))%(W+70)-25;
   const yy=155+(i*13)%70;
   bx(xx,yy,5,3,i%2?'#fff4ae':'#e9c36c');
  }
  bx(0,239,W,3,'#e7a84f');
 }
 function drawOverlay(){
  bx(8,8,464,43,'#112943e9');
  bx(12,12,456,35,'#193b52');
  ctx.textAlign='left';ctx.font='bold 12px monospace';ctx.fillStyle='#ffe5a2';
  ctx.fillText('DESCIDA DE OURO',22,27);
  ctx.font='10px monospace';ctx.fillStyle='#c7f8f5';
  ctx.fillText('↑ ↓ DESVIE DO FOGO  •  DESLIZE AUTOMÁTICO',22,41);
  // Progress and hearts.
  bx(12,54,456,10,'#132c42');bx(15,57,450*(elapsed/total),4,'#ffe27d');
  ctx.fillStyle='#ff9a9e';ctx.font='bold 13px monospace';
  ctx.fillText('♥ '.repeat(hearts).trim(),14,82);
  ctx.textAlign='right';ctx.fillStyle='#f0f9e2';ctx.fillText(Math.min(100,Math.floor(elapsed/total*100))+'%',466,82);ctx.textAlign='left';
 }
 function drawHeroAndParticles(){
  const wobble=Math.sin(elapsed*.3)*2;
  for(let i=0;i<5;i++){
   bx(95-i*20+(elapsed*3)%21,heroY+28+i%3*4,6-i%3,3,i%2?'#e1b757':'#fff7a1');
  }
  bx(101,heroY+31,67,7,'#442e49');
  bx(102,heroY+29,62,6,'#d0a459');
  bx(108,heroY+27,48,3,'#fff3a4');
  const blink=invulnerable>0&&Math.floor(invulnerable/6)%2===0;
  if(!blink){if(drawHero)drawHero(119,heroY+wobble-8);
   else {bx(125,heroY+2,26,27,'#3e80b1');bx(128,heroY-8,20,16,'#f6c69a');}}
 }
 function draw(){
  if(done)return;
  ctx.save();
  if(shake>0)ctx.translate(Math.floor(Math.sin(elapsed*2)*shake),0);
  drawBackground();
  drawHeroAndParticles();
  for(const shot of shots)projectile(shot.x,shot.y,shot.r,elapsed);
  drawOverlay();
  ctx.restore();
 }
 function update(dt,up,down){
  if(done)return;
  dt=clamp(dt,.2,2);
  elapsed=Math.min(total,elapsed+dt);
  invulnerable=Math.max(0,invulnerable-dt);
  shake=Math.max(0,shake-.22*dt);
  heroY=clamp(heroY+((down?1:0)-(up?1:0))*3.5*dt,74,194);
  if(elapsed>=spawnAt){
   const range=139,position=71+rand(index*17)*range;
   shots.push({x:510,y:position,r:10+(index%3===0?2:0),speed:2.7+Math.min(1.5,elapsed/total*1.5)+(index%4)*.18});
   index++;spawnAt=elapsed+Math.max(56,85-elapsed/total*18)+rand(index*11)*12;
  }
  for(let i=shots.length-1;i>=0;i--){
   const s=shots[i];s.x-=s.speed*dt;
   if(s.x< -40){shots.splice(i,1);continue;}
   if(invulnerable<=0 && Math.abs(s.x-143)<17+s.r && Math.abs(s.y-(heroY+9))<13+s.r){
    hearts--;invulnerable=85;shake=4;
    shots.splice(i,1);
    if(hearts<=0){done=true;onLose?.();return;}
   }
  }
  if(elapsed>=total){done=true;onWin?.();}
 }
 return {update,draw,get state(){return {elapsed,hearts,heroY,shots:shots.length,finished:done}},durationFrames:total};
}

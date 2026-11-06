// BrigaLoka — character design and stage drawn with original, animated vector art.
// Procedural; no externally hosted sprites. Coordinates are in local fighter space.
const TAU = Math.PI*2;
function path(ctx,points,fill,stroke='#172033',lw=3){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 points.slice(1).forEach(([x,y])=>ctx.lineTo(x,y));
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.stroke();}
}
function oval(ctx,x,y,w,h,fill,stroke='#172033',lw=2){
 ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,TAU);ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
}
function line(ctx,p1,p2,width,fill,outline='#121d30'){
 ctx.lineCap='round';ctx.strokeStyle=outline;ctx.lineWidth=width+5;
 ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke();
 ctx.strokeStyle=fill;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke();
}
function grad(ctx,a,b,c,d){const g=ctx.createLinearGradient(0,a,0,b);g.addColorStop(0,c);g.addColorStop(1,d);return g;}
function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function arc(ctx,x,y,r,start,end,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();}
function star(ctx,x,y,r,color){
 const v=[];for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,q=i%2?r*.43:r;v.push([x+Math.cos(a)*q,y+Math.sin(a)*q]);}
 path(ctx,v,color,null);
}
export const FIGHTER_PALETTES={
 liner:{skin:'#f8f1e8',hair:'#24232c',coat:'#475566',trouser:'#313c50',accent:'#f3284e',outline:'#1b2535'},
 gemaplys:{skin:'#eac19f',hair:'#30252e',coat:'#394975',trouser:'#30344a',accent:'#ffb144',outline:'#182039'},
 link:{skin:'#e7c99e',hair:'#ddbd6b',coat:'#3e8052',trouser:'#a48a58',accent:'#d8c369',outline:'#273b31'},
 tanjiro:{skin:'#e4c7b0',hair:'#4a2832',coat:'#3f7165',trouser:'#273d43',accent:'#85dbd5',outline:'#203237'},
 gojo:{skin:'#ecd4c9',hair:'#f7f4ed',coat:'#202a43',trouser:'#20283d',accent:'#b39ef5',outline:'#171a33'}
};
export function drawFighterArt(ctx, fighter,now,opts={}){
 if(!fighter?.data)return;
 const p=FIGHTER_PALETTES[fighter.data.id]||FIGHTER_PALETTES.liner;
 const floor=opts.floor??458,scale=opts.scale??1.22;
 const active=fighter.attackUntil>now;
 const attack=fighter.attackType||'punch',special=active&&attack==='special';
 const punch=active&&(attack==='punch'||special),kick=active&&attack==='kick';
 const t=Math.sin(now/170+fighter.x/40);
 const facing=fighter.face||1;
 const isGuard=fighter.block;
 ctx.save();ctx.translate(fighter.x,floor-(fighter.y||0));ctx.scale(facing*scale,scale);
 ctx.translate(0,opts.preview?0:Math.sin(now/350+fighter.x/37)*2);
 if(fighter.hitUntil>now){ctx.globalAlpha=.76;ctx.translate(-5+Math.sin(now/23)*3,0);}
 // Ground contact shadow.
 ctx.save();ctx.globalAlpha*=.22;oval(ctx,0,0,49,9,'#040a15',null);ctx.restore();
 if(special){
  const g=ctx.createRadialGradient(0,-102,10,0,-102,143);
  g.addColorStop(0,p.accent+'9c');g.addColorStop(.55,p.accent+'27');g.addColorStop(1,p.accent+'00');
  oval(ctx,0,-99,142,142,g,null);
  for(let n=0;n<3;n++)arc(ctx,0,-100,75+n*12,now/320+n,now/320+n+1.8,p.accent,2);
 }
 // Pants and boots; bent knees, movement stride.
 const legSwing=opts.preview?0:t*4;
 const hindFoot=kick?-4:-22+legSwing,frontFoot=kick?99:27-legSwing;
 line(ctx,[-13,-66],[-15,-31],22,p.trouser,p.outline);
 line(ctx,[-15,-31],[hindFoot,-10],20,p.trouser,p.outline);
 line(ctx,[15,-67],[21,-34],23,p.trouser,p.outline);
 line(ctx,[21,-34],[frontFoot,kick?-74:-11],20,p.trouser,p.outline);
 path(ctx,[[-39,-15],[-12,-18],[-8,-5],[-37,-3]],'#252b39',p.outline,3);
 path(ctx,[[frontFoot-18,kick?-80:-16],[frontFoot+12,kick?-81:-19],[frontFoot+21,kick?-67:0],[frontFoot-15,kick?-64:0]],p.id==='link'?'#665b43':'#222b40',p.outline,3);
 // Torso with shoulder pads and cel-shading.
 path(ctx,[[-31,-133],[27,-133],[35,-81],[24,-62],[-31,-63],[-38,-87]],grad(ctx,-134,-60,p.coat,p.trouser),p.outline,5);
 path(ctx,[[-29,-126],[-5,-132],[-4,-69],[-25,-77]],'#ffffff18',null);
 // Outfit individuality.
 if(fighter.data.id==='liner'){
  path(ctx,[[-8,-129],[9,-129],[4,-106],[-2,-100]],'#e6e9ed',null);
  path(ctx,[[-3,-128],[5,-128],[11,-114],[1,-81],[-12,-113]],p.accent,'#8b213c',2);
  path(ctx,[[-8,-133],[0,-119],[-13,-112]],'#1d2634',null);
 }else if(fighter.data.id==='gemaplys'){
  path(ctx,[[-24,-117],[24,-117],[12,-73],[-12,-73]],'#293a60',null);
  rect(ctx,-24,-102,47,7,'#f3b14b');
  path(ctx,[[-7,-124],[8,-124],[2,-89]],'#f1f4ff',null);
 }else if(fighter.data.id==='link'){
  path(ctx,[[-26,-120],[25,-120],[21,-68],[-28,-68]],'#42875b',null);
  line(ctx,[-25,-89],[27,-104],8,'#a78349','#66502f');
  rect(ctx,-25,-78,50,10,'#c7a35a');
  rect(ctx,-2,-83,13,18,'#b6bac0');
 }else if(fighter.data.id==='tanjiro'){
  const blocks=[[-29,-123],[3,-123],[-29,-92],[3,-92]];
  for(const [x,y] of blocks)rect(ctx,x,y,27,28,(x+y)%2?'#122d35':'#387e74');
  for(let x=-29;x<27;x+=29)for(let y=-124;y<-72;y+=28)rect(ctx,x,y,27,25,(Math.floor(x/29)+Math.floor(y/28))%2?'#113239':'#38796c');
  rect(ctx,-26,-79,54,6,'#e6e6d9');
 }else if(fighter.data.id==='gojo'){
  path(ctx,[[-29,-133],[30,-133],[23,-67],[-26,-67]],'#242f4d',null);
  path(ctx,[[-9,-133],[10,-139],[12,-88],[-9,-88]],'#4b5b76',null);
  rect(ctx,-20,-123,40,11,'#28314e');
 }
 // Rear arm, sleeve and hand.
 const backHand=[-46+(isGuard?24:Math.sin(now/340)*3),isGuard?-124:-79];
 line(ctx,[-25,-119],[-42,-100],22,p.coat,p.outline);
 line(ctx,[-42,-100],backHand,19,p.coat,p.outline);
 oval(ctx,backHand[0],backHand[1],11,11,fighter.data.id==='link'?'#d6bc7d':p.skin,p.outline,3);
 // Front arm with strike pose.
 const fist=punch?[90+(special?30:0),-116]:isGuard?[36,-141]:[41,-90];
 const elbow=punch?[42,-122]:isGuard?[46,-112]:[44,-108];
 line(ctx,[23,-123],elbow,25,p.coat,p.outline);
 line(ctx,elbow,fist,20,p.coat,p.outline);
 oval(ctx,fist[0],fist[1],13,12,p.skin,p.outline,3);
 rect(ctx,fist[0]-8,fist[1]-2,12,3,'#ffffff44');
 // Sword scabbard or weapon silhouette.
 if(fighter.data.id==='tanjiro'||fighter.data.id==='link'){
  const bladeP=punch?[[90,-131],[148,-167]]:[[51,-72],[90,-106]];
  line(ctx,bladeP[0],bladeP[1],6,'#d9f4fd','#567485');
  line(ctx,[bladeP[0][0]-6,bladeP[0][1]-4],[bladeP[0][0]+8,bladeP[0][1]+5],5,'#8b6946','#36414a');
  if(special){
    for(let i=0;i<4;i++)arc(ctx,70,-107,50+i*16,-1.3+i*.12,.7+i*.14,p.accent,i%2?4:2);
  }
 }else if(fighter.data.id==='gojo'&&special){
  oval(ctx,110,-118,27,27,'#b387fa','#e8d3ff',4);oval(ctx,110,-118,15,15,'#83d3f2',null);
 }else if(fighter.data.id==='liner'&&special){
  for(let i=0;i<6;i++)star(ctx,80+i*14,-117+(i%2)*24,9,p.accent);
 }
 // Head, neck, hair, face features.
 rect(ctx,-12,-143,24,21,p.skin);
 oval(ctx,0,-172,36,41,p.skin,p.outline,4);
 ctx.fillStyle='#ffffff22';ctx.beginPath();ctx.ellipse(-17,-182,10,14,-.3,0,TAU);ctx.fill();
 if(fighter.data.id==='liner'){
  path(ctx,[[-41,-175],[-45,-199],[-38,-217],[-26,-215],[-31,-235],[-13,-224],[9,-231],[34,-223],[51,-239],[44,-215],[57,-196],[43,-186],[37,-172],[14,-193],[-6,-191],[-23,-176]],p.hair,p.outline,4);
  oval(ctx,-14,-170,10,14,'#fffaf5','#1f2938',3);
  oval(ctx,15,-170,10,14,'#fffaf5','#1f2938',3);
  oval(ctx,-13,-169,3.5,6,'#303546',null);oval(ctx,15,-169,3.5,6,'#303546',null);
  rect(ctx,1,-146,11,2,'#675b61');
 }else if(fighter.data.id==='gojo'){
  path(ctx,[[-37,-192],[-39,-220],[-28,-213],[-17,-241],[-8,-225],[6,-243],[14,-220],[30,-237],[29,-209],[43,-214],[33,-185]],p.hair,p.outline,3);
  rect(ctx,-31,-181,63,15,'#20263b');rect(ctx,-26,-180,48,4,'#575f78');
  rect(ctx,-9,-146,18,2,'#735962');
 }else if(fighter.data.id==='link'){
  path(ctx,[[-37,-191],[-44,-215],[-15,-227],[19,-228],[37,-211],[20,-191],[-13,-198]],'#47855a','#293b37',3);
  path(ctx,[[-4,-230],[36,-233],[50,-217],[20,-210]],'#39724a','#233a36',2);
  path(ctx,[[-39,-171],[-52,-180],[-37,-154]],p.skin,p.outline,2);
  path(ctx,[[36,-173],[50,-182],[40,-155]],p.skin,p.outline,2);
  path(ctx,[[-30,-183],[-10,-198],[22,-189],[31,-178],[14,-190],[-17,-176]],p.hair,p.outline,3);
  oval(ctx,-13,-169,4,5,'#2f3e3b',null);oval(ctx,14,-169,4,5,'#2f3e3b',null);
 }else if(fighter.data.id==='tanjiro'){
  path(ctx,[[-39,-184],[-48,-206],[-30,-211],[-27,-226],[-12,-219],[5,-234],[16,-220],[32,-230],[35,-208],[45,-200],[30,-175],[9,-189],[-15,-177]],p.hair,p.outline,4);
  oval(ctx,-11,-167,4,6,'#4e3137',null);oval(ctx,15,-167,4,6,'#4e3137',null);
  path(ctx,[[-9,-204],[-1,-207],[5,-200],[-6,-195]],'#ba615b',null);
  rect(ctx,-40,-162,4,21,'#f0e8e5');rect(ctx,38,-160,4,18,'#f0e8e5');
 }else{
  path(ctx,[[-43,-183],[-42,-203],[-26,-209],[-22,-224],[-6,-211],[11,-228],[23,-210],[42,-205],[33,-181],[12,-192],[-13,-181]],p.hair,p.outline,4);
  oval(ctx,-13,-167,5,7,'#2a2530',null);oval(ctx,16,-167,5,7,'#2a2530',null);
 }
 if(fighter.data.id!=='gojo'&&fighter.data.id!=='liner'){
  ctx.lineWidth=2;ctx.strokeStyle='#503f42';ctx.beginPath();ctx.moveTo(-21,-157);ctx.lineTo(-6,-158);ctx.moveTo(8,-158);ctx.lineTo(22,-160);ctx.stroke();
 }
 ctx.strokeStyle='#6c5156';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-146);ctx.quadraticCurveTo(1,-141,11,-146);ctx.stroke();
 if(stagger){ctx.save();ctx.globalAlpha=.6;rect(ctx,-37,-213,78,218,'#fff8dd');ctx.restore();}
 ctx.restore();
}
export function drawStage(ctx,now,W=960,H=540,floor=458){
 const sky=ctx.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#171f3e');sky.addColorStop(.5,'#794d7b');sky.addColorStop(1,'#e6a57b');
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // Sun, clouds, parallax mountains.
 const moon=ctx.createRadialGradient(760,96,9,760,96,146);
 moon.addColorStop(0,'#fff3c9bb');moon.addColorStop(.45,'#ffcaa466');moon.addColorStop(1,'#ffdeaa00');
 oval(ctx,760,96,153,153,moon,null);oval(ctx,760,96,47,47,'#ffedce',null);
 path(ctx,[[0,300],[125,212],[235,286],[344,169],[464,301],[585,184],[705,287],[860,193],[W,309],[W,450],[0,450]],'#3c385d',null);
 path(ctx,[[0,345],[98,276],[224,364],[344,262],[500,350],[690,242],[824,367],[960,290],[960,458],[0,458]],'#36344d',null);
 // Stylized temple pavilion and lanterns.
 const building=ctx.createLinearGradient(0,244,0,460);building.addColorStop(0,'#39435e');building.addColorStop(1,'#1a243c');
 rect(ctx,350,255,278,199,building);
 for(let i=0;i<5;i++){rect(ctx,367+i*54,289,24,164,'#26374b');rect(ctx,372+i*54,304,14,128,'#506279');}
 path(ctx,[[313,262],[367,216],[601,216],[665,262]],'#a56c70','#543e57',4);
 path(ctx,[[328,245],[622,245],[652,262],[309,262]],'#cc8179','#51394a',3);
 for(const side of [145,814]){
  rect(ctx,side-14,264,27,195,'#744b55');
  rect(ctx,side-47,261,94,17,'#c57674');
  path(ctx,[[side-57,255],[side+57,255],[side+31,233],[side-32,233]],'#ad616d',null);
  rect(ctx,side-37,264,11,195,'#462e42');
 }
 // Stone lion / torii silhouettes at the sides.
 for(const x of [65,900]){rect(ctx,x-33,361,67,15,'#89919b');path(ctx,[[x-22,361],[x-19,318],[x+20,318],[x+23,361]],'#8793a0',null);}
 // Cherry-blossom canopy.
 for(let i=0;i<34;i++){
  const x=(i*107+33)%1020-20,y=13+((i*47)%124);
  const r=28+((i*13)%36);
  oval(ctx,x,y,r,r*.54,i%4===0?'#b26689':'#d68da6',null);
  oval(ctx,x+10,y-13,r*.6,r*.46,i%3===0?'#f0b4bd':'#b7789a',null);
 }
 // Foreground perspective stone courtyard and subtle patterns.
 const ground=ctx.createLinearGradient(0,floor,0,H);
 ground.addColorStop(0,'#596275');ground.addColorStop(1,'#202f47');
 rect(ctx,0,floor,W,H-floor,ground);
 rect(ctx,0,floor-11,W,13,'#8596a3');
 for(let i=0;i<15;i++){
  const x=i*82-50;
  ctx.lineWidth=1;ctx.strokeStyle='#d9d6cf33';ctx.beginPath();ctx.moveTo(x,floor);ctx.lineTo(x+(x-480)*.25,H);ctx.stroke();
 }
 for(let j=0;j<4;j++){const y=floor+Math.pow(j+1,1.7)*9;rect(ctx,0,y,W,2,'#afc4d12c');}
 // Petals drift, seeded by index (no random flicker).
 for(let i=0;i<52;i++){
  const drift=(now*.018*(.5+(i%4)*.22)+i*103)%1040;
  const x=(i*141+Math.sin(now/1200+i)*30)%1000-18;
  const y=(i*78+drift)%560-10;
  const radius=1.8+(i%3);
  ctx.save();ctx.translate(x,y);ctx.rotate((now*.0005+i)*.7);
  oval(ctx,0,0,radius*1.7,radius*.7,i%3===0?'#fae2d9':'#f4b4c7',null);
  ctx.restore();
 }
}
export function drawHitSparks(ctx,x,y,time,accent='#fbe17a'){
 const r=Math.max(1,(time%280)/280);
 ctx.save();ctx.translate(x,y);ctx.globalAlpha=1-r;ctx.lineCap='round';
 for(let i=0;i<12;i++){
  const a=i*TAU/12,from=8+r*17,to=18+r*46;
  line(ctx,[Math.cos(a)*from,Math.sin(a)*from],[Math.cos(a)*to,Math.sin(a)*to],i%3?3:6,i%2?accent:'#ffffff',null);
 }
 star(ctx,0,0,16+24*r,'#ffffffaa');
 ctx.restore();
}

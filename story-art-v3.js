// Pintura procedural original em Canvas, detalhe interno 960x540, sem imagens ou redes externas.
import {WIDTH as W,HEIGHT as H,FLOOR} from './story-chapter-v3.js';
import {swordBox} from './story-combat-v3.js?v=wall-sword-fix';
const PI=Math.PI, TAU=PI*2;
const pal={
 skin:'#efc59f',skinShadow:'#c9916f',line:'#242744',hair:'#352c44',hairLight:'#765065',
 coat:'#33527a',coatDark:'#233c67',coatLight:'#548bc0',gold:'#ffda83',red:'#d05e72',
 pants:'#33374c',boots:'#28344b',cream:'#fff0d1',steel:'#b9eaf2'
};
const px=(v)=>Math.round(v);
const noise=n=>{const x=Math.sin(n*128.87+9.23)*43758.5453;return x-Math.floor(x);};
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(px(x),px(y),Math.ceil(w),Math.ceil(h));}
function poly(c,p,color){c.fillStyle=color;c.beginPath();c.moveTo(px(p[0][0]),px(p[0][1]));for(let i=1;i<p.length;i++)c.lineTo(px(p[i][0]),px(p[i][1]));c.closePath();c.fill();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(px(x),px(y),Math.max(1,rx),Math.max(1,ry),0,0,TAU);c.fill();}
function line(c,a,b,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
function gradient(c,top,bottom){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,W,H);}
function cloud(c,x,y,scale=1){
 c.save();c.translate(px(x),px(y));c.scale(scale,scale);
 ellipse(c,8,34,58,25,'#7ecfe3');ellipse(c,67,26,68,33,'#7ecfe3');ellipse(c,132,34,45,25,'#7ecfe3');
 rect(c,-27,27,184,31,'#bdf6fd');ellipse(c,22,20,47,34,'#ddfcff');ellipse(c,74,3,57,40,'#f7ffff');
 ellipse(c,131,21,37,33,'#f3ffff');rect(c,-20,35,190,22,'#e7ffff');
 rect(c,6,54,158,4,'#65c6df');rect(c,35,27,44,4,'#ffffff');
 c.restore();
}
function mountain(c,x,y,w,h,color,cap){
 poly(c,[[x-w/2,H],[x,y-h],[x+w/2,H]],color);
 if(cap)poly(c,[[x-w*.18,y-h*.57],[x,y-h],[x+w*.19,y-h*.56],[x+w*.03,y-h*.64],[x-w*.04,y-h*.56]],cap);
}
function sky(c,biome,t,camera){
 const themes={
  meadow:['#09a5e6','#a0edfb'],forest:['#1296c6','#a4e8d8'],
  village:['#3c92cb','#f4d0a6'],mountain:['#377fc3','#d9e8ff'],castle:['#283759','#8b617a']
 };
 gradient(c,...themes[biome]);
 if(biome==='castle')return;
 const sunx=730-camera*.025, suny=91;
 const halo=c.createRadialGradient(sunx,suny,12,sunx,suny,210);
 halo.addColorStop(0,'#fff9d1a5');halo.addColorStop(.5,'#fffaca33');halo.addColorStop(1,'#ffffff00');
 c.fillStyle=halo;c.fillRect(0,0,W,H);
 ellipse(c,sunx,suny,47,47,'#fffae4');ellipse(c,sunx-9,suny-10,26,24,'#fffff6');
 c.save();c.globalAlpha=.12;c.translate(sunx,suny);c.rotate(.30);
 for(let i=-3;i<=3;i++)poly(c,[[i*86,-10],[i*86+45,-10],[i*230+170,550],[i*230-55,550]],'#fff6a6');
 c.restore();
 for(let i=-1;i<8;i++){
  const cx=i*420+noise(i+4)*165-(camera*.14)%420;
  cloud(c,cx,45+noise(i+7)*86,.7+noise(i+9)*.75);
 }
 for(let layer=0;layer<3;layer++){
  const col=(biome==='mountain'?['#92b6ce','#669fbd','#47859f']:biome==='forest'?['#7fc8b9','#529a96','#327d80']:['#8ccbd8','#63b9c7','#4e9aaa'])[layer];
  const speed=[.18,.34,.48][layer];
  for(let i=-2;i<16;i++){
   const x=i*220-(camera*speed%220),h=(78+noise(i+layer*8)*100)*(1+layer*.13);
   mountain(c,x+105,387+layer*29,290,h,col,layer===0?'#d8e6e9':null);
  }
 }
}
function tree(c,x,y,scale,seed,biome){
 c.save();c.translate(px(x),px(y));c.scale(scale,scale);
 rect(c,-9,-116,20,116,'#62473d');rect(c,0,-110,7,105,'#967055');
 line(c,[4,-84],[-36,-120],'#77503f',11);line(c,[1,-58],[38,-96],'#77503f',9);
 const cc=biome==='mountain'?['#317a78','#359b91','#6ac2a8']:biome==='forest'?['#185f66','#268677','#4fb2a2']:['#278a70','#34b68a','#66d8a1'];
 for(let i=0;i<13;i++){
  const a=i*2.3,r=26+noise(seed+i)*42;
  const xx=Math.cos(a)*r,yy=-140+Math.sin(a)*25;
  ellipse(c,xx,yy,25+noise(i+seed+2)*15,25+noise(i+seed+9)*17,cc[i%3]);
 }
 for(let i=0;i<24;i++){
  const xx=(noise(seed+i*3)-.5)*115, yy=-175+noise(seed+i*7)*68;
  rect(c,xx,yy,3+noise(i+seed)*6,4,cc[2]);
 }
 c.restore();
}
function drawParallaxTrees(c,biome,t,camera){
 if(biome==='castle')return;
 const shift=camera*.58;
 for(let i=-2;i<15;i++){
  const x=i*165+noise(i+35)*50-shift%165;
  tree(c,x,444,1.05+noise(i+22)*.45,i+77,biome);
 }
}
function dirt(c,x,y,width,seed,biome){
 const rx=px(x),ry=px(y),ww=px(width);if(rx>W+90||rx+ww< -90)return;
 const stone=biome==='mountain',royal=biome==='castle'||biome==='village';
 const base=stone?'#52617c':royal?'#776478':'#5b3d53',shadow=stone?'#36435c':royal?'#514759':'#3f2a43';
 rect(c,rx,ry,ww,H-ry+10,base);
 for(let i=0;i<ww;i+=28)for(let j=17;j<H-ry;j+=27){
  const v=noise(seed+i*5+j*8);
  if(v>.31)rect(c,rx+i+(v*8|0),ry+j,9+(v*8|0),6,v>.72?'#b78368':shadow);
  if(v>.84)rect(c,rx+i+3,ry+j+9,5,4,'#dcb487');
 }
 rect(c,rx,ry,ww,12,stone?'#a1afb8':royal?'#d8c5bd':'#3d965e');
 rect(c,rx,ry,ww,5,stone?'#e2e4dc':royal?'#f4e1c6':'#9df177');
 if(!royal&&!stone){
  for(let i=0;i<ww;i+=13){
   const n=noise(seed*7+i*3);
   if(n>.45)rect(c,rx+i,ry-4-n*6,4,7,'#48a65b');
   if(n>.94){rect(c,rx+i,ry-12,3,9,'#4b9b60');rect(c,rx+i-3,ry-16,10,5,'#ffe278');}
  }
 }
 rect(c,rx,ry+12,ww,5,stone?'#435a6b':royal?'#aa8d94':'#9e6550');
}
function decoratedPlatform(c,x,y,w,seed,biome){
 dirt(c,x,y,w,seed,biome);
 for(let i=0;i<w;i+=16){
  const n=noise(seed+i*17);
  if(n>.78)rect(c,x+i,y-8,4,9,biome==='mountain'?'#d2f9ff':'#c6ff7b');
 }
}
function ruins(c,x,y){
 rect(c,x-30,y-96,74,94,'#929ba5');rect(c,x-33,y-107,80,15,'#c2bec0');
 rect(c,x-37,y-13,85,14,'#77758a');rect(c,x-5,y-74,15,76,'#596979');
 rect(c,x+30,y-88,11,62,'#d5c7b1');rect(c,x-22,y-52,13,42,'#e1d5c3');
 for(let i=0;i<10;i++)rect(c,x-31+i*7,y-100+(i%3)*3,6,3,'#5c7182');
}
function building(c,x,y,k=0){
 const w=160+(k%2)*40,h=130+(k%3)*15;
 rect(c,x-w/2,y-h,w,h,'#ddc9b9');
 rect(c,x-w/2+9,y-h+12,w-18,h-20,'#e9ddc6');
 for(let ix=0;ix<w;ix+=19)for(let j=0;j<h;j+=22)rect(c,x-w/2+ix,y-h+j,16,2,'#c5ad9d');
 poly(c,[[x-w/2-16,y-h+4],[x,y-h-71],[x+w/2+16,y-h+4]],'#755a78');
 poly(c,[[x-w/2,y-h-1],[x,y-h-59],[x+w/2,y-h-1]],'#a16476');
 for(let i=-1;i<=1;i+=2){
  const wx=x+i*42;rect(c,wx-15,y-h+38,30,42,'#7a91aa');rect(c,wx-10,y-h+44,20,32,'#8fdcf1');
  rect(c,wx-2,y-h+42,4,40,'#ece3bf');rect(c,wx-14,y-h+60,28,4,'#ece3bf');
 }
 rect(c,x-22,y-73,43,73,'#755268');rect(c,x+9,y-39,4,5,'#ffdb93');
}
function statue(c,x,y){
 rect(c,x-45,y-17,90,17,'#e6d7c5');rect(c,x-31,y-49,62,34,'#a3bac3');
 rect(c,x-23,y-90,46,41,'#e9e4d7');rect(c,x-16,y-128,32,41,'#b6c3d0');
 ellipse(c,x,y-144,21,25,'#e8e3d5');
 poly(c,[[x-23,y-165],[x-17,y-184],[x+23,y-180],[x+25,y-159]],'#b8c9d2');
 line(c,[x+23,y-108],[x+47,y-160],'#d6dde0',10);rect(c,x+39,y-164,16,5,'#fff2ce');
}
function fountain(c,x,y){
 ellipse(c,x,y-15,100,20,'#b0c0ce');rect(c,x-92,y-38,184,25,'#b4cad3');
 ellipse(c,x,y-36,91,19,'#689eba');ellipse(c,x,y-37,76,12,'#76e1f3');
 rect(c,x-21,y-83,42,51,'#d9dad2');ellipse(c,x,y-84,31,10,'#bdd4d6');
 rect(c,x-4,y-140,8,56,'#ace8f1');ellipse(c,x,y-142,15,16,'#eafaff');
 for(let i=0;i<8;i++)ellipse(c,x+Math.cos(i*.8)*58,y-52+Math.sin(i*.8)*5,2,5,'#eaffff');
}
function gate(c,x,y){
 for(let t of [-170,170]){
  rect(c,x+t-53,y-304,106,304,'#8d91ae');
  rect(c,x+t-45,y-314,90,17,'#ced0ce');
  for(let i=0;i<4;i++)rect(c,x+t-47+i*26,y-330,21,24,'#c2c3cf');
  rect(c,x+t-18,y-258,36,81,'#3a4568');rect(c,x+t-13,y-254,26,68,'#95c7dc');
 }
 rect(c,x-123,y-201,246,201,'#a2a2b8');
 rect(c,x-107,y-235,214,39,'#c6c7c5');
 for(let i=0;i<7;i++)rect(c,x-106+i*33,y-245,26,22,'#ddd2c2');
 ellipse(c,x,y-1,72,127,'#293049');rect(c,x-73,y-109,146,109,'#4b3e56');
 rect(c,x-10,y-105,6,105,'#b48a66');rect(c,x+9,y-64,8,8,'#f9d58d');
 for(let q of [-1,1]){rect(c,x+q*91,y-168,24,87,'#b9425b');poly(c,[[x+q*91,y-81],[x+q*115,y-81],[x+q*103,y-62]],'#b9425b');}
}
function castleRoom(c,camera,t){
 gradient(c,'#282f51','#77536d');
 for(let i=0;i<30;i++){
  const x=i*104-(camera*.19)%104;
  rect(c,x,0,100,H,'#5f4c69');
  for(let j=0;j<16;j++)rect(c,x+(j%2)*26,j*41,97,3,'#81718c');
 }
 for(let i=-1;i<11;i++){
  const x=i*185-(camera*.42)%185;
  rect(c,x+15,65,41,390,'#a196a9');rect(c,x+10,53,53,19,'#d1b8b1');
  rect(c,x+7,428,61,17,'#4e415d');rect(c,x+32,85,6,320,'#c3b3b4');
  if(i%2){rect(c,x+100,94,55,145,'#382e5c');rect(c,x+106,101,43,130,'#997eb0');
   poly(c,[[x+103,231],[x+152,231],[x+129,253]],'#ba3f65');}
 }
 rect(c,0,FLOOR,W,H-FLOOR,'#61506b');
 for(let i=0;i<W;i+=50)for(let j=0;j<3;j++)rect(c,i+(j%2)*22,FLOOR+j*36,46,3,'#9f8390');
 rect(c,0,FLOOR+8,W,15,'#af7b7e');rect(c,0,FLOOR+18,W,3,'#e3b58d');
 for(let i=0;i<5;i++){const x=140+i*180-(camera*.3)%180;
  line(c,[x,0],[x,55],'#58445f',4);
  ellipse(c,x,57,23,8,'#5c4d66');for(let k=-1;k<=1;k++)ellipse(c,x+k*13,70,8,13,'#ffe09a');}
}
function castleLandmark(c,mark,x,y,t){
 if(mark==='chest'){
  rect(c,x-40,y-49,82,47,'#6c4255');rect(c,x-48,y-65,95,19,'#e7af64');
  rect(c,x-34,y-61,70,42,'#b56e5f');rect(c,x-6,y-42,15,23,'#ffd87d');
  rect(c,x-38,y-54,5,27,'#f3c77b');rect(c,x+33,y-54,5,27,'#f3c77b');
  // Poção dentro do baú, com frasco, gargalo, rolha e líquido.
  rect(c,x-13,y-88,26,27,'#d5e7fa');rect(c,x-9,y-78,18,16,'#ab63ce');
  rect(c,x-6,y-98,12,12,'#e5f4ff');rect(c,x-8,y-102,16,6,'#a96d42');
 } else if(mark==='cage'){
  rect(c,x-74,y-150,148,151,'#413953');rect(c,x-72,y-153,144,12,'#d4b3aa');
  // A princesa fica visivelmente atrás das barras da gaiola.
  for(let i=0;i<12;i++)rect(c,x-67+i*12,y-142,5,136,'#d8c4b9');
  rect(c,x-72,y-7,147,10,'#d5b7ae');
  for(let i=0;i<8;i++)ellipse(c,x-62+i*17,y-3+Math.sin(t*.009+i)*4,8,14,'#ef8f51');
 } else if(mark==='wedding'){
  rect(c,x-84,y-177,167,176,'#69516e');rect(c,x-73,y-189,144,23,'#b79c95');
  for(let i=0;i<6;i++)rect(c,x-69+i*25,y-184,11,13,'#f4ddbc');
  rect(c,x-69,y-96,137,92,'#702f58');rect(c,x-60,y-94,119,90,'#d8a2ae');
  rect(c,x-69,y-9,137,13,'#9e7c74');
 } else if(mark==='mist'){
  for(let i=0;i<10;i++){const ox=Math.sin(t*.002+i*2.5)*43,yy=-60-i*12;
   ellipse(c,x+ox, y+yy,45,13,'#b7b2d477');}
 } else if(mark==='dungeon'){
  rect(c,x-45,y-150,88,150,'#3b364c');for(let i=0;i<9;i++)rect(c,x-43+i*11,y-144,5,139,'#b0a3a7');
 }
}
function drawLandmarks(c,zone,camera,t,flags){
 for(const [wx,name] of zone.landmarks){
  const x=wx-camera;if(x< -390||x>W+390)continue;
  if(name==='cabin'){building(c,x,FLOOR,1);rect(c,x-65,FLOOR-115,11,12,'#f8edb6');}
  if(name==='sign'){rect(c,x-6,FLOOR-70,12,70,'#80604b');rect(c,x-61,FLOOR-74,122,38,'#d9b57e');rect(c,x-55,FLOOR-66,110,5,'#f1d9a9');}
  if(name==='ruin')ruins(c,x,FLOOR);
  if(name==='bridge'){rect(c,x-115,FLOOR-42,220,13,'#b98d6a');for(let i=-1;i<6;i++)rect(c,x-115+i*45,FLOOR-59,8,55,'#705069');}
  if(name==='statue')statue(c,x,FLOOR);
  if(name==='fountain')fountain(c,x,FLOOR);
  if(name==='gate')gate(c,x,FLOOR);
  if(name==='fish'&&!flags.fishWon)drawFish(c,x,FLOOR-75,t,flags.fishHP??8);
  if(name==='dragon')drawDragon(c,x,FLOOR,t);
  if(name==='mist'&&!flags.exploded)continue;
  if(['chest','wedding','dungeon','mist','cage'].includes(name))castleLandmark(c,name,x,FLOOR,t);
 }
}
function drawDragon(c,x,y,t){
 // Dragão dormindo à sombra da árvore. Pilha de moedas de chocolate.
 tree(c,x+82,y,1.85,100,'forest');
 for(let i=0;i<220;i++){
  const ox=(noise(i*31)-.5)*410, dy=noise(i*11)*85;
  const yy=y-16-dy+Math.abs(ox)*.20;
  if(yy>y)continue;
  rect(c,x+ox,yy,11,7,i%5?'#ffd76b':'#b57745');
  if(i%4===0)rect(c,x+ox+3,yy,7,2,'#fff3aa');
 }
 ellipse(c,x+5,y-83,158,65,'#295b70');
 ellipse(c,x+22,y-109,127,61,'#3c8993');
 poly(c,[[x-110,y-126],[x-64,y-255],[x+17,y-153]],'#32747e');
 poly(c,[[x-51,y-149],[x-18,y-274],[x+73,y-151]],'#53a6a7');
 ellipse(c,x+124,y-129,63,46,'#50a09a');
 poly(c,[[x+91,y-158],[x+101,y-206],[x+121,y-168],[x+132,y-209],[x+149,y-166]],'#f4d285');
 ellipse(c,x+165,y-117,40,24,'#3b888d');
 ellipse(c,x+146,y-142,11,12,'#fff7d3');ellipse(c,x+149,y-143,4,7,'#2c3349');
 rect(c,x+187,y-112,18,6,'#e5f3dd');
 for(let i=0;i<4;i++)poly(c,[[x-92+i*49,y-149],[x-80+i*49,y-185],[x-68+i*49,y-150]],'#98d1ba');
}
export function drawFish(c,x,y,t,hp){
 c.save();c.translate(px(x),px(y+Math.sin(t*.004)*8));
 poly(c,[[-74,0],[-124,-51],[-116,47]],'#2b7488');
 ellipse(c,-1,0,91,56,'#2f8e9e');ellipse(c,6,9,82,41,'#5abac0');
 poly(c,[[-31,-36],[-7,-82],[32,-39]],'#5cb6b3');
 ellipse(c,61,-18,19,19,'#ffefc6');ellipse(c,69,-17,8,12,'#223452');
 poly(c,[[48,20],[94,28],[46,43]],'#203b50');
 for(let i=0;i<6;i++)poly(c,[[38+i*8,29],[43+i*8,43],[47+i*8,29]],'#f3e5c9');
 for(let i=0;i<6;i++)ellipse(c,-67+i*21,-10+Math.sin(i*3)*15,4,3,'#8fe2df');
 if(hp>0){rect(c,-75,-94,150,12,'#263a57');rect(c,-72,-91,144*Math.max(0,hp)/8,6,'#e56d8e');}
 c.restore();
}
function human(c,x,y,t,kind='hero',face=1,state='idle',flash=false){
 const bob=state==='walk'?Math.sin(t*.015)*3:Math.sin(t*.004)*1.5;
 c.save();c.translate(px(x),px(y+bob));if(face<0)c.scale(-1,1);
 const isBard=kind==='bard',isGuard=kind==='guard',isPrincess=kind==='princess',isVillain=kind==='malacord',isShade=kind==='shade';
 if(flash){c.globalAlpha=.52;}
 const hair=isShade?'#b5d9ef':isVillain?'#391f50':isPrincess?'#d8a257':isBard?'#916038':pal.hair;
 const coat=isShade?'#8cb1c9':isVillain?'#793b69':isPrincess?'#ffcad6':isBard?'#6b578e':isGuard?'#b6bdcb':pal.coat;
 // Sombra e botas
 ellipse(c,23,68,24,5,'#1f315044');
 rect(c,8,52,14,17,pal.boots);rect(c,27,52,14,17,pal.boots);
 if(state==='walk'||state==='attack'){rect(c,5,61,18,8,'#202f46');rect(c,30,61,17,8,'#202f46');}
 rect(c,9,36,31,23,isShade?'#537e9b':pal.pants);
 // Capa separada com dobra e luz
 poly(c,[[8,24],[36,21],[45,57],[38,63],[27,48],[12,61],[-1,57]],isShade?'#739db8':isVillain?'#521c55':isBard?'#51346d':'#29365d');
 rect(c,9,25,32,32,coat);rect(c,13,29,8,25,isShade?'#c6e2ed':'#56769a');
 rect(c,35,29,6,23,isShade?'#a4c7df':'#243e6d');
 rect(c,9,47,32,6,isPrincess?'#d78fa5':'#c5a164');
 rect(c,21,40,6,6,'#fff3c6');
 // Manga e luvas de pixels pequenos
 rect(c,0,30,10,25,coat);rect(c,41,29,11,26,coat);
 rect(c,1,51,10,12,pal.skinShadow);rect(c,43,51,9,12,pal.skin);
 if(isPrincess){poly(c,[[8,52],[42,52],[53,69],[-2,69]],'#f5afc4');rect(c,10,55,31,12,'#ffe0e5');}
 // Cabeça e cabelo/sombreado
 rect(c,12,1,28,28,isShade?'#b6d9e4':pal.skinShadow);
 rect(c,15,4,24,23,isShade?'#bed9e5':pal.skin);rect(c,11,3,32,8,hair);
 rect(c,8,9,9,19,hair);rect(c,37,9,9,15,hair);
 rect(c,12,-3,27,11,hair);rect(c,20,-8,16,8,hair);rect(c,7,1,9,8,hair);
 rect(c,15,17,5,4,'#272e43');rect(c,32,17,5,4,'#272e43');
 rect(c,23,24,7,2,'#bd806a');
 if(isBard){rect(c,5,-10,40,8,'#715483');rect(c,15,-20,24,12,'#936ea2');rect(c,37,-19,5,12,'#f3d18f');}
 if(isGuard){rect(c,9,-6,36,16,'#becad4');rect(c,6,5,40,8,'#536b89');}
 if(isVillain){rect(c,10,-15,35,15,'#4e235a');rect(c,8,-12,8,13,'#dda76b');rect(c,38,-12,8,13,'#dda76b');}
 if(isPrincess){rect(c,11,-6,34,9,'#f5cc77');rect(c,19,-11,22,8,'#ffe5a2');}
 if(isShade){c.globalAlpha=.75;for(let i=0;i<5;i++)ellipse(c,-8+i*17,38+Math.sin(t*.007+i)*7,10,6,'#dceaff77');}
 c.restore();
}
export function drawCharacter(c,x,y,t,kind,face=1,state='idle',flash=false){human(c,x,y,t,kind,face,state,flash);}
function enemy(c,m,camera,t){
 const x=m.x-camera,y=m.y;
 c.save();
 // A arte base olha para a direita. Espelhar também os olhos e a arma.
 if(m.dir<0){c.translate(2*x+m.w,0);c.scale(-1,1);}
 if(m.kind==='slime'){
  ellipse(c,x+23,y+40,28,22,'#256c72');
  ellipse(c,x+23,y+30,29,28,'#4ec4a3');ellipse(c,x+18,y+17,18,11,'#78e9c1');
  rect(c,x+12,y+28,5,9,'#29445c');rect(c,x+31,y+28,5,9,'#29445c');
  rect(c,x+20,y+41,9,3,'#287783');
 }else{
  ellipse(c,x+23,y+68,26,5,'#1c304446');
  rect(c,x+8,y+39,32,26,'#375c61');rect(c,x+11,y+54,11,14,'#474055');rect(c,x+27,y+54,11,14,'#474055');
  ellipse(c,x+23,y+24,22,23,'#608d55');ellipse(c,x+22,y+20,17,19,'#8ab065');
  poly(c,[[6+x,18+y],[x-6,y+11],[x+6,y+30]],'#8ab065');
  poly(c,[[x+39,y+18],[x+52,y+11],[x+42,y+33]],'#8ab065');
  rect(c,x+12,y+20,7,8,'#fff8cf');rect(c,x+30,y+20,7,8,'#fff8cf');rect(c,x+16,y+23,4,4,'#3a4057');rect(c,x+33,y+23,4,4,'#3a4057');
  rect(c,x+4,y+39,39,11,'#86516a');rect(c,x+39,y+28,6,36,'#866c57');rect(c,x+43,y+21,13,6,'#b6d9dd');
 }
 if(m.hp<m.maxHp){rect(c,x-3,y-12,52,8,'#21354d');rect(c,x,y-9,46*m.hp/m.maxHp,3,'#fd7990');}
 c.restore();
}
export function drawWorld(c,zone,camera,t,hero,mobs,flags,fx=[]){
 const biome=zone.biome;c.save();
 if(biome==='castle')castleRoom(c,camera,t);
 else{sky(c,biome,t,camera);drawParallaxTrees(c,biome,t,camera);}
 for(const g of zone.ground)dirt(c,g[0]-camera,FLOOR,g[1]-g[0],g[0],biome);
 for(const p of zone.platforms)decoratedPlatform(c,p[0]-camera,p[1],p[2],p[0],biome);
 if(biome==='village'){
  for(let i=0;i<11;i++){const x=i*215+80-camera;if(x> -240&&x<W+240)building(c,x,FLOOR,i);}
 }
 if(biome==='mountain')for(let i=0;i<9;i++){
  const x=i*380+210-camera;
  if(x> -100&&x<W+80){poly(c,[[x-20,FLOOR],[x+9,FLOOR-55],[x+35,FLOOR]],'#779aa8');rect(c,x+5,FLOOR-58,14,14,'#d2dfe4');}
 }
 drawLandmarks(c,zone,camera,t,flags);
 if(zone.id==='vila'){drawCharacter(c,1810-camera,FLOOR-71,t,'guard');drawCharacter(c,1885-camera,FLOOR-71,t,'guard',-1);if(flags.guards&&flags.bard)drawCharacter(c,flags.bard.x-camera,flags.bard.y,t,'bard',flags.bard.face,flags.bard.walking?'walk':'idle');}
 if(zone.id==='montanha'&&flags.bard)drawCharacter(c,flags.bard.x-camera,flags.bard.y,t,'bard',flags.bard.face,flags.bard.walking?'walk':'idle');
 if(zone.id==='castelo'){
  if(!flags.exploded)drawCharacter(c,480-camera,FLOOR-71,t,'malacord');
  if(flags.exploded&&!flags.cloneWon)drawCharacter(c,2760-camera,FLOOR-71,t,'shade',-1);
  if(flags.rescue&&!flags.win){
   const cageX=3490-camera;
   // A princesa está desacordada dentro da gaiola, não em pé à frente das barras.
   c.save();c.translate(cageX+28,FLOOR-20);c.rotate(-Math.PI/2);
   human(c,0,0,t,'princess');c.restore();
   rect(c,cageX-74,FLOOR-154,148,9,'#d4b3aa');
   line(c,[cageX-61,FLOOR-154],[cageX-100,FLOOR-222],'#b7a6af',5);
   line(c,[cageX+61,FLOOR-154],[cageX+100,FLOOR-222],'#b7a6af',5);
   line(c,[cageX+15,FLOOR-43],[cageX+56,FLOOR-60],'#c7d5d9',4);
   ellipse(c,cageX+61,FLOOR-63,8,8,'#ffe19b');
   for(let i=0;i<12;i++)rect(c,cageX-68+i*12,FLOOR-145,5,142,'#d8c4b9');
   for(let i=0;i<6;i++)ellipse(c,cageX-62+i*23,FLOOR-3+Math.sin(t*.009+i)*4,7,13,'#ef8f51');
  }
  if(flags.bard&&flags.princess)drawCharacter(c,flags.bard.x-camera,flags.bard.y,t,'bard',flags.bard.face,flags.bard.walking?'walk':'idle');
 }
 for(const m of mobs)if(m.hp>0&&m.x-camera>-90&&m.x-camera<W+90)enemy(c,m,camera,t);
 for(const f of fx)if(f.life>0){
  c.save();c.globalAlpha=Math.min(.95,f.life/f.max);
  if(f.kind==='spark')ellipse(c,f.x-camera,f.y,3+f.life*4,3+f.life*4,f.color||'#fff4b8');
  else if(f.kind==='dust')ellipse(c,f.x-camera,f.y,7*f.life,4*f.life,'#e9e8df');
  c.restore();
 }
 human(c,hero.x-camera,hero.y,t,'hero',hero.face,hero.swing>0?'attack':!hero.ground?'jump':Math.abs(hero.vx)>30?'walk':'idle');
 if(hero.swing>0){
  const hb=swordBox(hero,76),face=hero.face;
  c.save();
  const sx=hero.x-camera+(face>0?49:0), sy=hero.y+23;
  c.translate(sx,sy);if(face<0)c.scale(-1,1);
  // Espada curta e proporcional ao herói (aprox. 70 px), com alcance real correspondente.
  c.rotate(-.48+Math.sin(Math.min(1,hero.swing/.3)*Math.PI)*.65);
  const broken=!!flags.exploded;
  if(broken){
   poly(c,[[0,12],[10,6],[18,-2],[24,-3],[26,4],[15,21]],'#81bed6');
   poly(c,[[10,7],[18,-2],[23,0],[16,15]],'#d3f4ff');
  }else{
   poly(c,[[0,12],[10,6],[44,-8],[56,-8],[55,-3],[15,21]],'#61cddd');
   poly(c,[[10,7],[43,-8],[53,-6],[16,15]],'#eefeff');
   ellipse(c,50,-6,4,3,'#fcffff');
  }
  line(c,[2,5],[15,24],'#bb7b48',7);line(c,[7,9],[12,15],'#ffdf88',5);
  if(flags.potion&&!broken)for(let i=0;i<5;i++)ellipse(c,22+i*9,-10+Math.sin(t*.01+i)*6,3,6,'#ff9160');
  c.restore();
 }
 // Partículas leves de natureza e primeiro plano, sem esconder o personagem.
 if(biome!=='castle')for(let i=0;i<28;i++){
  const xx=(noise(i*5)*W+Math.sin(t*.001+i)*24+W)%W, yy=(noise(i*12)*H+t*.013*(i%3+1))%H;
  rect(c,xx,yy,2+(i%3),2,i%4?'#fff6d344':'#dbffff8a');
 }
 const vignette=c.createLinearGradient(0,0,0,H);
 vignette.addColorStop(0,'#111b321f');vignette.addColorStop(.3,'#00000000');vignette.addColorStop(1,'#111b321b');
 c.fillStyle=vignette;c.fillRect(0,0,W,H);
 c.restore();
}
export function drawSlide(c,t,progress,jumpY,fire=[],duck=0){
 sky(c,'mountain',t,progress*2000);for(let i=0;i<9;i++)mountain(c,i*180-progress*600,520,340,190,'#6198b4','#e1e9ee');
 poly(c,[[0,490],[0,430],[300,365],[500,310],[960,425],[960,540]],'#a97049');
 for(let i=0;i<110;i++){
  const x=noise(i*21)*W,y=420-noise(i*7)*85+Math.sin(x*.01)*16;
  rect(c,x,y,10,6,i%4?'#ffdc75':'#f8bd62');
 }
 // Personagem escorrega rente às moedas; pulo e agachamento têm alturas distintas.
 if(duck>0&&jumpY>=0){
  c.save();c.translate(180,397);c.scale(1,.53);
  drawCharacter(c,0,-72,t,'hero',1,'idle');c.restore();
 }else drawCharacter(c,180,326+jumpY,t,'hero',1,jumpY<0?'jump':'walk');
 for(const a of fire){
  const y=a.kind==='low'?382:335;
  ellipse(c,a.x,y,22,22,'#e96650');ellipse(c,a.x-6,y-3,13,13,'#ffdb77');
 }
 rect(c,20,20,240,24,'#243853');rect(c,24,24,230*progress,16,'#ffd57a');
}


// Cenas visuais do Capítulo 1. Os personagens atuam em cena; a caixa de diálogo é só legenda.
export function drawStoryCutscene(c,scene,index,t){
 c.save();
 const castle=!['arrival','dragon','fish','fishSong','fishWin','intro'].includes(scene);
 if(castle)castleRoom(c,0,t);else{
  sky(c,scene==='dragon'?'mountain':'meadow',t,0);
  for(let i=0;i<8;i++)tree(c,i*175,FLOOR,1.2,i+41,'forest');
  dirt(c,0,FLOOR,W,1,'meadow');
 }
 function label(text){rect(c,17,15,270,33,'#12243acb');c.textAlign='left';c.font='bold 15px sans-serif';c.fillStyle='#f8d69d';c.fillText(text,30,37);}
 function person(x,kind,face=1,state='idle',y=FLOOR-72){human(c,x,y,t,kind,face,state);}
 function cage(x=590,withPrincess=true){
  rect(c,x-87,FLOOR-177,173,175,'#352d47');
  if(withPrincess)person(x-22,'princess',-1);
  rect(c,x-88,FLOOR-178,175,10,'#d5bbab');
  for(let i=0;i<12;i++)rect(c,x-81+i*14,FLOOR-167,6,160,'#e0c7ae');
  rect(c,x-86,FLOOR-7,172,12,'#c39ca3');
  // Correntes e trava ligadas ao braço da princesa.
  line(c,[x-4,FLOOR-80],[x+73,FLOOR-70],'#d6d8e1',5);
  ellipse(c,x+72,FLOOR-70,8,9,'#f3cd80');
  for(let i=0;i<2;i++)line(c,[x+64+i*14,FLOOR-167],[x+64+i*14,FLOOR-211],'#b9b9cc',5);
  line(c,[x-60,FLOOR-178],[x-80,FLOOR-224],'#bd9181',6);
 }
 function sword(x,y,broken=false){
  line(c,[x,y],[x+(broken?48:86),y-51],'#8ce2ef',broken?10:14);
  line(c,[x+17,y-11],[x+32,y+8],'#e0ad61',9);
  ellipse(c,x+(broken?47:86),y-49,7,7,'#edfbff');
 }
 if(scene==='intro'){label('A CARTA DO BARDO');building(c,340,FLOOR,1);person(610,'hero',-1);rect(c,686,286,76,52,'#e4cdab');rect(c,693,295,62,7,'#bd9a80');}
 else if(scene==='arrival'){label('OS PORTÕES DO CASTELO');fountain(c,180,FLOOR);statue(c,350,FLOOR);gate(c,760,FLOOR);person(510,'hero');person(610,'bard',-1);person(820,'guard',-1);}
 else if(scene==='fish'||scene==='fishSong'||scene==='fishWin'){
  label(scene==='fishSong'?'CANÇÃO DO BARDO':scene==='fishWin'?'A CHAVE RECUPERADA':'O PEIXE DA MONTANHA');
  person(250,'hero');person(380,'bard');drawFish(c,625,FLOOR-74,t,scene==='fishWin'?0:7);
  if(scene==='fishSong')for(let i=0;i<5;i++){c.fillStyle='#ffdc8f';c.font='bold 27px sans-serif';c.fillText('♪',445+i*20,FLOOR-185-Math.sin(t*.002+i)*15);}
  if(scene==='fishWin'){rect(c,620,FLOOR-60,16,25,'#f7d77c');ellipse(c,632,FLOOR-59,12,10,'#f7d77c');}
 }
 else if(scene==='dragon'){
  label(index<2?'O DRAGÃO DA MONTANHA':'MOEDAS DE CHOCOLATE');
  drawDragon(c,610,FLOOR,t);person(190,'hero');person(280,'bard');
  if(index>=2){
   rect(c,495,FLOOR-46,118,37,'#8d4c5d');
   rect(c,500,FLOOR-42,108,26,'#efbd74');
   rect(c,501,FLOOR-36,22,20,'#874b37');
   rect(c,532,FLOOR-36,22,20,'#874b37');
   rect(c,563,FLOOR-36,22,20,'#874b37');
  }
 }
 else if(scene==='castle'){
  label('A CERIMÔNIA DE MALACORD');
  castleLandmark(c,'wedding',560,FLOOR,t);
  person(290,'hero');person(395,'bard');
  person(640,'malacord',-1);
 }
 else if(scene==='potion'){
  label('O BAÚ E A POÇÃO');
  castleLandmark(c,'chest',570,FLOOR,t);
  person(320,'hero');
  // Mapa do casamento saindo do baú.
  rect(c,542,FLOOR-115,95,62,'#f1e1ba');
  line(c,[548,FLOOR-103],[624,FLOOR-103],'#b88e7f',3);
  line(c,[550,FLOOR-89],[604,FLOOR-70],'#bd9a83',3);
  if(index>0){sword(382,FLOOR-66);for(let i=0;i<9;i++)ellipse(c,423+i*9,FLOOR-95-Math.sin(t*.003+i)*8,5,8,'#ed8155');}
 }
 else if(scene==='princess'){
  label('POV DO BARDO · CALABOUÇO');
  rect(c,0,160,W,270,'#36334a8a');
  for(let i=0;i<9;i++)rect(c,i*110,170,3,258,'#62566e');
  person(index===0?155:295,'bard');
  cage(615,true);
  if(index===1){rect(c,300,FLOOR-132,88,24,'#9e4c64');rect(c,310,FLOOR-124,65,8,'#ffdc83');}
 }
 else if(scene==='explosion'){
  label(index===0?'A ESPADA PISCA':index===1?'A EXPLOSÃO':'A CÓPIA NA NÉVOA');
  if(index===0){person(415,'hero');sword(471,FLOOR-81);for(let i=0;i<6;i++)ellipse(c,480+i*10,FLOOR-162+(i%2)*10,6,11,'#ffba80');person(245,'bard');person(170,'princess');}
  else if(index===1){
   ellipse(c,495,270,180,150,'#e6bb97');ellipse(c,495,270,116,100,'#f5ebc6');
   for(let i=0;i<15;i++)ellipse(c,315+i*25,200+Math.sin(i*8)*56,28,17,'#b9a6c4');
   c.save();c.translate(350,FLOOR-40);c.rotate(Math.PI*.46);human(c,0,0,t,'hero');c.restore();
  }else{
   for(let i=0;i<15;i++)ellipse(c,245+i*39,288+Math.sin(t*.001+i)*20,75,35,'#b9b4d38c');
   c.save();c.translate(350,FLOOR-36);c.rotate(Math.PI*.47);human(c,0,0,t,'hero');c.restore();
   person(652,'shade',-1);
   person(155,'bard');cage(810,true);
  }
 }
 else if(scene==='cloneWin'){
  label(index===0?'A NÉVOA SE DESFAZ':index===1?'O GOLPE DO ALAÚDE':'A PRINCESA EM PERIGO');
  if(index===0){person(340,'hero');for(let i=0;i<11;i++)ellipse(c,620+Math.sin(i*7)*85,200+i*17,25,14,'#c4cbe2');}
  else if(index===1){person(360,'bard');person(620,'malacord',-1);rect(c,390,FLOOR-85,87,30,'#d8a15d');rect(c,413,FLOOR-79,8,35,'#8c5f49');}
  else{person(350,'hero');cage(635,true);}
 }
 else if(scene==='finale'){
  const headings=['UMA SAÍDA','AS CORDAS SE ROMPEM','MALACORD NA PRISÃO','UM NOVO NOME','FIM DO CAPÍTULO'];
  label(headings[Math.min(index,headings.length-1)]);
  if(index<=1){
   person(300,'hero');cage(615,true);
   if(index===1){sword(390,FLOOR-132,true);for(let i=0;i<12;i++)ellipse(c,615+(i-6)*14,FLOOR-80,4,3,'#f9dc9e');}
  }else{
   person(250,'hero');person(330,'bard');person(415,'princess');
   if(index===2||index===3){rect(c,625,FLOOR-158,150,160,'#393147');person(680,'malacord');for(let i=0;i<11;i++)rect(c,625+i*13,FLOOR-160,5,160,'#c9c0c8');}
   else{rect(c,600,175,150,82,'#ffdc98');c.font='bold 26px sans-serif';c.fillStyle='#293958';c.fillText('FIM',652,220);}
  }
 }
 c.restore();
}

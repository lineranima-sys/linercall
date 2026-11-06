// SHOOT'E R! — arenas de homenagem com arquitetura própria, sem recursos oficiais.
const DESIGNS=[
 {id:'chaves',name:'Vila do Chaves',subtitle:'Pátio, escadaria, portas e casas abertas',sky:['#73bdd5','#cde9e3'],floor:['#ceaf86','#a6795e'],wall:[195,143,93],roof:'#af5a4b',spawn:[15,13],outside:'Pátio da vila',style:'vila'},
 {id:'tanjiro',name:'Casa do Tanjiro',subtitle:'Casa na montanha, quartos e trilha ao redor',sky:['#7199bd','#d4d9c9'],floor:['#879775','#5c6655'],wall:[115,95,76],roof:'#415c64',spawn:[15,13],outside:'Bosque da montanha',style:'casa'},
 {id:'folha',name:'Vila da Folha',subtitle:'Ruas, portões, vielas e lojas acessíveis',sky:['#6daaca','#d7dfbd'],floor:['#b9ad85','#907b60'],wall:[176,129,91],roof:'#a45c47',spawn:[15,13],outside:'Centro da vila',style:'folha'},
 {id:'undefined',name:'Undefined',subtitle:'Mapa clássico de treino, em versão aberta',sky:['#172b42','#60758a'],floor:['#37465c','#172332'],wall:[80,103,132],roof:'#283547',spawn:[15,13],outside:'Zona indefinida',style:'undefined'}
];
export const SHOOTER_MAPS=Object.freeze(DESIGNS.map(v=>Object.freeze({...v})));
const W=32,H=27;
function rect(g,x,y,w,h,value='1'){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(i>=0&&i<W&&j>=0&&j<H)g[j][i]=value;}
function house(g,x,y,w,h,door='south'){
 rect(g,x,y,w,1);rect(g,x,y+h-1,w,1);rect(g,x,y,1,h);rect(g,x+w-1,y,1,h);
 const cx=x+Math.floor(w/2),cy=y+Math.floor(h/2);
 if(door==='south')g[y+h-1][cx]='0';
 if(door==='north')g[y][cx]='0';
 if(door==='east')g[cy][x+w-1]='0';
 if(door==='west')g[cy][x]='0';
 // Escada baixa acessível dentro da casa, em degraus.
 const sx=x+2,sy=y+2;
 for(let i=0;i<Math.min(w-3,4);i++)g[sy][sx+i]=String(Math.min(5,i+2));
}
function create(id){
 const theme=SHOOTER_MAPS.find(m=>m.id===id)||SHOOTER_MAPS[3];
 const g=Array.from({length:H},()=>Array(W).fill('0'));
 // O limite é invisível: colisão sem parede renderizada.
 for(let x=0;x<W;x++)g[0][x]=g[H-1][x]='X';
 for(let y=0;y<H;y++)g[y][0]=g[y][W-1]='X';
 const props=[];
 if(id==='chaves'){
  house(g,3,3,9,8,'south');house(g,19,3,10,8,'south');
  house(g,4,18,9,7,'north');house(g,19,18,10,7,'north');
  // Escada do pátio, larga e atravessável.
  for(let y=11;y<16;y++)for(let x=4;x<9;x++)g[y][x]=String(Math.min(5,2+Math.floor((y-11)/2)));
  props.push({x:15,y:8,type:'barrel'},{x:16,y:8,type:'barrel'},{x:10,y:14,type:'plant'},
   {x:23,y:15,type:'plant'},{x:7,y:8,type:'table'},{x:24,y:8,type:'table'});
 }else if(id==='tanjiro'){
  house(g,8,3,16,10,'south');house(g,21,17,8,8,'west');
  for(let x=10;x<15;x++)for(let y=15;y<19;y++)g[y][x]=String(Math.min(5,2+Math.floor((x-10)/2)));
  props.push({x:12,y:7,type:'table'},{x:18,y:7,type:'table'},{x:5,y:7,type:'tree'},
   {x:27,y:7,type:'tree'},{x:5,y:20,type:'tree'},{x:28,y:14,type:'tree'},
   {x:17,y:21,type:'tree'},{x:24,y:22,type:'table'});
 }else if(id==='folha'){
  house(g,3,3,9,7,'east');house(g,18,3,11,8,'west');
  house(g,3,18,10,7,'east');house(g,19,17,10,8,'west');
  for(let y=10;y<16;y++)for(let x=14;x<17;x++)g[y][x]=String(Math.min(5,2+Math.floor((y-10)/2)));
  props.push({x:14,y:5,type:'tree'},{x:15,y:22,type:'tree'},{x:7,y:7,type:'table'},
   {x:24,y:7,type:'table'},{x:26,y:19,type:'barrel'});
 }else{
  house(g,3,3,9,7,'south');house(g,20,4,9,8,'west');house(g,4,18,10,7,'east');
  house(g,20,18,9,7,'north');
  for(let x=12;x<20;x++)g[5][x]=x===15?'0':'1';
  props.push({x:15,y:9,type:'barrel'},{x:23,y:14,type:'barrel'},{x:8,y:21,type:'table'});
 }
 // Zona central sempre navegável: spawn amplo e pátio para combate.
 for(let y=12;y<=15;y++)for(let x=12;x<=19;x++)g[y][x]='0';
 return { ...theme,width:W,height:H,tiles:g.map(row=>row.join('')),props };
}
export function loadShooterMap(id){return create(id);}
export function shooterCell(map,x,y){
 const tx=Math.floor(x),ty=Math.floor(y);
 if(tx<0||ty<0||tx>=map.width||ty>=map.height)return 'X';
 return map.tiles[ty]?.[tx]||'X';
}
export function shooterElevation(map,x,y){
 const tile=shooterCell(map,x,y);
 return /[2-5]/.test(tile)?(Number(tile)-1)*0.18:0;
}
export function shooterBlocked(map,x,y){
 const tile=shooterCell(map,x,y);
 return tile==='X'||tile==='1';
}

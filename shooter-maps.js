// Quatro arenas originais desenhadas em código, com referências temáticas às localidades
// pedidas pelos jogadores. Sem texturas ou imagens de séries de terceiros.
const MAPS=[
 {
  id:'tanjiro',name:'Casa do Tanjiro',subtitle:'Montanha nevada · casa de madeira',
  description:'Quintal de inverno, casa rústica, corredores de madeira e bosque na montanha.',
  colors:{sky:['#101c32','#5f7da6'],floor:['#abbace','#3b5468'],wall:['#664235','#b47c51','#d3af77'],accent:'#d6eaff',fog:'#e6f0ff'},
  decor:'❄',spawn:[[2.5,13.5,0],[15.5,3.5,Math.PI]],
  layout:[
 '111111111111111111',
 '100000000000000001',
 '100002222220000001',
 '100002000020000001',
 '100002000020000001',
 '100002000020000001',
 '100002222220000001',
 '100000000000000001',
 '100000000000000001',
 '100000000000000001',
 '100000000000000001',
 '100000002222220001',
 '100000002000020001',
 '100000002000020001',
 '100000002222220001',
 '100000000000000001',
 '111111111111111111'
  ],
  props:[{x:3.3,y:8.4,type:'pine'},{x:14.5,y:9.2,type:'pine'},{x:2.9,y:3.5,type:'snow'},{x:14.9,y:13.1,type:'snow'}]
 },
 {
  id:'folha',name:'Vila da Folha',subtitle:'Ruelas ninja · telhados e lanternas',
  description:'Ruas alaranjadas, telhados vermelhos, lanternas e portões de treinamento.',
  colors:{sky:['#649bc2','#bce6e8'],floor:['#b18e65','#715a4b'],wall:['#a67351','#d7b08a','#b84a46'],accent:'#ffb55c',fog:'#e1c6a4'},
  decor:'🍃',spawn:[[2.5,2.5,.4],[15.5,14.5,Math.PI+.3]],
  layout:[
 '111111111111111111',
 '100000000000000001',
 '100022200000222001',
 '100020000000002001',
 '100020000000002001',
 '100022200000222001',
 '100000000000000001',
 '100000011000000001',
 '100000011000000001',
 '100000000000000001',
 '100000000000000001',
 '100022200000222001',
 '100020000000002001',
 '100020000000002001',
 '100022200000222001',
 '100000000000000001',
 '111111111111111111'
  ],
  props:[{x:8.9,y:3.2,type:'lantern'},{x:4.7,y:9,type:'tree'},{x:13.1,y:7,type:'lantern'},{x:10.4,y:13.2,type:'tree'}]
 },
 {
  id:'chaves',name:'Vila do Chaves',subtitle:'Pátio · paredes amarelas e barril',
  description:'Pátio de vila com corredor central, casas amarelas, bancos e o famoso barril.',
  colors:{sky:['#4b9cc5','#d5ecf1'],floor:['#b8986e','#78634d'],wall:['#d5ab69','#f0cc8c','#b96d4c'],accent:'#ffde89',fog:'#f8da9f'},
  decor:'🛢️',spawn:[[3,8,0],[15,8,Math.PI]],
  layout:[
 '111111111111111111',
 '100000000000000001',
 '102222000000222201',
 '102002000000200201',
 '102002000000200201',
 '102222000000222201',
 '100000000000000001',
 '100000000000000001',
 '100000000000000001',
 '100000000000000001',
 '100000000000000001',
 '102222000000222201',
 '102002000000200201',
 '102002000000200201',
 '102222000000222201',
 '100000000000000001',
 '111111111111111111'
  ],
  props:[{x:8.5,y:8.6,type:'barrel'},{x:6.5,y:7.2,type:'bench'},{x:11.5,y:9.7,type:'bench'},{x:3.9,y:6.2,type:'flower'}]
 },
 {
  id:'undefined',name:'Undefined',subtitle:'Arena original · complexo futurista',
  description:'O cenário clássico do SHOOT’E R!: paredes de metal, corredores frios e drones.',
  colors:{sky:['#091727','#526e87'],floor:['#283745','#111923'],wall:['#465969','#6d8498','#708a9d'],accent:'#8ff5fe',fog:'#85b6d1'},
  decor:'?',spawn:[[9,8,-Math.PI/2],[8,9,Math.PI/2]],
  layout:[
 '111111111111111111',
 '100000000000000001',
 '101100000110000001',
 '100100000010000001',
 '100000000000000001',
 '100000110000000001',
 '100000110000000001',
 '100000000000000001',
 '100000000000000001',
 '100011000001100001',
 '100000000001000001',
 '100000000000000001',
 '100000000000000001',
 '100000110000110001',
 '100000000000000001',
 '100000000000000001',
 '111111111111111111'
  ],
  props:[{x:5.5,y:8,type:'terminal'},{x:13.5,y:8,type:'terminal'}]
 }
];
export const SHOOTER_MAPS=Object.freeze(MAPS.map(map=>Object.freeze({...map,grid:Object.freeze(map.layout),layout:undefined})));
export const SHOOTER_MAP_IDS=Object.freeze(SHOOTER_MAPS.map(x=>x.id));
export function getShooterMap(id){return SHOOTER_MAPS.find(m=>m.id===id)||SHOOTER_MAPS.find(m=>m.id==='undefined');}
export function isShooterOpen(map,x,y,r=.19){
 const grid=map.grid;
 const block=(a,b)=>grid[Math.floor(b)]?.[Math.floor(a)]!=='0';
 return Number.isFinite(x)&&Number.isFinite(y)&&!block(x-r,y-r)&&!block(x+r,y-r)&&!block(x-r,y+r)&&!block(x+r,y+r);
}

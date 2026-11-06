import {loadShooterMap,shooterElevation} from './shooter-maps.js';
// WebGL scene for SHOOT’E R!. Loaded on demand; the Canvas renderer remains fallback.
export async function createShooterWorld3D({canvas,mapId}){
 const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js');
 const map=loadShooterMap(mapId);
 const scene=new THREE.Scene();
 const themes={
  chaves:{sky:'#b2dee6',fog:'#b9d2ce',ground:'#b6a284',wall:['#c8a57f','#ad805e','#d6b48e'],roof:'#a65f55',trim:'#6b4a39'},
  folha:{sky:'#9fcbdb',fog:'#b9c3b2',ground:'#b9a78a',wall:['#9eb59b','#d1a781','#c59588'],roof:'#a65d4b',trim:'#655044'},
  tanjiro:{sky:'#a8c6d4',fog:'#b9c6ba',ground:'#778a78',wall:['#ad9274','#d4bca2','#a48a6f'],roof:'#455b64',trim:'#544438'},
  undefined:{sky:'#819eb7',fog:'#8092ab',ground:'#5c7184',wall:['#62768d','#71849b','#55667d'],roof:'#3b4a65',trim:'#2c3c52'}
 };
 const colors=themes[map.style]||themes.undefined;
 scene.background=new THREE.Color(colors.sky);
 scene.fog=new THREE.FogExp2(colors.fog,.018);
 const camera=new THREE.PerspectiveCamera(69,900/520,.05,120);camera.rotation.order='YXZ';
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});
 renderer.setSize(900,520,false);renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55;
 scene.add(new THREE.HemisphereLight(0xeaf7ff,0x53576b,2.8));
 const sun=new THREE.DirectionalLight(0xfff2dc,3.0);sun.position.set(-17,30,-21);scene.add(sun);
 const materials=new Set();
 const mat=(color,opts={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,...opts});materials.add(m);return m;};
 const wood=mat(colors.trim),roof=mat(colors.roof),glass=mat('#83c9e1',{metalness:.25,roughness:.22}),metal=mat('#536b7c',{metalness:.38}),green=mat('#487956'),leaf=mat('#6b9c72'),light=mat('#ffe7bb'),stone=mat('#9ea9ac'),wood2=mat('#9d7053'),accent=mat('#ca7d5b'),dark=mat('#213347'),screen=mat('#89ebff',{emissive:'#326b87',emissiveIntensity:.38});
 const wallMats=colors.wall.map(c=>mat(c));
 const meshes=[];
 const add=(geom,material,x,y,z,parent=scene)=>{
  const mesh=new THREE.Mesh(geom,material);mesh.position.set(x,y,z);parent.add(mesh);
  meshes.push(mesh);return mesh;
 };
 const box=(w,h,d,m,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cylinder=(r,height,m,x,y,z,top=r)=>add(new THREE.CylinderGeometry(top,r,height,10),m,x,y,z);
 const sphere=(r,m,x,y,z)=>add(new THREE.SphereGeometry(r,9,7),m,x,y,z);
 const canvasTexture=()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle=colors.ground;c.fillRect(0,0,256,256);
  const seed=i=>{const n=Math.sin(i*179.37+22.3)*54137.17;return n-Math.floor(n);};
  for(let i=0;i<2200;i++){
   c.fillStyle=i%3?'#e8f5ee1e':'#34404417';
   c.fillRect(seed(i*3)*256,seed(i*7+14)*256,1+i%3,1+i%3);
  }
  if(map.style!=='tanjiro'){
   c.strokeStyle='#433e3c2d';c.lineWidth=2;
   for(let x=0;x<257;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();}
   for(let y=0;y<257;y+=44){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}
  }
  const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
  tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(9,8);return tx;
 };
 const texture=canvasTexture();
 const floorMat=mat('#ffffff',{map:texture,roughness:1});
 box(map.width,.20,map.height,floorMat,map.width/2,-.15,map.height/2);
 const random=n=>{const v=Math.sin(n*131.7+4.37)*93717.87;return v-Math.floor(v);};
 // Mountains outside invisible barriers, receding into atmospheric fog.
 for(let i=0;i<32;i++){
  const a=i*Math.PI*2/32,r=27+random(i+30)*20,height=6+random(i+71)*20;
  add(new THREE.ConeGeometry(5+random(i)*8,height,5),mat(map.style==='tanjiro'?'#6e8677':'#82928d'),
    map.width/2+Math.cos(a)*r,height/2-1,map.height/2+Math.sin(a)*r);
 }
 const isOpen=(x,z)=>map.tiles[z]?.[x]==='0';
 function addWindow(x,z,dir){
  if(dir===0){
   const zpos=z+.49;box(.60,.73,.085,wood,x+.5,1.76,zpos);
   box(.47,.58,.11,glass,x+.5,1.76,zpos-.06);
   box(.055,.66,.14,wood,x+.5,1.76,zpos-.08);
  }else{
   const xpos=x+.49;box(.085,.73,.60,wood,xpos,1.76,z+.5);
   box(.11,.58,.47,glass,xpos-.06,1.76,z+.5);
   box(.14,.66,.055,wood,xpos-.08,1.76,z+.5);
  }
 }
 for(let z=1;z<map.height-1;z++)for(let x=1;x<map.width-1;x++){
  const tile=map.tiles[z][x];
  if(tile==='1'){
   const tone=wallMats[(x*17+z*11)%wallMats.length];
   box(1,3.15,1,tone,x+.5,1.575,z+.5);
   // Cladding, timber, window sills and horizontal roof trim.
   const openN=isOpen(x,z-1),openW=isOpen(x-1,z);
   if(openN||openW){
    box(1,.12,1,roof,x+.5,3.07,z+.5);
    if(openN){
     box(.09,3.12,.07,wood,x+.03,1.58,z);
     box(.98,.10,.07,wood2,x+.5,2.46,z+.02);
     if((x+z*3)%4===0)addWindow(x,z,0);
    }
    if(openW){
     box(.07,3.12,.09,wood,x,1.58,z+.03);
     box(.07,.10,.98,wood2,x+.02,2.46,z+.5);
     if((x*3+z)%5===0)addWindow(x,z,1);
    }
   }
  }else if(/[2-5]/.test(tile)){
   const height=shooterElevation(map,x+.5,z+.5);
   box(.98,Math.max(.06,height),.98,stone,x+.5,height/2,z+.5);
   box(.98,.07,.98,wood2,x+.5,height+.015,z+.5);
  }
 }
 const outlines={
  chaves:[[3,3,9,8],[19,3,10,8],[4,18,9,7],[19,18,10,7]],
  tanjiro:[[8,3,16,10],[21,17,8,8]],
  folha:[[3,3,9,7],[18,3,11,8],[3,18,10,7],[19,17,10,8]],
  undefined:[[3,3,9,7],[20,4,9,8],[4,18,10,7],[20,18,9,7]]
 };
 for(const [x,z,w,h] of outlines[map.style]||[]){
  // Physical overhead roofs: open doors remain walkable, rooms feel enclosed.
  box(w+.5,.23,h+.5,roof,x+w/2,3.45,z+h/2);
  box(w+.65,.11,h+.65,wood,x+w/2,3.26,z+h/2);
  for(let i=0;i<5;i++)box(.11,.13,h+.72,wood2,x+.5+i*w/5,3.58,z+h/2);
  const lamp=new THREE.PointLight(0xffd9ae,.7,8,2);lamp.position.set(x+w/2,2.65,z+h/2);scene.add(lamp);
 }
 function tree(x,z,scale=1){
  cylinder(.15*scale,2.1*scale,wood,x,1.06*scale,z);
  for(let k=0;k<4;k++){
   const a=k*Math.PI/2;
   sphere(.7*scale,k%2?leaf:green,x+Math.cos(a)*.38*scale,2.55*scale+(k%2)*.2*scale,z+Math.sin(a)*.4*scale);
  }
 }
 function barrel(x,z){
  cylinder(.39,.66,wood2,x,.34,z);
  cylinder(.40,.07,metal,x,.12,z);cylinder(.40,.07,metal,x,.66,z);
 }
 function table(x,z){
  box(1,.09,.78,wood2,x,.83,z);
  for(const dx of [-.38,.38])for(const dz of [-.29,.29])box(.10,.75,.1,wood,x+dx,.39,z+dz);
 }
 function plant(x,z){cylinder(.3,.34,accent,x,.18,z);sphere(.4,green,x,.68,z);}
 for(const p of map.props){
  if(p.type==='tree')tree(p.x,p.y);
  if(p.type==='barrel')barrel(p.x,p.y);
  if(p.type==='table')table(p.x,p.y);
  if(p.type==='plant')plant(p.x,p.y);
 }
 function streetlamp(x,z){
  cylinder(.07,3.6,dark,x,1.8,z);box(.53,.15,.53,wood,x,3.6,z);
  box(.4,.48,.4,light,x,3.34,z);
  const lamp=new THREE.PointLight(0xffd28b,1.1,8,2);lamp.position.set(x,3.35,z);scene.add(lamp);
 }
 if(map.style==='tanjiro'){
  for(let i=0;i<22;i++){
   const x=1+random(i*3+47)*29,z=1+random(i*5+29)*24;
   if(isOpen(Math.floor(x),Math.floor(z))&&Math.hypot(x-15,z-13)>5)tree(x,z,.5+random(i)*.55);
  }
 }else if(map.style==='folha'){
  streetlamp(10,14);streetlamp(23,14);
  // Round civic landmark visible beyond northern limit.
  cylinder(3.6,6.5,accent,15,3.25,-8,3.9);
  cylinder(4.1,.48,roof,15,6.7,-8);
  cylinder(3.3,.42,wood,15,7.25,-8);
  for(let i=0;i<12;i++)box(.50,.63,.12,glass,12+(i%6)*.95,4.5,-4.35-(i>5?.5:0));
 }else if(map.style==='chaves'){
  streetlamp(12,11);streetlamp(22,12);
  barrel(11,18);barrel(17,18);
  box(3,.13,.1,wood,15,2.9,20);
  for(let k=0;k<6;k++)box(.30,.55,.055,k%2?roof:light,13.8+k*.45,2.55,20);
 }else{streetlamp(12,10);streetlamp(24,17);}
 const robotModels=[],rivalModels=[];
 function model(enemy=false){
  const g=new THREE.Group();scene.add(g);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.53,.79,.34),enemy?metal:roof);torso.position.y=1.03;g.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.44,.40,.42),enemy?accent:light);head.position.y=1.67;g.add(head);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.35,.09,.045),screen);visor.position.set(0,1.72,.235);g.add(visor);
  for(const side of [-1,1]){
   const leg=new THREE.Mesh(new THREE.BoxGeometry(.20,.54,.24),dark);leg.position.set(side*.18,.38,0);g.add(leg);
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.16,.56,.22),wood);arm.position.set(side*.4,1.04,0);g.add(arm);
  }
  g.visible=false;return g;
 }
 for(let i=0;i<9;i++)robotModels.push(model(true));
 for(let i=0;i<2;i++)rivalModels.push(model(false));
 let disposed=false;
 function draw({x,y,look,pitch=0,scope=false,enemies=[],opponents=[],time=0}){
  if(disposed)return;
  camera.position.set(x,1.62+shooterElevation(map,x,y),y);
  camera.rotation.set(pitch,-look-Math.PI/2,0,'YXZ');
  const fov=scope?20:69;
  if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  for(let i=0;i<robotModels.length;i++){
   const bot=enemies[i],g=robotModels[i];g.visible=!!bot;
   if(bot){g.position.set(bot.x,Math.sin(time/280+i)*.05,bot.y);g.rotation.y=-Math.atan2(y-bot.y,x-bot.x)-Math.PI/2;}
  }
  for(let i=0;i<rivalModels.length;i++){
   const other=opponents[i],g=rivalModels[i];g.visible=!!other;
   if(other){g.position.set(other.x,0,other.y);g.rotation.y=-(other.angle||0)-Math.PI/2;}
  }
  renderer.render(scene,camera);
 }
 function dispose(){
  disposed=true;scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();
  renderer.forceContextLoss?.();
 }
 return {draw,dispose};
}

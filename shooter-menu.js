// SHOOT'E R! — menu e salas PvP beta em Firestore.
// As partidas multiplayer NÃO valem LCoins: ainda não há servidor autoritativo de combate.
import {addDoc,collection,doc,getDoc,onSnapshot,runTransaction,serverTimestamp,setDoc,updateDoc,query,limit,orderBy} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {mountShooterFPS} from './shooter-fps.js';
import {SHOOTER_MAPS} from './shooter-maps.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validMap=id=>SHOOTER_MAPS.some(m=>m.id===id);
export function shooterMapDraw(room){
 if(!validMap(room?.hostMap)||!validMap(room?.guestMap))return null;
 const key=String(room.id||'')+'|'+room.hostMap+'|'+room.guestMap;
 let hash=2166136261;for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
 return (hash>>>0)%2===0?room.hostMap:room.guestMap;
}
export function mountShooter({root,user,getDb,addCoins}){
 const db=getDb?.(),uid=user?.uid;
 let disposed=false,sceneCleanup=null,roomStop=null,playersStop=null,shotsStop=null,roomId=null,room=null;
 let mode='home',chosen='undefined',latestOpponents=[],latestPose=null,localHp=100,seenShots=new Set(),lastPoseAt=0;
 let playingRoom=null,postPromise=Promise.resolve();
 const mapThumb=(map)=>'<button type="button" class="shoot-map-tile '+(chosen===map.id?'selected':'')+'" data-shoot-map="'+map.id+'"><b>'+esc(map.name)+'</b><span>'+esc(map.subtitle)+'</span><small>'+map.style.toUpperCase()+'</small></button>';
 root.innerHTML='<section class="arcade-game shooter-hub"><header class="brigaloka-head"><span class="eyebrow">LINERCALL ARCADE · SHOOT’E R!</span><h2 class="shooter-logo">SHOOT<span>’E</span> R!</h2><p>Quatro cenários exploráveis, casas com portas, degraus e visão em primeira pessoa.</p></header><div id="shoot-hub-content"></div></section>';
 const container=root.querySelector('#shoot-hub-content');
 function stopGame(){
  if(sceneCleanup){sceneCleanup();sceneCleanup=null;}
 }
 function stopRoom(){
  roomStop?.();roomStop=null;playersStop?.();playersStop=null;shotsStop?.();shotsStop=null;
  stopGame();roomId=null;room=null;playingRoom=null;latestOpponents=[];seenShots=new Set();
 }
 function mapPicker(label='Escolha um cenário'){
  return '<h3>'+label+'</h3><div class="shoot-map-grid">'+SHOOTER_MAPS.map(mapThumb).join('')+'</div>';
 }
 function home(){
  stopRoom();mode='home';
  container.innerHTML='<div class="shooter-main-menu"><h3>Escolha um modo</h3><div class="shooter-mode-grid">'+
   '<button type="button" data-shoot-mode="solo"><b>🎯 Singleplayer</b><small>Treino com drones, 45 LCoins pela missão diária.</small></button>'+
   '<button type="button" data-shoot-mode="multi"><b>👥 Multiplayer (2)</b><small>Crie ou entre em uma sala e vote no cenário com seu amigo.</small></button>'+
   '<button type="button" data-shoot-mode="tutorial"><b>📖 Tutorial</b><small>Movimentação, armas, casas, escadas e fuzil.</small></button></div></div>';
 }
 function tutorial(){
  mode='tutorial';container.innerHTML='<div class="arcade-case-panel"><h3>Como jogar SHOOT’E R!</h3>'+
   '<p><b>WASD</b> caminhar, <b>mouse</b> olhar para os lados, para cima e para baixo; <b>PgUp/PgDn</b> ajusta a câmera pelo teclado. Use <b>1–4</b> para trocar de arma.</p>'+
   '<p><b>Clique esquerdo</b> atira, <b>R</b> recarrega e <b>botão direito</b> aproxima a mira do fuzil. No celular, use botões na tela e arraste para virar.</p>'+
   '<p>Entre nas casas pelas portas abertas. Degraus permitem alcançar pontos elevados. A barreira invisível aparece somente no contorno do mapa.</p>'+
   '<p><b>Singleplayer:</b> enfrente drones por até 85 segundos. <b>Multiplayer:</b> duas contas escolhem cenários e o sorteio define qual será usado. É um teste PvP sem recompensa.</p>'+
   '<button class="btn" data-shoot-home>← Voltar</button></div>';
 }
 function solo(){
  mode='solo';container.innerHTML='<div class="shoot-choose"><h3>Singleplayer · escolha onde jogar</h3>'+
   mapPicker('Mapas disponíveis')+
   '<div class="brig-actions"><button type="button" class="btn btn-primary" data-shoot-solo-start>▶ Iniciar treinamento</button><button type="button" class="btn" data-shoot-home>← Menu</button></div></div>';
 }
 function startSolo(){
  stopGame();mode='solo-playing';container.innerHTML='<div class="shooting-navigation"><button class="btn" data-shoot-home>← Menu SHOOT’E R!</button><span>Treino solo · '+esc(SHOOTER_MAPS.find(m=>m.id===chosen)?.name)+'</span></div><div id="shooting-stage"></div>';
  sceneCleanup=mountShooterFPS({root:container.querySelector('#shooting-stage'),user,addCoins,mapId:chosen,mode:'solo'});
 }
 function multi(){
  stopRoom();mode='multi';container.innerHTML='<div class="arcade-case-panel"><h3>Multiplayer · sala para 2 pessoas</h3>'+
   '<p>Um cria a sala e manda o código para o amigo. Cada um escolhe um mapa; o jogo sorteia um dos dois. <b>Beta: sem LCoins nem ranking</b>.</p>'+
   '<div class="brig-actions"><button class="btn btn-primary" data-room-create>＋ Criar sala</button><form id="shoot-room-form"><input name="code" placeholder="Cole o código da sala" required maxlength="120" aria-label="Código da sala"><button type="submit" class="btn">Entrar na sala</button></form></div>'+
   '<p id="shoot-room-feedback" class="arcade-note">Aguardando a sua escolha.</p><button class="btn" data-shoot-home>← Menu</button></div>';
 }
 const info=t=>{const node=container.querySelector('#shoot-room-feedback');if(node)node.textContent=t;};
 function saveRoomId(id){roomId=id;}
 async function create(){
  if(!db||!uid){info('Entre na sua conta. Firestore não está configurado.');return;}
  try{
   const docRef=await addDoc(collection(db,'shooterRooms'),{
    hostUid:uid,guestUid:'',hostName:String(user.displayName||'Jogador').slice(0,40),guestName:'',
    hostMap:'',guestMap:'',status:'waiting',createdAt:serverTimestamp(),updatedAt:serverTimestamp()
   });
   saveRoomId(docRef.id);listenRoom();
  }catch(err){info('Erro ao criar sala: '+(err.code||err.message)+'. Verifique as regras do Firestore.');}
 }
 async function join(code){
  if(!db||!uid){info('Entre com sua conta para entrar na sala.');return;}
  code=String(code||'').trim();
  if(!/^[A-Za-z0-9_-]{12,120}$/.test(code)){info('Código de sala inválido.');return;}
  try{
   const ref=doc(db,'shooterRooms',code);
   await runTransaction(db,async tx=>{
    const snap=await tx.get(ref),data=snap.data();
    if(!snap.exists()||data.status!=='waiting'||data.guestUid||data.hostUid===uid)throw Error('Sala inexistente, ocupada ou criada por você.');
    tx.update(ref,{guestUid:uid,guestName:String(user.displayName||'Jogador').slice(0,40),status:'choosing',updatedAt:serverTimestamp()});
   });
   saveRoomId(code);listenRoom();
  }catch(err){info(err.message||'Não foi possível entrar na sala.');}
 }
 function listenRoom(){
  roomStop?.();roomStop=null;mode='lobby';
  const ref=doc(db,'shooterRooms',roomId);
  roomStop=onSnapshot(ref,snap=>{
   if(disposed||!snap.exists())return;
   const next={id:snap.id,...snap.data()};
   if(![next.hostUid,next.guestUid].includes(uid)){info('Você não participa desta sala.');return;}
   room=next;
   const result=shooterMapDraw(room);
   if(result){
    if(mode!=='multi-playing'||playingRoom!==result)startMulti(result);
    return;
   }
   mode='lobby';renderLobby();
  },err=>{if(!disposed)info('Erro ao acompanhar sala: '+(err.code||err.message));});
 }
 function renderLobby(){
  if(!room)return;
  const isHost=room.hostUid===uid;
  const already=isHost?room.hostMap:room.guestMap;
  const other=isHost?room.guestMap:room.hostMap;
  chosen=already||chosen;
  container.innerHTML='<div class="shoot-lobby"><div class="arcade-case-panel">'+
   '<h3>🎮 Sala SHOOT’E R! · '+(room.guestUid?'2/2 jogadores':'1/2 jogadores')+'</h3>'+
   '<p>Código da sala: <code id="shoot-room-code">'+esc(room.id)+'</code> <button class="btn" data-room-copy>Copiar</button></p>'+
   '<p><b>'+esc(room.hostName||'Jogador 1')+'</b> escolheu: '+esc(SHOOTER_MAPS.find(m=>m.id===room.hostMap)?.name||'aguardando')+'</p>'+
   '<p><b>'+esc(room.guestName||'Jogador 2')+'</b> escolheu: '+esc(SHOOTER_MAPS.find(m=>m.id===room.guestMap)?.name||'aguardando')+'</p>'+
   '<p>Quando os dois votarem, um dos mapas será escolhido por sorteio determinístico com base no código da sala e nos dois votos.</p>'+
   (room.guestUid?mapPicker('Seu voto de mapa'):'<p class="arcade-note">Compartilhe o código e aguarde o segundo jogador.</p>')+
   (room.guestUid?'<button class="btn btn-primary" data-room-vote '+(already?'disabled':'')+'>🗳 Confirmar meu mapa</button>':'')+
   '<button class="btn" data-shoot-home>← Sair da sala</button></div></div>';
 }
 async function vote(){
  if(!room||!room.guestUid||!validMap(chosen))return;
  const isHost=room.hostUid===uid;
  if(isHost?room.hostMap:room.guestMap)return;
  try{await updateDoc(doc(db,'shooterRooms',room.id),{[isHost?'hostMap':'guestMap']:chosen,updatedAt:serverTimestamp()});}
  catch(err){info('Não foi possível votar: '+(err.code||err.message));}
 }
 function receiveShots(snap){
  for(const item of snap.docChanges()){
   if(item.type!=='added')continue;
   const id=item.doc.id,shot=item.doc.data();
   if(seenShots.has(id)||shot.uid===uid)continue;
   seenShots.add(id);
   if(seenShots.size>500)seenShots=new Set([...seenShots].slice(-250));
   const now=Date.now();
   const timestamp=shot.createdAt?.toMillis?.()||0;
   if(timestamp&&Math.abs(now-timestamp)>12000)continue;
   if(!latestPose||!sceneCleanup?.damage)return;
   const dx=latestPose.x-shot.x,dy=latestPose.y-shot.y,dist=Math.hypot(dx,dy);
   const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-shot.angle),Math.cos(Math.atan2(dy,dx)-shot.angle));
   const damage=[26,12,95,50][shot.weapon]||0;
   if(dist<([15,11,23,1.35][shot.weapon]||0)&&Math.abs(delta)<Math.atan2(.28,Math.max(.1,dist))&&Math.abs((shot.pitch||0)-(latestPose.pitch||0))<.4){
    sceneCleanup.damage(damage);
   }
  }
 }
 function startMulti(mapId){
  stopGame();playersStop?.();shotsStop?.();playersStop=null;shotsStop=null;
  mode='multi-playing';playingRoom=mapId;latestOpponents=[];latestPose=null;seenShots=new Set();
  const map=SHOOTER_MAPS.find(m=>m.id===mapId);
  container.innerHTML='<div class="shooting-navigation"><button class="btn" data-shoot-home>← Sair da sala</button><span>⚔ Multiplayer beta · '+esc(map.name)+'</span><small>Sem LCoins: testes de sincronização</small></div>'+
  '<div id="shooting-stage"></div>';
  const id=room.id,playerRef=doc(db,'shooterRooms',id,'players',uid);
  const opponent=uid===room.hostUid?room.guestUid:room.hostUid;
  sceneCleanup=mountShooterFPS({
   root:container.querySelector('#shooting-stage'),user,addCoins:()=>{},mapId,mode:'multi',
   getOpponents:()=>latestOpponents,
   onPose:pose=>{
    latestPose=pose;
    const now=Date.now();if(now-lastPoseAt<240)return;lastPoseAt=now;
    postPromise=postPromise.catch(()=>{}).then(()=>setDoc(playerRef,{uid,x:pose.x,y:pose.y,angle:pose.angle,pitch:pose.pitch,weapon:pose.weapon,hp:pose.hp,updatedAt:serverTimestamp()},{merge:true})).catch(()=>{});
   },
   onFire:shot=>{
    if(!Number.isFinite(shot.x)||!Number.isFinite(shot.y))return;
    addDoc(collection(db,'shooterRooms',id,'shots'),{
     uid,weapon:shot.weapon,x:shot.x,y:shot.y,angle:shot.angle,pitch:shot.pitch,createdAt:serverTimestamp()
    }).catch(()=>{});
   }
  });
  playersStop=onSnapshot(doc(db,'shooterRooms',id,'players',opponent),snap=>{
   if(!snap.exists())return;
   const p=snap.data(),age=Date.now()-(p.updatedAt?.toMillis?.()||0);
   latestOpponents=age<10000&&p.hp>0&&Number.isFinite(p.x)&&Number.isFinite(p.y)?[{x:p.x,y:p.y,hp:p.hp}]:[];
  },()=>{});
  shotsStop=onSnapshot(query(collection(db,'shooterRooms',id,'shots'),orderBy('createdAt','desc'),limit(90)),receiveShots,()=>{});
 }
 async function onSubmit(e){
  if(e.target.id!=='shoot-room-form')return;
  e.preventDefault();await join(e.target.elements.code.value);
 }
 function onClick(e){
  if(e.target.closest('[data-shoot-home]')){home();return;}
  const modeButton=e.target.closest('[data-shoot-mode]');
  if(modeButton){const choice=modeButton.dataset.shootMode;if(choice==='solo')solo();else if(choice==='multi')multi();else tutorial();return;}
  const map=e.target.closest('[data-shoot-map]');
  if(map){chosen=map.dataset.shootMap;container.querySelectorAll('[data-shoot-map]').forEach(b=>b.classList.toggle('selected',b.dataset.shootMap===chosen));return;}
  if(e.target.closest('[data-shoot-solo-start]')){startSolo();return;}
  if(e.target.closest('[data-room-create]')){create();return;}
  if(e.target.closest('[data-room-vote]')){vote();return;}
  if(e.target.closest('[data-room-copy]')&&roomId){navigator.clipboard?.writeText(roomId).catch(()=>{});return;}
 }
 root.addEventListener('click',onClick);root.addEventListener('submit',onSubmit);home();
 return ()=>{disposed=true;stopRoom();root.removeEventListener('click',onClick);root.removeEventListener('submit',onSubmit);};
}

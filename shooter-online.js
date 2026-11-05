// SHOOT’E R! 1v1 — lobby e posições transmitidas pelo Firestore.
// Resultado dos disparos, seleção aleatória de mapa e prêmios são validados pela API.
import {collection,doc,onSnapshot,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
export function createShooterOnline({db,user,onChange,onMessage,onWallet}){
 let room=null,code='',players=new Map(),unsubRoom=null,unsubPlayers=null,lastMove=0;
 let movementPending=false,pendingPosition=Promise.resolve(),latestPose=null,disposed=false,lastPing=0;
 const uid=user.uid;
 const getRoom=()=>room;
 const getCode=()=>code;
 const side=()=>room?.hostUid===uid?'host':'guest';
 const otherUid=()=>side()==='host'?room?.guestUid:room?.hostUid;
 const self=()=>players.get(uid)||null;
 const other=()=>players.get(otherUid())||null;
 function disposeListeners(){unsubRoom?.();unsubPlayers?.();unsubRoom=null;unsubPlayers=null;players.clear();}
 async function call(action,data={}){
  const token=await user.getIdToken();
  const response=await fetch('/api/shooter',{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
   body:JSON.stringify({action,code,...data})
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||'Erro no servidor do SHOOT’E R!.');
  if(typeof payload.earnedTotal==='number')onWallet?.(payload.earnedTotal);
  if(payload.room&&code===payload.room.id){room=payload.room;onChange?.();}
  return payload;
 }
 function watch(id){
  disposeListeners();code=id;room=null;
  unsubRoom=onSnapshot(doc(db,'shooterRooms',id),snap=>{
   if(disposed)return;
   if(!snap.exists()){onMessage?.('A sala foi encerrada.');disposeListeners();code='';room=null;onChange?.();return;}
   const oldStatus=room?.status;
   room={id:snap.id,...snap.data()};
   if(oldStatus!=='finished'&&room.status==='finished')call('status').catch(error=>onMessage?.(error.message));
   onChange?.();
  },error=>{onMessage?.('Erro ao acompanhar sala: '+(error.code||error.message)+'. Publique as regras do Firestore.');});
  unsubPlayers=onSnapshot(collection(db,'shooterRooms',id,'players'),snap=>{
   if(disposed)return;
   players=new Map(snap.docs.map(d=>[d.id,d.data()]));
  },error=>{onMessage?.('Erro de sincronização dos jogadores: '+(error.code||error.message));});
 }
 async function create(){
  const answer=await call('create');
  watch(answer.code);
  return answer.code;
 }
 async function join(id){
  const normalized=String(id||'').trim().toUpperCase();
  const answer=await call('join',{code:normalized});
  watch(answer.code);
 }
 async function vote(mapId){return call('vote',{mapId});}
 async function status(){if(!code)return;return call('status');}
 async function leave(){
  const previous=code;
  disposeListeners();code='';room=null;
  if(previous)try{await call('leave',{code:previous});}
   catch(error){onMessage?.(error.message);}
 }
 async function shoot(weapon,pose){
  // Antes do disparo, publicar a posição/ângulo atual para a API validar a mira real.
  if(pose)await sendPosition(pose,true);
  else await pendingPosition;
  return call('shoot',{weapon});
 }
 async function reload(weapon){return call('reload',{weapon});}
 function sendPosition({x,y,angle,weapon},force=false){
  if(!room||room.status!=='playing'||!code||disposed)return Promise.resolve();
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(angle))return Promise.resolve();
  const now=Date.now(),pose={x:Number(x.toFixed(3)),y:Number(y.toFixed(3)),
   angle:Number(angle.toFixed(4)),weapon,updatedAt:serverTimestamp()};
  latestPose=pose;
  if(!force&&now-lastMove<230)return pendingPosition;
  lastMove=now;
  const id=code;
  // Enfileirar as atualizações, para os snapshots não chegarem fora de ordem.
  pendingPosition=pendingPosition.catch(()=>{}).then(()=>
   updateDoc(doc(db,'shooterRooms',id,'players',uid),pose)
  ).catch(error=>{
   if(Date.now()-lastPing>5000){lastPing=Date.now();onMessage?.('Falha na posição: '+(error.code||error.message));}
   if(force)throw error;
  });
  return pendingPosition;
 }
 function getOpponent(){
  const pos=other();
  if(!pos)return null;
  const isAlive=room?.[side()==='host'?'guestHp':'hostHp']>0;
  return isAlive?{...pos,name:side()==='host'?room?.guestName:room?.hostName,hp:room?.[side()==='host'?'guestHp':'hostHp']}:null;
 }
 function getSelfHp(){return Number(room?.[side()==='host'?'hostHp':'guestHp'])||0;}
 function getSelfAmmo(weapon){return room?.[side()+'Ammo']?.[weapon];}
 function getSelfReserve(weapon){return room?.[side()+'Reserve']?.[weapon];}
 function isReloading(weapon){return Number(room?.[side()+'ReloadUntil']?.[weapon])>Date.now();}
 function destroy(){disposed=true;disposeListeners();room=null;code='';}
 return {create,join,vote,status,leave,shoot,reload,sendPosition,getRoom,getCode,getOpponent,getSelfHp,getSelfAmmo,getSelfReserve,isReloading,side,destroy};
}

import {randomInt,randomBytes} from 'node:crypto';
import {getApps,initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {getShooterMap,SHOOTER_MAP_IDS,isShooterOpen} from '../shooter-maps.js';

const MATCH_MS=150000;
const MAG=[12,30,5,0],RESERVE=[84,180,30,0];
const DELAY=[280,86,900,520],DAMAGE=[31,14,125,68],RANGE=[13,10,22,1.28];
const RELOAD=[1300,1700,2400,0],MAX_REWARDS_PER_DAY=3;
const validCode=value=>typeof value==='string'&&/^[A-Z2-9]{6}$/.test(value);
function firebaseAdmin(){
 if(getApps().length)return getApps()[0];
 const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!raw)throw Object.assign(Error('Firebase Admin não configurado.'),{status:503});
 const credentials=JSON.parse(raw);
 if(credentials.project_id!=='linercalls')throw Object.assign(Error('Credenciais do projeto incorreto.'),{status:503});
 return initializeApp({credential:cert(credentials)});
}
const blocked=(status,message)=>Object.assign(new Error(message),{status});
const isMember=(room,uid)=>room.hostUid===uid||room.guestUid===uid;
const side=(room,uid)=>room.hostUid===uid?'host':'guest';
const selfSide=side;
function dateBR(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function shotHits(map,x,y,angle,otherX,otherY,weapon){
 const distance=Math.hypot(otherX-x,otherY-y);
 if(distance>RANGE[weapon]||distance<.05)return false;
 const targetAngle=Math.atan2(otherY-y,otherX-x);
 const angleError=Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle));
 if(Math.abs(angleError)>Math.atan2(weapon===3?.28:.27,distance))return false;
 const steps=Math.max(1,Math.ceil(distance/.065));
 for(let i=1;i<steps;i++){
  const t=i/steps,px=x+(otherX-x)*t,py=y+(otherY-y)*t;
  if(map.grid[Math.floor(py)]?.[Math.floor(px)]!=='0')return false;
 }
 return true;
}
async function settle(tx,db,roomRef,room,winnerUid,now,rewardEligible){
 const players=[room.hostUid,room.guestUid];
 const walletRefs=players.map(uid=>db.collection('arcadeWallets').doc(uid));
 const walletDocs=await Promise.all(walletRefs.map(ref=>tx.get(ref)));
 const day=dateBR(),award={};
 for(let i=0;i<players.length;i++){
  const old=walletDocs[i].data()||{},priorDay=old.shooterRewardDay===day?Number(old.shooterRewardCount)||0:0;
  const credit=rewardEligible&&priorDay<MAX_REWARDS_PER_DAY?(winnerUid?players[i]===winnerUid?90:15:25):0;
  award[players[i]]=credit;
  if(credit){
   tx.set(walletRefs[i],{
    shooterEarnedTotal:(Number(old.shooterEarnedTotal)||0)+credit,
    shooterRewardDay:day,shooterRewardCount:priorDay+1,updatedAt:FieldValue.serverTimestamp()
   },{merge:true});
  }
 }
 tx.update(roomRef,{status:'finished',winnerUid:winnerUid||'',finishedAt:FieldValue.serverTimestamp(),
  hostHp:Math.max(0,room.hostHp),guestHp:Math.max(0,room.guestHp),
  awarded:award,updatedAt:FieldValue.serverTimestamp()});
 return award;
}
function roomRefFor(db,code){if(!validCode(code))throw blocked(400,'Código da sala inválido.');return db.collection('shooterRooms').doc(code);}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
 const match=/^Bearer (.+)$/i.exec(req.headers.authorization||'');
 if(!match)return res.status(401).json({error:'Faça login na sua conta.'});
 const action=req.body?.action;
 if(!['create','join','vote','shoot','reload','status','leave'].includes(action))return res.status(400).json({error:'Ação inválida.'});
 try{
  const app=firebaseAdmin(),db=getFirestore(app),decoded=await getAuth(app).verifyIdToken(match[1]);
  const uid=decoded.uid;
  let name='Jogador';
  if(action==='create'||action==='join'){
   const account=await db.collection('users').doc(uid).get();
   name=String(account.data()?.displayName||'Jogador').slice(0,36);
  }
  if(action==='create'){
   for(let attempt=0;attempt<5;attempt++){
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code=Array.from(randomBytes(6),byte=>alphabet[byte%alphabet.length]).join('');
    const ref=db.collection('shooterRooms').doc(code);
    try{
     await ref.create({hostUid:uid,guestUid:'',hostName:name,guestName:'',
      status:'waiting',hostVote:'',guestVote:'',mapId:'',winnerUid:'',
      createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
     return res.status(200).json({ok:true,code});
    }catch(error){if(error.code!==6&&error.code!=='already-exists')throw error;}
   }
   throw blocked(503,'Não foi possível gerar uma sala. Tente novamente.');
  }
  const ref=roomRefFor(db,String(req.body?.code||'').trim().toUpperCase());
  if(action==='join'){
   const result=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists)throw blocked(404,'Essa sala não existe.');
    const room=snap.data();
    if(isMember(room,uid))return room;
    if(room.status!=='waiting'||room.guestUid)throw blocked(409,'Essa sala já está cheia ou a partida começou.');
    if(room.createdAt?.toMillis&&Date.now()-room.createdAt.toMillis()>45*60*1000)throw blocked(410,'Sala expirada. Crie uma nova.');
    tx.update(ref,{guestUid:uid,guestName:name,status:'voting',updatedAt:FieldValue.serverTimestamp()});
    return {...room,guestUid:uid,guestName:name,status:'voting'};
   });
   return res.status(200).json({ok:true,code:ref.id,status:result.status});
  }
  if(action==='vote'){
   const mapId=req.body?.mapId;
   if(!SHOOTER_MAP_IDS.includes(mapId))throw blocked(400,'Mapa inválido.');
   const result=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists)throw blocked(404,'Sala não encontrada.');
    const room=snap.data();if(!isMember(room,uid))throw blocked(403,'Você não faz parte dessa sala.');
    if(room.status==='playing'||room.status==='finished')return {status:room.status,mapId:room.mapId};
    if(room.status!=='voting')throw blocked(409,'Espere o segundo jogador entrar.');
    const field=uid===room.hostUid?'hostVote':'guestVote';
    const next={...room,[field]:mapId};
    const update={[field]:mapId,updatedAt:FieldValue.serverTimestamp()};
    if(next.hostVote&&next.guestVote){
     const picked=randomInt(2)===0?next.hostVote:next.guestVote;
     const map=getShooterMap(picked);
     Object.assign(update,{status:'playing',mapId:picked,startedAt:FieldValue.serverTimestamp(),
      hostHp:100,guestHp:100,hostShots:0,guestShots:0,hostAmmo:MAG.slice(),guestAmmo:MAG.slice(),
      hostReserve:RESERVE.slice(),guestReserve:RESERVE.slice(),hostLastShot:[0,0,0,0],guestLastShot:[0,0,0,0],
      hostReloadUntil:[0,0,0,0],guestReloadUntil:[0,0,0,0]});
     tx.create(ref.collection('players').doc(room.hostUid),{
      uid:room.hostUid,x:map.spawn[0][0],y:map.spawn[0][1],angle:map.spawn[0][2],weapon:0,updatedAt:FieldValue.serverTimestamp()
     });
     tx.create(ref.collection('players').doc(room.guestUid),{
      uid:room.guestUid,x:map.spawn[1][0],y:map.spawn[1][1],angle:map.spawn[1][2],weapon:0,updatedAt:FieldValue.serverTimestamp()
     });
    }
    tx.update(ref,update);
    return {status:update.status||'voting',mapId:update.mapId||''};
   });
   return res.status(200).json({ok:true,...result});
  }
  const roomSnap=await ref.get();if(!roomSnap.exists)throw blocked(404,'Sala não encontrada.');
  const room=roomSnap.data();if(!isMember(room,uid))throw blocked(403,'Você não está nessa sala.');
  if(action==='status'){
   if(room.status==='playing'&&room.startedAt?.toMillis&&Date.now()-room.startedAt.toMillis()>MATCH_MS){
    await db.runTransaction(async tx=>{
     const fresh=await tx.get(ref);const b=fresh.data();
     if(b?.status!=='playing')return;
     const winner=b.hostHp>b.guestHp?b.hostUid:b.guestHp>b.hostHp?b.guestUid:'';
     const good=(Number(b.hostShots)||0)+(Number(b.guestShots)||0)>=6;
     await settle(tx,db,ref,b,winner,Date.now(),good);
    });
   }
   const [fresh,wallet]=await Promise.all([ref.get(),db.collection('arcadeWallets').doc(uid).get()]);
   return res.status(200).json({ok:true,room:{...fresh.data(),id:ref.id},earnedTotal:Number(wallet.data()?.shooterEarnedTotal)||0});
  }
  if(action==='leave'){
   if(room.status==='playing'){
    await db.runTransaction(async tx=>{
     const snap=await tx.get(ref),b=snap.data();
     if(!b||b.status!=='playing')return;
     const winner=uid===b.hostUid?b.guestUid:b.hostUid;
     await settle(tx,db,ref,b,winner,Date.now(),false);
    });
   }else if(room.status==='waiting'||room.status==='voting'){
    await ref.update({status:'finished',winnerUid:'',updatedAt:FieldValue.serverTimestamp()});
   }
   return res.status(200).json({ok:true});
  }
  if(!['shoot','reload'].includes(action))throw blocked(400,'Ação não permitida.');
  if(room.status!=='playing')throw blocked(409,'A partida não está ativa.');
  const weapon=Number(req.body?.weapon);
  if(!Number.isInteger(weapon)||weapon<0||weapon>3)throw blocked(400,'Arma inválida.');
  const outcome=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref),b=snap.data();
   if(!b||b.status!=='playing')throw blocked(409,'A partida terminou.');
   if(!isMember(b,uid))throw blocked(403,'Você não está nessa partida.');
   const role=selfSide(b,uid),otherRole=role==='host'?'guest':'host',now=Date.now();
   const ammo=b[role+'Ammo'].slice(),reserve=b[role+'Reserve'].slice(),lastShot=b[role+'LastShot'].slice();
   const reloadUntil=b[role+'ReloadUntil'].slice();
   if(action==='reload'){
    if(weapon===3||ammo[weapon]>=MAG[weapon]||reserve[weapon]<=0)return {ok:true,ignored:true};
    if(reloadUntil[weapon]>now)return {ok:true,reloading:true,until:reloadUntil[weapon]};
    const take=Math.min(MAG[weapon]-ammo[weapon],reserve[weapon]);
    ammo[weapon]+=take;reserve[weapon]-=take;reloadUntil[weapon]=now+RELOAD[weapon];
    tx.update(ref,{[role+'Ammo']:ammo,[role+'Reserve']:reserve,[role+'ReloadUntil']:reloadUntil,updatedAt:FieldValue.serverTimestamp()});
    return {ok:true,reloading:true,until:reloadUntil[weapon]};
   }
   if(now-lastShot[weapon]<DELAY[weapon])throw blocked(429,'Arma em intervalo de disparo.');
   if(reloadUntil[weapon]>now)throw blocked(429,'Aguarde terminar a recarga.');
   if(weapon!==3&&ammo[weapon]<1)throw blocked(409,'Sem munição. Recarregue.');
   const shooterDoc=await tx.get(ref.collection('players').doc(uid));
   const enemyUid=role==='host'?b.guestUid:b.hostUid;
   const enemyDoc=await tx.get(ref.collection('players').doc(enemyUid));
   const shooter=shooterDoc.data(),opponent=enemyDoc.data();
   const map=getShooterMap(b.mapId);
   if(!shooter||!opponent||!isShooterOpen(map,shooter.x,shooter.y)||!isShooterOpen(map,opponent.x,opponent.y))
    throw blocked(409,'Posições não sincronizadas.');
   const fresh=s=>s.updatedAt?.toMillis?.()&&now-s.updatedAt.toMillis()<4500;
   if(!fresh(shooter)||!fresh(opponent))throw blocked(409,'Aguardando a sincronização do adversário.');
   const angle=Number(shooter.angle);if(!Number.isFinite(angle))throw blocked(400,'Ângulo inválido.');
   const hit=shotHits(map,shooter.x,shooter.y,angle,opponent.x,opponent.y,weapon);
   if(weapon!==3)ammo[weapon]--;
   lastShot[weapon]=now;
   const hp=hit?Math.max(0,(Number(b[otherRole+'Hp'])||0)-DAMAGE[weapon]):Number(b[otherRole+'Hp'])||0;
   const update={[role+'Ammo']:ammo,[role+'LastShot']:lastShot,
    [role+'Shots']:(Number(b[role+'Shots'])||0)+1,[otherRole+'Hp']:hp,updatedAt:FieldValue.serverTimestamp()};
   if(hp===0){
    await settle(tx,db,ref,{...b,...update},uid,now,true);
    // O encerramento e as recompensas ficam na mesma transação do dano.
    tx.update(ref,update);
   }else tx.update(ref,update);
   return {ok:true,hit,damage:hit?DAMAGE[weapon]:0,finished:hp===0,ammo:ammo[weapon]};
  });
  return res.status(200).json(outcome);
 }catch(error){
  if(error?.status)return res.status(error.status).json({error:error.message});
  if(String(error.code||'').startsWith('auth/'))return res.status(401).json({error:'Sessão expirada.'});
  console.error('Shooter 1v1:',error);
  return res.status(500).json({error:'Não foi possível concluir a operação no SHOOT’E R!.'});
 }
}

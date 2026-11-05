import {getApps,initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {verifyPokemonMatch,weekInSaoPaulo} from '../server/pvpRanking.js';

function adminApp(){
 if(getApps().length)return getApps()[0];
 const json=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!json)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado na Vercel.');
 const credentials=JSON.parse(json);
 if(credentials.project_id!=='linercalls')throw new Error('O projeto da conta de serviço está incorreto.');
 return initializeApp({credential:cert(credentials)});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
 if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)return res.status(503).json({error:'Ranking aguardando configuração segura no servidor.'});
 const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({error:'Faça login antes de registrar uma batalha.'});
 const matchId=req.body?.matchId;
 if(typeof matchId!=='string'||!/^[-a-zA-Z0-9_]{6,130}$/.test(matchId))return res.status(400).json({error:'Identificador da partida inválido.'});
 try{
  const app=adminApp(),auth=getAuth(app),firestore=getFirestore(app);
  const decoded=await auth.verifyIdToken(token);
  const matchRef=firestore.collection('pokemonMatches').doc(matchId);
  const [matchDoc,turnDocs]=await Promise.all([matchRef.get(),matchRef.collection('turns').get()]);
  if(!matchDoc.exists)return res.status(404).json({error:'Partida não encontrada.'});
  const match=matchDoc.data();
  if(![match.hostUid,match.guestUid].includes(decoded.uid))return res.status(403).json({error:'Você não participou desta partida.'});
  const verified=verifyPokemonMatch({...match,id:matchId},turnDocs.docs.map(d=>d.data()));
  if(!verified)return res.status(409).json({error:'A partida ainda não terminou ou seus turnos são inválidos.'});
  const settledRef=firestore.collection('settledPokemonMatches').doc(matchId);
  const result=await firestore.runTransaction(async tx=>{
   const settled=await tx.get(settledRef);
   if(settled.exists)return {alreadySettled:true,weekKey:settled.data()?.weekKey||''};
   const weekKey=weekInSaoPaulo(new Date());
   const winnerRef=firestore.collection('weeklyRankings').doc(weekKey).collection('players').doc(verified.winnerUid);
   const loserRef=firestore.collection('weeklyRankings').doc(weekKey).collection('players').doc(verified.loserUid);
   const [winDoc,loseDoc]=await Promise.all([tx.get(winnerRef),tx.get(loserRef)]);
   const prevWin=winDoc.data()||{},prevLose=loseDoc.data()||{};
   tx.set(winnerRef,{
    wins:(Number(prevWin.wins)||0)+1,
    losses:Number(prevWin.losses)||0,
    points:(Number(prevWin.points)||0)+100,
    updatedAt:FieldValue.serverTimestamp()
   });
   tx.set(loserRef,{
    wins:Number(prevLose.wins)||0,
    losses:(Number(prevLose.losses)||0)+1,
    points:(Number(prevLose.points)||0)+10,
    updatedAt:FieldValue.serverTimestamp()
   });
   tx.create(settledRef,{
    weekKey,winnerUid:verified.winnerUid,loserUid:verified.loserUid,
    turns:verified.turns,settledAt:FieldValue.serverTimestamp()
   });
   return {alreadySettled:false,weekKey};
  });
  return res.status(200).json({ok:true,weekKey:result.weekKey,alreadySettled:result.alreadySettled});
 }catch(error){
  console.error('Não foi possível registrar resultado Pokémon:',error);
  const msg=String(error?.message||'');
  if(/FIREBASE_SERVICE_ACCOUNT_JSON|project_id/.test(msg))return res.status(503).json({error:'As credenciais de ranking precisam ser configuradas no servidor.'});
  if(error?.code==='auth/id-token-expired'||error?.code==='auth/argument-error')return res.status(401).json({error:'Sua sessão expirou. Entre novamente.'});
  return res.status(500).json({error:'Falha interna ao confirmar a batalha. Tente novamente.'});
 }
}

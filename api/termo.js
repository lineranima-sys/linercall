import {createHmac} from 'node:crypto';
import {getApps,initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {TERMO_WORDS} from '../termo-words.js';
import {marcarTermo,normalizarPalavra} from '../server/termoCore.js';

const REWARD=60;
const MAX_ATTEMPTS=6;
function firebaseApp(credentials){
 if(getApps().length)return getApps()[0];
 if(credentials.project_id!=='linercalls')throw new Error('Projeto do Firebase incorreto.');
 return initializeApp({credential:cert(credentials)});
}
function saoPauloDate(){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function dailyWord(date,privateKey){
 // Escolha fixa para toda a comunidade, mas não descoberta pela inspeção do JavaScript.
 const hash=createHmac('sha256',privateKey).update('LinerCall-TERMO-'+date).digest();
 return TERMO_WORDS[hash.readUInt32BE(0)%TERMO_WORDS.length];
}
function snapshot(state,date,target,total){
 const guesses=(Array.isArray(state?.attempts)?state.attempts:[]).map(word=>({word,marks:marcarTermo(word,target)}));
 const status=state?.status||'playing';
 return {ok:true,date,status,guesses,attemptsLeft:Math.max(0,MAX_ATTEMPTS-guesses.length),
  reward:REWARD,earnedTotal:Number(total)||0,answer:status==='playing'?null:target};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
 const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!raw)return res.status(503).json({error:'TERMO online aguardando FIREBASE_SERVICE_ACCOUNT_JSON na Vercel.'});
 const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({error:'Entre na sua conta para jogar.'});
 const action=req.body?.action;
 if(!['status','guess'].includes(action))return res.status(400).json({error:'Ação inválida.'});
 const guess=normalizarPalavra(req.body?.guess);
 if(action==='guess'&&!/^[a-z]{5}$/.test(guess))return res.status(400).json({error:'Digite uma palavra de cinco letras.'});
 try{
  const credentials=JSON.parse(raw),app=firebaseApp(credentials);
  const decoded=await getAuth(app).verifyIdToken(token);
  const db=getFirestore(app),date=saoPauloDate(),answer=dailyWord(date,credentials.private_key);
  const gameRef=db.collection('termoDays').doc(date).collection('players').doc(decoded.uid);
  const walletRef=db.collection('arcadeWallets').doc(decoded.uid);
  if(action==='status'){
   const [game,wallet]=await Promise.all([gameRef.get(),walletRef.get()]);
   return res.status(200).json(snapshot(game.data(),date,answer,wallet.data()?.termoEarnedTotal));
  }
  const result=await db.runTransaction(async tx=>{
   const stateDoc=await tx.get(gameRef),walletDoc=await tx.get(walletRef);
   const state=stateDoc.data()||{attempts:[],status:'playing'};
   const total=Number(walletDoc.data()?.termoEarnedTotal)||0;
   if(state.status!=='playing')return snapshot(state,date,answer,total);
   const attempts=Array.isArray(state.attempts)?state.attempts.slice(0,MAX_ATTEMPTS):[];
   if(attempts.length>=MAX_ATTEMPTS)return snapshot({...state,status:'lost'},date,answer,total);
   attempts.push(guess);
   const won=guess===answer,finished=won||attempts.length>=MAX_ATTEMPTS;
   const next={attempts,status:won?'won':finished?'lost':'playing',updatedAt:FieldValue.serverTimestamp()};
   tx.set(gameRef,next,{merge:true});
   if(won){
    tx.set(walletRef,{termoEarnedTotal:total+REWARD,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    const name=String(decoded.name||'Jogador').slice(0,40);
    tx.set(db.collection('termoDays').doc(date).collection('winners').doc(decoded.uid),{
     name,attempts:attempts.length,solvedAt:FieldValue.serverTimestamp()
    });
   }
   return snapshot(next,date,answer,total+(won?REWARD:0));
  });
  return res.status(200).json(result);
 }catch(error){
  console.error('TERMO online:',error);
  if(/projeto|project|credential/i.test(String(error.message)))return res.status(503).json({error:'Credenciais de servidor inválidas.'});
  if(String(error.code||'').startsWith('auth/'))return res.status(401).json({error:'Sessão expirada. Faça login novamente.'});
  return res.status(500).json({error:'Não foi possível processar a jogada.'});
 }
}

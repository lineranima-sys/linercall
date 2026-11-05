import {TERMO_WORDS} from './termo-words.js';
import {collection,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountTermo({root,getUser,getDb,addCoins}){
 let gone=false,sub=null,loading=false,state=null,practiceAnswer=null;
 root.innerHTML=
 '<section class="arcade-game termo-game">'+
 '<div class="arcade-game-heading"><span class="eyebrow">PALAVRA DO DIA · COMPETIÇÃO ONLINE</span><h2>TERMO <em>ONLINE</em></h2><p>Uma palavra de cinco letras para toda a comunidade, seis tentativas e um placar de vencedores.</p></div>'+
 '<p class="arcade-prize">🏆 +60 LCoins pelo acerto · recompensa única por conta a cada dia.</p>'+
 '<p id="termo-info" role="status" class="arcade-note">Conectando ao servidor...</p>'+
 '<div id="termo-board" class="termo-board" aria-label="Seis tentativas"></div>'+
 '<form id="termo-form" class="termo-form"><input maxlength="5" placeholder="5 letras" required autocomplete="off" spellcheck="false" aria-label="Palpite"><button type="submit" class="btn btn-primary">Enviar</button></form>'+
 '<div class="termo-help"><span>🟩 Posição certa</span><span>🟨 Outra posição</span><span>⬛ Não tem</span></div>'+
 '<div class="arcade-online-score"><h3>🏅 Placar de hoje</h3><div id="termo-rank">Aguardando jogadores...</div></div></section>';
 const el=selector=>root.querySelector(selector);
 const info=msg=>{const item=el('#termo-info');if(item)item.textContent=msg;};
 function grant(total){
  const uid=getUser()?.uid;
  if(!uid||!Number.isSafeInteger(Number(total))||Number(total)<0)return;
  const key='linercall-termo-earned-'+uid;
  const old=Math.max(0,Number(localStorage.getItem(key))||0);
  if(total>old){
   addCoins(total-old);
   localStorage.setItem(key,String(total));
  }
 }
 function localMarks(input,target){
  const marks=Array(5).fill('absent'),counts={};
  for(let i=0;i<5;i++){if(input[i]===target[i])marks[i]='correct';else counts[target[i]]=(counts[target[i]]||0)+1;}
  for(let i=0;i<5;i++){if(marks[i]!=='correct'&&counts[input[i]]>0){marks[i]='present';counts[input[i]]--;}}
  return marks;
 }
 function paint(){
  const guesses=state?.guesses||[];
  const board=el('#termo-board');if(!board)return;
  board.innerHTML=Array.from({length:6},(_,i)=>{
   const guess=guesses[i];
   return '<div class="termo-row">'+Array.from({length:5},(_,j)=>{
    const letter=guess?.word?.[j]?.toUpperCase()||'';
    const mark=guess?.marks?.[j]||'empty';
    return '<span class="termo-cell termo-'+esc(mark)+'">'+esc(letter)+'</span>';
   }).join('')+'</div>';
  }).join('');
  const disabled=state?.status!=='playing'||loading;
  el('#termo-form input').disabled=disabled;
  el('#termo-form button').disabled=disabled;
  if(state?.status==='won')info(practiceAnswer?'🎉 Palavra descoberta! Modo treino não concede LCoins.':'🎉 Você acertou! +60 LCoins registrados na sua conta. Veja o placar!');
  else if(state?.status==='lost')info('Fim das tentativas! A resposta era '+String(state.answer||'?????').toUpperCase()+'. Um novo desafio amanhã.');
  else info('Desafio '+String(state?.date||'')+' · '+String(state?.attemptsLeft??6)+' tentativas restantes.');
 }
 async function call(action,guess){
  const user=getUser();if(!user)throw Error('Entre na sua conta.');
  const token=await user.getIdToken();
  const response=await fetch('/api/termo',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,guess})});
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json.error||'Falha de conexão com o TERMO.');
  return json;
 }
 function scoreboard(date){
  sub?.();sub=null;
  const db=getDb();if(!db)return;
  sub=onSnapshot(collection(db,'termoDays',date,'winners'),snap=>{
   if(gone)return;
   const ranked=snap.docs.map(d=>d.data()).sort((a,b)=>(a.attempts||6)-(b.attempts||6)||((a.solvedAt?.seconds||0)-(b.solvedAt?.seconds||0))).slice(0,30);
   const target=el('#termo-rank');if(!target)return;
   target.innerHTML=ranked.length?ranked.map((p,i)=>'<div class="termo-rank-row"><b>#'+(i+1)+' '+esc(p.name||'Jogador')+'</b><span>'+Number(p.attempts||6)+'/6 tentativas</span></div>').join(''):'Ninguém acertou ainda. Seja o primeiro!';
  },error=>{if(!gone)el('#termo-rank').textContent='O placar requer regras do Firestore atualizadas.';console.warn('TERMO placar:',error);});
 }
 async function load(){
  loading=true;
  try{const response=await call('status');if(gone)return;state=response;grant(response.earnedTotal);paint();scoreboard(response.date);}
  catch(error){if(!gone){
   info(error.message+' Você pode jogar o modo treino sem moedas enquanto o servidor online não estiver pronto.');
   el('#termo-form button').disabled=true;
   const practice=document.createElement('button');practice.type='button';practice.className='btn';practice.textContent='🎮 Jogar treino local (sem LCoins)';
   practice.id='termo-practice';
   el('#termo-info').after(practice);
   practice.addEventListener('click',()=>{
    practice.remove();practiceAnswer=TERMO_WORDS[Math.floor(Math.random()*TERMO_WORDS.length)];
    state={status:'playing',guesses:[],date:'Treino local',attemptsLeft:6,reward:0,answer:null};
    paint();
   });
  }}
  finally{loading=false;}
 }
 const form=el('#termo-form');
 const onSubmit=async event=>{
  event.preventDefault();
  if(loading||gone||state?.status!=='playing')return;
  const input=el('#termo-form input');
  const guess=input.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  if(!/^[a-z]{5}$/.test(guess)){info('Digite cinco letras.');return;}
  loading=true;el('#termo-form button').disabled=true;
  try{let response;
   if(practiceAnswer){
    const guesses=(state.guesses||[]).concat([{word:guess,marks:localMarks(guess,practiceAnswer)}]);
    const status=guess===practiceAnswer?'won':guesses.length>=6?'lost':'playing';
    response={status,guesses,date:'Treino local',attemptsLeft:6-guesses.length,answer:status==='playing'?null:practiceAnswer,reward:0,earnedTotal:0};
   }else response=await call('guess',guess);
   if(gone)return;state=response;if(!practiceAnswer)grant(response.earnedTotal);input.value='';paint();}
  catch(error){if(!gone)info(error.message);}
  finally{loading=false;if(!gone&&state?.status==='playing'){el('#termo-form button').disabled=false;input.focus();}}
 };
 form.addEventListener('submit',onSubmit);
 load();
 return ()=>{gone=true;sub?.();form.removeEventListener('submit',onSubmit);};
}

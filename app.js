import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const configured = firebaseConfig.apiKey !== 'COLE_SUA_API_KEY' && firebaseConfig.projectId !== 'SEU-PROJETO';
let auth, db, functions, currentUser = null, profile = null, stopListeners = [], jitsiApi = null, reactionTimer = null, reactionStart = 0, reactionReady = false;
const provider = new GoogleAuthProvider();

function toast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2800); }
function initials(name='L'){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'L';}
function safeText(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showAuthStatus(msg,error=false){$('auth-status').textContent=msg;$('auth-status').style.color=error?'#ff8997':'';}
function setUserUI(){const name=profile?.displayName||currentUser.displayName||'Jogador';$('side-name').textContent=name;$('side-avatar').textContent=initials(name);$('top-avatar').textContent=initials(name);$('settings-avatar').textContent=initials(name);$('settings-email').textContent=currentUser.email;$('display-name').value=name;}
function cleanupListeners(){stopListeners.forEach(fn=>fn());stopListeners=[];}


async function login(){
  if(!configured){
    showAuthStatus('Falta configurar o Firebase. Veja o README do projeto.',true);
    return;
  }

  const code = $('invite-code').value.trim();

  if(!code){
    showAuthStatus('Digite o código de acesso do servidor.',true);
    return;
  }

  $('google-login').disabled = true;
  showAuthStatus('Validando o código...');

  try{
    const response = await fetch('/api/validateInviteCode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();

    if(!response.ok){
      throw new Error(data.error || 'Código de acesso inválido.');
    }

    showAuthStatus('Código válido. Abrindo o Google...');

    const result = await signInWithPopup(auth,provider);

    if(!result.user.email?.toLowerCase().endsWith('@gmail.com')){
      await signOut(auth);
      throw new Error('Use uma conta @gmail.com para entrar.');
    }

  }catch(error){
    console.error(error);
    showAuthStatus(error.message || 'Não foi possível entrar.',true);
  }finally{
    $('google-login').disabled = false;
  }
}

async function startApp(user){
  currentUser=user;
  const userRef=doc(db,'users',user.uid);const snap=await getDoc(userRef);
  if(!snap.exists()){
    profile={displayName:user.displayName||'Jogador',email:user.email,wins:0,losses:0,createdAt:serverTimestamp(),lastSeen:serverTimestamp()};
    await setDoc(userRef,profile);
  }else profile=snap.data();
  await updateDoc(userRef,{lastSeen:serverTimestamp()});
  $('auth-screen').classList.add('hidden');$('app-shell').classList.remove('hidden');setUserUI();
  listenChat();listenUsers();listenRanking();listenChallenges();
  const presence=setInterval(()=>{if(currentUser)updateDoc(userRef,{lastSeen:serverTimestamp()}).catch(()=>{});},60000);stopListeners.push(()=>clearInterval(presence));
}

function listenChat(){
  const q=query(collection(db,'messages'),orderBy('createdAt','desc'),limit(70));
  stopListeners.push(onSnapshot(q,snap=>{const rows=snap.docs.reverse();$('chat-messages').innerHTML=rows.length?rows.map(d=>{const m=d.data();const date=m.createdAt?.toDate?.();return `<div class="message"><div class="avatar">${safeText(initials(m.displayName))}</div><div class="message-body"><div class="message-meta"><b>${safeText(m.displayName||'Jogador')}</b><time>${date?date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'agora'}</time></div><div class="message-text">${safeText(m.text)}</div></div></div>`;}).join(''):'<div class="empty-state">Seja a primeira pessoa a mandar uma mensagem.</div>';$('chat-messages').scrollTop=$('chat-messages').scrollHeight;},err=>toast('Erro ao carregar chat: '+err.message)));
}
async function sendMessage(e){e.preventDefault();const input=$('chat-input'),text=input.value.trim();if(!text||!currentUser)return;input.value='';try{await addDoc(collection(db,'messages'),{uid:currentUser.uid,displayName:profile.displayName||'Jogador',text,createdAt:serverTimestamp()});}catch(err){input.value=text;toast('Não foi possível enviar a mensagem.');}}
function listenUsers(){
  const q=query(collection(db,'users'),orderBy('lastSeen','desc'),limit(50));
  stopListeners.push(onSnapshot(q,snap=>{const active=snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.lastSeen?.toDate&&Date.now()-u.lastSeen.toDate().getTime()<3*60*1000);$('online-count').textContent=active.length;$('online-members').innerHTML=active.length?active.slice(0,9).map(u=>`<div class="member-row"><div class="avatar">${safeText(initials(u.displayName))}</div><b>${safeText(u.displayName||'Jogador')}</b><small>online</small></div>`).join(''):'<p class="muted">Ninguém online por enquanto.</p>';$('arena-members').innerHTML=active.filter(u=>u.id!==currentUser.uid).map(u=>`<div class="arena-player"><div class="avatar">${safeText(initials(u.displayName))}</div><b>${safeText(u.displayName||'Jogador')}</b><small>● online</small><button class="duel-btn" data-challenge="${u.id}" data-name="${safeText(u.displayName||'Jogador')}">Desafiar</button></div>`).join('')||'<p class="muted">Nenhum outro jogador online agora.</p>';},err=>toast('Erro ao buscar membros.')));
}
function listenRanking(){const q=query(collection(db,'users'),orderBy('wins','desc'),limit(50));stopListeners.push(onSnapshot(q,snap=>{const users=snap.docs.map(d=>({id:d.id,...d.data()}));const top=users.slice(0,3);$('podium').innerHTML=top.length?top.map((u,i)=>`<div class="podium-place ${i===0?'first':i===1?'second':'third'}"><div class="avatar">${safeText(initials(u.displayName))}</div><b>${safeText(u.displayName||'Jogador')}</b><small>${u.wins||0} vitórias</small><div class="podium-block">${i+1}º</div></div>`).join(''):'<div class="podium-empty">O pódio está esperando os primeiros campeões.</div>';$('ranking-list').innerHTML=users.map((u,i)=>`<div class="ranking-row"><span>${i+1}</span><span class="rank-name"><span class="avatar">${safeText(initials(u.displayName))}</span>${safeText(u.displayName||'Jogador')}${u.id===currentUser.uid?' (você)':''}</span><span class="wins">${u.wins||0}</span><span class="losses">${u.losses||0}</span></div>`).join('')||'<p class="muted">Ainda não há jogadores no ranking.</p>';},err=>toast('Erro ao carregar ranking.')));}
function listenChallenges(){const q=query(collection(db,'challenges'),where('toUid','==',currentUser.uid),limit(30));stopListeners.push(onSnapshot(q,snap=>{const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));const pending=rows.filter(x=>x.status==='pending');$('challenge-inbox').innerHTML=pending.map(c=>`<div class="challenge-row"><div><p><b>${safeText(c.fromName)}</b> te desafiou!</p><small>Duelo de dados · melhor de um</small></div><div class="challenge-actions"><button class="accept-btn" data-accept="${c.id}">Aceitar</button><button class="reject-btn" data-reject="${c.id}">Recusar</button></div></div>`).join('')||'<p class="muted">Nenhum desafio recebido.</p>';const done=rows.filter(x=>x.status==='done'||x.status==='declined');$('challenge-history').innerHTML=done.slice(0,6).map(c=>`<div class="challenge-row"><div><p>${safeText(c.fromName)} × ${safeText(c.toName)}</p><small>${c.status==='done'?`Resultado: ${c.resultText||'finalizado'}`:'Desafio recusado'}</small></div><span class="muted">${c.status==='done'?'⚔':'—'}</span></div>`).join('')||'<p class="muted">Seus duelos aparecerão aqui.</p>';},err=>console.warn(err)));
}
async function challengePlayer(uid,name){try{await addDoc(collection(db,'challenges'),{fromUid:currentUser.uid,fromName:profile.displayName||'Jogador',toUid:uid,toName:name,status:'pending',createdAt:serverTimestamp()});toast('Desafio enviado para '+name+'!');}catch(e){toast('Não foi possível enviar o desafio.');}}
async function answerChallenge(id,accept){try{const fn=httpsCallable(functions,accept?'acceptChallenge':'declineChallenge');const result=await fn({challengeId:id});if(accept)toast(result.data?.message||'Duelo resolvido!');else toast('Desafio recusado.');}catch(e){toast(e.message||'Não foi possível responder ao desafio.');}}

function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$('view-'+name).classList.add('active-view');document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const labels={chat:'CHAT GERAL',calls:'SALAS DE VOZ',games:'MINIGAMES',arena:'DESAFIOS',ranking:'RANKING',settings:'CONFIGURAÇÕES'};const headings={chat:'Ponto de encontro.',calls:'Sua voz, sua galera.',games:'Hora de jogar.',arena:'Bora competir?',ranking:'Quem está no topo?',settings:'Seu espaço.'};$('crumb-current').textContent=labels[name];$('page-heading').textContent=headings[name];}
function joinCall(room){$('call-stage').classList.remove('hidden');$('call-room-title').textContent=room==='resenha-geral'?'Resenha geral':'Partidas & desafios';$('call-stage').scrollIntoView({behavior:'smooth',block:'start'});if(jitsiApi){jitsiApi.dispose();jitsiApi=null;}$('jitsi-container').innerHTML='';const scriptUrl='https://meet.jit.si/external_api.js';const start=()=>{jitsiApi=new window.JitsiMeetExternalAPI('meet.jit.si',{roomName:'LinerCalls-Community-'+room+'-MainRoom',parentNode:$('jitsi-container'),width:'100%',height:'100%',configOverwrite:{prejoinPageEnabled:true,enableWelcomePage:false},interfaceConfigOverwrite:{SHOW_JITSI_WATERMARK:false,SHOW_BRAND_WATERMARK:false,TOOLBAR_BUTTONS:['microphone','camera','desktop','chat','raisehand','tileview','hangup','settings','fullscreen']}});};if(window.JitsiMeetExternalAPI)start();else{const s=document.createElement('script');s.src=scriptUrl;s.onload=start;s.onerror=()=>toast('Não foi possível carregar a sala de voz.');document.head.appendChild(s);}}
function leaveCall(){if(jitsiApi){jitsiApi.dispose();jitsiApi=null;}$('call-stage').classList.add('hidden');$('jitsi-container').innerHTML='';}
function showDice(){ $('game-title').textContent='Dados do caos';$('game-content').innerHTML='<p class="muted">Um dado de 20 lados. Um lançamento. Qual será seu resultado?</p><div class="game-big">🎲</div><div id="dice-result" class="game-result">—</div><button id="roll-dice" class="btn btn-primary game-action">Lançar dado</button>'; $('game-stage').classList.remove('hidden');$('roll-dice').onclick=()=>{const n=Math.floor(Math.random()*20)+1;$('dice-result').textContent='Você tirou '+n+'!';$('game-big')?.classList.add('roll');};$('game-stage').scrollIntoView({behavior:'smooth'});}
function showReaction(){ $('game-title').textContent='Teste de reflexo';$('game-content').innerHTML='<p id="reaction-instructions" class="muted">Clique em começar e espere a tela ficar verde. Não se adiante!</p><button id="reaction-button" class="btn btn-primary game-action">Começar</button><div id="reaction-result" class="game-result"></div>'; $('game-stage').classList.remove('hidden');$('reaction-button').onclick=()=>{if(!reactionReady){clearTimeout(reactionTimer);reactionReady=false;$('reaction-button').disabled=true;$('reaction-button').textContent='Espere...';$('reaction-button').style.background='#b85c76';$('reaction-instructions').textContent='Aguarde o sinal verde...';reactionTimer=setTimeout(()=>{reactionReady=true;reactionStart=performance.now();$('reaction-button').disabled=false;$('reaction-button').textContent='CLIQUE AGORA!';$('reaction-button').style.background='#62e6a5';$('reaction-instructions').textContent='AGORA!';},1200+Math.random()*3500);}else{const ms=Math.round(performance.now()-reactionStart);reactionReady=false;$('reaction-button').textContent='Tentar novamente';$('reaction-button').style.background='';$('reaction-result').textContent=ms+' ms';$('reaction-instructions').textContent=ms<250?'Reflexos absurdos!':ms<400?'Boa! Dá para melhorar.':'Você consegue mais rápido.';}};}
async function saveProfile(e){e.preventDefault();const name=$('display-name').value.trim();if(name.length<2){toast('Escolha um nome com pelo menos 2 caracteres.');return;}try{await updateDoc(doc(db,'users',currentUser.uid),{displayName:name});profile.displayName=name;setUserUI();$('profile-status').textContent='Perfil atualizado!';toast('Perfil salvo.');}catch(e){toast('Não foi possível salvar o perfil.');}}
async function logout(){cleanupListeners();leaveCall();await signOut(auth);$('app-shell').classList.add('hidden');$('auth-screen').classList.remove('hidden');}

$('google-login').addEventListener('click',login);$('chat-form').addEventListener('submit',sendMessage);$('profile-form').addEventListener('submit',saveProfile);$('logout').addEventListener('click',logout);$('leave-call').addEventListener('click',leaveCall);$('close-game').addEventListener('click',()=>$('game-stage').classList.add('hidden'));$('play-dice').addEventListener('click',showDice);$('play-reaction').addEventListener('click',showReaction);
document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.go)));document.querySelectorAll('.join-room').forEach(b=>b.addEventListener('click',()=>joinCall(b.dataset.room)));
document.addEventListener('click',e=>{const duel=e.target.closest('[data-challenge]');if(duel)challengePlayer(duel.dataset.challenge,duel.dataset.name);const accept=e.target.closest('[data-accept]');if(accept)answerChallenge(accept.dataset.accept,true);const reject=e.target.closest('[data-reject]');if(reject)answerChallenge(reject.dataset.reject,false);});

if(configured){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);functions=getFunctions(app);onAuthStateChanged(auth,user=>{if(user){if(!user.email?.toLowerCase().endsWith('@gmail.com')){signOut(auth);showAuthStatus('Entre com uma conta @gmail.com.',true);return;}startApp(user).catch(e=>{console.error(e);toast('Erro ao abrir sua conta. Confira as regras do Firebase.');});}else{currentUser=null;cleanupListeners();}});}else{showAuthStatus('Configure o Firebase para ativar o login e os recursos online.',true);}


import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

import { firebaseConfig } from './firebase-config.js';

// ========================================
// CONFIGURAÇÃO GERAL
// ========================================

const $ = id => document.getElementById(id);

const configured =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'COLE_SUA_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'SEU-PROJETO';

let auth = null;
let db = null;
let currentUser = null;
let profile = null;
let stopListeners = [];
let jitsiApi = null;
let reactionTimer = null;
let reactionStart = 0;
let reactionReady = false;
let cinemaItems = [];

const provider = new GoogleAuthProvider();

const MY_LIST_KEY = 'linercalls-my-list';

const LANGUAGE_KEY = 'linercalls-language';
const UI_TRANSLATIONS = {
'Início':'Home','Chat geral':'General chat','Salas de voz':'Voice rooms','Minigames':'Minigames','Ranking':'Leaderboard','Loja':'Shop','Configurações':'Settings',
'Boas-Vindas ao':'Welcome to','Use o menu lateral para navegar':'Use the sidebar to navigate','Ponto de encontro.':'Your community hub.','Sua voz, sua galera.':'Your voice, your people.','Hora de jogar.':'Time to play.','Quem está no topo?':'Who is at the top?','Seu espaço.':'Your space.','Seu estilo, suas regras.':'Your style, your rules.','Seu cinema começa aqui.':'Your cinema starts here.',
'Configurações.':'Settings.','SUA CONTA':'YOUR ACCOUNT','Personalize como você aparece na comunidade.':'Customize how you appear in the community.','Nome de exibição':'Display name','Como a galera vai te chamar?':'What should people call you?','Salvar perfil →':'Save profile →',
'Catálogo completo':'Full catalog','Minha lista':'My list','Explorar catálogo →':'Explore catalog →','Seu próximo filme começa aqui.':'Your next movie starts here.','Descubra, explore e monte sua lista.':'Discover, explore, and build your list.',
'BEM-VINDO AO':'WELCOME TO','Filmes e séries para descobrir. Reprodução disponível em breve.':'Movies and shows to discover. Playback coming soon.','Em destaque':'Featured','Filmes':'Movies','Séries':'TV Shows','Tudo':'All','SUA COLEÇÃO':'YOUR COLLECTION','BIBLIOTECA LIGHTYFLIX':'LIGHTYFLIX LIBRARY','Temporadas e episódios':'Seasons & Episodes','Títulos semelhantes':'Similar titles','episódios':'episodes','Episódio ':'Episode ','Temporada 1':'Season 1','Temporada 2':'Season 2','Temporada 3':'Season 3','Temporada 4':'Season 4','Temporada 5':'Season 5','Temporada 6':'Season 6','Todos os filmes e séries em um só lugar.':'All movies and shows in one place.','Sua lista está vazia. Adicione conteúdos para encontrá-los aqui.':'Your list is empty. Add titles to find them here.',
'Remover da lista':'Remove from list','+ Minha lista':'+ My List','✓ Remover da lista':'✓ Remove from list','◷ Em breve':'◷ Coming soon',
'Entre na':'Join your','sua comunidade.':'community.','Código de acesso':'Access code','Digite seu código de acesso':'Enter your access code','Continuar com Google':'Continue with Google','ACESSO PRIVADO':'PRIVATE ACCESS',
'Idioma / Language':'Language / Idioma','Escolha o idioma de toda a interface do LinerCall.':'Choose the language for the entire LinerCall interface.','Idioma da interface':'Interface language','A alteração é salva neste dispositivo.':'This change is saved on this device.',
'ENTRETENIMENTO':'ENTERTAINMENT','JOGAR':'PLAY','COMUNIDADE':'COMMUNITY','HALL DA FAMA':'HALL OF FAME','Placar de líderes.':'Leaderboard.','As vitórias registradas nesta semana, em um só lugar.':'This week’s recorded wins, all in one place.'
};
function getLanguage(){return localStorage.getItem(LANGUAGE_KEY)||'pt';}
function applyLanguage(){
 const lang=getLanguage();document.documentElement.lang=lang==='en'?'en':'pt-BR';
 document.querySelectorAll('#site-language').forEach(s=>s.value=lang);
 if(lang==='pt')return;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(node=>{const raw=node.nodeValue,trim=raw.trim();if(UI_TRANSLATIONS[trim])node.nodeValue=raw.replace(trim,UI_TRANSLATIONS[trim]);});
 document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(attr=>{const v=el.getAttribute(attr);if(UI_TRANSLATIONS[v])el.setAttribute(attr,UI_TRANSLATIONS[v]);}));
}


function toast(message) {
  const el = $('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
}

function initials(name = 'L') {
  return String(name).trim().split(/\s+/)
    .slice(0, 2)
    .map(x => x[0] || '')
    .join('')
    .toUpperCase() || 'L';
}

function safeText(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function showAuthStatus(message, error = false) {
  const el = $('auth-status');
  if (!el) return;

  el.textContent = message;
  el.style.color = error ? '#ff8997' : '';
}

function cleanupListeners() {
  stopListeners.forEach(fn => {
    try { fn(); } catch (error) { console.warn(error); }
  });

  stopListeners = [];
}

function setUserUI() {
  if (!currentUser) return;

  const name = profile?.displayName || currentUser.displayName || 'Jogador';

  if ($('side-name')) $('side-name').textContent = name;
  if ($('side-avatar')) $('side-avatar').textContent = initials(name);
  if ($('top-avatar')) $('top-avatar').textContent = initials(name);
  if ($('settings-avatar')) $('settings-avatar').textContent = initials(name);
  if ($('settings-email')) $('settings-email').textContent = currentUser.email || '';
  if ($('display-name')) $('display-name').value = name;
  applyShopCosmetics();
}

// ========================================
// LOGIN E AUTENTICAÇÃO
// ========================================

async function login() {
  if (!configured || !auth) {
    showAuthStatus('O Firebase ainda não está configurado.', true);
    return;
  }

  const code = $('invite-code')?.value.trim();

  if (!code) {
    showAuthStatus('Digite o código de acesso.', true);
    return;
  }

  const button = $('google-login');
  if (button) button.disabled = true;

  try {
    // Abra o popup imediatamente no clique do usuário.
    // Esperar uma chamada fetch antes disso pode fazer o navegador bloquear a janela.
    showAuthStatus('Abrindo o Google...');
    const result = await signInWithPopup(auth, provider);

    if (!result.user.email?.toLowerCase().endsWith('@gmail.com')) {
      await signOut(auth);
      throw new Error('Entre com uma conta @gmail.com.');
    }

    showAuthStatus('Google conectado! Validando o código de acesso...');

    const response = await fetch('/api/validateInviteCode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      await signOut(auth);
      throw new Error('O servidor retornou uma resposta inválida.');
    }

    if (!response.ok) {
      await signOut(auth);
      throw new Error(data.error || 'Código de acesso inválido.');
    }

    showAuthStatus('Acesso autorizado! Carregando sua comunidade...');

  } catch (error) {
    console.error('Erro no login:', error);

    const messages = {
      'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.',
      'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir o login.',
      'auth/cancelled-popup-request': 'Já existe uma janela de login aberta. Conclua essa janela.',
      'auth/unauthorized-domain': 'Este domínio ainda não está autorizado no Firebase Authentication.',
      'auth/operation-not-allowed': 'O login com Google não está ativado no Firebase Authentication.',
      'auth/network-request-failed': 'Falha de conexão. Confira sua internet e tente novamente.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'
    };

    const detail = error.code ? ` [${error.code}]` : '';
    showAuthStatus(
      messages[error.code] || `Falha no login${detail}: ${error.message || 'erro desconhecido'}`,
      true
    );
  } finally {
    if (button) button.disabled = false;
  }
}

async function logout() {
  if (!auth) return;

  try {
    if (jitsiApi) leaveCall();

    cleanupListeners();
    await signOut(auth);

    currentUser = null;
    profile = null;

    $('app-shell')?.classList.add('hidden');
    $('auth-screen')?.classList.remove('hidden');

    toast('Você saiu da comunidade.');
  } catch (error) {
    console.error(error);
    toast('Não foi possível sair da conta.');
  }
}

async function startApp(user) {
  currentUser = user;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    profile = {
      displayName: user.displayName || 'Jogador',
      wins: 0,
      losses: 0,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    await setDoc(userRef, profile);
  } else {
    profile = snap.data();
  }

  if (user.photoURL && !profile.photoURL) {
    try { await updateDoc(userRef, { photoURL: user.photoURL }); profile = { ...profile, photoURL: user.photoURL }; }
    catch (error) { console.warn('Não foi possível publicar a foto Google no perfil:', error); }
  }

  await updateDoc(userRef, {
    lastSeen: serverTimestamp()
  });

  $('auth-screen')?.classList.add('hidden');
  $('app-shell')?.classList.remove('hidden');
  switchView('welcome');

  setUserUI();
  if(localStorage.getItem('linercall-sidebar-collapsed')==='1')$('app-shell')?.classList.add('sidebar-collapsed');

  listenChat();
  listenFriends();
  listenUsers();
  listenRanking();
  listenChallenges();
  initPokemonArena();
  shopState = loadShopState();
  renderShop();
  applyShopCosmetics();
  loadCinema();

  const presence = setInterval(() => {
    if (currentUser) {
      updateDoc(userRef, {
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
  }, 60000);

  stopListeners.push(() => clearInterval(presence));
}

// ========================================
// NAVEGAÇÃO
// ========================================

function createCinemaPage() {
  const sidebar=document.querySelector('.sidebar'),main=document.querySelector('.main-area');
  if(!sidebar||!main)return;
  if(!document.querySelector('[data-view="cinema"]')){
    const label=document.createElement('div');label.className='nav-label';label.textContent='ENTRETENIMENTO';
    const button=document.createElement('button');button.className='nav-item';button.dataset.view='cinema';button.innerHTML='<span>🎬</span> LightyFlix <i></i>';
    const bottom=sidebar.querySelector('.sidebar-bottom');if(bottom){sidebar.insertBefore(label,bottom);sidebar.insertBefore(button,bottom);}
  }
  if(!$('view-cinema')){
    const section=document.createElement('section');section.id='view-cinema';section.className='view';
    section.innerHTML=`
      <div class="section-intro"><div><span class="eyebrow">CINEMA DA COMUNIDADE</span><h2>Seu próximo filme começa aqui.</h2><p>Descubra, explore e monte sua lista.</p></div><span class="pixel-badge">LIGHTYFLIX</span></div>
      <div class="cinema-hero panel"><div class="cinema-hero-content"><span class="eyebrow">BEM-VINDO AO</span><h1>LIGHTYFLIX</h1><p>Filmes e séries para descobrir. Reprodução disponível em breve.</p><button class="btn btn-primary" id="cinema-explore">Explorar catálogo →</button></div></div>
      <div class="cinema-view-tabs"><button class="active" data-cinema-tab="home">Início</button><button data-cinema-tab="all">Catálogo completo <span id="cinema-total-count">0</span></button><button data-cinema-tab="list">Minha lista <span id="cinema-list-count">0</span></button></div>
      <div id="cinema-home-view">
        <section class="cinema-section"><div class="cinema-row-head"><div><span class="eyebrow">ESCOLHIDOS PARA VOCÊ</span><h3>Em destaque</h3></div><div class="cinema-row-arrows"><button data-cinema-scroll="cinema-featured">‹</button><button data-cinema-scroll="cinema-featured" data-direction="next">›</button></div></div><div id="cinema-featured" class="cinema-row"><div class="empty-state">Carregando...</div></div></section>
        <section class="cinema-section"><div class="cinema-row-head"><div><span class="eyebrow">DESCUBRA</span><h3>Filmes</h3></div><div class="cinema-row-arrows"><button data-cinema-scroll="cinema-movies">‹</button><button data-cinema-scroll="cinema-movies" data-direction="next">›</button></div></div><div id="cinema-movies" class="cinema-row"><div class="empty-state">Carregando...</div></div></section>
        <section class="cinema-section"><div class="cinema-row-head"><div><span class="eyebrow">MARATONAS</span><h3>Séries</h3></div><div class="cinema-row-arrows"><button data-cinema-scroll="cinema-series">‹</button><button data-cinema-scroll="cinema-series" data-direction="next">›</button></div></div><div id="cinema-series" class="cinema-row"><div class="empty-state">Carregando...</div></div></section>
        <section class="cinema-section"><div class="cinema-row-head"><div><span class="eyebrow">SUA COLEÇÃO</span><h3>Minha lista</h3></div><div class="cinema-row-arrows"><button data-cinema-scroll="cinema-my-list">‹</button><button data-cinema-scroll="cinema-my-list" data-direction="next">›</button></div></div><div id="cinema-my-list" class="cinema-row"><div class="empty-state">Sua lista está vazia.</div></div></section>
      </div>
      <div id="cinema-all-view" class="hidden"><div class="cinema-all-heading"><div><span class="eyebrow">BIBLIOTECA LIGHTYFLIX</span><h2>Catálogo completo</h2><p>Todos os filmes e séries em um só lugar.</p></div><div class="cinema-filters"><button class="active" data-cinema-filter="all">Tudo</button><button data-cinema-filter="movie">Filmes</button><button data-cinema-filter="series">Séries</button></div></div><div id="cinema-all-grid" class="cinema-all-grid"></div></div><div id="cinema-list-view" class="hidden"><div class="cinema-all-heading"><div><span class="eyebrow">SUA COLEÇÃO</span><h2>Minha lista</h2><p>Os filmes e séries que você guardou.</p></div></div><div id="cinema-list-grid" class="cinema-all-grid"></div></div>
      <div id="cinema-details" class="cinema-modal hidden" role="dialog" aria-modal="true" aria-label="Detalhes do conteúdo"><div class="cinema-modal-backdrop" data-cinema-close></div><article class="cinema-detail-card"><button class="cinema-detail-close" data-cinema-close aria-label="Fechar">×</button><div class="cinema-detail-backdrop" id="cinema-detail-backdrop"></div><div class="cinema-detail-content"><img id="cinema-detail-poster" class="cinema-detail-poster" alt=""><div class="cinema-detail-info"><span class="eyebrow" id="cinema-detail-type">FILME</span><h2 id="cinema-detail-title"></h2><div class="cinema-detail-meta" id="cinema-detail-meta"></div><p id="cinema-detail-description"></p><div id="cinema-episodes" class="cinema-episodes"></div><div id="cinema-related" class="cinema-related"></div><div class="cinema-detail-actions"><button class="btn btn-primary" id="cinema-detail-buy">Comprar</button><button class="btn" id="cinema-detail-list">+ Minha lista</button></div></div></div></article></div>
      <div id="cinema-player" class="panel hidden" style="margin-top:25px;padding:20px;"><div class="panel-head"><div><span class="eyebrow">REPRODUZINDO</span><h3 id="cinema-player-title">Conteúdo</h3></div><button class="btn btn-danger" id="cinema-close-player">Fechar</button></div><div id="cinema-player-content"></div></div>`;
    const footer=main.querySelector('.app-footer');main.insertBefore(section,footer||null);
  }
  const explore=$('cinema-explore');if(explore)explore.onclick=()=>setCinemaTab('all');
  const closePlayer=$('cinema-close-player');if(closePlayer)closePlayer.onclick=closeCinemaPlayer;
}

function buildSidebarNavigation() {
  // Navegação lateral restaurada ao formato original, sem grupos expansíveis.
  return;
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.dataset.groupedNavigation === 'true') return;

  const bottom = sidebar.querySelector('.sidebar-bottom');
  const get = view => sidebar.querySelector(`.nav-item[data-view="${view}"]`);
  const home = get('welcome');
  const chatText = get('chat');
  const chatVoice = get('calls');
  const games = get('games');
  const ranking = get('ranking');
  const shop = get('shop');
  const cinema = get('cinema');
  if (![home, chatText, chatVoice, games, ranking, shop, cinema].every(Boolean)) return;

  sidebar.querySelectorAll(':scope > .nav-label, :scope > .nav-item').forEach(el => {
    if (el !== home && el !== chatText && el !== chatVoice && el !== games && el !== ranking && el !== shop && el !== cinema) el.remove();
  });

  const makeGroup = (key, title, icon, items) => {
    const group = document.createElement('div');
    group.className = 'nav-group';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-group-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span class="nav-group-icon">${icon}</span><span>${title}</span><span class="nav-group-chevron">⌄</span>`;
    const submenu = document.createElement('div');
    submenu.className = 'nav-submenu';
    submenu.hidden = true;
    toggle.addEventListener('click', () => {
      const opening = submenu.hidden;
      sidebar.querySelectorAll('.nav-submenu').forEach(menu => { menu.hidden = true; menu.previousElementSibling?.setAttribute('aria-expanded', 'false'); });
      submenu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
    });
    items.forEach(item => submenu.appendChild(item));
    group.append(toggle, submenu);
    return group;
  };

  const entertainment = makeGroup('entertainment', 'Entretenimento', '✦', [shop, cinema, home]);
  const gamesGroup = makeGroup('games', 'Jogo', '▣', [ranking, games]);
  const chatGroup = makeGroup('chat', 'Chat', '◉', [chatVoice, chatText]);
  [entertainment, gamesGroup, chatGroup].forEach(group => sidebar.insertBefore(group, bottom));
  sidebar.dataset.groupedNavigation = 'true';
}


/* AMIGOS E MENSAGENS PRIVADAS */
let activeFriendId = null;
let stopFriendListeners = [];
function friendPairId(a,b){return [a,b].sort().join('_');}
function listenFriends(){
  stopFriendListeners.forEach(fn=>fn()); stopFriendListeners=[];
  const rq=query(collection(db,'friendRequests'),where('toUid','==',currentUser.uid));
  stopFriendListeners.push(onSnapshot(rq,snap=>{
    const box=$('friend-requests'); if(!box)return;
    const pending=snap.docs.filter(d=>d.data().status==='pending');
    box.innerHTML=!pending.length?'<p class="muted">Nenhum pedido recebido.</p>':pending.map(d=>{
      const r=d.data();return '<div class="friend-row"><b>'+safeText(r.fromName)+'</b><div><button class="btn btn-primary" data-friend-accept="'+d.id+'">Aceitar</button> <button class="btn" data-friend-reject="'+d.id+'">Recusar</button></div></div>';
    }).join('');
  },e=>{console.error(e);toast('Não foi possível carregar pedidos.');}));
  const fq=query(collection(db,'friendships'),where('uids','array-contains',currentUser.uid));
  stopFriendListeners.push(onSnapshot(fq,snap=>{
    const box=$('friends-list');if(!box)return;
    box.innerHTML=snap.empty?'<p class="muted">Você ainda não adicionou amigos.</p>':snap.docs.map(d=>{
      const f=d.data(),other=f.uids.find(uid=>uid!==currentUser.uid),name=f.names?.[other]||'Jogador';
      return '<button class="friend-row friend-open" data-friend-open="'+safeText(other)+'" data-friend-name="'+safeText(name)+'"><span>● '+safeText(name)+'</span><small>Abrir conversa →</small></button>';
    }).join('');
  },e=>{console.error(e);toast('Não foi possível carregar amigos.');}));
}
async function searchFriend(){
  const term=$('friend-search-input')?.value.trim().toLocaleLowerCase('pt-BR'),box=$('friend-search-result');
  if(!term||term.length<2){box.textContent='Digite o nome de exibição completo (mínimo 2 caracteres).';return;}
  box.textContent='Buscando...';
  try{
    const snap=await getDocs(query(collection(db,'users'),limit(100)));
    const matches=snap.docs.filter(d=>d.id!==currentUser.uid && String(d.data().displayName||'').trim().toLocaleLowerCase('pt-BR')===term).slice(0,8);
    box.innerHTML=matches.length?matches.map(d=>'<div class="friend-row"><b>'+safeText(d.data().displayName||'Jogador')+'</b><button class="btn btn-primary" data-friend-add="'+d.id+'" data-friend-add-name="'+safeText(d.data().displayName||'Jogador')+'">Adicionar</button></div>').join(''):'<p class="muted">Ninguém encontrado com esse nome exato.</p>';
  }catch(e){console.error(e);box.textContent='Falha na busca. Confira as regras do Firestore.';}
}
async function sendFriendRequest(uid,name){
  if(!uid||uid===currentUser.uid)return;
  try{
    const existing=await getDocs(query(collection(db,'friendships'),where('uids','array-contains',currentUser.uid)));
    if(existing.docs.some(d=>d.data().uids.includes(uid))){toast('Vocês já são amigos.');return;}
    await addDoc(collection(db,'friendRequests'),{fromUid:currentUser.uid,fromName:profile?.displayName||'Jogador',toUid:uid,toName:name,status:'pending',createdAt:serverTimestamp()});
    toast('Pedido de amizade enviado!');
  }catch(e){console.error('Falha ao enviar pedido:',e);toast(e.code==='permission-denied'?'O Firebase ainda não recebeu as novas regras de amizade.':'Não foi possível enviar o pedido: '+(e.code||'erro'));}
}
async function answerFriendRequest(requestId,accept){
  try{
    const ref=doc(db,'friendRequests',requestId),snap=await getDoc(ref);
    if(!snap.exists()||snap.data().toUid!==currentUser.uid||snap.data().status!=='pending')return;
    const r=snap.data();
    if(accept){
      const uids=[r.fromUid,r.toUid].sort(),names={[r.fromUid]:r.fromName,[r.toUid]:r.toName};
      await setDoc(doc(db,'friendships',friendPairId(...uids)),{uids,names,requestId,createdAt:serverTimestamp()});
    }
    await updateDoc(ref,{status:accept?'accepted':'rejected'});
    if(accept){
      const rewardKey='linercall-friend-reward-'+friendPairId(r.fromUid,r.toUid);
      if(!localStorage.getItem(rewardKey)){
        pokemonArena=pokemonArena||loadPokemonArena();
        pokemonArena.coins=(Number(pokemonArena.coins)||0)+10;
        savePokemonArena();
        localStorage.setItem(rewardKey,'1');
        renderPokemonArena();renderShop();
        toast('Amizade adicionada! +10 LCoins');
      } else toast('Amizade adicionada!');
    } else toast('Pedido recusado.');
  }catch(e){console.error(e);toast('Não foi possível responder ao pedido.');}
}
function openDirectMessage(uid,name){
  activeFriendId=uid;
  setPresence('private_chat','Em chat privado com '+name);$('dm-title').textContent='Conversa com '+name;$('dm-panel').classList.remove('hidden');
  $('dm-messages').innerHTML='<p class="muted">Carregando mensagens...</p>';
  if(window.stopDMListener)window.stopDMListener();
  const path=collection(db,'conversations',friendPairId(currentUser.uid,uid),'messages');
  window.stopDMListener=onSnapshot(query(path,orderBy('createdAt','asc'),limit(100)),snap=>{
    $('dm-messages').innerHTML=snap.empty?'<p class="muted">Diga oi! Esta conversa é privada entre vocês.</p>':snap.docs.map(d=>{
      const m=d.data();return '<div class="dm-bubble '+(m.uid===currentUser.uid?'own':'')+'"><b>'+safeText(m.displayName)+'</b><p>'+safeText(m.text)+'</p></div>';
    }).join('');
    $('dm-messages').scrollTop=$('dm-messages').scrollHeight;
  },e=>{console.error(e);$('dm-messages').textContent='Não foi possível abrir esta conversa.';});
}
async function sendDirectMessage(event){
  event.preventDefault();const input=$('dm-input'),value=input.value.trim();
  if(!value||!activeFriendId)return;if(value.length>1000){toast('A mensagem é muito longa.');return;}
  try{
    await addDoc(collection(db,'conversations',friendPairId(currentUser.uid,activeFriendId),'messages'),{uid:currentUser.uid,displayName:profile?.displayName||'Jogador',text:value,createdAt:serverTimestamp()});
    input.value='';
  }catch(e){console.error(e);toast('Mensagem não enviada. Vocês precisam ser amigos.');}
}

function setPresence(activity,label){
  if(!currentUser||!db)return;
  updateDoc(doc(db,'users',currentUser.uid),{activity,activityLabel:label,lastSeen:serverTimestamp()})
    .then(()=>{if(profile)profile={...profile,activity,activityLabel:label};})
    .catch(error=>console.warn('Presença não atualizada:',error));
}
function switchView(name) {
  const activities={welcome:['browsing','Navegando'],chat:['chat','No chat geral'],calls:['voice','Em sala de voz'],friends:['friends','Na lista de amigos'],games:['playing','Jogando minigames'],ranking:['browsing','Vendo o ranking'],settings:['browsing','Nas configurações'],cinema:['watching','No LightyFlix'],shop:['shopping','Na loja']};
  const state=activities[name]||['browsing','Navegando'];
  setPresence(state[0],state[1]);
  const target = $('view-' + name);
  if (!target) {
    toast('Esta página ainda não está disponível.');
    return;
  }

  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active-view');
  });

  target.classList.add('active-view');
  applyLanguage();

  document.querySelectorAll('.nav-item[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  const labels = {
    chat: 'CHAT GERAL',
    friends: 'AMIGOS',
    calls: 'SALAS DE VOZ',
    games: 'MINIGAMES',
    arena: 'DESAFIOS',
    ranking: 'RANKING',
    settings: 'CONFIGURAÇÕES',
    cinema: 'LIGHTYFLIX',
    shop: 'LOJA'
  };

  const headings = {
    chat: 'Ponto de encontro.',
    friends: 'Sua galera, suas conversas.',
    calls: 'Sua voz, sua galera.',
    games: 'Hora de jogar.',
    arena: 'Bora competir?',
    ranking: 'Quem está no topo?',
    settings: 'Seu espaço.',
    cinema: 'Seu cinema começa aqui.',
    shop: 'Seu estilo, suas regras.'
  };

  if ($('crumb-current')) {
    $('crumb-current').textContent = labels[name] || name.toUpperCase();
  }

  if ($('page-heading')) {
    $('page-heading').textContent = headings[name] || '';
  }
}

// ========================================
// CHAT
// ========================================

function listenChat() {
  const q = query(
    collection(db, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(70)
  );

  stopListeners.push(onSnapshot(q, snap => {
    const rows = snap.docs.reverse();

    $('chat-messages').innerHTML = rows.length
      ? rows.map(d => {
          const m = d.data();
          const date = m.createdAt?.toDate?.();

          const ownAvatar = m.avatarData || (m.uid === currentUser?.uid ? (shopState?.avatarData || currentUser?.photoURL) : '');
          const avatarStyle = ownAvatar
            ? ` style="background-image:url('${ownAvatar}');background-size:cover;background-position:center;color:transparent"`
            : '';
          return `
            <div class="message">
              <div class="avatar chat-message-avatar"${avatarStyle}>${ownAvatar ? '' : safeText(initials(m.displayName))}</div>
              <div class="message-body">
                <div class="message-meta">
                  <b>${safeText(m.displayName || 'Jogador')}</b>
                  <time>${date ? date.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'agora'}</time>
                </div>
                <div class="message-text">${safeText(m.text)}</div>
              </div>
            </div>
          `;
        }).join('')
      : '<div class="empty-state">Seja a primeira pessoa a mandar uma mensagem.</div>';

    $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
  }, error => {
    console.error(error);
    toast('Erro ao carregar o chat.');
  }));
}

async function sendMessage(event) {
  event.preventDefault();

  const input = $('chat-input');
  const text = input.value.trim();

  if (!text || !currentUser) return;

  input.value = '';

  try {
    await addDoc(collection(db, 'messages'), {
      uid: currentUser.uid,
      displayName: profile?.displayName || currentUser.displayName || 'Jogador',
      text,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    input.value = text;
    toast('Não foi possível enviar a mensagem.');
  }
}

// ========================================
// MEMBROS ONLINE
// ========================================

function listenUsers() {
  const q = query(
    collection(db, 'users'),
    orderBy('lastSeen', 'desc'),
    limit(50)
  );

  stopListeners.push(onSnapshot(q, snap => {
    const active = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(user =>
        user.lastSeen?.toDate &&
        Date.now() - user.lastSeen.toDate().getTime() < 3 * 60 * 1000
      );

    $('online-count').textContent = active.length;

    $('online-members').innerHTML = active.length
      ? active.slice(0, 9).map(user => `
          <button class="member-row profile-open-trigger" data-profile-open="${safeText(user.id)}" data-profile-name="${safeText(user.displayName || 'Jogador')}">
            <div class="avatar member-avatar" ${user.avatarData ? `style="background-image:url('${user.avatarData}');background-size:cover;background-position:center;color:transparent"` : ''}>${user.avatarData ? '' : safeText(initials(user.displayName))}</div>
            <b>${safeText(user.displayName || 'Jogador')}</b>
            <small>${safeText(user.activityLabel || 'online')}</small>
          </button>
        `).join('')
      : '<p class="muted">Ninguém online por enquanto.</p>';

    $('arena-members').innerHTML = active
      .filter(user => user.id !== currentUser.uid)
      .map(user => `
        <div class="arena-player">
          <div class="avatar">${safeText(initials(user.displayName))}</div>
          <b>${safeText(user.displayName || 'Jogador')}</b>
          <small>● online</small>
          <button class="duel-btn"
            data-challenge="${safeText(user.id)}"
            data-name="${safeText(user.displayName || 'Jogador')}">
            Desafiar
          </button>
        </div>
      `).join('') || '<p class="muted">Nenhum outro jogador online agora.</p>';

  }, error => {
    console.error(error);
    toast('Erro ao buscar membros.');
  }));
}

// ========================================
// RANKING
// ========================================

function currentIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function listenRanking() {
  const weekKey = currentIsoWeekKey();
  stopListeners.push(onSnapshot(collection(db, 'users'), snap => {
    const users = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(user => user.weekKey === weekKey && Number(user.weeklyWins) > 0)
      .sort((a, b) => (Number(b.weeklyWins) || 0) - (Number(a.weeklyWins) || 0)
        || (Number(a.weeklyLosses) || 0) - (Number(b.weeklyLosses) || 0)
        || String(a.displayName || '').localeCompare(String(b.displayName || ''), 'pt-BR'));

    const top = users.slice(0, 3);
    $('podium').innerHTML = top.length
      ? top.map((user, i) => `
          <div class="podium-place ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}">
            <div class="avatar">${safeText(initials(user.displayName))}</div>
            <b>${safeText(user.displayName || 'Jogador')}</b>
            <small>${Number(user.weeklyWins) || 0} vitórias na semana</small>
            <div class="podium-block">${i + 1}º</div>
          </div>
        `).join('')
      : '<div class="podium-empty">Ainda não há resultados semanais registrados.</div>';

    $('ranking-list').innerHTML = users.map((user, i) => `
      <div class="ranking-row">
        <span>${i + 1}</span>
        <span class="rank-name">
          <span class="avatar">${safeText(initials(user.displayName))}</span>
          ${safeText(user.displayName || 'Jogador')}
          ${user.id === currentUser.uid ? ' (você)' : ''}
        </span>
        <span class="wins">${Number(user.weeklyWins) || 0}</span>
        <span class="losses">${Number(user.weeklyLosses) || 0}</span>
      </div>
    `).join('') || '<p class="muted">O ranking semanal começa a aparecer quando resultados validados forem registrados.</p>';

    const period = $('ranking-period');
    if (period) period.textContent = `SEMANA ${weekKey} · ZERA AUTOMATICAMENTE NA PRÓXIMA SEMANA`;
  }, error => {
    console.error(error);
    toast('Erro ao carregar ranking semanal.');
  }));
}
// ========================================
// DESAFIOS
// ========================================

function listenChallenges() {
  const q = query(
    collection(db, 'challenges'),
    where('toUid', '==', currentUser.uid),
    limit(30)
  );

  stopListeners.push(onSnapshot(q, snap => {
    const rows = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) =>
        (b.createdAt?.toMillis?.() || 0) -
        (a.createdAt?.toMillis?.() || 0)
      );

    const pending = rows.filter(x => x.status === 'pending');

    $('challenge-inbox').innerHTML = pending.map(challenge => `
      <div class="challenge-row">
        <div>
          <p><b>${safeText(challenge.fromName)}</b> te desafiou!</p>
          <small>Duelo de dados · melhor de um</small>
        </div>
        <div class="challenge-actions">
          <button class="accept-btn" data-challenge-accept="${safeText(challenge.id)}">Aceitar</button>
          <button class="reject-btn" data-challenge-reject="${safeText(challenge.id)}">Recusar</button>
        </div>
      </div>
    `).join('') || '<p class="muted">Nenhum desafio recebido.</p>';

    const done = rows.filter(x =>
      x.status === 'done' || x.status === 'declined'
    );

    $('challenge-history').innerHTML = done.slice(0, 6).map(challenge => `
      <div class="challenge-row">
        <div>
          <p>${safeText(challenge.fromName)} × ${safeText(challenge.toName)}</p>
          <small>${challenge.status === 'done'
            ? `Resultado: ${safeText(challenge.resultText || 'finalizado')}`
            : 'Desafio recusado'}</small>
        </div>
        <span class="muted">${challenge.status === 'done' ? '⚔' : '—'}</span>
      </div>
    `).join('') || '<p class="muted">Seus duelos aparecerão aqui.</p>';

  }, error => console.warn('Erro nos desafios:', error)));
}

async function openMemberProfile(uid, fallbackName) {
  if (!uid) return;
  let member = { displayName: fallbackName || 'Jogador' };
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) member = { ...member, ...snap.data() };
  } catch (error) { console.warn('Perfil público indisponível:', error); }
  let modal = $('member-profile-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'member-profile-modal';
    modal.className = 'cropper-modal hidden';
    document.body.appendChild(modal);
  }
  const own = uid === currentUser?.uid;
  const isOnline = member.lastSeen?.toDate && Date.now()-member.lastSeen.toDate().getTime()<3*60*1000;
  const activity = member.activityLabel || (isOnline ? 'online' : 'offline');
  modal.innerHTML = `<div class="cropper-card member-profile-card">
    <div class="panel-head"><h3>Perfil do jogador</h3><button class="icon-btn" data-profile-close>✕</button></div>
    <div class="profile-banner-preview ${member.bannerStyle ? '' : 'no-profile-banner'}" data-style="${member.bannerStyle || 0}">${safeText(member.displayName || 'Jogador')}</div>
    <div class="member-profile-identity"><div class="avatar avatar-large" ${member.avatarData ? `style="background-image:url('${member.avatarData}');background-size:cover;background-position:center;color:transparent"` : ''}>${member.avatarData ? '' : safeText(initials(member.displayName || 'Jogador'))}</div><div><h2>${safeText(member.displayName || 'Jogador')}</h2><small>${own ? 'Este é o seu perfil' : safeText(activity)}</small></div></div>
    ${!own ? `<div class="member-profile-actions"><button class="btn btn-primary" data-profile-add="${safeText(uid)}" data-profile-add-name="${safeText(member.displayName||'Jogador')}">Adicionar amizade</button><button class="btn" data-profile-message="${safeText(uid)}" data-profile-message-name="${safeText(member.displayName||'Jogador')}">Enviar mensagem</button></div>` : ''}
  </div>`;
  modal.classList.remove('hidden');
}
async function respondToChallenge(id, accept) {
  if (!currentUser || !id) return;
  try {
    await updateDoc(doc(db, 'challenges', id), {
      status: accept ? 'accepted' : 'declined',
      respondedAt: serverTimestamp(),
      acceptedBy: currentUser.uid
    });
    toast(accept ? 'Convite aceito!' : 'Convite recusado.');
  } catch (error) {
    console.error('Erro ao responder convite:', error);
    toast('Não foi possível responder. Verifique as regras do Firestore.');
  }
}

async function challengePlayer(uid, name) {
  if (!currentUser || uid === currentUser.uid) return;

  try {
    await addDoc(collection(db, 'challenges'), {
      fromUid: currentUser.uid,
      fromName: profile.displayName || 'Jogador',
      toUid: uid,
      toName: name,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    toast('Desafio enviado para ' + name + '!');
  } catch (error) {
    console.error(error);
    toast('Não foi possível enviar o desafio.');
  }
}

// ========================================
 // ARENA POKÉMON — PRIMEIRA VERSÃO JOGÁVEL
// ========================================

const POKEMON_CATALOG = [
  { id: 'pikachu', name: 'Pikachu', type: 'Elétrico', emoji: '⚡', hp: 92, atk: 23, def: 13, moves: [{ name: 'Choque do Trovão', power: 22, type: 'Elétrico' }, { name: 'Ataque Rápido', power: 16, type: 'Normal' }] },
  { id: 'charizard', name: 'Charizard', type: 'Fogo', emoji: '🔥', hp: 112, atk: 26, def: 15, moves: [{ name: 'Lança-chamas', power: 25, type: 'Fogo' }, { name: 'Corte Aéreo', power: 19, type: 'Voador' }] },
  { id: 'blastoise', name: 'Blastoise', type: 'Água', emoji: '💧', hp: 124, atk: 20, def: 21, moves: [{ name: 'Jato d’Água', power: 23, type: 'Água' }, { name: 'Cabeçada', power: 17, type: 'Normal' }] },
  { id: 'venusaur', name: 'Venusaur', type: 'Planta', emoji: '🌿', hp: 118, atk: 21, def: 19, moves: [{ name: 'Chicote de Vinha', power: 22, type: 'Planta' }, { name: 'Folha Navalha', power: 19, type: 'Planta' }] },
  { id: 'gengar', name: 'Gengar', type: 'Fantasma', emoji: '👻', hp: 88, atk: 29, def: 12, moves: [{ name: 'Bola Sombria', power: 27, type: 'Fantasma' }, { name: 'Lodo', power: 20, type: 'Veneno' }] },
  { id: 'lucario', name: 'Lucario', type: 'Lutador', emoji: '🥊', hp: 104, atk: 25, def: 17, moves: [{ name: 'Esfera de Aura', power: 26, type: 'Lutador' }, { name: 'Metal Claw', power: 18, type: 'Aço' }] },
  { id: 'eevee', name: 'Eevee', type: 'Normal', emoji: '🦊', hp: 100, atk: 19, def: 17, moves: [{ name: 'Investida', power: 18, type: 'Normal' }, { name: 'Ataque Rápido', power: 16, type: 'Normal' }] },
  { id: 'snorlax', name: 'Snorlax', type: 'Normal', emoji: '😴', hp: 145, atk: 22, def: 23, moves: [{ name: 'Investida', power: 22, type: 'Normal' }, { name: 'Pancada', power: 18, type: 'Normal' }] }
];

let pokemonArena = null;

function pokemonStorageKey() {
  return 'linercall-pokemon-v1-' + (currentUser?.uid || 'guest');
}

function loadPokemonArena() {
  try {
    const saved = JSON.parse(localStorage.getItem(pokemonStorageKey()) || 'null');
    if (saved && Array.isArray(saved.team) && Array.isArray(saved.history)) { saved.losses = Number(saved.losses) || saved.history.filter(x => !x.win).length; saved.battles = Number(saved.battles) || (Number(saved.wins)||0) + saved.losses || saved.history.length; return saved; }
  } catch (error) {
    console.warn('Não foi possível carregar o progresso Pokémon:', error);
  }
  return { team: ['pikachu', 'charizard', 'blastoise'], coins: 0, wins: 0, losses: 0, battles: 0, history: [] };
}

function savePokemonArena() {
  try {
    localStorage.setItem(pokemonStorageKey(), JSON.stringify(pokemonArena));
  } catch (error) {
    toast('Não foi possível salvar o progresso neste navegador.');
  }
}

function pokemonById(id) {
  return POKEMON_CATALOG.find(p => p.id === id);
}

function initPokemonArena() {
  if (!currentUser) return;
  pokemonArena = loadPokemonArena();
  if (String(profile?.displayName||'').trim().toLocaleLowerCase('pt-BR') === 'tom' && !localStorage.getItem('linercall-tom-coins-reset-v1')) { pokemonArena.coins=0; localStorage.setItem('linercall-tom-coins-reset-v1','1'); savePokemonArena(); }
  renderPokemonArena();
}

function pokemonArt(p) {
  const ids = { pikachu:25, charizard:6, blastoise:9, venusaur:3, gengar:94, lucario:448, eevee:133, snorlax:143 };
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + ids[p.id] + '.png';
}
let miniGamePage = 'home';
function showMiniGamePage(page) {
  miniGamePage = page;
  const root = $('minigame-stage');
  const tabs = $('minigame-tabs');
  if (tabs) tabs.classList.toggle('hidden', page !== 'home');
  if (root) root.classList.toggle('hidden', page === 'home');
  const pokemonContent = $('pokemon-arena-content');
  const gameStage = $('game-stage');
  if (pokemonContent) pokemonContent.classList.toggle('hidden', page !== 'pokemon');
  if (gameStage) { if (gameStage.parentElement !== root) root?.appendChild(gameStage); gameStage.classList.toggle('hidden', page === 'home' || page === 'pokemon'); }
  if (page === 'pokemon') renderPokemonArena();
  if (page === 'dice') showDice();
  if (page === 'reaction') showReaction();
  if (page === 'tetris') showTetris();
  if (page === 'story') startStory();
}
function backToMiniGames() {
  stopStory();
  $('story-game-content')?.remove();
  miniGamePage = 'home';
  $('minigame-stage')?.classList.add('hidden');
  $('minigame-tabs')?.classList.remove('hidden');
  $('pokemon-arena-content')?.classList.remove('hidden');
  $('game-stage')?.classList.add('hidden');
  stopTetris();
}
function renderPokemonArena() {
  const root = $('pokemon-arena-content');
  if (!root || !pokemonArena) return;
  const team = pokemonArena.team.map(pokemonById).filter(Boolean);
  const roster = POKEMON_CATALOG.map(p => {
    const selected = pokemonArena.team.includes(p.id);
    return `<button class="pokemon-choice-art ${selected ? 'selected' : ''}" data-pokemon-pick="${p.id}" ${selected || pokemonArena.team.length >= 3 ? 'disabled' : ''}>
      <img src="${pokemonArt(p)}" alt="${p.name}" loading="lazy"><b>${p.name}</b><small>${p.type} · HP ${p.hp}</small><span>${selected ? 'NO TIME ✓' : '＋ ADICIONAR'}</span>
    </button>`;
  }).join('');
  const teamMarkup = team.map(p => `<div class="pokemon-team-card"><img src="${pokemonArt(p)}" alt=""><div><b>${p.name}</b><small>${p.type} · ATQ ${p.atk} · DEF ${p.def}</small></div><button class="pokemon-remove" data-pokemon-remove="${p.id}" ${pokemonArena.battle ? 'disabled' : ''}>×</button></div>`).join('');
  const history = pokemonArena.history.slice(0,5).map(h=>`<div class="pokemon-history-row"><span>${h.win?'🏆':'⚔️'}</span><b>${safeText(h.opponent)}</b><small>${h.win?'+21 moedas':'Derrota'}</small></div>`).join('');
  root.innerHTML = `
    <div class="minigame-subhead"><button class="btn pokemon-back" data-minigame-back>← Voltar aos minigames</button><div class="pokemon-wallet">🪙 <b>${pokemonArena.coins}</b> moedas</div></div>
    <div class="pokemon-topline"><div><span class="eyebrow">TREINADOR</span><h2>${safeText(profile?.displayName || 'Pokémon')}</h2><p>Monte sua equipe e entre na arena.</p></div><span class="pixel-badge">POKÉMON ARENA</span></div>
    <div class="pokemon-team-panel"><div class="pokemon-panel-title"><div><span class="eyebrow">SUA EQUIPE</span><h3>Time Pokémon <small>${team.length}/3</small></h3></div></div><div class="pokemon-team-list">${teamMarkup || '<p class="muted">Escolha seus Pokémon abaixo.</p>'}</div></div>
    <div class="pokemon-roster-title"><b>Escolha seus Pokémon</b><small>Selecione até três para a batalha.</small></div><div class="pokemon-roster pokemon-roster-art">${roster}</div>
    <button class="btn btn-primary pokemon-battle-start" data-pokemon-battle ${team.length!==3 || pokemonArena.battle?'disabled':''}>⚔ INICIAR BATALHA</button>
    <div class="pokemon-stats"><div><b>${pokemonArena.wins}</b><small>VITÓRIAS</small></div><div><b>${pokemonArena.losses || 0}</b><small>DERROTAS</small></div><div><b>${pokemonArena.battles || 0}</b><small>BATALHAS</small></div><div><b>${pokemonArena.coins}</b><small>MOEDAS</small></div></div>
    <div class="pokemon-history"><b>Últimas batalhas</b>${history || '<small class="muted">Seu histórico aparecerá aqui.</small>'}</div>
    <div id="pokemon-battle-stage" class="pokemon-battle-stage ${pokemonArena.battle?'':'hidden'}"></div>`;
  if (pokemonArena.battle) renderPokemonBattle();
}
function pokemonTypeMultiplier(moveType, targetType) {
  const strong = { Fogo: ['Planta'], Água: ['Fogo'], Planta: ['Água'], Elétrico: ['Água'] };
  const weak = { Fogo: ['Água'], Água: ['Planta', 'Elétrico'], Planta: ['Fogo'], Elétrico: ['Planta'] };
  if (strong[moveType]?.includes(targetType)) return 1.5;
  if (weak[moveType]?.includes(targetType)) return 0.75;
  return 1;
}

function createBattlePokemon(id) {
  const base = pokemonById(id);
  const isEnemy = ['gengar','venusaur','lucario','snorlax','charizard','blastoise'].includes(id);
  const hp = isEnemy ? Math.round(base.hp * 1.5) : base.hp;
  return { ...base, hp, atk: isEnemy ? Math.round(base.atk * 1.35) : base.atk, def: isEnemy ? Math.round(base.def * 1.2) : base.def, hpNow: hp };
}

function startPokemonBattle() {
  if (!pokemonArena || pokemonArena.team.length !== 3 || pokemonArena.battle) return;
  const opponents = ['gengar', 'venusaur', 'lucario', 'snorlax', 'charizard', 'blastoise'];
  const shuffled = [...opponents].sort(() => Math.random() - 0.5);
  const enemyIds = shuffled.slice(0, 3);
  pokemonArena.battle = {
    player: pokemonArena.team.map(createBattlePokemon),
    enemy: enemyIds.map(createBattlePokemon),
    playerActive: 0,
    enemyActive: 0,
    log: ['A batalha começou! Escolha um golpe.'],
    turn: 'player',
    finished: false
  };
  renderPokemonArena();
  requestAnimationFrame(() => $('pokemon-battle-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function currentBattlePokemon(side) {
  const battle = pokemonArena?.battle;
  if (!battle) return null;
  return side === 'player' ? battle.player[battle.playerActive] : battle.enemy[battle.enemyActive];
}

function performPokemonMove(moveIndex) {
  const b = pokemonArena?.battle;
  if (!b || b.finished || b.turn !== 'player') return;
  const attacker = currentBattlePokemon('player');
  const defender = currentBattlePokemon('enemy');
  const move = attacker.moves[moveIndex];
  if (!attacker || !defender || !move || attacker.hpNow <= 0) return;

  const multiplier = pokemonTypeMultiplier(move.type, defender.type);
  const damage = Math.max(5, Math.round((move.power + attacker.atk * 0.55 - defender.def * 0.28) * multiplier * (0.88 + Math.random() * 0.24)));
  b.faintNotice = '';
  b.turn = 'enemy';
  defender.hpNow = Math.max(0, defender.hpNow - damage);
  b.log.unshift(`${attacker.name} usou ${move.name}! ${damage} de dano.${multiplier > 1 ? ' É super efetivo!' : multiplier < 1 ? ' Não foi muito efetivo...' : ''}`);

  if (defender.hpNow <= 0) {
    b.faintNotice = `${defender.name} desmaiou!`;
    b.log.unshift(`${defender.name} foi derrotado!`);
    const next = b.enemy.findIndex(p => p.hpNow > 0);
    if (next === -1) return finishPokemonBattle(true);
    b.enemyActive = next;
    b.log.unshift(`O adversário enviou ${b.enemy[next].name}!`);
  }

  renderPokemonBattle();
  setTimeout(pokemonEnemyTurn, 650);
}

function pokemonEnemyTurn() {
  const b = pokemonArena?.battle;
  if (!b || b.finished || b.turn !== 'enemy') return;
  const attacker = currentBattlePokemon('enemy');
  const defender = currentBattlePokemon('player');
  if (!attacker || !defender) return;
  const livingMoves = attacker.moves;
  const move = [...livingMoves].sort((x,y)=>pokemonTypeMultiplier(y.type,defender.type)-pokemonTypeMultiplier(x.type,defender.type) || y.power-x.power)[0];
  const multiplier = pokemonTypeMultiplier(move.type, defender.type);
  const damage = Math.max(4, Math.round((move.power + attacker.atk * 0.5 - defender.def * 0.3) * multiplier * (0.88 + Math.random() * 0.24)));
  b.faintNotice = '';
  defender.hpNow = Math.max(0, defender.hpNow - damage);
  b.log.unshift(`${attacker.name} usou ${move.name}! Você recebeu ${damage} de dano.${multiplier > 1 ? ' Foi super efetivo!' : multiplier < 1 ? ' Não foi muito efetivo...' : ''}`);

  if (defender.hpNow <= 0) {
    b.faintNotice = `${defender.name} desmaiou!`;
    const next = b.player.findIndex(p => p.hpNow > 0);
    if (next === -1) return finishPokemonBattle(false);
    b.playerActive = next;
    b.log.unshift(`Seu ${defender.name} caiu! ${b.player[next].name} entrou na batalha.`);
  }
  b.turn = 'player';
  renderPokemonBattle();
}

function switchPokemonInBattle(index) {
  const b = pokemonArena?.battle;
  if (!b || b.finished || b.turn !== 'player' || !b.player[index] || b.player[index].hpNow <= 0 || index === b.playerActive) return;
  const old = currentBattlePokemon('player');
  b.playerActive = index;
  b.turn = 'enemy';
  b.log.unshift(`Você trocou ${old.name} por ${b.player[index].name}.`);
  renderPokemonBattle();
  setTimeout(pokemonEnemyTurn, 500);
}

async function finishPokemonBattle(won) {
  const b = pokemonArena?.battle;
  if (!b || b.finished) return;
  b.finished = true;
  const opponent = b.enemy.map(p => p.name).join(', ');
  pokemonArena.battles = (Number(pokemonArena.battles) || 0) + 1;
  if (won) {
    pokemonArena.coins += 21;
    pokemonArena.wins = (Number(pokemonArena.wins) || 0) + 1;
  } else {
    pokemonArena.coins += 21;
    pokemonArena.losses = (Number(pokemonArena.losses) || 0) + 1;
  }
  b.result = won ? 'win' : 'loss';
  pokemonArena.history.unshift({ win: won, opponent, date: Date.now() });
  pokemonArena.history = pokemonArena.history.slice(0, 20);
  savePokemonArena();
  renderPokemonBattle();

  // Registra o resultado semanal no perfil Firestore para alimentar o ranking.
  if (currentUser && db) {
    const weekKey = currentIsoWeekKey();
    const previous = profile?.weekKey === weekKey ? profile : {};
    const update = {
      weekKey,
      weeklyWins: (Number(previous.weeklyWins) || 0) + (won ? 1 : 0),
      weeklyLosses: (Number(previous.weeklyLosses) || 0) + (won ? 0 : 1)
    };
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), update);
      profile = { ...profile, ...update };
      toast(won ? 'Vitória registrada no ranking semanal!' : 'Derrota registrada. Continue tentando!');
    } catch (error) {
      console.error('Não foi possível registrar resultado semanal:', error);
      toast('A batalha foi salva, mas o ranking recusou o registro.');
    }
  }
}

function renderPokemonBattle() {
  const root = $('pokemon-battle-stage'), b = pokemonArena?.battle;
  if (!root || !b) return;
  const player = currentBattlePokemon('player'), enemy = currentBattlePokemon('enemy');
  const bar = p => Math.max(0,Math.round(p.hpNow/p.hp*100));
  root.innerHTML = `
    <div class="pokemon-battle-heading"><div><span class="eyebrow">ARENA · BATALHA POR TURNOS</span><h2>${b.finished ? (b.result === 'win' ? 'VITÓRIA!' : 'DERROTA') : 'A BATALHA COMEÇOU!'}</h2><p class="battle-turn-label">${b.finished ? 'Resultado final' : (b.turn === 'player' ? 'Sua vez: escolha um ataque.' : 'Turno do adversário…')}</p></div><span class="pixel-badge">PVE</span></div>
    <div class="pokemon-arena-scene ${b.finished ? (b.result === 'win' ? 'arena-victory' : 'arena-defeat') : ''}">
      <div class="arena-fighter arena-enemy ${enemy.hpNow <= 0 ? 'pokemon-fainted' : ''}"><div class="arena-fighter-meta"><b>${enemy.name}</b><small>${enemy.type}</small><div class="pokemon-hp"><i style="width:${bar(enemy)}%"></i></div><small>HP ${enemy.hpNow}/${enemy.hp}</small></div><img src="${pokemonArt(enemy)}" alt="${enemy.name}"></div>
      <div class="arena-spike-band"><span>VS</span></div>
      <div class="arena-fighter arena-player ${player.hpNow <= 0 ? 'pokemon-fainted' : ''}"><img src="${pokemonArt(player)}" alt="${player.name}"><div class="arena-fighter-meta"><b>${player.name}</b><small>${player.type}</small><div class="pokemon-hp"><i style="width:${bar(player)}%"></i></div><small>HP ${player.hpNow}/${player.hp}</small></div></div>
      ${b.finished ? `<div class="arena-result-stamp ${b.result}">${b.result === 'win' ? 'VITÓRIA!' : 'DERROTA'}</div>` : ''}
    </div>
    ${b.faintNotice && !b.finished ? `<div class="pokemon-faint-notice">${safeText(b.faintNotice)}</div>` : ''}
    ${b.finished ? `<div class="pokemon-result ${b.result}">${b.enemy.every(p=>p.hpNow<=0)?'🏆 Você venceu! +21 moedas.':'💤 Seus Pokémon foram derrotados. +21 moedas pela batalha.'}</div><button class="btn btn-primary" data-pokemon-close-battle>Voltar à equipe</button>` : `
      <div class="pokemon-controls"><div><b>ATAQUES</b><div class="pokemon-moves">${player.moves.map((m,i)=>`<button class="pokemon-move-btn" data-pokemon-move="${i}" ${b.turn !== 'player' ? 'disabled' : ''}><b>${m.name}</b><small>${m.type} · força ${m.power}</small></button>`).join('')}</div></div>
      <div><b>TROCAR POKÉMON</b><div class="pokemon-switches">${b.player.map((p,i)=>`<button data-pokemon-switch="${i}" ${p.hpNow<=0||i===b.playerActive||b.turn!=='player'?'disabled':''}>${p.name} · ${p.hpNow} HP</button>`).join('')}</div></div></div>`}
    <div class="pokemon-battle-log"><b>REGISTRO</b>${b.log.slice(0,4).map(line=>`<p>${safeText(line)}</p>`).join('')}</div>`;
}
function closePokemonBattle() {
  if (!pokemonArena) return;
  pokemonArena.battle = null;
  savePokemonArena();
  renderPokemonArena();
}

function removePokemonFromTeam(id) {
  if (!pokemonArena || pokemonArena.battle) return;
  pokemonArena.team = pokemonArena.team.filter(x => x !== id);
  savePokemonArena();
  renderPokemonArena();
}

function addPokemonToTeam(id) {
  if (!pokemonArena || pokemonArena.battle || pokemonArena.team.length >= 3 || pokemonArena.team.includes(id)) return;
  pokemonArena.team.push(id);
  savePokemonArena();
  renderPokemonArena();
}


const SHOP_KEY_PREFIX = 'linercall-shop-';
function shopStorageKey() { return SHOP_KEY_PREFIX + (currentUser?.uid || 'guest'); }
function loadShopState() {
  const cloud = { avatarData: profile?.avatarData || currentUser?.photoURL || '', avatarZoom: 1, avatarX: 50, avatarY: 50, bannerStyle: Number(profile?.bannerStyle) || 0, bannerCredits: 0 };
  try {
    const old = JSON.parse(localStorage.getItem(shopStorageKey()) || 'null') || {};
    return { ...cloud, ...old, avatarData: old.avatarData || cloud.avatarData, bannerStyle: Number(old.bannerStyle) || cloud.bannerStyle };
  } catch { return cloud; }
}
let shopState = null;
function saveShopState() { try { localStorage.setItem(shopStorageKey(),JSON.stringify(shopState)); } catch { toast('Não foi possível salvar os cosméticos.'); } }
function applyShopCosmetics() {
  if (!shopState) return;
  ['side-avatar','top-avatar','settings-avatar'].forEach(id=>{
    const el=$(id); if(!el)return;
    el.style.backgroundImage=shopState.avatarData?`url("${shopState.avatarData}")`:'';
    el.style.backgroundSize=shopState.avatarData?`${shopState.avatarZoom||1}00% auto`:'';
    el.style.backgroundPosition=`${shopState.avatarX??50}% ${shopState.avatarY??50}%`;
    if(shopState.avatarData)el.textContent=''; else el.textContent=initials(profile?.displayName||'L');
  });
  ['profile-banner-preview','shop-banner-preview'].forEach(id=>{const el=$(id);if(el)el.dataset.style=String(shopState.bannerStyle||0);});
  const banner=$('profile-banner-preview'); if(banner)banner.classList.toggle('hidden',!shopState.bannerStyle);
}
function renderShop() {
 const root=$('shop-content'); if(!root||!pokemonArena||!shopState)return;
 root.innerHTML=`
 <div class="shop-wallet panel"><span>SUAS MOEDAS</span><b>🪙 ${pokemonArena.coins}</b></div>
 <div class="shop-grid">
  <article class="shop-item panel"><div class="shop-item-art shop-avatar-art">🖼️</div><div class="shop-item-info"><span class="eyebrow">PERSONALIZAÇÃO</span><h3>Foto de perfil</h3><p>Compre uma alteração e ajuste o enquadramento da imagem antes de salvar.</p><b class="shop-price">🪙 100 moedas · por alteração</b><button class="btn btn-primary" data-shop-buy="avatar">Comprar alteração</button><input id="shop-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></div></article>
  <article class="shop-item panel"><div id="shop-banner-preview" class="shop-item-art shop-banner-art" data-style="${shopState.bannerStyle||0}">✦ LINERCALL'S ✦</div><div class="shop-item-info"><span class="eyebrow">PERSONALIZAÇÃO</span><h3>Banner de perfil</h3><p>Você pode trocar o banner uma vez por compra. Cada nova alteração custa moedas novamente.</p><b class="shop-price">🪙 200 moedas · por alteração</b><button class="btn btn-primary" data-shop-buy="banner">${shopState.bannerCredits>0?'Escolher banner · crédito disponível':'Comprar alteração'}</button><div class="banner-style-options"><button data-banner-style="1" ${shopState.bannerCredits>0?'':'disabled'}>Aurora</button><button data-banner-style="2" ${shopState.bannerCredits>0?'':'disabled'}>Nebulosa</button><button data-banner-style="3" ${shopState.bannerCredits>0?'':'disabled'}>Vulcão</button></div></div></article>
 </div><p class="shop-notice">Protótipo local: moedas e cosméticos ficam neste navegador e ainda não sincronizam entre dispositivos.</p>
 <div id="avatar-cropper" class="cropper-modal hidden"><div class="cropper-card"><div class="panel-head"><h3>Enquadre sua foto</h3><button class="icon-btn" data-crop-cancel>✕</button></div><div class="cropper-window"><img id="avatar-crop-image" alt="Prévia da foto"></div><label>Zoom <input id="avatar-crop-zoom" type="range" min="1" max="3" step=".05" value="1"></label><label>Horizontal <input id="avatar-crop-x" type="range" min="0" max="100" value="50"></label><label>Vertical <input id="avatar-crop-y" type="range" min="0" max="100" value="50"></label><div class="cropper-actions"><button class="btn" data-crop-cancel>Cancelar</button><button class="btn btn-primary" data-crop-save>Salvar foto</button></div></div></div>`;
 if(cinemaItems.length){const lighty=cinemaItems.map(item=>item.type==='movie'?`<article class="shop-item panel"><div class="shop-item-art"><img src="${safeText(item.poster||'')}" alt="" loading="lazy"></div><div class="shop-item-info"><span class="eyebrow">LIGHTYFLIX · FILME</span><h3>${safeText(item.title)}</h3><b class="shop-price">🪙 2.000 moedas</b><button class="btn btn-primary" data-shop-movie="${safeText(item.id)}" ${hasLightyPurchase('movie:'+item.id)?'disabled':''}>${hasLightyPurchase('movie:'+item.id)?'Comprado':'Comprar filme'}</button></div></article>`:`<article class="shop-item panel"><div class="shop-item-art"><img src="${safeText(item.poster||'')}" alt="" loading="lazy"></div><div class="shop-item-info"><span class="eyebrow">LIGHTYFLIX · SÉRIE</span><h3>${safeText(item.title)}</h3><b class="shop-price">🪙 1.500 moedas por temporada</b><p>Escolha a temporada na página da série para comprar.</p><button class="btn" data-shop-open-cinema="${safeText(item.id)}">Ver temporadas</button></div></article>`).join('');root.insertAdjacentHTML('beforeend','<h3 class="shop-section-title">LightyFlix</h3><div class="shop-grid">'+lighty+'</div>');}
 applyShopCosmetics();
}
let pendingAvatarImage = null;
function buyShopItem(item) {
 if(!pokemonArena||!shopState)return;
 const avatar=item==='avatar', price=avatar?100:200;
 if(!avatar && (shopState.bannerCredits||0)>0){toast('Escolha um dos estilos de banner abaixo.');return;}
 if(pokemonArena.coins<price)return toast('Você não tem moedas suficientes.');
 pokemonArena.coins-=price;
 if(avatar){shopState.avatarCredits=(shopState.avatarCredits||0)+1;savePokemonArena();saveShopState();renderShop();$('shop-avatar-file')?.click();toast('Crédito comprado. Escolha a imagem.');}
 else {shopState.bannerCredits=(shopState.bannerCredits||0)+1;savePokemonArena();saveShopState();renderShop();toast('Crédito de alteração de banner comprado.');}
}
function handleShopAvatarFile(event) {
 const file=event.target.files?.[0]; if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){toast('Escolha PNG, JPG ou WebP de até 2 MB.');return;}
 if(!(shopState.avatarCredits>0)){toast('Compre uma alteração antes de trocar a foto.');return;}
 const reader=new FileReader();
 reader.onload=()=>{pendingAvatarImage=String(reader.result||'');$('avatar-crop-image').src=pendingAvatarImage;$('avatar-cropper').classList.remove('hidden');};
 reader.onerror=()=>toast('Não foi possível ler essa imagem.');
 reader.readAsDataURL(file);
 event.target.value='';
}
function updateCropPreview(){
 const img=$('avatar-crop-image');if(!img)return;
 img.style.transform=`translate(${(50-Number($('avatar-crop-x')?.value||50))*0.7}%,${(50-Number($('avatar-crop-y')?.value||50))*0.7}%) scale(${$('avatar-crop-zoom')?.value||1})`;
}
function saveCroppedAvatar(){
 const img=$('avatar-crop-image');if(!img||!pendingAvatarImage)return;
 const size=512,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext('2d'),iw=img.naturalWidth,ih=img.naturalHeight,zoom=Number($('avatar-crop-zoom').value||1);
 const scale=Math.max(size/iw,size/ih)*zoom,w=iw*scale,h=ih*scale;
 const x=(size-w)*Number($('avatar-crop-x').value)/100,y=(size-h)*Number($('avatar-crop-y').value)/100;
 ctx.drawImage(img,x,y,w,h);
 shopState.avatarData=canvas.toDataURL('image/jpeg',.88);shopState.avatarZoom=1;shopState.avatarX=50;shopState.avatarY=50;
 shopState.avatarCredits=Math.max(0,(shopState.avatarCredits||0)-1);
 pendingAvatarImage=null;saveShopState();applyShopCosmetics();$('avatar-cropper').classList.add('hidden');renderShop();
 updateDoc(doc(db,'users',currentUser.uid),{avatarData:shopState.avatarData}).then(()=>{profile={...profile,avatarData:shopState.avatarData};toast('Foto salva no perfil e disponível para outras contas.');}).catch(error=>{console.error('Falha ao sincronizar avatar:',error);toast('A foto ficou neste navegador; o Firestore recusou a sincronização. Confira as regras/permissões.');});
}
function saveBannerChoice(style){
 if(!shopState||!(shopState.bannerCredits>0))return toast('Compre uma alteração de banner primeiro.');
 shopState.bannerStyle=style;shopState.bannerCredits--;saveShopState();applyShopCosmetics();renderShop();
 updateDoc(doc(db,'users',currentUser.uid),{bannerStyle:style}).then(()=>{profile={...profile,bannerStyle:style};toast('Banner sincronizado com seu perfil!');}).catch(error=>{console.error('Falha ao sincronizar banner:',error);toast('Banner salvo localmente, mas não sincronizou. Confira as regras do Firestore.');});
}
function createShopPage() {
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main-area');
  if (!sidebar || !main) return;
  if (!document.querySelector('[data-view="shop"]')) {
    const button = document.createElement('button');
    button.className = 'nav-item'; button.dataset.view = 'shop';
    button.innerHTML = '<span>🛍</span> Loja <i></i>';
    const label = document.createElement('div'); label.className = 'nav-label'; label.textContent = 'PERSONALIZAR';
    const bottom = sidebar.querySelector('.sidebar-bottom');
    if (bottom) {
      sidebar.insertBefore(label, bottom);
      sidebar.insertBefore(button, bottom);
      const homeButton = sidebar.querySelector('.nav-item[data-view="welcome"]');
      if (homeButton) sidebar.insertBefore(homeButton, bottom);
    }
  }
  if (!$('view-shop')) {
    const section = document.createElement('section');
    section.id = 'view-shop'; section.className = 'view';
    section.innerHTML = `<div class="section-intro"><div><span class="eyebrow">LOJA LINERCALL'S</span><h2>Personalize seu perfil.</h2><p>Use suas moedas para desbloquear itens cosméticos.</p></div><span class="pixel-badge">SHOP</span></div><div id="shop-content"></div>`;
    const footer = main.querySelector('.app-footer'); main.insertBefore(section, footer || null);
  }
}

// ========================================
// PERFIL
// ========================================

async function saveProfile(event) {
  event.preventDefault();

  if (!currentUser) return;

  const name = $('display-name').value.trim().toLocaleLowerCase('pt-BR');

  if (name.length < 2 || name.length > 24) {
    $('profile-status').textContent = 'Use um nome entre 2 e 24 caracteres.';
    return;
  }

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName: name
    });

    profile.displayName = name;
    setUserUI();

    $('profile-status').textContent = 'Perfil atualizado!';
    toast('Nome atualizado.');
  } catch (error) {
    console.error(error);
    $('profile-status').textContent = 'Não foi possível salvar o perfil.';
  }
}

// ========================================
// SALAS DE VOZ — JITSI
// ========================================

function loadJitsiScript() {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-jitsi]');

    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.dataset.jitsi = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function joinCall(room) {
  try {
    await loadJitsiScript();

    if (!window.JitsiMeetExternalAPI) {
      throw new Error('Jitsi não carregou.');
    }

    if (jitsiApi) leaveCall();

    $('call-stage').classList.remove('hidden');
    $('call-room-title').textContent =
      room === 'partidas-desafios' ? 'Partidas & desafios' : 'Resenha geral';

    $('jitsi-container').innerHTML = '';

    jitsiApi = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName: 'LinerCalls-' + room,
      parentNode: $('jitsi-container'),
      width: '100%',
      height: 500,
      userInfo: {
        displayName: profile?.displayName || currentUser?.displayName || 'Jogador'
      },
      configOverwrite: {
        prejoinPageEnabled: true
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false
      }
    });

    switchView('calls');

  } catch (error) {
    console.error(error);
    toast('Não foi possível abrir a sala de voz.');
  }
}

function leaveCall() {
  if (jitsiApi) {
    try { jitsiApi.dispose(); } catch (error) { console.warn(error); }
    jitsiApi = null;
  }

  if ($('jitsi-container')) $('jitsi-container').innerHTML = '';
  $('call-stage')?.classList.add('hidden');
}

// ========================================
// MINIGAME: DADOS
// ========================================

function showDice() {
  $('game-stage').classList.remove('hidden');
  $('game-title').textContent = 'Dados do caos';

  $('game-content').innerHTML = `
    <div class="dice-game" style="text-align:center;padding:25px;">
      <div id="dice-result" style="font-size:75px;margin:20px;">⚄</div>
      <h2 id="dice-number">?</h2>
      <p>Role o dado de 20 lados!</p>
      <button id="roll-dice" class="btn btn-primary">Rolar dado</button><button class="btn" data-minigame-back>← Voltar aos minigames</button>
    </div>
  `;

  $('roll-dice').addEventListener('click', () => {
    const number = Math.floor(Math.random() * 20) + 1;
    $('dice-number').textContent = number;
    $('dice-result').textContent = '🎲';
  });
}


let tetrisTimer=null,tetrisBoard=[],tetrisPiece=null,tetrisScore=0,tetrisOver=false;
const TETRIS_SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
function stopTetris(){if(tetrisTimer)clearInterval(tetrisTimer);tetrisTimer=null;document.removeEventListener('keydown',tetrisKeyHandler);}
function newTetrisPiece(){const shape=TETRIS_SHAPES[Math.floor(Math.random()*TETRIS_SHAPES.length)].map(row=>row.slice());return {shape,x:Math.floor((10-shape[0].length)/2),y:0};}
function tetrisCollides(piece,x=piece.x,y=piece.y,shape=piece.shape){return shape.some((row,dy)=>row.some((v,dx)=>v&&(x+dx<0||x+dx>=10||y+dy>=20||(y+dy>=0&&tetrisBoard[y+dy][x+dx]))));}
function drawTetris(){const root=$('game-content');if(!root)return;const cells=tetrisBoard.map(row=>row.slice());if(tetrisPiece) tetrisPiece.shape.forEach((row,dy)=>row.forEach((v,dx)=>{if(v&&tetrisPiece.y+dy>=0&&tetrisPiece.y+dy<20)cells[tetrisPiece.y+dy][tetrisPiece.x+dx]=2;}));root.querySelector('#tetris-grid').innerHTML=cells.flat().map(v=>'<i class="tetris-cell '+(v===2?'falling':v===1?'filled':'')+'"></i>').join('');root.querySelector('#tetris-score').textContent=tetrisScore;}
function lockTetris(){tetrisPiece.shape.forEach((row,dy)=>row.forEach((v,dx)=>{if(v&&tetrisPiece.y+dy>=0)tetrisBoard[tetrisPiece.y+dy][tetrisPiece.x+dx]=1;}));let cleared=0;tetrisBoard=tetrisBoard.filter(row=>{if(row.every(Boolean)){cleared++;return false;}return true;});while(tetrisBoard.length<20)tetrisBoard.unshift(Array(10).fill(0));tetrisScore+=cleared*[0,100,300,500,800][cleared];tetrisPiece=newTetrisPiece();if(tetrisCollides(tetrisPiece)){tetrisOver=true;stopTetris();$('game-content').insertAdjacentHTML('beforeend','<p class="tetris-over">Fim de jogo · Pontuação: '+tetrisScore+'</p><button class="btn btn-primary" id="tetris-restart">Jogar novamente</button>');}}
function moveTetris(dx,dy){if(!tetrisPiece||tetrisOver)return;if(!tetrisCollides(tetrisPiece,tetrisPiece.x+dx,tetrisPiece.y+dy)){tetrisPiece.x+=dx;tetrisPiece.y+=dy;}else if(dy>0)lockTetris();drawTetris();}
function rotateTetris(){if(!tetrisPiece||tetrisOver)return;const shape=tetrisPiece.shape[0].map((_,i)=>tetrisPiece.shape.map(row=>row[i]).reverse());if(!tetrisCollides(tetrisPiece,tetrisPiece.x,tetrisPiece.y,shape))tetrisPiece.shape=shape;drawTetris();}
function tetrisKeyHandler(e){if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')moveTetris(-1,0);else if(e.key==='ArrowRight')moveTetris(1,0);else if(e.key==='ArrowDown')moveTetris(0,1);else if(e.key==='ArrowUp')rotateTetris();else if(e.key===' ')while(!tetrisCollides(tetrisPiece,tetrisPiece.x,tetrisPiece.y+1))tetrisPiece.y++;if(e.key===' ')lockTetris();drawTetris();}
function showTetris(){stopTetris();tetrisBoard=Array.from({length:20},()=>Array(10).fill(0));tetrisPiece=newTetrisPiece();tetrisScore=0;tetrisOver=false;$('game-stage').classList.remove('hidden');$('game-title').textContent='Tetris';$('game-content').innerHTML='<div class="tetris-wrap"><div class="tetris-info">Pontos: <b id="tetris-score">0</b><p>← → mover · ↑ girar · ↓ descer · Espaço: queda</p></div><div id="tetris-grid" class="tetris-grid" role="grid"></div><div class="tetris-mobile"><button data-tetris="left">←</button><button data-tetris="rotate">↻</button><button data-tetris="right">→</button><button data-tetris="down">↓</button></div><button class="btn" data-minigame-back>Voltar aos minigames</button></div>';document.addEventListener('keydown',tetrisKeyHandler);$('game-content').addEventListener('click',e=>{const b=e.target.closest('[data-tetris]');if(!b)return;({left:()=>moveTetris(-1,0),right:()=>moveTetris(1,0),down:()=>moveTetris(0,1),rotate:rotateTetris})[b.dataset.tetris]?.();});$('game-content').addEventListener('click',e=>{if(e.target.id==='tetris-restart')showTetris();});drawTetris();tetrisTimer=setInterval(()=>moveTetris(0,1),650);}

// ========================================
// MINIGAME: REFLEXO
// ========================================

function showReaction() {
  clearTimeout(reactionTimer);

  reactionReady = false;
  reactionStart = 0;

  $('game-stage').classList.remove('hidden');
  $('game-title').textContent = 'Teste de reflexo';

  $('game-content').innerHTML = `
    <div style="text-align:center;padding:25px;">
      <p id="reaction-message">Clique no botão para começar.</p>
      <button id="reaction-button" class="btn btn-primary">
        Começar
      </button>
      <p id="reaction-result"></p>
    </div>
  `;

  $('reaction-button').addEventListener('click', () => {
    const button = $('reaction-button');

    if (!reactionReady && !reactionStart) {
      button.disabled = true;
      $('reaction-message').textContent = 'Espere o sinal...';

      reactionTimer = setTimeout(() => {
        reactionReady = true;
        reactionStart = performance.now();

        button.disabled = false;
        button.textContent = 'CLIQUE AGORA!';
        button.style.background = '#28b86b';
      }, 1500 + Math.random() * 3500);

      return;
    }

    if (reactionReady) {
      const elapsed = Math.round(performance.now() - reactionStart);

      reactionReady = false;
      reactionStart = 0;

      button.textContent = 'Tentar novamente';
      button.style.background = '';

      $('reaction-message').textContent = 'Seu tempo:';
      $('reaction-result').textContent = elapsed + ' ms';

    } else if (reactionStart === 0) {
      clearTimeout(reactionTimer);

      button.disabled = false;
      button.textContent = 'Tentar novamente';
      $('reaction-message').textContent = 'Você clicou cedo demais!';

      reactionStart = 0;
    }
  });
}

// ========================================
// LIGHTYFLIX — CATÁLOGO
// ========================================

function getMyList() {
  try {
    return JSON.parse(localStorage.getItem(MY_LIST_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMyList(list) {
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
}

function validWebUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function getYouTubeEmbed(value) {
  try {
    const url = new URL(value);
    let id = '';

    if (url.hostname.includes('youtu.be')) {
      id = url.pathname.slice(1);
    } else if (
      url.hostname.includes('youtube.com') ||
      url.hostname.includes('youtube-nocookie.com')
    ) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
      if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2];
    }

    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return '';

    return 'https://www.youtube-nocookie.com/embed/' + id;
  } catch {
    return '';
  }
}

function cinemaCard(item) {
  const poster=validWebUrl(item.poster||item.backdrop||''),title=safeText(item.title||'Sem título'),type=item.type==='series'?'SÉRIE':'FILME';
  return `<article class="cinema-card"><button class="cinema-card-open" data-cinema-open="${safeText(item.id)}" aria-label="Ver detalhes de ${title}"><div class="cinema-card-poster"><img src="${poster||'https://placehold.co/500x750/17152b/e7d8ff?text=LIGHTYFLIX'}" alt="${title}" loading="lazy" onerror="this.src='https://placehold.co/500x750/17152b/e7d8ff?text=SEM+CAPA'"><span class="cinema-card-type">${type}</span><span class="cinema-card-view">Ver detalhes</span></div><div class="cinema-card-info"><h4>${title}</h4><p>${safeText(item.description||'')}</p><div class="cinema-meta"><span>⏱ ${safeText(item.duration||'Duração não informada')}</span><span>📅 ${safeText(item.releaseDate||item.year||'Data não informada')}</span></div></div></button><div class="cinema-card-actions"><button class="btn cinema-coming-soon" type="button" disabled>◷ Em breve</button><button class="btn" data-mylist="${safeText(item.id)}">${getMyList().includes(item.id)?'✓ Remover da lista':'+ Minha lista'}</button></div></article>`;
}

function renderCinema() {
  const featured=cinemaItems.filter(item=>item.featured),movies=cinemaItems.filter(item=>item.type!=='series'),series=cinemaItems.filter(item=>item.type==='series');
  $('cinema-featured').innerHTML=featured.length?featured.map(cinemaCard).join(''):'<div class="empty-state">Ainda não há destaques no catálogo.</div>';
  $('cinema-movies').innerHTML=movies.length?movies.map(cinemaCard).join(''):'<div class="empty-state">Nenhum filme cadastrado ainda.</div>';
  $('cinema-series').innerHTML=series.length?series.map(cinemaCard).join(''):'<div class="empty-state">Nenhuma série cadastrada ainda.</div>';
  const ids=getMyList(),saved=cinemaItems.filter(item=>ids.includes(item.id));
  $('cinema-my-list').innerHTML=saved.length?saved.map(cinemaCard).join(''):'<div class="empty-state">Sua lista está vazia. Adicione conteúdos para encontrá-los aqui.</div>';
  $('cinema-total-count').textContent=cinemaItems.length;renderCinemaAll();
}


const SERIES_EPISODE_DATA = {
 'lighty-steven-universe': [{name:'Temporada 1',count:52},{name:'Temporada 2',count:26},{name:'Temporada 3',count:25},{name:'Temporada 4',count:25},{name:'Temporada 5',count:32},{name:'Temporada 6',count:20}],
 'lighty-naruto': [{name:'Temporada 1',count:35},{name:'Temporada 2',count:48},{name:'Temporada 3',count:48},{name:'Temporada 4',count:48},{name:'Temporada 5',count:41}],
 'lighty-dragon-ball': [{name:'Temporada 1',count:13},{name:'Temporada 2',count:15},{name:'Temporada 3',count:40},{name:'Temporada 4',count:33},{name:'Temporada 5',count:31},{name:'Temporada 6',count:21}]
};
const EPISODE_TITLES = {
 'lighty-steven-universe': [[
  'Gem Glow','Laser Light Cannon','Cheeseburger Backpack','Together Breakfast','Frybo','Cat Fingers','Bubble Buddies','Serious Steven','Tiger Millionaire',"Steven's Lion",'Arcade Mania','Giant Woman','So Many Birthdays','Lars and the Cool Kids','Onion Trade','Steven the Sword Fighter','Lion 2: The Movie','Beach Party',"Rose's Room",'Coach Steven','Joking Victim','Steven and the Stevens','Monster Buddies','An Indirect Kiss','Mirror Gem','Ocean Gem','House Guest','Space Race','Secret Team','Island Adventure','Keep Beach City Weird!','Fusion Cuisine',"Garnet's Universe",'Watermelon Steven','Lion 3: Straight to Video','Alone Together','Warp Tour','The Test','Future Vision'
 ]],
 'lighty-naruto': [[
  'Sanjo! Uzumaki Naruto','Konohamaru da kore!','Shukuteki!? Sasuke to Sakura','Shiren! Sabaibaru enshû','Shikkaku? Kakashi no ketsuron'
 ]],
 'lighty-dragon-ball': [[
  'Bulma to Son Gokuu','Arararaa! Tama ga Nai!','Kame-Sennin no Kinto-Un','Hitosarai Youkai Oolong','Tsuyokute Warui Sabaku no Yamucha','Mayonaka no Houmonsha-tachi','Frypan Yama no Gyuumaou','Kame-Sennin no Kamehameha','Usagi Oyabun no Tokui Waza','Dragon Ball Ubawareru!!','Tsui ni Dragon Arawaru!','Shenron e no Negai','Gokuu no Dai Henshin'
 ]]
};
function lightyPurchasesKey(){return 'linercall-lighty-purchases-'+(currentUser?.uid||'guest');}
function getLightyPurchases(){try{return JSON.parse(localStorage.getItem(lightyPurchasesKey())||'{}');}catch{return {};}}
function hasLightyPurchase(key){return !!getLightyPurchases()[key];}
function buyLightyContent(key,cost,label){
 if(!pokemonArena)return;
 const purchases=getLightyPurchases();if(purchases[key])return toast('Você já comprou este conteúdo.');
 if(pokemonArena.coins<cost)return toast('Moedas insuficientes.');
 pokemonArena.coins-=cost;purchases[key]={boughtAt:Date.now()};localStorage.setItem(lightyPurchasesKey(),JSON.stringify(purchases));savePokemonArena();renderShop();toast(label+' comprado!');
}
function renderSeriesDetails(item,selectedSeason=0){
 const root=$('cinema-episodes'),related=$('cinema-related');if(!root||!related)return;
 const seasons=SERIES_EPISODE_DATA[item.id];
 if(item.type!=='series'||!seasons){root.innerHTML='';related.innerHTML='';return;}
 const active=Math.max(0,Math.min(selectedSeason,seasons.length-1));
 const season=seasons[active],titles=EPISODE_TITLES[item.id]?.[active]||[];
 const episodeImages={
  'lighty-steven-universe':{'1':'https://m.media-amazon.com/images/M/MV5BZWRiZTM3MzYtNWNkMS00OGIyLWEyMjAtY2IyYzI0ZjhjNTQyXkEyXkFqcGc%40._V1_.jpg'},
  'lighty-naruto':{'1':'https://serializd-tmdb-images.b-cdn.net/t/p/original/7xOP0rKDniTZKEaRM7seKfY9SG8.jpg'},
  'lighty-dragon-ball':{'1':'https://grupovierci.brightspotcdn.com/dims4/default/4e55558/2147483647/strip/false/crop/1180x886%2B0%2B0/resize/1180x886%21/quality/90/?url=https%3A%2F%2Fk2-prod-grupo-vierci.s3.us-east-1.amazonaws.com%2Fbrightspot%2Fadjuntos%2F161%2Fimagenes%2F008%2F322%2F0008322297.jpg'}
 };
 const seasonCards=seasons.map((entry,index)=>'<article class="lighty-season-card '+(index===active?'active':'')+'"><button class="lighty-season-select" type="button" data-select-season="'+index+'" data-season-show="'+safeText(item.id)+'"><b>'+safeText(entry.name)+'</b><small>'+entry.count+' episódios</small></button><button class="btn btn-primary lighty-season-buy" type="button" data-buy-season="'+safeText(item.id)+'" data-season-index="'+index+'">'+(hasLightyPurchase('season:'+item.id+':'+index)?'✓ Comprada':'Comprar · 1.500')+'</button></article>').join('');
 const episodeCards=Array.from({length:season.count},(_,n)=>{
  const number=n+1,title=titles[n]||'Episódio '+number,image=episodeImages[item.id]?.[String(number)]||item.poster||item.backdrop||'';
  return '<button class="lighty-episode-card" type="button" data-episode-number="'+number+'" title="'+safeText(title)+'"><span class="lighty-episode-thumb"><img src="'+safeText(image)+'" alt="Imagem de '+safeText(title)+'" loading="lazy"><i>▶</i></span><b>'+safeText(title)+'</b><small>Episódio '+number+'</small></button>';
 }).join('');
 root.innerHTML='<section class="lighty-season-picker"><div class="lighty-section-heading"><h3>Escolha uma temporada</h3><span>1.500 LCoins cada</span></div><div class="lighty-carousel-wrap"><button class="lighty-carousel-arrow" type="button" data-lighty-scroll="seasons" data-direction="prev" aria-label="Temporadas anteriores">‹</button><div class="lighty-season-row">'+seasonCards+'</div><button class="lighty-carousel-arrow" type="button" data-lighty-scroll="seasons" data-direction="next" aria-label="Próximas temporadas">›</button></div></section><section class="lighty-episode-picker"><div class="lighty-section-heading"><h3>'+safeText(item.title)+' · '+safeText(season.name)+'</h3><span>Seleção de episódios</span></div><div class="lighty-carousel-wrap"><button class="lighty-carousel-arrow" type="button" data-lighty-scroll="episodes" data-direction="prev" aria-label="Episódios anteriores">‹</button><div class="lighty-episode-row">'+episodeCards+'</div><button class="lighty-carousel-arrow" type="button" data-lighty-scroll="episodes" data-direction="next" aria-label="Próximos episódios">›</button></div></section>';
 const recommendations=item.id==='lighty-steven-universe'?['Hora de Aventura','Gravity Falls','A Casa Coruja','Amphibia']:item.id==='lighty-naruto'?['Boruto','Dragon Ball','One Piece']:['Naruto','One Piece','Yu-Gi-Oh!'];
 related.innerHTML='<h3>Títulos semelhantes</h3><div class="related-title-list">'+recommendations.map(title=>'<span>'+safeText(title)+'</span>').join('')+'</div>';applyLanguage();
}

let cinemaFilter='all';
function setCinemaTab(tab){$('cinema-home-view')?.classList.toggle('hidden',tab!=='home');$('cinema-all-view')?.classList.toggle('hidden',tab!=='all');$('cinema-list-view')?.classList.toggle('hidden',tab!=='list');document.querySelectorAll('[data-cinema-tab]').forEach(b=>b.classList.toggle('active',b.dataset.cinemaTab===tab));if(tab==='list')renderCinemaList();}
function renderCinemaAll(){const items=cinemaFilter==='all'?cinemaItems:cinemaItems.filter(item=>item.type===cinemaFilter);if($('cinema-all-grid'))$('cinema-all-grid').innerHTML=items.length?items.map(cinemaCard).join(''):'<div class="empty-state">Nenhum conteúdo nesta categoria.</div>';renderCinemaList();$('cinema-list-count').textContent=getMyList().length;}function renderCinemaList(){const ids=getMyList(),items=cinemaItems.filter(item=>ids.includes(item.id));if($('cinema-list-grid'))$('cinema-list-grid').innerHTML=items.length?items.map(cinemaCard).join(''):'<div class="empty-state">Sua lista está vazia. Adicione filmes e séries pelo catálogo.</div>';if($('cinema-list-count'))$('cinema-list-count').textContent=ids.length;}
function openCinemaDetails(id){
 const item=cinemaItems.find(entry=>entry.id===id);if(!item)return;
 const poster=validWebUrl(item.poster||item.backdrop||'');
 $('cinema-detail-title').textContent=item.title||'Sem título';$('cinema-detail-type').textContent=item.type==='series'?'SÉRIE':'FILME';$('cinema-detail-description').textContent=item.description||'Descrição ainda não disponível.';
 $('cinema-detail-meta').innerHTML=[item.year||item.releaseDate,item.duration].filter(Boolean).map(v=>'<span>'+safeText(v)+'</span>').join('');
 renderSeriesDetails(item,0);
 $('cinema-detail-poster').src=poster||'https://placehold.co/500x750/17152b/e7d8ff?text=LIGHTYFLIX';$('cinema-detail-poster').alt=item.title||'Pôster';
 $('cinema-detail-backdrop').style.backgroundImage=poster?'url("'+poster.replace(/"/g,'%22')+'")':'linear-gradient(120deg,#302247,#141b31)';
 const purchaseButton=$('cinema-detail-buy');if(purchaseButton){const key='movie:'+id,owned=hasLightyPurchase(key);purchaseButton.textContent=owned?'✓ Filme comprado':'Comprar filme · 2.000 moedas';purchaseButton.disabled=item.type!=='movie'||owned;purchaseButton.classList.toggle('hidden',item.type!=='movie');purchaseButton.onclick=()=>buyLightyContent(key,2000,'Filme');}
 const listButton=$('cinema-detail-list');listButton.dataset.itemId=id;const refresh=()=>{listButton.textContent=getMyList().includes(id)?'✓ Remover da lista':'+ Minha lista';};listButton.onclick=()=>{toggleMyList(id);refresh();};refresh();
 $('cinema-details').classList.remove('hidden');document.body.classList.add('cinema-modal-open');applyLanguage();
}
function closeCinemaDetails(){$('cinema-details')?.classList.add('hidden');document.body.classList.remove('cinema-modal-open');}
async function loadCinema() {
  createCinemaPage();

  $('cinema-featured').innerHTML =
    '<div class="empty-state">Carregando catálogo...</div>';

  try {
    const snapshot = await getDocs(
      query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(100))
    );

    const communityItems = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    const builtInCatalog = [
      {id:'lighty-steven-universe',title:'Steven Universo',type:'series',year:2013,releaseDate:'4 de novembro de 2013',duration:'~11 min por episódio',description:'Steven vive em Beach City ao lado das Crystal Gems, descobrindo seus poderes, sua família e o universo das Gems. A sexta temporada reúne a continuação conhecida como Steven Universo Futuro.',featured:true,poster:'https://assets.qz.com/media/a30cb33e8ca08c00ea178c350bbfac6e.jpg'},
      {id:'lighty-naruto',title:'Naruto',type:'series',year:2002,releaseDate:'3 de outubro de 2002',duration:'~23 min por episódio',description:'Naruto Uzumaki é um jovem ninja que sonha em se tornar Hokage. Enfrentando desafios, rivais e missões perigosas, ele busca reconhecimento e cria laços que mudarão seu caminho.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BZmQ5NGFiNWEtMmMyMC00MDdiLTg4YjktOGY5Yzc2MDUxMTE1XkEyXkFqcGdeQXVyNTA4NzY1MzY%40._V1_FMjpg_UX1000_.jpg'},
      {id:'lighty-dragon-ball',title:'Dragon Ball',type:'series',year:1986,releaseDate:'26 de fevereiro de 1986',duration:'~24 min por episódio',description:'Acompanhe Goku desde a infância em uma jornada cheia de artes marciais, amizades e aventuras em busca das lendárias Esferas do Dragão.',featured:true,poster:'https://image.tmdb.org/t/p/w780/1YIJYarVZKH3nq89n1lVAxeVktg.jpg'},
      {id:'lighty-peabody-sherman',title:'As Aventuras de Peabody e Sherman',type:'movie',year:2014,releaseDate:'28 de fevereiro de 2014 (Brasil)',duration:'92 min',description:'Sr. Peabody, um cão inventor e genial, e seu filho adotivo Sherman viajam pela história usando a máquina do tempo WABAC. Quando uma aventura sai do controle, os dois precisam consertar o passado para proteger o futuro.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BYTBjMDAzYTEtYTI2ZS00MWJkLWJiM2MtOGEwN2NhZGQ1MmNlXkEyXkFqcGc%40._V1_FMjpg_UX1000_.jpg'},
      {id:'lighty-steven-universe-movie',title:'Steven Universo: O Filme',type:'movie',year:2019,releaseDate:'7 de outubro de 2019 (Brasil)',duration:'82 min',description:'Depois de um longo período de paz, Steven acredita que finalmente poderá descansar. Mas uma nova ameaça chega à Terra, obrigando-o e às Crystal Gems a proteger tudo o que construíram.',featured:true,poster:'https://www.syfy.com/sites/syfy/files/2019/07/stevenuniverse.png'}
    ];
    const knownIds = new Set(communityItems.map(item=>item.id));
    cinemaItems = [...builtInCatalog.filter(item=>!knownIds.has(item.id)), ...communityItems];

    renderCinema();
    applyLanguage();

  } catch (error) {
    console.warn('Catálogo indisponível:', error);

    cinemaItems = [];

    $('cinema-featured').innerHTML =
      '<div class="empty-state">O catálogo ainda não está configurado no banco de dados.</div>';

    $('cinema-movies').innerHTML =
      '<div class="empty-state">Os conteúdos aparecerão aqui quando forem cadastrados.</div>';

    $('cinema-series').innerHTML =
      '<div class="empty-state">As séries aparecerão aqui quando forem cadastradas.</div>';

    $('cinema-my-list').innerHTML =
      '<div class="empty-state">Sua lista está vazia.</div>';
  }
}

function playCinemaItem(id) {
  const item = cinemaItems.find(entry => entry.id === id);

  if (!item) {
    toast('Conteúdo não encontrado.');
    return;
  }

  const source = validWebUrl(item.sourceUrl || item.embedUrl || '');
  if(item.type==='movie'&&!hasLightyPurchase('movie:'+id))return toast('Compre este filme por 2.000 moedas para liberar.');

  if (!source) {
    toast('Este conteúdo ainda não tem uma fonte válida.');
    return;
  }

  const embed = getYouTubeEmbed(source);

  $('cinema-player-title').textContent = item.title || 'Conteúdo';

  if (embed) {
    $('cinema-player-content').innerHTML = `
      <div style="position:relative;width:100%;aspect-ratio:16/9;">
        <iframe
          src="${embed}"
          title="${safeText(item.title || 'Vídeo')}"
          style="position:absolute;inset:0;width:100%;height:100%;border:0;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
      </div>
    `;
  } else {
    $('cinema-player-content').innerHTML = `
      <p>Este conteúdo não permite reprodução incorporada.</p>
      <a href="${source}" target="_blank" rel="noopener noreferrer">
        Abrir fonte oficial
      </a>
    `;
  }

  $('cinema-player').classList.remove('hidden');
  $('cinema-player').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function closeCinemaPlayer() {
  $('cinema-player-content').innerHTML = '';
  $('cinema-player').classList.add('hidden');
}

function toggleMyList(id) {
  const list = getMyList();
  const removing = list.includes(id);
  saveMyList(removing ? list.filter(item => item !== id) : [...list, id]);
  toast(removing ? 'Removido da sua lista.' : 'Adicionado à sua lista.');
  renderCinema();
  renderCinemaList();
}


/* ========================================
   MODO HISTÓRIA — CAPÍTULO 1
   ======================================== */
let storyGame=null, storyFrame=0, storyLoop=0;
const STORY_BEATS=[
 ['A CARTA DO BARDO','O herói sem nome está longe de sua vila quando uma carta chega: “A princesa foi capturada. Malacord tomou o castelo. Preciso de você. — seu velho amigo, o Bardo”.'],
 ['A LONGA ESTRADA','A jornada começa. Criaturas do Malacord ocupam as estradas, florestas e pontes. O herói terá de atravessar todo o caminho até o reino.'],
 ['O CASTELO FECHADO','Estátuas e fontes do herói enfeitam a cidade. Mas os guardas não o deixam passar: dizem que o verdadeiro herói já está lá dentro — e que este é um impostor.'],
 ['O PLANO DO BARDO','O Bardo explica que subiu a Montanha Sagrada. No topo existe um dragão antigo. Talvez possam entrar no castelo pelo alto.'],
 ['A CHAVE E O PEIXE','Perto do caminho, o Bardo é surpreendido por um peixe monstruoso. Derrote-o! No fim, o Bardo toca uma canção que o faz dormir. A chave aparece dentro dele.'],
 ['A MONTANHA SAGRADA','Goblins de Malacord guardam a subida. No topo, um dragão protege uma pilha de moedas e ameaça devorar os dois.'],
 ['MOEDAS DE CHOCOLATE','O herói desliza pela montanha e revela a embalagem aberta: as moedas eram de chocolate! Malacord enganou o dragão. Envergonhado, ele aceita ajudar — desde que ninguém conte.'],
 ['O CASTELO POR CIMA','O dragão os leva ao topo do castelo. Eles prometem recompensá-lo com moedas verdadeiras e pedem que espere encostado à árvore da montanha.'],
 ['O CASAMENTO','Uma escada leva à torre. Lá embaixo, Malacord veste roupa de casamento: pretende se casar com a princesa. O herói e o Bardo se separam para procurá-la.'],
 ['A POÇÃO','O herói encontra um baú com o mapa do casamento e uma poção. Sem saber o que faz, derrama o líquido na espada. Ela se transforma em uma espada flamejante!'],
 ['A PRINCESA SABE','No calabouço, o Bardo encontra a princesa. Ela percebe o perigo: “Não é isso que o Malacord quer! Que ele derrame uma poção os caramba!”'],
 ['A ESPADA EXPLODE','O herói chega ao salão. A espada pisca — e explode. A névoa toma o lugar. A princesa é acorrentada e surge uma cópia nebulosa do herói.'],
 ['O HERÓI CONTRA SI MESMO','A cada golpe do herói, a névoa imita o ataque. A solução é parar de lutar. Quando o herói abaixa a espada e não ataca, a cópia se desfaz em pó.'],
 ['O ÚLTIMO GOLPE','Malacord voa com uma pancada de alaúde do Bardo — que luta mesmo com a mão machucada. O vilão cai desacordado.'],
 ['UM RESGATE IMPROVÁVEL','A chave está presa ao braço da princesa. As grades vão pegar fogo em 1 minuto. O herói pensa em cortar o braço… mas percebe que pode cortar as cordas que prendem as grades!'],
 ['FIM DO CAPÍTULO 1','A princesa está livre. Malacord é levado ao calabouço. Ao acordar, ele se autointitula… GANONDORF!']
];
function storyMarkup(){
 return `<div class="story-shell"><div class="story-top"><div><span class="eyebrow">LINERCALL ORIGINAL · CAPÍTULO 1</span><h2>O HERÓI SEM NOME</h2><p>Uma aventura de plataforma, monstros, mistérios e decisões duvidosas.</p></div><div class="story-price"><b>2.500</b><small> LCoins · PREÇO FUTURO</small><strong>GRÁTIS PARA TESTAR</strong></div></div>
 <div class="story-hud"><span id="story-status">A caminho da vila…</span><span id="story-progress">0%</span></div>
 <canvas id="story-canvas" width="960" height="420" aria-label="Jogo de plataforma pixel art"></canvas>
 <div class="story-controls"><button data-story-left>◀</button><button data-story-jump>▲</button><button data-story-attack>⚔</button><button data-story-right>▶</button></div>
 <div class="story-dialogue" id="story-dialogue"><b>Uma carta chegou.</b><p>Use ← → para andar, Espaço para pular e X para atacar. Atravesse a estrada e enfrente os monstros de Malacord.</p></div>
 <div class="story-actions"><small>Controles: ← → mover · Espaço pular · X atacar</small><button class="btn btn-primary" data-story-next>Começar aventura →</button><button class="btn" data-story-exit>Voltar aos minigames</button></div></div>`;
}
function startStory(){
 showMiniGamePage('story');
 const stage=$('minigame-stage'); if(!stage)return;
 let root=$('story-game-content'); if(!root){root=document.createElement('div');root.id='story-game-content';stage.appendChild(root);}
 root.innerHTML=storyMarkup();
 storyGame={x:60,y:300,vx:0,vy:0,ground:true,world:0,hp:5,score:0,scene:0,dialogue:true,keys:{},attack:0,enemy:[],finished:false};
 for(let i=0;i<26;i++)storyGame.enemy.push({x:480+i*205,y:326,alive:true,type:i%3});
 storyGame.enemy.push({x:5350,y:326,alive:true,boss:true});
 storyRender();
 if(storyLoop)cancelAnimationFrame(storyLoop);
 storyTick();
}
function storySay(title,body,button='Continuar →'){
 const box=$('story-dialogue');if(!box)return;
 box.innerHTML='<b>'+safeText(title)+'</b><p>'+safeText(body)+'</p><button class="btn btn-primary" data-story-resume>'+button+'</button>';
 storyGame.dialogue=true;storyGame.keys={};
}
function storyRender(){
 const canvas=$('story-canvas');if(!canvas||!storyGame)return;
 const c=canvas.getContext('2d'),g=storyGame,w=canvas.width,h=canvas.height,cam=Math.max(0,g.x-250);
 c.imageSmoothingEnabled=false;
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#04b9f3');sky.addColorStop(1,'#8beaff');c.fillStyle=sky;c.fillRect(0,0,w,h);
 c.fillStyle='#fff7b0';c.beginPath();c.arc(770,65,47,0,Math.PI*2);c.fill();
 for(let i=0;i<9;i++){let x=((i*210-cam*.22)%(w+180)+w+180)%(w+180)-80;c.fillStyle='#d7fbff';c.fillRect(x,100+(i%3)*22,95,18);c.fillRect(x+18,86+(i%3)*22,42,25);}
 c.fillStyle='#4b9a4b';c.fillRect(0,340,w,80);c.fillStyle='#80d84c';for(let x=0;x<w;x+=13)c.fillRect(x,334+(x%3)*2,8,9);
 c.fillStyle='#805334';c.fillRect(0,370,w,50);c.fillStyle='#b9874e';for(let x=0;x<w;x+=28)c.fillRect(x,379,14,4);
 // árvores e flores
 for(let i=0;i<20;i++){let x=((i*170-cam*.65)%(w+100)+w+100)%(w+100)-30;c.fillStyle='#76502f';c.fillRect(x+15,275,14,65);c.fillStyle='#278b42';c.fillRect(x,240,45,42);c.fillStyle='#46bb4c';c.fillRect(x+8,225,28,28);}
 // marco distante
 if(g.world>850){c.fillStyle='#7b7b9e';c.fillRect(760,235,130,105);c.fillStyle='#e2c47a';c.fillRect(790,205,70,35);}
 // inimigos
 g.enemy.forEach(e=>{if(!e.alive)return;let x=e.x-cam;if(x<-40||x>w+40)return;c.fillStyle=e.boss?'#702b83':'#527b37';c.fillRect(x,300,e.boss?52:30,38);c.fillStyle='#f2d7a0';c.fillRect(x+6,310,7,7);c.fillRect(x+19,310,7,7);c.fillStyle='#301d30';c.fillRect(x+8,312,3,3);c.fillRect(x+21,312,3,3);});
 // herói
 let px=g.x-cam;c.fillStyle='#874c31';c.fillRect(px+4,g.y-12,24,24);c.fillStyle='#e6a16b';c.fillRect(px+7,g.y-8,19,17);c.fillStyle='#5c3927';c.fillRect(px+5,g.y-15,22,8);c.fillStyle='#f6d75e';c.fillRect(px+7,g.y+8,20,7);c.fillStyle='#3565a4';c.fillRect(px+4,g.y+17,9,15);c.fillRect(px+18,g.y+17,9,15);c.fillStyle='#fff';c.fillRect(px+18,g.y-4,4,4);
 if(g.attack>0){c.fillStyle='#fff1a1';c.fillRect(px+27,g.y+1,28,5);c.fillRect(px+45,g.y-5,5,18);}
 c.fillStyle='#17304a';c.fillRect(18,18,180,14);c.fillStyle='#f15e67';c.fillRect(20,20,g.hp*32,10);c.fillStyle='#fff';c.font='14px monospace';c.fillText('♥ '+g.hp+'   ✦ '+g.score,20,53);
 c.fillStyle='rgba(8,20,36,.7)';c.fillRect(0,398,w,22);c.fillStyle='#fff';c.font='12px monospace';c.fillText('ESTRADA DE MALACORD  ·  '+Math.min(100,Math.floor(g.world/55))+'%',12,414);
 const prog=$('story-progress');if(prog)prog.textContent=Math.min(100,Math.floor(g.world/55))+'%';
}
function storyTick(){
 if(!storyGame||storyGame.finished)return;
 const g=storyGame;
 if(!g.dialogue){
  let dir=(g.keys.right?1:0)-(g.keys.left?1:0);g.vx=dir*3.3;g.x=Math.max(0,g.x+g.vx);g.world=g.x;g.vy+=.55;g.y+=g.vy;
  if(g.y>=300){g.y=300;g.vy=0;g.ground=true;}
  if(g.attack>0){g.attack--;g.enemy.forEach(e=>{if(e.alive&&Math.abs(e.x-g.x)<72){e.alive=false;g.score+=e.boss?500:25;}});}
  g.enemy.forEach(e=>{if(e.alive&&Math.abs(e.x-g.x)<28&&g.y>=295){if(!g.hitLock){g.hp--;g.hitLock=50;if(g.hp<=0){g.hp=5;g.x=Math.max(0,g.x-220);storySay('Recuar não é desistir!','O herói recupera o fôlego em um ponto seguro. Tente novamente.');}}}});
  if(g.hitLock)g.hitLock--;
  const milestones=[900,1800,2650,3500,4300,5100];
  const next=milestones[g.scene];
  if(next&&g.x>=next){g.scene++;g.dialogue=true;const lines=[
   ['A VILA DO HERÓI','As fontes e estátuas mostram o rosto do herói. Os guardas, porém, juram que ele é uma fraude. O Bardo aparece e conta seu plano.'],
   ['O PEIXE MONSTRUOSO','O Bardo é agarrado por um peixe enorme! Acerte-o três vezes. O Bardo tocará uma canção para fazê-lo dormir.'],
   ['A MONTANHA','Goblins cercam a trilha. O dragão do topo está guardando moedas que Malacord lhe deu.'],
   ['CHOCOLATE?!','A embalagem aberta entrega o truque. O dragão aceita ajudar, mas exige segredo.'],
   ['O CASTELO','Vocês entram pelo alto. Malacord planeja se casar com a princesa. Procurem a torre e o calabouço.'],
   ['O SALÃO FINAL','A espada flamejante explode e a névoa cria um clone. Não ataque: a névoa copia cada golpe!']
  ][g.scene-1];storySay(lines[0],lines[1]);}
  if(g.x>5400){g.finished=true;storySay('CAPÍTULO CONCLUÍDO','A princesa foi salva, Malacord está no calabouço e o vilão acorda se autointitulando… GANONDORF!','Jogar novamente');}
 }
 storyRender();storyLoop=requestAnimationFrame(storyTick);
}
function storyKeyDown(e){
 if(!storyGame)return;
 const k=e.key.toLowerCase();if(['arrowleft','arrowright',' ','x'].includes(k))e.preventDefault();
 if(k==='arrowleft'||k==='a')storyGame.keys.left=true;
 if(k==='arrowright'||k==='d')storyGame.keys.right=true;
 if(k===' '||k==='arrowup'||k==='w'){if(storyGame.ground&&!storyGame.dialogue){storyGame.vy=-10;storyGame.ground=false;}}
 if(k==='x'||k==='z'){if(!storyGame.dialogue)storyGame.attack=12;}
}
function storyKeyUp(e){if(!storyGame)return;const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')storyGame.keys.left=false;if(k==='arrowright'||k==='d')storyGame.keys.right=false;}
window.addEventListener('keydown',storyKeyDown);window.addEventListener('keyup',storyKeyUp);
function stopStory(){if(storyLoop)cancelAnimationFrame(storyLoop);storyLoop=0;storyGame=null;}

// ========================================
// EVENTOS
// ========================================

function setupEvents() {
  $('google-login')?.addEventListener('click', login);
  $('site-language')?.addEventListener('change', event => { localStorage.setItem(LANGUAGE_KEY,event.target.value); location.reload(); });
  document.querySelector('.brand-lockup')?.addEventListener('click', event => { event.preventDefault(); switchView('welcome'); });
  $('chat-form')?.addEventListener('submit', sendMessage);
  $('friend-search-form')?.addEventListener('submit', event => { event.preventDefault(); searchFriend(); });
  $('dm-form')?.addEventListener('submit', sendDirectMessage);
  $('profile-form')?.addEventListener('submit', saveProfile);
  document.addEventListener('change', event => { if (event.target.id === 'shop-avatar-file') handleShopAvatarFile(event); });
  $('logout')?.addEventListener('click', logout);
  $('leave-call')?.addEventListener('click', leaveCall);

  $('close-game')?.addEventListener('click', backToMiniGames);

  $('play-dice')?.addEventListener('click', () => showMiniGamePage('dice'));
  $('play-reaction')?.addEventListener('click', () => showMiniGamePage('reaction'));
  $('play-pokemon')?.addEventListener('click', () => showMiniGamePage('pokemon'));
  $('play-tetris')?.addEventListener('click', () => showMiniGamePage('tetris'));
  $('sidebar-collapse')?.addEventListener('click',()=>{document.querySelector('.app-shell')?.classList.toggle('sidebar-collapsed');localStorage.setItem('linercall-sidebar-collapsed',document.querySelector('.app-shell')?.classList.contains('sidebar-collapsed')?'1':'0');});
  document.addEventListener('input', event => { if (['avatar-crop-zoom','avatar-crop-x','avatar-crop-y'].includes(event.target.id)) updateCropPreview(); });

  // Delegação também atende ao botão LightyFlix, criado dinamicamente.
  document.addEventListener('click', event => {
    const storyStart=event.target.closest('#play-story'); if(storyStart)startStory();
    if(event.target.closest('[data-story-exit]'))backToMiniGames();
    if(event.target.closest('[data-story-next]')){const box=$('story-dialogue');if(box){box.innerHTML='<b>A aventura começa!</b><p>Avance pela estrada. Pule obstáculos e use X para atacar os monstros.</p>';storyGame.dialogue=false;}}
    if(event.target.closest('[data-story-resume]')){if(storyGame?.finished){startStory();}else if(storyGame){storyGame.dialogue=false;const box=$('story-dialogue');if(box)box.innerHTML='<b>Continue!</b><p>← → mover · Espaço pular · X atacar.</p>';}}
    if(event.target.closest('[data-story-left]')&&storyGame)storyGame.keys.left=true;
    if(event.target.closest('[data-story-right]')&&storyGame)storyGame.keys.right=true;
    if(event.target.closest('[data-story-jump]')&&storyGame&&!storyGame.dialogue&&storyGame.ground){storyGame.vy=-10;storyGame.ground=false;}
    if(event.target.closest('[data-story-attack]')&&storyGame&&!storyGame.dialogue)storyGame.attack=12;
    const navButton = event.target.closest('.nav-item[data-view]');
    if (navButton) { switchView(navButton.dataset.view); if (navButton.dataset.view === 'shop') renderShop(); }
  });

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.go));
  });

  document.querySelectorAll('.join-room').forEach(button => {
    button.addEventListener('click', () => joinCall(button.dataset.room));
  });

  document.addEventListener('click', event => {
    const lightyScroll=event.target.closest('[data-lighty-scroll]');if(lightyScroll){const row=lightyScroll.parentElement?.querySelector(lightyScroll.dataset.lightyScroll==='episodes'?'.lighty-episode-row':'.lighty-season-row');if(row)row.scrollBy({left:(lightyScroll.dataset.direction==='next'?1:-1)*Math.max(220,row.clientWidth*.78),behavior:'smooth'});}
    const seasonBuy=event.target.closest('[data-buy-season]');if(seasonBuy)buyLightyContent('season:'+seasonBuy.dataset.buySeason+':'+seasonBuy.dataset.seasonIndex,1500,'Temporada');
    const seasonSelect=event.target.closest('[data-select-season]');if(seasonSelect){const item=cinemaItems.find(entry=>entry.id===seasonSelect.dataset.seasonShow);if(item)renderSeriesDetails(item,Number(seasonSelect.dataset.selectSeason));}
    const lightyMovie=event.target.closest('[data-shop-movie]');if(lightyMovie)buyLightyContent('movie:'+lightyMovie.dataset.shopMovie,2000,'Filme');
    const openLighty=event.target.closest('[data-shop-open-cinema]');if(openLighty){switchView('cinema');openCinemaDetails(openLighty.dataset.shopOpenCinema);}
    const addFriend = event.target.closest('[data-friend-add]'); if(addFriend)sendFriendRequest(addFriend.dataset.friendAdd,addFriend.dataset.friendAddName);
    const acceptFriend = event.target.closest('[data-friend-accept]'); if(acceptFriend)answerFriendRequest(acceptFriend.dataset.friendAccept,true);
    const rejectFriend = event.target.closest('[data-friend-reject]'); if(rejectFriend)answerFriendRequest(rejectFriend.dataset.friendReject,false);
    const openFriend = event.target.closest('[data-friend-open]'); if(openFriend)openDirectMessage(openFriend.dataset.friendOpen,openFriend.dataset.friendName);
    const pick = event.target.closest('[data-pokemon-pick]');
    if (pick) addPokemonToTeam(pick.dataset.pokemonPick);

    const remove = event.target.closest('[data-pokemon-remove]');
    if (remove) removePokemonFromTeam(remove.dataset.pokemonRemove);

    const battle = event.target.closest('[data-pokemon-battle]');
    if (battle) startPokemonBattle();

    const move = event.target.closest('[data-pokemon-move]');
    if (move) performPokemonMove(Number(move.dataset.pokemonMove));

    const swap = event.target.closest('[data-pokemon-switch]');
    if (swap) switchPokemonInBattle(Number(swap.dataset.pokemonSwitch));

    const closeBattle = event.target.closest('[data-pokemon-close-battle]');
    if (closeBattle) closePokemonBattle();

    const acceptChallenge = event.target.closest('[data-challenge-accept]');
    if (acceptChallenge) respondToChallenge(acceptChallenge.dataset.challengeAccept, true);
    const rejectChallenge = event.target.closest('[data-challenge-reject]');
    if (rejectChallenge) respondToChallenge(rejectChallenge.dataset.challengeReject, false);

    const duel = event.target.closest('[data-challenge]');
    if (duel) {
      challengePlayer(duel.dataset.challenge, duel.dataset.name);
    }

    const cinemaTab=event.target.closest('[data-cinema-tab]');if(cinemaTab)setCinemaTab(cinemaTab.dataset.cinemaTab);
    const cinemaFilterButton=event.target.closest('[data-cinema-filter]');if(cinemaFilterButton){cinemaFilter=cinemaFilterButton.dataset.cinemaFilter;document.querySelectorAll('[data-cinema-filter]').forEach(b=>b.classList.toggle('active',b===cinemaFilterButton));renderCinemaAll();}
    const cinemaScroll=event.target.closest('[data-cinema-scroll]');if(cinemaScroll){const row=$(cinemaScroll.dataset.cinemaScroll);if(row)row.scrollBy({left:(cinemaScroll.dataset.direction==='next'?1:-1)*Math.max(260,row.clientWidth*.8),behavior:'smooth'});}
    const cinemaOpen=event.target.closest('[data-cinema-open]');if(cinemaOpen)openCinemaDetails(cinemaOpen.dataset.cinemaOpen);
    if(event.target.closest('[data-cinema-close]'))closeCinemaDetails();
    const watch = event.target.closest('[data-watch]');
    if (watch) playCinemaItem(watch.dataset.watch);

    const mylist = event.target.closest('[data-mylist]');
    if (mylist) { event.stopPropagation(); toggleMyList(mylist.dataset.mylist); }


    const shopBuy = event.target.closest('[data-shop-buy]');
    if (shopBuy) buyShopItem(shopBuy.dataset.shopBuy);
    if (event.target.closest('[data-minigame-back]')) backToMiniGames();
    if (event.target.closest('[data-crop-cancel]')) { pendingAvatarImage=null; $('avatar-cropper')?.classList.add('hidden'); }
    if (event.target.closest('[data-crop-save]')) saveCroppedAvatar();
    if (event.target.closest('[data-profile-close]')) $('member-profile-modal')?.classList.add('hidden');
    const profileTrigger=event.target.closest('[data-profile-open]'); if(profileTrigger) openMemberProfile(profileTrigger.dataset.profileOpen, profileTrigger.dataset.profileName);
    const profileAdd=event.target.closest('[data-profile-add]'); if(profileAdd)sendFriendRequest(profileAdd.dataset.profileAdd,profileAdd.dataset.profileAddName);
    const profileMessage=event.target.closest('[data-profile-message]'); if(profileMessage){$('member-profile-modal')?.classList.add('hidden');openDirectMessage(profileMessage.dataset.profileMessage,profileMessage.dataset.profileMessageName);}
    const bannerPick=event.target.closest('[data-banner-style]'); if(bannerPick) saveBannerChoice(Number(bannerPick.dataset.bannerStyle));
  });
}

// ========================================
// INICIALIZAÇÃO
// ========================================

setupEvents();
createCinemaPage();
createShopPage();
buildSidebarNavigation();
applyLanguage();

if (configured) {
  try {
    const app = initializeApp(firebaseConfig);

    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, user => {
      if (user) {
        if (!user.email?.toLowerCase().endsWith('@gmail.com')) {
          signOut(auth);
          showAuthStatus('Entre com uma conta @gmail.com.', true);
          return;
        }

        startApp(user).catch(error => {
          console.error('Erro ao abrir a conta:', error);
          toast('Erro ao abrir sua conta. Confira as regras do Firebase.');
        });

      } else {
        currentUser = null;
        profile = null;
        cleanupListeners();
        stopFriendListeners.forEach(fn=>fn()); stopFriendListeners=[];
        if(window.stopDMListener)window.stopDMListener();

        $('app-shell')?.classList.add('hidden');
        $('auth-screen')?.classList.remove('hidden');
      }
    });

  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    showAuthStatus('Não foi possível conectar ao Firebase.', true);
  }

} else {
  showAuthStatus('Configure o Firebase para ativar o login e os recursos online.', true);
}

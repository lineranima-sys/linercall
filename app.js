import { createSocialControls } from './social-controls.js?v=20261105';
import { createNotifications } from './social-notifications.js?v=20261105';
import { createPokemonOnline } from './pokemon-online.js?v=20261105-ranking-semanal';
import { mountStory } from './story-game.js?v=20261105-moedas-fire-dodge';
import { LIGHTY_SERIES, getLightyEpisodes, localizeLightyEpisodes } from './lightyflix-episodios.js?v=20261104-ptbr-order';
import { LIGHTY_PRICES, episodePrice, quoteSeason, ownsEpisode, lightyEpisodeKey, lightySeasonKey } from './lightyflix-pricing.js?v=20261105-episodes-150-300';

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
    notificationCenter?.destroy();notificationCenter=null;dmFocusOff();
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

  initSocialControls();
  initNotifications();
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
let notificationCenter = null;
let socialControls = null;
let latestFriendDocs = [];
let latestFriendRequests = [];
let dmWasCollapsed = false;
let dmFocus = false;
function dmFocusOff(){
 if(!dmFocus)return;
 dmFocus=false;document.body.classList.remove('dm-focus');
 const shell=$('app-shell');if(shell&&!dmWasCollapsed)shell.classList.remove('sidebar-collapsed');
 notificationCenter?.setActive(null);
}
function dmFocusOn(){
 const shell=$('app-shell');if(!dmFocus)dmWasCollapsed=!!shell?.classList.contains('sidebar-collapsed');
 dmFocus=true;document.body.classList.add('dm-focus');shell?.classList.add('sidebar-collapsed');
 const key='linercall-dm-help-v2-'+currentUser?.uid;
 if(!localStorage.getItem(key))$('dm-first-tip')?.classList.remove('hidden');
}
function initNotifications(){
 notificationCenter?.destroy();
 notificationCenter=createNotifications({
  db,uid:currentUser.uid,
  openDM:(uid,name)=>openDirectMessage(uid,name),
  openArena:()=>{switchView('games');showMiniGamePage('pokemon');},
  openFriends:()=>switchView('friends'),
  openOffer:()=>{switchView('shop');renderShop();}
 });
 notificationCenter.start();
 notificationCenter.setPreferences(socialControls);
}


function memberPhoto(user={}){
 const raw=String(user.avatarData||user.photoURL||(user.id===currentUser?.uid?(shopState?.avatarData||''):'')||'');
 return /^https:\/\//i.test(raw)||/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(raw)?raw:'';
}
function memberAvatarHTML(user){
 const img=memberPhoto(user),name=user.displayName||'Jogador';
 return '<span class="avatar member-avatar">'+(img?'<img src="'+safeText(img)+'" loading="lazy" alt="Foto de '+safeText(name)+'">':safeText(initials(name)))+'</span>';
}
function socialDisplayName(id,real){return socialControls?.label(id,real)||real||'Jogador';}
function refreshSocialUI(){
 notificationCenter?.setPreferences(socialControls);
 renderFriendRequests();
 renderFriendList();
 renderOnlineMembers(latestOnlinePlayers);
}
function initSocialControls(){
 socialControls?.destroy();
 socialControls=createSocialControls({
  db,uid:currentUser.uid,notify:toast,onChange:refreshSocialUI,
  onFriendRemoved:id=>{
   if(activeFriendId===id){window.stopDMListener?.();window.stopDMListener=null;activeFriendId=null;dmFocusOff();$('dm-panel')?.classList.add('hidden');}
   renderFriendList();
  }
 });
 socialControls.start();
}
function renderFriendList(){
 const box=$('friends-list');if(!box||!currentUser)return;
 const docs=latestFriendDocs.filter(d=>d.data().uids.some(id=>id!==currentUser.uid&&!socialControls?.hasBlocked(id)));
 notificationCenter?.setFriends(docs.map(d=>{
  const f=d.data(),other=f.uids.find(id=>id!==currentUser.uid);
  return {uid:other,name:socialDisplayName(other,f.names?.[other]||'Jogador')};
 }));
 box.innerHTML=docs.length?docs.map(d=>{
  const f=d.data(),other=f.uids.find(id=>id!==currentUser.uid),real=f.names?.[other]||'Jogador',
   alias=socialDisplayName(other,real),muted=socialControls?.isMuted(other);
  return '<div class="friend-row friend-with-actions">'+
   '<button type="button" class="friend-open" data-friend-open="'+safeText(other)+'" data-friend-name="'+safeText(real)+'">'+
   '<span>● '+safeText(alias)+'</span><small>'+(muted?'🔕 Silenciado':'Abrir conversa →')+'</small></button>'+
   '<button type="button" class="btn social-settings-btn" data-social-manage="'+safeText(other)+'" data-social-name="'+safeText(real)+'" aria-label="Gerenciar '+safeText(alias)+'">⚙</button></div>';
 }).join(''):'<p class="muted">Você ainda não adicionou amigos.</p>';
 notificationCenter?.render();
}
function renderOnlineMembers(active=latestOnlinePlayers){
 if(!currentUser)return;
 const members=(active||[]).filter(user=>!socialControls?.hasBlocked(user.id));
 if($('online-count'))$('online-count').textContent=String(members.length);
 if($('online-members'))$('online-members').innerHTML=members.length?members.map(user=>
  '<button class="member-row profile-open-trigger" data-profile-open="'+safeText(user.id)+'" data-profile-name="'+safeText(user.displayName||'Jogador')+'">'+
  memberAvatarHTML(user)+'<b>'+safeText(socialDisplayName(user.id,user.displayName||'Jogador'))+'</b><small>'+
  safeText(user.activityLabel||'online')+'</small></button>'
 ).join(''):'<p class="muted">Ninguém online por enquanto.</p>';
 if($('arena-members'))$('arena-members').innerHTML=members.filter(user=>user.id!==currentUser.uid).map(user=>
  '<div class="arena-player">'+memberAvatarHTML(user)+'<b>'+safeText(socialDisplayName(user.id,user.displayName||'Jogador'))+'</b><small>● online</small>'+
  '<button class="duel-btn" data-challenge="'+safeText(user.id)+'" data-name="'+safeText(user.displayName||'Jogador')+'">Desafiar</button></div>'
 ).join('')||'<p class="muted">Nenhum outro jogador online agora.</p>';
}

function friendPairId(a,b){return [a,b].sort().join('_');}
function renderFriendRequests(){
  const box=$('friend-requests');if(!box)return;
  const pending=latestFriendRequests.filter(d=>d.data().status==='pending'&&!socialControls?.hasBlocked(d.data().fromUid));
  notificationCenter?.setRequests(pending.map(d=>({id:d.id,uid:d.data().fromUid,name:d.data().fromName})));
  box.innerHTML=!pending.length?'<p class="muted">Nenhum pedido recebido.</p>':pending.map(d=>{
    const req=d.data();
    return '<div class="friend-row"><b>'+safeText(req.fromName)+'</b><div><button class="btn btn-primary" data-friend-accept="'+d.id+'">Aceitar</button> <button class="btn" data-friend-reject="'+d.id+'">Recusar</button></div></div>';
  }).join('');
}
function listenFriends(){
  stopFriendListeners.forEach(fn=>fn()); stopFriendListeners=[];
  const rq=query(collection(db,'friendRequests'),where('toUid','==',currentUser.uid));
  stopFriendListeners.push(onSnapshot(rq,snap=>{
    latestFriendRequests=snap.docs;
    renderFriendRequests();
  },e=>{console.error(e);toast('Não foi possível carregar pedidos.');}));
  const fq=query(collection(db,'friendships'),where('uids','array-contains',currentUser.uid));
  stopFriendListeners.push(onSnapshot(fq,snap=>{
    latestFriendDocs=snap.docs;
    renderFriendList();
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
  if(socialControls?.hasBlocked(uid))return toast('Desbloqueie esta pessoa antes de enviar um pedido.');
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
async function loadDMContact(uid,name){
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 set('dm-contact-name',socialDisplayName(uid,name));
 const avatar=$('dm-contact-avatar');if(avatar){avatar.textContent=initials(name);avatar.style.backgroundImage='';}
 set('dm-contact-activity','Buscando presença...');
 try{
  const snapshot=await getDoc(doc(db,'users',uid));
  if(uid!==activeFriendId||!snapshot.exists())return;
  const other=snapshot.data(),isOnline=Date.now()-(other.lastSeen?.toMillis?.()||0)<180000;
  set('dm-contact-name',socialDisplayName(uid,other.displayName||name));
  set('dm-contact-activity',isOnline?(other.activityLabel||'● Online'):'Offline');
  const photo=memberPhoto(other);if(photo&&avatar){avatar.style.backgroundImage='url("'+photo.replace(/"/g,'%22')+'")';avatar.textContent='';}
 }catch(e){if(uid===activeFriendId)set('dm-contact-activity','Status indisponível');}
}
function openDirectMessage(uid,name){
 if(!currentUser||!uid)return;
 if(socialControls?.hasBlocked(uid))return toast('Este jogador está bloqueado.');
 if(!$('view-friends')?.classList.contains('active-view'))switchView('friends');
 activeFriendId=uid;
 setPresence('private_chat','Em chat privado com '+name);
 $('dm-title').textContent=socialDisplayName(uid,name);
 $('dm-panel')?.classList.remove('hidden');
 $('dm-messages').innerHTML='<p class="muted">Carregando mensagens...</p>';
 dmFocusOn();notificationCenter?.setActive(uid);
 loadDMContact(uid,name);$('dm-input')?.focus();
 if(window.stopDMListener)window.stopDMListener();
 const path=collection(db,'conversations',friendPairId(currentUser.uid,uid),'messages');
 window.stopDMListener=onSnapshot(query(path,orderBy('createdAt','asc'),limit(100)),snap=>{
   if(activeFriendId!==uid)return;
   $('dm-messages').innerHTML=snap.empty?'<div class="dm-empty">✦<h4>Uma conversa começa aqui.</h4><p>Mande uma mensagem para '+safeText(name)+'!</p></div>':snap.docs.map(d=>{
    const m=d.data(),own=m.uid===currentUser.uid,time=m.createdAt?.toDate?.();
    const hour=time?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(time):'';
    return '<article class="dm-bubble '+(own?'own':'')+'"><header><b>'+safeText(m.displayName||'Jogador')+'</b><time>'+safeText(hour)+'</time></header><p>'+safeText(m.text)+'</p></article>';
   }).join('');
   $('dm-messages').scrollTop=$('dm-messages').scrollHeight;
   notificationCenter?.markRead(uid);
 },e=>{console.error(e);$('dm-messages').textContent='Não foi possível abrir esta conversa.';});
}
async function sendDirectMessage(event){
  event.preventDefault();const input=$('dm-input'),value=input.value.trim();
  if(!value||!activeFriendId)return;if(socialControls?.hasBlocked(activeFriendId))return toast('Jogador bloqueado.');if(value.length>1000){toast('A mensagem é muito longa.');return;}
  try{
    await addDoc(collection(db,'conversations',friendPairId(currentUser.uid,activeFriendId),'messages'),{uid:currentUser.uid,displayName:profile?.displayName||'Jogador',text:value,createdAt:serverTimestamp()});
    input.value='';input.style.height='auto';
  }catch(e){console.error(e);toast('Mensagem não enviada. Vocês precisam ser amigos.');}
}

function setPresence(activity,label){
  if(!currentUser||!db)return;
  updateDoc(doc(db,'users',currentUser.uid),{activity,activityLabel:label,lastSeen:serverTimestamp()})
    .then(()=>{if(profile)profile={...profile,activity,activityLabel:label};})
    .catch(error=>console.warn('Presença não atualizada:',error));
}
function switchView(name) {
  if(name==='friends')notificationCenter?.markCategory('friend');
  if(name!=='friends')dmFocusOff();
  if (name !== 'games' && miniGamePage === 'story') backToMiniGames();
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
    orderBy('lastSeen', 'desc')
  );

  stopListeners.push(onSnapshot(q, snap => {
    const active = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(user =>
        user.lastSeen?.toDate &&
        Date.now() - user.lastSeen.toDate().getTime() < 3 * 60 * 1000
      );

    latestOnlinePlayers=active;
    pokemonOnline?.setPlayers(active);
    if(rankingPlayers.length)renderGlobalRanking();
    renderOnlineMembers(active);

  }, error => {
    console.error(error);
    toast('Erro ao buscar membros.');
  }));
}

// ========================================
// RANKING
// ========================================

function currentIsoWeekKey(date = new Date()) {
  // Uma semana inicia segunda-feira à meia-noite em Brasília.
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date).map(p=>[p.type,p.value]));
  const d = new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function renderLocalBattleRecord() {
  const container=$('ranking-list');
  if(!container)return;
  let record=$('ranking-local-record');
  if(!record){record=document.createElement('div');record.id='ranking-local-record';record.className='ranking-local-record';container.parentNode?.appendChild(record);}
  const history=pokemonArena?.history||[];
  const week=currentIsoWeekKey();
  const local=history.filter(h=>h.date && currentIsoWeekKey(new Date(h.date))===week);
  const wins=local.filter(h=>h.win).length,losses=local.filter(h=>!h.win).length;
  record.innerHTML='<b>Seu registro local da semana</b><p>'+wins+' vitórias · '+losses+' derrotas</p>'+
  '<small>Salvo neste navegador. O ranking global requer validação pelo servidor para evitar resultados falsos.</small>';
}
// Classificação comunitária: todos os usuários, incluindo quem ainda tem 0 vitória.
// Apenas as vitórias/derrotas PvP confirmadas pelo servidor entram no placar GLOBAL.
let rankingPlayers=[],rankingScores=new Map(),rankingLoaded=false;
function rankingPortrait(user){
 const url=memberPhoto(user);
 const valid=/^https:\/\//i.test(url)||/^data:image\/(?:png|jpeg|webp);base64,/i.test(url);
 return valid?'<img src="'+safeText(url)+'" alt="Foto de '+safeText(user.displayName||'Jogador')+'" loading="lazy" referrerpolicy="no-referrer">':safeText(initials(user.displayName||'Jogador'));
}
function rankingOnline(user){
 const last=user.lastSeen?.toMillis?.()||user.lastSeen?.toDate?.()?.getTime()||0;
 return last>0&&Date.now()-last<3*60*1000;
}
function rankingUserStats(user){
 const score=rankingScores.get(user.id)||{};
 return {...user,wins:Math.max(0,Number(score.wins)||0),
  losses:Math.max(0,Number(score.losses)||0),points:Math.max(0,Number(score.points)||0),
  online:rankingOnline(user)};
}
function renderGlobalRanking(){
 const leaderboard=$('ranking-list'),onlineContainer=$('ranking-online-list'),podium=$('podium');
 if(!leaderboard||!podium||!onlineContainer)return;
 const players=rankingPlayers.map(rankingUserStats)
  .sort((a,b)=>b.wins-a.wins || b.points-a.points || a.losses-b.losses
   || String(a.displayName||'').localeCompare(String(b.displayName||''),'pt-BR'));
 const online=players.filter(p=>p.online)
  .sort((a,b)=>String(a.displayName||'').localeCompare(String(b.displayName||''),'pt-BR'));
 const badge=$('ranking-online-count');if(badge)badge.textContent=String(online.length);
 const checkAvatar=u=>'<span class="avatar rank-avatar">'+rankingPortrait(u)+'</span>';
 const label=p=>p.id===currentUser?.uid?' <span class="rank-you">(você)</span>':'';
 onlineContainer.innerHTML=online.length?online.map(p=>
  '<button type="button" class="ranking-live-user" data-profile-open="'+safeText(p.id)+
   '" data-profile-name="'+safeText(p.displayName||'Jogador')+'">'+
   checkAvatar(p)+'<span><b>'+safeText(p.displayName||'Jogador')+'</b>'+
   '<small>● Online · '+p.wins+' V · '+p.losses+' D · '+p.points+' pts</small></span></button>'
 ).join(''):'<p class="muted">Nenhum jogador online neste momento.</p>';
 const ranked=players.filter(p=>p.wins>0);
 podium.innerHTML=ranked.length?ranked.slice(0,3).map((p,i)=>
  '<div class="podium-place '+(i===0?'first':i===1?'second':'third')+'">'+
   checkAvatar(p)+'<b>'+safeText(p.displayName||'Jogador')+'</b>'+
   '<small>'+p.wins+' vitória'+(p.wins===1?'':'s')+' · '+p.points+' pts</small>'+
   '<div class="podium-block">'+(i+1)+'º</div></div>'
 ).join(''):'<div class="podium-empty">O pódio começa com a primeira vitória online validada.</div>';
 leaderboard.innerHTML=players.length?players.map((p,i)=>
  '<button type="button" class="ranking-row ranking-player-row '+(p.id===currentUser?.uid?'ranking-me ':'')+
   '" data-profile-open="'+safeText(p.id)+'" data-profile-name="'+safeText(p.displayName||'Jogador')+'">'+
   '<span class="rank-position">'+(i+1)+'º</span>'+
   '<span class="rank-name">'+checkAvatar(p)+'<span class="rank-player-name"><b>'+
    safeText(p.displayName||'Jogador')+'</b><small>'+(p.online?'● Online':'Offline')+label(p)+'</small></span></span>'+
   '<span class="wins">'+p.wins+'</span><span class="losses">'+p.losses+'</span>'+
   '<span class="rank-points">'+p.points+'</span></button>'
 ).join(''):'<p class="muted">Nenhum jogador cadastrado no momento.</p>';
 const period=$('ranking-period');
 if(period)period.textContent='SEMANA '+currentIsoWeekKey()+' · REINICIA TODA SEGUNDA ÀS 00:00 (BRASÍLIA)';
 const status=$('ranking-status');
 if(status)status.textContent=rankingLoaded?'Pontuação global: 100 por vitória e 10 por derrota PvP validada.':'Buscando resultados globais da semana...';
 renderLocalBattleRecord();
}
function listenRanking(){
 let weekKey='',stopWeek=null;
 stopListeners.push(onSnapshot(collection(db,'users'),snap=>{
  rankingPlayers=snap.docs.map(d=>({id:d.id,...d.data()}));renderGlobalRanking();
 },err=>{console.error('Erro no ranking de jogadores',err);toast('Não foi possível listar os jogadores.');}));
 const watchWeek=()=>{
  const current=currentIsoWeekKey();
  if(current!==weekKey){
   if(stopWeek)stopWeek();
   weekKey=current;rankingLoaded=false;rankingScores=new Map();renderGlobalRanking();
   stopWeek=onSnapshot(collection(db,'weeklyRankings',weekKey,'players'),snap=>{
    rankingScores=new Map(snap.docs.map(d=>[d.id,d.data()]));rankingLoaded=true;
    renderGlobalRanking();
   },err=>{
    rankingLoaded=false;console.error('Ranking global inacessível:',err);
    const status=$('ranking-status');
    if(status)status.textContent='Ranking global indisponível. Confira as regras publicadas no Firebase.';
   });
  }
  renderGlobalRanking();
 };
 watchWeek();
 const timer=setInterval(watchWeek,60*1000);
 const onVisible=()=>{if(!document.hidden)watchWeek();};
 document.addEventListener('visibilitychange',onVisible);
 stopListeners.push(()=>{clearInterval(timer);stopWeek?.();document.removeEventListener('visibilitychange',onVisible);});
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
  const displayName=socialDisplayName(uid,member.displayName||'Jogador');
  const isOnline = member.lastSeen?.toDate && Date.now()-member.lastSeen.toDate().getTime()<3*60*1000;
  const activity = member.activityLabel || (isOnline ? 'online' : 'offline');
  modal.innerHTML = `<div class="cropper-card member-profile-card">
    <div class="panel-head"><h3>Perfil do jogador</h3><button class="icon-btn" data-profile-close>✕</button></div>
    <div class="profile-banner-preview ${member.bannerStyle ? '' : 'no-profile-banner'}" data-style="${member.bannerStyle || 0}">${safeText(displayName)}</div>
    <div class="member-profile-identity"><div class="avatar avatar-large" ${memberPhoto(member) ? `style="background-image:url('${memberPhoto(member)}');background-size:cover;background-position:center;color:transparent"` : ''}>${memberPhoto(member) ? '' : safeText(initials(member.displayName || 'Jogador'))}</div><div><h2>${safeText(displayName)}</h2><small>${own ? 'Este é o seu perfil' : safeText(activity)}</small></div></div>
    ${!own ? `<div class="member-profile-actions"><button class="btn btn-primary" data-profile-add="${safeText(uid)}" data-profile-add-name="${safeText(member.displayName||'Jogador')}">Adicionar amizade</button><button class="btn" data-profile-message="${safeText(uid)}" data-profile-message-name="${safeText(member.displayName||'Jogador')}">Enviar mensagem</button><button class="btn" data-social-manage="${safeText(uid)}" data-social-name="${safeText(member.displayName||'Jogador')}">⚙ Gerenciar</button></div>` : ''}
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
let pokemonOnline = null;
let latestOnlinePlayers = [];

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

// PvP: crédito local único por partida concluída. O saldo atual do LinerCall
// ainda usa localStorage; para economia anti-fraude é necessário backend.
let rankBackendWarningSent=false;
async function settleOnlineRanking(matchId){
 if(!currentUser||!matchId)return;
 const token=await currentUser.getIdToken();
 try{
  const response=await fetch('/api/settlePokemonMatch',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({matchId})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   if(!rankBackendWarningSent){
    rankBackendWarningSent=true;
    toast(response.status===503?'Ranking global: falta configurar as credenciais no servidor.':'Ranking global: '+(data.error||'não foi possível registrar a partida.'));
   }
   throw new Error(data.error||'Falha ao validar resultado.');
  }
  rankBackendWarningSent=false;
  return data;
 }catch(error){
  console.warn('Registro de resultado semanal pendente:',error);
  throw error;
 }
}

function creditPokemonOnlineReward({matchId,winnerUid,hostUid,guestUid}) {
  if(!currentUser||!pokemonArena||!matchId||typeof matchId!=='string')return;
  const uid=currentUser.uid;
  if(!winnerUid||![hostUid,guestUid].includes(uid)||![hostUid,guestUid].includes(winnerUid))return;
  const claimed=pokemonArena.pvpClaims||{};
  if(Object.prototype.hasOwnProperty.call(claimed,matchId))return;
  const won=winnerUid===uid;
  const reward=won?100:10;
  pokemonArena.pvpClaims={...claimed,[matchId]:reward};
  pokemonArena.coins=(Number(pokemonArena.coins)||0)+reward;
  pokemonArena.pvpWins=(Number(pokemonArena.pvpWins)||0)+(won?1:0);
  pokemonArena.pvpLosses=(Number(pokemonArena.pvpLosses)||0)+(won?0:1);
  savePokemonArena();
  // Atualiza a carteira visível sem reiniciar os listeners da partida.
  document.querySelectorAll('.pokemon-wallet b,.shop-wallet b').forEach(el=>{
    el.textContent=el.closest('.shop-wallet')?'🪙 '+pokemonArena.coins:pokemonArena.coins;
  });
  toast(won?'🏆 Vitória online! +100 LCoins.':'🤝 Batalha concluída! +10 LCoins por participar.');
}

function pokemonById(id) {
  return POKEMON_CATALOG.find(p => p.id === id);
}

function initPokemonArena() {
  if (!currentUser) return;
  pokemonArena = loadPokemonArena();
  if (pokemonOnline) pokemonOnline.destroy();
  pokemonOnline=createPokemonOnline({db,uid:currentUser.uid,displayName:profile?.displayName||'Jogador',getTeam:()=>pokemonArena?.team||[],catalogue:POKEMON_CATALOG,getArt:pokemonArt,notify:toast,onReward:creditPokemonOnlineReward,onMatchSettled:settleOnlineRanking});
  pokemonOnline.start();
  pokemonOnline.setPlayers(latestOnlinePlayers);
  if (String(profile?.displayName||'').trim().toLocaleLowerCase('pt-BR') === 'tom' && !localStorage.getItem('linercall-tom-coins-reset-v1')) { pokemonArena.coins=0; localStorage.setItem('linercall-tom-coins-reset-v1','1'); savePokemonArena(); }
  renderPokemonArena();
}

function pokemonArt(p) {
  const ids = { pikachu:25, charizard:6, blastoise:9, venusaur:3, gengar:94, lucario:448, eevee:133, snorlax:143 };
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + ids[p.id] + '.png';
}
let miniGamePage = 'home';
function showMiniGamePage(page) {
  if(page==='pokemon') notificationCenter?.markCategory('battle');
  miniGamePage = page;
  const root = $('minigame-stage');
  const tabs = $('minigame-tabs');
  if (tabs) tabs.classList.toggle('hidden', page !== 'home');
  if (root) root.classList.toggle('hidden', page === 'home');
  const pokemonContent = $('pokemon-arena-content');
  const gameStage = $('game-stage');
  if (pokemonContent) pokemonContent.classList.toggle('hidden', page !== 'pokemon');
  if (gameStage) { if (gameStage.parentElement !== root) root?.appendChild(gameStage); gameStage.classList.toggle('hidden', page === 'home' || page === 'pokemon' || page === 'story'); }
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
    <div id="pokemon-online-panel" class="pokemon-online-panel panel"></div>
    <div id="pokemon-battle-stage" class="pokemon-battle-stage ${pokemonArena.battle?'':'hidden'}"></div>`;
  pokemonOnline?.render();
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
  const isEnemy = arguments[1] === true;
  const hp = isEnemy ? Math.round(base.hp * 1.5) : base.hp;
  return { ...base, hp, atk: isEnemy ? Math.round(base.atk * 1.35) : base.atk, def: isEnemy ? Math.round(base.def * 1.2) : base.def, hpNow: hp, pe: 70, maxPE: 100 };
}

function startPokemonBattle() {
  if (!pokemonArena || pokemonArena.team.length !== 3 || pokemonArena.battle) return;
  const opponents = ['gengar', 'venusaur', 'lucario', 'snorlax', 'charizard', 'blastoise'];
  const shuffled = [...opponents].sort(() => Math.random() - 0.5);
  const enemyIds = shuffled.slice(0, 3);
  pokemonArena.battle = {
    player: pokemonArena.team.map(createBattlePokemon),
    enemy: enemyIds.map(id => createBattlePokemon(id, true)),
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

function pokemonMoveCost(move) { return Number(move?.power) >= 22 ? 48 : 20; }
function restPokemonInBattle() {
  const b=pokemonArena?.battle;
  if(!b||b.finished||b.turn!=='player')return;
  const p=currentBattlePokemon('player');
  p.pe=Math.min(p.maxPE||100,(p.pe||0)+45);
  b.log.unshift(`${p.name} descansou e recuperou 45 PE. O turno passou ao rival.`);
  b.turn='enemy';renderPokemonBattle();
  setTimeout(pokemonEnemyTurn,650);
}
function performPokemonMove(moveIndex) {
  const b = pokemonArena?.battle;
  if (!b || b.finished || b.turn !== 'player') return;
  const attacker = currentBattlePokemon('player');
  const defender = currentBattlePokemon('enemy');
  const move = attacker.moves[moveIndex];
  if (!attacker || !defender || !move || attacker.hpNow <= 0) return;

  const cost = pokemonMoveCost(move);
  if (attacker.pe < cost) { toast('PE insuficiente! Use Descansar ou escolha outro golpe.'); return; }
  attacker.pe -= cost;
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
  const livingMoves = attacker.moves.filter(m => pokemonMoveCost(m) <= attacker.pe);
  if (!livingMoves.length) {
    attacker.pe = Math.min(attacker.maxPE, attacker.pe + 45);
    b.log.unshift(`${attacker.name} descansou e recuperou 45 PE!`);
    b.turn = 'player';
    renderPokemonBattle();
    return;
  }
  const move = [...livingMoves].sort((x,y)=>pokemonTypeMultiplier(y.type,defender.type)-pokemonTypeMultiplier(x.type,defender.type) || y.power-x.power)[0];
  attacker.pe -= pokemonMoveCost(move);
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
    pokemonArena.losses = (Number(pokemonArena.losses) || 0) + 1;
  }
  b.result = won ? 'win' : 'loss';
  pokemonArena.history.unshift({ win: won, opponent, date: Date.now() });
  pokemonArena.history = pokemonArena.history.slice(0, 20);
  savePokemonArena();
  renderPokemonBattle();

  // O resultado é salvo uma única vez no histórico local. Não alteramos ranking
  // público pelo navegador: isso permitiria falsificar vitórias e moedas.
  renderLocalBattleRecord();
  toast(won ? 'Vitória! +21 LCoins. Resultado salvo neste navegador.' : 'Derrota registrada no histórico. +0 LCoins.');

}

function renderPokemonBattle() {
  const root = $('pokemon-battle-stage'), b = pokemonArena?.battle;
  if (!root || !b) return;
  const player = currentBattlePokemon('player'), enemy = currentBattlePokemon('enemy');
  const bar = p => Math.max(0,Math.round(p.hpNow/p.hp*100));
  const pe = p => Math.max(0,Math.round((p.pe||0)/(p.maxPE||100)*100));
  root.innerHTML = `
    <div class="pokemon-battle-heading"><div><span class="eyebrow">ARENA · BATALHA POR TURNOS</span><h2>${b.finished ? (b.result === 'win' ? 'VITÓRIA!' : 'DERROTA') : 'A BATALHA COMEÇOU!'}</h2><p class="battle-turn-label">${b.finished ? 'Resultado final' : (b.turn === 'player' ? 'Sua vez: escolha um ataque.' : 'Turno do adversário…')}</p></div><span class="pixel-badge">PVE</span></div>
    <div class="pokemon-arena-scene ${b.finished ? (b.result === 'win' ? 'arena-victory' : 'arena-defeat') : ''}">
      <div class="arena-fighter arena-enemy ${enemy.hpNow <= 0 ? 'pokemon-fainted' : ''}"><div class="arena-fighter-meta"><b>${enemy.name}</b><small>${enemy.type}</small><div class="pokemon-hp" role="progressbar" aria-valuenow="${enemy.hpNow}" aria-valuemax="${enemy.hp}"><i style="width:${bar(enemy)}%"></i></div><small>HP ${enemy.hpNow}/${enemy.hp}</small><div class="pokemon-pe"><i style="width:${pe(enemy)}%"></i></div><small>PE ${enemy.pe||0}/${enemy.maxPE||100}</small></div><img src="${pokemonArt(enemy)}" alt="${enemy.name}"></div>
      <div class="arena-spike-band"><span>VS</span></div>
      <div class="arena-fighter arena-player ${player.hpNow <= 0 ? 'pokemon-fainted' : ''}"><img src="${pokemonArt(player)}" alt="${player.name}"><div class="arena-fighter-meta"><b>${player.name}</b><small>${player.type}</small><div class="pokemon-hp" role="progressbar" aria-valuenow="${player.hpNow}" aria-valuemax="${player.hp}"><i style="width:${bar(player)}%"></i></div><small>HP ${player.hpNow}/${player.hp}</small><div class="pokemon-pe"><i style="width:${pe(player)}%"></i></div><small>PE ${player.pe||0}/${player.maxPE||100}</small></div></div>
      ${b.finished ? `<div class="arena-result-stamp ${b.result}">${b.result === 'win' ? 'VITÓRIA!' : 'DERROTA'}</div>` : ''}
    </div>
    ${b.faintNotice && !b.finished ? `<div class="pokemon-faint-notice">${safeText(b.faintNotice)}</div>` : ''}
    ${b.finished ? `<div class="pokemon-result ${b.result}">${b.enemy.every(p=>p.hpNow<=0)?'🏆 Você venceu! +21 moedas.':'💤 Seus Pokémon foram derrotados. Nenhuma moeda nesta batalha.'}</div><button class="btn btn-primary" data-pokemon-close-battle>Voltar à equipe</button>` : `
      <div class="pokemon-controls"><div><b>ATAQUES</b><div class="pokemon-moves">${player.moves.map((m,i)=>`<button class="pokemon-move-btn" data-pokemon-move="${i}" ${b.turn !== 'player' || (player.pe||0)<pokemonMoveCost(m) ? 'disabled' : ''}><b>${m.name}</b><small>${m.type} · força ${m.power} · ${pokemonMoveCost(m)} PE</small></button>`).join('')}</div><button class="pokemon-rest-btn" data-pokemon-rest ${b.turn!=='player'?'disabled':''}>🌿 Descansar — recuperar 45 PE (gasta 1 turno)</button></div>
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
 if(cinemaItems.length){const lighty=cinemaItems.map(item=>item.type==='movie'?`<article class="shop-item panel"><div class="shop-item-art"><img src="${safeText(item.poster||'')}" alt="" loading="lazy"></div><div class="shop-item-info"><span class="eyebrow">LIGHTYFLIX · FILME</span><h3>${safeText(item.title)}</h3><b class="shop-price">${item.catalogOnly?'🔒 Ainda indisponível':'🪙 2.000 moedas'}</b><button class="btn btn-primary" data-shop-movie="${safeText(item.id)}" ${item.catalogOnly||hasLightyPurchase('movie:'+item.id)?'disabled':''}>${item.catalogOnly?'Em breve':hasLightyPurchase('movie:'+item.id)?'Comprado':'Comprar filme'}</button></div></article>`:`<article class="shop-item panel"><div class="shop-item-art"><img src="${safeText(item.poster||'')}" alt="" loading="lazy"></div><div class="shop-item-info"><span class="eyebrow">LIGHTYFLIX · SÉRIE</span><h3>${safeText(item.title)}</h3><b class="shop-price">🪙 ${formatLightyCoins(episodePrice(item.duration))} por episódio</b><p>Pacote da 1ª temporada: ${formatLightyCoins(quoteSeason({showId:item.id,season:0,episodeCount:SERIES_EPISODE_DATA[item.id]?.[0]?.count||0,duration:item.duration,purchases:getLightyPurchases()}).bundleTotal)}. O preço para completar diminui conforme os episódios já comprados.</p><button class="btn" data-shop-open-cinema="${safeText(item.id)}">Ver temporadas</button></div></article>`).join('');root.insertAdjacentHTML('beforeend','<h3 class="shop-section-title">LightyFlix</h3><div class="shop-grid">'+lighty+'</div>');}
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


let tetrisTimer=null,tetrisBoard=[],tetrisPiece=null,tetrisScore=0,tetrisOver=false,tetrisEarned=0;
const TETRIS_SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
function stopTetris(){if(tetrisTimer)clearInterval(tetrisTimer);tetrisTimer=null;document.removeEventListener('keydown',tetrisKeyHandler);}
function newTetrisPiece(){const shape=TETRIS_SHAPES[Math.floor(Math.random()*TETRIS_SHAPES.length)].map(row=>row.slice());return {shape,x:Math.floor((10-shape[0].length)/2),y:0};}
function tetrisCollides(piece,x=piece.x,y=piece.y,shape=piece.shape){return shape.some((row,dy)=>row.some((v,dx)=>v&&(x+dx<0||x+dx>=10||y+dy>=20||(y+dy>=0&&tetrisBoard[y+dy][x+dx]))));}
function drawTetris(){const root=$('game-content');if(!root)return;const cells=tetrisBoard.map(row=>row.slice());if(tetrisPiece) tetrisPiece.shape.forEach((row,dy)=>row.forEach((v,dx)=>{if(v&&tetrisPiece.y+dy>=0&&tetrisPiece.y+dy<20)cells[tetrisPiece.y+dy][tetrisPiece.x+dx]=2;}));root.querySelector('#tetris-grid').innerHTML=cells.flat().map(v=>'<i class="tetris-cell '+(v===2?'falling':v===1?'filled':'')+'"></i>').join('');root.querySelector('#tetris-score').textContent=tetrisScore;}
function lockTetris(){tetrisPiece.shape.forEach((row,dy)=>row.forEach((v,dx)=>{if(v&&tetrisPiece.y+dy>=0)tetrisBoard[tetrisPiece.y+dy][tetrisPiece.x+dx]=1;}));let cleared=0;tetrisBoard=tetrisBoard.filter(row=>{if(row.every(Boolean)){cleared++;return false;}return true;});while(tetrisBoard.length<20)tetrisBoard.unshift(Array(10).fill(0));tetrisScore+=cleared*[0,100,300,500,800][cleared];if(cleared&&pokemonArena){const reward=cleared*23;pokemonArena.coins=(Number(pokemonArena.coins)||0)+reward;tetrisEarned+=reward;savePokemonArena();toast('+'+reward+' LCoins por '+cleared+' linha'+(cleared>1?'s':'')+'!');}tetrisPiece=newTetrisPiece();if(tetrisCollides(tetrisPiece)){tetrisOver=true;stopTetris();$('game-content').insertAdjacentHTML('beforeend','<p class="tetris-over">Fim de jogo · Pontuação: '+tetrisScore+'</p><button class="btn btn-primary" id="tetris-restart">Jogar novamente</button>');}}
function moveTetris(dx,dy){if(!tetrisPiece||tetrisOver)return;if(!tetrisCollides(tetrisPiece,tetrisPiece.x+dx,tetrisPiece.y+dy)){tetrisPiece.x+=dx;tetrisPiece.y+=dy;}else if(dy>0)lockTetris();drawTetris();}
function rotateTetris(){if(!tetrisPiece||tetrisOver)return;const shape=tetrisPiece.shape[0].map((_,i)=>tetrisPiece.shape.map(row=>row[i]).reverse());if(!tetrisCollides(tetrisPiece,tetrisPiece.x,tetrisPiece.y,shape))tetrisPiece.shape=shape;drawTetris();}
function tetrisKeyHandler(e){if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')moveTetris(-1,0);else if(e.key==='ArrowRight')moveTetris(1,0);else if(e.key==='ArrowDown')moveTetris(0,1);else if(e.key==='ArrowUp')rotateTetris();else if(e.key===' ')while(!tetrisCollides(tetrisPiece,tetrisPiece.x,tetrisPiece.y+1))tetrisPiece.y++;if(e.key===' ')lockTetris();drawTetris();}
let tetrisHandlersBound=false;
function showTetris(){stopTetris();tetrisBoard=Array.from({length:20},()=>Array(10).fill(0));tetrisPiece=newTetrisPiece();tetrisScore=0;tetrisEarned=0;tetrisOver=false;$('game-stage').classList.remove('hidden');$('game-title').textContent='Tetris';$('game-content').innerHTML='<div class="tetris-wrap"><div class="tetris-info">Pontos: <b id="tetris-score">0</b><p>23 LCoins por linha completa · as moedas são salvas na carteira.</p><p>← → mover · ↑ girar · ↓ descer · Espaço: queda</p></div><div id="tetris-grid" class="tetris-grid" role="grid"></div><div class="tetris-mobile"><button data-tetris="left">←</button><button data-tetris="rotate">↻</button><button data-tetris="right">→</button><button data-tetris="down">↓</button></div><button class="btn" data-minigame-back>Voltar aos minigames</button></div>';document.addEventListener('keydown',tetrisKeyHandler);if(!tetrisHandlersBound){tetrisHandlersBound=true;$('game-content').addEventListener('click',e=>{const b=e.target.closest('[data-tetris]');if(!b)return;({left:()=>moveTetris(-1,0),right:()=>moveTetris(1,0),down:()=>moveTetris(0,1),rotate:rotateTetris})[b.dataset.tetris]?.();});$('game-content').addEventListener('click',e=>{if(e.target.id==='tetris-restart')showTetris();});}drawTetris();tetrisTimer=setInterval(()=>moveTetris(0,1),650);}

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


// Temporadas conhecidas, incluindo Steven Universo Futuro (S6) e JoJo/Gumball/Titãs.
const SERIES_EPISODE_DATA = Object.fromEntries(
 Object.entries(LIGHTY_SERIES).map(([id,config])=>[
   id,config.counts.map((count,index)=>({
     name:id==='lighty-steven-universe'&&index===5?'Steven Universo Futuro':'Temporada '+(index+1),
     count
   }))
 ])
);
// Desbloqueios no protótipo: associados ao UID neste navegador.
function lightyPurchasesKey(){return 'linercall-lighty-purchases-'+(currentUser?.uid||'guest');}
function getLightyPurchases(){
  try{
    const saved=JSON.parse(localStorage.getItem(lightyPurchasesKey())||'{}');
    return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
  }catch{return {};}
}
function hasLightyPurchase(key){return !!getLightyPurchases()[key];}
function formatLightyCoins(n){return Math.max(0,Number(n)||0).toLocaleString('pt-BR')+' LCoins';}
function commitLightyPurchase(key,cost,label,warning){
 if(!pokemonArena||!currentUser)return toast('Entre na sua conta para comprar.');
 const purchases=getLightyPurchases();
 if(purchases[key])return toast('Este conteúdo já está desbloqueado.');
 if(!Number.isSafeInteger(cost)||cost<0)return toast('Preço de compra inválido.');
 if((Number(pokemonArena.coins)||0)<cost)return toast('Saldo insuficiente: você precisa de '+formatLightyCoins(cost)+'.');
 const message='Confirmar '+label+' por '+formatLightyCoins(cost)+'?'
   +'\nSaldo atual: '+formatLightyCoins(pokemonArena.coins)
   +'\nSaldo depois: '+formatLightyCoins(pokemonArena.coins-cost)
   +(warning?'\n\n'+warning:'');
 if(!window.confirm(message))return false;
 purchases[key]={cost,boughtAt:Date.now()};
 try{localStorage.setItem(lightyPurchasesKey(),JSON.stringify(purchases));}
 catch(error){console.error('Não foi possível salvar a compra LightyFlix',error);toast('Falha ao salvar o desbloqueio. Nenhuma moeda foi descontada.');return false;}
 pokemonArena.coins=Number(pokemonArena.coins)-cost;
 savePokemonArena();
 document.querySelectorAll('.pokemon-wallet b').forEach(el=>{el.textContent=pokemonArena.coins;});
 renderShop();
 toast(label+' desbloqueado! Saldo: '+formatLightyCoins(pokemonArena.coins)+'.');
 return true;
}
function buyLightyContent(key,cost,label){
 if(!pokemonArena)return;
 const purchases=getLightyPurchases();
 if(purchases[key])return toast('Você já comprou este conteúdo.');
 if((Number(pokemonArena.coins)||0)<cost)return toast('Moedas insuficientes.');
 pokemonArena.coins-=cost;
 purchases[key]={cost,boughtAt:Date.now()};
 try{localStorage.setItem(lightyPurchasesKey(),JSON.stringify(purchases));}
 catch(error){pokemonArena.coins+=cost;console.error(error);return toast('Erro ao salvar a compra. Moedas preservadas.');}
 savePokemonArena();renderShop();toast(label+' comprado!');
}
const lightyNoVideoWarning='A reprodução deste episódio ainda não está disponível no LightyFlix. Este pagamento usa moedas virtuais e desbloqueia somente o registro no catálogo por enquanto.';
function buyLightyEpisode(showId,seasonIndex,number){
 const item=cinemaItems.find(x=>x.id===showId&&x.type==='series');
 const season=Number(seasonIndex),episode=Number(number);
 const entry=SERIES_EPISODE_DATA[item?.id]?.[season];
 if(!entry||!Number.isInteger(episode)||episode<1||episode>entry.count)return toast('Episódio inválido.');
 const purchases=getLightyPurchases();
 if(ownsEpisode(purchases,showId,season,episode))return toast('Este episódio já está desbloqueado.');
 const price=episodePrice(item.duration);
 if(commitLightyPurchase(lightyEpisodeKey(showId,season,episode),price,'Episódio '+episode,lightyNoVideoWarning))
   renderSeriesDetails(item,season);
}
function buyLightySeason(showId,seasonIndex){
 const item=cinemaItems.find(x=>x.id===showId&&x.type==='series');
 const season=Number(seasonIndex),entry=SERIES_EPISODE_DATA[item?.id]?.[season];
 if(!entry)return toast('Temporada inválida.');
 const quote=quoteSeason({showId,season,episodeCount:entry.count,duration:item.duration,purchases:getLightyPurchases()});
 if(quote.completed)return toast('Você já tem todos os episódios desta temporada.');
 const creditText=quote.paid>0?'\nAbatimento dos episódios já comprados: '+formatLightyCoins(quote.paid)+'.':'';
 const warning='Pacote inteiro: '+formatLightyCoins(quote.bundleTotal)
  +' (desconto de '+formatLightyCoins(quote.discount)+' sobre '+formatLightyCoins(quote.normalTotal)+').'
  +creditText+'\n'+lightyNoVideoWarning;
 if(commitLightyPurchase(lightySeasonKey(showId,season),quote.remaining,'Temporada '+(season+1),warning))
   renderSeriesDetails(item,season);
}
let lightyEpisodeRenderToken=0;
function renderSeriesDetails(item,selectedSeason=0){
 const root=$('cinema-episodes'),related=$('cinema-related');
 if(!root||!related)return;
 const seasons=SERIES_EPISODE_DATA[item.id];
 const token=++lightyEpisodeRenderToken;
 if(item.type!=='series'||!seasons){root.innerHTML='';related.innerHTML='';return;}
 const active=Math.max(0,Math.min(selectedSeason,seasons.length-1));
 const season=seasons[active],purchases=getLightyPurchases();
 const epCost=episodePrice(item.duration);
 const quote=quoteSeason({showId:item.id,season:active,episodeCount:season.count,duration:item.duration,purchases});
 const safePoster=validWebUrl(item.backdrop||item.poster||'')||
   'https://placehold.co/480x270/17152b/e7d8ff?text=LIGHTYFLIX';
 const seasonCards=seasons.map((entry,index)=>{
   const price=quoteSeason({showId:item.id,season:index,episodeCount:entry.count,duration:item.duration,purchases});
   const savings=price.discount?' · economia '+formatLightyCoins(price.discount):'';
   const already=price.paid?'<small>Abatimento do que você já comprou: '+formatLightyCoins(price.paid)+'</small>':'';
   return '<article class="lighty-season-card '+(index===active?'active':'')+'">'+
    '<button class="lighty-season-select" type="button" data-select-season="'+index+
    '" data-season-show="'+safeText(item.id)+'"><b>'+safeText(entry.name)+
    '</b><small>'+entry.count+' episódio'+(entry.count===1?'':'s')+'</small></button>'+
    '<div class="lighty-season-pricing"><small>Total avulso: '+formatLightyCoins(price.normalTotal)+'</small>'+
    '<b>Pacote: '+formatLightyCoins(price.bundleTotal)+'</b><small>'+savings.replace(/^ · /,'')+'</small>'+already+'</div>'+
    '<button class="btn btn-primary lighty-season-buy" type="button" data-buy-season="'+safeText(item.id)+
    '" data-season-index="'+index+'" '+(price.completed?'disabled':'')+'>'+
    (price.completed?'✓ Temporada desbloqueada':'🪙 Completar por '+formatLightyCoins(price.remaining))+
    '</button></article>';
 }).join('');
 root.innerHTML='<section class="lighty-season-picker">'+
  '<div class="lighty-section-heading"><h3>Escolha uma temporada</h3><span>Temporadas em catálogo</span></div>'+
  '<div class="lighty-balance"><span>🪙 Seu saldo: <b>'+formatLightyCoins(pokemonArena?.coins||0)+'</b></span><small>10 min: '+formatLightyCoins(LIGHTY_PRICES.shortEpisode)+' · 20 min: '+formatLightyCoins(LIGHTY_PRICES.longEpisode)+' · 20% de desconto no pacote (2+ episódios)</small></div>'+
  '<div class="lighty-carousel-wrap"><button class="lighty-carousel-arrow" type="button" data-lighty-scroll="seasons" data-direction="prev" aria-label="Temporadas anteriores">‹</button>'+
  '<div class="lighty-season-row">'+seasonCards+'</div>'+
  '<button class="lighty-carousel-arrow" type="button" data-lighty-scroll="seasons" data-direction="next" aria-label="Próximas temporadas">›</button></div></section>'+
  '<section class="lighty-episode-picker"><div class="lighty-section-heading"><h3>'+
  safeText(item.title)+' · '+safeText(season.name)+'</h3><span>'+season.count+
  ' episódio'+(season.count===1?'':'s')+'</span></div>'+
  '<p class="lighty-unreleased-label">Vídeos ainda não disponíveis para assistir. As compras são desbloqueios antecipados no catálogo, sem reprodução até que haja conteúdo autorizado.</p>'+
  '<div class="lighty-season-summary"><span>Avulsos: <b>'+formatLightyCoins(quote.normalTotal)+'</b></span>'+
  '<span>Desconto do pacote: <b>'+formatLightyCoins(quote.discount)+'</b></span>'+
  '<span>Pacote inteiro: <b>'+formatLightyCoins(quote.bundleTotal)+'</b></span>'+
  '<span>Já pago: <b>'+formatLightyCoins(quote.paid)+'</b></span>'+
  '<strong>Para completar: '+formatLightyCoins(quote.remaining)+'</strong></div>'+
  '<div class="lighty-carousel-wrap"><button class="lighty-carousel-arrow" type="button" data-lighty-scroll="episodes" data-direction="prev" aria-label="Episódios anteriores">‹</button>'+
  '<div class="lighty-episode-row" aria-live="polite"></div>'+
  '<button class="lighty-carousel-arrow" type="button" data-lighty-scroll="episodes" data-direction="next" aria-label="Próximos episódios">›</button></div>'+
  '<small class="lighty-episode-credit">Imagens e informações: <a href="https://www.tvmaze.com" target="_blank" rel="noopener noreferrer">TVmaze</a> (CC BY-SA). Títulos em português revisados quando disponíveis; traduções automáticas podem variar. Algumas imagens são capas da série quando não há imagem individual.</small>'+
  '</section>';
 const recommendations=item.id==='lighty-steven-universe'
  ?['Hora de Aventura','Gravity Falls','A Casa Coruja','Amphibia']
  :item.id==='lighty-naruto'?['Boruto','Dragon Ball','One Piece']
  :item.id==='lighty-demon-slayer'?['Jujutsu Kaisen','Naruto','JoJo']
  :['Naruto','One Piece','Yu-Gi-Oh!'];
 related.innerHTML='<h3>Títulos semelhantes</h3><div class="related-title-list">'+
  recommendations.map(title=>'<span>'+safeText(title)+'</span>').join('')+'</div>';
 const episodesRoot=root.querySelector('.lighty-episode-row');
 function paintEpisodes(episodes) {
  if(token!==lightyEpisodeRenderToken||!episodesRoot)return;
  const previousScroll=episodesRoot.scrollLeft;
  episodesRoot.innerHTML=episodes.map((entry,i)=>{
    const title=entry.title||('Episódio '+(i+1));
    const url=validWebUrl(entry.image||'')||safePoster;
    const imageLabel=entry.isStill?'Cena do episódio':'Imagem ilustrativa da série';
    const number=i+1,owned=ownsEpisode(getLightyPurchases(),item.id,active,number);
    return '<article class="lighty-episode-unit">'+
      '<button class="lighty-episode-card '+(owned?'is-owned':'is-locked')+'" type="button" data-episode-open="'+
      safeText(item.id)+'" data-episode-season="'+active+'" data-episode-number="'+number+
      '" title="'+safeText(title)+'">'+
      '<span class="lighty-episode-thumb"><span class="lighty-episode-lock">'+
      (owned?'✓ DESBLOQUEADO':'🔒 EM BREVE')+'</span><img src="'+safeText(url)+
      '" alt="'+safeText(imageLabel+': '+title)+'" loading="lazy" onerror="this.onerror=null;this.src=\''+
      safeText(safePoster)+'\'"><i>▶</i></span>'+
      '<b>'+safeText(title)+'</b><small>Episódio '+number+' · '+formatLightyCoins(epCost)+'</small></button>'+
      '<button type="button" class="btn lighty-episode-buy" data-buy-episode="'+safeText(item.id)+
      '" data-episode-season="'+active+'" data-episode-number="'+number+'" '+(owned?'disabled':'')+'>'+
      (owned?'✓ Comprado':'🪙 Comprar por '+formatLightyCoins(epCost))+'</button></article>';
  }).join('');
  episodesRoot.scrollLeft=previousScroll;
 }
 paintEpisodes(Array.from({length:season.count},(_,i)=>({
  title:'Episódio '+(i+1),image:'',isStill:false
 })));
 getLightyEpisodes(item.id,active).then(episodes=>{
  if(token!==lightyEpisodeRenderToken)return;
  paintEpisodes(episodes);
  return localizeLightyEpisodes(item.id,active,episodes,()=>paintEpisodes(episodes));
 }).catch(error=>console.warn('LightyFlix: guia de episódios indisponível',error));
 applyLanguage();
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
 const purchaseButton=$('cinema-detail-buy');if(purchaseButton){
  const key='movie:'+id,owned=hasLightyPurchase(key),catalogOnly=item.catalogOnly===true;
  purchaseButton.textContent=catalogOnly?'🔒 Ainda não disponível no LightyFlix':owned?'✓ Filme comprado':'Comprar filme · 2.000 moedas';
  purchaseButton.disabled=catalogOnly||item.type!=='movie'||owned;
  purchaseButton.classList.toggle('hidden',item.type!=='movie');
  purchaseButton.onclick=()=>{if(!catalogOnly)buyLightyContent(key,2000,'Filme');};
 }
 const detailActions=$('cinema-detail-buy')?.parentElement;
 if(detailActions){
  detailActions.querySelector('#cinema-official-link')?.remove();
  if(item.catalogOnly===true&&validWebUrl(item.officialUrl||'')){
   const official=document.createElement('a');official.id='cinema-official-link';
   official.className='btn cinema-official-link';official.href=item.officialUrl;official.target='_blank';official.rel='noopener noreferrer';
   official.textContent='Ver na Netflix ↗';detailActions.appendChild(official);
  }
 }
 const listButton=$('cinema-detail-list');listButton.dataset.itemId=id;const refresh=()=>{listButton.textContent=getMyList().includes(id)?'✓ Remover da lista':'+ Minha lista';};listButton.onclick=()=>{toggleMyList(id);refresh();};refresh();
 $('cinema-details').classList.remove('hidden');document.body.classList.add('cinema-modal-open');applyLanguage();
}
function closeCinemaDetails(){$('cinema-details')?.classList.add('hidden');document.body.classList.remove('cinema-modal-open');}
async function loadCinema() {
  createCinemaPage();

  $('cinema-featured').innerHTML =
    '<div class="empty-state">Carregando catálogo...</div>';

    const builtInCatalog = [
    {id:'lighty-steven-universe',title:'Steven Universo',type:'series',year:2013,releaseDate:'4 de novembro de 2013',duration:'~11 min por episódio',description:'Steven vive em Beach City ao lado das Crystal Gems, descobrindo seus poderes, sua família e o universo das Gems. A sexta temporada reúne a continuação conhecida como Steven Universo Futuro.',featured:true,poster:'https://assets.qz.com/media/a30cb33e8ca08c00ea178c350bbfac6e.jpg'},
    {id:'lighty-naruto',title:'Naruto',type:'series',year:2002,releaseDate:'3 de outubro de 2002',duration:'~23 min por episódio',description:'Naruto Uzumaki é um jovem ninja que sonha em se tornar Hokage. Enfrentando desafios, rivais e missões perigosas, ele busca reconhecimento e cria laços que mudarão seu caminho.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BZmQ5NGFiNWEtMmMyMC00MDdiLTg4YjktOGY5Yzc2MDUxMTE1XkEyXkFqcGdeQXVyNTA4NzY1MzY%40._V1_FMjpg_UX1000_.jpg'},
    {id:'lighty-dragon-ball',title:'Dragon Ball',type:'series',year:1986,releaseDate:'26 de fevereiro de 1986',duration:'~24 min por episódio',description:'Acompanhe Goku desde a infância em uma jornada cheia de artes marciais, amizades e aventuras em busca das lendárias Esferas do Dragão.',featured:true,poster:'https://image.tmdb.org/t/p/w780/1YIJYarVZKH3nq89n1lVAxeVktg.jpg'},
    {id:'lighty-jojo-bizarre-adventure',title:"JoJo's Bizarre Adventure",type:'series',year:2012,releaseDate:'6 de outubro de 2012',duration:'~24 min por episódio',description:'Acompanhe as diferentes gerações da família Joestar em aventuras sobrenaturais, batalhas estratégicas e confrontos cheios de personalidade.',featured:true,poster:'https://miro.medium.com/v2/resize%3Afit%3A1400/1%2AlkzQ84Lq2LaHazcKYY4fYA.jpeg'},
    {id:'lighty-demon-slayer',title:'Demon Slayer: Kimetsu no Yaiba',type:'series',year:2019,releaseDate:'6 de abril de 2019',duration:'~24 min por episódio',description:'Tanjiro Kamado começa sua jornada depois que sua família é atacada por demônios. No LightyFlix, apenas o episódio 1 da primeira temporada está listado.',featured:true,poster:'https://image.tmdb.org/t/p/w780/4oy1X4QDgwxmUycIxU7T2VrQkIr.jpg'},
    {id:'lighty-gumball',title:'O Incrível Mundo de Gumball',type:'series',year:2011,releaseDate:'3 de maio de 2011',duration:'~11 min por episódio',description:'Gumball, Darwin e a família Watterson vivem confusões absurdas na cidade de Elmore, onde qualquer coisa pode acontecer.',featured:true,poster:'https://image.tmdb.org/t/p/original/VYnnyA2hyxi3VUPgCA71mMtt69.jpg'},
    {id:'lighty-teen-titans',title:'Jovens Titãs',type:'series',year:2003,releaseDate:'19 de julho de 2003',duration:'~22 min por episódio',description:'Robin, Estelar, Ravena, Mutano e Ciborgue protegem Jump City enquanto enfrentam vilões e tentam conviver como equipe.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BOTg3NzY2MDQtMjUxNS00N2Q3LTkxODktMmU1NzdjZTNkMzQ0XkEyXkFqcGc%40._V1_.jpg'},
    {id:'lighty-peabody-sherman',title:'As Aventuras de Peabody e Sherman',type:'movie',year:2014,releaseDate:'28 de fevereiro de 2014 (Brasil)',duration:'92 min',description:'Sr. Peabody, um cão inventor e genial, e seu filho adotivo Sherman viajam pela história usando a máquina do tempo WABAC. Quando uma aventura sai do controle, os dois precisam consertar o passado para proteger o futuro.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BYTBjMDAzYTEtYTI2ZS00MWJkLWJiM2MtOGEwN2NhZGQ1MmNlXkEyXkFqcGc%40._V1_FMjpg_UX1000_.jpg'},
    {id:'lighty-steven-universe-movie',title:'Steven Universo: O Filme',type:'movie',year:2019,releaseDate:'7 de outubro de 2019 (Brasil)',duration:'82 min',description:'Depois de um longo período de paz, Steven acredita que finalmente poderá descansar. Mas uma nova ameaça chega à Terra, obrigando-o e às Crystal Gems a proteger tudo o que construíram.',featured:true,poster:'https://www.syfy.com/sites/syfy/files/2019/07/stevenuniverse.png'},
    {id:'lighty-pokemon-mewtwo-evolution',title:'Pokémon: Mewtwo Contra-ataca — Evolução',type:'movie',year:2019,releaseDate:'27 de fevereiro de 2020 (Netflix Brasil)',duration:'~96 min',description:'Uma aventura 3D que recria o primeiro filme Pokémon. Ash, Misty e Brock recebem um convite misterioso para uma ilha onde conhecem Mewtwo, um Pokémon criado artificialmente. Uma batalha de Pokémon originais e clones coloca todos à prova.',featured:true,catalogOnly:true,officialUrl:'https://www.netflix.com/br/title/81223075',poster:'https://image.tmdb.org/t/p/w780/xlO50h3EX1w99KGztTzsjQBwPfs.jpg'}
  ];

  try {
    const snapshot = await getDocs(
      query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(100))
    );

    const communityItems = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    const knownIds = new Set(communityItems.map(item=>item.id));
    cinemaItems = [...builtInCatalog.filter(item=>!knownIds.has(item.id)), ...communityItems];

    renderCinema();
    renderShop();
    applyLanguage();

  } catch (error) {
    console.warn('Catálogo indisponível:', error);

    // Preserve o catálogo interno quando a consulta à coleção 'videos' falhar.
    cinemaItems = builtInCatalog;
    renderCinema();
    renderShop();
    applyLanguage();
  }
}

function playCinemaItem(id) {
  const item = cinemaItems.find(entry => entry.id === id);

  if (!item) {
    toast('Conteúdo não encontrado.');
    return;
  }

  if(item.catalogOnly)return toast('Este filme ainda não pode ser reproduzido no LightyFlix.');
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


/* Modo história: engine 2D separada, com controles e limpeza próprios. */
let stopStorySession = null;
function startStory() {
  if (miniGamePage !== 'story') { showMiniGamePage('story'); return; }
  stopStory();
  const stage=$('minigame-stage');
  if(!stage)return;
  let root=$('story-game-content');
  if(!root){root=document.createElement('div');root.id='story-game-content';stage.appendChild(root);}
  stopStorySession=mountStory(root,backToMiniGames,currentUser?.uid||'visitante');
}
function stopStory() {
  if(stopStorySession){stopStorySession();stopStorySession=null;}
}

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
  $('dm-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}});
  $('dm-input')?.addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,150)+'px';});
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
    if(event.target.closest('[data-dm-close-focus]'))dmFocusOff();
    if(event.target.closest('[data-dm-help-done]')){$('dm-first-tip')?.classList.add('hidden');localStorage.setItem('linercall-dm-help-v2-'+currentUser?.uid,'1');}
    if(event.target.closest('[data-dm-profile]')&&activeFriendId)openMemberProfile(activeFriendId,$('dm-contact-name')?.textContent||'Amigo');
    const storyStart=event.target.closest('#play-story'); if(storyStart)showMiniGamePage('story');
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
    const seasonBuy=event.target.closest('[data-buy-season]');if(seasonBuy)buyLightySeason(seasonBuy.dataset.buySeason,Number(seasonBuy.dataset.seasonIndex));
    const seasonSelect=event.target.closest('[data-select-season]');if(seasonSelect){const item=cinemaItems.find(entry=>entry.id===seasonSelect.dataset.seasonShow);if(item)renderSeriesDetails(item,Number(seasonSelect.dataset.selectSeason));}
    const lightyMovie=event.target.closest('[data-shop-movie]');if(lightyMovie){const listing=cinemaItems.find(x=>x.id===lightyMovie.dataset.shopMovie);if(listing?.catalogOnly)toast('Este filme ainda não está disponível no LightyFlix.');else buyLightyContent('movie:'+lightyMovie.dataset.shopMovie,2000,'Filme');}
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

    if (event.target.closest('[data-pokemon-rest]')) restPokemonInBattle();
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
    const episodeBuy=event.target.closest('[data-buy-episode]');
    if(episodeBuy){
      buyLightyEpisode(episodeBuy.dataset.buyEpisode,Number(episodeBuy.dataset.episodeSeason),Number(episodeBuy.dataset.episodeNumber));
      return;
    }
    const epClicked=event.target.closest('[data-episode-open]');
    if(epClicked){
      const show=epClicked.dataset.episodeOpen,season=Number(epClicked.dataset.episodeSeason),number=Number(epClicked.dataset.episodeNumber);
      const owned=ownsEpisode(getLightyPurchases(),show,season,number);
      toast(owned?'Episódio desbloqueado! O vídeo ainda não está disponível para reprodução.':'🔒 Episódio não comprado. Confira o preço e use o botão Comprar.');
    }
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
    const manageSocial=event.target.closest('[data-social-manage]');
    if(manageSocial){
      const other=manageSocial.dataset.socialManage;
      socialControls?.show(other,manageSocial.dataset.socialName||'Jogador',latestFriendDocs.some(d=>d.data().uids.includes(other)));
      return;
    }
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
        pokemonOnline?.destroy(); pokemonOnline=null;latestOnlinePlayers=[];
        dmFocusOff();notificationCenter?.destroy();notificationCenter=null;socialControls?.destroy();socialControls=null;latestFriendDocs=[];latestFriendRequests=[];
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

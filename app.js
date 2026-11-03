
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

  listenChat();
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
      <div id="cinema-details" class="cinema-modal hidden" role="dialog" aria-modal="true" aria-label="Detalhes do conteúdo"><div class="cinema-modal-backdrop" data-cinema-close></div><article class="cinema-detail-card"><button class="cinema-detail-close" data-cinema-close aria-label="Fechar">×</button><div class="cinema-detail-backdrop" id="cinema-detail-backdrop"></div><div class="cinema-detail-content"><img id="cinema-detail-poster" class="cinema-detail-poster" alt=""><div class="cinema-detail-info"><span class="eyebrow" id="cinema-detail-type">FILME</span><h2 id="cinema-detail-title"></h2><div class="cinema-detail-meta" id="cinema-detail-meta"></div><p id="cinema-detail-description"></p><div class="cinema-detail-actions"><button class="btn cinema-coming-soon" disabled>◷ Em breve</button><button class="btn" id="cinema-detail-list">+ Minha lista</button></div></div></div></article></div>
      <div id="cinema-player" class="panel hidden" style="margin-top:25px;padding:20px;"><div class="panel-head"><div><span class="eyebrow">REPRODUZINDO</span><h3 id="cinema-player-title">Conteúdo</h3></div><button class="btn btn-danger" id="cinema-close-player">Fechar</button></div><div id="cinema-player-content"></div></div>`;
    const footer=main.querySelector('.app-footer');main.insertBefore(section,footer||null);
  }
  const explore=$('cinema-explore');if(explore)explore.onclick=()=>setCinemaTab('all');
  const closePlayer=$('cinema-close-player');if(closePlayer)closePlayer.onclick=closeCinemaPlayer;
}

function buildSidebarNavigation() {
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

function switchView(name) {
  const target = $('view-' + name);
  if (!target) {
    toast('Esta página ainda não está disponível.');
    return;
  }

  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active-view');
  });

  target.classList.add('active-view');

  document.querySelectorAll('.nav-item[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  const labels = {
    chat: 'CHAT GERAL',
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
      displayName: profile.displayName || 'Jogador',
      avatarData: shopState?.avatarData || currentUser?.photoURL || '',
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
            <small>online</small>
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
  modal.innerHTML = `<div class="cropper-card member-profile-card">
    <div class="panel-head"><h3>Perfil do jogador</h3><button class="icon-btn" data-profile-close>✕</button></div>
    <div class="profile-banner-preview ${member.bannerStyle ? '' : 'no-profile-banner'}" data-style="${member.bannerStyle || 0}">${safeText(member.displayName || 'Jogador')}</div>
    <div class="member-profile-identity"><div class="avatar avatar-large" ${member.avatarData ? `style="background-image:url('${member.avatarData}');background-size:cover;background-position:center;color:transparent"` : ''}>${member.avatarData ? '' : safeText(initials(member.displayName || 'Jogador'))}</div><div><h2>${safeText(member.displayName || 'Jogador')}</h2><small>${own ? 'Este é o seu perfil' : 'Membro da comunidade'}</small></div></div>
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
    if (saved && Array.isArray(saved.team) && Array.isArray(saved.history)) { if (saved.coins === 300 && !saved.wins && saved.history.length === 0) saved.coins = 0; saved.losses = Number(saved.losses) || saved.history.filter(x => !x.win).length; saved.battles = Number(saved.battles) || (Number(saved.wins)||0) + saved.losses || saved.history.length; return saved; }
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
}
function backToMiniGames() {
  miniGamePage = 'home';
  $('minigame-stage')?.classList.add('hidden');
  $('minigame-tabs')?.classList.remove('hidden');
  $('pokemon-arena-content')?.classList.remove('hidden');
  $('game-stage')?.classList.add('hidden');
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
  const history = pokemonArena.history.slice(0,5).map(h=>`<div class="pokemon-history-row"><span>${h.win?'🏆':'⚔️'}</span><b>${safeText(h.opponent)}</b><small>${h.win?'+50 moedas':'Derrota'}</small></div>`).join('');
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
  return { ...base, hpNow: base.hp };
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
  const move = livingMoves[Math.floor(Math.random() * livingMoves.length)];
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
    pokemonArena.coins += 50;
    pokemonArena.wins = (Number(pokemonArena.wins) || 0) + 1;
  } else {
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
    ${b.finished ? `<div class="pokemon-result ${b.result}">${b.enemy.every(p=>p.hpNow<=0)?'🏆 Você venceu! +50 moedas.':'💤 Seus Pokémon foram derrotados. Tente novamente.'}</div><button class="btn btn-primary" data-pokemon-close-battle>Voltar à equipe</button>` : `
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

  const name = $('display-name').value.trim();

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

let cinemaFilter='all';
function setCinemaTab(tab){$('cinema-home-view')?.classList.toggle('hidden',tab!=='home');$('cinema-all-view')?.classList.toggle('hidden',tab!=='all');$('cinema-list-view')?.classList.toggle('hidden',tab!=='list');document.querySelectorAll('[data-cinema-tab]').forEach(b=>b.classList.toggle('active',b.dataset.cinemaTab===tab));if(tab==='list')renderCinemaList();}
function renderCinemaAll(){const items=cinemaFilter==='all'?cinemaItems:cinemaItems.filter(item=>item.type===cinemaFilter);if($('cinema-all-grid'))$('cinema-all-grid').innerHTML=items.length?items.map(cinemaCard).join(''):'<div class="empty-state">Nenhum conteúdo nesta categoria.</div>';renderCinemaList();$('cinema-list-count').textContent=getMyList().length;}function renderCinemaList(){const ids=getMyList(),items=cinemaItems.filter(item=>ids.includes(item.id));if($('cinema-list-grid'))$('cinema-list-grid').innerHTML=items.length?items.map(cinemaCard).join(''):'<div class="empty-state">Sua lista está vazia. Adicione filmes e séries pelo catálogo.</div>';if($('cinema-list-count'))$('cinema-list-count').textContent=ids.length;}
function openCinemaDetails(id){
 const item=cinemaItems.find(entry=>entry.id===id);if(!item)return;
 const poster=validWebUrl(item.poster||item.backdrop||'');
 $('cinema-detail-title').textContent=item.title||'Sem título';$('cinema-detail-type').textContent=item.type==='series'?'SÉRIE':'FILME';$('cinema-detail-description').textContent=item.description||'Descrição ainda não disponível.';
 $('cinema-detail-meta').innerHTML=[item.year||item.releaseDate,item.duration].filter(Boolean).map(v=>'<span>'+safeText(v)+'</span>').join('');
 $('cinema-detail-poster').src=poster||'https://placehold.co/500x750/17152b/e7d8ff?text=LIGHTYFLIX';$('cinema-detail-poster').alt=item.title||'Pôster';
 $('cinema-detail-backdrop').style.backgroundImage=poster?'url("'+poster.replace(/"/g,'%22')+'")':'linear-gradient(120deg,#302247,#141b31)';
 const listButton=$('cinema-detail-list');listButton.dataset.itemId=id;const refresh=()=>{listButton.textContent=getMyList().includes(id)?'✓ Remover da lista':'+ Minha lista';};listButton.onclick=()=>{toggleMyList(id);refresh();};refresh();
 $('cinema-details').classList.remove('hidden');document.body.classList.add('cinema-modal-open');
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
      {id:'lighty-naruto',title:'Naruto',type:'series',year:2002,releaseDate:'3 de outubro de 2002',duration:'~23 min por episódio',description:'Naruto Uzumaki é um jovem ninja que sonha em se tornar Hokage. Enfrentando desafios, rivais e missões perigosas, ele busca reconhecimento e cria laços que mudarão seu caminho.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BZmQ5NGFiNWEtMmMyMC00MDdiLTg4YjktOGY5Yzc2MDUxMTE1XkEyXkFqcGdeQXVyNTA4NzY1MzY%40._V1_FMjpg_UX1000_.jpg'},
      {id:'lighty-dragon-ball',title:'Dragon Ball',type:'series',year:1986,releaseDate:'26 de fevereiro de 1986',duration:'~24 min por episódio',description:'Acompanhe Goku desde a infância em uma jornada cheia de artes marciais, amizades e aventuras em busca das lendárias Esferas do Dragão.',featured:true,poster:'https://image.tmdb.org/t/p/w780/1YIJYarVZKH3nq89n1lVAxeVktg.jpg'},
      {id:'lighty-peabody-sherman',title:'As Aventuras de Peabody e Sherman',type:'movie',year:2014,releaseDate:'28 de fevereiro de 2014 (Brasil)',duration:'92 min',description:'Sr. Peabody, um cão inventor e genial, e seu filho adotivo Sherman viajam pela história usando a máquina do tempo WABAC. Quando uma aventura sai do controle, os dois precisam consertar o passado para proteger o futuro.',featured:true,poster:'https://m.media-amazon.com/images/M/MV5BYTBjMDAzYTEtYTI2ZS00MWJkLWJiM2MtOGEwN2NhZGQ1MmNlXkEyXkFqcGc%40._V1_FMjpg_UX1000_.jpg'},
      {id:'lighty-steven-universe-movie',title:'Steven Universo: O Filme',type:'movie',year:2019,releaseDate:'7 de outubro de 2019 (Brasil)',duration:'82 min',description:'Depois de um longo período de paz, Steven acredita que finalmente poderá descansar. Mas uma nova ameaça chega à Terra, obrigando-o e às Crystal Gems a proteger tudo o que construíram.',featured:true,poster:'https://www.syfy.com/sites/syfy/files/2019/07/stevenuniverse.png'}
    ];
    const knownIds = new Set(communityItems.map(item=>item.id));
    cinemaItems = [...builtInCatalog.filter(item=>!knownIds.has(item.id)), ...communityItems];

    renderCinema();

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

  if (list.includes(id)) {
    saveMyList(list.filter(item => item !== id));
    toast('Removido da sua lista.');
  } else {
    list.push(id);
    saveMyList(list);
    toast('Adicionado à sua lista.');
  }

  renderCinema();
}

// ========================================
// EVENTOS
// ========================================

function setupEvents() {
  $('google-login')?.addEventListener('click', login);
  $('chat-form')?.addEventListener('submit', sendMessage);
  $('profile-form')?.addEventListener('submit', saveProfile);
  document.addEventListener('change', event => { if (event.target.id === 'shop-avatar-file') handleShopAvatarFile(event); });
  $('logout')?.addEventListener('click', logout);
  $('leave-call')?.addEventListener('click', leaveCall);

  $('close-game')?.addEventListener('click', backToMiniGames);

  $('play-dice')?.addEventListener('click', () => showMiniGamePage('dice'));
  $('play-reaction')?.addEventListener('click', () => showMiniGamePage('reaction'));
  $('play-pokemon')?.addEventListener('click', () => showMiniGamePage('pokemon'));
  document.addEventListener('input', event => { if (['avatar-crop-zoom','avatar-crop-x','avatar-crop-y'].includes(event.target.id)) updateCropPreview(); });

  // Delegação também atende ao botão LightyFlix, criado dinamicamente.
  document.addEventListener('click', event => {
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

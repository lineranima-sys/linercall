
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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

  showAuthStatus('Validando o código de acesso...');

  try {
    const response = await fetch('/api/validateInviteCode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      throw new Error('O servidor retornou uma resposta inválida.');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Código de acesso inválido.');
    }

    showAuthStatus('Código válido! Redirecionando para o Google...');

    // O fluxo por redirecionamento evita dependências do monitoramento
    // de janelas popup e conclui a autenticação pelo onAuthStateChanged.
    await signInWithRedirect(auth, provider);

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

  await updateDoc(userRef, {
    lastSeen: serverTimestamp()
  });

  $('auth-screen')?.classList.add('hidden');
  $('app-shell')?.classList.remove('hidden');

  setUserUI();

  listenChat();
  listenUsers();
  listenRanking();
  listenChallenges();
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
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main-area');

  if (!sidebar || !main) return;

  if (!document.querySelector('[data-view="cinema"]')) {
    const label = document.createElement('div');
    label.className = 'nav-label';
    label.textContent = 'ENTRETENIMENTO';

    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.view = 'cinema';
    button.innerHTML = '<span>🎬</span> NetflixLiner <i></i>';

    const bottom = sidebar.querySelector('.sidebar-bottom');

    if (bottom) {
      sidebar.insertBefore(label, bottom);
      sidebar.insertBefore(button, bottom);
    }
  }

  if (!$('view-cinema')) {
    const section = document.createElement('section');

    section.id = 'view-cinema';
    section.className = 'view';

    section.innerHTML = `
      <div class="section-intro">
        <div>
          <span class="eyebrow">CINEMA DA COMUNIDADE</span>
          <h2>Seu próximo filme começa aqui.</h2>
          <p>Filmes e séries para descobrir e assistir.</p>
        </div>
        <span class="pixel-badge">BETA 01</span>
      </div>

      <div class="cinema-hero panel">
        <div class="cinema-hero-content">
          <span class="eyebrow">BEM-VINDO AO</span>
          <h1>NETFLIXLINER</h1>
          <p>Seu espaço para descobrir filmes, acompanhar séries e aproveitar histórias com seus amigos.</p>
          <button class="btn btn-primary" id="cinema-explore">
            Explorar catálogo →
          </button>
        </div>
      </div>

      <div class="cinema-section">
        <div class="panel-head">
          <div>
            <span class="eyebrow">ESCOLHIDOS PARA VOCÊ</span>
            <h3>Em destaque</h3>
          </div>
        </div>
        <div id="cinema-featured" class="cinema-grid">
          <div class="empty-state">Carregando catálogo...</div>
        </div>
      </div>

      <div class="cinema-section">
        <div class="panel-head">
          <div>
            <span class="eyebrow">DESCUBRA</span>
            <h3>Filmes e vídeos</h3>
          </div>
        </div>
        <div id="cinema-movies" class="cinema-grid">
          <div class="empty-state">Carregando catálogo...</div>
        </div>
      </div>

      <div class="cinema-section">
        <div class="panel-head">
          <div>
            <span class="eyebrow">MARATONAS</span>
            <h3>Séries</h3>
          </div>
        </div>
        <div id="cinema-series" class="cinema-grid">
          <div class="empty-state">Carregando catálogo...</div>
        </div>
      </div>

      <div class="cinema-section">
        <div class="panel-head">
          <div>
            <span class="eyebrow">SUA COLEÇÃO</span>
            <h3>Minha lista</h3>
          </div>
        </div>
        <div id="cinema-my-list" class="cinema-grid">
          <div class="empty-state">Sua lista está vazia.</div>
        </div>
      </div>

      <div id="cinema-player" class="panel hidden" style="margin-top:25px;padding:20px;">
        <div class="panel-head">
          <div>
            <span class="eyebrow">REPRODUZINDO</span>
            <h3 id="cinema-player-title">Conteúdo</h3>
          </div>
          <button class="btn btn-danger" id="cinema-close-player">Fechar</button>
        </div>
        <div id="cinema-player-content"></div>
      </div>
    `;

    const footer = main.querySelector('.app-footer');
    main.insertBefore(section, footer || null);
  }

  // Atribuir handlers evita duplicá-los quando o catálogo é recarregado.
  const explore = $('cinema-explore');
  if (explore) {
    explore.onclick = () => {
      $('cinema-movies')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    };
  }

  const closePlayer = $('cinema-close-player');
  if (closePlayer) closePlayer.onclick = closeCinemaPlayer;
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
    cinema: 'NETFLIXLINER'
  };

  const headings = {
    chat: 'Ponto de encontro.',
    calls: 'Sua voz, sua galera.',
    games: 'Hora de jogar.',
    arena: 'Bora competir?',
    ranking: 'Quem está no topo?',
    settings: 'Seu espaço.',
    cinema: 'Seu cinema começa aqui.'
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

          return `
            <div class="message">
              <div class="avatar">${safeText(initials(m.displayName))}</div>
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
          <div class="member-row">
            <div class="avatar">${safeText(initials(user.displayName))}</div>
            <b>${safeText(user.displayName || 'Jogador')}</b>
            <small>online</small>
          </div>
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

function listenRanking() {
  const q = query(
    collection(db, 'users'),
    orderBy('wins', 'desc'),
    limit(50)
  );

  stopListeners.push(onSnapshot(q, snap => {
    const users = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    const top = users.slice(0, 3);

    $('podium').innerHTML = top.length
      ? top.map((user, i) => `
          <div class="podium-place ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}">
            <div class="avatar">${safeText(initials(user.displayName))}</div>
            <b>${safeText(user.displayName || 'Jogador')}</b>
            <small>${user.wins || 0} vitórias</small>
            <div class="podium-block">${i + 1}º</div>
          </div>
        `).join('')
      : '<div class="podium-empty">O pódio está esperando os primeiros campeões.</div>';

    $('ranking-list').innerHTML = users.map((user, i) => `
      <div class="ranking-row">
        <span>${i + 1}</span>
        <span class="rank-name">
          <span class="avatar">${safeText(initials(user.displayName))}</span>
          ${safeText(user.displayName || 'Jogador')}
          ${user.id === currentUser.uid ? ' (você)' : ''}
        </span>
        <span class="wins">${user.wins || 0}</span>
        <span class="losses">${user.losses || 0}</span>
      </div>
    `).join('') || '<p class="muted">Ainda não há jogadores no ranking.</p>';

  }, error => {
    console.error(error);
    toast('Erro ao carregar ranking.');
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
          <button class="accept-btn" disabled title="Requer configuração das Cloud Functions">Aceitar</button>
          <button class="reject-btn" disabled title="Requer configuração das Cloud Functions">Recusar</button>
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
      <button id="roll-dice" class="btn btn-primary">Rolar dado</button>
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
// NETFLIXLINER — CATÁLOGO
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
  const poster = validWebUrl(item.poster || '');
  const title = safeText(item.title || 'Sem título');
  const description = safeText(item.description || '');
  const type = item.type === 'series' ? 'SÉRIE' : 'FILME';

  return `
    <article class="cinema-card">
      <img
        src="${poster || 'https://placehold.co/300x450/101a30/5ce1ed?text=NETFLIXLINER'}"
        alt="${title}"
        loading="lazy"
        onerror="this.src='https://placehold.co/300x450/101a30/5ce1ed?text=SEM+CAPA'"
      >
      <div class="cinema-card-info">
        <span class="cinema-type">${type}</span>
        <h4>${title}</h4>
        <p>${description}</p>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn btn-primary" data-watch="${safeText(item.id)}">
            Assistir
          </button>
          <button class="btn" data-mylist="${safeText(item.id)}">
            + Minha lista
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderCinema() {
  const featured = cinemaItems.filter(item => item.featured);
  const movies = cinemaItems.filter(item => item.type !== 'series');
  const series = cinemaItems.filter(item => item.type === 'series');

  $('cinema-featured').innerHTML = featured.length
    ? featured.map(cinemaCard).join('')
    : '<div class="empty-state">Ainda não há destaques no catálogo.</div>';

  $('cinema-movies').innerHTML = movies.length
    ? movies.map(cinemaCard).join('')
    : '<div class="empty-state">Nenhum filme cadastrado ainda.</div>';

  $('cinema-series').innerHTML = series.length
    ? series.map(cinemaCard).join('')
    : '<div class="empty-state">Nenhuma série cadastrada ainda.</div>';

  const ids = getMyList();
  const saved = cinemaItems.filter(item => ids.includes(item.id));

  $('cinema-my-list').innerHTML = saved.length
    ? saved.map(cinemaCard).join('')
    : '<div class="empty-state">Sua lista está vazia. Adicione conteúdos para encontrá-los aqui.</div>';
}

async function loadCinema() {
  createCinemaPage();

  $('cinema-featured').innerHTML =
    '<div class="empty-state">Carregando catálogo...</div>';

  try {
    const snapshot = await getDocs(
      query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(100))
    );

    cinemaItems = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

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
  $('logout')?.addEventListener('click', logout);
  $('leave-call')?.addEventListener('click', leaveCall);

  $('close-game')?.addEventListener('click', () => {
    $('game-stage')?.classList.add('hidden');
  });

  $('play-dice')?.addEventListener('click', showDice);
  $('play-reaction')?.addEventListener('click', showReaction);

  // Delegação também atende ao botão NetflixLiner, criado dinamicamente.
  document.addEventListener('click', event => {
    const navButton = event.target.closest('.nav-item[data-view]');
    if (navButton) switchView(navButton.dataset.view);
  });

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.go));
  });

  document.querySelectorAll('.join-room').forEach(button => {
    button.addEventListener('click', () => joinCall(button.dataset.room));
  });

  document.addEventListener('click', event => {
    const duel = event.target.closest('[data-challenge]');
    if (duel) {
      challengePlayer(duel.dataset.challenge, duel.dataset.name);
    }

    const watch = event.target.closest('[data-watch]');
    if (watch) playCinemaItem(watch.dataset.watch);

    const mylist = event.target.closest('[data-mylist]');
    if (mylist) toggleMyList(mylist.dataset.mylist);
  });
}

// ========================================
// INICIALIZAÇÃO
// ========================================

setupEvents();
createCinemaPage();

if (configured) {
  try {
    // Reutiliza a instância padrão caso o módulo seja avaliado novamente.
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    auth = getAuth(app);
    db = getFirestore(app);

    // Finaliza e captura erros de uma tentativa anterior por redirecionamento.
    getRedirectResult(auth).catch(error => {
      console.error('Erro ao retornar do Google:', error);
      const detail = error.code ? ` [${error.code}]` : '';
      showAuthStatus(
        `Não foi possível concluir o retorno do Google${detail}: ${error.message || 'erro desconhecido'}`,
        true
      );
    });

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

// Hub SHOOT’E R!: Singleplayer, Multiplayer 1v1 e Tutorial.
import {SHOOTER_MAPS,getShooterMap} from './shooter-maps.js';
import {mountShooterArena} from './shooter-fps.js';
import {createShooterOnline} from './shooter-online.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountShooter({root,user,addCoins,db}){
 let page='home',chosen='undefined',online=null,arenaCleanup=null,disposed=false,working=false;
 let poll=null,notice='',lastStatus='';
 function addServerCredits(total){
  if(!Number.isSafeInteger(total)||total<0)return;
  const key='linercall-shooter-server-earned-'+user.uid;
  const stored=Math.max(0,Number(localStorage.getItem(key))||0);
  if(total>stored){addCoins(total-stored);localStorage.setItem(key,String(total));}
 }
 function message(text){notice=String(text||'');const node=root.querySelector('#shooter-hub-info');if(node)node.textContent=notice;}
 function ensureOnline(){
  if(!online)online=createShooterOnline({db,user,onChange:syncOnline,onMessage:message,onWallet:addServerCredits});
  return online;
 }
 const preview=map=>'<div class="shoot-map-preview" style="--map-wall:'+map.colors.wall[1]+';--map-floor:'+map.colors.floor[0]+'">'+
  map.grid.map(line=>'<div class="shoot-map-minirow">'+[...line].map(cell=>'<i class="'+(cell==='0'?'floor':'solid')+'"></i>').join('')+'</div>').join('')+'</div>';
 const cards=(action,selected='')=>SHOOTER_MAPS.map(map=>
  '<button type="button" class="shoot-map-card '+(selected===map.id?'selected':'')+'" data-'+action+'="'+map.id+'">'+
   preview(map)+'<b>'+map.name+'</b><small>'+esc(map.subtitle)+'</small><span>'+esc(map.description)+'</span>'+
  '</button>').join('');
 const back='<button type="button" class="btn" data-shoot-menu>← Menu</button>';
 function render(){
  if(disposed||arenaCleanup)return;
  const room=online?.getRoom();
  let html='<section class="arcade-game shooter-hub">'+
   '<div class="shooter-hub-heading"><span class="eyebrow">LINERCALL ARCADE · SHOOTER 3D</span><h2 class="shooter-logo">SHOOT<span>’E</span> R!</h2>'+
   '<p>Um FPS com quatro cenários feitos para a comunidade. Escolha como quer jogar!</p></div>';
  if(page==='home'){
   html+='<div class="shoot-mode-grid">'+
    '<button type="button" class="shoot-mode-card solo" data-shoot-go="solo"><span>🎯</span><b>Singleplayer</b><small>Treine contra drones em qualquer cenário e ganhe LCoins.</small></button>'+
    '<button type="button" class="shoot-mode-card multi" data-shoot-go="multi"><span>⚔️</span><b>Multiplayer</b><small>1v1 online · cada jogador escolhe um mapa · sorteio entre os votos.</small></button>'+
    '<button type="button" class="shoot-mode-card help" data-shoot-go="tutorial"><span>📖</span><b>Tutorial</b><small>Aprenda a movimentação, armas, mira, recarga e salas online.</small></button></div>';
  }else if(page==='solo'){
   html+='<h3>🎯 Singleplayer</h3><p>Escolha o cenário para treinar contra drones. '+esc(getShooterMap(chosen).name)+' está selecionado.</p>'+
    '<div class="shoot-map-grid">'+cards('solo-map',chosen)+'</div>'+
    '<div class="shoot-hub-actions"><button type="button" class="btn btn-primary" data-shoot-start-solo>▶ Jogar em '+esc(getShooterMap(chosen).name)+'</button>'+back+'</div>';
  }else if(page==='tutorial'){
   html+='<h3>📖 Como jogar</h3><div class="shoot-tutorial">'+
    '<section><b>Movimento</b><p>WASD anda; use o mouse para olhar para os lados. No celular, use o direcional e arraste a visão.</p></section>'+
    '<section><b>Armas</b><p>1 = Pistola, 2 = Submetralhadora, 3 = Fuzil de precisão, 4 = Faca. Cada arma tem alcance e velocidade diferentes.</p></section>'+
    '<section><b>Tiro e munição</b><p>Botão esquerdo dispara. R recarrega usando a munição reserva. O fuzil ganha zoom segurando o botão direito.</p></section>'+
    '<section><b>Singleplayer</b><p>Elimine 12 drones antes que o tempo acabe. Vencendo, ganhe até 45 LCoins por dia (carteira local).</p></section>'+
    '<section><b>Multiplayer 1v1</b><p>Crie uma sala e envie o código de 6 caracteres ao amigo. Os dois votam em um dos quatro mapas e o servidor sorteia um dos dois escolhidos. Vença o duelo em até 150 segundos.</p></section>'+
    '<section><b>Conexão</b><p>A partida usa Firebase e precisa de login. Há latência de internet; ainda não é um servidor dedicado de Counter-Strike. As recompensas são validadas pelo servidor, mas a carteira principal de LCoins continua local.</p></section>'+
    '</div><div class="shoot-hub-actions"><button class="btn btn-primary" data-shoot-go="solo">🎯 Treinar agora</button>'+back+'</div>';
  }else if(page==='multi'){
   html+='<h3>⚔️ Multiplayer 1v1</h3>';
   if(!room){
    html+='<p>Jogue com um amigo conectado ao LinerCall. Um cria a sala, o outro digita o código.</p>'+
     '<div class="shoot-room-actions"><button type="button" class="btn btn-primary" data-shoot-create>＋ Criar sala</button>'+
     '<form id="shoot-join-form"><input name="code" autocomplete="off" maxlength="6" placeholder="Código da sala" aria-label="Código de seis caracteres" required>'+
     '<button type="submit" class="btn">Entrar na sala</button></form></div>'+
     '<p class="arcade-note">O multiplayer precisa das regras atualizadas do Firestore e da variável segura do Firebase Admin na Vercel.</p>'+back;
   }else{
    const me=room.hostUid===user.uid?'host':'guest',mine=room[me+'Vote'];
    html+='<div class="shoot-lobby-status"><span>Código: <b>'+esc(online.getCode())+'</b></span>'+
     '<button type="button" class="btn" data-shoot-copy>📋 Copiar código</button>'+
     '<span>Jogadores: <b>'+esc(room.hostName||'Criador')+' × '+esc(room.guestName||'Aguardando amigo...')+'</b></span></div>';
    if(room.status==='waiting'){
     html+='<p class="arcade-note">⏳ Esperando o segundo jogador entrar usando o código acima.</p>';
    }else if(room.status==='voting'){
     html+='<h3>Escolha seu mapa!</h3><p>Você e seu amigo escolhem um mapa cada. Quando os dois votarem, <b>um dos dois cenários será sorteado</b>.</p>'+
      '<div class="shoot-map-grid">'+cards('vote-map',mine)+'</div>'+
      '<div class="shoot-votes"><span>Jogador 1: <b>'+(room.hostVote?esc(getShooterMap(room.hostVote).name):'⏳ Ainda escolhendo')+'</b></span>'+
      '<span>Jogador 2: <b>'+(room.guestVote?esc(getShooterMap(room.guestVote).name):'⏳ Ainda escolhendo')+'</b></span></div>';
    }else if(room.status==='playing'){
     const map=getShooterMap(room.mapId);
     html+='<h3>🎲 Mapa sorteado: '+esc(map.name)+'</h3>'+
      '<p class="arcade-note">Cada um votou e o servidor escolheu <b>'+esc(map.name)+'</b>. A partida começou! Entre na arena.</p>'+
      '<div class="shoot-map-grid chosen">'+cards('readonly-map',map.id)+'</div>'+
      '<button type="button" class="btn btn-primary" data-shoot-enter-online>⚔️ Entrar no duelo!</button>';
    }else if(room.status==='finished'){
     const winner=room.winnerUid;
     html+='<h3>🏁 Partida encerrada</h3>'+
      '<p class="arcade-note">'+(winner?winner===user.uid?'🏆 Você venceu!':'O outro jogador venceu.':'Deu empate!')+
      ' Mapa: '+esc(getShooterMap(room.mapId).name)+'. Prêmio do servidor quando válido: 90 LCoins vencedor / 15 perdedor, limitado a 3 duelos premiados por dia.</p>'+
      '<button type="button" class="btn btn-primary" data-shoot-new-room>＋ Nova sala</button>';
    }
    html+='<div class="shoot-hub-actions"><button type="button" class="btn" data-shoot-leave>← Sair da sala</button></div>';
   }
  }
  html+='<p id="shooter-hub-info" class="arcade-note" role="status">'+esc(notice)+'</p></section>';
  root.innerHTML=html;
 }
 function syncOnline(){
  if(disposed||page!=='multi'||arenaCleanup)return;
  const room=online?.getRoom();
  const status=room?.status||'';
  if(status!==lastStatus){
   lastStatus=status;
   if(status==='playing')message('Mapa sorteado! Clique em Entrar no duelo.');
   if(status==='finished')message('Partida encerrada. Confira o resultado.');
  }
  render();
 }
 function showArena(mapId,mode){
  arenaCleanup=()=>{}; // evita renderizações do lobby durante a montagem
  arenaCleanup=mountShooterArena({root,user,addCoins,mapId,mode,online:mode==='multi'?online:null,
   autoStart:true,onExit:()=>{
    const old=arenaCleanup;arenaCleanup=null;
    old?.();
    if(mode==='multi'){
     online?.leave().then(()=>{online?.destroy();online=null;page='multi';render();})
      .catch(error=>{message(error.message);page='multi';render();});
    }else{page='home';render();}
   }});
 }
 async function run(action){
  if(working||disposed)return;
  working=true;
  try{await action();}
  catch(error){message(error.message||'Erro na ação do SHOOT’E R!.');}
  finally{working=false;if(!arenaCleanup)render();}
 }
 async function click(e){
  const action=e.target.closest('[data-shoot-go]');
  if(action){page=action.dataset.shootGo;render();return;}
  if(e.target.closest('[data-shoot-menu]')){
   if(page==='multi'&&online?.getCode())await run(async()=>{await online.leave();online.destroy();online=null;page='home';});
   else{page='home';render();}return;
  }
  const pick=e.target.closest('[data-solo-map]');
  if(pick){chosen=pick.dataset.soloMap;render();return;}
  if(e.target.closest('[data-shoot-start-solo]')){showArena(chosen,'single');return;}
  if(e.target.closest('[data-shoot-create]')){await run(async()=>{await ensureOnline().create();});return;}
  if(e.target.closest('[data-shoot-vote]'))return;
  const vote=e.target.closest('[data-vote-map]');
  if(vote){await run(async()=>{await ensureOnline().vote(vote.dataset.voteMap);});return;}
  if(e.target.closest('[data-shoot-enter-online]')){
   const room=online?.getRoom();
   if(room?.status==='playing')showArena(room.mapId,'multi');
   return;
  }
  if(e.target.closest('[data-shoot-new-room]')){
   await run(async()=>{online?.destroy();online=null;await ensureOnline().create();});return;
  }
  if(e.target.closest('[data-shoot-copy]')){
   const code=online?.getCode();if(code)try{await navigator.clipboard.writeText(code);message('Código copiado! Envie ao seu amigo.');}catch{message('Copie este código: '+code);}return;
  }
  if(e.target.closest('[data-shoot-leave]')){
   await run(async()=>{await online?.leave();online?.destroy();online=null;});return;
  }
 }
 async function joinSubmit(e){
  if(e.target.id!=='shoot-join-form')return;
  e.preventDefault();
  const code=String(e.target.elements.code.value||'').trim().toUpperCase();
  await run(async()=>{await ensureOnline().join(code);});
 }
 root.addEventListener('click',click);
 root.addEventListener('submit',joinSubmit);
 poll=setInterval(()=>{if(!disposed&&page==='multi'&&online?.getCode()&&online.getRoom()?.status==='playing')online.status().catch(()=>{});},7000);
 render();
 return ()=>{
  disposed=true;clearInterval(poll);root.removeEventListener('click',click);root.removeEventListener('submit',joinSubmit);
  arenaCleanup?.();arenaCleanup=null;
  if(online?.getCode()&&['waiting','voting','playing'].includes(online.getRoom()?.status))
   online.leave().catch(()=>{});
  online?.destroy();online=null;
 };
}

// Pokémon Arena Online — partidas PvP entre duas contas reais no Firestore.
// As partidas têm turnos atômicos e dano determinístico. Não concedem moedas
// nem resultados de ranking sem validação pelo servidor.
import {
 collection, doc, getDoc, addDoc, updateDoc, runTransaction, query,
 where, limit, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const charge=m=>Number(m?.power)>=22?48:20;
const types=(move,target)=>{
 const strong={Fogo:['Planta'],Água:['Fogo'],Planta:['Água'],Elétrico:['Água']};
 const weak={Fogo:['Água'],Água:['Planta','Elétrico'],Planta:['Fogo'],Elétrico:['Planta']};
 return strong[move]?.includes(target)?1.5:weak[move]?.includes(target)?.75:1;
};
function fighter(id,catalogue){
 const base=catalogue.find(x=>x.id===id);
 if(!base)return null;
 return {...base,hpNow:base.hp,pe:70,maxPE:100};
}
export function calculateOnlineBattle(match,turns,catalogue){
 const teams={
  [match.hostUid]:(match.hostTeam||[]).map(id=>fighter(id,catalogue)).filter(Boolean),
  [match.guestUid]:(match.guestTeam||[]).map(id=>fighter(id,catalogue)).filter(Boolean)
 };
 const active={[match.hostUid]:0,[match.guestUid]:0};
 const log=[];
 let winner=null,expected=match.hostUid,processed=0;
 for(const turn of [...turns].sort((a,b)=>a.turnNo-b.turnNo)){
  if(winner||turn.uid!==expected||turn.turnNo!==processed+1){break;}
  const mine=teams[turn.uid],otherUid=turn.uid===match.hostUid?match.guestUid:match.hostUid;
  const enemy=teams[otherUid];
  const attacker=mine[active[turn.uid]],defender=enemy[active[otherUid]];
  if(!attacker||!defender||!['attack','rest','switch'].includes(turn.type))break;
  if(turn.type==='rest'){
   const old=attacker.pe;attacker.pe=Math.min(100,attacker.pe+45);
   log.unshift(attacker.name+' descansou: +'+(attacker.pe-old)+' PE.');
  }else if(turn.type==='switch'){
   const newIndex=Number(turn.index);
   if(!Number.isInteger(newIndex)||newIndex<0||newIndex>=mine.length||mine[newIndex].hpNow<=0||newIndex===active[turn.uid])break;
   active[turn.uid]=newIndex;log.unshift(turn.uid===match.hostUid?'O anfitrião trocou de Pokémon.':'O convidado trocou de Pokémon.');
  }else{
   const move=attacker.moves?.[turn.index];
   if(!move||attacker.hpNow<=0||attacker.pe<charge(move))break;
   attacker.pe-=charge(move);
   const damage=Math.max(4,Math.round((move.power+attacker.atk*.55-defender.def*.30)*types(move.type,defender.type)));
   defender.hpNow=Math.max(0,defender.hpNow-damage);
   log.unshift(attacker.name+' usou '+move.name+'! '+damage+' de dano.');
   if(defender.hpNow===0){
    const replacement=enemy.findIndex(p=>p.hpNow>0);
    if(replacement<0){winner=turn.uid;log.unshift('A batalha terminou!');}
    else {active[otherUid]=replacement;log.unshift('O rival enviou '+enemy[replacement].name+'!');}
   }
  }
  expected=otherUid;processed++;
 }
 return {teams,active,winner,turnUid:expected,processed,log};
}
export function createPokemonOnline({db,uid,displayName,getTeam,catalogue,getArt,notify}){
 let players=[],matches=new Map(),selected=null,turns=[],unsubs=[],roomUnsubs=[];
 let warnedRules=false;
 const root=() => document.getElementById('pokemon-online-panel');
 const message=s=>notify?.(s);
 const mine=()=>getTeam().filter(id=>catalogue.some(p=>p.id===id)).slice(0,3);
 function inTime(user){
  const time=user.lastSeen?.toMillis?.()||0;
  return !!time&&Date.now()-time<4*60*1000;
 }
 function availableRooms(){
  return [...matches.values()].sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
 }
 function render(){
  const el=root();if(!el)return;
  const live=players.filter(p=>p.id!==uid&&inTime(p)).slice(0,16);
  const rooms=availableRooms();
  const inbox=rooms.filter(m=>m.guestUid===uid&&m.status==='invited');
  const mineRooms=rooms.filter(m=>m.status==='active'||(m.hostUid===uid&&m.status==='invited')).slice(0,12);
  const inviteRows=live.length?live.map(p=>'<div class="pvp-row"><b>'+esc(p.displayName||'Jogador')+'</b><span>● Online</span><button class="btn" data-pvp-invite="'+esc(p.id)+'" data-pvp-name="'+esc(p.displayName||'Jogador')+'" '+(mine().length!==3?'disabled':'')+'>⚔ Desafiar</button></div>').join(''):'<p class="muted">Não há outros jogadores online agora.</p>';
  const inboxRows=inbox.map(m=>'<div class="pvp-row"><b>'+esc(m.hostName)+'</b><span>quer batalhar!</span><button class="btn" data-pvp-accept="'+esc(m.id)+'" '+(mine().length!==3?'disabled':'')+'>Aceitar</button><button class="btn" data-pvp-reject="'+esc(m.id)+'">Recusar</button></div>').join('')||'<p class="muted">Nenhum convite recebido.</p>';
  const roomsHtml=mineRooms.map(m=>'<div class="pvp-row"><b>'+esc(m.hostName)+' × '+esc(m.guestName)+'</b><span>'+esc(m.status==='active'?'Partida iniciada':'Convite enviado')+'</span><button class="btn" data-pvp-open="'+esc(m.id)+'" '+(m.status!=='active'?'disabled':'')+'>Entrar</button></div>').join('')||'<p class="muted">Nenhuma partida em andamento.</p>';
  el.innerHTML='<div class="pvp-heading"><h3>⚔ Pokémon Arena · Online</h3><p>Duelo de turnos entre amigos conectados. Sem LCoins no PvP enquanto o placar não for validado por servidor.</p></div>'+
   '<div class="pvp-grid"><section><h4>Jogadores disponíveis</h4>'+inviteRows+'</section><section><h4>Convites recebidos</h4>'+inboxRows+'</section><section><h4>Suas partidas</h4>'+roomsHtml+'</section></div><div id="pokemon-online-battle"></div>';
  renderBattle();
 }
 function renderBattle(){
  const el=document.getElementById('pokemon-online-battle');if(!el||!selected)return;
  const match=matches.get(selected);if(!match||match.status!=='active')return;
  const state=calculateOnlineBattle(match,turns,catalogue);
  const owner=uid,other=uid===match.hostUid?match.guestUid:match.hostUid;
  const me=state.teams[owner]?.[state.active[owner]],enemy=state.teams[other]?.[state.active[other]];
  if(!me||!enemy)return;
  const pct=p=>Math.max(0,Math.floor(p.hpNow/p.hp*100));
  const pe=p=>Math.max(0,Math.floor(p.pe/100*100));
  const fighterMarkup=(p,who,own)=>'<div class="pvp-fighter"><div class="pvp-hud"><b>'+esc(who)+' · '+esc(p.name)+'</b><span>HP '+p.hpNow+'/'+p.hp+'</span><div class="pvp-meter"><i style="width:'+pct(p)+'%"></i></div><span>PE '+p.pe+'/100</span><div class="pvp-meter pe"><i style="width:'+pe(p)+'%"></i></div></div><img src="'+esc(getArt(p))+'" alt="'+esc(p.name)+'" loading="lazy"></div>';
  const myTurn=match.turnUid===uid&&state.processed===match.turnNo&&!state.winner;
  const actions=state.winner?'<strong class="pvp-outcome">'+(state.winner===uid?'Você venceu!':'Você perdeu!')+' Resultado PvP não concede moedas.</strong>':
    '<div class="pvp-actions"><p>'+(myTurn?'É a sua vez!':'Aguardando o adversário...')+'</p>'+
    me.moves.map((m,i)=>'<button class="btn" data-pvp-move="'+i+'" '+(!myTurn||me.pe<charge(m)?'disabled':'')+'>'+esc(m.name)+' · '+charge(m)+' PE</button>').join('')+
    '<button class="btn" data-pvp-rest '+(!myTurn?'disabled':'')+'>Descansar +45 PE</button>'+
    state.teams[uid].map((p,i)=>'<button class="btn" data-pvp-swap="'+i+'" '+(!myTurn||p.hpNow<=0||i===state.active[uid]?'disabled':'')+'>Trocar por '+esc(p.name)+'</button>').join('')+'</div>';
  el.innerHTML='<section class="pvp-match"><header><h3>Partida Online</h3><button class="btn" data-pvp-leave>Fechar arena</button></header>'+
    '<div class="pvp-field">'+fighterMarkup(enemy,uid===match.hostUid?match.guestName:match.hostName,false)+fighterMarkup(me,displayName,true)+'</div>'+
    actions+'<div class="pvp-log"><b>Registro dos turnos · '+state.processed+'</b>'+state.log.slice(0,6).map(t=>'<p>'+esc(t)+'</p>').join('')+'</div></section>';
 }
 function setPlayers(data){players=Array.isArray(data)?data:[];render();}
 function clearRoom(){
  roomUnsubs.forEach(f=>f());roomUnsubs=[];turns=[];selected=null;render();
 }
 function openRoom(id){
  clearRoom();selected=id;
  const roomRef=doc(db,'pokemonMatches',id);
  roomUnsubs.push(onSnapshot(roomRef,snap=>{
   if(!snap.exists()){clearRoom();return;}
   matches.set(id,{id,...snap.data()});render();
  },err=>message('Não foi possível acompanhar essa partida: '+err.code)));
  roomUnsubs.push(onSnapshot(collection(db,'pokemonMatches',id,'turns'),snap=>{
   turns=snap.docs.map(d=>d.data());
   renderBattle();
  },err=>message('Não foi possível acompanhar os turnos: '+err.code)));
  render();
 }
 async function invite(opponentId,opponentName){
  if(mine().length!==3)return message('Escolha três Pokémon primeiro.');
  if(!opponentId||opponentId===uid)return;
  try{
   await addDoc(collection(db,'pokemonMatches'),{
    hostUid:uid,guestUid:opponentId,hostName:displayName,guestName:opponentName,
    hostTeam:mine(),guestTeam:[],status:'invited',turnUid:'',turnNo:0,lastTurnId:'',
    createdAt:serverTimestamp(),updatedAt:serverTimestamp()
   });message('Convite Pokémon enviado para '+opponentName+'.');
  }catch(error){console.error(error);message(error.code==='permission-denied'?'Acesso negado no Pokémon Online: publique as regras firestore.rules no Firebase Console (não basta atualizar a Vercel).':'Erro ao enviar convite: '+(error.code||error.message));}
 }
 async function answer(id,accept){
  if(mine().length!==3&&accept)return message('Monte um time de três Pokémon.');
  try{
   const snap=await getDoc(doc(db,'pokemonMatches',id));
   if(!snap.exists()||snap.data().guestUid!==uid||snap.data().status!=='invited')return;
   const update=accept?{status:'active',guestTeam:mine(),turnUid:snap.data().hostUid,updatedAt:serverTimestamp()}:{status:'declined',updatedAt:serverTimestamp()};
   await updateDoc(doc(db,'pokemonMatches',id),update);
   message(accept?'Partida aceita!': 'Convite recusado.');
   if(accept)openRoom(id);
  }catch(error){console.error(error);message(error.code==='permission-denied'?'Não foi possível aceitar: é preciso publicar as novas regras do Firestore.':'Não foi possível responder: '+(error.code||error.message));}
 }
 async function act(type,index=0){
  if(!selected)return;
  const id=selected,roomRef=doc(db,'pokemonMatches',id);
  try{
   const room=matches.get(id);
   if(!room)return;
   const state=calculateOnlineBattle(room,turns,catalogue);
   if(state.winner)return message('A partida já terminou.');
   if(room.turnNo!==state.processed)return message('Sincronizando os turnos. Tente novamente.');
   const p=state.teams[uid]?.[state.active[uid]];
   if(!p||room.turnUid!==uid)return message('Ainda não é sua vez.');
   if(type==='attack'&&(!p.moves[index]||p.pe<charge(p.moves[index])))return message('PE insuficiente. Descanse.');
   if(type==='switch'&&(state.active[uid]===index||!state.teams[uid][index]||state.teams[uid][index].hpNow<=0))return;
   await runTransaction(db,async tx=>{
    const snap=await tx.get(roomRef);
    if(!snap.exists())throw Error('Sala não encontrada.');
    const fresh=snap.data();
    if(fresh.status!=='active'||fresh.turnUid!==uid||fresh.turnNo!==room.turnNo)throw Error('Outro turno foi registrado.');
    const other=uid===fresh.hostUid?fresh.guestUid:fresh.hostUid;
    const turnNo=fresh.turnNo+1;
    const moveRef=doc(collection(db,'pokemonMatches',id,'turns'));
    tx.set(moveRef,{uid,turnNo,type,index,createdAt:serverTimestamp()});
    tx.update(roomRef,{turnUid:other,turnNo,lastTurnId:moveRef.id,updatedAt:serverTimestamp()});
   });
  }catch(error){console.error(error);message('Falha no turno: '+(error.code||error.message));}
 }
 function onClick(e){
  const b=e.target.closest('[data-pvp-invite]');if(b){invite(b.dataset.pvpInvite,b.dataset.pvpName);return;}
  const yes=e.target.closest('[data-pvp-accept]');if(yes){answer(yes.dataset.pvpAccept,true);return;}
  const no=e.target.closest('[data-pvp-reject]');if(no){answer(no.dataset.pvpReject,false);return;}
  const open=e.target.closest('[data-pvp-open]');if(open){openRoom(open.dataset.pvpOpen);return;}
  if(e.target.closest('[data-pvp-leave]')){clearRoom();return;}
  const attack=e.target.closest('[data-pvp-move]');if(attack){act('attack',Number(attack.dataset.pvpMove));return;}
  const swap=e.target.closest('[data-pvp-swap]');if(swap){act('switch',Number(swap.dataset.pvpSwap));return;}
  if(e.target.closest('[data-pvp-rest]'))act('rest',0);
 }
 function start(){
  document.addEventListener('click',onClick);
  const listen=(field)=>{
   const q=query(collection(db,'pokemonMatches'),where(field,'==',uid),limit(30));
   unsubs.push(onSnapshot(q,snap=>{
    for(const d of snap.docs)matches.set(d.id,{id:d.id,...d.data()});
    render();
   },error=>{console.error(error);if(error.code==='permission-denied'){if(!warnedRules){warnedRules=true;message('Pokémon Online: falta publicar as regras do Firestore. Consulte docs/POKEMON-ONLINE.md.');}}else message('Falha nas partidas online: '+(error.code||error.message));}));
  };
  listen('hostUid');listen('guestUid');
 }
 function destroy(){
  document.removeEventListener('click',onClick);
  clearRoom();unsubs.forEach(f=>f());unsubs=[];
 }
 return {start,destroy,render,setPlayers};
}

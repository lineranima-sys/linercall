import {collection,onSnapshot,query,where,orderBy,limit} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const clean=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pairs=(a,b)=>[a,b].sort().join('_');
const ms=t=>t?.toMillis?.()||0;
export function createNotifications({db,uid,openDM,openArena,openFriends,openOffer}){
 const button=document.getElementById('notification-toggle'),panel=document.getElementById('notification-panel'),badge=document.getElementById('notification-count');
 let friends=[],requests=[],invites=[],offers=[],dm=new Map(),subs=new Map(),globalSubs=[],active=null,opened=false,prefs=null;
 const seenKey='linercall-notice-seen-'+uid;
 let seen={};try{seen=JSON.parse(localStorage.getItem(seenKey)||'{}');}catch{}
 const save=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}};
 const key=other=>'linercall-dm-read-'+uid+'-'+pairs(uid,other);
 const read=other=>{try{return Number(JSON.parse(localStorage.getItem(key(other))||'0'))||0;}catch{return 0;}};
 const unread=other=>prefs?.isMuted(other)?0:(dm.get(other)||[]).filter(m=>m.uid!==uid&&m.time>read(other)).length;
 const markRead=other=>{if(!other)return;save(key(other),Math.max(Date.now(),...(dm.get(other)||[]).map(m=>m.time)));render();};
 const setActive=other=>{active=other||null;if(active)markRead(active);render();};
 function rows(){
  return [
   ...friends.filter(f=>unread(f.uid)).map(f=>({type:'dm',id:f.uid,name:f.name,info:unread(f.uid)+' nova(s) mensagem(ns)',count:unread(f.uid),icon:'✉'})),
   ...invites.filter(m=>!seen['battle:'+m.id]&&!prefs?.hasBlocked(m.hostUid)).map(m=>({type:'battle',id:m.id,name:m.hostName,info:'Convite para batalha Pokémon',count:1,icon:'⚔'})),
   ...requests.filter(m=>!seen['friend:'+m.id]&&!prefs?.hasBlocked(m.uid)).map(m=>({type:'friend',id:m.id,name:m.name,info:'Pedido de amizade',count:1,icon:'♡'})),
   ...offers.filter(m=>!seen['offer:'+m.id]).map(m=>({type:'offer',id:m.id,name:m.title,info:m.description||'Nova oferta',count:1,icon:'✦'}))
  ];
 }
 function render(){
  const entries=rows(),count=entries.reduce((n,e)=>n+e.count,0);
  if(badge){badge.textContent=count>99?'99+':count;badge.hidden=!count;}
  if(button){button.setAttribute('aria-expanded',String(opened));button.setAttribute('aria-label',count+' notificações não lidas');}
  if(panel){
   panel.classList.toggle('hidden',!opened);
   panel.innerHTML='<div class="notice-top"><b>NOTIFICAÇÕES</b><button type="button" data-notice-close aria-label="Fechar">✕</button></div>'+
    (entries.length?entries.map(e=>'<button type="button" class="notice-row" data-notice-type="'+e.type+'" data-notice-id="'+clean(e.id)+'"><span>'+e.icon+'</span><div><b>'+clean(e.name||'LinerCall')+'</b><small>'+clean(e.info)+'</small></div><strong>›</strong></button>').join(''):
    '<div class="notice-empty">✦<b>Tudo em dia!</b><small>Novas mensagens, convites e ofertas aparecerão aqui.</small></div>')+
    '<p class="notice-hint">Mensagens lidas ao abrir a conversa · leitura salva neste dispositivo.</p>';
  }
  document.querySelectorAll('[data-friend-open]').forEach(btn=>{
   const n=unread(btn.dataset.friendOpen);let t=btn.querySelector('.dm-count');
   if(n&&!t){t=document.createElement('em');t.className='dm-count';btn.appendChild(t);}
   if(t){t.hidden=!n;t.textContent=n+' nova'+(n===1?'':'s');}
  });
 }
 function setFriends(list){
  friends=(list||[]).filter(f=>f.uid&&f.uid!==uid).slice(0,50);
  const ids=new Set(friends.map(f=>f.uid));
  for(const [id,stop] of subs)if(!ids.has(id)){stop();subs.delete(id);dm.delete(id);}
  friends.forEach(f=>{
   if(subs.has(f.uid))return;
   if(localStorage.getItem(key(f.uid))===null)save(key(f.uid),Date.now());
   const path=collection(db,'conversations',pairs(uid,f.uid),'messages');
   subs.set(f.uid,onSnapshot(query(path,orderBy('createdAt','desc'),limit(70)),snap=>{
    dm.set(f.uid,snap.docs.map(d=>({uid:d.data().uid,time:ms(d.data().createdAt)})));
    if(active===f.uid)markRead(f.uid);render();
   },err=>console.warn('Avisos da DM indisponíveis',err.code)));
  });render();
 }
 const setRequests=list=>{requests=list||[];render();};
 const setPreferences=next=>{prefs=next||null;render();};
 function mark(id){seen[id]=true;save(seenKey,seen);render();}
 function markCategory(type){
  for(const r of rows())if(r.type===type&&type!=='dm')seen[type+':'+r.id]=true;
  save(seenKey,seen);render();
 }
 function onClick(e){
  if(e.target.closest('#notification-toggle')){opened=!opened;render();return;}
  if(e.target.closest('[data-notice-close]')){opened=false;render();return;}
  const b=e.target.closest('[data-notice-type]');
  if(b){
   const type=b.dataset.noticeType,id=b.dataset.noticeId;
   if(type==='dm'){markRead(id);openDM(id,friends.find(f=>f.uid===id)?.name||'Amigo');}
   else {mark(type+':'+id);if(type==='battle')openArena();if(type==='friend')openFriends();if(type==='offer')openOffer?.(id);}
   opened=false;render();return;
  }
  if(opened&&!e.target.closest('#notification-panel')){opened=false;render();}
 }
 function onKey(e){if(e.key==='Escape'){opened=false;render();}}
 function start(){
  document.addEventListener('click',onClick);document.addEventListener('keydown',onKey);
  globalSubs.push(onSnapshot(query(collection(db,'pokemonMatches'),where('guestUid','==',uid),limit(30)),snap=>{
   invites=snap.docs.filter(d=>d.data().status==='invited').map(d=>({id:d.id,...d.data()}));render();
  },err=>console.warn('Notificações da Arena indisponíveis',err.code)));
  globalSubs.push(onSnapshot(query(collection(db,'offers'),where('active','==',true),limit(15)),snap=>{
   offers=snap.docs.map(d=>({id:d.id,...d.data()}));render();
  },err=>console.info('Ofertas não configuradas',err.code)));
  render();
 }
 function destroy(){
  document.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);
  subs.forEach(stop=>stop());subs.clear();globalSubs.forEach(stop=>stop());globalSubs=[];
  dm.clear();friends=[];requests=[];invites=[];offers=[];active=null;opened=false;render();
 }
 return {start,destroy,setFriends,setRequests,setPreferences,setActive,markRead,markCategory,getUnread:unread,render};
}

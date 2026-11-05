/* LinerCall · preferências privadas de amizade.
   Apelidos/silenciamento por conta, bloqueio aplicado também nas regras Firestore. */
import {collection,doc,deleteDoc,setDoc,onSnapshot,serverTimestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pair=(a,b)=>[a,b].sort().join('_');
export function createSocialControls({db,uid,onChange,notify,onFriendRemoved}){
 let contacts=new Map(),unsubscribe=null,pending=false;
 const get=id=>contacts.get(id)||{nickname:'',muted:false,blocked:false,displayName:''};
 const hasBlocked=id=>!!get(id).blocked;
 const isMuted=id=>!!get(id).muted||hasBlocked(id);
 const label=(id,fallback='Jogador')=>get(id).nickname?.trim()||fallback;
 const remember=(id,name)=>get(id).displayName||name||'Jogador';
 function updateView(){
  const blocked=document.querySelector('#social-blocked-list');
  if(blocked){
   const users=[...contacts.entries()].filter(([id,v])=>v.blocked);
   blocked.innerHTML=users.length?users.map(([id,v])=>
    '<div class="friend-row social-blocked-row"><b>🚫 '+esc(v.nickname||v.displayName||'Jogador bloqueado')+'</b>'+
    '<button type="button" class="btn" data-social-manage="'+esc(id)+'" data-social-name="'+esc(v.displayName||v.nickname||'Jogador')+'">Gerenciar</button></div>'
   ).join(''):'<p class="muted">Ninguém bloqueado.</p>';
  }
  onChange?.();
 }
 function start(){
  unsubscribe=onSnapshot(collection(db,'socialSettings',uid,'contacts'),snap=>{
   contacts=new Map(snap.docs.map(d=>[d.id,{nickname:'',muted:false,blocked:false,...d.data()}]));
   updateView();
  },error=>{console.warn('Configurações sociais indisponíveis',error);notify?.('Falha ao carregar preferências sociais. Confira as regras Firebase.');});
 }
 async function update(id,patch,displayName){
  if(!id||id===uid||pending)return;
  const data={...get(id),...patch};
  data.displayName=String(displayName||data.displayName||'Jogador').slice(0,60);
  data.nickname=String(data.nickname||'').trim().slice(0,40);
  data.muted=!!data.muted;data.blocked=!!data.blocked;
  pending=true;
  try{
   const ref=doc(db,'socialSettings',uid,'contacts',id);
   if(patch.blocked===true){
    const batch=writeBatch(db);
    batch.set(ref,{...data,updatedAt:serverTimestamp()});
    batch.delete(doc(db,'friendships',pair(uid,id)));
    // If the friendship does not exist, deleting an absent document requires
    // permissions and may be rejected. Fall back to the settings-only write.
    try{await batch.commit();}catch(error){
     if(error.code!=='permission-denied')throw error;
     await setDoc(ref,{...data,updatedAt:serverTimestamp()});
    }
    onFriendRemoved?.(id);
   }else{
    await setDoc(ref,{...data,updatedAt:serverTimestamp()});
   }
   contacts.set(id,data);updateView();
   notify?.(patch.blocked===true?'Jogador bloqueado.':patch.blocked===false?'Jogador desbloqueado.':patch.muted===true?'Notificações silenciadas.':patch.muted===false?'Notificações ativadas.':'Apelido atualizado.');
  }catch(error){
   console.error(error);
   notify?.(error.code==='permission-denied'?'O Firebase recusou a alteração. Publique as regras sociais atualizadas.':'Não foi possível salvar esta preferência.');
  }finally{pending=false;}
 }
 async function removeFriend(id){
  if(!id||id===uid||pending)return;
  if(!window.confirm('Desfazer amizade? A conversa privada ficará inacessível até vocês serem amigos novamente.'))return;
  pending=true;
  try{
   await deleteDoc(doc(db,'friendships',pair(uid,id)));
   onFriendRemoved?.(id);notify?.('Amizade removida.');
  }catch(error){
   console.error(error);
   notify?.(error.code==='permission-denied'?'As regras Firestore ainda não permitem desfazer amizades.':'Não foi possível remover a amizade.');
  }finally{pending=false;close();}
 }
 function close(){document.querySelector('#social-options-modal')?.remove();}
 function show(id,name='Jogador',friend=false){
  if(!id||id===uid)return;
  close();
  const item=get(id),shown=label(id,name);
  const modal=document.createElement('div');modal.id='social-options-modal';modal.className='social-overlay';
  modal.innerHTML='<section class="social-modal" role="dialog" aria-modal="true" aria-label="Gerenciar jogador">'+
   '<header><div><small>CONTROLES DE AMIZADE</small><h3>'+esc(shown)+'</h3></div><button type="button" data-social-close aria-label="Fechar">✕</button></header>'+
   '<p>Suas preferências são privadas. O apelido só aparece para você.</p>'+
   '<label for="social-nickname">Apelido</label><div class="social-nickname-form">'+
   '<input id="social-nickname" maxlength="40" placeholder="Como você quer chamar esta pessoa?" value="'+esc(item.nickname)+'">'+
   '<button type="button" class="btn btn-primary" data-social-save>Salvar</button></div>'+
   '<div class="social-modal-actions"><button type="button" class="btn" data-social-mute>'+
   (item.muted?'🔔 Ativar notificações':'🔕 Silenciar mensagens')+'</button>'+
   (friend?'<button type="button" class="btn" data-social-unfriend>Desfazer amizade</button>':'')+
   '<button type="button" class="btn social-danger" data-social-block>'+
   (item.blocked?'Desbloquear':'🚫 Bloquear jogador')+'</button></div></section>';
  const setLabel=x=>String(x||'Jogador').slice(0,60);
  modal.addEventListener('click',event=>{
   if(event.target===modal||event.target.closest('[data-social-close]')){close();return;}
   if(event.target.closest('[data-social-save]')){update(id,{nickname:modal.querySelector('#social-nickname').value},setLabel(name));close();}
   if(event.target.closest('[data-social-mute]')){update(id,{muted:!item.muted},setLabel(name));close();}
   if(event.target.closest('[data-social-unfriend]'))removeFriend(id);
   if(event.target.closest('[data-social-block]')){
    if(!item.blocked&&!window.confirm('Bloquear este jogador? Ele não poderá enviar mensagens privadas, convites de amizade nem batalhas para você.'))return;
    update(id,{blocked:!item.blocked,muted:!item.blocked||item.muted},setLabel(name));close();
   }
  });
  document.body.appendChild(modal);modal.querySelector('#social-nickname')?.focus();
 }
 function destroy(){unsubscribe?.();unsubscribe=null;contacts.clear();close();}
 return {start,destroy,get,label,isMuted,hasBlocked,show,update,removeFriend};
}

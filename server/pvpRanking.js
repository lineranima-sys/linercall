import {pvpBattleEffect,RARE_SUPER_MULTIPLIER} from '../pokemon-battle-effects.js';
// Regras compartilháveis para validar resultados PvP no servidor.
// NÃO aceita vitórias, derrotas ou pontuações informadas pelo navegador.
export const POKEMON_STATS = Object.freeze({
 pikachu:{hp:92,atk:23,def:13,type:'Elétrico',moves:[{power:22,type:'Elétrico'},{power:16,type:'Normal'}]},
 charizard:{hp:112,atk:26,def:15,type:'Fogo',moves:[{power:25,type:'Fogo'},{power:19,type:'Voador'}]},
 blastoise:{hp:124,atk:20,def:21,type:'Água',moves:[{power:23,type:'Água'},{power:17,type:'Normal'}]},
 venusaur:{hp:118,atk:21,def:19,type:'Planta',moves:[{power:22,type:'Planta'},{power:19,type:'Planta'}]},
 gengar:{hp:88,atk:29,def:12,type:'Fantasma',moves:[{power:27,type:'Fantasma'},{power:20,type:'Veneno'}]},
 lucario:{hp:104,atk:25,def:17,type:'Lutador',moves:[{power:26,type:'Lutador'},{power:18,type:'Aço'}]},
 eevee:{hp:100,atk:19,def:17,type:'Normal',moves:[{power:18,type:'Normal'},{power:16,type:'Normal'}]},
 snorlax:{hp:145,atk:22,def:23,type:'Normal',moves:[{power:22,type:'Normal'},{power:18,type:'Normal'}]}
});
const cost=move=>move.power>=22?48:20;
function advantage(moveType,defenderType){
 const strong={Fogo:['Planta'],Água:['Fogo'],Planta:['Água'],Elétrico:['Água']};
 const weak={Fogo:['Água'],Água:['Planta','Elétrico'],Planta:['Fogo'],Elétrico:['Planta']};
 return strong[moveType]?.includes(defenderType)?1.5:weak[moveType]?.includes(defenderType)?.75:1;
}
function fighters(ids){
 if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3)return null;
 const result=ids.map(id=>POKEMON_STATS[id]&&({...POKEMON_STATS[id],hpNow:POKEMON_STATS[id].hp,pe:70}));
 return result.every(Boolean)?result:null;
}
export function verifyPokemonMatch(match,turns){
 if(match?.status!=='active'||typeof match?.hostUid!=='string'||typeof match?.guestUid!=='string'||match.hostUid===match.guestUid)return null;
 const a=fighters(match.hostTeam),b=fighters(match.guestTeam);
 if(!a||!b||!Array.isArray(turns)||!Number.isInteger(match.turnNo)||turns.length!==match.turnNo||turns.length>300)return null;
 const teams={[match.hostUid]:a,[match.guestUid]:b};
 const active={[match.hostUid]:0,[match.guestUid]:0};
 let turnUid=match.hostUid;
 let winnerUid=null;
 const sorted=[...turns].sort((x,y)=>x.turnNo-y.turnNo);
 for(let i=0;i<sorted.length;i++){
  const t=sorted[i];
  if(winnerUid||t.uid!==turnUid||t.turnNo!==i+1||!['attack','rest','switch'].includes(t.type)||!Number.isInteger(t.index)||t.index<0||t.index>2)return null;
  const opponent=t.uid===match.hostUid?match.guestUid:match.hostUid;
  const attacker=teams[t.uid][active[t.uid]],defender=teams[opponent][active[opponent]];
  if(attacker.hpNow<=0||defender.hpNow<=0)return null;
  if(t.type==='rest'){
   attacker.pe=Math.min(100,attacker.pe+45);
  }else if(t.type==='switch'){
   if(t.index===active[t.uid]||teams[t.uid][t.index].hpNow<=0)return null;
   active[t.uid]=t.index;
  }else{
   const move=attacker.moves[t.index];
   if(!move||attacker.pe<cost(move))return null;
   attacker.pe-=cost(move);
   const effect=pvpBattleEffect(match.id,t.turnNo,t.uid);
   const damage=effect.miss?0:Math.max(4,Math.round((move.power+attacker.atk*.55-defender.def*.30)*advantage(move.type,defender.type)*(effect.rareSuper?RARE_SUPER_MULTIPLIER:1)));
   defender.hpNow=Math.max(0,defender.hpNow-damage);
   if(!defender.hpNow){
    const next=teams[opponent].findIndex(p=>p.hpNow>0);
    if(next===-1)winnerUid=t.uid;
    else active[opponent]=next;
   }
  }
  turnUid=opponent;
 }
 if(!winnerUid)return null;
 if(match.turnUid!==turnUid)return null;
 return {winnerUid,loserUid:winnerUid===match.hostUid?match.guestUid:match.hostUid,turns:sorted.length};
}
export function weekInSaoPaulo(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
 const d=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));
 const day=d.getUTCDay()||7;
 d.setUTCDate(d.getUTCDate()+4-day);
 const start=new Date(Date.UTC(d.getUTCFullYear(),0,1));
 const week=Math.ceil((((d-start)/86400000)+1)/7);
 return d.getUTCFullYear()+'-W'+String(week).padStart(2,'0');
}

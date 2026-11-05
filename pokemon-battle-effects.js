// Regras idênticas no servidor e no navegador para turnos de Pokémon PvP.
export const MISS_CHANCE = 0.04; // 4%: o golpe erra completamente
export const RARE_SUPER_CHANCE = 0.02; // 2% entre os golpes que acertaram
export const RARE_SUPER_MULTIPLIER = 2.0;
// PRNG determinístico de 32 bits para que o servidor valide os mesmos turnos.
function unitHash(text){
 let h=2166136261;
 for(let i=0;i<text.length;i++){h=Math.imul(h^text.charCodeAt(i),16777619);}
 return (h>>>0)/4294967296;
}
export function pvpBattleEffect(matchId,turnNo,uid){
 const salt=String(matchId||'legacy')+'|'+String(turnNo)+'|'+String(uid||'');
 const miss=unitHash(salt+'|miss')<MISS_CHANCE;
 const rareSuper=!miss&&unitHash(salt+'|rare')<RARE_SUPER_CHANCE;
 return {miss,rareSuper};
}
export function soloBattleEffect(random=Math.random){
 const miss=random()<MISS_CHANCE;
 return {miss,rareSuper:!miss&&random()<RARE_SUPER_CHANCE};
}

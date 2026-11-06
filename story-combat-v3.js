// Geometria de combate compartilhada. Unidades em pixels de mundo, sem dependência do DOM.
export function overlaps(a,b){
 return !!a&&!!b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
export function swordBox(hero,reach=76){
 const face=hero.face<0?-1:1;
 return {x:face>0?hero.x+hero.w-3:hero.x-reach+3,y:hero.y+8,w:reach,h:hero.h-11};
}
export function bodyBox(actor){
 return {x:actor.x+5,y:actor.y+5,w:Math.max(8,actor.w-10),h:Math.max(12,actor.h-5)};
}
export function swordCanHit(hero,target,reach=76){
 return overlaps(swordBox(hero,reach),target.hurtbox||bodyBox(target));
}
// BrigaLoka usa pés no piso, eixo y positivo para saltos.
export function fighterHurtbox(f){
 return {x:f.x-35,y:458-f.y-164,w:70,h:156};
}
export function fighterStrikeBox(f,type){
 const sizes={punch:[146,62,110],kick:[186,90,100],special:[255,138,151]};
 const [reach,top,height]=sizes[type]||sizes.punch;
 return {x:f.face>0?f.x+14:f.x-14-reach,y:458-f.y-top-height,w:reach,h:height};
}
export function fightersInRange(attacker,target,type){
 return overlaps(fighterStrikeBox(attacker,type),fighterHurtbox(target));
}

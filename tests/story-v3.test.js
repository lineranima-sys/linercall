import test from 'node:test';
import assert from 'node:assert/strict';
import {overlaps,swordBox,bodyBox, fightersInRange} from '../story-combat-v3.js';
import {chapter,lore} from '../story-chapter-v3.js';

test('espada alcança o inimigo à frente sem encostar o corpo',()=>{
 const hero={x:100,y:340,w:50,h:72,face:1};
 const goblin={x:226,y:340,w:48,h:68};
 assert.equal(overlaps(bodyBox(hero),bodyBox(goblin)),false);
 assert.equal(overlaps(swordBox(hero,123),bodyBox(goblin)),true);
});
test('espada não acerta inimigo atrás do herói',()=>{
 const hero={x:100,y:340,w:50,h:72,face:1};
 const target={x:31,y:340,w:48,h:68};
 assert.equal(overlaps(swordBox(hero,123),bodyBox(target)),false);
 assert.equal(overlaps(swordBox({...hero,face:-1},123),bodyBox(target)),true);
});
test('espada respeita distância e altura',()=>{
 const h={x:100,y:340,w:50,h:72,face:1};
 assert.equal(overlaps(swordBox(h),bodyBox({x:310,y:340,w:48,h:68})),false);
 assert.equal(overlaps(swordBox(h),bodyBox({x:220,y:100,w:48,h:68})),false);
});
test('BrigaLoka: soco e chute alcançam o rival antes dos corpos se sobreporem',()=>{
 const a={x:200,y:0,face:1},b={x:380,y:0,face:-1};
 assert.equal(fightersInRange(a,b,'punch'),true);
 assert.equal(fightersInRange(a,b,'kick'),true);
 assert.equal(fightersInRange({...a,face:-1},b,'punch'),false);
});
test('BrigaLoka: golpes respeitam o eixo vertical',()=>{
 const a={x:200,y:0,face:1},b={x:380,y:210,face:-1};
 assert.equal(fightersInRange(a,b,'punch'),false);
});
test('capítulo contém a jornada longa, monstros e todos os locais do roteiro',()=>{
 assert.deepEqual(chapter.map(z=>z.id),['estrada','floresta','vila','montanha','castelo']);
 assert.ok(chapter[0].length+chapter[1].length>7000);
 assert.ok(chapter[0].enemies.length>=8);
 assert.equal(chapter[4].enemies.length,0);
 for(const key of ['intro','arrival','fish','fishSong','dragon','castle','potion','princess','explosion','cloneWin','finale'])
  assert.ok(Array.isArray(lore[key])&&lore[key].length>0,key);
 assert.equal(lore.finale.at(-2)[1],'GANONDORF!');
});

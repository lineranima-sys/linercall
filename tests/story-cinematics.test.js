import test from 'node:test';
import assert from 'node:assert/strict';
import {drawStoryCutscene,drawSlide} from '../story-art-v3.js';
const mockCanvas=()=>{
 const gradient={addColorStop(){}};
 return new Proxy({
  createLinearGradient(){return gradient;},
  createRadialGradient(){return gradient;}
 },{
  get(target,key){return key in target?target[key]:(()=>{});},
  set(target,key,value){target[key]=value;return true;}
 });
};
test('cenas obrigatórias do capítulo desenham sem erros',()=>{
 const names=['intro','arrival','fish','fishSong','fishWin','dragon','castle','potion','princess','explosion','cloneWin','finale'];
 for(const name of names)for(let index=0;index<5;index++)
  assert.doesNotThrow(()=>drawStoryCutscene(mockCanvas(),name,index,2350),name+' etapa '+index);
});
test('fuga do dragão desenha com salto, agachamento e fogo em alturas diferentes',()=>{
 const c=mockCanvas();
 for(const y of [0,-72,-118])for(const duck of [0,.5])
  assert.doesNotThrow(()=>drawSlide(c,3000,.4,y,[{x:345,kind:'low'},{x:530,kind:'high'}],duck));
});

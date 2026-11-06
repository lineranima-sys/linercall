import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_SIZE,PHONE_REWARD,DIRECTION,nextPhone,moveSnake} from '../snake-phone.js';

test('telefone acrescenta exatamente um segmento e vale 10 LCoins',()=>{
 assert.equal(PHONE_REWARD,10);
 const before=[{x:5,y:5},{x:4,y:5},{x:3,y:5}];
 const after=moveSnake(before,DIRECTION.right,{x:6,y:5});
 assert.equal(after.dead,false);assert.equal(after.ate,true);assert.equal(after.snake.length,before.length+1);
 assert.deepEqual(after.snake[0],{x:6,y:5});
});
test('andar sem telefone não aumenta tamanho',()=>{
 const snake=[{x:5,y:5},{x:4,y:5},{x:3,y:5}];
 const next=moveSnake(snake,DIRECTION.right,{x:17,y:17});
 assert.equal(next.ate,false);assert.equal(next.snake.length,3);
});
test('cobrinhas morrem ao atingir parede ou o corpo',()=>{
 assert.equal(moveSnake([{x:BOARD_SIZE-1,y:0}],DIRECTION.right,{x:1,y:1}).dead,true);
 const snake=[{x:3,y:3},{x:3,y:4},{x:4,y:4},{x:4,y:3},{x:4,y:2}];
 assert.equal(moveSnake(snake,DIRECTION.right,{x:1,y:1}).dead,true);
});
test('mover para a célula antiga da cauda é permitido quando ela sai',()=>{
 const snake=[{x:3,y:3},{x:3,y:4},{x:4,y:4},{x:4,y:3}];
 assert.equal(moveSnake(snake,DIRECTION.right,{x:1,y:1}).dead,false);
});
test('telefone nunca nasce dentro da cobrinha',()=>{
 const snake=[{x:0,y:0},{x:1,y:0},{x:2,y:0}];
 for(const rand of [0,.25,.5,.75,.999]){
  const p=nextPhone(snake,()=>rand);
  assert.ok(p&&!snake.some(s=>s.x===p.x&&s.y===p.y));
 }
});
test('tabuleiro completo não tem posição de telefone',()=>{
 const snake=[];
 for(let y=0;y<BOARD_SIZE;y++)for(let x=0;x<BOARD_SIZE;x++)snake.push({x,y});
 assert.equal(nextPhone(snake),null);
});

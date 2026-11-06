import test from 'node:test';
import assert from 'node:assert/strict';
import {LIGHTY_MOVIE_COST,lightyMovieSource,lightyMovieOwns,lightyMovieRefundAmount} from '../lightyflix-movies.js';

test('filme no catálogo sem fonte não é vendido como reproduzível',()=>{
 const film={id:'lighty-peabody-sherman',type:'movie',title:'As Aventuras de Peabody e Sherman'};
 assert.equal(lightyMovieSource(film),'');
 assert.equal(lightyMovieSource({...film,catalogOnly:true,sourceUrl:'https://example.com/watch'}),'');
});
test('fontes válidas somente de filmes e via http(s)',()=>{
 const item={id:'film',type:'movie'};
 assert.equal(lightyMovieSource({...item,sourceUrl:'https://example.org/filme'}),'https://example.org/filme');
 assert.equal(lightyMovieSource({...item,embedUrl:'https://example.org/embed'}),'https://example.org/embed');
 assert.equal(lightyMovieSource({...item,sourceUrl:'javascript:alert(1)'}),'');
 assert.equal(lightyMovieSource({...item,sourceUrl:'data:text/html,hello'}),'');
 assert.equal(lightyMovieSource({...item,sourceUrl:'this is not a url'}),'');
 assert.equal(lightyMovieSource({...item,type:'series',sourceUrl:'https://example.org'}),'');
});
test('compras antigas permanecem identificadas como pertencentes ao usuário',()=>{
 const purchases={'movie:lighty-peabody-sherman':{cost:2000,boughtAt:1234}};
 assert.equal(lightyMovieOwns(purchases,'lighty-peabody-sherman'),true);
 assert.equal(lightyMovieRefundAmount(purchases['movie:lighty-peabody-sherman']),2000);
});
test('estorno desativa posse e impede novo estorno para a mesma compra',()=>{
 const entry={cost:2000,boughtAt:1234,refundedAt:5678,refundedAmount:2000};
 assert.equal(lightyMovieOwns({'movie:film':entry},'film'),false);
 assert.equal(lightyMovieRefundAmount(entry),0);
});
test('estorno não pode exceder o preço máximo do filme',()=>{
 assert.equal(LIGHTY_MOVIE_COST,2000);
 assert.equal(lightyMovieRefundAmount({cost:200000000}),LIGHTY_MOVIE_COST);
 assert.equal(lightyMovieRefundAmount({cost:-20}),0);
 assert.equal(lightyMovieRefundAmount({cost:NaN}),0);
 assert.equal(lightyMovieRefundAmount(null),0);
});

// Movie availability is not ownership: a poster in the catalog is not a playable movie.
export const LIGHTY_MOVIE_COST=2000;
export function lightyMovieSource(item){
 if(!item||item.catalogOnly||item.type!=='movie')return '';
 const raw=String(item.sourceUrl||item.embedUrl||'').trim();
 if(!raw)return '';
 try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:'';}
 catch{return '';}
}
export function lightyMovieOwns(purchases,id){
 const record=purchases?.['movie:'+String(id||'')];
 return !!(record&&typeof record==='object'&&!record.refundedAt);
}
export function lightyMovieRefundAmount(record){
 if(!record||typeof record!=='object'||record.refundedAt)return 0;
 const price=Number(record.cost);
 return Number.isSafeInteger(price)&&price>0?Math.min(LIGHTY_MOVIE_COST,price):0;
}

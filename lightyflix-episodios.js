// LightyFlix: guias de episódios com imagens de cena (TVmaze) e títulos PT-BR.
// Os títulos brasileiros revisados prevalecem; traduções automáticas são complementares.
// TVmaze API e imagens: CC BY-SA — https://www.tvmaze.com/api
export const LIGHTY_SERIES = {
  'lighty-steven-universe': { counts:[52,26,25,25,32,20], tvmaze:1615, future:45148,
    wiki:'Lista_de_episódios_de_Steven_Universe' },
  'lighty-naruto': { counts:[35,48,48,48,41], tvmaze:495 },
  'lighty-dragon-ball': { counts:[13,15,40,33,31,21], tvmaze:2102 },
  'lighty-jojo-bizarre-adventure': { counts:[26,48,39,39,38], tvmaze:8287 },
  'lighty-gumball': { counts:[36,40,40,40,40,44], tvmaze:3134,
    wiki:'Lista_de_episódios_de_O_Incrível_Mundo_de_Gumball' },
  'lighty-teen-titans': { counts:[13,13,13,13,13], tvmaze:765 },
  'lighty-demon-slayer': { counts:[1], tvmaze:41469 }
};

// Listas em ordem de episódio; títulos oficiais brasileiros quando conferidos.
// Steven Universo: guia de episódios em português (Wikipédia, fandom BR).
const KNOWN_TITLES = {
  'lighty-steven-universe': {
    1: [
      'O Brilho da Pedra','O Canhão de Laser','A Mochila Cheeseburger',
      'O Café da Manhã','Frybo','Dedos de Gato','Amigos de Bolha',
      'Steven Muito Sério','Tigre Milionário','O Leão de Steven',
      'Jogos Eletrônicos','A Mulher Gigante','Tantos Aniversários',
      'Lars e os Descolados','Negociando com o Cebola','Samurai Steven',
      'Leão 2: O Filme','Um Dia na Praia','O Quarto de Rose',
      'Treinador Steven','A Vítima da Pegadinha','Steven e os Stevens',
      'Amigo Monstro','Um Beijo Indireto','Espelho Gem','Gem Oceano',
      'O Hóspede','Corrida Espacial','Equipe Secreta','Aventura na Ilha',
      'O Estranho Mundo de Beach City','Jantar em Família','O Universo de Garnet',
      'Steven Melancia','Leão 3: Direto pro Vídeo','Transportadores',
      'Juntos e Sozinhos','O Teste','Visão do Futuro','Sem Destino',
      'Clube do Horror','Previsão do Tempo: Inverno','Capacidade Máxima',
      'Ataque de Mármore','A Espada de Rose','Livro Aberto',
      'O Clube da Camiseta','Uma História para Steven','A Mensagem',
      'Poder Político','O Retorno','Libertador'
    ],
    2: [
      'Contando Tudo','Curtindo por Aí','Diga Tio','Cartas de Amor',
      'Reformas','Juramento à Espada','Ondas Gigantes, Céus Explosivos',
      'Ficando Juntas','Temos que Conversar','Tempo de Relaxar','Peça Ajuda',
      'Motel Keystone','Amigo Cebola','Fricção Histórica','Amizade',
      'Pesadelo Hospitalar','A Canção da Sadie','Pegar e Largar',
      'Quando Chove','De Volta ao Celeiro','Longe Demais','A Resposta',
      'Aniversário do Steven','Poderia Ter Sido Ótimo','Mensagem Recebida',
      'Diário de Bordo 7-15-2'
    ],
    3: [
      'Super Ilha Melancia','Broca de Gems','O Mesmo Mundo',
      'Colegas de Celeiro','Tacada Certeira','Steven Voador',
      'Som na Caixa, Pai','Senhor Greg','Baixos Demais pra Brincar',
      'O Novo Lars','Corrida em Beach City','Guerra de Restaurante',
      'Entregas de Pizza da Kiki','Reencontro Monstruoso',
      'Sozinhos no Mar','Greg Babá','Caçando Gems','Bate o Chicote',
      'Steven contra Ametista','Bismuto — Parte 1','Bismuto — Parte 2',
      'Beta','Terráqueas','De Volta à Lua','Na Bolha'
    ],
    4: [
      'A Menina do Jardim de Infância','Conheça Sua Fusão',
      'O Livro do Buddy','Educação de Consciência',
      'Zoltron, Menino do Futuro','Última a Sair de Beach City',
      'A Turma do Cebola','Colheita de Gem — Parte 1',
      'Colheita de Gem — Parte 2','Três Gems e um Bebê',
      'O Sonho do Steven','Aventuras com Distorção de Luz',
      'Assalto de Gem','O Zoológico','Isso é Tudo',
      'As Novas Crystal Gems','Tempestade no Quarto',
      'Pedronaldo','Tigre Filantropo','Espaço pra Rubi',
      'Leão 4: Final Alternativo','Tocaia com o Doug',
      'O Bom Lars','Você é Meu Pai?','Eu Sou a Minha Mãe'
    ],
    5: [
      'Presos Juntos','O Julgamento','Descoloridas','A Cabeça do Lars',
      'Dewey Vence','Via-Gem','Levando o Celeiro',
      'De Volta ao Jardim de Infância','Sadie Killer','Festa do Kevin',
      'Lars Estelar','Lua Selva','Sua e Minha Mãe','O Grande Show',
      'Pulando Poços','Cartas pro Lars','Não Posso Voltar',
      'Uma Única Rosa Pálida','Agora Estamos Desmoronando',
      'Qual é o Seu Problema?','A Pergunta','Dama de Honra',
      'Reunidos — Parte 1','Reunidos — Parte 2',
      'Pernas Daqui ao Planeta Natal','Familiar','Juntos Sozinhos',
      'Escapismo','Mudar de Ideia — Parte 1','Mudar de Ideia — Parte 2',
      'Mudar de Ideia — Parte 3','Mudar de Ideia — Parte 4'
    ],
    6: [
      'Mini Escola Natal','Orientação','Botões de Rosa','Voleibol',
      'Bluebird','Um Episódio Muito Especial','Dia de Neve','Por Que Tão Azul?',
      'Mini Formatura','Par Espinhento','Em Sonhos','Bismuto Casual',
      'Juntos Para Sempre','Dores de Crescimento','Sr. Universo',
      'Fragmentos','De Volta ao Planeta Natal','Está Tudo Bem',
      'Eu Sou Meu Monstro','O Futuro'
    ]
  },
  'lighty-gumball': {
    1: [
      'O DVD','O Responsável','O Terceiro','A Dívida','O Fim',
      'O Vestido','A Busca','A Colher','A Pressão','O Desenho',
      'O Mais Preguiçoso','O Fantasma','O Mistério','A Pegadinha',
      'A Capa','O Beijo','A Festa','O Reembolso','O Robô',
      'O Piquenique','Os Bobos','O Segredo','A Meia','O Gênio',
      'O Poltergeist','O Bigode','O Encontro','O Clube',
      'A Varinha Mágica','O Primata','O Carro','A Maldição',
      'O Micro-ondas','A Intrometida','O Capacete','A Luta'
    ]
  },
  'lighty-demon-slayer': {1:['Crueldade']}
};
// O TVmaze usa a ordem de exibição, que difere da ordem de produção dos Titãs.
const KNOWN_BY_ENGLISH = {
  'lighty-teen-titans': {
    'final exam':'Prova Final','sisters':'Irmãs','divide and conquer':'Separar e Conquistar',
    'forces of nature':'Forças da Natureza','the sum of his parts':'Minha Melhor Parte',
    'nevermore':'Nunca Mais','switched':'A Troca','deep six':'No Fundo do Mar',
    'masks':'Máscaras','mad mod':'A Escola','apprentice 1':'Aprendiz — Parte 1',
    'apprentice 2':'Aprendiz — Parte 2','car trouble':'O Carro'
  }
};

const episodeFetches = new Map();
const wikiFetches = new Map();
const translationKey = 'linercall-lighty-episode-ptbr-v1';
let translationCache;
function cachedTranslations() {
  if (translationCache) return translationCache;
  try { translationCache = JSON.parse(localStorage.getItem(translationKey)||'{}'); }
  catch { translationCache = {}; }
  return translationCache;
}
function storeTranslation(key,value) {
  const cache=cachedTranslations();
  cache[key]=value;
  try {localStorage.setItem(translationKey,JSON.stringify(cache));} catch {}
}
function fetchWithTimeout(url,timeout=9500) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(url,{signal:controller.signal}).then(res=>{
    if(!res.ok)throw Error('HTTP '+res.status);
    return res.json();
  }).finally(()=>clearTimeout(timer));
}
async function tvmazeEpisodes(id) {
  if(!episodeFetches.has(id)) {
    const promise=fetchWithTimeout('https://api.tvmaze.com/shows/'+id+'/episodes')
      .then(data=>Array.isArray(data)?data.filter(e=>e && e.type!=='significant_special'):[])
      .catch(err=>{console.warn('LightyFlix TVmaze:',err);return [];});
    episodeFetches.set(id,promise);
  }
  return episodeFetches.get(id);
}
function episodeFrame(ep) {
  const img=ep?.image?.medium||ep?.image?.original||'';
  return /^https:\/\//i.test(img)?img:'';
}
function normalizedTitle(title) {
  return String(title||'').toLocaleLowerCase('pt-BR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function knownTitle(showId,seasonNumber,index,englishName) {
  const byName=KNOWN_BY_ENGLISH[showId]?.[normalizedTitle(englishName)];
  return byName || KNOWN_TITLES[showId]?.[seasonNumber]?.[index] || '';
}
function wrapEpisode(ep,showId,seasonNumber,index) {
  const english=ep?.name||'';
  const title=knownTitle(showId,seasonNumber,index,english)
     ||cachedTranslations()[showId+':'+seasonNumber+':'+index]
     ||english||('Episódio '+(index+1));
  return {number:index+1,title,english,image:episodeFrame(ep),
    providerUrl:ep?.url||'',isStill:!!episodeFrame(ep),
    verifiedTitle:!!knownTitle(showId,seasonNumber,index,english)};
}
// Respect the catalogue's original partition (Naruto and Dragon Ball use
// custom season groupings, different from TVmaze's broadcast seasons).
export async function getLightyEpisodes(showId,seasonIndex) {
  const config=LIGHTY_SERIES[showId];
  if(!config)return [];
  const count=config.counts[seasonIndex]||0;
  const seasonNumber=seasonIndex+1;
  if(showId==='lighty-demon-slayer') {
    const episodes=await tvmazeEpisodes(config.tvmaze);
    const one=episodes.find(ep=>ep.season===1&&ep.number===1)||episodes[0];
    return [wrapEpisode(one,showId,1,0)];
  }
  let source=await tvmazeEpisodes(config.tvmaze);
  if(showId==='lighty-steven-universe'&&seasonIndex===5) {
    const future=await tvmazeEpisodes(config.future);
    source=future.filter(ep=>ep.season===1).sort((a,b)=>(a.number||0)-(b.number||0));
  } else if(showId==='lighty-steven-universe') {
    let bySeason=source.filter(ep=>ep.season===seasonNumber)
      .sort((a,b)=>(a.number||0)-(b.number||0));
    // TVmaze groups the double/quadruple episodes into one broadcast entry.
    // The LightyFlix catalogue counts them as distinct numbered parts.
    const parts={
      3:{'bismuth':2},
      4:{'gem harvest':2},
      5:{'reunited':2,'change your mind':4}
    }[seasonNumber]||{};
    bySeason=bySeason.flatMap(ep=>{
      const repetitions=parts[normalizedTitle(ep.name)]||1;
      return Array.from({length:repetitions},()=>ep);
    });
    source=bySeason;
  } else if(showId==='lighty-jojo-bizarre-adventure'||
            showId==='lighty-gumball'||showId==='lighty-teen-titans') {
    const subset=source.filter(ep=>ep.season===seasonNumber)
      .sort((a,b)=>(a.number||0)-(b.number||0));
    if(subset.length>=count-2) source=subset;
    else source=source.slice(config.counts.slice(0,seasonIndex).reduce((a,b)=>a+b,0));
  } else {
    const offset=config.counts.slice(0,seasonIndex).reduce((a,b)=>a+b,0);
    source=source.slice(offset);
  }
  return Array.from({length:count},(_,index)=>
    wrapEpisode(source[index],showId,seasonNumber,index));
}
// The Portuguese Wikipedia episode guides offer the original Brazilian titles.
// Map by series-wide episode number, not by air date: premieres were reordered.
async function wikiEpisodeNames(showId) {
  const config=LIGHTY_SERIES[showId];
  if(!config?.wiki)return {};
  if(!wikiFetches.has(showId)) {
    const page=encodeURIComponent(config.wiki);
    const url='https://pt.wikipedia.org/w/api.php?action=parse&format=json&prop=text&origin=*&page='+page;
    const promise=fetchWithTimeout(url,11500).then(data=>{
      if(!data?.parse?.text?.['*'])return {};
      const documentHtml=new DOMParser().parseFromString(data.parse.text['*'],'text/html');
      const result={};
      let future=false;
      const nodes=documentHtml.querySelectorAll('h2,h3,tr');
      for(const node of nodes) {
        if(/^H[23]$/.test(node.tagName)) {
          const text=node.textContent||'';
          if(/Steven Universe Future/i.test(text))future=true;
          continue;
        }
        const cells=Array.from(node.querySelectorAll(':scope > th,:scope > td'));
        if(cells.length<3 || !cells[0].matches('td'))continue;
        const numberText=cells[0].textContent.trim();
        const range=numberText.match(/^(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?$/);
        if(!range)continue;
        const start=Number(range[1]),end=Number(range[2]||range[1]);
        if(start<1||end>300||end-start>4)continue;
        const titleCell=cells.find((cell,index)=>index>0 &&
          (/\bBR\b|\(BR\)|\bPT\b/.test(cell.textContent)||cell.innerHTML.includes('&#34;'))
        )||cells[Math.min(cells.length-1, cells.length>6?2:1)];
        if(!titleCell)continue;
        const cloned=titleCell.cloneNode(true);
        cloned.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
        const rawLines=cloned.textContent.split(/\n/).map(x=>x.trim()).filter(Boolean);
        let first=rawLines.find(x=>/\(?BR\)?/.test(x))||rawLines[0]||'';
        first=first.replace(/^\s*["“”]+\s*/,'')
          .replace(/\s*(?:\(?BR\)?|\(?Brasil\)?).*/i,'')
          .replace(/["“”\s]+$/,'').trim();
        if(!first||first.length>95||/^\d+$/.test(first))continue;
        for(let n=start;n<=end;n++) {
          const offset=config.counts.slice(0,5).reduce((a,b)=>a+b,0);
          let seasonIndex,episodeIndex;
          if(future && showId==='lighty-steven-universe') {
            seasonIndex=5;episodeIndex=n-1;
          } else {
            let remainder=n-1;seasonIndex=0;
            while(seasonIndex<config.counts.length-1&&remainder>=config.counts[seasonIndex]){
              remainder-=config.counts[seasonIndex++];
            }
            episodeIndex=remainder;
          }
          if(seasonIndex>=config.counts.length||episodeIndex>=config.counts[seasonIndex])continue;
          result[seasonIndex+1+':'+episodeIndex]=first;
        }
      }
      return result;
    }).catch(err=>{console.warn('LightyFlix Wikipédia:',err);return {};});
    wikiFetches.set(showId,promise);
  }
  return wikiFetches.get(showId);
}
function decodeEntities(value) {
  const el=document.createElement('textarea');
  el.innerHTML=value;
  return el.value.trim();
}
async function translateBatch(batch) {
  const source=batch.map(x=>x.english).join(' || ');
  if(!source||source.length>450)return null;
  const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(source)+
    '&langpair=en%7Cpt-BR';
  const data=await fetchWithTimeout(url,6500);
  if(Number(data.responseStatus)!==200||!data.responseData?.translatedText)return null;
  const translated=decodeEntities(data.responseData.translatedText);
  const parts=translated.split(/\s*\|\|\s*/).map(x=>x.trim());
  if(parts.length!==batch.length)return null;
  return parts;
}
// Runs after the episode cards appear. Never replaces a verified Brazilian title.
// An auto-translation is not claimed to be a broadcaster's official episode name.
export async function localizeLightyEpisodes(showId,seasonIndex,episodes,onUpdate) {
  const seasonNumber=seasonIndex+1,cache=cachedTranslations();
  if(LIGHTY_SERIES[showId]?.wiki) {
    const wiki=await wikiEpisodeNames(showId);
    let changed=false;
    episodes.forEach((ep,i)=>{
      const name=wiki[seasonNumber+':'+i];
      if(name && name!==ep.title && !KNOWN_TITLES[showId]?.[seasonNumber]?.[i]) {
        ep.title=name;ep.verifiedTitle=true;changed=true;
      }
    });
    if(changed)onUpdate();
  }
  const missing=episodes.map((ep,i)=>({...ep,i})).filter(ep=>
    !ep.verifiedTitle&&!!ep.english&&!cache[showId+':'+seasonNumber+':'+ep.i]);
  for(let start=0;start<missing.length;start+=7) {
    const batch=missing.slice(start,start+7);
    try {
      const translated=await translateBatch(batch);
      if(!translated)continue;
      translated.forEach((name,i)=>{
        const entry=batch[i];
        if(!name||name.length>140)return;
        const key=showId+':'+seasonNumber+':'+entry.i;
        episodes[entry.i].title=name;
        storeTranslation(key,name);
      });
      onUpdate();
    } catch(err) {
      console.warn('LightyFlix: tradução indisponível:',err);
      break;
    }
  }
}

// Adivinhe a Música: covers chiptune de temas populares e melodias tradicionais
// em domínio público, usando Web Audio. Para sucessos modernos, permite
// carregar covers próprios localmente, sem publicar nem compartilhar os arquivos.
const SONGS=[
 {genre:'Geek',title:'Korobeiniki',hint:'Tema folclórico russo também conhecido pelo jogo Tetris',bpm:152,wave:'square',notes:[76,71,72,74,72,71,69,69,72,76,74,72,71,71,72,74,76,72,69,69,74,77,81,79,77,76,72,76,74,72,71]},
 {genre:'Geek',title:'Für Elise',hint:'Beethoven · clássico usado em incontáveis jogos e vídeos',bpm:122,wave:'triangle',notes:[76,75,76,75,76,71,74,72,69,60,64,69,71,64,68,71,72,64,76,75,76,75,76,71,74,72,69]},
 {genre:'Geek',title:'Sinfonia nº 5',hint:'Beethoven · as quatro notas mais reconhecíveis da música clássica',bpm:105,wave:'square',notes:[67,67,67,63,65,65,65,62,67,67,67,63,68,68,68,67,65,65,65,62]},
 {genre:'Geek',title:'Ode à Alegria',hint:'Beethoven · melodia da Nona Sinfonia',bpm:125,wave:'square',notes:[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60]},
 {genre:'Geek',title:'Can-Can',hint:'Offenbach · tema famoso de perseguições em desenhos',bpm:173,wave:'square',notes:[67,67,67,67,72,76,79,79,76,74,72,74,76,72,72,69,72,76,77,76,74,72]},
 {genre:'Geek',title:'O Voo do Besouro',hint:'Rimsky-Korsakov · desafio de velocidade musical',bpm:194,wave:'sawtooth',notes:[76,75,74,73,72,73,74,75,76,75,74,73,72,71,70,69,68,69,70,71,72,71,70,69,68,67,66,65]},
 {genre:'Geek',title:'Na Gruta do Rei da Montanha',hint:'Edvard Grieg · tema de suspense muito usado em vídeos',bpm:153,wave:'square',notes:[59,61,62,64,66,62,66,65,61,65,64,60,64,59,61,62,64,66,62,66,71,69,66,62]},
 {genre:'Geek',title:'The Entertainer',hint:'Scott Joplin · ragtime clássico de jogos retrô',bpm:156,wave:'triangle',notes:[75,76,72,69,72,74,71,69,72,76,74,71,72,69,67,69,71,72,74,72,69,67]},
 {genre:'Aberturas',title:'Abertura de Guilherme Tell',hint:'Rossini · tema clássico de corridas e desenhos',bpm:166,wave:'sawtooth',notes:[67,67,67,67,67,67,67,72,76,79,79,76,74,72,74,76,79,79,76,74,72,67]},
 {genre:'Aberturas',title:'Pequena Serenata Noturna',hint:'Mozart · abertura de Eine kleine Nachtmusik',bpm:154,wave:'square',notes:[67,74,67,74,67,74,67,71,74,76,74,72,71,69,67,69,71,72,74]},
 {genre:'Aberturas',title:'Marcha Nupcial',hint:'Mendelssohn · abertura de cerimônias',bpm:106,wave:'triangle',notes:[67,72,72,72,74,76,77,76,74,72,69,67,72,72,72,74,76,77,79]},
 {genre:'Aberturas',title:'Jingle Bells',hint:'James Pierpont · refrão natalino muito conhecido',bpm:156,wave:'square',notes:[64,64,64,64,64,64,64,67,60,62,64,65,65,65,65,65,64,64,64,64,62,62,64,62,67]},
 {genre:'Aberturas',title:'Parabéns pra Você',hint:'Melodia tradicional de aniversário',bpm:118,wave:'triangle',notes:[60,60,62,60,65,64,60,60,62,60,67,65,60,60,72,69,65,64,62,70,70,69,65,67,65]},
 {genre:'Aberturas',title:'Brilha, Brilha, Estrelinha',hint:'Canção tradicional que Mozart também usou em variações',bpm:132,wave:'square',notes:[60,60,67,67,69,69,67,65,65,64,64,62,62,60,67,67,65,65,64,64,62]},
 {genre:'Aberturas',title:'Frère Jacques',hint:'Canção tradicional francesa',bpm:125,wave:'triangle',notes:[60,62,64,60,60,62,64,60,64,65,67,64,65,67,67,69,67,65,64,60,67,69,67,65,64,60]},
 {genre:'Aberturas',title:'Marcha Imperial de Radetzky',hint:'Johann Strauss pai · marcha orquestral clássica',bpm:138,wave:'sawtooth',notes:[67,67,69,71,72,72,71,69,67,72,72,74,72,71,69,67,69,71,72,74,76]},
 {genre:'Sertanejo',title:'Cai, Cai, Balão',hint:'Cantiga brasileira tradicional em arranjo de viola',bpm:117,wave:'triangle',notes:[67,67,69,67,65,64,62,62,65,64,62,60,67,67,69,67,65,64,62,65,64,62,60]},
 {genre:'Sertanejo',title:'Peixe Vivo',hint:'Canção popular de Minas Gerais',bpm:116,wave:'triangle',notes:[67,67,69,67,64,64,67,69,67,64,62,62,65,67,65,62,60,64,67,64,62,60]},
 {genre:'Sertanejo',title:'Ciranda, Cirandinha',hint:'Cantiga tradicional brasileira',bpm:119,wave:'sine',notes:[60,64,67,67,67,69,67,65,64,62,60,64,67,67,69,67,65,64,62,60]},
 {genre:'Sertanejo',title:'Sapo Cururu',hint:'Cantiga regional brasileira',bpm:110,wave:'triangle',notes:[60,64,67,67,64,60,62,65,65,62,60,64,67,67,64,60,62,65,62,60]},
 {genre:'Sertanejo',title:'Escravos de Jó',hint:'Cantiga tradicional brasileira',bpm:129,wave:'triangle',notes:[64,67,64,62,60,60,60,62,64,65,67,67,67,69,67,65,64,62,60,60]},
 {genre:'Sertanejo',title:'Se Essa Rua Fosse Minha',hint:'Modinha tradicional brasileira',bpm:104,wave:'sine',notes:[64,64,65,67,67,65,64,62,60,62,64,65,67,67,65,64,62,60]},
 {genre:'Sertanejo',title:'O Cravo e a Rosa',hint:'Cantiga tradicional brasileira',bpm:123,wave:'triangle',notes:[60,64,67,67,69,67,64,65,62,65,64,62,60,60,64,67,69,67,65,64,62,60]},
 {genre:'Sertanejo',title:'Capelinha de Melão',hint:'Cantiga tradicional de São João',bpm:125,wave:'triangle',notes:[67,67,69,67,65,64,62,62,64,65,67,69,67,65,64,62,60,62,64,65,67]}
];
export const FAMOUS_SONGS_COUNT=SONGS.length;
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=values=>{const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function mountMusic({root,user,addCoins}){
 let category='Geek',current=null,context=null,nodes=[],lastCategory={Geek:[],Aberturas:[],Sertanejo:[]},solved=false;
 let uploaded=[],fileUrls=[],audioPlayer=null,playing=false;
 root.innerHTML='<section class="arcade-game music-game"><span class="eyebrow">QUIZ DE MÚSICA · COVERS CHIPTUNE</span>'+
 '<h2>🎵 Adivinhe a Música!</h2><p>Agora são <b>melodias conhecidas</b>, tocadas em versões eletrônicas retrô. São temas de domínio público e músicas tradicionais, não títulos inventados. Responda o <b>nome da música</b>, não o nome do jogo!</p>'+
 '<div class="music-genres">'+['Geek','Aberturas','Sertanejo'].map(name=>'<button class="btn" type="button" data-music-genre="'+name+'">'+name+'</button>').join('')+'</div>'+
 '<p id="music-category-note" class="arcade-note"></p><div id="music-round"></div>'+
 '<details class="music-local-covers"><summary>🎼 Tenho covers famosos em arquivos de áudio — usar só neste navegador</summary>'+
 '<p>Adicione gravações de covers que você pode usar. Elas <b>não são enviadas ao site</b>. Isso permite testar faixas modernas sem hospedar arquivos de terceiros.</p>'+
 '<form id="music-import"><label>Nome da música<input name="title" required maxlength="90" placeholder="Ex.: título da música"></label>'+
 '<label>Categoria<select name="category"><option>Geek</option><option>Aberturas</option><option>Sertanejo</option></select></label>'+
 '<label>Arquivo de cover<audio hidden></audio><input name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/webm,audio/mp4" required></label>'+
 '<button class="btn btn-primary" type="submit">Adicionar cover local</button></form>'+
 '<p id="music-import-status" class="arcade-note">Nenhum cover local adicionado.</p></details></section>';
 const $=sel=>root.querySelector(sel);
 const notices={Geek:'🎮 Temas clássicos famosos em jogos, vídeos e memes. Melodias em estilo 8-bit.',Aberturas:'🎺 Aberturas, clássicos e temas tradicionais bem conhecidos. Aberturas modernas de animes ainda precisam de áudio autorizado.',Sertanejo:'🪕 Cantigas brasileiras tradicionais em estilo eletrônico/viola. Covers de sertanejo moderno podem ser testados com o arquivo local.'};
 function choices(){
  const pool=tracks();
  if(pool.length<5)return [];
  return shuffle([current,...shuffle(pool.filter(t=>t.title!==current.title)).slice(0,4)]);
 }
 function tracks(){return SONGS.filter(t=>t.genre===category).concat(uploaded.filter(t=>t.genre===category));}
 function stop(){
  if(audioPlayer){audioPlayer.pause();audioPlayer.currentTime=0;}
  for(const n of nodes){try{n.stop()}catch{}}
  nodes=[];playing=false;
 }
 function draw(){
  $('#music-category-note').textContent=notices[category]+' · '+tracks().length+' melodias disponíveis.';
  root.querySelectorAll('[data-music-genre]').forEach(btn=>btn.classList.toggle('btn-primary',btn.dataset.musicGenre===category));
  if(!current)return;
  const answers=choices();
  const pane=$('#music-round');
  pane.innerHTML='<div class="arcade-case-panel"><span class="eyebrow">CATEGORIA '+esc(category.toUpperCase())+' · 5 ALTERNATIVAS</span>'+
   '<h3>Que música é essa?</h3><p>Ouça o <b>cover eletrônico</b> e escolha o título certo. <b>+23 LCoins</b> por música acertada pela primeira vez.</p>'+
   '<button class="btn btn-primary" type="button" data-play-music>▶ Tocar cover</button>'+
   '<div class="music-choices">'+answers.map(t=>'<button class="btn" type="button" data-music-answer="'+esc(t.title)+'">'+esc(t.title)+'</button>').join('')+'</div>'+
   '<p class="arcade-note" id="music-result">Dica: ouça de novo quantas vezes precisar antes de responder.</p>'+
   '<button class="btn" type="button" data-music-next>↻ Próxima rodada</button></div>';
 }
 function next(){
  stop();solved=false;
  const pool=tracks();
  const unused=pool.filter(t=>!lastCategory[category].includes(t.title));
  if(!unused.length)lastCategory[category]=[];
  const remaining=unused.length?unused:pool;
  current=remaining[Math.floor(Math.random()*remaining.length)];
  lastCategory[category].push(current.title);
  draw();
 }
 function synth(song){
  if(!context)context=new (window.AudioContext||window.webkitAudioContext)();
  if(context.state==='suspended')context.resume();
  const beat=60/song.bpm,start=context.currentTime+.08,notes=song.notes;
  notes.forEach((midi,i)=>{
   const at=start+i*beat*.49,length=beat*.44;
   const osc=context.createOscillator(),amp=context.createGain();
   osc.type=song.wave;osc.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),at);
   const volume=.085;amp.gain.setValueAtTime(.0001,at);amp.gain.exponentialRampToValueAtTime(volume,at+.015);
   amp.gain.exponentialRampToValueAtTime(.0001,at+length);
   osc.connect(amp);amp.connect(context.destination);osc.start(at);osc.stop(at+length+.01);nodes.push(osc);
   if(i%4===0){
    const bass=context.createOscillator(),bGain=context.createGain();
    bass.type='triangle';bass.frequency.setValueAtTime(440*Math.pow(2,(midi-24-69)/12),at);
    bGain.gain.setValueAtTime(.0001,at);bGain.gain.exponentialRampToValueAtTime(.045,at+.03);bGain.gain.exponentialRampToValueAtTime(.0001,at+beat*1.65);
    bass.connect(bGain);bGain.connect(context.destination);bass.start(at);bass.stop(at+beat*1.65+.01);nodes.push(bass);
   }
  });
 }
 function play(){
  stop();
  if(!current)return;
  try{
   if(current.url){
    if(!audioPlayer)audioPlayer=new Audio();
    audioPlayer.src=current.url;audioPlayer.volume=.65;
    audioPlayer.play().catch(e=>{$('#music-result').textContent='Não foi possível tocar o arquivo: '+e.message;});
   }else synth(current);
   playing=true;
  }catch(e){$('#music-result').textContent='Erro de áudio: '+e.message;}
 }
 function importSong(event){
  event.preventDefault();
  const form=event.currentTarget;
  const title=String(form.elements.title.value||'').trim().slice(0,90);
  const genre=form.elements.category.value;
  const file=form.elements.audio.files?.[0];
  if(!title||!['Geek','Aberturas','Sertanejo'].includes(genre)||!file)return;
  if(uploaded.some(t=>t.genre===genre&&t.title.toLocaleLowerCase('pt-BR')===title.toLocaleLowerCase('pt-BR'))||SONGS.some(t=>t.genre===genre&&t.title.toLowerCase()===title.toLowerCase())){
   $('#music-import-status').textContent='Já existe uma música com esse nome na categoria.';return;
  }
  if(file.size>30*1024*1024){$('#music-import-status').textContent='Arquivo muito grande. Limite: 30 MB.';return;}
  if(!file.type.startsWith('audio/')){$('#music-import-status').textContent='Selecione um arquivo de áudio.';return;}
  const url=URL.createObjectURL(file);fileUrls.push(url);
  uploaded.push({genre,title,url});
  $('#music-import-status').textContent='Cover "'+title+'" adicionado somente a esta sessão. Nenhum upload foi feito.';
  form.reset();if(genre===category)draw();
 }
 function click(event){
  const g=event.target.closest('[data-music-genre]');
  if(g){category=g.dataset.musicGenre;next();return;}
  if(event.target.closest('[data-play-music]')){play();return;}
  if(event.target.closest('[data-music-next]')){next();return;}
  const answer=event.target.closest('[data-music-answer]');
  if(!answer||solved)return;
  solved=true;
  const correct=answer.dataset.musicAnswer===current.title;
  const result=$('#music-result');
  if(correct){
   const key='linercall-arcade-earned-'+user.uid+'-song-'+current.genre+'-'+current.title.toLocaleLowerCase('pt-BR');
   const newReward=!localStorage.getItem(key);
   if(newReward){localStorage.setItem(key,'1');addCoins(23);}
   result.textContent='✅ Acertou! '+current.title+' — '+current.hint+'. '+(newReward?'+23 LCoins!':'A recompensa já foi recebida nesta conta/navegador.');
  }else result.textContent='❌ Era '+current.title+'. '+current.hint+'.';
  $('#music-round').querySelectorAll('[data-music-answer]').forEach(b=>{b.disabled=true;b.classList.toggle('music-right-answer',b.dataset.musicAnswer===current.title);});
 }
 const importForm=$('#music-import');
 root.addEventListener('click',click);
 importForm.addEventListener('submit',importSong);
 next();
 return ()=>{root.removeEventListener('click',click);importForm.removeEventListener('submit',importSong);stop();for(const url of fileUrls)URL.revokeObjectURL(url);context?.close().catch(()=>{});};
}

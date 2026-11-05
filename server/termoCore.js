// Lógica pura: comparação correta de letras repetidas (Wordle/Termo).
export function normalizarPalavra(value) {
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ç/g,'c').toLowerCase().trim();
}
export function marcarTermo(palpite, resposta) {
  const input = normalizarPalavra(palpite), target = normalizarPalavra(resposta);
  if (!/^[a-z]{5}$/.test(input) || !/^[a-z]{5}$/.test(target)) throw new Error('Palavras inválidas');
  const marks=Array(5).fill('absent'), balance={};
  for(let i=0;i<5;i++){
    if(input[i]===target[i])marks[i]='correct';
    else balance[target[i]]=(balance[target[i]]||0)+1;
  }
  for(let i=0;i<5;i++){
    if(marks[i]==='correct')continue;
    if(balance[input[i]]>0){marks[i]='present';balance[input[i]]--;}
  }
  return marks;
}

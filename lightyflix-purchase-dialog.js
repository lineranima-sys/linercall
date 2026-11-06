// Dialogs dedicated to LightyFlix purchases. No transactions happen in this module.
let opened=null,previousFocus=null;
export function closeLightyDialog(){
 if(opened){opened.remove();opened=null;}
 if(previousFocus?.isConnected)previousFocus.focus();
 previousFocus=null;
}
export function showLightyDialog({kicker='LIGHTYFLIX · CINEMA',title,description,poster='',detail='',actions=[]}){
 closeLightyDialog();
 previousFocus=document.activeElement;
 const layer=document.createElement('div');
 layer.className='lighty-purchase-layer';
 layer.setAttribute('role','presentation');
 const shade=document.createElement('div');
 shade.className='lighty-purchase-shade';
 const dialog=document.createElement('section');
 dialog.className='lighty-purchase-dialog';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label',title||'LightyFlix');
 dialog.tabIndex=-1;
 const aside=document.createElement('aside');aside.className='lighty-purchase-visual';
 const image=document.createElement('img');image.alt='Cartaz do filme';
 try{const url=new URL(poster);if(['https:','http:'].includes(url.protocol))image.src=url.href;}
 catch{}
 if(image.src)aside.appendChild(image);
 const mark=document.createElement('div');mark.className='lighty-purchase-mark';mark.textContent='✦ LIGHTYFLIX';aside.appendChild(mark);
 const content=document.createElement('div');content.className='lighty-purchase-content';
 const small=document.createElement('small');small.className='lighty-purchase-kicker';small.textContent=kicker;
 const heading=document.createElement('h3');heading.textContent=title||'LightyFlix';
 const copy=document.createElement('p');copy.className='lighty-purchase-description';copy.textContent=description||'';
 content.append(small,heading,copy);
 if(detail){
  const info=document.createElement('div');info.className='lighty-purchase-detail';info.textContent=detail;
  content.append(info);
 }
 const buttons=document.createElement('div');buttons.className='lighty-purchase-buttons';
 for(const action of actions){
  const button=document.createElement('button');button.type='button';
  button.className='btn'+(action.primary?' btn-primary':'')+(action.danger?' lighty-refund-button':'');
  button.textContent=String(action.label||'Continuar');
  button.onclick=()=>{
   if(action.close!==false)closeLightyDialog();
   action.onClick?.();
  };
  buttons.append(button);
 }
 if(!actions.length){
  const button=document.createElement('button');button.type='button';button.className='btn btn-primary';
  button.textContent='Entendi';button.onclick=closeLightyDialog;buttons.append(button);
 }
 const close=document.createElement('button');close.className='lighty-purchase-close';close.type='button';
 close.setAttribute('aria-label','Fechar');close.textContent='×';close.onclick=closeLightyDialog;
 content.append(buttons);
 dialog.append(aside,content,close);
 layer.append(shade,dialog);
 shade.onclick=closeLightyDialog;
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();closeLightyDialog();}};
 layer.addEventListener('keydown',onKey);
 document.body.appendChild(layer);
 opened=layer;dialog.focus();
 return layer;
}

/* Merchandise concept lab: locally preview mascot artwork. No commerce or orders. */
(() => {
'use strict';
const mug=document.getElementById('goods-hero-visual');
const face=document.getElementById('goods-mug-face');
const buttons=[...document.querySelectorAll('[data-goods-face]')];
const variants={smile:'tobito_face_smile.png',angry:'tobito_face_angry.png',cry:'tobito_face_cry.png'};
for(const b of buttons)b.addEventListener('click',()=>{
  const asset=variants[b.dataset.goodsFace];
  if(!asset)return;
  face.src='../assets/images/'+asset;
  buttons.forEach(x=>{let yes=x===b;x.classList.toggle('is-active',yes);x.setAttribute('aria-pressed',String(yes));});
});
let raf=0;
if(mug && window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion:reduce)').matches){
  mug.addEventListener('pointermove',e=>{
    const r=mug.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/r.width,y=(e.clientY-r.top-r.height/2)/r.height;
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      mug.style.setProperty('--goods-x',String(Math.max(-9,Math.min(9,x*28)))+'deg');
      mug.style.setProperty('--goods-y',String(Math.max(-8,Math.min(8,y*21)))+'deg');
      raf=0;
    });
  },{passive:true});
  mug.addEventListener('pointerleave',()=>{mug.style.setProperty('--goods-x','0deg');mug.style.setProperty('--goods-y','0deg');});
}
const dialog=document.getElementById('goods-preview-dialog');
const picture=document.getElementById('goods-preview-img');
const caption=document.getElementById('goods-preview-caption');
const close=document.getElementById('goods-preview-close');
// Escape the scroll section's stacking context so the modal covers the header too.
if(dialog && dialog.parentElement!==document.body)document.body.appendChild(dialog);
let previous=null;
const shut=()=>{
  if(!dialog||dialog.hidden)return;
  dialog.hidden=true;
  document.body.classList.remove('goods-dialog-open');
  previous?.focus({preventScroll:true});
};
for(const b of document.querySelectorAll('[data-goods-preview]')){
  b.addEventListener('click',()=>{
    previous=b;
    picture.src=b.dataset.goodsPreview;
    picture.alt=b.dataset.goodsCaption||'とびとくん画像の拡大表示';
    caption.textContent=b.dataset.goodsCaption||'';
    dialog.hidden=false;
    close?.focus({preventScroll:true});
  });
}
close?.addEventListener('click',shut);
dialog?.addEventListener('click',e=>{if(e.target===dialog)shut();});
document.addEventListener('keydown',e=>{
  if(!dialog?.hidden && e.key==='Escape')shut();
  if(!dialog?.hidden && e.key==='Tab'){
    e.preventDefault();close?.focus({preventScroll:true});
  }
});
})();

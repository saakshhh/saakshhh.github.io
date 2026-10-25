/* Navigation, expandable experience entries, gentle card depth, contact copy. */
(function(){
  'use strict';
  const menu=document.querySelector('.menu-toggle');
  const links=document.querySelector('.nav-links');
  if(menu&&links){
    const close=()=>{menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');links.classList.remove('open');};
    menu.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));menu.setAttribute('aria-label',expanded?'Open navigation':'Close navigation');links.classList.toggle('open',!expanded);});
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!links.contains(e.target))close();});
  }
  const all=document.querySelector('[data-toggle-roles]');
  if(all){
    const roles=[...document.querySelectorAll('.role-card')];
    function sync(){const every=roles.every(r=>r.open);all.innerHTML=every?'Collapse all <span aria-hidden="true">↗</span>':'Expand all <span aria-hidden="true">↗</span>';all.setAttribute('aria-label',every?'Collapse all experience entries':'Expand all experience entries');}
    all.addEventListener('click',()=>{const open=!roles.every(r=>r.open);roles.forEach(r=>{r.open=open});sync();});
    roles.forEach(r=>r.addEventListener('toggle',sync));sync();
  }
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches){
    document.querySelectorAll('[data-tilt]').forEach(el=>{
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        el.style.setProperty('--ry',((x-.5)*6).toFixed(2)+'deg');el.style.setProperty('--rx',((.5-y)*5).toFixed(2)+'deg');el.style.setProperty('--mx',(x*100).toFixed(1)+'%');el.style.setProperty('--my',(y*100).toFixed(1)+'%');});
      el.addEventListener('pointerleave',()=>{el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');});
    });
  }
  document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{
    const email=btn.dataset.copy;
    let success=false;
    try{await navigator.clipboard.writeText(email);success=true;}catch(e){
      const el=document.querySelector('.email');if(el){const range=document.createRange();range.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);} }
    const label=btn.textContent;btn.textContent=success?'Email copied!':'Select email to copy';
    window.setTimeout(()=>{btn.textContent=label;},2200);
  }));
})();

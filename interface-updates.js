/* About, manual portfolio entry and simplified settings. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const slug=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'unknown';
const status=(text,error=false)=>{const e=$('portfolioImportStatus');if(e){e.textContent=text;e.style.color=error?'#f28e99':'';}};
function saveManual(e){
 e.preventDefault();
 try{
  const form=e.currentTarget,values=new FormData(form);
  const get=key=>String(values.get(key)||'').trim();
  const name=get('name'),setName=get('set')||'Unknown set',localId=get('number')||'—',language=get('language')||'en',edition=get('edition'),grade=get('grade')||'Raw';
  const quantity=Number(get('quantity')),cost=Number(get('cost'));
  if(!name)throw Error('Enter a Pokémon or card name.');
  if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw Error('Enter a valid quantity.');
  if(!Number.isFinite(cost)||cost<0||cost>10000000)throw Error('Enter a valid paid price.');
  const bridge=window.TradrBridge;
  if(!bridge)throw Error('Portfolio is loading. Please retry.');
  const w=bridge.getWorkspace();
  const key='manual:'+slug(language)+':'+slug(setName)+':'+slug(localId)+':'+slug(name)+':'+slug(edition)+':'+slug(grade);
  const existing=w.portfolio[key],oldQty=existing?.quantity||0,oldCost=existing?.cost||0;
  const newQty=oldQty+quantity;
  const avgCost=Number(((oldQty*oldCost+quantity*cost)/newQty).toFixed(2));
  w.cards[key]={...(w.cards[key]||{}),storageKey:key,id:key,language,name,setName,localId,edition,grade,image:'',provider:'Manual'};
  w.portfolio[key]={...(existing||{}),quantity:newQty,cost:avgCost,grade};
  bridge.save();
  $('portfolioManualForm').hidden=true;
  $('portfolioManualToggle').textContent='Add card';
  form.reset();
  bridge.changeTab('portfolio');
  status(existing?'Updated '+name+' in your portfolio.':'Added '+name+' to your portfolio.');
 }catch(err){status(err.message,true);}
}
function init(){
 $('portfolioManualForm')?.addEventListener('submit',saveManual);
 $('portfolioManualToggle')?.addEventListener('click',()=>{
  const form=$('portfolioManualForm');
  form.hidden=!form.hidden;
  $('portfolioManualToggle').textContent=form.hidden?'Add card':'Close';
  if(!form.hidden)form.querySelector('[name="name"]')?.focus();
 });
 $('portfolioManualCancel')?.addEventListener('click',()=>{
  $('portfolioManualForm').hidden=true;
  $('portfolioManualToggle').textContent='Add card';
 });
 $('aboutTradrButton')?.addEventListener('click',()=>$('aboutTradrDialog').showModal());
 $('closeAboutTradr')?.addEventListener('click',()=>$('aboutTradrDialog').close());
 $('aboutTradrDialog')?.addEventListener('click',e=>{if(e.target===$('aboutTradrDialog'))e.target.close()});
 $('settingsSignIn')?.addEventListener('click',()=>$('authButton')?.click());
 const preferred=$('settingsCurrency');
 if(preferred){
  preferred.value=localStorage.getItem('tradr151_currency')==='GBP'?'GBP':'USD';
  preferred.addEventListener('change',()=>{
   const target=document.querySelector('[data-currency="'+preferred.value+'"]');
   target?.click();
   if(!target?.classList.contains('selected'))preferred.value=document.querySelector('[data-currency].selected')?.dataset.currency||'USD';
  });
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
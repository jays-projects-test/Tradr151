/* Gems: market-wide research, using observed prices only, no fabricated grading returns. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const DAY=86400000;
let universe=null,mode='dips',candidates=null,loaded=false;
const pct=n=>(n>=0?'+':'')+n.toFixed(1)+'%';
async function getData(){
 if(universe)return universe;
 $('gemFeedStatus').textContent='Scanning Tradr151 market data…';
 const r=await fetch('data/market-universe.json',{cache:'force-cache'});
 if(!r.ok)throw Error('Market data temporarily unavailable.');
 const d=await r.json();if(!d.products||!d.observations)throw Error('Market data format unavailable.');
 universe=d;return d;
}
const variation=points=>{
 if(!points.length)return null;
 const ordered=[...points].sort((a,b)=>a[0].localeCompare(b[0]));
 const now=ordered.at(-1),age=Date.now()-Date.parse(now[0]+'T12:00:00Z');
 if(age>5*DAY || !Number.isFinite(+now[1]) || +now[1]<=0)return null;
 const old=ordered.filter(p=>p[0]<=new Date(Date.parse(now[0]+'T12:00:00Z')-7*DAY).toISOString().slice(0,10)).at(-1);
 const change=old&&+old[1]>0?100*(+now[1]/+old[1]-1):null;
 const mid=Number(now[2]),low=Number(now[3]);
 const gap=Number.isFinite(mid)&&mid>0?(mid-now[1])/mid*100:null;
 return {price:+now[1],change,gap:Number.isFinite(gap)?gap:null,mid,low,days:ordered.length,asOf:now[0]};
};
function buildCandidates(){
 const found=[];
 for(const [key,points] of Object.entries(universe.observations)){
   const cut=key.indexOf(':');if(cut<0)continue;
   const id=key.slice(0,cut),product=universe.products[id];if(!product)continue;
   const variant=key.slice(cut+1);
   if(!(/normal|holo|reverse|foil/i.test(variant)))continue;
   const data=variation(points);if(!data||data.price<2||data.price>12000)continue;
   const hasChange=data.change!==null&&data.days>=2&&Math.abs(data.change)<90;
   const dip=hasChange&&data.change<=-12;
   const momentum=hasChange&&data.change>=12;
   const gap=data.gap!==null&&data.gap>=22&&data.gap<85 && data.mid>data.price;
   if(!dip&&!momentum&&!gap)continue;
   found.push({id,product,variant,...data,category:dip?'dips':momentum?'momentum':'gap',score:dip?-data.change:momentum?data.change:data.gap});
 }
 const unique=new Map();
 for(const r of found.sort((a,b)=>b.score-a.score)){
  if(!unique.has(r.id))unique.set(r.id,r);
 }
 candidates=[...unique.values()];
}
const button=(item)=>{
 const {id,product,variant,change,gap,price,asOf}=item;
 const label=change!==null?'7D '+pct(change):'Guide / listing gap '+(gap||0).toFixed(1)+'%';
 const status=change!==null&&change<0?'drop':change!==null&&change>0?'rise':'neutral';
 const image=product.img?.startsWith('https://')?'<img loading="lazy" src="'+escape(product.img)+'" alt="">':'<span class="gem-img-placeholder"></span>';
 return '<button type="button" class="gem-candidate" data-gem-product="'+Number(id)+'" data-gem-variant="'+escape(variant)+'">'+image+'<span class="gem-candidate-main"><b>'+escape(product.name)+'</b><small>'+escape(product.set)+' · '+escape(variant)+'</small><small>'+escape(asOf)+'</small></span><span class="gem-candidate-stats"><b>$'+price.toFixed(2)+'</b><em class="'+status+'">'+label+'</em></span></button>';
};
function render(){
 document.querySelectorAll('[data-gem-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.gemFilter===mode));
 const host=$('gemCandidates');if(!host)return;
 if(mode==='graded'){
  $('gemListTitle').textContent='Grading opportunities';
  host.innerHTML='<div class="gem-note"><strong>Grading opportunities need verified data</strong><p>Cards with low PSA 10 populations, low gem rates or strong raw-to-PSA 10 returns will be ranked here when population and graded-sale feeds are connected. No grades or return estimates are guessed.</p></div>';return;
 }
 if(mode==='saved'){
  $('gemListTitle').textContent='My researched cards';
  const w=window.TradrBridge?.getWorkspace?.();
  if(!w){host.textContent='Portfolio not ready';return;}
  const keys=[...new Set([...Object.keys(w.portfolio||{}),...(w.watchlist||[])])];
  host.innerHTML=keys.length?keys.slice(0,50).map(key=>{
   const c=w.cards[key];if(!c)return '';
   const signal=window.TradrBridge.signalFor(key);
   return '<div class="gem-saved"><div><b>'+escape(c.name)+'</b><small>'+escape(c.setName)+' · '+escape(c.localId)+'</small><small>'+(signal.score!==null?escape(signal.label)+' · '+signal.score+'/100':'Awaiting comparable sales')+'</small></div><button class="secondary" data-gem-saved="'+escape(key)+'" type="button">Research</button></div>';
  }).join(''):'<div class="gem-note">Add a card to your portfolio or watchlist to research it here.</div>';
  return;
 }
 if(!candidates){host.innerHTML='<div class="gem-note">Select Refresh to screen the market.</div>';return;}
 const list=candidates.filter(r=>mode==='dips'?(r.change!==null&&r.change<=-12):r.change!==null&&r.change>=12).slice(0,24);
 $('gemListTitle').textContent=mode==='dips'?'Largest observed price drops':'Recent price momentum';
 host.innerHTML=list.length?list.map(button).join(''):'<div class="gem-note">No qualifying '+(mode==='dips'?'price drops':'momentum signals')+' with enough dated observations yet. Cards will appear as historical comparisons accumulate.</div>';
 $('gemFeedStatus').textContent='Observed market-price changes · values in USD. These are leads for research, not automatic buy recommendations.';
}
async function refresh(){
 try{await getData();buildCandidates();loaded=true;render()}
 catch(e){$('gemFeedStatus').textContent=e.message;$('gemCandidates').innerHTML='<div class="gem-note">Could not load the market shortlist.</div>';}
}
async function search(){
 const q=$('gemSearchInput').value.trim().toLowerCase();
 const host=$('gemSearchResults');
 if(q.length<2){host.textContent='Enter at least two characters.';return;}
 host.textContent='Finding cards…';
 try{
  const data=await getData();
  const matches=Object.values(data.products).filter(p=>((p.name||'')+' '+(p.set||'')+' '+(p.number||'')).toLowerCase().includes(q)).slice(0,30);
  host.innerHTML=matches.length?matches.map(p=>'<button type="button" data-gem-product="'+Number(p.id)+'" class="gem-search-match"><b>'+escape(p.name)+'</b><small>'+escape(p.set)+' · '+escape(p.number||'')+'</small></button>').join(''):'<p class="muted small">No matching card. Try the name or set.</p>';
 }catch(e){host.textContent=e.message;}
}
function init(){
 $('gemSearchButton')?.addEventListener('click',search);
 $('gemSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')search()});
 $('gemRefreshButton')?.addEventListener('click',refresh);
 document.querySelectorAll('[data-gem-filter]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.gemFilter;if(!loaded&&['dips','momentum'].includes(mode))refresh();else render()}));
 document.addEventListener('click',e=>{
  const product=e.target.closest('[data-gem-product]');
  if(product){window.TradrMarket?.openCard(Number(product.dataset.gemProduct),product.dataset.gemVariant);return;}
  const saved=e.target.closest('[data-gem-saved]');
  if(saved){const c=window.TradrBridge?.getWorkspace()?.cards[saved.dataset.gemSaved];if(c)window.TradrBridge.openCard(c);}
 });
 document.querySelectorAll('.nav[data-tab="research"]').forEach(b=>b.addEventListener('click',()=>{if(!loaded)refresh();else render()}));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('research')&&!$('research').hidden&&loaded)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
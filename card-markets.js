/* Tradr151 cross-market sector research: source-labelled market sizes and documented record sales.
   No estimated market cap is shown where circulating quantities cannot be verified. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let snapshot=null, marketFilter='all', salesFilter='all';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const dollars=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const shortMoney=n=>{
 if(n===null||n===undefined||!Number.isFinite(Number(n)))return '—';
 const abs=Math.abs(n);
 if(abs>=1e12)return '$'+(n/1e12).toFixed(2)+'T';
 if(abs>=1e9)return '$'+(n/1e9).toFixed(2)+'B';
 if(abs>=1e6)return '$'+(n/1e6).toFixed(2)+'M';
 return dollars(n);
};
const dateLabel=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{year:'numeric',month:'short',timeZone:'UTC'}):'—';
function renderCaps(){
 const host=$('marketCapStrip');if(!host||!snapshot)return;
 const primary=['pokemon','bitcoin','sp500'].map(key=>snapshot.markets.find(m=>m.id===key)).filter(Boolean);
 host.innerHTML=primary.map(m=>
  '<a class="market-cap-item" href="'+escape(m.source)+'" target="_blank" rel="noopener noreferrer" title="'+escape(m.coverage)+'">'+
  '<span class="market-cap-label">'+escape(m.name)+'</span><b>'+shortMoney(m.cap_usd)+'</b><small>'+escape(m.id==='pokemon'?'Graded only':m.id==='bitcoin'?'Circulating cap':'Company cap')+'</small></a>'
 ).join('');
}
function renderOthers(){
 const host=$('marketExtraRows');if(!host||!snapshot)return;
 const extras=snapshot.markets.filter(m=>['tcg','sports'].includes(m.sector)&&m.id!=='pokemon'&&(marketFilter==='all'||marketFilter===m.sector));
 host.innerHTML=extras.map(m=>
  '<div class="market-extra-row"><div class="market-extra-identity"><b>'+escape(m.name)+'</b><small>'+escape(m.cap_label)+'</small></div>'+
  '<div class="market-extra-value"><strong>'+shortMoney(m.cap_usd)+'</strong><a href="'+escape(m.source)+'" target="_blank" rel="noopener noreferrer" aria-label="Source for '+escape(m.name)+'">Source ↗</a></div></div>'
 ).join('')+'<p class="market-extra-caption">Values shown only where a source-based graded market estimate is available. “—” means no comparable estimate has been verified.</p>';
 document.querySelectorAll('[data-extra-market]').forEach(b=>{
  const selected=b.dataset.extraMarket===marketFilter;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
 });
}
function renderRecords(){
 const host=$('recordSalesList');if(!host||!snapshot)return;
 const matches=[...snapshot.sales].filter(s=>
   salesFilter==='all'||salesFilter==='sports'&&s.category==='sports'||salesFilter==='pokemon'&&s.category==='pokemon'||salesFilter==='tcg'&&!['sports','pokemon'].includes(s.category)
 ).sort((a,b)=>b.price_usd-a.price_usd);
 host.innerHTML=matches.map((item,i)=>{
  const group=item.category==='sports'?'Sports':item.category==='pokemon'?'Pokémon':item.category==='magic'?'Magic':item.category==='onepiece'?'One Piece':'Yu-Gi-Oh!';
  return '<a class="record-entry" href="'+escape(item.source)+'" target="_blank" rel="noopener noreferrer">'+
   '<span class="record-rank">'+(i+1)+'</span>'+
   '<span class="record-card"><b>'+escape(item.name)+'</b><small>'+escape(group)+' · '+escape(item.detail)+'</small><span>'+escape(item.venue)+' · '+dateLabel(item.date)+' · '+escape(item.verification)+'</span></span>'+
   '<span class="record-price">'+shortMoney(item.price_usd)+'<small>USD ↗</small></span></a>';
 }).join('');
 document.querySelectorAll('[data-record-filter]').forEach(b=>{
  const selected=b.dataset.recordFilter===salesFilter;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
 });
}
async function init(){
 document.querySelectorAll('[data-extra-market]').forEach(b=>b.addEventListener('click',()=>{marketFilter=b.dataset.extraMarket;renderOthers();}));
 document.querySelectorAll('[data-record-filter]').forEach(b=>b.addEventListener('click',()=>{salesFilter=b.dataset.recordFilter;renderRecords();}));
 try{
  const r=await fetch('data/card-market-sectors.json',{cache:'no-cache'});
  if(!r.ok)throw Error('Unable to load sector data');
  const d=await r.json();
  if(!Array.isArray(d.markets)||!Array.isArray(d.sales))throw Error('Invalid sector dataset');
  snapshot=d;renderCaps();renderOthers();renderRecords();
 }catch(e){
  if($('marketCapStrip'))$('marketCapStrip').textContent='Market-size figures unavailable';
  if($('recordSalesList'))$('recordSalesList').textContent='Record sales temporarily unavailable.';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
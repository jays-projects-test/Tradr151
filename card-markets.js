/* Tradr151 market overview. Internal data holds provenance; no outbound source buttons in the UI.
   Market cap and annual trading revenue are labelled distinctly. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const abbreviate=n=>{
  if(n===null||n===undefined||!Number.isFinite(+n))return '—';
  return '$'+(n>=1e12?(n/1e12).toFixed(2)+'T':n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':Math.round(n).toLocaleString('en-US'));
 };
 let data=null,marketFilter='all',salesFilter='all',marketDays=30;
 let financial=null;
 const marketName=id=>({pokemon:'Pokémon',bitcoin:'Bitcoin',sp500:'S&P 500',onepiece:'One Piece',magic:'Magic',yugioh:'Yu-Gi-Oh!',dragonball:'Dragon Ball',lorcana:'Disney Lorcana',weiss:'Weiss Schwarz',digimon:'Digimon',sports:'Sports cards'})[id]||id;
 const marketIcon=id=>({pokemon:'T',bitcoin:'₿',sp500:'S',onepiece:'OP',magic:'M',yugioh:'Y',dragonball:'DB',lorcana:'L',weiss:'W',digimon:'D',sports:'★'})[id]||'•';
 const pct=n=>n===null||n===undefined?'—':(n>0?'+':'')+Number(n).toFixed(1)+'%';
 const pctClass=n=>n===null||n===undefined?'flat':n<0?'negative':'positive';
 const row=(m,index,includeRank=true)=>{
   const amount=m.method==='annual'?m.annual_market_usd:m.cap_usd;
   const kind=m.method==='annual'?'Annual market (not cap)':m.method==='graded'?'Graded market cap':m.id==='bitcoin'?'Circulating cap':'Company market cap';
   const live=financial?.assets?.[m.id];
   const liveFresh=live&&live.as_of&&Date.now()-Date.parse(live.as_of+'T23:59:59Z')<5*86400000;
   const currentChange=live?.['change_'+marketDays+'d'];
   const change=m.method==='annual'?null:liveFresh&&Number.isFinite(currentChange)?currentChange:m.id==='bitcoin'||m.id==='sp500'?null:marketDays===30?m.change_30d:null;
   const shownAmount=liveFresh&&m.id==='bitcoin'&&Number.isFinite(live.market_cap_usd)?live.market_cap_usd:amount;
   const amountText=m.id==='bitcoin'&&!liveFresh?'—':abbreviate(shownAmount);
   const capNote=(m.id==='bitcoin'&&(!liveFresh||!Number.isFinite(live?.market_cap_usd)))?'Price feed only':kind;
   const detail=m.id==='sp500'&&liveFresh?'Index return • cap estimate':m.id==='bitcoin'&&liveFresh?'BTC · '+live.as_of:capNote;
   return '<div class="market-rank-row" title="'+esc(m.coverage||kind)+'">'+
    '<span class="market-rank-cell">'+(includeRank?index:'')+'</span>'+
    '<div class="market-rank-name"><span class="market-rank-icon market-icon-'+esc(m.id)+'">'+marketIcon(m.id)+'</span>'+
    '<div><b>'+esc(marketName(m.id))+'</b><small>'+esc(detail)+'</small></div></div>'+
    '<strong class="market-rank-cap">'+amountText+'</strong>'+
    '<span class="market-rank-change '+pctClass(change)+'">'+pct(change)+'</span></div>';
 };
 function primary(){
   if(!data)return;
   const host=$('marketCapStrip');if(!host)return;
   const ids=['pokemon','bitcoin','sp500'];
   host.innerHTML=ids.map((id,i)=>data.markets.find(m=>m.id===id)).filter(Boolean).map((m,i)=>row(m,i+1)).join('');
 }
 function extra(){
   if(!data)return;
   const host=$('marketExtraRows');if(!host)return;
   let rows=data.markets.filter(m=>['tcg','sports'].includes(m.sector)&&m.id!=='pokemon');
   if(marketFilter!=='all')rows=rows.filter(m=>m.sector===marketFilter);
   rows.sort((a,b)=>(b.cap_usd||b.annual_market_usd||0)-(a.cap_usd||a.annual_market_usd||0));
   host.innerHTML=rows.length?rows.map((m,i)=>row(m,i+1)).join(''):'<div class="market-rank-empty">No markets recorded.</div>';
   document.querySelectorAll('[data-extra-market]').forEach(b=>{
    const active=b.dataset.extraMarket===marketFilter;
    b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));
   });
 }
 function records(){
   if(!data)return;
   const host=$('recordSalesList');if(!host)return;
   const entries=[...data.sales].filter(s=>salesFilter==='all'||salesFilter==='sports'&&s.category==='sports'||salesFilter==='pokemon'&&s.category==='pokemon'||salesFilter==='tcg'&&!['pokemon','sports'].includes(s.category)).sort((a,b)=>b.price_usd-a.price_usd);
   host.innerHTML=entries.map((item,i)=>{
    const category=item.category==='sports'?'Sports':item.category==='pokemon'?'Pokémon':marketName(item.category);
    const month=item.date?new Date(item.date+'T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}):'';
    return '<div class="record-entry"><span class="record-rank">'+(i+1)+'</span><span class="record-card"><b>'+esc(item.name)+'</b><small>'+esc(category)+' · '+esc(item.detail)+'</small><span>'+esc(item.venue)+' · '+month+' · '+esc(item.verification)+'</span></span><span class="record-price">'+abbreviate(item.price_usd)+'</span></div>';
   }).join('');
   document.querySelectorAll('[data-record-filter]').forEach(b=>{
    const active=b.dataset.recordFilter===salesFilter;
    b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));
   });
 }
 async function init(){
   document.querySelectorAll('[data-market-days]').forEach(b=>b.addEventListener('click',()=>{
    marketDays=Number(b.dataset.marketDays)===7?7:30;
    document.querySelectorAll('[data-market-days]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.marketDays)===marketDays));
    const heading=$('marketChangeColumn');if(heading)heading.textContent=marketDays+'D';
    primary();extra();
   }));
   document.querySelectorAll('[data-extra-market]').forEach(b=>b.addEventListener('click',()=>{marketFilter=b.dataset.extraMarket;extra()}));
   document.querySelectorAll('[data-record-filter]').forEach(b=>b.addEventListener('click',()=>{salesFilter=b.dataset.recordFilter;records()}));
   try{
    const response=await fetch('data/card-market-sectors.json',{cache:'no-cache'});
    if(!response.ok)throw Error('Feed unavailable');
    const loaded=await response.json();
    if(!Array.isArray(loaded.markets)||!Array.isArray(loaded.sales))throw Error('Invalid market data');
    data=loaded;primary();extra();records();
    try{
     const feedResponse=await fetch('data/financial-markets.json?t='+Math.floor(Date.now()/3600000),{cache:'no-cache'});
     if(feedResponse.ok){
      const nextFeed=await feedResponse.json();
      if(nextFeed&&nextFeed.assets){
       financial=nextFeed;
       primary();
      }
     }
    }catch(e){/* Keep the market table available if the live financial feed is offline. */}
   }catch(error){
    if($('marketCapStrip'))$('marketCapStrip').textContent='Market overview temporarily unavailable';
    if($('recordSalesList'))$('recordSalesList').textContent='Records temporarily unavailable';
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
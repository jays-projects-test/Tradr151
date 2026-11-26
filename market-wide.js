// Tradr151 independent market-wide guide-price dashboard.
// Market guides are NOT verified sold prices; GBP converts USD, not a UK market feed.
(()=>{'use strict';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const DAY=86400000;
let board=null,universe=null,period='week',currency=localStorage.getItem('tradr151_currency')==='GBP'?'GBP':'USD',usdGbp=null,activeCard=null,activeVariant=null,modalNonce=0;
const money=n=>{
 if(!Number.isFinite(Number(n))||n===null)return '—';
 if(currency==='GBP'&&!(usdGbp>0))return 'FX unavailable';
 const amount=currency==='GBP'?Number(n)*usdGbp:Number(n);
 return new Intl.NumberFormat('en-GB',{style:'currency',currency,maximumFractionDigits:2}).format(amount);
};
const number=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-GB').format(Number(n)):'—';
const pct=n=>Number.isFinite(n)?(n>=0?'+':'')+n.toFixed(1)+'%':'—';
const median=a=>{if(!a.length)return null;let vals=[...a].sort((a,b)=>a-b);const i=Math.floor(vals.length/2);return vals.length%2?vals[i]:(vals[i-1]+vals[i])/2};
const between=(x,a,b)=>Math.max(a,Math.min(b,x));
function set(id,t){if(el(id))el(id).textContent=t;}
function summary(){
 const coverage=board?.coverage||{},week=board?.week||{},month=board?.month||{};
 set('universeCards',coverage.products_priced?number(coverage.products_priced):'—');
 set('gaugeTracked',coverage.products_priced?number(coverage.products_priced):'—');
 set('universeCoverage',(coverage.groups_visited||0)+' of '+(coverage.groups_total||'—')+' sets');
 set('universeWeek',week.qualified>=30?pct(week.median_change):'—');
 set('universeMonth',month.qualified>=30?pct(month.median_change):'—');
 set('gauge7d',week.qualified>=30?pct(week.median_change):'—');
 set('gauge30d',month.qualified>=30?pct(month.median_change):'—');
 if(coverage.products_priced>0){
   set('marketAssets',number(coverage.products_priced));
   set('marketAssetsMeta','Cards being tracked');
 }
 const sourceTime=board?.updated_at?new Date(board.updated_at):null;
 set('universeFreshness',sourceTime?sourceTime.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+(Date.now()-sourceTime.getTime()>36*3600000?' · delayed':''):'Pending');
 set('gaugeFresh',sourceTime?'Daily':'Pending');
 set('gaugeFreshSub',sourceTime?'Updated '+sourceTime.toLocaleDateString('en-GB'):'Waiting for first update');
 // Data-derived market breadth and momentum proxy. Avoid invented volume or global cap.
 const representative=week.qualified>=250 && (coverage.groups_visited||0)>=Math.ceil((coverage.groups_total||221)*0.75)
   && Number.isFinite(week.breadth)&&Number.isFinite(week.median_change);
 let score=null;
 if(representative){
   const momentum=between(50+week.median_change*3,0,100);
   score=Math.round(momentum*0.55+week.breadth*0.45);
 }
 set('gaugeValue',score===null?'—':score);
 set('gaugeLabel',score===null?'Building the market index':score<20?'Extreme Fear':score<40?'Fear':score<60?'Neutral':score<80?'Greed':'Extreme Greed');
 const marker=el('gaugeMarker');
 if(marker){
   const valid=Number.isFinite(score);
   marker.setAttribute('visibility',valid?'visible':'hidden');
   if(valid){
     const radians=Math.PI*between(score,0,100)/100;
     marker.setAttribute('cx',(120-95*Math.cos(radians)).toFixed(2));
     marker.setAttribute('cy',(114-95*Math.sin(radians)).toFixed(2));
     marker.setAttribute('aria-label',String(score)+' out of 100');
   }
 }
 // "Fear & Greed" is a guide-price sentiment proxy only. Never overwrite verified-sale metrics.
 set('marketSentiment',score===null?'—':score+'/100');
 set('marketMood',score===null?'Calculating trend':'Market trend · '+week.qualified+' cards');
}
function row(r,{rank=null}={}){
 const image=typeof r.image==='string'&&r.image.startsWith('https://')?'<img src="'+esc(r.image)+'" alt="" loading="lazy">':'<span class="noCardImage"></span>';
 const change=Number.isFinite(r.change)?'<strong class="'+(r.change>=0?'rise':'fall')+'">'+pct(r.change)+'</strong>':'<strong>'+money(r.usd)+'</strong>';
 const extra=Number.isFinite(r.change)?'<small>'+money(r.usd)+'</small>':'<small>'+esc(r.variant||'')+'</small>';
 return '<button type="button" class="wideRow marketProductRow" data-market-product="'+Number(r.id)+'" data-market-variant="'+esc(r.variant||'')+'"><span class="wideAsset">'+(rank!==null?'<small class="rank">'+rank+'</small>':'')+image+'<span><b>'+esc(r.name)+'</b><small>'+esc(r.set)+' · '+esc(r.variant||'')+'</small></span></span><span class="widePrice">'+change+extra+'</span></button>';
}
function renderBoard(){
 summary();
 const details=board?.[period]||{};
 function list(id,items){
   const host=el(id);if(!host)return;
   host.innerHTML=items?.length?items.slice(0,5).map(r=>row(r)).join(''):
     '<div class="board-empty">'+(period==='week'?'7-day':'30-day')+' rankings will appear when enough prices are available.</div>';
 }
 list('universeGainers',details.gainers);
 list('universeLosers',details.losers);
 const leaders=el('universeLeaders');
 if(leaders)leaders.innerHTML=(board?.leaders||[]).length?board.leaders.slice(0,8).map((r,i)=>row(r,{rank:i+1})).join(''):
 '<div class="board-empty">Awaiting current market-guide prices.</div>';
 document.querySelectorAll('[data-currency]').forEach(b=>b.classList.toggle('selected',b.dataset.currency===currency));
 document.querySelectorAll('[data-wide-period]').forEach(b=>b.classList.toggle('selected',b.dataset.widePeriod===period));
}
async function loadBoard(){
 try{
   const r=await fetch('data/market-board.json?t='+Math.floor(Date.now()/3600000),{cache:'no-cache'});
   if(!r.ok)throw Error('HTTP '+r.status);board=await r.json();
 }catch(e){console.warn('Market-wide feed unavailable:',e.message);}
 renderBoard();
 if(activeCard)drawDetail();
}
async function loadFX(){
 try{
   const r=await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP',{cache:'no-cache'});
   if(!r.ok)throw Error('FX HTTP '+r.status);
   const p=await r.json();usdGbp=Number(p.rates?.GBP);
   if(!(usdGbp>0))throw Error('Invalid FX response');
 }catch(e){console.warn('FX unavailable',e.message);usdGbp=null;}
 if(currency==='GBP'&&!(usdGbp>0))currency='USD';
 renderBoard();if(activeCard)drawDetail();
}
async function loadUniverse(){
 if(universe)return universe;
 const r=await fetch('data/market-universe.json?t='+Math.floor(Date.now()/3600000),{cache:'force-cache'});
 if(!r.ok)throw Error('Historical market data unavailable, HTTP '+r.status);
 const data=await r.json();
 if(!data?.products || !data?.observations)throw Error('Invalid market universe');
 universe=data;return universe;
}
function productVariants(id){
 const prefix=String(id)+':',result=[];
 for(const [key,points] of Object.entries(universe?.observations||{}))
   if(key.startsWith(prefix)&&points.length)result.push({name:key.slice(prefix.length),points});
 return result.sort((a,b)=>b.points.at(-1)[0].localeCompare(a.points.at(-1)[0]));
}
function itemHistory(points,days){
 if(!points?.length)return null;
 const sorted=[...points].sort((a,b)=>a[0].localeCompare(b[0]));
 const current=sorted.at(-1),date=new Date(current[0]+'T12:00:00Z').getTime();
 const anchor=new Date(date-days*DAY).toISOString().slice(0,10);
 const earlier=sorted.filter(p=>p[0]<=anchor).at(-1);
 return earlier&&earlier[1]>0?100*(current[1]/earlier[1]-1):null;
}
function chart(points){
 if(!points?.length)return '<div class="card-no-history">No historical snapshots yet</div>';
 if(points.length===1)return '<div class="card-no-history">First market snapshot recorded '+esc(points[0][0])+'. Price movement charts need additional days.</div>';
 const vals=points.map(p=>Number(p[1])).filter(Number.isFinite);
 if(vals.length<2)return '';
 const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
 const coords=vals.map((v,i)=>[18+i*(672/(vals.length-1)),145-(v-min)/span*114]);
 const line=coords.map(p=>p.join(',')).join(' ');
 return '<svg class="marketLineChart" viewBox="0 0 710 175" role="img" aria-label="Historical market guide price chart"><line x1="15" x2="695" y1="145" y2="145" stroke="#2c3d4e"/><polyline points="'+line+'" stroke="#3bb8fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><text x="18" y="164" fill="#8ba4b5" font-size="11">'+esc(points[0][0])+'</text><text x="692" y="164" text-anchor="end" fill="#8ba4b5" font-size="11">'+esc(points.at(-1)[0])+'</text></svg>';
}
async function fetchProviderMetrics(productId,variant){
 const conf=window.TradrMarketConfig?.();
 if(!conf?.url||!conf?.key)return null;
 const query=(table,fields,order)=>{
   const url=conf.url+'/rest/v1/'+table+'?product_id=eq.'+productId+'&variant=eq.'+encodeURIComponent(variant)+'&select='+fields+'&order='+order+'&limit=100';
   return fetch(url,{headers:{apikey:conf.key,Accept:'application/json'}}).then(async r=>{
     if(!r.ok)throw Error(table+' HTTP '+r.status);return r.json();
   });
 };
 try{
   const [listings,sales]=await Promise.all([
     query('market_listings','price,currency,grade,region,observed_at','observed_at.desc'),
     query('market_sold_transactions','sold_price,currency,grade,region,sold_at','sold_at.desc')
   ]);
   return {listings,sales};
 }catch(e){console.info('Verified sales/listings feed not yet available',e.message);return null;}
}
function convertedProviderAmount(value,from){
 if(from===currency)return +value;
 if(from==='USD'&&currency==='GBP'&&usdGbp>0)return +value*usdGbp;
 if(from==='GBP'&&currency==='USD'&&usdGbp>0)return +value/usdGbp;
 return null;
}
function panelMetrics(metrics){
 const listings=(metrics?.listings||[]).filter(x=>x.grade==='raw'&&x.region==='US').map(x=>convertedProviderAmount(x.price,x.currency)).filter(Number.isFinite);
 const sales=(metrics?.sales||[]).filter(x=>x.grade==='raw'&&x.region==='US').map(x=>convertedProviderAmount(x.sold_price,x.currency)).filter(Number.isFinite);
 const psa=(metrics?.sales||[]).filter(x=>String(x.grade||'').toLowerCase().replace(/[\s_-]/g,'')==='psa10'&&x.region==='US').map(x=>convertedProviderAmount(x.sold_price,x.currency)).filter(Number.isFinite);
 const latest=(metrics?.sales||[]).filter(x=>x.grade==='raw'&&x.region==='US').sort((a,b)=>b.sold_at.localeCompare(a.sold_at))[0];
 const fmtAmt=n=>n===null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency,maximumFractionDigits:2}).format(n);
 return {listingAvg:listings.length?fmtAmt(listings.reduce((a,b)=>a+b,0)/listings.length):'—',
 soldAvg:sales.length?fmtAmt(sales.reduce((a,b)=>a+b,0)/sales.length):'—',
 psaAvg:psa.length?fmtAmt(psa.reduce((a,b)=>a+b,0)/psa.length):'—',
 last:latest?fmtAmt(convertedProviderAmount(latest.sold_price,latest.currency)):'—',
 saleCount:sales.length,
 listingCount:listings.length};
}
let verifiedData=new Map();
function drawDetail(){
 const host=el('marketCardBody');if(!host||!activeCard||!universe)return;
 const product=universe.products[activeCard];
 if(!product){host.textContent='Market card is no longer available';return;}
 const variants=productVariants(activeCard);
 const selected=variants.find(v=>v.name===activeVariant)||variants[0];
 if(!selected){host.textContent='No price history for this printing';return;}
 activeVariant=selected.name;
 const points=selected.points;
 const snapshot=points.at(-1),price=Number(snapshot[1]);
 const listingMid=Number(snapshot[2]),listingLow=Number(snapshot[3]);
 const w7=itemHistory(points,7),w30=itemHistory(points,30);
 const verified=panelMetrics(verifiedData.get(activeCard+':'+activeVariant));
 const metrics=(label,value,note)=>'<div class="cardMetric"><small>'+label+'</small><strong>'+value+'</strong><span>'+note+'</span></div>';
 const image=product.img?.startsWith('https://')?'<img src="'+esc(product.img)+'" alt="'+esc(product.name)+'" class="cardHeroImage">':'';
 const variantSelect='<select id="marketCardVariant" aria-label="Printing or finish">'+variants.map(v=>'<option value="'+esc(v.name)+'"'+(v.name===activeVariant?' selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select>';
 const priceCompare=Number.isFinite(listingMid)&&listingMid>0?((listingMid-price)/listingMid*100):null;
 const verifiedEvidence=verified.saleCount>=8&&verified.listingCount>=3&&w7!==null&&w30!==null;
 const historicalEvidence=points.length>=3&&w7!==null&&w30!==null;
 const signal=verifiedEvidence?(w7<=-12&&w30<0?'BUY / REVIEW':w7>=18&&w30>5?'SELL / REVIEW':'HOLD / REVIEW')
   :historicalEvidence?(w7<=-12?'WATCH — PRICE DROP':w7>=18?'WATCH — PRICE SURGE':'HOLD / MONITOR'):'INSUFFICIENT DATA';
 const signalExplanation=verifiedEvidence?'Preliminary rating using verified transaction coverage and price momentum. Confirm condition, fees and liquidity.':historicalEvidence?'Price-trend screening only. No confirmed sales support for a buy or sell signal.':'Insufficient historical and verified sales data for a reliable buy, hold or sell opinion.';
 host.innerHTML='<div class="cardHero">'+image+'<div><span class="market-kicker">'+esc(product.set)+'</span><h2>'+esc(product.name)+'</h2><p class="muted">'+esc(product.number||'Card number unverified')+' · '+esc(product.rarity||'Rarity unspecified')+'</p><div class="cardPicker">'+variantSelect+'</div><strong class="cardHeroPrice">'+money(price)+'</strong><small>US market guide · '+esc(snapshot[0])+'</small></div></div>'+
 '<div class="card-metric-grid">'+
 metrics('Market price guide',money(price),'US guide estimate · not a last sale')+
 metrics('Median listing guide',Number.isFinite(listingMid)&&listingMid>0?money(listingMid):'—','US listing median, not mean')+
 metrics('Lowest listed guide',Number.isFinite(listingLow)&&listingLow>0?money(listingLow):'—','US lowest asking guide, excluding shipping')+
 metrics('Average active listing',verified.listingAvg,'Verified live listings: '+verified.listingCount)+
 metrics('Average sold price',verified.soldAvg,'Verified raw sales: '+verified.saleCount)+
 metrics('PSA 10 average sold',verified.psaAvg,'Verified PSA 10 transactions only')+
 metrics('Last verified sold',verified.last,'Actual recorded transaction required')+
 metrics('7D / 30D change',(w7===null?'—':pct(w7))+' / '+(w30===null?'—':pct(w30)),'Observed daily guide history')+
 '</div><div class="signal-card"><div><span class="market-kicker">TRADR RESEARCH SIGNAL</span><h3>'+signal+'</h3><p>'+signalExplanation+'</p></div><span class="signalChip">'+(verifiedEvidence?'Preliminary':historicalEvidence?'Guide only':'Not rated')+'</span></div>'+
 '<div class="card-chart-title"><b>Market price history</b><small>Daily US market guide</small></div>'+chart(points)+
 '<div class="card-bottom-controls"><button type="button" class="primary" id="marketAddPortfolio">Add to portfolio</button><button type="button" class="secondary" id="marketAddWatchlist">Add to watchlist</button></div>'+
 '<p class="detailFootnote">GBP values convert US market figures. UK sale prices and PSA 10 averages appear only when verified matching records are available.</p>';
 const sel=el('marketCardVariant');sel?.addEventListener('change',()=>{
   activeVariant=sel.value;drawDetail();loadSpecificMetrics();
 });
 el('marketAddPortfolio')?.addEventListener('click',()=>saveCard('portfolio'));
 el('marketAddWatchlist')?.addEventListener('click',()=>saveCard('watchlist'));
}
function saveCard(kind){
 const bridge=window.TradrBridge;
 if(!bridge?.getWorkspace){alert('Portfolio is still initializing. Try again.');return;}
 const product=universe?.products[activeCard];if(!product)return;
 const w=bridge.getWorkspace();
 const id='tcgplayer-'+activeCard,key='en:'+id;
 w.cards[key]={id,language:'en',name:product.name,setName:product.set,localId:product.number||'—',image:product.img,provider:'TCGCSV',tcgplayerId:activeCard};
 if(kind==='portfolio')w.portfolio[key]=w.portfolio[key]||{quantity:1,cost:0};
 else if(!w.watchlist.includes(key))w.watchlist.push(key);
 bridge.save();
 const button=el(kind==='portfolio'?'marketAddPortfolio':'marketAddWatchlist');
 if(button)button.textContent=kind==='portfolio'?'Added to portfolio ✓':'Added to watchlist ✓';
}
async function loadSpecificMetrics(){
 const id=activeCard,variant=activeVariant,nonce=modalNonce;
 const result=await fetchProviderMetrics(id,variant);
 if(nonce!==modalNonce||activeCard!==id||activeVariant!==variant)return;
 if(result)verifiedData.set(id+':'+variant,result);
 drawDetail();
}
async function openCard(id,variant){
 const dialog=el('marketCardDialog');if(!dialog)return;
 modalNonce++;activeCard=Number(id);activeVariant=variant||null;
 el('marketCardBody').innerHTML='<p class="muted">Loading card valuation and provider data…</p>';
 if(!dialog.open)dialog.showModal();
 try{
   await loadUniverse();
   if(!universe.products[activeCard])throw Error('Card does not exist in current market feed');
   drawDetail();loadSpecificMetrics();
 }catch(e){el('marketCardBody').textContent='Unable to load card: '+e.message;}
}
async function searchProducts(){
 const text=el('marketProductSearch')?.value.trim().toLowerCase()||'';
 const host=el('marketProductSearchResults');if(!host)return;
 if(text.length<2){host.textContent='Enter at least two characters.';return;}
 host.innerHTML='<span class="muted small">Searching market catalogue…</span>';
 try{
   await loadUniverse();
   const matches=Object.values(universe.products).filter(p=>(p.name+' '+p.set+' '+(p.number||'')).toLowerCase().includes(text)).slice(0,30);
   host.innerHTML=matches.length?matches.map(p=>'<button type="button" class="marketResult" data-market-product="'+Number(p.id)+'"><strong>'+esc(p.name)+'</strong><small>'+esc(p.set)+' · '+esc(p.number||'')+'</small></button>').join(''):
   '<span class="muted small">No matching cards found. Try a different name or set.</span>';
 }catch(e){host.textContent='Market search unavailable: '+e.message;}
}
function init(){
 document.querySelectorAll('[data-wide-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.widePeriod;renderBoard()}));
 document.querySelectorAll('[data-currency]').forEach(b=>b.addEventListener('click',()=>{
   if(b.dataset.currency==='GBP'&&!(usdGbp>0)){alert('GBP exchange rate is unavailable. Please try again when FX returns.');return;}
   currency=b.dataset.currency;localStorage.setItem('tradr151_currency',currency);renderBoard();if(activeCard)drawDetail();
 }));
 el('marketProductSearchButton')?.addEventListener('click',searchProducts);
 el('marketProductSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchProducts()});
 document.addEventListener('click',e=>{
   const item=e.target.closest('[data-market-product]');
   if(item){openCard(item.dataset.marketProduct,item.dataset.marketVariant);return;}
 });
 el('closeMarketCard')?.addEventListener('click',()=>el('marketCardDialog')?.close());
 el('marketCardDialog')?.addEventListener('close',()=>{activeCard=null;activeVariant=null;modalNonce++});
 loadBoard();loadFX();
 // The dashboard checks new published data hourly. Upstream TCGCSV only refreshes daily.
 setInterval(()=>{loadBoard();loadFX()},3600000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadBoard()});
}
window.TradrMarket={openCard};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
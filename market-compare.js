/* Tradr151 historical asset comparison.
   The reference dataset is rebased to 100 at the common start date.
   Chart drawn only from actual historical observations. No invented intermediate prices.
*/
(()=>{
 'use strict';
 const assets=[
  {key:'pokemon',name:'Pokémon',detail:'100-card index',value:149.7,symbol:'T',colour:'#42b7ff'},
  {key:'bitcoin',name:'Bitcoin',detail:'BTC',value:91.6,symbol:'₿',colour:'#e7a24b'},
  {key:'sp500',name:'S&P 500',detail:'Stock index',value:81.3,symbol:'S',colour:'#a0b2cf'}
 ];
 const $=id=>document.getElementById(id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let history=null,loadPromise=null;
 function renderTiles(){
  const target=$('benchmarkTiles');if(!target)return;
  const maximum=Math.max(...assets.map(a=>a.value));
  target.innerHTML=assets.map(a=>{
   const width=(a.value/maximum*100).toFixed(1);
   return '<button type="button" class="benchmarkTile benchmark-'+a.key+'" data-benchmark-asset="'+a.key+'" aria-label="View '+a.name+' historical performance chart">'+
    '<div class="benchmarkName"><span class="benchmarkSymbol">'+a.symbol+'</span><span><b>'+a.name+'</b><small>'+a.detail+'</small></span></div>'+
    '<strong class="benchmarkPositive">+'+a.value.toFixed(1)+'%</strong>'+
    '<div class="benchmarkMiniTrack"><span style="width:'+width+'%"></span></div></button>';
  }).join('');
 }
 async function loadHistory(){
  if(history)return history;
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
   try{
    const r=await fetch('data/market-benchmarks.json?t='+Math.floor(Date.now()/3600000),{cache:'no-cache'});
    if(!r.ok)return null;
    const d=await r.json();
    if(!d?.series||!d?.source||!['pokemon','bitcoin','sp500'].every(k=>Array.isArray(d.series[k])))return null;
    history=d;return d;
   }catch(e){return null}
  })();
  return loadPromise;
 }
 const formatDate=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
 function drawChart(asset,data){
  const host=$('benchmarkChartHost');
  if(!host)return;
  const original=data?.series?.[asset.key];
  const points=Array.isArray(original)?original.filter(x=>Array.isArray(x)&&/^\d{4}-\d{2}-\d{2}$/.test(x[0])&&Number.isFinite(Number(x[1]))&&Number(x[1])>0).map(x=>[x[0],Number(x[1])]).sort((a,b)=>a[0].localeCompare(b[0])):[];
  if(points.length<8){
   host.innerHTML='<div class="benchmark-chart-unavailable"><div class="benchmark-two-observations"><span>Sep 2021 <b>100</b></span><span>Latest reported <b>'+(100+asset.value).toFixed(1)+'</b></span></div><p>Detailed historical chart is not available yet. The summary shows the published start and end values; intermediate prices are not estimated.</p></div>';
   $('benchmarkChartFoot').textContent='Historical comparison · Sep 2021–2026';
   return;
  }
  const width=680,height=280,margin={left:45,right:15,top:23,bottom:37};
  const values=points.map(p=>p[1]);
  let low=Math.min(...values),high=Math.max(...values);
  const pad=(high-low||1)*.12;low=Math.max(0,low-pad);high+=pad;
  const date0=Date.parse(points[0][0]),date1=Date.parse(points.at(-1)[0]);
  const x=day=>margin.left+(Date.parse(day)-date0)/Math.max(1,date1-date0)*(width-margin.left-margin.right);
  const y=v=>margin.top+(high-v)/(high-low)*(height-margin.top-margin.bottom);
  const coordinates=points.map(p=>[x(p[0]),y(p[1])]);
  const lines=coordinates.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
  const area=lines+'L '+coordinates.at(-1)[0].toFixed(2)+' '+(height-margin.bottom)+' L '+coordinates[0][0].toFixed(2)+' '+(height-margin.bottom)+' Z';
  const ticks=[0,.25,.5,.75,1].map(f=>{
   const yy=margin.top+f*(height-margin.top-margin.bottom),value=high-f*(high-low);
   return '<line x1="'+margin.left+'" y1="'+yy.toFixed(1)+'" x2="'+(width-margin.right)+'" y2="'+yy.toFixed(1)+'" stroke="#2a3a4e" stroke-width="1"/>'+
   '<text x="'+(margin.left-8)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end" fill="#8498b0" font-size="11">'+value.toFixed(0)+'</text>';
  }).join('');
  const selected=coordinates.at(-1);
  host.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+escape(asset.name)+' actual historical market index series">'+
   '<defs><linearGradient id="benchmarkAreaGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="'+asset.colour+'" stop-opacity=".25"/><stop offset="100%" stop-color="'+asset.colour+'" stop-opacity="0"/></linearGradient></defs>'+
   ticks+'<path d="'+area+'" fill="url(#benchmarkAreaGradient)"/>'+
   '<path d="'+lines+'" stroke="'+asset.colour+'" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
   '<circle cx="'+selected[0].toFixed(2)+'" cy="'+selected[1].toFixed(2)+'" r="4.5" fill="'+asset.colour+'" stroke="#0c1826" stroke-width="2"/>'+
   '<text x="'+margin.left+'" y="'+(height-9)+'" fill="#9dafc1" font-size="12">'+formatDate(points[0][0])+'</text>'+
   '<text x="'+(width-margin.right)+'" y="'+(height-9)+'" text-anchor="end" fill="#9dafc1" font-size="12">'+formatDate(points.at(-1)[0])+'</text></svg>'+
   '<div class="benchmark-chart-bottom"><span>Index level (start = 100)</span><b>'+points.at(-1)[1].toFixed(1)+'</b></div>';
  $('benchmarkChartFoot').textContent='Recorded observations · '+points.length+' periods · Source: '+(data.source||'Historical benchmark');
 }
 async function openAsset(key){
  const asset=assets.find(a=>a.key===key);if(!asset)return;
  const modal=$('benchmarkChartDialog');if(!modal)return;
  $('benchmarkChartTitle').textContent=asset.name;
  $('benchmarkChartSubtitle').textContent='September 2021 – 2026';
  $('benchmarkChartReturn').textContent='+'+asset.value.toFixed(1)+'%';
  $('benchmarkChartReturn').style.color=asset.colour;
  $('benchmarkChartHost').innerHTML='<div class="benchmark-chart-loading">Loading historical chart…</div>';
  $('benchmarkChartFoot').textContent='Historical performance index';
  if(!modal.open)modal.showModal();
  const data=await loadHistory();
  if(!modal.open)return;
  drawChart(asset,data);
 }
 function init(){
  renderTiles();
  document.addEventListener('click',e=>{
   const tile=e.target.closest('[data-benchmark-asset]');
   if(tile)openAsset(tile.dataset.benchmarkAsset);
  });
  $('benchmarkChartClose')?.addEventListener('click',()=>$('benchmarkChartDialog')?.close());
  $('benchmarkChartDialog')?.addEventListener('click',e=>{if(e.target===$('benchmarkChartDialog'))e.target.close()});
  loadHistory();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
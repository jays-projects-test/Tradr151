/* Published Pokémon vs financial market benchmarks.
   Historical snapshots, not live prices. Sources are linked in the card.
   Long window: CardTrack 100 (18 Nov 2026) with BTC / S&P benchmark series to Oct 2026.
   YTD: August 2026 media snapshot quoting a Pokémon card index.
*/
(()=>{
 'use strict';
 const benchmarks={
   long:{
     range:'September 2021 – November 2026',
     note:'CardTrack 100: 100 valuable raw near-mint Pokémon cards. Stocks and BTC last priced in October 2026. Price returns; S&P excludes dividends.',
     source:'https://cardtrack.com/data/pokemon-vs-assets',
     items:[{key:'pokemon',name:'Pokémon 100',sub:'CardTrack index',return:149.7},
            {key:'sp500',name:'S&P 500',sub:'Stock index',return:81.3},
            {key:'bitcoin',name:'Bitcoin',sub:'BTC',return:91.6}]
   },
   ytd:{
     range:'2026 year-to-date · August 2026 report',
     note:'Approximate figures reported in August 2026 for one Pokémon card index. These are not current year-to-date returns and are not comparable with a broad all-card portfolio.',
     source:'https://finance.yahoo.com/markets/crypto/articles/pok-mon-cards-beat-bitcoin-104220328.html',
     items:[{key:'pokemon',name:'Pokémon cards',sub:'Reported card index',return:28},
            {key:'sp500',name:'S&P 500',sub:'Stock index',return:13},
            {key:'bitcoin',name:'Bitcoin',sub:'BTC',return:-29}]
   }
 };
 const $=id=>document.getElementById(id);
 let period='long';
 const signed=n=>(n>=0?'+':'')+n.toFixed(n%1?1:0)+'%';
 const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
 function render(){
   const data=benchmarks[period],max=Math.max(...data.items.map(x=>Math.abs(x.return)),1);
   $('benchmarkRange').textContent='Historical comparison · '+data.range;
   $('benchmarkTiles').innerHTML=data.items.map(item=>
     '<div class="benchmarkTile benchmark-'+item.key+'"><div class="benchmarkName">'+
      '<span class="benchmarkSymbol">'+(item.key==='pokemon'?'T':item.key==='sp500'?'S':'₿')+'</span>'+
      '<span><b>'+esc(item.name)+'</b><small>'+esc(item.sub)+'</small></span></div>'+
      '<strong class="'+(item.return<0?'benchmarkNegative':'benchmarkPositive')+'">'+signed(item.return)+'</strong></div>'
   ).join('');
   $('benchmarkBars').innerHTML=data.items.map(item=>{
     const magnitude=Math.max(2,Math.abs(item.return)/max*100);
     return '<div class="benchmarkBarRow"><span>'+esc(item.name)+'</span>'+
       '<div class="benchmarkBarTrack"><div class="benchmarkBarFill benchmark-'+item.key+
       (item.return<0?' is-negative':'')+'" style="width:'+magnitude.toFixed(2)+'%"></div></div>'+
       '<b class="'+(item.return<0?'benchmarkNegative':'benchmarkPositive')+'">'+signed(item.return)+'</b></div>';
   }).join('');
   $('benchmarkNote').textContent=data.note;
   $('benchmarkSource').href=data.source;
   document.querySelectorAll('[data-benchmark-period]').forEach(b=>{
      b.classList.toggle('selected',b.dataset.benchmarkPeriod===period);
      b.setAttribute('aria-pressed',String(b.dataset.benchmarkPeriod===period));
   });
 }
 function init(){
   if(!$('benchmarkTiles'))return;
   document.querySelectorAll('[data-benchmark-period]').forEach(b=>b.addEventListener('click',()=>{
     period=b.dataset.benchmarkPeriod==='ytd'?'ytd':'long';render();
   }));
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
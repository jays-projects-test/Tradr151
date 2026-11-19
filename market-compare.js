/* Historical comparative returns, published November 2026.
   Pokémon 100 index: +149.7%, Bitcoin +91.6%, S&P 500 +81.3%.
   Window starts September 2021; benchmark endpoints vary (Oct/Nov 2026).
   Deliberately not described as live market prices. */
(()=>{
 'use strict';
 const results=[
  {key:'pokemon',name:'Pokémon',detail:'100-card index',value:149.7,symbol:'T'},
  {key:'bitcoin',name:'Bitcoin',detail:'BTC',value:91.6,symbol:'₿'},
  {key:'sp500',name:'S&P 500',detail:'Stock index',value:81.3,symbol:'S'}
 ];
 function render(){
  const target=document.getElementById('benchmarkTiles');if(!target)return;
  const maximum=Math.max(...results.map(r=>r.value));
  target.innerHTML=results.map(r=>{
   const width=(r.value/maximum*100).toFixed(1);
   return '<div class="benchmarkTile benchmark-'+r.key+'"><div class="benchmarkName"><span class="benchmarkSymbol">'+r.symbol+'</span>'+
    '<span><b>'+r.name+'</b><small>'+r.detail+'</small></span></div>'+
    '<strong class="benchmarkPositive">+'+r.value.toFixed(1)+'%</strong>'+
    '<div class="benchmarkMiniTrack"><span style="width:'+width+'%"></span></div></div>';
  }).join('');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
 else render();
})();
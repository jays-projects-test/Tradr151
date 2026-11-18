// Market-wide dashboard is independent of personal watchlists/search history.
(()=>{"use strict";
let data=null,period='week';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function percentage(n){return Number.isFinite(n)?(n>=0?'+':'')+n.toFixed(1)+'%':'—';}
function set(id,value){if(el(id))el(id).textContent=value;}
function render(){
  if(!el('universePanel'))return;
  const coverage=data?.coverage||{};
  const count=coverage.products_priced||0;
  set('universeCards',count?new Intl.NumberFormat('en-GB').format(count):'—');
  if(count && el('marketAssets')){
    set('marketAssets',new Intl.NumberFormat('en-GB').format(count));
    set('marketAssetsMeta','Market-wide priced products · guide source');
  }
  set('universeCoverage',(coverage.groups_visited||0)+' / '+(coverage.groups_total||'—')+' sets scanned');
  const weekly=data?.week||{},monthly=data?.month||{};
  set('universeWeek',weekly.qualified>=20?percentage(weekly.median_change):'—');
  set('universeMonth',monthly.qualified>=20?percentage(monthly.median_change):'—');
  set('universeFreshness',data?.updated_at?'Updated '+new Date(data.updated_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Market scan pending');
  let panel=data?.[period]||{};
  function list(id,rows){
    const host=el(id);if(!host)return;
    if(!rows?.length){
      host.innerHTML='<p class="muted small">No '+(period==='week'?'7-day':'30-day')+' comparable movements yet. Automatic market scanning is enabled.</p>';
      return;
    }
    host.innerHTML=rows.slice(0,5).map(r=>{
      const img=(typeof r.image==='string'&&/^https:\/\//.test(r.image))?'<img src="'+esc(r.image)+'" loading="lazy" alt="">':'';
      const cls=r.change<0?'fall':'rise';
      return '<div class="wideRow"><div class="wideAsset">'+img+'<span><b>'+esc(r.name)+'</b><small>'+esc(r.set)+' · '+esc(r.variant)+'</small></span></div><div class="widePrice"><strong class="'+cls+'">'+percentage(r.change)+'</strong><small>$'+Number(r.usd).toFixed(2)+'</small></div></div>';
    }).join('');
  }
  list('universeGainers',panel.gainers);
  list('universeLosers',panel.losers);
  const leaders=el('universeLeaders');
  if(leaders){
    const ranked=(data?.leaders||[]).slice(0,7);
    leaders.replaceChildren();
    for(const [index,card] of ranked.entries()){
      const line=document.createElement('div');
      line.className='wideRow';
      const name=document.createElement('span');
      name.textContent=(index+1)+'. '+card.name+' — '+card.set+' ('+card.variant+')';
      const value=document.createElement('strong');
      value.textContent='$'+Number(card.usd).toFixed(2);
      line.append(name,value);leaders.append(line);
    }
    if(!ranked.length)leaders.textContent='Market leaders appear after the next successful catalogue refresh.';
  }

}
async function update(){
  try{
    const res=await fetch('data/market-board.json?ts='+Math.floor(Date.now()/300000),{cache:'no-cache'});
    if(!res.ok)throw Error('HTTP '+res.status);
    data=await res.json();
  }catch(err){console.warn('Broad market feed:',err.message);}
  render();
}
function init(){
  document.querySelectorAll('[data-wide-period]').forEach(button=>button.addEventListener('click',()=>{
    period=button.dataset.widePeriod;
    document.querySelectorAll('[data-wide-period]').forEach(x=>x.classList.toggle('selected',x===button));
    render();
  }));
  update();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
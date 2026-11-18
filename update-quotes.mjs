// Scheduled, public TCGdex price-guide snapshots. These are marketplace reference quotes,
// not sold transactions and cannot support a 24h trading volume or RSI calculation.
import fs from 'node:fs/promises';
const folder=new URL('../data/',import.meta.url);
const config=JSON.parse(await fs.readFile(new URL('featured-cards.json',folder),'utf8'));
const prev=JSON.parse(await fs.readFile(new URL('quotes.json',folder),'utf8'));
const now=new Date().toISOString();
let cards=[];
for(const id of config.ids.slice(0,40)){
  if(!/^[a-z0-9_-]+$/i.test(id))continue;
  try {
    const res=await fetch(`https://api.tcgdex.net/v2/${config.language||'en'}/cards/${encodeURIComponent(id)}`,{headers:{Accept:'application/json'}});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const card=await res.json();
    const tc=card.pricing?.tcgplayer||{},cm=card.pricing?.cardmarket||{};
    let variants=Object.entries(tc).filter(([variant,values])=>values&&typeof values==='object'&&typeof values.marketPrice==='number').map(([variant,values])=>({variant,guide_usd:values.marketPrice}));
    const euro=typeof cm.avg==='number'?cm.avg:typeof cm.trend==='number'?cm.trend:null;
    cards.push({id,language:config.language||'en',name:card.name,set:card.set?.name||'',image:card.image||null,observed_at:now,tcgplayer_variants:variants,cardmarket_guide_eur:euro});
    console.log(id,card.name,variants.length,'variant(s)');
  } catch(e){ console.error(id,e.message); const old=(prev.cards||[]).find(c=>c.id===id);if(old)cards.push({...old,stale:true}); }
}
if(!cards.length)throw new Error('No cards resolved; preserve previous feed');
await fs.writeFile(new URL('quotes.json',folder),JSON.stringify({updated_at:now,cards},null,2)+'\n');

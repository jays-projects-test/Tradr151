// Public TCGdex guide quotes, not verified sales. Keep old successful data if provider is down.
import fs from 'node:fs/promises';
const folder = new URL('./data/', import.meta.url);
const config = JSON.parse(await fs.readFile(new URL('featured-cards.json', folder), 'utf8'));
const prev = JSON.parse(await fs.readFile(new URL('quotes.json', folder), 'utf8'));
const now = new Date().toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url) {
  for (let attempt=0; attempt<4; attempt++) {
    try {
      const response = await fetch(url, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if (response.ok) return await response.json();
      if (![429,500,502,503,504].includes(response.status) || attempt===3) throw new Error('HTTP '+response.status);
    } catch (error) {
      if (attempt===3) throw error;
    }
    await sleep(900 * (2 ** attempt));
  }
}
const oldById = new Map((prev.cards||[]).map(c=>[c.id,c]));
let cards=[], fresh=0, errors=[];
for (const id of config.ids.slice(0,40)) {
  if (!/^[a-z0-9_-]+$/i.test(id)) continue;
  try {
    const card=await fetchWithRetry(`https://api.tcgdex.net/v2/${encodeURIComponent(config.language||'en')}/cards/${encodeURIComponent(id)}`);
    if (!card?.name) throw new Error('Invalid catalogue response');
    const tc=card.pricing?.tcgplayer||{},cm=card.pricing?.cardmarket||{};
    const variants=Object.entries(tc).filter(([variant,v])=>v && typeof v==='object' && Number.isFinite(v.marketPrice)).map(([variant,v])=>({variant,guide_usd:v.marketPrice}));
    const euro=Number.isFinite(cm.avg)?cm.avg:Number.isFinite(cm.trend)?cm.trend:null;
    cards.push({id,language:config.language||'en',name:card.name,set:card.set?.name||'',image:card.image||null,observed_at:now,tcgplayer_variants:variants,cardmarket_guide_eur:euro});
    fresh++;
    console.log('OK',id,card.name,variants.length,'USD variant(s)');
  } catch(e) {
    errors.push(`${id}: ${e.message}`);
    const old=oldById.get(id);
    if(old) cards.push({...old,stale:true});
    console.warn('STALE',id,e.message);
  }
  await sleep(180);
}
// Do not overwrite the last successful refresh with a fake "updated" timestamp.
if (fresh===0) {
  console.error('TCGdex unavailable: 0 fresh card responses; preserving cached quotes. Errors:',errors.join('; '));
  process.exitCode=1;
} else {
  await fs.writeFile(new URL('quotes.json',folder),JSON.stringify({updated_at:now,cards,successful_cards:fresh,failed_cards:errors.length},null,2)+'\n');
  console.log(`Saved ${fresh} fresh cards; ${errors.length} stale or missing`);
}

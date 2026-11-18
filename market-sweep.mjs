// Tradr151 broad-market guide-price scanner.
// Source: TCGCSV's daily TCGplayer mirrors. Guide prices ≠ independently verified sales.
// Rotates across Pokemon product groups, never re-fetching a group within 24 hours.
import fs from 'node:fs/promises';
const root=new URL('./data/',import.meta.url);
const base='https://tcgcsv.com/tcgplayer/3';
const read=async(name,fallback)=>{try{return JSON.parse(await fs.readFile(new URL(name,root),'utf8'));}catch{return fallback;}};
const write=async(name,obj)=>fs.writeFile(new URL(name,root),JSON.stringify(obj)+'\n');
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const today=new Date().toISOString().slice(0,10);
async function get(endpoint){
  for(let n=0;n<3;n++){
    try{
      const response=await fetch(base+endpoint,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'Tradr151-market-research/0.1'}});
      if(!response.ok)throw Error('HTTP '+response.status+' '+endpoint);
      const body=await response.json();
      if(!Array.isArray(body.results))throw Error('Missing results '+endpoint);
      return body.results;
    }catch(e){if(n===2)throw e;await nap(1200*(n+1));}
  }
}
const state=await read('market-sweep-state.json',{lastFetched:{},lastDay:null});
const db=await read('market-universe.json',{products:{},observations:{}});
const groups=await get('/groups');
const list=groups.filter(g=>Number.isInteger(g.groupId)&&g.name).sort((a,b)=>a.groupId-b.groupId);
const cutoff=Date.now()-24*3600000;
let eligible=list.filter(g=>!state.lastFetched[g.groupId]||Date.parse(state.lastFetched[g.groupId])<cutoff);
eligible.sort((a,b)=>Date.parse(state.lastFetched[a.groupId]||'2000-01-01')-Date.parse(state.lastFetched[b.groupId]||'2000-01-01'));
const selected=eligible.slice(0,72);
let providerUpdatedAt=null;
try{const update=await fetch('https://tcgcsv.com/last-updated.txt',{signal:AbortSignal.timeout(10000)});if(update.ok)providerUpdatedAt=(await update.text()).trim();}catch{}
let completed=0,changed=0,failures=[];
for(const group of selected){
  try{
    const [products,prices]=await Promise.all([get('/'+group.groupId+'/products'),get('/'+group.groupId+'/prices')]);
    const info=new Map();
    for(const p of products){
      if(!Number.isInteger(p.productId)||!p.name)continue;
      const ext=Array.isArray(p.extendedData)?p.extendedData:[];
      const number=ext.find(x=>/number/i.test(x.name||''))?.value||'';
      const rarity=ext.find(x=>/rarity/i.test(x.name||''))?.value||'';
      const product={id:p.productId,name:p.name,set:group.name,number,rarity,group:group.groupId,img:p.imageUrl||null};
      db.products[p.productId]=product;
      info.set(p.productId,product);
    }
    for(const quote of prices){
      const card=info.get(quote.productId);
      if(!card)continue;
      const price=Number(quote.marketPrice);
      if(!Number.isFinite(price)||price<=0)continue;
      const kind=String(quote.subTypeName||'unspecified').slice(0,45);
      const key=card.id+':'+kind;
      let observations=db.observations[key]||[];
      // Date is deliberately daily and comparable by exact product + finish.
      observations=observations.filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&row[0]>=new Date(Date.now()-68*86400000).toISOString().slice(0,10));
      if(observations.at(-1)?.[0]===today)observations[observations.length-1]=[today,price,Number.isFinite(Number(quote.midPrice))?Number(quote.midPrice):null,Number.isFinite(Number(quote.lowPrice))?Number(quote.lowPrice):null];
      else observations.push([today,price,Number.isFinite(Number(quote.midPrice))?Number(quote.midPrice):null,Number.isFinite(Number(quote.lowPrice))?Number(quote.lowPrice):null]);
      db.observations[key]=observations;
      changed++;
    }
    state.lastFetched[group.groupId]=new Date().toISOString();
    completed++;
    console.log('Processed',group.groupId,group.name,'products',products.length,'quotes',prices.length);
  }catch(e){failures.push(group.groupId+': '+e.message);console.warn('Group failed',group.name,e.message);}
  await nap(300);
}
if(!completed){console.error('No groups refreshed; preserving previous market',failures.join('; '));process.exitCode=1;}
else{
  // Remove observations for deleted products and ancient days; never claim fresh data for other groups.
  const minDay=new Date(Date.now()-68*86400000).toISOString().slice(0,10);
  for(const [key,points] of Object.entries(db.observations)){
    const keep=points.filter(p=>p[0]>=minDay);
    if(!keep.length)delete db.observations[key];else db.observations[key]=keep;
  }
  const movers={7:[],30:[]};
  const nowMs=Date.now();
  for(const [key,points] of Object.entries(db.observations)){
    const id=key.split(':',1)[0],product=db.products[id];
    if(!product||!(product.number||product.rarity)||!points.length)continue;
    const last=points.at(-1),lastMs=Date.parse(last[0]+'T12:00:00Z');
    if(nowMs-lastMs>3*86400000)continue;
    for(const days of [7,30]){
      // Allow a 2-day tolerance around the anchor only.
      const lower=new Date(lastMs-(days+2)*86400000).toISOString().slice(0,10);
      const upper=new Date(lastMs-(days-2)*86400000).toISOString().slice(0,10);
      const prior=points.filter(p=>p[0]>=lower&&p[0]<=upper).at(-1);
      if(!prior||!prior[1])continue;
      const pct=100*(last[1]/prior[1]-1);
      if(!Number.isFinite(pct)||Math.abs(pct)>300)continue;
      movers[days].push({id:product.id,name:product.name,set:product.set,variant:key.slice(String(product.id).length+1),image:product.img,usd:last[1],change:pct,from:prior[0],to:last[0]});
    }
  }
  const best=days=>{
    // Same product can have many conditions. Choose a representative liquid printing per product.
    const rows=movers[days].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
    const seen=new Set(),unique=[];
    for(const r of rows){if(!seen.has(r.id)){seen.add(r.id);unique.push(r);}}
    return {qualified:unique.length,gainers:unique.filter(r=>r.change>0).sort((a,b)=>b.change-a.change).slice(0,15),losers:unique.filter(r=>r.change<0).sort((a,b)=>a.change-b.change).slice(0,15),median_change:unique.length?unique.map(r=>r.change).sort((a,b)=>a-b)[Math.floor(unique.length/2)]:null,breadth:unique.length?100*unique.filter(r=>r.change>0).length/unique.length:null};
  };
  const pricedIds=new Set(Object.keys(db.observations).map(k=>k.split(':')[0]).filter(id=>db.products[id]&&(db.products[id].number||db.products[id].rarity)));
  const leadersByProduct=new Map();
  for(const [key,points] of Object.entries(db.observations)){
    const id=Number(key.split(':',1)[0]),product=db.products[id];
    if(!product||( !product.number && !product.rarity)||!points?.length)continue;
    const current=points.at(-1);
    if(current[0]<new Date(Date.now()-5*86400000).toISOString().slice(0,10))continue;
    const price=Number(current[1]);if(!Number.isFinite(price)||price<=0||price>100000)continue;
    const entry={id:product.id,name:product.name,set:product.set,variant:key.slice(String(id).length+1),image:product.img,usd:price};
    if(!leadersByProduct.has(id)||leadersByProduct.get(id).usd<price)leadersByProduct.set(id,entry);
  }
  const leaders=[...leadersByProduct.values()].sort((a,b)=>b.usd-a.usd).slice(0,15);
  const board={updated_at:new Date().toISOString(),source:'TCGCSV · TCGplayer market guides',provider_updated_at:providerUpdatedAt,currency:'USD',methodology:'Product/printing guide price; not realised sales or worldwide market capitalisation.',coverage:{groups_total:list.length,groups_visited:Object.keys(state.lastFetched).length,groups_this_run:completed,products_catalogued:Object.values(db.products).filter(p=>p.number||p.rarity).length,products_priced:pricedIds.size,variants_with_history:Object.keys(db.observations).length},week:best(7),month:best(30),leaders,warnings:failures.slice(0,20)};
  await write('market-universe.json',db);
  await write('market-sweep-state.json',state);
  await write('market-board.json',board);
  console.log('Updated',completed,'groups;',changed,'quotes;',pricedIds.size,'priced products');
}

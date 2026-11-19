/* Tradr151 portfolio CSV importer.
   Uses local workspace + existing authenticated cloud sync. No third-party upload. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const status=(message,isError=false)=>{const node=$('portfolioImportStatus');if(node){node.textContent=message;node.style.color=isError?'#ef8d93':'';}};
function csvRows(source){
 const text=source.replace(/^\uFEFF/,'');
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}
   else if(c==='"')quoted=false;
   else cell+=c;
  }else if(c==='"'&&cell.trim()==='')quoted=true;
  else if(c===','){row.push(cell.trim());cell='';}
  else if(c==='\n'||c==='\r'){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(cell.trim());cell='';
   if(row.some(v=>v!==''))rows.push(row);
   row=[];
  }else cell+=c;
 }
 if(quoted)throw Error('Unclosed quote in CSV.');
 row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);
 return rows;
}
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
const slug=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,85)||'unspecified';
const col=(map,...aliases)=>aliases.reduce((a,k)=>a===-1?map.indexOf(norm(k)):a,-1);
const pick=(row,i)=>i<0?'':String(row[i]??'').trim();
function moneyValue(s){
 const raw=String(s||'').replace(/[£$€,\s]/g,'');
 if(!raw)return null;
 const n=Number(raw);return Number.isFinite(n)&&n>=0?n:null;
}
function readPortfolioCSV(text){
 const rows=csvRows(text);
 if(rows.length<2)throw Error('The CSV must include a header row and at least one card.');
 const header=rows[0].map(norm);
 const columns={
  name:col(header,'name','card name','pokemon','pokemon name','title','card'),
  set:col(header,'set','set name','expansion','series'),
  number:col(header,'card number','card no','number','no','card_number','collector number','card #'),
  language:col(header,'language','lang'),
  grade:col(header,'grade','grading','grading company','slab grade'),
  quantity:col(header,'quantity','qty','count','amount'),
  cost:col(header,'paid price','price paid','paid_price_gbp','cost','cost per card','unit cost','purchase price','paid','price per card'),
  total:col(header,'total paid','total_paid_gbp','total cost','purchase total'),
  condition:col(header,'condition'),
  edition:col(header,'edition','printing'),
  image:col(header,'image url','image_url','image'),
  id:col(header,'tcgplayer id','tcgplayer_id','product id')
 };
 if(columns.name<0)throw Error('No card name column found. Download the CSV template for supported columns.');
 const output=[],problems=[];
 for(let i=1;i<rows.length;i++){
  const row=rows[i],name=pick(row,columns.name).slice(0,180);
  if(!name){problems.push('Row '+(i+1)+': missing card name');continue;}
  const qtyValue=pick(row,columns.quantity);
  const qty=qtyValue===''?1:Number(qtyValue);
  if(!Number.isInteger(qty)||qty<1||qty>10000){problems.push('Row '+(i+1)+': invalid quantity');continue;}
  let cost=moneyValue(pick(row,columns.cost));
  let total=moneyValue(pick(row,columns.total));
  if(pick(row,columns.cost)&&cost===null){problems.push('Row '+(i+1)+': invalid paid price');continue;}
  if(pick(row,columns.total)&&total===null){problems.push('Row '+(i+1)+': invalid total paid');continue;}
  if(cost===null&&total!==null)cost=total/qty;
  cost=cost??0;
  const set=pick(row,columns.set).slice(0,140),number=pick(row,columns.number).slice(0,50);
  const grade=pick(row,columns.grade).slice(0,50)||'Raw';
  const language=(pick(row,columns.language)||'EN').toUpperCase().slice(0,5);
  const condition=pick(row,columns.condition).slice(0,45);
  const edition=pick(row,columns.edition).slice(0,45);
  const tcgId=pick(row,columns.id);
  const key='import:'+slug(language)+':'+slug(set)+':'+slug(number)+':'+slug(name)+':'+slug(edition)+':'+slug(grade)+':'+slug(condition);
  const image=pick(row,columns.image);
  output.push({
   key,card:{
    id:tcgId&&/^\d+$/.test(tcgId)?'tcgplayer-'+tcgId:key,
    name,setName:set||'Unknown set',localId:number||'—',language:language.toLowerCase(),image:/^https:\/\//.test(image)?image:'',
    grade,condition,edition,provider:'CSV'
   },
   qty,cost:Number(cost.toFixed(2))
  });
 }
 return {output,problems};
}
async function importFile(event){
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('Please import a CSV under 5 MB.');
  const text=await file.text();
  const {output,problems}=readPortfolioCSV(text);
  if(!output.length)throw Error(problems.slice(0,3).join('; ')||'No valid cards were found.');
  if(output.length>10000)throw Error('Maximum 10,000 cards per import.');
  if(!window.TradrBridge)throw Error('Portfolio is still loading. Please try again.');
  const workspace=window.TradrBridge.getWorkspace();
  let added=0,updated=0;
  const grouped=new Map();
  for(const item of output){
   const prev=grouped.get(item.key);
   if(prev){
    const sum=prev.qty+item.qty;
    prev.cost=(prev.cost*prev.qty+item.cost*item.qty)/sum;
    prev.qty=sum;
   }else grouped.set(item.key,{...item});
  }
  for(const item of grouped.values()){
   const existing=workspace.portfolio[item.key];
   workspace.cards[item.key]={...workspace.cards[item.key],...item.card};
   if(existing){
    const oldQty=Math.max(1,Number(existing.quantity)||1);
    const totalQty=oldQty+item.qty;
    const oldCost=Number(existing.cost)||0;
    workspace.portfolio[item.key]={...existing,quantity:totalQty,cost:Number(((oldQty*oldCost+item.qty*item.cost)/totalQty).toFixed(2)),grade:item.card.grade};
    updated++;
   }else{
    workspace.portfolio[item.key]={quantity:item.qty,cost:item.cost,grade:item.card.grade};
    added++;
   }
  }
  window.TradrBridge.save();
  window.TradrBridge.changeTab('portfolio');
  const errors=problems.length?' · '+problems.length+' rows skipped: '+problems.slice(0,2).join('; '):'';
  status('Imported '+added+' new cards and updated '+updated+' existing entries.'+errors);
 }catch(e){status('Import failed: '+e.message,true)}
 finally{event.target.value='';}
}
function downloadTemplate(){
 const csv='Name,Set,Card Number,Language,Edition,Condition,Grade,Quantity,Paid Price GBP,Image URL\n';
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='tradr151-portfolio-template.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function init(){
 $('portfolioCsv')?.addEventListener('change',importFile);
 $('portfolioCsvTemplate')?.addEventListener('click',downloadTemplate);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

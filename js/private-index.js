// Local-only merge of a user-approved detailed Drive index into the public preview.
// The document never leaves the browser: no network calls and no persistent storage.
const guideId=(year,number)=>String(year||'')+'/'+String(Number(number||0)).padStart(3,'0');
const name=x=>typeof x==='string'?x.trim().slice(0,500):'';
export function mergePrivateGuideIndex(rows,snapshot){
  if(snapshot?.schema!=='inpa.coleoptera.loan.v1'||!Array.isArray(snapshot.records)||
    snapshot.records.length>5000)throw Error('Índice canônico incompatível');
  const grouped=new Map();
  for(const item of snapshot.records){
    const g=item?.guide;
    if(!g||!/^20\d{2}$/.test(String(g.year||''))||!/^\d{1,4}$/.test(String(g.number||'')))continue;
    const key=guideId(g.year,g.number);
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(g.fields||{});
  }
  let applied=0,ambiguous=0;
  const merged=rows.map(r=>{
    if(!r.preview)return r;
    const found=grouped.get(guideId(r.year,r.number))||[];
    if(found.length>1){ambiguous++;return r;}
    if(found.length!==1)return r;
    const recipient=name(found[0].recipient),requestedBy=name(found[0].requestedBy);
    if(!recipient&&!requestedBy)return r;
    applied++;
    return {...r,recipient,requestedBy,canonical:{...r.canonical,
      guide:{...r.canonical?.guide,fields:{...r.canonical?.guide?.fields,recipient,requestedBy}}}};
  });
  return {rows:merged,applied,ambiguous};
}

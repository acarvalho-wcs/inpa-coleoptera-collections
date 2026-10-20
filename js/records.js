export const TYPE_LABELS={EMP:'Empréstimo',DEV:'Devolução',DEVO:'Devolução',DOA:'Doação',TRAN:'Transferência',PER:'Permuta',MIX:'Movimentação mista'};
export const TYPE_ORDER=['EMP','DEV','DOA','TRAN','PER','MIX','OUTRO'];
const stripExt=s=>String(s||'').replace(/\.(pdf|docx?|odt)$/i,'');
export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
export function parseFilename(name,folderYear=''){
  const base=stripExt(name); const m=base.match(/(?:invoice|guia)?\s*inpa\s*(\d{1,4})\s*(?:de|[-_/])\s*(20\d{2})\s*[_-]\s*(.+?)(?:\s*[-_]\s*(EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER))?\s*$/i);
  const year=m?.[2]||String(folderYear||'');
  const number=m?String(Number(m[1])).padStart(3,'0'):null;
  let researcher=m?.[3]?.trim()||'';
  let type=(m?.[4]||'').toUpperCase();
  if(!type){const match=base.match(/(?:^|[-_\s])(EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER)(?:$|[-_\s])/i);type=match?.[1]?.toUpperCase()||'OUTRO';}
  if(!researcher&&base.includes('_'))researcher=base.split('_').slice(1).join('_').replace(/[-_](EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER)$/i,'').trim();
  // Multi-code filenames (e.g. DOA-DEV) describe mixed movements: do not
  // silently classify them as the last code (DEV). The guide content must be
  // reviewed to split the quantities into the relevant movement components.
  const terminalCodes=base.match(/(?:[-_\s]+(?:EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER))+$/i)?.[0]||'';
  const distinctTypes=[...new Set((terminalCodes.match(/EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER/gi)||[])
    .map(v=>v.toUpperCase()).map(v=>v==='DEVO'?'DEV':/^(DOAÇÃO|DOACAO)$/.test(v)?'DOA':v))];
  if(distinctTypes.length>1){
    type='MIX';
    researcher=researcher.replace(/(?:[-_\s]+(?:EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER))+$/i,'').trim();
  }
  return {year,number,researcher,type:type==='DEVO'?'DEV':/^(DOAÇÃO|DOACAO)$/.test(type)?'DOA':type,rawType:type, title:name};
}
export const isPreferred = f=>f.mimeType==='application/pdf'||/\.pdf$/i.test(f.name||'');
export function docToRecord(file,folderYear){
  const parsed=parseFilename(file.name,folderYear);
  return {...parsed,id:file.id,name:file.name,mimeType:file.mimeType,url:file.webViewLink||`https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`,modified:file.modifiedTime||'',size:Number(file.size||0),country:null,city:null,institution:null,family:null,taxonomicOrder:null,specimens:null,departure:null,returnExpected:null,returnConfirmed:null,reviewed:false,sources:[file]};
}
function groupingKey(r){
  // Guida+ano isoladamente nao e chave: numeros repetem para pessoas e eventos diferentes.
  if(r.number&&r.researcher)return [r.year,r.number,normalize(r.researcher),r.type].join('|');
  return `file:${r.id}`;
}
export function consolidate(files,folderYear){
  const found=new Map();
  for(const file of files){
    if(file.mimeType!=='application/pdf'&&file.mimeType!=='application/vnd.openxmlformats-officedocument.wordprocessingml.document'&&!/\.(pdf|docx)$/i.test(file.name||''))continue;
    const row=docToRecord(file,folderYear);const key=groupingKey(row);
    if(!found.has(key)){found.set(key,row);continue;}
    const prev=found.get(key);const all=[...prev.sources,file];
    const chosen=isPreferred(file)&&!isPreferred(prev)?docToRecord(file,folderYear):prev;
    found.set(key,{...chosen,sources:all});
  }
  return [...found.values()].sort((a,b)=>(b.year||'').localeCompare(a.year||'')||(b.number||'').localeCompare(a.number||'')||a.name.localeCompare(b.name,'pt-BR'));
}
export function filterRecords(records,{query='',year='all',type='all',format='all',onlyColeoptera=false}={}){
  const needle=normalize(query);
  return records.filter(r=>
    (year==='all'||r.year===year)&&
    (type==='all'||r.type===type)&&
    (format==='all'||(format==='pdf'?isPreferred(r):!isPreferred(r)))&&
    (!onlyColeoptera||normalize(r.taxonomicOrder)==='coleoptera')&&
    (!needle||normalize([r.name,r.researcher,r.recipient,r.requestedBy,r.canonical?.guide?.fields?.recipient,r.canonical?.guide?.fields?.requestedBy,r.institution,r.country,r.city,r.family,r.taxonomicOrder,r.number].filter(Boolean).join(' ')).includes(needle))
  );
}
export function stats(rows){return {records:rows.length,loans:rows.filter(r=>r.type==='EMP').length,returns:rows.filter(r=>r.type==='DEV').length,pdfs:rows.filter(isPreferred).length,needsReview:rows.filter(r=>!r.reviewed).length};}
export function parseVerifiedCsv(rows){ return rows.filter(r=>r && typeof r.id==='string').map(r=>({...r,reviewed:r.reviewed===true})); }

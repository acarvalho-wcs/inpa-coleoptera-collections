export const TYPE_LABELS={EMP:'Empréstimo',DEV:'Devolução',DEVO:'Devolução',DOA:'Doação',TRAN:'Transferência',PER:'Permuta',MIX:'Movimentação mista'};
export const TYPE_ORDER=['EMP','DEV','DOA','TRAN','PER','MIX','OUTRO'];
const stripExt=s=>String(s||'').replace(/\.(pdf|docx?|odt)$/i,'');
export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
export function parseFilename(name,folderYear=''){
  const base=stripExt(name);
  // Historical guides also use suffixes on the numeric identifier: 006a, 007b.
  const m=base.match(/(?:invoice|guia)?\s*inpa\s*(\d{1,4}[a-z]?)\s*(?:de|[-_/])\s*(20\d{2})\s*[_-]\s*(.+)$/i);
  const year=m?.[2]||String(folderYear||'');
  const number=m?m[1].replace(/^(\d+)/,v=>String(Number(v)).padStart(3,'0')).toLowerCase():null;
  const terminalCodes=base.match(/(?:[-_\s]+(?:EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER))+$/i)?.[0]||'';
  const distinctTypes=[...new Set((terminalCodes.match(/EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER/gi)||[])
    .map(v=>v.toUpperCase()).map(v=>v==='DEVO'?'DEV':/^(DOAÇÃO|DOACAO)$/.test(v)?'DOA':v))];
  let researcher=(m?.[3]||'').replace(/(?:[-_\s]+(?:EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER))+$/i,'').trim();
  if(!researcher && !m && base.includes('_'))researcher=base.split('_').slice(1).join('_').trim();
  const type=distinctTypes.length>1?'MIX':distinctTypes[0]||'OUTRO';
  return {year,number,researcher,type,rawType:terminalCodes||type,title:name};
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
    const row=docToRecord(file,folderYear),key=groupingKey(row);
    if(!found.has(key)){found.set(key,row);continue;}
    const prev=found.get(key),all=[...prev.sources,file];
    const chosen=isPreferred(file)&&!isPreferred(prev)?row:prev;
    found.set(key,{...chosen,sources:all});
  }
  // A copy without a movement suffix (e.g. 2025/026.pdf) is only
  // reconciled with its PDF/Word counterpart if the base filename,
  // researcher and guide match exactly and the movement is unambiguous.
  const normalizedBase=row=>normalize(stripExt(row.name).replace(/(?:[-_\s]+(?:EMP|DEV|DEVO|DOA|DOAÇÃO|DOACAO|TRAN|PER))+$/i,''));
  for(const [key,row] of [...found]){
    if(row.type!=='OUTRO'||!row.number||!row.researcher||row.sources.length!==1)continue;
    const alternatives=[...found.entries()].filter(([k,candidate])=>k!==key
      &&candidate.year===row.year&&candidate.number===row.number
      &&candidate.type!=='OUTRO'&&candidate.type!=='MIX'
      &&normalize(candidate.researcher)===normalize(row.researcher)
      &&normalizedBase(candidate)===normalizedBase(row)
      &&candidate.sources.length===1
      &&isPreferred(candidate)!==isPreferred(row));
    if(alternatives.length!==1)continue;
    const [typedKey,typed]=alternatives[0];
    const chosen=isPreferred(row)?row:typed;
    found.set(typedKey,{...chosen,year:typed.year,number:typed.number,researcher:typed.researcher,
      type:typed.type,rawType:typed.rawType,sources:[...typed.sources,...row.sources]});
    found.delete(key);
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
    (!needle||normalize([r.name,r.researcher,r.recipient,r.requestedBy,r.canonical?.guide?.fields?.recipient,r.canonical?.guide?.fields?.requestedBy,r.institution,r.country,r.city,r.family,r.taxonomicOrder,r.taxa?.order,...(r.taxa?.families||[]),...(r.taxa?.subfamilies||[]),...(r.taxa?.genera||[]),...(r.taxa?.species||[]),r.taxa?.discrimination,r.number].filter(Boolean).join(' ')).includes(needle))
  );
}
export function stats(rows){return {records:rows.length,loans:rows.filter(r=>r.type==='EMP').length,returns:rows.filter(r=>r.type==='DEV').length,pdfs:rows.filter(isPreferred).length,needsReview:rows.filter(r=>!r.reviewed).length};}
export function parseVerifiedCsv(rows){ return rows.filter(r=>r && typeof r.id==='string').map(r=>({...r,reviewed:r.reviewed===true})); }

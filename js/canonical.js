import { normalize } from './records.js';
import { readGuideFields } from './guide-fields.js';
import { validIso } from './loan-status.js';

export const CANONICAL_SCHEMA = 'inpa.coleoptera.loan.v1';
const ORDER_NAMES = ['Coleoptera','Diptera','Hymenoptera','Lepidoptera','Hemiptera','Orthoptera','Odonata','Neuroptera','Trichoptera','Ephemeroptera','Blattodea','Isoptera','Phasmatodea','Mantodea','Siphonaptera','Psocodea','Dermaptera','Plecoptera','Thysanoptera','Megaloptera','Strepsiptera','Zygentoma','Trematoda'];
const unique = x => [...new Set(x)];
const brief = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 160);

export function canonicalKey(row) {
  // A guide number alone is never a primary key: different recipients and transactions reuse it.
  return [row.year || 'sem-ano', row.number || 'sem-numero', normalize(row.researcher || row.name || ''), row.type || 'OUTRO'].join('|');
}

export function detectTaxonomy(text) {
  const clean=String(text||'').replace(/\r/g,'\n');
  // Some INPA PDF exports render the order under the preceding column label
  // (e.g. "Other Coleoptera"), so the entire taxonomy block is the evidence,
  // not only a 45-character window around "Order".
  const taxStart=clean.search(/Taxonomia\s+Taxonomy/i);
  const taxEnd=taxStart>=0 ? clean.slice(taxStart).search(/Autorizado\s+Por|Authorized\s+By|Material recebido em boas condi/i) : -1;
  const taxonomy=taxStart>=0 ? clean.slice(taxStart,taxEnd>=0?taxStart+taxEnd:taxStart+4000) : '';
  const matches=[];
  const add=(order,context)=>{
    const known=ORDER_NAMES.find(x=>x.toLowerCase()===order.toLowerCase());
    if(known)matches.push({order:known,context:brief(context)});
  };
  const orderPattern=/\b(Coleoptera|Diptera|Hymenoptera|Lepidoptera|Hemiptera|Orthoptera|Odonata|Neuroptera|Trichoptera|Ephemeroptera|Blattodea|Isoptera|Phasmatodea|Mantodea|Trematoda|Dermaptera|Psocodea)\b/gi;
  if(taxonomy) {
    for(const m of taxonomy.matchAll(orderPattern)){
      const start=Math.max(0,m.index-60),end=Math.min(taxonomy.length,m.index+m[0].length+60);
      add(m[1],taxonomy.slice(start,end));
    }
  } else {
    // DOCX records may have no flattened taxonomy table. Require explicit
    // taxonomic context, never a casual mention in an email or commentary.
    for(const m of clean.matchAll(orderPattern)){
      const start=Math.max(0,m.index-75),end=Math.min(clean.length,m.index+m[0].length+75);
      const context=clean.slice(start,end);
      const explicit=/\b(?:Arthropoda|Hexapoda|Insecta|Ordem|Order|Fam[ií]lia|Family|Discrimina[cç][aã]o|Discrimination)\b/i.test(context);
      const taxonFamily=/Coleoptera\s*:\s*[A-Z][a-z-]+idae\b/i.test(context);
      if(explicit||taxonFamily)add(m[1],context);
    }
  }
  // INPA Word documents sometimes place the order only in positioned
  // text boxes, outside the document's normal taxonomy paragraph.
  if(!matches.length&&clean.includes('[Conteúdo de caixas de texto do Word]')){
    const addon=clean.split('[Conteúdo de caixas de texto do Word]')[1]||'';
    if(/\b(?:Arthropoda|Hexapoda|Insecta)\b/i.test(addon)){
      for(const m of addon.matchAll(orderPattern)){
        const start=Math.max(0,m.index-90),end=Math.min(addon.length,m.index+m[0].length+40);
        const area=addon.slice(start,end);
        if(/\b(?:Arthropoda|Hexapoda|Insecta)\b/i.test(area))add(m[1],area);
      }
    }
  }
  // Familias e grupos infra-familiares inequívocos podem atestar Coleoptera
  // quando a ordem está em uma caixa de texto não recuperada. A evidência é
  // taxonômica (não homologação documental, que continua pendente).
  const beetleTaxa=/\b(?:Staphylinidae|Curculionidae|Chrysomelidae|Cerambycidae|Lymexylidae|Elateridae|Scarabaeidae|Carabidae|Buprestidae|Lampyridae|Lycidae|Scirtidae|Scirtiidae|Passalidae|Tenebrionidae|Coccinellidae|Paederinae|Lamiinae|Lamprosomatinae|Lamprossomatinae|Cassidinae|Hispini|Onciderini|Paederus|Eumolpus|Bacuris|Aderobium|Biocrypta|Homaeotarsus|Ochthephilum|Scopaeodes|Synecitonides)\b/gi;
  if(!matches.length && taxonomy){
    const evidence=[...taxonomy.matchAll(beetleTaxa)].slice(0,4);
    if(evidence.length){
      const names=unique(evidence.map(m=>m[0]));
      matches.push({order:'Coleoptera',context:'Táxon diagnóstico no campo taxonômico: '+names.join(', ')});
    }
  }
  const orders=unique(matches.map(x=>x.order));
  let classification='pending';
  if(orders.length===1)classification=orders[0]==='Coleoptera'?'coleoptera':'other';
  else if(orders.length>1)classification='mixed';
  const familyMatch=clean.match(/Fam[ií]lia\s*:\s*([A-Za-z][A-Za-z-]{3,}idae)\b/i) || clean.match(/Coleoptera\s*:\s*([A-Za-z][A-Za-z-]{3,}idae)\b/i);
  return {classification,order:orders.length===1?orders[0]:null,orders,family:familyMatch?.[1]||null,
    evidence:matches.slice(0,4).map(x=>({field:'order',quote:x.context,order:x.order}))};
}

const isoDate = raw => {
  const m=String(raw).match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);
  if(!m)return null;
  const d=new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`);
  return d.getUTCFullYear()===Number(m[3]) && d.getUTCMonth()+1===Number(m[2]) && d.getUTCDate()===Number(m[1]) ? `${m[3]}-${m[2]}-${m[1]}`:null;
};
export function extractFacts(text, row) {
  const body=String(text||'').replace(/\r/g,'\n');
  const tax=detectTaxonomy(body);
  const extracted=readGuideFields(body);
  // One aggregate scan cannot safely be represented as a single movement.
  if(/^Guias?\s+20\d{2}\.pdf$/i.test(row.name||'')){tax.classification='pending';tax.order=null;}
  const guide=body.match(/Guia(?:\/Invoice)?\s*(?:n[º°o.]*)?\s*:\s*(20\d{2})\s*\/\s*(\d{1,4})/i);
  // Documents use non-linear table text order; date fields are proposed for review, not authoritative.
  const candidates=unique((body.slice(0,6500).match(/\b\d{2}\/\d{2}\/20\d{2}\b/g)||[]).map(isoDate).filter(Boolean));
  const issues=[];
  if(!body.trim())issues.push('Documento sem texto extraível; conferir digitalização manualmente');
  if(!guide)issues.push('Número da guia não localizado no conteúdo');
  if(/^Guias?\s+20\d{2}\.pdf$/i.test(row.name||''))issues.push('PDF agregado com múltiplas guias: separar documentos individualmente antes de validar');
  if(guide && (guide[1]!==row.year||String(Number(guide[2])).padStart(3,'0')!==row.number)) issues.push('Divergência entre identificação do arquivo e da guia');
  if(tax.classification==='pending')issues.push('Ordem taxonômica não demonstrada no texto');
  if(tax.classification==='mixed')issues.push('Múltiplas ordens taxonômicas; conferir movimentação mista');
  issues.push(...(extracted.fields.dateCheckNotes||[]));
  const type=String(row.type||'OUTRO');
  return {
    schema:CANONICAL_SCHEMA, key:canonicalKey(row), sourceId:row.id,
    documents:(row.sources||[]).map(s=>({id:s.id,name:s.name,mimeType:s.mimeType,modifiedTime:s.modifiedTime||null,
      url:s.webViewLink||`https://drive.google.com/file/d/${encodeURIComponent(s.id)}/view`})),
    guide:{year:row.year,number:row.number,filenameRowType:type,filenameRecipient:row.researcher||null,fields:extracted.fields,fieldNote:extracted.extractionNote},
    taxonomy:tax, movement:{type,source:'filename',confirmed:false},
    loan:{sentDate:extracted.fields.sentDate||null,dueDate:extracted.fields.dueDate||null,
      sentDateRaw:extracted.fields.sentDateRaw||null,dueDateRaw:extracted.fields.dueDateRaw||null,datesNeedReview:extracted.fields.datesNeedReview||false,
      extensionDueDate:null,returnedDate:null,returnStatus:type==='DEV'?'returned_document':'not_reconciled',
      returnEvidence:type==='DEV'&&['2025','2026'].includes(row.year)?`Documento de devolução: ${row.name}`:null},
    destination:{country:null,city:null,institution:null,latitude:null,longitude:null,georefPrecision:'not_georeferenced'},
    specimenCount:extracted.fields.specimens||null, validation:{status:'pending',issues,notes:'',reviewedAt:null},
    provenance:{method:'client-side-text-extraction',extractedAt:new Date().toISOString(),source:'Google Drive',sourceOfTruth:true}
  };
}

export function applyReview(record,{classification,order,family,country,city,institution,notes,longitude,latitude,dueDate,extensionDueDate,returnedDate,returnStatus,returnEvidence}={}) {
  const next=structuredClone(record);
  if(classification && !['coleoptera','other','pending','mixed'].includes(classification))throw Error('Classificação inválida');
  if(classification){next.taxonomy.classification=classification;next.taxonomy.order=classification==='coleoptera'?'Coleoptera':order||null;}
  if(family!==undefined)next.taxonomy.family=String(family||'').trim()||null;
  for(const [key,value] of Object.entries({country,city,institution}))if(value!==undefined)next.destination[key]=String(value||'').trim()||null;
  if(latitude!==undefined || longitude!==undefined){
    const lat=Number(latitude),lon=Number(longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Coordenadas inválidas');
    next.destination.latitude=lat;next.destination.longitude=lon;next.destination.georefPrecision='manually_confirmed';
  }
  if(dueDate!==undefined){
    if(dueDate&&!validIso(dueDate))throw Error('Data prevista de devolução inválida');
    next.loan.dueDate=dueDate||null;
  }
  if(extensionDueDate!==undefined){
    if(extensionDueDate&&!validIso(extensionDueDate))throw Error('Nova data de prazo inválida');
    next.loan.extensionDueDate=extensionDueDate||null;
  }
  if(returnedDate!==undefined){
    if(returnedDate&&!validIso(returnedDate))throw Error('Data de devolução inválida');
    next.loan.returnedDate=returnedDate||null;
  }
  if(returnEvidence!==undefined)next.loan.returnEvidence=String(returnEvidence||'').trim()||null;
  if(returnStatus!==undefined){
    if(!['not_reconciled','returned','partial'].includes(returnStatus))throw Error('Situação de devolução inválida');
    next.loan.returnStatus=returnStatus;
  }
  if(next.loan.returnStatus==='returned'&&(!next.loan.returnEvidence||!next.loan.returnedDate))
    throw Error('Devolução confirmada exige data e referência documental');
  if(notes!==undefined)next.validation.notes=String(notes||'').trim();
  next.validation.status='reviewed';next.validation.reviewedAt=new Date().toISOString();
  return next;
}

export function createSnapshot(records) {
  const items=records.filter(r=>r && r.schema===CANONICAL_SCHEMA && r.key).map(x=>structuredClone(x));
  items.sort((a,b)=>a.key.localeCompare(b.key));
  return {schema:CANONICAL_SCHEMA,version:1,generatedAt:new Date().toISOString(),source:'Google Drive INPA - Guias de empréstimo',scope:'Coleoptera pilot - verified evidence and audit queue',recordCount:items.length,records:items};
}
export function readSnapshot(data) {
  if(data?.schema!==CANONICAL_SCHEMA || data.version!==1 || !Array.isArray(data.records)) throw Error('Arquivo canônico incompatível');
  if(data.records.length>50000)throw Error('Índice excede limite de segurança');
  return data.records.filter(r=>r?.schema===CANONICAL_SCHEMA && typeof r.key==='string' && typeof r.sourceId==='string');
}

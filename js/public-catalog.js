// Single public catalogue for all collection years.
// Legacy 2025/2026 files are read only as input adapters. Future years use one schema.
// This file is safe in a static Pages deployment and never fetches original Drive files.
import {projectPreliminary2025} from './preliminary-2025.js';

export const PUBLIC_YEAR_SCHEMA='inpa.coleoptera.public-year.v1';
export const PUBLIC_CATALOG_SCHEMA='inpa.coleoptera.public-catalog.v1';
const TYPES=new Set(['EMP','DEV','DOA','TRAN','PER','MIX']);
const iso=/^\d{4}-\d{2}-\d{2}$/;
const guide=/^\d{1,4}[a-z]?$/i;
const safeName=s=>typeof s==='string'&&s.length>=2&&s.length<=160&&/^[\p{L}\p{M}\s.,'’/()&-]+$/u.test(s);
const safeText=(s,max=600)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/@|https?:|<|>|access_token|private_key|client_secret/i.test(s);
const onlyKeys=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
const count=n=>Number.isInteger(n)&&n>=0&&n<=1000000;
const textList=v=>Array.isArray(v)&&v.length<=50&&v.every(x=>safeText(x,140));
const validDate=v=>v===null||(typeof v==='string'&&iso.test(v)&&
  new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
function fail(message){throw Error('Public catalogue: '+message);}
function validTaxa(t){
  return onlyKeys(t,['order','families','subfamilies','genera','species','discrimination'])&&
    t.order==='Coleoptera'&&['families','subfamilies','genera','species'].every(k=>textList(t[k]))&&
    safeText(t.discrimination,1200);
}
function validDestination(d){
  return onlyKeys(d,['institution','city','country','lat','lng','precision','role','note'])&&
    safeText(d.institution,180)&&safeText(d.city,150)&&safeText(d.country,100)&&
    typeof d.lat==='number'&&Number.isFinite(d.lat)&&d.lat>=-90&&d.lat<=90&&
    typeof d.lng==='number'&&Number.isFinite(d.lng)&&d.lng>=-180&&d.lng<=180&&
    ['institution_approx','city_approx'].includes(d.precision)&&
    ['recipient','linked_institution'].includes(d.role)&&safeText(d.note);
}
const YEAR_FIELDS=['id','number','type','specimenCount','components','family','recipient','requestedBy',
  'taxa','reviewStatus','note','sentDate','dueDate','dueSource','destination'];
const COMPONENT_FIELDS=['type','specimenCount'];

export function validatePublicYear(data){
  if(!onlyKeys(data,['kind','year','records'])||data.kind!==PUBLIC_YEAR_SCHEMA||
     !/^(19|20)\d{2}$/.test(data.year)||!Array.isArray(data.records)||data.records.length>10000)
    fail('invalid year schema or number of records');
  const ids=new Set(),movements=new Set();
  for(const r of data.records){
    if(!onlyKeys(r,YEAR_FIELDS)||!safeText(r.id,90)||!/^[a-zA-Z0-9_-]+$/.test(r.id)||
      !guide.test(r.number)||!TYPES.has(r.type)||!count(r.specimenCount)||
      !safeText(r.family,160)||!safeName(r.recipient)||!safeName(r.requestedBy)||
      !validTaxa(r.taxa)||!['reviewed','preliminary'].includes(r.reviewStatus)||
      !safeText(r.note)||!validDate(r.sentDate)||!validDate(r.dueDate)||
      !['document','one_year','missing','not_applicable','ambiguous_document','extension'].includes(r.dueSource)||
      !validDestination(r.destination))
      fail('invalid public field in '+String(r?.id||'unnamed record')+' ('+data.year+')');
    if(!Array.isArray(r.components)||r.components.length<1||r.components.length>12||
      r.components.some(c=>!onlyKeys(c,COMPONENT_FIELDS)||!TYPES.has(c.type)||c.type==='MIX'||!count(c.specimenCount))||
      r.components.reduce((n,c)=>n+c.specimenCount,0)!==r.specimenCount||
      (r.type==='MIX'?(r.components.length<2||new Set(r.components.map(c=>c.type)).size<2):
        (r.components.length!==1||r.components[0].type!==r.type)))
      fail('movement components or specimen totals inconsistent in '+r.id);
    if(r.type!=='EMP'&&r.type!=='MIX'&&(r.dueDate!==null||r.dueSource!=='not_applicable'))
      fail('non-loan must not create a deadline in '+r.id);
    if(r.reviewStatus==='preliminary'&&r.dueSource==='one_year')
      fail('cannot assign a derived deadline to preliminary record '+r.id);
    if(ids.has(r.id))fail('duplicate ID '+r.id);
    ids.add(r.id);
    // Repeated guide numbers are valid when the movement or person differs.
    // Exact repeat of year + guide + movement + recipient is not automatically published.
    const mk=[data.year,r.number.toLowerCase(),r.type,r.recipient.toLocaleLowerCase('pt-BR')].join('|');
    if(movements.has(mk))fail('potential duplicate movement '+mk);
    movements.add(mk);
  }
  return data.records.length;
}
const makeLoan=(type,sent,due,dueSource)=>({
  sentDate:sent,dueDate:due,sentDateRaw:null,dueDateRaw:null,
  dueSource,returnStatus:'not_reconciled'
});
function fromLegacy2026(r,i){
  return {
    id:'legacy-2026-'+i,year:r.year,number:r.number,type:r.type,
    name:r.family+' · guia '+r.year+'/'+r.number,researcher:null,
    recipient:r.recipient,requestedBy:r.requestedBy,
    family:r.family,taxa:r.taxa,taxonomicOrder:'Coleoptera',specimens:r.specimenCount,
    country:r.country,destination:r.destination,sentDate:r.sentDate||null,dueDate:r.dueDate||null,
    previewStatus:r.status,preview:true,preliminary:false,reviewStatus:'documented',
    sources:r.sources,originalUrl:r.originalUrl,
    components:r.number==='037'?[
      {type:'DEV',specimenCount:22},{type:'DOA',specimenCount:10}
    ]:r.number==='046'?[
      {type:'EMP',specimenCount:10},{type:'TRAN',specimenCount:8}
    ]:r.number==='047'?[
      {type:'EMP',specimenCount:7},{type:'DOA',specimenCount:1}
    ]:[{type:r.type,specimenCount:r.specimenCount}],
    canonical:{
      movement:{type:r.type},taxonomy:{classification:'coleoptera',order:'Coleoptera',evidence:[]},
      loan:{sentDate:r.sentDate||null,dueDate:r.dueDate||null,
        sentDateRaw:r.sentDateRaw||null,dueDateRaw:r.dueDateRaw||null,
        dueSource:r.dueSource||null,datesNeedReview:Boolean(r.sentDateRaw||r.dueDateRaw),
        returnStatus:'not_reconciled'}
    }
  };
}
function fromLegacy2025(data){
  return projectPreliminary2025(data).map(r=>({
    ...r,taxonomicOrder:'Coleoptera',reviewStatus:'preliminary',
    canonical:{...r.canonical,taxonomy:{...r.canonical.taxonomy,
      classification:r.number==='027'?'mixed':'coleoptera',
      order:r.number==='027'?null:'Coleoptera'}},
    components:[{type:r.type,specimenCount:r.specimens}]
  }));
}
function fromYear(data){
  validatePublicYear(data);
  return data.records.map(r=>({
    id:'year-'+data.year+'-'+r.id,year:data.year,number:r.number,type:r.type,
    name:r.family+' · guia '+data.year+'/'+r.number,researcher:null,
    recipient:r.recipient,requestedBy:r.requestedBy,family:r.family,taxa:r.taxa,
    specimens:r.specimenCount,taxonomicOrder:'Coleoptera',country:r.destination.country,
    destination:{...r.destination},sentDate:r.sentDate,dueDate:r.dueDate,
    previewStatus:(r.reviewStatus==='preliminary'?'TRIAGEM PRELIMINAR — ':'REGISTRO DOCUMENTADO — ')+r.note,
    preview:true,preliminary:r.reviewStatus==='preliminary',reviewStatus:r.reviewStatus,
    sources:[],originalUrl:null,components:r.components,
    canonical:{movement:{type:r.type},taxonomy:{classification:'coleoptera',order:'Coleoptera',evidence:[]},
      loan:makeLoan(r.type,r.sentDate,r.dueDate,r.dueSource)}
  }));
}
export function buildPublicCatalog({legacy2026,legacy2025,years=[]}){
  if(legacy2026?.kind!=='public-anonymized-preview'||!Array.isArray(legacy2026.records)||
    legacy2025?.kind!=='inpa.coleoptera.preliminary-2025.v1'||!Array.isArray(years))
    fail('legacy data or annual list invalid');
  const rows=[
    ...legacy2026.records.map(fromLegacy2026),
    ...fromLegacy2025(legacy2025),
    ...years.flatMap(fromYear)
  ];
  const ids=new Set(),movementKeys=new Set();
  for(const r of rows){
    if(ids.has(r.id))fail('duplicate public ID '+r.id);
    ids.add(r.id);
    const movement=[r.year,r.number,r.type,r.recipient].join('|').toLowerCase();
    if(movementKeys.has(movement))fail('duplicate published movement '+movement);
    movementKeys.add(movement);
  }
  const summary=Object.entries(Object.groupBy(rows,r=>r.year)).map(([year,records])=>({
    year,records:records.length,preliminary:records.filter(r=>r.preliminary).length
  })).sort((a,b)=>a.year.localeCompare(b.year));
  return {kind:PUBLIC_CATALOG_SCHEMA,generatedFrom:'versioned-approved-public-summaries',
    summary,records:rows};
}
export function validateBuiltCatalog(data){
  if(data?.kind!==PUBLIC_CATALOG_SCHEMA||!Array.isArray(data.records)||!Array.isArray(data.summary))
    fail('built catalogue schema invalid');
  if(data.records.some(r=>!r.id||!r.year||!r.recipient||!r.requestedBy||!Array.isArray(r.components)))
    fail('built catalogue record missing required display fields');
  return data.records;
}

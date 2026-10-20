// Prazo de acompanhamento; devolver atrasado exige conciliacao.
const DAY=86400000;
export function validIso(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()+1===m&&date.getUTCDate()===d?value:null;
}
export function fromBr(raw){const m=String(raw||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?validIso(`${m[3]}-${m[2]}-${m[1]}`):null;}
export function parseGuideDate(raw){
  const value=String(raw||'').trim();
  if(validIso(value))return {raw:value,iso:value,ambiguous:false,alternatives:[value]};
  const m=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m)return {raw:value||null,iso:null,ambiguous:false,invalid:Boolean(value),alternatives:[]};
  const a=Number(m[1]),b=Number(m[2]),year=m[3],br=validIso(`${year}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`),us=validIso(`${year}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`);
  const alternatives=[...new Set([br,us].filter(Boolean))];
  return {raw:value,iso:alternatives.length===1?alternatives[0]:null,ambiguous:alternatives.length>1,invalid:!alternatives.length,alternatives};
}
export function showDate(value){const d=validIso(value);return d?`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`:'Não informada';}
export function addOneYear(iso){
  if(!validIso(iso))return null;
  const y=Number(iso.slice(0,4))+1,mo=Number(iso.slice(5,7)),d=Number(iso.slice(8,10));
  const last=new Date(Date.UTC(y,mo,0)).getUTCDate();
  return `${y}-${String(mo).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
}
export function localToday(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function daysBetween(a,b){return validIso(a)&&validIso(b)?Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY):null;}
export const STATUS_LABELS={
  overdue:'Em atraso documental · devolução não confirmada',soon:'Vence em até 30 dias',today:'Vence hoje',
  in_term:'Dentro do prazo · devolução não conciliada',returned:'Devolução confirmada',
  returned_document:'Devolução registrada (guia DEV)',partial:'Devolução parcial · conferir saldo',
  date_check:'Conferir data na guia original',unknown:'Prazo a verificar',other:'Outra movimentação'
};
export function loanStatus(row,today=localToday()){
  const type=row?.canonical?.movement?.type||row?.type||'OUTRO';
  if(type==='DEV')return {code:'returned_document',label:STATUS_LABELS.returned_document,days:null,dueDate:null,dueSource:'return_guide',needsOriginal:false};
  if(type!=='EMP')return {code:'other',label:STATUS_LABELS.other,days:null,dueDate:null,dueSource:'not_applicable',needsOriginal:false};
  const loan=row?.canonical?.loan||row?.loan||{};
  const rawSent=loan.sentDateRaw||row?.sentDateRaw||null;
  const rawDue=loan.dueDateRaw||row?.dueDateRaw||null;
  const sentParsed=rawSent?parseGuideDate(rawSent):null;
  const dueParsed=rawDue?parseGuideDate(rawDue):null;
  const sent=validIso(loan.sentDate)||validIso(row?.sentDate)||sentParsed?.iso||null;
  const original=validIso(loan.dueDate)||validIso(row?.dueDate)||dueParsed?.iso||null;
  const extended=validIso(loan.extensionDueDate);
  const ambiguous=Boolean(sentParsed?.ambiguous||dueParsed?.ambiguous||loan.datesNeedReview||row?.datesNeedReview);
  const suspiciousFuture=Boolean(sent&&sent>today);
  // An ambiguous date printed on a guide is never silently assigned a format.
  const dueSource=extended?'extension':original?'document':rawDue?'ambiguous_document':sent?'one_year':'missing';
  const due=extended||original||(rawDue?null:addOneYear(sent));
  const needsOriginal=ambiguous||suspiciousFuture||dueSource==='ambiguous_document'||Boolean(sentParsed?.invalid||dueParsed?.invalid);
  const meta={dueDate:due,dueSource,days:due?daysBetween(today,due):null,needsOriginal,
    sentDate:sent,sentDateRaw:rawSent,dueDateRaw:rawDue,
    displayedDue:due?showDate(due):rawDue||'Não informada',
    basisLabel:dueSource==='one_year'?'Prazo estimado: 1 ano após empréstimo':dueSource==='extension'?'Prazo prorrogado':dueSource==='document'?'Prazo descrito na guia':dueSource==='ambiguous_document'?'Transcrição literal da guia; verificar formato':'Prazo não informado'};
  const returned=loan.returnStatus==='returned'&&Boolean(String(loan.returnEvidence||'').trim());
  if(returned)return {...meta,code:'returned',label:STATUS_LABELS.returned};
  if(loan.returnStatus==='partial')return {...meta,code:'partial',label:STATUS_LABELS.partial};
  if(needsOriginal||!due)return {...meta,code:needsOriginal?'date_check':'unknown',label:STATUS_LABELS[needsOriginal?'date_check':'unknown']};
  const code=meta.days<0?'overdue':meta.days===0?'today':meta.days<=30?'soon':'in_term';
  return {...meta,code,label:STATUS_LABELS[code]};
}
export function priority(row,today=localToday()){
  const s=loanStatus(row,today);
  const rank={overdue:0,today:1,soon:2,partial:3,date_check:4,unknown:5,in_term:6,returned:7,returned_document:8,other:9};
  return (rank[s.code]??10)*100000+(s.days===null?0:Math.min(99999,Math.max(0,s.days+10000)));
}

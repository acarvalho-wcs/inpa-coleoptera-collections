// Prazo de devolucao e um indicador de acompanhamento, nao prova de material retido.
const DAY=86400000;
export function validIso(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?value:null;
}
export function fromBr(value){
  const match=String(value||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match?validIso(`${match[3]}-${match[2]}-${match[1]}`):null;
}
export function showDate(value){
  const date=validIso(value);
  return date?`${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}`:'Não informada';
}
export function localToday(now=new Date()){
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function daysBetween(from,to){
  if(!validIso(from)||!validIso(to))return null;
  return Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/DAY);
}
export const STATUS_LABELS={
  overdue:'Prazo vencido · devolução não confirmada',
  soon:'Vence em até 30 dias',today:'Vence hoje',in_term:'Dentro do prazo · sem conciliação',
  planned:'Envio futuro · não confirmar como efetuado',returned:'Devolução confirmada',
  partial:'Devolução parcial · conferir saldo',unknown:'Prazo a verificar',other:'Outra movimentação'
};
export function loanStatus(row,today=localToday()){
  const movement=row?.canonical?.movement?.type||row?.type||'OUTRO';
  if(movement!=='EMP')return {code:'other',label:STATUS_LABELS.other,days:null,dueDate:null};
  const loan=row?.canonical?.loan||row?.loan||{};
  const due=validIso(loan.extensionDueDate)||validIso(loan.dueDate)||validIso(row?.dueDate);
  const sent=validIso(loan.sentDate)||validIso(row?.sentDate);
  const returned=loan.returnStatus==='returned'&&Boolean(loan.returnEvidence?.trim());
  if(returned)return {code:'returned',label:STATUS_LABELS.returned,days:due?daysBetween(today,due):null,dueDate:due};
  if(sent&&sent>today)return {code:'planned',label:STATUS_LABELS.planned,days:due?daysBetween(today,due):null,dueDate:due};
  if(!due)return {code:'unknown',label:STATUS_LABELS.unknown,days:null,dueDate:null};
  const days=daysBetween(today,due);
  if(loan.returnStatus==='partial')return {code:'partial',label:STATUS_LABELS.partial,days,dueDate:due};
  const code=days<0?'overdue':days===0?'today':days<=30?'soon':'in_term';
  return {code,label:STATUS_LABELS[code],days,dueDate:due};
}
export function priority(row,today=localToday()){
  const c=loanStatus(row,today);
  const rank={overdue:0,today:1,soon:2,partial:3,unknown:4,in_term:5,planned:6,returned:7,other:8};
  return (rank[c.code]??9)*100000+(c.days===null?0:Math.min(99999,Math.max(0,c.days+10000)));
}

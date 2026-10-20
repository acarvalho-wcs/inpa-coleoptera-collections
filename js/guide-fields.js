import {fromBr} from './loan-status.js';

const asText=x=>String(x||'').replace(/\r/g,'\n').replace(/[\u00a0]/g,' ');
const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
const firstPage=text=>asText(text).split(/\f|\b(?:Normas de empr[eé]stimo de material|Regulations regarding the loan of material)\b/i)[0].slice(0,14000);
const extract=(text,regex)=>clean(regex.exec(text)?.[1]||'')||null;
const field=(text,label)=>{
  const lines=text.split('\n');
  for(const line of lines){
    const match=line.match(label);
    if(match){const v=clean(line.slice(match.index+match[0].length));
      // PDF text order interleaves left and right columns. Never capture a neighbouring
      // label as the value of the first field (e.g. Country: INPA Requested by).
      if(v && !/(?:Receiver|Requested by|Shipping method|Curator|Collection|Institution|Department Director|Country|Family|Volume Number|Loan date|Return date|Preservation Method|Shipping Type|Class:|Ordem:|Order:|Tipo de Envio:)/i.test(v)
        && !/^(Name|Family|Country|Class|Email|Order)$/i.test(v))return v;
    }
  }
  return null;
};
export function readGuideFields(fullText){
  const original=asText(fullText);
  const first=firstPage(original);
  const annex=original.includes('[Conteúdo de caixas de texto do Word]')?original.split('[Conteúdo de caixas de texto do Word]')[1]:'';
  const dates=[...(first+'\n'+annex).matchAll(/\b(\d{2}\/\d{2}\/20\d{2})\b/g)].map(m=>fromBr(m[1])).filter(Boolean);
  const uniqueDates=[...new Set(dates)];
  const value={
    guide:extract(first,/Guia(?:\/Invoice)?\s*(?:n[º°o.]*)?\s*:\s*(\d{4}\/\d{1,4})/i),
    recipient:field(first,/^Nome\s*:\s*/i),
    institution:field(first,/^(?:Institui[cç][aã]o|Institution)\s*:\s*/i),
    country:field(first,/^(?:Pa[ií]s|Country)\s*:\s*/i),
    email:extract(first,/E-?mail\s*:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i),
    departmentHead:field(first,/^Contato chefia[^:]*:\s*/i),
    collection:field(first,/^Cole[cç][aã]o\s*:\s*/i),
    curator:field(first,/^Curador\s*:\s*/i),
    requestedBy:field(first,/^Solicitante\s*:\s*/i),
    shipment:field(first,/^Forma de Envio\s*:\s*/i),
    sentDate:extract(first,/(?:Data do envio|Loan date)[^\d]{0,80}(\d{2}\/\d{2}\/20\d{2})/i),
    dueDate:extract(first,/(?:Data da devolu[cç][aã]o|Return date)[^\d]{0,80}(\d{2}\/\d{2}\/20\d{2})/i),
    specimens:extract(first,/(?:N[uú]mero de Esp[eé]cimes|Number of specimens)[^\d]{0,45}(\d{1,7})\b/i),
    volumes:extract(first,/(?:N[uú]mero de Volumes|Volume Number)\s*:\s*(\d+)/i),
    preservation:field(first,/^(?:Modo|M[eé]todo) de preserva[cç][aã]o\s*:\s*/i),
    type:field(first,/^Tipo de Envio\s*:\s*/i),
    phylum:extract(first,/Filo\s*:\s*(Arthropoda|Platyhelminthes|Mollusca|Annelida|Nematoda)\b/i),
    className:extract(first,/Classe\s*:\s*(Hexapoda|Insecta|Arachnida|Trematoda)\b/i),
    order:extract(first,/Ordem\s*:\s*(Coleoptera|Diptera|Orthoptera|Hymenoptera|Hemiptera|Lepidoptera|Phasmatodea|Dermaptera)\b/i),
    family:extract(first,/Fam[ií]lia\s*:\s*([A-Z][a-z-]+idae)\b/i),
    other:field(first,/^Outro\s*:\s*/i),
    discrimination:extract(first,/Discrimina[cç][aã]o\s*:\s*(?:Discrimination\s*)?([\s\S]{0,1200}?)(?:Dr\. Marcio Luiz de Oliveira|Autorizado Por|Authorized By|Material recebido)/i),
    observations:field(first,/^Observa[cç][oõ]es\s*:\s*/i),
    authorizedBy:field(first,/^Autorizado Por\s*:\s*/i)
  };
  // Some INPA PDFs place field values in separate columns, so dates appear
  // together near the end. Treat these as suggestions pending curator review.
  if(!value.sentDate&&uniqueDates.length>=1)value.sentDate=uniqueDates[0].split('-').reverse().join('/');
  if(!value.dueDate&&uniqueDates.length>=2)value.dueDate=uniqueDates[1].split('-').reverse().join('/');
  if(value.sentDate)value.sentDate=fromBr(value.sentDate);
  if(value.dueDate)value.dueDate=fromBr(value.dueDate);
  if(value.specimens)value.specimens=Number(value.specimens);
  if(value.volumes)value.volumes=Number(value.volumes);
  // Only exact text is stored; blank fields stay null. Layout extraction is not verification.
  return {fields:value,firstPageText:first,fullText:original.slice(0,90000),dateCandidates:uniqueDates,
    extractionNote:'Leitura automática preliminar. Campos dispersos em tabelas ou caixas de texto devem ser conferidos na guia original.'};
}

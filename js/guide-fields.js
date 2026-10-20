import {fromBr,parseGuideDate} from './loan-status.js';

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
  const positioned=original.includes('[Campos reconstruídos de caixas de texto do Word]')?original.split('[Campos reconstruídos de caixas de texto do Word]')[1].split('[Conteúdo de caixas de texto do Word]')[0]:'';
  const pdfColumns=original.includes('[Campos reconstruídos de colunas do PDF]')?original.split('[Campos reconstruídos de colunas do PDF]')[1]:'';
  const annotated=positioned+'\n'+pdfColumns+'\n'+first;
  const rawDates=[...new Set([...(first+'\n'+annex).matchAll(/\b(\d{2}\/\d{2}\/20\d{2})\b/g)].map(m=>m[1]))];
  const uniqueDates=rawDates.map(parseGuideDate).filter(d=>d.iso).map(d=>d.iso);
  const value={
    guide:extract(first,/Guia(?:\/Invoice)?\s*(?:n[º°o.]*)?\s*:\s*(\d{4}\/\d{1,4})/i),
    recipient:field(annotated,/^Nome\s*:\s*/i),
    institution:field(annotated,/^(?:Institui[cç][aã]o|Institution)\s*:\s*/i),
    country:field(annotated,/^(?:Pa[ií]s|Country)\s*:\s*/i),
    email:extract(first,/E-?mail\s*:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i),
    departmentHead:field(first,/^Contato chefia[^:]*:\s*/i),
    collection:field(annotated,/^Cole[cç][aã]o\s*:\s*/i),
    curator:field(annotated,/^Curador\s*:\s*/i),
    requestedBy:field(annotated,/^Solicitante\s*:\s*/i),
    shipment:field(annotated,/^Forma de Envio\s*:\s*/i),
    sentDate:extract(annotated,/(?:Data do envio|Loan date)[^\d]{0,80}(\d{2}\/\d{2}\/20\d{2})/i),
    dueDate:extract(annotated,/(?:Data da devolu[cç][aã]o|Return date)[^\d]{0,80}(\d{2}\/\d{2}\/20\d{2})/i),
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
  if(!value.sentDate&&rawDates.length>=1)value.sentDate=rawDates[0];
  if(!value.dueDate&&rawDates.length>=2)value.dueDate=rawDates[1];
  value.sentDateRaw=value.sentDate||null;
  value.dueDateRaw=value.dueDate||null;
  const sending=parseGuideDate(value.sentDateRaw),returning=parseGuideDate(value.dueDateRaw);
  value.sentDate=sending.iso;
  value.dueDate=returning.iso;
  value.datesNeedReview=Boolean(sending.ambiguous||returning.ambiguous||sending.invalid||returning.invalid);
  value.dateCheckNotes=[...((sending.ambiguous||sending.invalid)?[`Data de empréstimo literal ${sending.raw}: formato ambíguo ou inválido; conferir Guia Original`]:[]),...((returning.ambiguous||returning.invalid)?[`Data de devolução literal ${returning.raw}: formato ambíguo ou inválido; conferir Guia Original`]:[])];
  if(value.specimens)value.specimens=Number(value.specimens);
  if(value.volumes)value.volumes=Number(value.volumes);
  // Only exact text is stored; blank fields stay null. Layout extraction is not verification.
  return {fields:value,firstPageText:first,fullText:original.slice(0,90000),dateCandidates:uniqueDates,
    extractionNote:'Leitura automática preliminar. Campos dispersos em tabelas ou caixas de texto devem ser conferidos na guia original.'};
}

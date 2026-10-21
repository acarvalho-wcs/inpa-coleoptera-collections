// Strict public-only format. Do not accept original guide links, people,
// emails, private Drive references or unreviewed dates/destinations.
const labels=new Set(['EMP','DEV','TRAN','DOA','PER','MIX']);
const own=(o,names)=>Object.keys(o||{}).sort().join('|')===names.slice().sort().join('|');
const taxonName=s=>typeof s==='string'&&s.length>0&&s.length<=100&&/^[\p{L}\p{M} .-]+$/u.test(s);
const safeText=s=>typeof s==='string'&&s.length>0&&s.length<=320&&!/@|https?:|drive|[<>]/i.test(s);
export function projectPreliminary2025(data){
  if(!data||data.kind!=='inpa.coleoptera.preliminary-2025.v1'||data.year!=='2025'||
     !own(data,['kind','year','records','note'])||!safeText(data.note)||
     !Array.isArray(data.records)||data.records.length>100)throw Error('Formato de triagem 2025 inválido');
  const seen=new Set();
  return data.records.map((r,i)=>{
    if(!own(r,['number','type','specimenCount','displayTaxon','taxa','note'])||
       !/^\d{1,4}[a-z]?$/.test(r.number)||!labels.has(r.type)||
       !(r.specimenCount===null||(Number.isInteger(r.specimenCount)&&r.specimenCount>=0&&r.specimenCount<=1000000))||
       !safeText(r.displayTaxon)||!safeText(r.note)||
       !own(r.taxa,['order','families','subfamilies','genera','species','discrimination'])||
       ![null,'Coleoptera'].includes(r.taxa.order)||
       !['families','subfamilies','genera','species'].every(k=>Array.isArray(r.taxa[k])&&r.taxa[k].length<=30&&r.taxa[k].every(taxonName))||
       !safeText(r.taxa.discrimination))throw Error('Registro público 2025 inválido');
    const key=r.number+'|'+r.type;if(seen.has(key))throw Error('Movimentação duplicada');seen.add(key);
    return {
      id:'preliminary-2025-'+i,year:'2025',number:r.number,type:r.type,
      name:'Triagem taxonômica · guia 2025/'+r.number,
      researcher:null,recipient:null,requestedBy:null,
      family:r.displayTaxon,specimens:r.specimenCount,taxa:r.taxa,
      sentDate:null,dueDate:null,sentDateRaw:null,dueDateRaw:null,
      country:null,destination:null,originalUrl:null,sources:[],preview:true,preliminary:true,
      previewStatus:'TRIAGEM PRELIMINAR — '+r.note,
      canonical:{movement:{type:r.type},
        taxonomy:{classification:r.taxa.order==='Coleoptera'?'mixed':'pending',order:null,evidence:[]},
        loan:{sentDate:null,dueDate:null,dueSource:r.type==='EMP'?'missing':'not_applicable',returnStatus:'not_reconciled'}}
    };
  });
}

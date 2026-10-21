// Strict public-only format. Names of professional recipients/requesters may be
// shown as transcribed from original 2025 guides, as already done for 2026.
// Never accept email, phone, private links, document identifiers or inferred dates.
const labels=new Set(['EMP','DEV','TRAN','DOA','PER','MIX']);
const own=(o,names)=>Object.keys(o||{}).sort().join('|')===names.slice().sort().join('|');
const taxonName=s=>typeof s==='string'&&s.length>0&&s.length<=100&&/^[\p{L}\p{M} .-]+$/u.test(s);
const safeText=s=>typeof s==='string'&&s.length>0&&s.length<=320&&!/@|https?:|drive|[<>]/i.test(s);
const safeGuideName=name=>typeof name==='string'&&name.length>=2&&name.length<=160&&/^[\p{L}\p{M}\s.,'’/()&-]+$/u.test(name)&&!/[\r\n]/.test(name);

const LOCATIONS={
  'ufpr-curitiba':{institution:'Universidade Federal do Paraná (UFPR)',city:'Curitiba, Paraná',country:'Brasil',lat:-25.4463,lng:-49.23321,source:'https://www.ufpr.br/',precision:'city_approx'},
  'mzusp-sao-paulo':{institution:'Museu de Zoologia da Universidade de São Paulo (MZUSP)',city:'São Paulo, São Paulo',country:'Brasil',lat:-23.587919,lng:-46.610452,source:'https://cadastro.museus.gov.br/museus/museu-de-zoologia-da-universidade-de-sao-paulo-mzusp/',precision:'institution_approx'},
  'ufrpe-recife':{institution:'Universidade Federal Rural de Pernambuco (UFRPE)',city:'Recife, Pernambuco',country:'Brasil',lat:-8.06278,lng:-34.88889,source:'https://www.ufrpe.br/institucional/',precision:'city_approx'},
  'ufpr-palotina':{institution:'Universidade Federal do Paraná (UFPR) - Setor Palotina',city:'Palotina, Paraná',country:'Brasil',lat:-24.28,lng:-53.84,source:'https://palotina.ufpr.br/',precision:'city_approx'},
  'uema-caxias':{institution:'Universidade Estadual do Maranhão (UEMA) - CZMA',city:'Caxias, Maranhão',country:'Brasil',lat:-4.8656,lng:-43.3552,source:'https://www.uema.br/',precision:'city_approx'},
  'mpeg-belem':{institution:'Museu Paraense Emílio Goeldi (MPEG)',city:'Belém, Pará',country:'Brasil',lat:-1.452014,lng:-48.476673,source:'https://www.gov.br/museugoeldi/pt-br',precision:'institution_approx'},
  'unig-nova-iguacu':{institution:'Universidade Iguaçu (UNIG)',city:'Nova Iguaçu, Rio de Janeiro',country:'Brasil',lat:-22.75894,lng:-43.47384,source:'https://unig.br/',precision:'institution_approx'}
};

export function projectPreliminary2025(data){
  if(!data||data.kind!=='inpa.coleoptera.preliminary-2025.v1'||data.year!=='2025'||
     !own(data,['kind','year','records','note'])||!safeText(data.note)||
     !Array.isArray(data.records)||data.records.length>100)throw Error('Formato de triagem 2025 inválido');
  const seen=new Set();
  return data.records.map((r,i)=>{
    if(!own(r,['number','type','specimenCount','displayTaxon','taxa','note','locationCode','recipient','requestedBy'])||
       !/^\d{1,4}[a-z]?$/.test(r.number)||!labels.has(r.type)||
       !(r.specimenCount===null||(Number.isInteger(r.specimenCount)&&r.specimenCount>=0&&r.specimenCount<=1000000))||
       !safeText(r.displayTaxon)||!safeText(r.note)||!safeGuideName(r.recipient)||!safeGuideName(r.requestedBy)||!Object.hasOwn(LOCATIONS,r.locationCode)||
       !own(r.taxa,['order','families','subfamilies','genera','species','discrimination'])||
       ![null,'Coleoptera'].includes(r.taxa.order)||
       !['families','subfamilies','genera','species'].every(k=>Array.isArray(r.taxa[k])&&r.taxa[k].length<=30&&r.taxa[k].every(taxonName))||
       !safeText(r.taxa.discrimination))throw Error('Registro público 2025 inválido');
    const key=r.number+'|'+r.type;if(seen.has(key))throw Error('Movimentação duplicada');seen.add(key);
    const loc=LOCATIONS[r.locationCode];
    const destination={...loc,note:r.type==='DEV'?'Instituição vinculada à guia de devolução; não representa destino físico confirmado da remessa.':'Localização institucional aproximada; o documento não comprova entrega física.'};
    return {
      id:'preliminary-2025-'+i,year:'2025',number:r.number,type:r.type,
      name:'Triagem taxonômica · guia 2025/'+r.number,
      researcher:null,recipient:r.recipient,requestedBy:r.requestedBy,
      family:r.displayTaxon,specimens:r.specimenCount,taxa:r.taxa,
      sentDate:null,dueDate:null,sentDateRaw:null,dueDateRaw:null,
      country:destination.country,destination,originalUrl:null,sources:[],preview:true,preliminary:true,
      previewStatus:'TRIAGEM PRELIMINAR — '+r.note,
      canonical:{movement:{type:r.type},
        taxonomy:{classification:r.taxa.order==='Coleoptera'?'mixed':'pending',order:null,evidence:[]},
        loan:{sentDate:null,dueDate:null,dueSource:r.type==='EMP'?'missing':'not_applicable',returnStatus:'not_reconciled'}}
    };
  });
}

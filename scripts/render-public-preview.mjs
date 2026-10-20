import {loanStatus,showDate} from '../js/loan-status.js';
// Pre-render the anonymized public preview so useful content is visible even
// without running JS, while its full data remain Google Drive protected.
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ALLOWED=['country','dueDate','dueDateRaw','dueSource','family','number','originalUrl','recipient','requestedBy','sentDate','sentDateRaw','sources','specimenCount','status','taxa','type','year'].join(',');
const safePublicName=name=>typeof name==='string'&&name.length>=2&&name.length<=160&&
  /^[\p{L}\p{M}\s.,'’/()&-]+$/u.test(name)&&!/[\r\n]/.test(name);
const labels={EMP:'Empréstimo',DEV:'Devolução',DOA:'Doação',TRAN:'Transferência',PER:'Permuta',MIX:'Movimentação mista'};
export function renderPublicPreview(source,data,revision='local'){
  if(data?.kind!=='public-anonymized-preview'||!Array.isArray(data.records)||!data.records.length||data.records.length>100)
    throw Error('Public preview invalid');
  for(const r of data.records){
    if(Object.keys(r).sort().join(',')!==ALLOWED||!/^(20\d{2})$/.test(r.year)||
      !/^\d{1,4}$/.test(r.number)||!labels[r.type]||!Number.isInteger(r.specimenCount)||
      r.specimenCount<0||r.specimenCount>1000000||[r.country,r.family,r.status].some(x=>typeof x!=='string')||
      !safePublicName(r.recipient)||!safePublicName(r.requestedBy)||!r.taxa||r.taxa.order!=='Coleoptera'||!Array.isArray(r.sources)||!r.sources.length||r.sources.some(s=>!/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/.test(s.url)||!['PDF','Word'].includes(s.format))||r.originalUrl!==r.sources[0].url)
      throw Error('Unexpected public record fields');
  }
  const rows=data.records.map((r,i)=>({...r,id:`preview-${i}`,loan:{sentDate:r.sentDate,dueDate:r.dueDate,sentDateRaw:r.sentDateRaw,dueDateRaw:r.dueDateRaw,dueSource:r.dueSource,datesNeedReview:Boolean(r.sentDateRaw||r.dueDateRaw)}}));
  const statuses=rows.map(row=>loanStatus(row));
  const metrics=[
    ['PRAZO VENCIDO · A CONFERIR','mOverdue',statuses.filter(s=>s.code==='overdue').length,
      'Sem confirmação documental de devolução'],
    ['VENCEM EM ATÉ 30 DIAS','mSoon',statuses.filter(s=>s.code==='soon'||s.code==='today').length,
      'Prioridade de acompanhamento'],
    ['EMPRÉSTIMOS COM PRAZO','mTracked',statuses.filter((s,i)=>rows[i].type==='EMP'&&s.dueDate).length,
      'Guias documentadas; envio a conferir'],
    ['SEM PRAZO / A CONFERIR','mUnknown',statuses.filter((s,i)=>rows[i].type==='EMP'&&['unknown','date_check'].includes(s.code)).length,
      'Dados incompletos']
  ];
  const metricHtml='<section class="metrics" aria-label="Indicadores de prazos">'+metrics.map(([label,id,n,caption],i)=>
    `<article class="metric${i===0?' metric-attention':''}"><span${i===0?' id="overdueLabel"':''}>${escapeHtml(label)}</span><strong id="${id}">${n}</strong><small>${escapeHtml(caption)}</small></article>`).join('')+'</section>';
  const table=rows.map((r,i)=>{
    const st=statuses[i];
    return `<tr><td>${escapeHtml(r.year+'/'+r.number)}</td><td>${escapeHtml(r.year)}</td>`+
      `<td><div class="doc-name">${escapeHtml(r.recipient)}</div><div class="submeta">${escapeHtml(r.family)} · ${r.specimenCount} espécimes</div></td>`+
      `<td><div class="doc-name">${escapeHtml(r.requestedBy)}</div><div class="submeta">Transcrito da guia</div></td>`+
      `<td><span class="type-tag">${escapeHtml(labels[r.type])}</span></td>`+
      `<td><span class="taxon-summary">${escapeHtml([r.taxa.order,...r.taxa.families,...r.taxa.subfamilies,...r.taxa.genera,...r.taxa.species].join(' · '))}</span></td>`+
      `<td><strong class="due-value">${escapeHtml(st.displayedDue||showDate(st.dueDate))}</strong>${st.needsOriginal?'<small> Conferir Guia Original</small>':''}</td>`+
      `<td><span class="deadline-tag ${st.code}">${escapeHtml(st.label)}</span></td>`+
      `<td><div class="guide-actions">${r.sources.map(s=>'<a class="guide-open-btn" href="'+escapeHtml(s.url)+'" target="_blank" rel="noopener noreferrer">Ver Guia '+escapeHtml(s.format)+' ↗</a>').join(' ')}<button class="guide-details-btn" data-open="preview-${i}">Detalhes</button></div></td></tr>`;
  }).join('');
  let html=source;
  const replace=(regex,text)=>{if(!regex.test(html))throw Error('Unexpected HTML template');html=html.replace(regex,()=>text);};
  replace(/<section class="metrics" aria-label="Indicadores de prazos">[\s\S]*?<\/section>/,metricHtml);
  replace(/<tbody id="recordsBody">[\s\S]*?<\/tbody>/,`<tbody id="recordsBody">${table}</tbody>`);
  replace(/<span id="countLabel">[\s\S]*?<\/span>/,`<span id="countLabel">Prévia parcial · ${rows.length} guias verificadas</span>`);
  replace(/<div id="notice" class="notice" role="status">[\s\S]*?<\/div>/,
    `<div id="notice" class="notice" role="status"><strong>PRÉVIA DOCUMENTAL:</strong> ${rows.length} guias de Coleoptera. Nome e Solicitante transcritos das guias; sujeitos à conferência. Datas ambíguas exigem revisão do original. Demais campos e documentos exigem Google Drive autorizado.</div>`);
  const v=/^[0-9a-f]{7,40}$/i.test(revision)?revision.slice(0,12):'local';
  replace(/<script type="module" src="\.\/js\/app\.js"><\/script>/,`<script type="module" src="./js/app.js?v=${v}"></script>`);
  replace(/<script src="\.\/config\.js"><\/script>/,`<script src="./config.js?v=${v}"></script>`);
  replace(/<link rel="stylesheet" href="\.\/styles\.css"\/>/,`<link rel="stylesheet" href="./styles.css?v=${v}"/>`);
  return html;
}

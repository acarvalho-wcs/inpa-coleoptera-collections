import {loanStatus,showDate} from '../js/loan-status.js';
// Pre-render the anonymized public preview so useful content is visible even
// without running JS, while its full data remain Google Drive protected.
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ALLOWED=['country','dueDate','family','number','sentDate','sentDateRaw','specimenCount','status','type','year'].join(',');
const labels={EMP:'Empréstimo',DEV:'Devolução',DOA:'Doação',TRAN:'Transferência',PER:'Permuta'};
export function renderPublicPreview(source,data,revision='local'){
  if(data?.kind!=='public-anonymized-preview'||!Array.isArray(data.records)||!data.records.length||data.records.length>100)
    throw Error('Public preview invalid');
  for(const r of data.records){
    if(Object.keys(r).sort().join(',')!==ALLOWED||!/^(20\d{2})$/.test(r.year)||
      !/^\d{1,4}$/.test(r.number)||!labels[r.type]||!Number.isInteger(r.specimenCount)||
      r.specimenCount<0||r.specimenCount>1000000||[r.country,r.family,r.status].some(x=>typeof x!=='string'))
      throw Error('Unexpected public record fields');
  }
  const rows=data.records.map((r,i)=>({...r,id:`preview-${i}`,loan:{sentDate:r.sentDate,dueDate:r.dueDate,sentDateRaw:r.sentDateRaw,datesNeedReview:Boolean(r.sentDateRaw)}}));
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
      `<td><div class="doc-name">Acesso restrito</div><div class="submeta">${escapeHtml(r.family)} · ${r.specimenCount} espécimes</div></td><td>Acesso restrito</td>`+
      `<td><span class="type-tag">${escapeHtml(labels[r.type])}</span></td>`+
      `<td><span class="taxon-tag coleoptera">Coleoptera</span></td>`+
      `<td><strong class="due-value">${escapeHtml(st.displayedDue||showDate(st.dueDate))}</strong>${st.needsOriginal?'<small> Conferir Guia Original</small>':''}</td>`+
      `<td><span class="deadline-tag ${st.code}">${escapeHtml(st.label)}</span></td>`+
      `<td><button class="link-btn" data-open="preview-${i}">Ver guia ↗</button></td></tr>`;
  }).join('');
  let html=source;
  const replace=(regex,text)=>{if(!regex.test(html))throw Error('Unexpected HTML template');html=html.replace(regex,()=>text);};
  replace(/<section class="metrics" aria-label="Indicadores de prazos">[\s\S]*?<\/section>/,metricHtml);
  replace(/<tbody id="recordsBody">[\s\S]*?<\/tbody>/,`<tbody id="recordsBody">${table}</tbody>`);
  replace(/<span id="countLabel">[\s\S]*?<\/span>/,`<span id="countLabel">Prévia parcial · ${rows.length} guias verificadas</span>`);
  replace(/<div id="notice" class="notice" role="status">[\s\S]*?<\/div>/,
    `<div id="notice" class="notice" role="status"><strong>PRÉVIA DOCUMENTAL:</strong> ${rows.length} guias de Coleoptera. Datas ambíguas devem ser conferidas na Guia Original. Para consultar Nome, Solicitante e demais campos é necessário acesso autorizado ao Google Drive.</div>`);
  const v=/^[0-9a-f]{7,40}$/i.test(revision)?revision.slice(0,12):'local';
  replace(/<script type="module" src="\.\/js\/app\.js"><\/script>/,`<script type="module" src="./js/app.js?v=${v}"></script>`);
  replace(/<script src="\.\/config\.js"><\/script>/,`<script src="./config.js?v=${v}"></script>`);
  replace(/<link rel="stylesheet" href="\.\/styles\.css"\/>/,`<link rel="stylesheet" href="./styles.css?v=${v}"/>`);
  return html;
}

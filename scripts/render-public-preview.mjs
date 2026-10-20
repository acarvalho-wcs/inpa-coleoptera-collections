// Embed only reviewed, non-sensitive public summary data at build time.
const expectedKeys='country,family,number,specimenCount,status,type,year';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={EMP:'Empréstimo',DEV:'Devolução',DOA:'Doação',TRAN:'Transferência',PER:'Permuta'};
export function renderPublicPreview(source,data,revision='local'){
  if(data?.kind!=='public-anonymized-preview'||!Array.isArray(data.records)||!data.records.length||data.records.length>100)
    throw Error('Public preview data is invalid');
  for(const r of data.records){
    if(Object.keys(r).sort().join(',')!==expectedKeys||!/^\d{4}$/.test(r.year)||
      !/^\d{1,4}$/.test(r.number)||!types[r.type]||
      !Number.isInteger(r.specimenCount)||r.specimenCount<0||r.specimenCount>1000000||
      [r.country,r.family,r.status].some(v=>typeof v!=='string'))
      throw Error('Public preview contains unexpected fields or invalid values');
  }
  const total=data.records.length,loans=data.records.filter(r=>r.type==='EMP').length,
    returned=data.records.filter(r=>r.type==='DEV').length,
    specimens=data.records.reduce((n,r)=>n+r.specimenCount,0);
  let html=source;
  const patch=(expression,replacement)=>{
    if(!expression.test(html))throw Error('HTML template no longer matches public preview renderer');
    html=html.replace(expression,()=>replacement);
  };
  const metric=(label,id,value,caption,extraId='')=>
    '<article class="metric"><span'+(extraId?' id="'+extraId+'"':'')+'>'+esc(label)+
    '</span><strong id="'+id+'">'+value+'</strong><small'+(id==='mPdfs'?' id="lastMetricCaption"':'')+'>'+
    esc(caption)+'</small></article>';
  const metrics='<section class="metrics" aria-label="Indicadores da seleção">'+
    metric('GUIAS IDENTIFICADAS','mRecords',total,'Prévia parcial de 2026')+
    metric('EMPRÉSTIMOS (EMP)','mLoans',loans,'Classificação documental, não remessa confirmada')+
    metric('DEVOLUÇÕES (DEV)','mReturns',returned,'Sem conciliação de devoluções')+
    metric('ESPÉCIMES NAS GUIAS','mPdfs',specimens.toLocaleString('pt-BR'),
      'Contagem documental a validar','lastMetricLabel')+'</section>';
  patch(/<section class="metrics" aria-label="Indicadores da seleção">[\s\S]*?<\/section>/,metrics);
  patch(/<div id="notice" class="notice" role="status">[\s\S]*?<\/div>/,
    '<div id="notice" class="notice" role="status"><strong>PRÉVIA PÚBLICA:</strong> '+total+
    ' guias de Coleoptera de 2026 e '+specimens.toLocaleString('pt-BR')+
    ' espécimes documentados. Recorte parcial, sujeito a validação. Guias originais exigem autorização Google.</div>');
  patch(/<p id="canonicalStatus">[\s\S]*?<\/p>/,
    '<p id="canonicalStatus">PRÉVIA ANONIMIZADA · '+total+
    ' guias de Coleoptera. Para ampliar a base, conecte o Google Drive.</p>');
  patch(/<span id="countLabel">[^<]*<\/span>/,
    '<span id="countLabel">Prévia pública anonimizada · '+total+' guias verificadas (recorte parcial)</span>');
  patch(/<th id="personColumn">[^<]*<\/th>/,
    '<th id="personColumn">Família / identificação</th>');
  const rows=data.records.map((r,i)=>
    '<tr><td>'+esc(r.year)+'/'+esc(r.number)+'</td><td>'+esc(r.year)+'</td>'+
    '<td><div class="doc-name">'+esc(r.family)+'</div><div class="submeta">'+
    esc(r.specimenCount)+' espécimes · '+esc(r.country)+'</div></td>'+
    '<td><span class="type-tag">'+esc(types[r.type])+'</span></td>'+
    '<td><span class="taxon-tag coleoptera">Coleoptera</span></td><td>Resumo</td>'+
    '<td><button class="link-btn" data-open="preview-'+i+'">Detalhes ↗</button></td></tr>').join('');
  patch(/<tbody id="recordsBody">[\s\S]*?<\/tbody>/,'<tbody id="recordsBody">'+rows+'</tbody>');
  // Avoid serving a cached older application script or config after a Pages deploy.
  const version=/^[0-9a-f]{7,40}$/i.test(revision)?revision.slice(0,12):'local';
  patch(/<script type="module" src="\.\/js\/app\.js"><\/script>/,
    '<script type="module" src="./js/app.js?v='+version+'"></script>');
  patch(/<script src="\.\/config\.js"><\/script>/,
    '<script src="./config.js?v='+version+'"></script>');
  patch(/<link rel="stylesheet" href="\.\/styles\.css"\/>/,
    '<link rel="stylesheet" href="./styles.css?v='+version+'"/>');
  return html;
}

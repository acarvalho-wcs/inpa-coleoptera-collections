import {DriveClient} from './drive.js';
import {consolidate,filterRecords,TYPE_LABELS} from './records.js?v=public-names-20261020';
import {centerForCountry} from './countries.js';
import {canonicalKey,extractFacts,applyReview,createSnapshot,readSnapshot} from './canonical.js';
import {extractDocumentText} from './document-extract.js';
import {loanStatus,priority,showDate,localToday,validIso} from './loan-status.js';

const $=id=>document.getElementById(id);
const config=window.INPA_CONFIG||{};
const client=new DriveClient(config.googleClientId||'');
const state={tree:null,years:new Map(),loaded:new Map(),rows:[],filtered:[],currentYear:config.startingYear||'2026',
  currentTab:'table',selected:null,map:null,mapMarkers:null,loading:false,canonical:new Map(),transcripts:new Map(),
  scanning:false,lastSnapshot:null,previewMode:false,previewCache:[],scannedOnce:new Set()};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const message=(text,type='')=>{$('notice').textContent=text;$('notice').className=`notice ${type}`;};
const typeLabel=r=>TYPE_LABELS[r.type]||'Não classificada';
function setBusy(busy){
  state.loading=busy;
  for(const id of ['yearSelect','searchInput','typeSelect','formatSelect','taxonSelect','statusSelect'])
    $(id).disabled=busy||(!client.token&&!state.previewMode);
  for(const id of ['reloadBtn','exportBtn','scanBtn','snapshotBtn','jsonBtn'])$(id).disabled=busy||!client.token;
}
function setConnected(on){
  $('connectionBadge').classList.toggle('active',on);
  $('connectionBadge').innerHTML=`<span class="status-dot"></span> ${on?'Google Drive conectado':'Prévia · Drive não conectado'}`;
  $('connectBtn').hidden=on;$('disconnectBtn').hidden=!on;setBusy(state.loading);
}
function updateYears(){
  const years=[...state.years.keys()].sort().reverse();
  $('yearSelect').innerHTML='<option value="all">Todos os anos disponíveis</option>'+years.map(y=>`<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join('');
  if(!state.years.has(state.currentYear))state.currentYear=years[0]||'all';
  $('yearSelect').value=state.currentYear;
}
async function connect(){
  setBusy(true);
  try{
    await client.signIn();
    state.tree=await client.getFolderTree(config.driveRootFolderId||'1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP');
    state.years=new Map(state.tree.years.map(f=>[f.name,f.id]));
    await loadCanonicalIndex();
    state.previewMode=false;state.rows=[];
    setConnected(true);updateYears();await loadSelection(true);
    message('Drive conectado. Para visualizar prazos de outras guias, execute a triagem canônica. Os dados extraídos exigem revisão.','success');
  }catch(e){
    if(!client.token){state.previewMode=state.previewCache.length>0;state.rows=state.previewCache.slice();}
    setConnected(Boolean(client.token));render();
    message(`Não foi possível conectar: ${e.message}. A prévia continua disponível.`,'error');
  }finally{setBusy(false);}
}
function attachCanonical(row){
  const c=state.canonical.get(canonicalKey(row))||[...state.canonical.values()].find(v=>v.sourceId===row.id||(v.documents||[]).some(d=>(row.sources||[]).some(s=>s.id===d.id)));if(!c)return;
  row.canonical=c;row.taxonomicOrder=c.taxonomy?.order||null;row.family=c.taxonomy?.family||null;
  row.country=c.destination?.country||null;row.city=c.destination?.city||null;
  row.institution=c.destination?.institution||null;row.specimens=c.specimenCount||null;
  row.reviewed=c.validation?.status==='reviewed';
}
async function loadYear(year,refresh=false){
  if(!refresh&&state.loaded.has(year))return state.loaded.get(year);
  const folder=state.years.get(year);if(!folder)return [];
  const rows=consolidate(await client.folderDocuments(folder),year);
  rows.forEach(attachCanonical);state.loaded.set(year,rows);return rows;
}
async function loadSelection(refresh=false){
  if(!client.token)return;setBusy(true);
  try{
    const years=state.currentYear==='all'?[...state.years.keys()].sort().reverse():[state.currentYear];
    let rows=[];
    for(const year of years){message(`Lendo guias do Google Drive: ${year}...`);rows.push(...await loadYear(year,refresh));}
    state.rows=rows;render();
    message(`${rows.length} guias consolidadas. Os prazos só aparecem quando extraídos dos documentos. A ausência de DEV não comprova atraso.`,'success');
  }catch(e){message(`Falha de consulta: ${e.message}`,'error');}finally{setBusy(false);}
}
function filters(){return {query:$('searchInput').value,type:$('typeSelect').value,format:$('formatSelect').value};}
function taxonTag(r){const code=r.canonical?.taxonomy?.classification||'pending';return `<span class="taxon-tag ${code}">${escapeHtml(({coleoptera:'Coleoptera',other:'Outra ordem',mixed:'Mista',pending:'Pendente'})[code]||code)}</span>`;}
function statusTag(row){const s=loanStatus(row);return `<span class="deadline-tag ${s.code}">${escapeHtml(s.label)}</span>`;}
const guideNames=r=>({
  name:r.preview?r.recipient||null:r.canonical?.guide?.fields?.recipient||r.researcher||null,
  requestedBy:r.preview?r.requestedBy||null:r.canonical?.guide?.fields?.requestedBy||null,
  nameFromGuide:Boolean(r.preview?r.recipient:r.canonical?.guide?.fields?.recipient)
});
function dueLabel(row){const s=loanStatus(row);return s.dueSource==='not_applicable'||s.dueSource==='return_guide'?'Não aplicável':s.displayedDue;}
function dueExtra(row){const s=loanStatus(row);return s.dueSource==='one_year'?'Estimativa: +1 ano':s.dueSource==='ambiguous_document'?'Conferir formato na guia':s.needsOriginal?'Conferir data na guia original':'';}

function render(){
  const selectedTaxon=$('taxonSelect').value,statusFilter=$('statusSelect').value;
  const rows=filterRecords(state.rows,filters()).filter(r=>(selectedTaxon==='all'||(r.canonical?.taxonomy?.classification||'pending')===selectedTaxon)&&
    (statusFilter==='all'||loanStatus(r).code===statusFilter)).sort((a,b)=>priority(a)-priority(b));
  state.filtered=rows;
  const statuses=rows.map(r=>loanStatus(r));
  $('mOverdue').textContent=statuses.filter(s=>s.code==='overdue').length.toLocaleString('pt-BR');
  $('mSoon').textContent=statuses.filter(s=>s.code==='soon'||s.code==='today').length.toLocaleString('pt-BR');
  $('mTracked').textContent=statuses.filter((s,i)=>rows[i].type==='EMP'&&s.dueDate).length.toLocaleString('pt-BR');
  $('mUnknown').textContent=statuses.filter((s,i)=>rows[i].type==='EMP'&&['unknown','date_check'].includes(s.code)).length.toLocaleString('pt-BR');
  $('personColumn').textContent='Nome (destinatário)';
  $('countLabel').textContent=state.previewMode?`${rows.length} guias na prévia parcial de 2026`:`${rows.length} registros na seleção · ${state.rows.length} carregados`;
  $('recordsBody').innerHTML=rows.length?rows.map(r=>{
    const status=loanStatus(r);
    const names=guideNames(r);
    return `<tr><td>${escapeHtml(r.number?`${r.year}/${r.number}`:'—')}</td><td>${escapeHtml(r.year||'—')}</td>`+
      `<td><div class="doc-name">${escapeHtml(names.name||'Não extraído')}</div><div class="submeta">${escapeHtml(r.preview?r.family:(names.nameFromGuide?'Nome confirmado no texto':'Identificação sugerida pelo nome do arquivo'))}</div></td>`+
      `<td><div class="doc-name">${escapeHtml(names.requestedBy||'Não extraído')}</div><div class="submeta">${escapeHtml(r.preview?'Transcrito da guia · conferência pendente':'Campo Solicitante da guia')}</div></td>`+
      `<td><span class="type-tag">${escapeHtml(typeLabel(r))}</span></td><td>${taxonTag(r)}</td>`+
      `<td><strong class="due-value">${escapeHtml(dueLabel(r))}</strong><div class="submeta">${escapeHtml(dueExtra(r))}</div></td>`+
      `<td>${statusTag(r)}</td><td><button class="link-btn" data-open="${escapeHtml(r.id)}">Ver guia ↗</button></td></tr>`;
  }).join(''):'<tr><td colspan="9" class="empty">Nenhuma guia corresponde aos filtros selecionados.</td></tr>';
  renderCanonicalStatus();if(state.currentTab==='map')renderMap();
}
function pair(label,value){return `<div class="detail-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value===null||value===undefined||value===''?'Não identificado':value)}</strong></div>`;}
function showDetails(r){
  const status=loanStatus(r),c=r.canonical||{},f=c.guide?.fields||{},loan=c.loan||{};
  $('detailTitle').textContent=`Guia ${r.year}/${r.number||'s/n'}${r.preview?' · prévia pública':''}`;
  $('detailDeadline').innerHTML=`<div><small>DEVOLUÇÃO PREVISTA</small><strong>${escapeHtml(dueLabel(r))}</strong><p>${escapeHtml(status.basisLabel||'')} ${status.needsOriginal?'· CONFERIR GUIA ORIGINAL':''}</p></div>`+
    `<div>${statusTag(r)}<p>${escapeHtml(r.preview?'Prévia documental. Verifique o original após autenticação.':
    'Prazo calculado para acompanhamento; confirmar datas, prorrogações e devolução na Guia Original.')}</p></div>`;
  const common=[pair('Movimentação',typeLabel(r)),pair('Grupo taxonômico',c.taxonomy?.order||r.taxonomicOrder||'Coleoptera (prévia)'),
    pair('Família',f.family||r.family),pair('Espécimes',c.specimenCount??r.specimens),
    pair('Data de empréstimo (literal na guia)',loan.sentDateRaw||r.sentDateRaw||showDate(loan.sentDate||r.sentDate)),
    pair('Devolução prevista (literal na guia)',loan.dueDateRaw||r.dueDateRaw||showDate(loan.dueDate||r.dueDate)),
    pair('Prazo efetivo / origem',`${dueLabel(r)} · ${status.basisLabel}`),
    pair('Verificação de formato das datas',status.needsOriginal?'CONFERIR GUIA ORIGINAL: formatos dia/mês/ano e mês/dia/ano':'Sem ambiguidade identificada'),
    pair('Prorrogação',showDate(loan.extensionDueDate)),pair('Devolução efetivamente confirmada',showDate(loan.returnedDate))];
  if(r.preview){
    $('detailBody').innerHTML=common.join('')+pair('Nome (destinatário)',r.recipient)+
      pair('Solicitante',r.requestedBy)+pair('País',r.country)+pair('Observação',r.previewStatus)+
      pair('Origem dos nomes','Transcrição das guias originais de 2026; dados sujeitos à conferência curatorial')+
      pair('Alcance dos dados','Nomes e resumo documental públicos; contatos e guia integral exigem Google Drive autorizado');
    $('guideCompleteness').hidden=true;document.querySelector('#details .edit-panel').hidden=true;
    document.querySelector('#details .dialog-foot').hidden=true;return;
  }
  const list=[...common,
    pair('Nome (destinatário)',f.recipient||r.researcher),pair('Instituição',c.destination?.institution||f.institution||r.institution),
    pair('País',c.destination?.country||f.country||r.country),pair('Cidade',c.destination?.city||r.city),
    pair('Contato (e-mail)',f.email),pair('Contato da chefia',f.departmentHead),
    pair('Coleção',f.collection),pair('Curador',f.curator),pair('Solicitante',f.requestedBy),
    pair('Forma de envio',f.shipment),pair('Volumes',f.volumes),pair('Preservação',f.preservation),
    pair('Filo',f.phylum),pair('Classe',f.className),pair('Ordem (texto)',f.order),
    pair('Outros táxons',f.other),pair('Material discriminado',f.discrimination),
    pair('Observações',f.observations),pair('Autorização',f.authorizedBy),
    pair('Estado da devolução',r.type==='DEV'?'Devolução registrada nesta guia (-DEV)':loan.returnStatus==='returned'?'Confirmada':loan.returnStatus==='partial'?'Parcial':'Não conciliada'),
    pair('Evidência da devolução',loan.returnEvidence),pair('Notas curatoriais',c.validation?.notes),
    pair('Alertas de auditoria',c.validation?.issues?.join(' · '))];
  $('detailBody').innerHTML=list.join('');
  $('guideCompleteness').hidden=false;
  $('guideTranscript').textContent=state.transcripts.get(r.id)||'Clique em “Ler todos os campos da guia” para extrair o documento nesta sessão.';
  $('sourceLinks').innerHTML=(r.sources||[]).map(s=>`<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(s.webViewLink||`https://drive.google.com/file/d/${encodeURIComponent(s.id)}/view`)}">${escapeHtml(s.name||'Original')}</a>`).join(' ');
  document.querySelector('#details .edit-panel').hidden=false;
  document.querySelector('#details .dialog-foot').hidden=false;
  $('detailCountry').value=c.destination?.country||r.country||'';
  $('detailInstitution').value=c.destination?.institution||r.institution||'';
  $('detailOrder').value=c.taxonomy?.order||r.taxonomicOrder||'';
  $('detailFamily').value=c.taxonomy?.family||r.family||'';
  $('detailClass').value=c.taxonomy?.classification||'pending';
  $('detailDue').value=validIso(loan.dueDate)||'';
  $('detailExtension').value=validIso(loan.extensionDueDate)||'';
  $('detailReturnStatus').value=loan.returnStatus||'not_reconciled';
  $('detailReturnedDate').value=validIso(loan.returnedDate)||'';
  $('detailReturnEvidence').value=loan.returnEvidence||'';
  $('detailNotes').value=c.validation?.notes||'';
  $('originalLink').href=r.url;
}
async function openDetails(id){
  const row=state.filtered.find(r=>r.id===id)||state.rows.find(r=>r.id===id);
  if(!row)return;state.selected=row;showDetails(row);$('details').showModal();
  if(!row.preview&&!state.transcripts.has(row.id)){
    $('guideTranscript').textContent='Lendo documento original com sua autorização Google...';
    try{
      const text=await extractDocumentText(row,client);
      state.transcripts.set(row.id,text);
      const existing=row.canonical;
      const extracted=extractFacts(text,row);
      if(existing){
        // Do not overwrite manually reviewed status or deadline extensions.
        existing.guide={...extracted.guide,...existing.guide,fields:{...extracted.guide.fields,...existing.guide?.fields}};
        existing.loan=existing.loan||{};
        existing.loan.sentDateRaw=extracted.loan.sentDateRaw;
        existing.loan.dueDateRaw=extracted.loan.dueDateRaw;
        existing.loan.datesNeedReview=extracted.loan.datesNeedReview;
        if(extracted.loan.sentDateRaw && !extracted.loan.sentDate)existing.loan.sentDate=null;
        else if(!existing.loan.sentDate)existing.loan.sentDate=extracted.loan.sentDate;
        if(extracted.loan.dueDateRaw && !extracted.loan.dueDate)existing.loan.dueDate=null;
        else if(!existing.loan.dueDate)existing.loan.dueDate=extracted.loan.dueDate;
        if(!existing.specimenCount)existing.specimenCount=extracted.specimenCount;
      }else row.canonical=extracted;
      state.canonical.set(row.canonical.key,row.canonical);
      attachCanonical(row);
      if(state.selected===row){showDetails(row);}
      render();
    }catch(e){
      if(state.selected===row)$('guideTranscript').textContent=`Não foi possível extrair o texto: ${e.message}. Use “Abrir guia no Google Drive” para consultar o documento completo.`;
    }
  }
}
function saveMetadata(event){
  event.preventDefault();const r=state.selected;if(!r||r.preview)return;
  const base=r.canonical||extractFacts('',r);
  try{
    const updated=applyReview(base,{classification:$('detailClass').value,order:$('detailOrder').value,
      family:$('detailFamily').value,country:$('detailCountry').value,institution:$('detailInstitution').value,
      dueDate:$('detailDue').value||null,extensionDueDate:$('detailExtension').value||null,
      returnedDate:$('detailReturnedDate').value||null,returnStatus:$('detailReturnStatus').value,
      returnEvidence:$('detailReturnEvidence').value,notes:$('detailNotes').value});
    r.canonical=updated;state.canonical.set(updated.key,updated);attachCanonical(r);
    $('details').close();render();
    message('Revisão aplicada à sessão. Salve o índice canônico no Drive para conservar as alterações.','success');
  }catch(e){message(`Revisão não salva: ${e.message}`,'error');}
}
function exportCsv(){
  if(!client.token)return;
  const fields=['year','number','recipient','requestedBy','type','family','country','sentDateRaw','dueDateRaw','dueDate','dueSource','deadlineStatus','returnStatus','name','url'];
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv='\ufeff'+fields.join(';')+'\r\n'+state.filtered.map(r=>{
    const s=loanStatus(r),c=r.canonical||{};
    const data={...r,recipient:guideNames(r).name,requestedBy:guideNames(r).requestedBy,
      sentDateRaw:c.loan?.sentDateRaw,dueDateRaw:c.loan?.dueDateRaw,dueDate:s.dueDate,dueSource:s.dueSource,
      deadlineStatus:s.label,returnStatus:c.loan?.returnStatus};
    return fields.map(k=>q(data[k])).join(';');
  }).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='inpa-acompanhamento-de-prazos.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function loadMapLibrary(){
  if(window.L)return true;
  const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(link);
  return new Promise(resolve=>{const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=()=>resolve(Boolean(window.L));script.onerror=()=>resolve(false);document.head.append(script);});
}
async function renderMap(){
  const box=$('destinationMap'), groups=new Map();
  for(const row of state.filtered){const coords=centerForCountry(row.country);if(!coords)continue;
    const key=row.country.toLocaleLowerCase('pt-BR');
    if(!groups.has(key))groups.set(key,{country:row.country,coords,rows:[]});
    groups.get(key).rows.push(row);
  }
  const missing=state.filtered.length-[...groups.values()].reduce((n,g)=>n+g.rows.length,0);
  $('mapCount').textContent=`${groups.size} países de destino · ${state.filtered.length-missing} guias com país informado · ${missing} sem georreferenciamento. Centro aproximado de cada país.`;
  if(!groups.size){if(state.map){state.map.remove();state.map=null;}box.innerHTML='<div class="empty-map">Sem países de destino identificados. A localização só aparece quando documentada.</div>';return;}
  if(!await loadMapLibrary()){box.innerHTML='<div class="empty-map">O mapa depende da biblioteca Leaflet, indisponível nesta conexão.</div>';return;}
  if(!state.map){box.innerHTML='';state.map=L.map(box,{scrollWheelZoom:false}).setView([0,-25],2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors'}).addTo(state.map);
    state.mapMarkers=L.layerGroup().addTo(state.map);
    box.addEventListener('click',e=>{const target=e.target.closest('[data-map-open]');if(target)openDetails(target.dataset.mapOpen);});
  }
  state.mapMarkers.clearLayers();const bounds=[];
  for(const group of groups.values()){
    const count=group.rows.length,overdue=group.rows.filter(x=>loanStatus(x).code==='overdue').length;
    const color=overdue?'#b25f36':'#16665d';
    const popup=`<div class="destination-card"><div class="destination-head"><strong>${escapeHtml(group.country)}</strong><span>${count} guia${count===1?'':'s'}</span></div>`+
      `<p class="destination-subtitle">${overdue?`${overdue} com prazo vencido, devolução a conferir`:'Sem prazo vencido identificado nesta seleção'}</p>`+
      `<div class="destination-list">`+group.rows.slice(0,30).map(r=>{
        const s=loanStatus(r);
        const names=guideNames(r);
        return `<div class="destination-record"><div><b>Guia ${escapeHtml(r.year+'/'+r.number)}</b> · ${escapeHtml(r.family||'Coleoptera')}`+
          `<span>${escapeHtml(r.specimens||r.canonical?.specimenCount||'—')} espécimes · ${escapeHtml(typeLabel(r))}</span>`+
          `<span><b>Nome:</b> ${escapeHtml(names.name||'Não extraído')}</span>`+
          `<span><b>Solicitante:</b> ${escapeHtml(names.requestedBy||'Não extraído')}</span>`+
          `<span>Devolução prevista: <b>${escapeHtml(dueLabel(r))}</b> ${escapeHtml(dueExtra(r))}</span>`+
          `<span class="status-text ${s.code}">${escapeHtml(s.label)}</span></div>`+
          `<button type="button" data-map-open="${escapeHtml(r.id)}">Ver guia</button></div>`;
      }).join('')+'</div><small>Marcador aproximado do país; não da instituição.</small></div>';
    L.circleMarker(group.coords,{radius:9+Math.min(7,count),color,fillColor:color,fillOpacity:.65,weight:2}).bindPopup(popup,{maxWidth:420,minWidth:280}).addTo(state.mapMarkers);
    bounds.push(group.coords);
  }
  state.map.fitBounds(bounds.length>1?bounds:[[bounds[0][0]-1,bounds[0][1]-1],[bounds[0][0]+1,bounds[0][1]+1]],{padding:[40,40],maxZoom:5});
  setTimeout(()=>state.map?.invalidateSize(),80);
}
async function downloadOriginal(){
  const r=state.selected;if(!r||r.preview)return;
  try{const buf=await client.downloadTextBuffer(r.id);const url=URL.createObjectURL(new Blob([buf],{type:r.mimeType}));
    const a=document.createElement('a');a.href=url;a.download=r.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }catch(e){message(`Falha ao baixar original: ${e.message}`,'error');}
}
function renderCanonicalStatus(){
  const counts={coleoptera:0,other:0,mixed:0,pending:0};
  for(const r of state.rows)counts[r.canonical?.taxonomy?.classification||'pending']++;
  $('canonicalStatus').textContent=state.previewMode?
    `2026 AUDITADO · 100 documentos de guias (83 Word, 17 PDF), 16 pares consolidados: 84 movimentações distintas, 14 Coleoptera e 70 outros grupos. Prazos e devoluções ainda exigem conciliação.`:
    `${state.rows.length} guias · ${counts.coleoptera} Coleoptera com evidência · ${counts.pending} pendentes de triagem · ${counts.other} outras ordens · ${counts.mixed} mistas. Datas exigem conferência.`;
}
async function loadCanonicalIndex(){
  state.canonical.clear();state.lastSnapshot=null;
  const candidates=(state.tree?.root||[]).filter(f=>/^inpa-coleoptera-canonical-.*\.json$/i.test(f.name))
    .sort((a,b)=>(b.modifiedTime||b.name).localeCompare(a.modifiedTime||a.name));
  if(!candidates.length)return;
  try{const snapshot=await client.loadCanonicalSnapshot(candidates[0].id);
    for(const r of readSnapshot(snapshot))state.canonical.set(r.key,r);
    state.lastSnapshot=candidates[0];
  }catch(e){message(`Índice encontrado, mas não carregado: ${e.message}`,'error');}
}
async function scanBatch(){
  if(state.scanning||!client.token)return;
  const queue=state.rows.filter(r=>!state.scannedOnce.has(canonicalKey(r))&&
    (!state.canonical.has(canonicalKey(r))||!state.canonical.get(canonicalKey(r))?.guide?.fields)).slice(0,25);
  if(!queue.length){message('Não há mais guias pendentes nesta seleção.','success');return;}
  state.scanning=true;setBusy(true);let success=0,failed=0;
  try{
    for(let i=0;i<queue.length;i++){
      const r=queue[i];message(`Extração ${i+1}/${queue.length}: guia ${r.year}/${r.number||'s/n'}`);
      try{const text=await extractDocumentText(r,client);state.transcripts.set(r.id,text);
        const extracted=extractFacts(text,r),previous=r.canonical;
        if(previous?.validation?.status==='reviewed'){
          extracted.validation=previous.validation;
          extracted.destination=previous.destination;
          extracted.loan.extensionDueDate=previous.loan?.extensionDueDate||null;
          extracted.loan.returnStatus=previous.loan?.returnStatus||extracted.loan.returnStatus;
          extracted.loan.returnEvidence=previous.loan?.returnEvidence||extracted.loan.returnEvidence;
          extracted.loan.returnedDate=previous.loan?.returnedDate||null;
        }
        r.canonical=extracted;success++;
      }catch(e){r.canonical=extractFacts('',r);r.canonical.validation.issues.push(`Falha de extração: ${e.message}`);failed++;}
      state.scannedOnce.add(canonicalKey(r));state.canonical.set(r.canonical.key,r.canonical);attachCanonical(r);
    }
    render();message(`${success} documentos lidos; ${failed} pendentes. Prazos identificados precisam ser validados antes de confirmar atrasos. Salve o índice no Drive.`, 'success');
  }finally{state.scanning=false;setBusy(false);}
}
function exportCanonical(){
  if(!client.token)return;
  const data=createSnapshot([...state.canonical.values()]);
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='inpa-coleoptera-revisao-'+localToday()+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  message('Índice para auditoria exportado. Armazene somente no Drive autorizado, nunca no GitHub público.','success');
}
async function saveCanonical(){
  if(!state.canonical.size){message('Extraia ao menos um documento antes de salvar.','error');return;}
  if(!confirm('Salvar novo índice no Google Drive com os registros desta sessão? Os arquivos originais não serão alterados.'))return;
  try{await client.requestCanonicalWrite();const data=createSnapshot([...state.canonical.values()]);
    const result=await client.saveCanonicalSnapshot(config.driveRootFolderId,data);
    message(`Índice salvo no Drive: ${result.name} · ${data.recordCount} registros.`,'success');
  }catch(e){message(`Falha ao salvar no Drive: ${e.message}. Exporte JSON e solicite arquivamento na pasta autorizada.`,'error');}
}
async function loadPublicPreview(){
  try{
    const response=await fetch('./data/public-preview.json',{cache:'no-store'});
    if(!response.ok)throw Error('Arquivo de prévia não encontrado');
    const data=await response.json();
    if(data.kind!=='public-anonymized-preview'||!Array.isArray(data.records))throw Error('Prévia incompatível');
    const rows=data.records.map((r,i)=>({id:`preview-${i}`,year:r.year,number:r.number,
      researcher:null,name:`${r.family} · guia ${r.year}/${r.number}`,type:r.type,mimeType:'application/pdf',
      sources:[],family:r.family,taxonomicOrder:'Coleoptera',specimens:r.specimenCount,country:r.country,
      sentDate:r.sentDate||null,dueDate:r.dueDate||null,previewStatus:r.status,preview:true,
      recipient:r.recipient,requestedBy:r.requestedBy,
      canonical:{movement:{type:r.type},taxonomy:{classification:'coleoptera',order:'Coleoptera',evidence:[]},
        loan:{sentDate:r.sentDate||null,dueDate:r.dueDate||null,
          sentDateRaw:r.sentDateRaw||null,dueDateRaw:r.dueDateRaw||null,dueSource:r.dueSource||null,datesNeedReview:Boolean(r.sentDateRaw||r.dueDateRaw),returnStatus:'not_reconciled'}}}));
    if(client.token)return;
    state.previewCache=rows;state.rows=rows.slice();state.previewMode=true;
    $('yearSelect').innerHTML='<option value="2026">2026 · prévia</option>';
    $('yearSelect').value='2026';setBusy(false);render();
    $('connectBtn').disabled=false;$('connectBtn').textContent='Conectar Google Drive';setConnected(false);
    message(`TRIAGEM 2026 · ${rows.length} guias de Coleoptera com evidência documental. Datas ambíguas exigem conferência na Guia Original; sem conciliação de devoluções. Nome e Solicitante transcritos das guias; informações complementares exigem acesso ao Drive.`);
  }catch(e){message(`Prévia indisponível: ${e.message}`,'error');}
}
$('connectBtn').addEventListener('click',()=>{
  if(!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(client.clientId||'')){$('oauthSetup').showModal();return;}
  connect();
});
$('disconnectBtn').addEventListener('click',()=>{
  client.disconnect();state.loaded.clear();state.canonical.clear();state.transcripts.clear();
  state.rows=state.previewCache.slice();state.previewMode=true;setConnected(false);render();
  message('Desconectado. Exibindo novamente apenas a prévia pública.');
});
$('reloadBtn').addEventListener('click',()=>loadSelection(true));
$('yearSelect').addEventListener('change',e=>{state.currentYear=e.target.value;if(client.token)loadSelection();});
for(const id of ['searchInput','typeSelect','formatSelect','taxonSelect','statusSelect'])
  $(id).addEventListener(id==='searchInput'?'input':'change',render);
$('recordsBody').addEventListener('click',event=>{const b=event.target.closest('[data-open]');if(b)openDetails(b.dataset.open);});
$('closeDialog').addEventListener('click',()=>$('details').close());
$('editForm').addEventListener('submit',saveMetadata);
$('downloadFileBtn').addEventListener('click',downloadOriginal);
$('exportBtn').addEventListener('click',exportCsv);
$('scanBtn').addEventListener('click',scanBatch);
$('jsonBtn').addEventListener('click',exportCanonical);
$('snapshotBtn').addEventListener('click',saveCanonical);
for(const tab of document.querySelectorAll('[data-tab]'))tab.addEventListener('click',()=>{
  state.currentTab=tab.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==`tab-${state.currentTab}`);
  if(state.currentTab==='map')renderMap();
});
$('closeOauth').addEventListener('click',()=>$('oauthSetup').close());
$('oauthForm').addEventListener('submit',event=>{
  event.preventDefault();const id=$('oauthClientId').value.trim();
  if(!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)){
    message('Client ID inválido. Não informe Client Secret nem token.','error');return;
  }
  client.clientId=id;$('oauthSetup').close();connect();
});
loadPublicPreview();

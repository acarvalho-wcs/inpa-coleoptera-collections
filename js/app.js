import {DriveClient} from './drive.js';
import {consolidate,filterRecords,stats,TYPE_LABELS} from './records.js';
import {centerForCountry} from './countries.js';
import {canonicalKey,extractFacts,applyReview,createSnapshot,readSnapshot} from './canonical.js';
import {extractDocumentText} from './document-extract.js';
const $=id=>document.getElementById(id);
const config=window.INPA_CONFIG||{};
const client=new DriveClient(config.googleClientId||'');
const state={tree:null,years:new Map(),loaded:new Map(),rows:[],filtered:[],currentYear:config.startingYear||'2026',currentTab:'table',selected:null,map:null,mapMarkers:null,loading:false,canonical:new Map(),scanning:false,lastSnapshot:null,previewMode:false,previewCache:[]};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const message=(text,type='')=>{$('notice').textContent=text;$('notice').className=`notice ${type}`;};
const setBusy=(busy)=>{
  state.loading=busy;
  for(const id of ['yearSelect','searchInput','typeSelect','formatSelect','taxonSelect'])$(id).disabled=busy||(!client.token&&!state.previewMode);
  for(const id of ['reloadBtn','exportBtn','scanBtn','snapshotBtn','jsonBtn'])$(id).disabled=busy||!client.token;
};
function setConnected(on){$('connectionBadge').classList.toggle('active',on);$('connectionBadge').innerHTML=`<span class="status-dot"></span> ${on?'Google Drive conectado':'Não conectado'}`;$('connectBtn').hidden=on;$('disconnectBtn').hidden=!on;setBusy(state.loading);}
function updateYears(){const select=$('yearSelect');const opts=[...state.years.keys()].sort().reverse().map(y=>`<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`);select.innerHTML=`<option value="all">Todos os anos (2009–2026)</option>${opts.join('')}`;if(!state.years.has(state.currentYear))state.currentYear=[...state.years.keys()].sort().reverse()[0]||'all';select.value=state.currentYear;}
async function connect(){setBusy(true);try{await client.signIn();state.tree=await client.getFolderTree(config.driveRootFolderId||'1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP');state.years=new Map(state.tree.years.map(f=>[f.name,f.id]));await loadCanonicalIndex();state.previewMode=false;state.rows=[];setConnected(true);updateYears();await loadSelection(true);message('Consulta conectada ao Google Drive com permissao somente de leitura. Guias originais permanecem no Drive.','success');}catch(e){setConnected(false);message(`Não foi possível conectar: ${e.message}. A prévia pública permanece disponível.`,'error');}finally{setBusy(false);}}
async function loadYear(year,refresh=false){if(!refresh&&state.loaded.has(year))return state.loaded.get(year);const folder=state.years.get(year);if(!folder)return [];const docs=await client.folderDocuments(folder);const records=consolidate(docs,year);records.forEach(attachCanonical);state.loaded.set(year,records);return records;}
async function loadSelection(refresh=false){if(!client.token)return;setBusy(true);try{const years=state.currentYear==='all'?[...state.years.keys()].sort().reverse():[state.currentYear];let rows=[];for(const year of years){message(`Lendo documentos do Drive: ${year}...`);rows.push(...await loadYear(year,refresh));}state.rows=rows;render();message(`${state.rows.length} registros consolidados a partir de ${years.length} pasta(s). O tipo é sugerido pelo nome do arquivo; a situação de empréstimos exige conciliação histórica.`,'success');}catch(e){message(`Erro ao consultar Google Drive: ${e.message}`,'error');}finally{setBusy(false);}}
function currentFilters(){return {query:$('searchInput').value,year:'all',type:$('typeSelect').value,format:$('formatSelect').value};}
function typeTag(row){let cls=row.type==='OUTRO'?'warn':['DEV','DOA','TRAN','PER'].includes(row.type)?'muted':'';return `<span class="type-tag ${cls}">${escapeHtml(TYPE_LABELS[row.type]||'Não classificado')}</span>`;}
function render(){const view=$('taxonSelect').value;const rows=filterRecords(state.rows,currentFilters()).filter(r=>view==='all'||(r.canonical?.taxonomy.classification||'pending')===view);state.filtered=rows;const s=stats(rows);$('mRecords').textContent=s.records.toLocaleString('pt-BR');$('mLoans').textContent=s.loans.toLocaleString('pt-BR');$('mReturns').textContent=s.returns.toLocaleString('pt-BR');$('mPdfs').textContent=state.previewMode?rows.reduce((sum,r)=>sum+(r.specimens||0),0).toLocaleString('pt-BR'):s.pdfs.toLocaleString('pt-BR');$('lastMetricLabel').textContent=state.previewMode?'ESPÉCIMES NAS GUIAS':'PDFS PREFERIDOS';$('lastMetricCaption').textContent=state.previewMode?'Contagem documental parcial, a validar':'Quando existe cópia PDF e Word';$('personColumn').textContent=state.previewMode?'Família / identificação':'Pesquisador / identificação';$('countLabel').textContent=state.previewMode?`Prévia pública anonimizada · ${rows.length} de 4 guias verificadas (base parcial)`:`${rows.length.toLocaleString('pt-BR')} registros na seleção`;
  $('recordsBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.number?`${r.year}/${r.number}`:'—')}</td><td>${escapeHtml(r.year||'—')}</td><td><div class="doc-name" title="${escapeHtml(r.name)}">${escapeHtml(r.researcher||r.name)}</div><div class="submeta">${escapeHtml(r.number?r.name:'Sem identificador padronizado')}</div></td><td>${typeTag(r)}</td><td>${taxonTag(r)}</td><td>${r.mimeType==='application/pdf'?'PDF':'Word'}${r.sources.length>1?' · +cópia':''}</td><td><button class="link-btn" data-open="${escapeHtml(r.id)}">Detalhes ↗</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">Nenhum registro corresponde aos filtros selecionados.</td></tr>';if(state.currentTab==='map')renderMap();renderCanonicalStatus();}
function pair(label,val){return `<div class="detail-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(val==null||val===''?'Não confirmado':val)}</strong></div>`;}
function openDetails(id){const r=state.filtered.find(x=>x.id===id)||state.rows.find(x=>x.id===id);if(!r)return;state.selected=r;if(r.preview){$('detailTitle').textContent=`Guia ${r.year}/${r.number} · prévia`; $('detailBody').innerHTML=[pair('Grupo taxonômico','Coleoptera'),pair('Famílias',r.family),pair('Espécimes na guia',r.specimens),pair('Tipo documental',TYPE_LABELS[r.type]),pair('País declarado na guia',r.country),pair('Situação',r.previewStatus),pair('Fonte','Google Drive institucional; documento acessível somente após login')].join('');document.querySelector('#details .edit-panel').hidden=true;document.querySelector('#details .dialog-foot').hidden=true;$('details').showModal();return;}document.querySelector('#details .edit-panel').hidden=false;document.querySelector('#details .dialog-foot').hidden=false;$('detailTitle').textContent=r.number?`Guia ${r.year}/${r.number}`:'Documento sem número identificado';$('detailBody').innerHTML=[pair('Pesquisador / identificação',r.researcher||r.name),pair('Movimentação no arquivo',TYPE_LABELS[r.type]||'Não classificada'),pair('Pasta / ano',r.year),pair('Formato principal',r.mimeType==='application/pdf'?'PDF':'Word'),pair('Documentos correspondentes',r.sources.length),pair('Instituição',r.institution),pair('País de destino',r.country),pair('Ordem taxonômica',r.taxonomicOrder),pair('Família',r.family),pair('Situação do empréstimo','Não conciliada automaticamente'),pair('Triagem canônica',r.canonical?.taxonomy?.classification||'Não processado'),pair('Evidência taxonômica',r.canonical?.taxonomy?.evidence?.map(e=>e.quote).join(' / ')||'Não extraída'),pair('Envio (proposta)',r.canonical?.loan?.sentDate),pair('Devolução prevista (proposta)',r.canonical?.loan?.dueDate),pair('Avisos de auditoria',r.canonical?.validation?.issues?.join('; '))].join('');$('detailCountry').value=r.country||'';$('detailInstitution').value=r.institution||'';$('detailOrder').value=r.taxonomicOrder||'';$('detailFamily').value=r.family||r.canonical?.taxonomy?.family||'';$('detailClass').value=r.canonical?.taxonomy?.classification||'pending';$('detailNotes').value=r.canonical?.validation?.notes||'';$('originalLink').href=r.url;$('details').showModal();}
function saveMetadata(ev){ev.preventDefault();const r=state.selected;if(!r)return;r.country=$('detailCountry').value.trim()||null;r.institution=$('detailInstitution').value.trim()||null;r.taxonomicOrder=$('detailOrder').value.trim()||null;r.family=$('detailFamily').value.trim()||null;r.reviewed=true;const base=r.canonical||extractFacts('',r);r.canonical=applyReview(base,{classification:$('detailClass').value,order:r.taxonomicOrder,family:r.family,country:r.country,institution:r.institution,notes:$('detailNotes').value});state.canonical.set(r.canonical.key,r.canonical);$('details').close();render();message('Metadados aplicados apenas nesta sessão. Exporte o CSV se precisar preservá-los para validação posterior.','success');}
function exportCsv(){const fields=['year','number','researcher','type','country','institution','taxonomicOrder','family','reviewed','name','url','id'];const cell=v=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\ufeff'+fields.join(';')+'\r\n'+state.filtered.map(r=>fields.map(f=>cell(r[f])).join(';')).join('\r\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=`inpa-metadados-${state.currentYear}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function loadMapLibrary(){if(window.L)return true;const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);return new Promise(resolve=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>resolve(Boolean(window.L));s.onerror=()=>resolve(false);document.head.append(s);});}
async function renderMap(){const box=$('destinationMap');const points=state.filtered.map(r=>({...r,coords:centerForCountry(r.country)})).filter(r=>r.coords);$('mapCount').textContent=`${points.length} registros com país validado e coordenada aproximada. Outros documentos não são georreferenciados por inferência.`;if(!points.length){if(state.map){state.map.remove();state.map=null;}box.innerHTML='<div class="empty-map">Nenhum destino validado nesta seleção. Abra uma guia e registre o país documentado para visualizar sua posição.</div>';return;}
  if(!await loadMapLibrary()){box.innerHTML='<div class="empty-map">O mapa precisa de acesso à biblioteca Leaflet. Países confirmados: '+escapeHtml([...new Set(points.map(p=>p.country))].join(', '))+'</div>';return;}
  if(!state.map){box.innerHTML='';state.map=L.map(box,{scrollWheelZoom:false}).setView([0,-25],2);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors'}).addTo(state.map);state.mapMarkers=L.layerGroup().addTo(state.map);}state.mapMarkers.clearLayers();const bounds=[];for(const p of points){const [lat,lng]=p.coords;L.circleMarker([lat,lng],{radius:8,color:'#165a56',fillColor:'#2a9182',fillOpacity:.65,weight:2}).bindPopup(`<strong>${escapeHtml(p.researcher||p.name)}</strong><div>${escapeHtml(p.country)} · ${escapeHtml(p.year)} · ${escapeHtml(TYPE_LABELS[p.type]||p.type)}</div>`).addTo(state.mapMarkers);bounds.push([lat,lng]);}state.map.fitBounds(bounds.length>1?bounds:[[bounds[0][0]-.5,bounds[0][1]-.5],[bounds[0][0]+.5,bounds[0][1]+.5]],{padding:[40,40],maxZoom:5});setTimeout(()=>state.map?.invalidateSize(),80);}
async function downloadOriginal(){const r=state.selected;if(!r)return;try{message('Preparando original do Drive...');const buf=await client.downloadTextBuffer(r.id);const url=URL.createObjectURL(new Blob([buf],{type:r.mimeType}));const a=document.createElement('a');a.href=url;a.download=r.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);message('Arquivo original enviado ao navegador sem salvamento no servidor.','success');}catch(e){message(`Falha ao baixar original: ${e.message}`,'error');}}
$('connectBtn').addEventListener('click',()=>{if(!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(client.clientId||'')){$('oauthSetup').showModal();return;}connect();});$('disconnectBtn').addEventListener('click',()=>{client.disconnect();state.loaded.clear();state.rows=[];state.filtered=[];state.canonical.clear();state.previewMode=state.previewCache.length>0;state.rows=state.previewCache.slice();setConnected(false);render();message('Sessão desconectada. A prévia pública voltou a ser exibida. Nenhum documento foi enviado para o GitHub.');});$('reloadBtn').addEventListener('click',()=>loadSelection(true));$('yearSelect').addEventListener('change',e=>{state.currentYear=e.target.value;loadSelection(false);});['searchInput','typeSelect','formatSelect','taxonSelect'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',render));$('recordsBody').addEventListener('click',e=>{const btn=e.target.closest('[data-open]');if(btn)openDetails(btn.dataset.open);});$('closeDialog').addEventListener('click',()=>$('details').close());$('editForm').addEventListener('submit',saveMetadata);$('downloadFileBtn').addEventListener('click',downloadOriginal);$('exportBtn').addEventListener('click',exportCsv);$('scanBtn').addEventListener('click',scanBatch);$('jsonBtn').addEventListener('click',exportCanonical);$('snapshotBtn').addEventListener('click',saveCanonical);document.querySelectorAll('[data-tab]').forEach(t=>t.addEventListener('click',()=>{state.currentTab=t.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===t)));document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==`tab-${state.currentTab}`);if(state.currentTab==='map')renderMap();}));
$('closeOauth').addEventListener('click',()=> $('oauthSetup').close());
$('oauthForm').addEventListener('submit',ev=>{
  ev.preventDefault();const id=$('oauthClientId').value.trim();
  if(!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)) {message('Client ID inválido: use o identificador de aplicação Web, não um segredo ou token.','error');return;}
  client.clientId=id;$('oauthSetup').close();connect();
});
async function loadPublicPreview(){
  try{
    const response=await fetch('./data/public-preview.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Arquivo de prévia não encontrado');
    const data=await response.json();
    if(data.kind!=='public-anonymized-preview'||!Array.isArray(data.records))throw new Error('Estrutura da prévia inválida');
    const rows=data.records.map((r,i)=>({id:`preview-${i}`,year:r.year,number:r.number,
      researcher:null,name:`${r.family} · guia ${r.year}/${r.number}`,type:r.type,
      mimeType:'application/pdf',sources:[],family:r.family,taxonomicOrder:'Coleoptera',
      specimens:r.specimenCount,country:r.country,previewStatus:r.status,preview:true,
      canonical:{taxonomy:{classification:'coleoptera',order:'Coleoptera',evidence:[]}}}));
    if(client.token)return;
    state.previewCache=rows;state.rows=rows.slice();state.previewMode=true;
    $('yearSelect').innerHTML='<option value="2026">2026 · prévia</option>';
    $('yearSelect').value='2026';setBusy(false);render();
    $('connectBtn').textContent='Conectar Google Drive';
    $('connectBtn').disabled=false;
    $('connectionBadge').innerHTML='<span class="status-dot"></span> Prévia pública · Drive não conectado';
    message('PRÉVIA PÚBLICA · 4 guias de Coleoptera de 2026, com dados resumidos e sem nomes de pesquisadores. Este é um recorte parcial extraído do Drive; empréstimos, envios e devoluções ainda não foram conciliados. Para consultar o acervo completo, conecte o Google Drive.');
  }catch(err){message(`Não foi possível carregar a prévia: ${err.message}`,'error');}
}
loadPublicPreview();

function taxonTag(row){const status=row.canonical?.taxonomy?.classification||'pending';const labels={coleoptera:'Coleoptera',other:'Outra ordem',mixed:'Misto / ambíguo',pending:'Pendente'};return `<span class="taxon-tag ${status}">${labels[status]}</span>`;}
function attachCanonical(row){const canon=state.canonical.get(canonicalKey(row));if(!canon)return;
  row.canonical=canon;
  row.taxonomicOrder=canon.taxonomy?.order||null;row.family=canon.taxonomy?.family||null;
  row.country=canon.destination?.country||null;row.city=canon.destination?.city||null;row.institution=canon.destination?.institution||null;
  row.reviewed=canon.validation?.status==='reviewed';
}
function renderCanonicalStatus(){const rows=state.rows;
  const counts={coleoptera:0,other:0,mixed:0,pending:0};
  for(const r of rows)counts[r.canonical?.taxonomy?.classification||'pending']++;
  const total=counts.coleoptera+counts.other+counts.mixed+counts.pending;
  $('canonicalStatus').textContent=state.previewMode?`PRÉVIA ANONIMIZADA · ${total} guias de Coleoptera (recorte parcial de 2026). A extração integral requer OAuth Google; nenhuma guia original foi publicada.`:`${total} guias na seleção · ${counts.coleoptera} Coleoptera com evidência · ${counts.other} outras ordens · ${counts.mixed} mistas · ${counts.pending} pendentes. Os documentos são processados no navegador autenticado. As datas propostas não confirmam atrasos.`;
}
async function loadCanonicalIndex(){
  state.canonical.clear();state.lastSnapshot=null;
  const root=state.tree?.root||[];
  const snapshots=root.filter(f=>/^inpa-coleoptera-canonical-.*\.json$/i.test(f.name))
    .sort((a,b)=>(b.modifiedTime||b.name).localeCompare(a.modifiedTime||a.name));
  if(!snapshots.length)return;
  try{const d=await client.loadCanonicalSnapshot(snapshots[0].id);
    for(const record of readSnapshot(d))state.canonical.set(record.key,record);
    state.lastSnapshot=snapshots[0];
  }catch(e){message(`Índice no Drive encontrado, mas não carregado: ${e.message}`,'error');}
}
async function scanBatch(){
  if(state.scanning||!client.token)return;
  const queue=state.rows.filter(r=>!state.canonical.has(canonicalKey(r))).slice(0,25);
  if(!queue.length){message('Não há mais guias pendentes de extração nesta seleção.','success');return;}
  state.scanning=true;setBusy(true);
  let successes=0,failures=0;
  try{
    for(let i=0;i<queue.length;i++){
      const r=queue[i];message(`Triagem ${i+1}/${queue.length}: ${r.year}/${r.number||'s/n'} (${r.name})`);
      try{
        const text=await extractDocumentText(r,client);
        r.canonical=extractFacts(text,r);successes++;
      }catch(e){r.canonical=extractFacts('',r);r.canonical.validation.issues.push(`Falha de extração: ${e.message}`);failures++;}
      state.canonical.set(r.canonical.key,r.canonical);attachCanonical(r);
    }
    render();message(`Lote concluído: ${successes} textos processados; ${failures} com necessidade de conferência. Salve a revisão no Drive ou exporte JSON para não perder o trabalho.`,'success');
  }finally{state.scanning=false;setBusy(false);}
}
function exportCanonical(){
  const data=createSnapshot([...state.canonical.values()]);
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(b),a=document.createElement('a');
  a.href=url;a.download=`inpa-coleoptera-canonical-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
  message(`Exportados ${data.recordCount} registros auditáveis. Armazene este JSON somente no Drive autorizado, nunca no GitHub público.`,'success');
}
async function saveCanonical(){
  if(!state.canonical.size){message('Nenhum registro extraído para salvar.','error');return;}
  if(!confirm('Criar um novo índice canônico no Google Drive com os registros e dados documentais desta sessão? O arquivo ficará sob as permissões da pasta compartilhada.'))return;
  try{
    // Request access directly from user action to avoid browser popup blocking.
    await client.requestCanonicalWrite();
    const data=createSnapshot([...state.canonical.values()]);
    const saved=await client.saveCanonicalSnapshot(config.driveRootFolderId,data);
    message(`Índice canônico salvo no Google Drive: ${saved.name} (${data.recordCount} registros). Originais não alterados.`, 'success');
  }catch(e){message(`Não foi possível salvar no Drive: ${e.message}. Utilize "Exportar JSON auditável" e peça a um editor da pasta para arquivar.`, 'error');}
}

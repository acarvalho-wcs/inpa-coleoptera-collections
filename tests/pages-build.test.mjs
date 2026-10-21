import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const builder = join(root, 'scripts', 'build-pages.mjs');
const run = (where, googleClientId) => spawnSync(process.execPath, [builder, where], {
  cwd: root, encoding: 'utf8',
  env: { ...process.env, GOOGLE_OAUTH_CLIENT_ID: googleClientId }
});

const makeOut = () => mkdtemp(join(tmpdir(), 'inpa-pages-test-'));

test('builds an empty-data public site shell without OAuth', async () => {
  const out = await makeOut();
  try {
    const result = run(out, '');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OAuth: pending/);
    const config = await readFile(join(out, 'config.js'), 'utf8');
    assert.match(config, /"googleClientId": ""/);
    assert.doesNotMatch(config, /client_secret|access_token|refresh_token/i);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('rejects injected or malformed client IDs', async () => {
  const out = await makeOut();
  try {
    assert.notEqual(run(out, "abc'; alert('x').apps.googleusercontent.com").status, 0);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('publishes only app allowlist and public OAuth client ID', async () => {
  const out = await makeOut();
  const clientId = '123456789-sample.apps.googleusercontent.com';
  try {
    const result = run(out, clientId);
    assert.equal(result.status, 0, result.stderr);
    const top = (await readdir(out)).sort();
    assert.deepEqual(top, ['.nojekyll', 'assets', 'config.js', 'data', 'index.html', 'js', 'styles.css']);
    assert.deepEqual((await readdir(join(out, 'js'))).sort(), ['app.js', 'canonical.js', 'countries.js', 'document-extract.js', 'drive.js', 'guide-fields.js', 'loan-status.js', 'preliminary-2025.js', 'private-index.js', 'public-catalog.js', 'records.js', 'taxon-format.js']);
    assert.deepEqual((await readdir(join(out, 'data'))).sort(),['public-catalog.json', 'public-preview.json', 'triage-2026-audit.json']);
    assert.deepEqual((await readdir(join(out,'assets'))).sort(),['dynastes-hercules-macho.png','inpa.png','invertebrados.png','wcs-brasil.png']);
    const html=await readFile(join(out,'index.html'),'utf8');
    assert.match(html,/Curadoria e Gestão/);
    assert.match(html,/Apoio/);
    const cfg = await readFile(join(out, 'config.js'), 'utf8');
    assert.match(cfg, /123456789-sample\.apps\.googleusercontent\.com/);
    assert.doesNotMatch(cfg, /client_secret|access_token|refresh_token/i);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('public preview includes only explicitly approved name fields from sourced 2026 guides',async()=>{
  const sample=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  assert.equal(sample.kind,'public-anonymized-preview');
  assert.equal(sample.records.length,14);
  assert.equal(sample.records.filter(r=>r.type==='EMP').length,8);
  assert.equal(sample.records.filter(r=>r.type==='DOA').length,4)
  assert.equal(sample.records.filter(r=>r.type==='DEV').length,1)
  assert.equal(sample.records.filter(r=>r.type==='MIX').length,1);
  assert.equal(sample.records.reduce((n,r)=>n+r.specimenCount,0),864);
  assert.equal(sample.records.some(r=>r.number==='013'&&r.status.includes('conferir Guia Original')&&r.sentDate===null),true);
  assert.equal(sample.records.some(r=>r.number==='049'&&r.dueDate==='2027-05-27'&&r.dueSource==='one_year'),true);
  assert.equal(sample.records.some(r=>r.number==='024'&&r.dueDateRaw==='12/03/2026'&&r.dueDate===null),true);
  for(const r of sample.records){
    assert.deepEqual(Object.keys(r).sort(), ['country','destination','dueDate','dueDateRaw','dueSource','family','number','originalUrl','recipient','requestedBy','sentDate','sentDateRaw','sources','specimenCount','status','taxa','type','year']);
    assert.equal(r.year,'2026');
  }
  const raw=JSON.stringify(sample);
  assert.doesNotMatch(raw,/@|sourceId|filenameRecipient|access_token|phone|email/i);
  assert.equal(sample.records.find(r=>r.number==='035').recipient,'Dras. Neusa Hamada e Gabrielle Jorge');
  assert.equal(sample.records.find(r=>r.number==='035').requestedBy,'Gabrielle Matos');
  assert.equal(sample.records.find(r=>r.number==='063').recipient,'Dra. Letizia Migliore.');
  assert.equal(sample.records.find(r=>r.number==='063').requestedBy,'Eric Toshiki Miyamoto Satô');
  for(const r of sample.records){
    assert.ok(r.recipient.length>1&&r.requestedBy.length>1);
    assert.doesNotMatch(r.recipient+r.requestedBy,/@|https?:|\d{5}/i);
  }
});

test('public snapshot HTML contains expected return dates and deadline columns',async()=>{
  const out=await makeOut();
  try{
    assert.equal(run(out,'').status,0);
    const html=await readFile(join(out,'index.html'),'utf8');
    assert.match(html,/12\/12\/2026/);
    assert.match(html,/14\/12\/2026/);
    assert.match(html,/27\/07\/2028/);
    assert.match(html,/DEVOLUÇÃO PREVISTA|Devolução prevista/);
    assert.match(html,/id="mOverdue"/);
    assert.match(html,/Neusa Hamada e Gabrielle Jorge/);
    assert.match(html,/Gabrielle Matos/);
    assert.match(html,/Aline Sampaio/);
    assert.match(html,/https:\/\/drive\.google\.com\/file\/d\//);assert.doesNotMatch(html,/mailto:|access_token/i);
  }finally{await rm(out,{recursive:true,force:true});}
});

test('public page displays full recipient and requester in separate columns',async()=>{
  const out=await makeOut();try{
    assert.equal(run(out,'').status,0);
    const html=await readFile(join(out,'index.html'),'utf8');
    assert.match(html,/Nome \(destinatário\)/);
    assert.match(html,/<th>Solicitante<\/th>/);
    assert.match(html,/Dras\. Neusa Hamada e Gabrielle Jorge/);
    assert.match(html,/Eric Toshiki Miyamoto Satô/);
    assert.doesNotMatch(html,/Acesso restrito/);
    assert.doesNotMatch(html,/Envio futuro/);
  } finally {await rm(out,{recursive:true,force:true});}
});


test('2026 preview keeps mixed and returned guide types separate',async()=>{
  const dataset=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  const guide=id=>dataset.records.find(r=>r.number===id);
  assert.equal(guide('037').type,'MIX');
  assert.equal(guide('052').type,'DEV');
  assert.match(guide('046').status,/10 exemplares.*8 em trânsito/);
  assert.match(guide('047').status,/7 Eumolpinae.*1 Bruchinae/);
  const {loanStatus}=await import('../js/loan-status.js');
  assert.equal(loanStatus({type:'EMP',loan:guide('049')},'2026-10-20').dueSource,'one_year');
});

test('public preview rejects unsafe name fields and unapproved metadata',async()=>{
  const {renderPublicPreview}=await import('../scripts/render-public-preview.mjs');
  const source=await readFile(join(root,'index.html'),'utf8');
  const data=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  data.records[0].requestedBy='nomes@example.org';
  assert.throws(()=>renderPublicPreview(source,data,'abcdef012345'),/Unexpected public record fields/);
  data.records[0].requestedBy='Aline Sampaio';
  data.records[0].email='dontpublish@example.org';
  assert.throws(()=>renderPublicPreview(source,data,'abcdef012345'),/Unexpected public record fields/);
});

test('2026 audit confirms complete collection review without inventing new Coleoptera guides',async()=>{
  const audit=JSON.parse(await readFile(join(root,'data','triage-2026-audit.json'),'utf8'));
  const preview=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  assert.equal(audit.schema,'inpa.coleoptera.taxonomy-audit.v1');
  assert.equal(audit.inventory.guideFiles,100);
  assert.equal(audit.inventory.pdf+audit.inventory.docx,audit.inventory.guideFiles);
  assert.equal(audit.inventory.distinctDocumentMovements,audit.inventory.guideFiles-audit.inventory.pairedPdfWordCopies);
  assert.equal(audit.classification.coleopteraMovements,preview.records.length);
  assert.equal(audit.classification.nonColeopteraMovements,70);
  const a=JSON.stringify(audit);
  assert.doesNotMatch(a,/access_token|client_secret|private_key|drive[.]google[.]com/i);
  const result=run(await makeOut(),'');
  assert.equal(result.status,0,result.stderr);
});

test('static HTML italicizes documented taxa while leaving ranks and qualifiers upright',async()=>{
 const out=await makeOut();
 try{
  assert.equal(run(out,'').status,0);
  const html=await readFile(join(out,'index.html'),'utf8');
  assert.match(html,/<i class="taxon-scientific">Agrilus oceanicus<\/i>/);
  assert.match(html,/<i class="taxon-scientific">Haplocauda lata<\/i>/);
  assert.match(html,/Ordem: Coleoptera/);
  assert.doesNotMatch(html,/<i class="taxon-scientific">(?:Coleoptera|Buprestidae|Scirtiidae|sp\.|spp\.)<\/i>/);
 }finally{await rm(out,{recursive:true,force:true});}
});

test('hero uses supplied Dynastes hercules drawing instead of rings or star',async()=>{
  const out=await makeOut();
  try{
    const result=run(out,'');
    assert.equal(result.status,0,result.stderr);
    const html=await readFile(join(out,'index.html'),'utf8');
    assert.match(html,/<img class="hero-beetle" src="\.\/assets\/dynastes-hercules-macho\.png"/);
    assert.doesNotMatch(html,/class="ring ring[12]"|class="beetle">✳/);
    const file=await readFile(join(out,'assets','dynastes-hercules-macho.png'));
    assert.equal(file.subarray(1,4).toString('ascii'),'PNG');
    assert.ok(file.length>10000);
  }finally{await rm(out,{recursive:true,force:true});}
});

test('scientific italics load a real italic face and preserve fallback for Safari',async()=>{
  const out=await makeOut();
  try{
    const result=run(out,'');
    assert.equal(result.status,0,result.stderr);
    const html=await readFile(join(out,'index.html'),'utf8');
    const css=await readFile(join(out,'styles.css'),'utf8');
    assert.match(html,/DM\+Sans:ital,wght@0,400;[\s\S]*?1,400/);
    assert.match(html,/<i class="taxon-scientific">Agrilus oceanicus<\/i>/);
    assert.match(css,/\.taxon-scientific\s*\{[^}]*font-style:italic!important/);
    assert.match(css,/\.taxon-scientific\s*\{[^}]*font-synthesis:style/);
  }finally{await rm(out,{recursive:true,force:true});}
});
test('quality tab has proper spacing and responsive cards',async()=>{
  const out=await makeOut();
  try{
    assert.equal(run(out,'').status,0);
    const html=await readFile(join(out,'index.html'),'utf8');
    const css=await readFile(join(out,'styles.css'),'utf8');
    assert.match(html,/<section class="audit-summary"/);
    assert.match(css,/#tab-quality \.audit-summary\s*\{[^}]*padding:/);
    assert.match(css,/#tab-quality \.quality-grid\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css,/@media\(max-width:760px\)\s*\{/);
  }finally{await rm(out,{recursive:true,force:true});}
});

test('institution georeferences and fullscreen map controls are included',async()=>{
 const out=await makeOut();
 try{
  assert.equal(run(out,'').status,0);
  const html=await readFile(join(out,'index.html'),'utf8');
  const data=JSON.parse(await readFile(join(out,'data','public-preview.json'),'utf8'));
  assert.match(html,/id="mapFullscreenBtn"/);
  assert.match(html,/id="mapStage"/);
  assert.equal(data.records.length,14);
  for(const r of data.records){
   assert.equal(typeof r.destination.institution,'string');
   assert.ok(Number.isFinite(r.destination.lat)&&Number.isFinite(r.destination.lng));
   assert.ok(['institution_approx','city_approx'].includes(r.destination.precision));
  }
 }finally{await rm(out,{recursive:true,force:true});}
});

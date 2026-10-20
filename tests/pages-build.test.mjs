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
    assert.deepEqual(top, ['.nojekyll', 'config.js', 'data', 'index.html', 'js', 'styles.css']);
    assert.deepEqual((await readdir(join(out, 'js'))).sort(), ['app.js', 'canonical.js', 'countries.js', 'document-extract.js', 'drive.js', 'guide-fields.js', 'loan-status.js', 'records.js']);
    assert.deepEqual((await readdir(join(out, 'data'))).sort(),['public-preview.json']);
    const cfg = await readFile(join(out, 'config.js'), 'utf8');
    assert.match(cfg, /123456789-sample\.apps\.googleusercontent\.com/);
    assert.doesNotMatch(cfg, /client_secret|access_token|refresh_token/i);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('public preview contains only anonymized and sourced 2026 Coleoptera snapshot',async()=>{
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
    assert.deepEqual(Object.keys(r).sort(), ['country','dueDate','dueDateRaw','dueSource','family','number','sentDate','sentDateRaw','specimenCount','status','type','year']);
    assert.equal(r.year,'2026');
  }
  const raw=JSON.stringify(sample);
  assert.doesNotMatch(raw,/file\/d\/|@|drive\.google\.com|https?:\/\/|sourceId|filenameRecipient|access_token|Migliori|Hamada|Ferreira|Sampaio/i);
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
    assert.doesNotMatch(html,/Migliori|Hamada|Ferreira|Sampaio|file\/d\//i);
  }finally{await rm(out,{recursive:true,force:true});}
});

test('public page has separate columns for recipient and requester without real personal data',async()=>{
  const out=await makeOut();try{
    assert.equal(run(out,'').status,0);
    const html=await readFile(join(out,'index.html'),'utf8');
    assert.match(html,/Nome \(destinatário\)/);
    assert.match(html,/<th>Solicitante<\/th>/);
    assert.match(html,/Acesso restrito/);
    assert.doesNotMatch(html,/Migliori|Hamada|Ferreira|Sampaio/i);
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

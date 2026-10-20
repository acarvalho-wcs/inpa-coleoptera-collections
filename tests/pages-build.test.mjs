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

test('builds pre-rendered public preview shell without OAuth', async () => {
  const out = await makeOut();
  try {
    const result = run(out, '');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OAuth: pending/);
    const html=await readFile(join(out,'index.html'),'utf8');
    assert.match(html,/PRÉVIA PÚBLICA/);
    assert.match(html,/<strong id="mRecords">4<\/strong>/);
    assert.match(html,/<strong id="mPdfs">599<\/strong>/);
    assert.match(html,/<tbody id="recordsBody">[\s\S]*2026\/063[\s\S]*<\/tbody>/);
    assert.doesNotMatch(html,/Nenhum dado carregado|Conecte o Google Drive para consultar o acervo/);
    assert.doesNotMatch(html,/Migliori|Hamada|Ferreira|Sampaio|@|file\/d\//i);
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
    assert.deepEqual((await readdir(join(out, 'js'))).sort(), ['app.js', 'canonical.js', 'countries.js', 'document-extract.js', 'drive.js', 'records.js']);
    assert.deepEqual((await readdir(join(out, 'data'))).sort(),['public-preview.json']);
    const cfg = await readFile(join(out, 'config.js'), 'utf8');
    assert.match(cfg, /123456789-sample\.apps\.googleusercontent\.com/);
    assert.doesNotMatch(cfg, /client_secret|access_token|refresh_token/i);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('public preview contains only anonymized and sourced four-guide summary',async()=>{
  const sample=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  assert.equal(sample.kind,'public-anonymized-preview');
  assert.equal(sample.records.length,4);
  assert.equal(sample.records.filter(r=>r.type==='EMP').length,3);
  assert.equal(sample.records.filter(r=>r.type==='DOA').length,1);
  assert.equal(sample.records.reduce((n,r)=>n+r.specimenCount,0),599);
  assert.equal(sample.records.some(r=>r.number==='013'&&r.status.includes('futura')),true);
  for(const r of sample.records){
    assert.deepEqual(Object.keys(r).sort(), ['country','family','number','specimenCount','status','type','year']);
    assert.equal(r.year,'2026');
  }
  const raw=JSON.stringify(sample);
  assert.doesNotMatch(raw,/file\/d\/|@|drive\.google\.com|https?:\/\/|sourceId|filenameRecipient|access_token|Migliori|Hamada|Ferreira|Sampaio/i);
});

test('public preview HTML renderer rejects unexpected personal fields',async()=>{
  const {renderPublicPreview}=await import('../scripts/render-public-preview.mjs');
  const data=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  const html=await readFile(join(root,'index.html'),'utf8');
  data.records[0].researcher='Sensitive';
  assert.throws(()=>renderPublicPreview(html,data,'abcdef0123456789'),/unexpected fields/);
});

test('generated assets use cache-busting commit identifier',async()=>{
  const {renderPublicPreview}=await import('../scripts/render-public-preview.mjs');
  const data=JSON.parse(await readFile(join(root,'data','public-preview.json'),'utf8'));
  const html=await readFile(join(root,'index.html'),'utf8');
  const rendered=renderPublicPreview(html,data,'abcdef0123456789');
  assert.match(rendered,/\.\/js\/app\.js\?v=abcdef012345/);
  assert.match(rendered,/\.\/config\.js\?v=abcdef012345/);
});

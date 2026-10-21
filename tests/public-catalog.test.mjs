import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm, readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {buildPublicCatalog,validateBuiltCatalog,validatePublicYear,PUBLIC_YEAR_SCHEMA} from '../js/public-catalog.js';
const root=resolve(import.meta.dirname,'..');
const read=async file=>JSON.parse(await readFile(join(root,file),'utf8'));
const loc={institution:'Example Museum',city:'Manaus',country:'Brasil',lat:-3.1,lng:-60.0,precision:'city_approx',role:'recipient',note:'Cidade mencionada na guia; localização aproximada.'};
const taxa={order:'Coleoptera',families:['Chrysomelidae'],subfamilies:[],genera:[],species:[],discrimination:'2 exemplares de Chrysomelidae.'};
function item(id='001',type='EMP',parts=[{type:'EMP',specimenCount:2}]){
 return {id:'movement-'+id,number:id,type,specimenCount:parts.reduce((n,c)=>n+c.specimenCount,0),
  components:parts,family:'Chrysomelidae',recipient:'Dr. Teste de Exemplo',requestedBy:'Equipe Curatorial',
  taxa,reviewStatus:'preliminary',note:'Revisão documental pendente.',sentDate:null,dueDate:null,
  dueSource:type==='EMP'?'missing':'not_applicable',destination:loc};
}
const annual=(year='2024',records=[item()])=>({kind:PUBLIC_YEAR_SCHEMA,year,records});
test('new annual public file validates without a fixed number of records',()=>{
 assert.equal(validatePublicYear(annual('2024',[item('001'),item('002')])),2);
 assert.equal(validatePublicYear(annual('2023',[])),0);
});
test('preserves multiple legitimate movements sharing a guide number',()=>{
 const a=item('062');const b=item('062','DEV',[{type:'DEV',specimenCount:2}]);
 b.id='movement-062-return';
 assert.equal(validatePublicYear(annual('2024',[a,b])),2);
});
test('mixed movements must separate components and preserve sums',()=>{
 const x=item('046','MIX',[{type:'EMP',specimenCount:10},{type:'TRAN',specimenCount:8}]);
 assert.equal(validatePublicYear(annual('2024',[x])),1);
 const invalid=structuredClone(x);invalid.specimenCount=20;
 assert.throws(()=>validatePublicYear(annual('2024',[invalid])),/components/);
});
test('rejects extra fields, contact details, bad dates, duplicate records and ungrounded place',()=>{
 const baseline=item();
 for(const patch of [
   {...baseline,email:'test@example.org'},
   {...baseline,requestedBy:'test@example.org'},
   {...baseline,dueDate:'2024-13-40'},
   {...baseline,destination:{...loc,lat:150}},
   {...baseline,note:'http://somewhere.com'}
 ])assert.throws(()=>validatePublicYear(annual('2024',[patch])),/Public catalogue/);
 assert.throws(()=>validatePublicYear(annual('2024',[baseline,baseline])),/duplicate/);
});
test('legacy files and a third year produce a single 2024-2026 catalogue',async()=>{
 const legacy2026=await read('data/public-preview.json');
 const legacy2025=await read('data/preliminary-2025.json');
 const catalog=buildPublicCatalog({legacy2026,legacy2025,years:[annual('2024',[item()])]});
 assert.equal(validateBuiltCatalog(catalog).length,27);
 assert.deepEqual(catalog.summary.map(s=>s.year),['2024','2025','2026']);
 assert.equal(catalog.records.filter(r=>r.year==='2026').length,14);
 assert.equal(catalog.records.filter(r=>r.year==='2025').length,12);
 assert.equal(catalog.records.filter(r=>r.year==='2024').length,1);
 assert.equal(catalog.records.find(r=>r.year==='2025'&&r.number==='038').recipient,'Dr. Edilson Caron');
 assert.ok(catalog.records.every(r=>r.recipient&&r.requestedBy));
});
test('build generates catalogue and never copies private annual source documents',async()=>{
 const path=await mkdtemp(join(tmpdir(),'inpa-catalog-test-'));
 try {
  const p=spawnSync(process.execPath,[join(root,'scripts/build-pages.mjs'),path],{
   cwd:root,encoding:'utf8',env:{...process.env,GOOGLE_OAUTH_CLIENT_ID:''}
  });
  assert.equal(p.status,0,p.stderr);
  const files=await readdir(join(path,'data'));
  assert.deepEqual(files.sort(),['public-catalog.json','public-preview.json','triage-2026-audit.json']);
  const compiled=JSON.parse(await readFile(join(path,'data','public-catalog.json'),'utf8'));
  const annual=JSON.parse(await readFile(join(root,'data','year-2024.json'),'utf8'));
  assert.equal(compiled.records.length,26+annual.records.length);
  assert.equal(compiled.records.filter(r=>r.year==='2024').length,annual.records.length);
  assert.equal(compiled.records.filter(r=>r.year==='2025').length,12);
  const forGuide=(year,number,type)=>compiled.records.find(r=>r.year===year&&r.number===number&&r.type===type);
  assert.equal(forGuide('2024','048a','EMP').sources[0].format,'Word');
  assert.deepEqual(forGuide('2025','027','EMP').sources.map(s=>s.format),['PDF','Word']);
  assert.notEqual(forGuide('2025','062','EMP').sources[0].url,forGuide('2025','062','DEV').sources[0].url);
  assert.equal(compiled.records.filter(r=>['2024','2025'].includes(r.year)&&r.sources.length>0).length,19);
  assert.equal(compiled.records.filter(r=>r.year==='2026').length,14);
  assert.equal(compiled.records.filter(r=>r.year==='2026').length,14);
  assert.deepEqual(compiled.summary.map(y=>y.year),['2024','2025','2026']);
  const html=await readFile(join(path,'index.html'),'utf8');
  assert.match(html,/2024\/048a/);
  assert.match(html,/2025\/038/);
  assert.match(html,/Dr. Edilson Caron/);
  assert.match(html,/2026\/035/);
 } finally {await rm(path,{recursive:true,force:true});}
});

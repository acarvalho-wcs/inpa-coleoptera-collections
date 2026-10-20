import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePrivateGuideIndex} from '../js/private-index.js';
const sample=()=>[{year:'2026',number:'035',type:'EMP',preview:true,canonical:{taxonomy:{order:'Coleoptera'}}},{year:'2026',number:'037',preview:true}];
const sampleIndex=()=>({schema:'inpa.coleoptera.loan.v1',records:[{guide:{year:'2026',number:'035',fields:{recipient:'Pesquisador Exemplo',requestedBy:'Solicitante Exemplo'}}}]});
test('local-only index supplies names to preview without changing loan fields',()=>{
 const result=mergePrivateGuideIndex(sample(),sampleIndex());
 assert.equal(result.applied,1);
 assert.equal(result.rows[0].recipient,'Pesquisador Exemplo');
 assert.equal(result.rows[0].requestedBy,'Solicitante Exemplo');
 assert.equal(result.rows[0].canonical.taxonomy.order,'Coleoptera');
 assert.equal(result.rows[1].recipient,undefined);
});
test('rejects other schemas and refuses ambiguous duplicate guide numbers',()=>{
 assert.throws(()=>mergePrivateGuideIndex(sample(),{schema:'other',records:[]}),/incompatível/);
 const index=sampleIndex();index.records.push({...index.records[0]});
 const result=mergePrivateGuideIndex(sample(),index);
 assert.equal(result.applied,0);assert.equal(result.ambiguous,1);
});

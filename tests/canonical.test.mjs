import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFilename,consolidate} from '../js/records.js';
import {detectTaxonomy,extractFacts,canonicalKey,applyReview,createSnapshot,readSnapshot} from '../js/canonical.js';
const sample=(name,id='file-01')=>consolidate([{id,name,mimeType:'application/pdf'}],'2026')[0];
test('reconhece Scirtiidae com Coleoptera documentado - guia real',()=>{
  const row=sample('Invoice INPA 035 de 2026_Pesquisadora A-EMP.pdf');
  const text='Guia/Invoice nº: 2026/035\nFamília: Scirtiidae\nArthropoda Hexapoda Coleoptera\n14/04/2026\n14/12/2026';
  const x=extractFacts(text,row);
  assert.equal(x.taxonomy.classification,'coleoptera');
  assert.equal(x.taxonomy.family,'Scirtiidae');
  assert.equal(x.loan.sentDate,'2026-04-14');
  assert.equal(x.loan.dueDate,'2026-12-14');
  assert.equal(x.loan.returnStatus,'not_reconciled');
});
test('exclui de Coleoptera a guia Orthoptera, sem falso positivo',()=>{
  const row=sample('Invoice INPA 075 de 2026_Pesquisador B-EMP.pdf');
  const x=extractFacts('Guia/Invoice nº: 2026/075\nFamília: Tettigoniidae\nArthropoda Insecta Orthoptera',row);
  assert.equal(x.taxonomy.classification,'other');
});
test('doação de Chrysomelidae é Coleoptera, mas não empréstimo',()=>{
  const row=sample('Invoice INPA 020 de 2026_Pesquisadora C-DOA.pdf');
  const x=extractFacts('Guia/Invoice nº: 2026/020\nFamília: Chrysomelidae\n03 parátipos (Coleoptera: Chrysomelidae)\nArthropoda Hexapoda Coleoptera',row);
  assert.equal(x.taxonomy.classification,'coleoptera');assert.equal(x.movement.type,'DOA');
});
test('termo Coleoptera solto sem prova de contexto não classifica',()=>{
  assert.equal(detectTaxonomy('Contato. Seminário sobre Coleoptera e fauna regional.').classification,'pending');
});
test('taxonomia mista demanda triagem',()=>{
  const t=detectTaxonomy('Arthropoda Hexapoda Coleoptera\nArthropoda Insecta Diptera');
  assert.equal(t.classification,'mixed');
});
test('mantém guias com mesmo número e pesquisadores diferentes',()=>{
  const a=sample('Invoice INPA 076 de 2026_Pesquisador D-EMP.pdf','idA');
  const b=sample('Invoice INPA 076 de 2026_Pesquisador E-EMP.pdf','idB');
  assert.notEqual(canonicalKey(a),canonicalKey(b));
});
test('versão canônica requer revisão para confirmar campos e georreferência',()=>{
  const base=extractFacts('Guia/Invoice nº: 2026/035\nArthropoda Hexapoda Coleoptera',sample('Invoice INPA 035 de 2026_Pesquisadora A-EMP.pdf'));
  assert.equal(base.validation.status,'pending');
  const r=applyReview(base,{classification:'coleoptera',country:'Brasil',institution:'INPA',notes:'Conferido no original'});
  assert.equal(r.validation.status,'reviewed');assert.equal(r.destination.latitude,null);
  assert.equal(readSnapshot(createSnapshot([r]))[0].destination.country,'Brasil');
});
test('novo arquivo com tipo DOAÇÃO é identificado corretamente',()=>{
  assert.equal(parseFilename('Invoice INPA 009 de 2026_Pesquisadora F-DOAÇÃO.docx','2026').type,'DOA');
});
test('dado sem texto é pendente, nunca negativo definitivo',()=>{
  const x=extractFacts('',sample('Invoice INPA 075 de 2026_Pesquisador B-EMP.pdf'));
  assert.equal(x.taxonomy.classification,'pending');
  assert.match(x.validation.issues.join(';'),/sem texto/i);
});

test('PDF agregado de 2009 não equivale a uma única guia',()=>{
  const x=extractFacts('Guia/Invoice nº: 2009/001\nArthropoda Hexapoda Coleoptera',consolidate([{id:'archive',name:'Guias 2009.pdf',mimeType:'application/pdf'}],'2009')[0]);
  assert.equal(x.taxonomy.classification,'pending');assert.match(x.validation.issues.join(';'),/PDF agregado/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFilename,consolidate,filterRecords,stats} from '../js/records.js';
const pdf=(id,name)=>({id,name,mimeType:'application/pdf'});
const doc=(id,name)=>({id,name,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
test('extrai numero ano pesquisador e tipo de guia',()=>{
  const r=parseFilename('Invoice INPA 075 de 2026_Diego Mendes-EMP.pdf','2026');
  assert.deepEqual([r.year,r.number,r.researcher,r.type],['2026','075','Diego Mendes','EMP']);
});
test('DEV e DEVO sao tipo canonico devolucao',()=>{
  assert.equal(parseFilename('Invoice INPA 068 de 2025_Angelo-DEV.docx','2025').type,'DEV');
  assert.equal(parseFilename('Invoice INPA 068 de 2025_Angelo-DEVO.docx','2025').type,'DEV');
});
test('nao funde guias mesmo numero com pesquisadores diferentes',()=>{
  const rows=consolidate([doc('a','Invoice INPA 076 de 2026_Cleiton Guimaraes-EMP.docx'),doc('b','Invoice INPA 076 de 2026_Wojciech Pulawski-EMP.docx')],'2026');
  assert.equal(rows.length,2);
});
test('prefere PDF e mantem Word como copia',()=>{
  const rows=consolidate([doc('word','Invoice INPA 075 de 2026_Diego Mendes-EMP.docx'),pdf('pdf','Invoice INPA 075 de 2026_Diego Mendes-EMP.pdf')],'2026');
  assert.equal(rows.length,1);assert.equal(rows[0].id,'pdf');assert.equal(rows[0].sources.length,2);
});
test('preserva tipos diferentes apesar de mesmo numero e pesquisador',()=>{
  const rows=consolidate([doc('a','Invoice INPA 062 de 2025_Sonia Casari-EMP.docx'),doc('b','Invoice INPA 062 de 2025_Sonia Casari-DEV.docx')],'2025');
  assert.equal(rows.length,2);
});
test('busca sem diacriticos e filtra tipos',()=>{
  const rows=consolidate([doc('a','Invoice INPA 071 de 2026_Cecília Waichert-EMP.docx'),doc('b','Invoice INPA 020 de 2026_Aline Sampaio-DOA.docx')],'2026');
  assert.equal(filterRecords(rows,{query:'cecilia',type:'EMP'}).length,1);
  assert.deepEqual([stats(rows).records,stats(rows).loans],[2,1]);
});
test('arquivos sem codigo padrao nao recebem classificacao de emprestimo',()=>{
  const r=consolidate([pdf('x','Guias 2009.pdf')],'2009')[0];assert.equal(r.type,'OUTRO');assert.equal(r.year,'2009');
});

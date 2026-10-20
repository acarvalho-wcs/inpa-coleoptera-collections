import test from 'node:test';
import assert from 'node:assert/strict';
import {loanStatus,daysBetween,fromBr,showDate} from '../js/loan-status.js';
import {readGuideFields} from '../js/guide-fields.js';
import {extractFacts,applyReview,detectTaxonomy} from '../js/canonical.js';
const EMP={year:'2026',number:'035',type:'EMP',researcher:'Pesquisa',name:'Invoice INPA 035 de 2026_Pesquisa-EMP.pdf',id:'a',sources:[]};
const make=(sent,due,extra={})=>({...EMP,canonical:{loan:{sentDate:sent,dueDate:due,returnStatus:'not_reconciled',...extra}}});
test('prazo vencido não é declarado devolução em atraso confirmada',()=>{
  const s=loanStatus(make('2025-01-01','2026-10-01'),'2026-10-20');
  assert.equal(s.code,'overdue');assert.equal(s.days,-19);
  assert.match(s.label,/devolução não confirmada/);
});
test('prazo futuro 013 não é classificado como empréstimo enviado',()=>{
  assert.equal(loanStatus(make('2026-12-02','2026-12-12'),'2026-10-20').code,'planned');
});
test('a guia 035 fica dentro do prazo em 20/10/2026',()=>{
  const s=loanStatus(make('2026-04-14','2026-12-14'),'2026-10-20');
  assert.equal(s.code,'in_term');assert.equal(s.days,55);
});
test('doações não são tratadas como empréstimo vencido',()=>{
  assert.equal(loanStatus({...make('2025-01-01','2025-02-01'),type:'DOA',canonical:{movement:{type:'DOA'},loan:{dueDate:'2025-02-01'}}},'2026-10-20').code,'other');
});
test('devolução exige evidência, não somente sinalizador',()=>{
  assert.equal(loanStatus(make('2025-01-01','2025-02-01',{returnStatus:'returned'}),'2026-10-20').code,'overdue');
  const r=extractFacts('Guia nº: 2026/035\nTaxonomia Taxonomy\nOrdem: Coleoptera',EMP);
  assert.throws(()=>applyReview(r,{returnStatus:'returned'}),/exige data e referência/);
  const validated=applyReview(r,{returnStatus:'returned',returnedDate:'2026-10-10',returnEvidence:'Guia DEV conferida'});
  assert.equal(loanStatus({...EMP,canonical:validated},'2026-10-20').code,'returned');
});
test('prorrogação revisada modifica a data efetiva',()=>{
  const s=loanStatus(make('2025-01-01','2026-10-01',{extensionDueDate:'2026-11-01'}),'2026-10-20');
  assert.equal(s.code,'soon');assert.equal(s.dueDate,'2026-11-01');
});
test('datas inválidas não produzem alertas falsos',()=>{
  assert.equal(fromBr('31/02/2026'),null);assert.equal(showDate('2026-02-31'),'Não informada');
  assert.equal(daysBetween('2026-10-20','2026-10-20'),0);
});
test('extrai datas de guia padrão INPA e mantém todos os campos não preenchidos como nulos',()=>{
  const t='Guia/Invoice nº: 2026/035\nNúmero de Volumes: 1\nTipo de Envio: empréstimo\nTaxonomia Taxonomy\nFamília: Scirtiidae\nOrdem: Coleoptera\nDras. Exemplo\n14/04/2026\n14/12/2026\nNormas de empréstimo de material';
  const x=readGuideFields(t);
  assert.equal(x.fields.dueDate,'2026-12-14');assert.equal(x.fields.sentDate,'2026-04-14');
  assert.equal(x.fields.family,'Scirtiidae');assert.equal(x.fields.recipient,null);
});
test('datas de caixas de texto DOCX são recuperadas sem usar as regras de empréstimo',()=>{
  const t='Taxonomia Taxonomy\nFamília: Alticidae\nDeclaro concordar\nNormas de empréstimo de material\n[Conteúdo de caixas de texto do Word]\n15/05/2026\n15/05/2027\nArthropoda\nHexapoda\nColeoptera';
  const fields=readGuideFields(t).fields;
  assert.equal(fields.sentDate,'2026-05-15');assert.equal(fields.dueDate,'2027-05-15');
  assert.equal(detectTaxonomy(t).classification,'coleoptera');
});

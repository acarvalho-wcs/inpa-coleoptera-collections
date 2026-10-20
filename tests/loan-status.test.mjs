import test from 'node:test';
import assert from 'node:assert/strict';
import {loanStatus,daysBetween,fromBr,showDate,parseGuideDate,addOneYear} from '../js/loan-status.js';
import {readGuideFields} from '../js/guide-fields.js';
import {extractFacts,applyReview,detectTaxonomy} from '../js/canonical.js';
const EMP={year:'2026',number:'035',type:'EMP',researcher:'Pesquisa',name:'Invoice INPA 035 de 2026_Pesquisa-EMP.pdf',id:'a',sources:[]};
const make=(sent,due,extra={})=>({...EMP,canonical:{loan:{sentDate:sent,dueDate:due,returnStatus:'not_reconciled',...extra}}});
test('prazo vencido não é declarado devolução em atraso confirmada',()=>{
  const s=loanStatus(make('2025-01-01','2026-10-01'),'2026-10-20');
  assert.equal(s.code,'overdue');assert.equal(s.days,-19);
  assert.match(s.label,/devolução não confirmada/);
});
test('envio supostamente futuro exige conferência e jamais vira fato confirmado',()=>{
  assert.equal(loanStatus(make('2026-12-02','2026-12-12'),'2026-10-20').code,'date_check');
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

test('prazo padrão um ano quando não há data de devolução no documento',()=>{
  const st=loanStatus(make('2025-01-10',null),'2026-02-12');
  assert.equal(st.code,'overdue');assert.equal(st.dueDate,'2026-01-10');
  assert.equal(st.dueSource,'one_year');assert.match(st.basisLabel,/estimado/);
});
test('ano civil em 29 fevereiro respeita data limite em 28 fevereiro',()=>{
  assert.equal(addOneYear('2024-02-29'),'2025-02-28');
});
test('não sobrepõe data expressa mesmo quando difere de um ano',()=>{
  const s=loanStatus(make('2025-01-10','2027-01-11'),'2026-10-20');
  assert.equal(s.code,'in_term');assert.equal(s.dueDate,'2027-01-11');assert.equal(s.dueSource,'document');
});
test('data 02/12 é ambígua, não é declarada envio futuro',()=>{
  const d=parseGuideDate('02/12/2026');
  assert.equal(d.iso,null);assert.equal(d.ambiguous,true);assert.deepEqual(d.alternatives.sort(),['2026-02-12','2026-12-02']);
  const f=readGuideFields('Guia/Invoice nº: 2026/013\nTaxonomia Taxonomy\nFamília: Lampyridae\n02/12/2026\n12/12/2026\nNormas de empréstimo de material').fields;
  assert.equal(f.sentDate,null);assert.equal(f.sentDateRaw,'02/12/2026');assert.equal(f.dueDate,'2026-12-12');
  const row=make(null,f.dueDate,{sentDateRaw:f.sentDateRaw,datesNeedReview:f.datesNeedReview});
  const status=loanStatus(row,'2026-10-20');
  assert.equal(status.code,'date_check');assert.equal(status.needsOriginal,true);
});
test('mês/dia/ano inequívoco é identificado sem forçar formato brasileiro',()=>{
  assert.equal(parseGuideDate('02/14/2025').iso,'2025-02-14');
  assert.equal(parseGuideDate('14/02/2025').iso,'2025-02-14');
});
test('data de devolução ambígua não usa ano estimado para encobrir o problema',()=>{
  const st=loanStatus(make('2025-01-03',null,{dueDateRaw:'01/02/2026'}),'2026-10-20');
  assert.equal(st.code,'date_check');assert.equal(st.dueDate,null);assert.equal(st.displayedDue,'01/02/2026');
});
test('sufixo DEV representa guia de material devolvido sem criar novo empréstimo em atraso',()=>{
  const doc={...EMP,type:'DEV',name:'Invoice INPA 012 de 2026_Marcelo T. Tavares-DEV.docx'};
  const status=loanStatus(doc,'2026-10-20');
  assert.equal(status.code,'returned_document');
  assert.equal(status.dueSource,'return_guide');
  assert.match(status.label,/Devolução registrada/);
});
test('caixas de texto Word reconstruídas oferecem Nome e Solicitante distintos',()=>{
  const t='Taxonomia Taxonomy\nFamília: Alticidae\n[Campos reconstruídos de caixas de texto do Word]\nNome: Profs. Drs. Bruno e Sarah\nInstituição: Universidade Federal de Goiás\nColeção: Invertebrados\nSolicitante: Aline Sampaio\nData do envio: 15/05/2026\nData da devolução: 15/05/2027\n[Conteúdo de caixas de texto do Word]\n15/05/2026\n15/05/2027';
  const fields=readGuideFields(t).fields;
  assert.equal(fields.recipient,'Profs. Drs. Bruno e Sarah');assert.equal(fields.requestedBy,'Aline Sampaio');
  assert.equal(fields.dueDate,'2027-05-15');
});

test('status de prévia 013 apresenta alerta por data literal ambígua',async()=>{
  const {readFile}=await import('node:fs/promises');
  const data=JSON.parse(await readFile(new URL('../data/public-preview.json',import.meta.url),'utf8'));
  const guide=data.records.find(r=>r.number==='013');
  const status=loanStatus({...guide,loan:{sentDate:guide.sentDate,dueDate:guide.dueDate,sentDateRaw:guide.sentDateRaw,datesNeedReview:true}},'2026-10-20');
  assert.equal(status.code,'date_check');assert.equal(status.sentDateRaw,'02/12/2026');
});

test('columnar PDF reproduces Nome e Solicitante without confusing requester and curator',async()=>{
  const {readPdfFormColumns}=await import('../js/document-extract.js');
  const pairs=[
    ['Destinatário',45,80],['Nome:',45,102],['Instituição:',45,145],['País:',45,168],
    ['Neusa Hamada e Gabrielle',108,112],['Jorge',108,124],['INPA',108,147],
    ['Coleção:',315,96],['Curador:',315,117],['Solicitante:',315,140],
    ['Forma de Envio:',315,162],['Data do envio:',315,184],['Data da devolução:',315,206],
    ['Invertebrados',429,94],['Marcio Luiz',429,118],['Gabrielle Matos',429,140],
    ['Em mãos',429,171],['14/04/2026',429,190],['14/12/2026',429,213]];
  const items=pairs.map(([str,x,top])=>({str,transform:[1,0,0,1,x,842-top]}));
  const lines=readPdfFormColumns(items,842);
  const data=readGuideFields('[Campos reconstruídos de colunas do PDF]\n'+lines.join('\n')+'\nTaxonomia Taxonomy');
  assert.match(lines.join('\n'),/Nome: Neusa Hamada e Gabrielle Jorge/);
  assert.equal(data.fields.requestedBy,'Gabrielle Matos');
  assert.equal(data.fields.sentDate,'2026-04-14');
});

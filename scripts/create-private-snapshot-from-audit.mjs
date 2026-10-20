import {readFile,writeFile} from 'node:fs/promises';
import {docToRecord} from '../js/records.js';
import {canonicalKey, createSnapshot, readSnapshot, CANONICAL_SCHEMA} from '../js/canonical.js';
// Local operator utility: audit file is not part of GitHub Pages; do not commit an output containing PII.
const source=process.argv[2],destination=process.argv[3];
if(!source||!destination)throw Error('Usage: node create-private-snapshot-from-audit.mjs PRIVATE_AUDIT.json SNAPSHOT.json');
const data=JSON.parse(await readFile(source,'utf8'));
if(data.schema!=='inpa.coleoptera.private2026.v1'||!Array.isArray(data.records))throw Error('Invalid private input');
const map=data.records.map(r=>{
  const sourceName=r.source.sourceFilename.replace(/\.docx$/i,r.source.pdfFileId?'.pdf':'.docx');
  const metadata={id:r.source.driveFileId,name:sourceName,mimeType:r.source.pdfFileId?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  const row=docToRecord(metadata,'2026');
  const docs=[{id:r.source.wordFileId,name:r.source.sourceFilename,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',url:`https://drive.google.com/file/d/${r.source.wordFileId}/view`}];
  if(r.source.pdfFileId)docs.push({id:r.source.pdfFileId,name:sourceName,mimeType:'application/pdf',url:`https://drive.google.com/file/d/${r.source.pdfFileId}/view`});
  const issues=[];
  if(r.sentAmbiguous||r.dueAmbiguous)issues.push('Data literal ambígua: conferir formato mês/dia ou dia/mês na guia original');
  if(r.dueBasis==='one_year')issues.push('Prazo estimado: um ano civil após o empréstimo (guia sem data prevista de devolução)');
  if(r.movementComponents)issues.push('Guia com movimentações mistas: vide componentes para quantidades de empréstimos, trânsito, devolução e doação');
  if(r.movement==='DEV')issues.push('Devolução no título da guia, ainda não vinculada a empréstimo original');
  const guideFields={recipient:r.name,institution:r.institution,requestedBy:r.requester,curator:r.curator,shipment:r.shipping,
    sentDate:r.sentDate,dueDate:r.dueOriginalIso,sentDateRaw:r.sentRaw,dueDateRaw:r.dueRaw, specimens:r.quantityDocumented,
    family:r.family,order:r.order,discrimination:r.description,city:r.destinationLocality,country:r.country};
  return {
    schema:CANONICAL_SCHEMA,key:canonicalKey(row),sourceId:r.source.driveFileId,
    documents:docs,
    guide:{year:'2026',number:r.number,filenameRowType:row.type,filenameRecipient:row.researcher||null,fields:guideFields,
      fieldNote:'Texto das guias originais; extração preliminar sem validação curatorial'},
    taxonomy:{classification:'coleoptera',order:'Coleoptera',orders:['Coleoptera'],family:r.family,evidence:[{field:'order',quote:'Coleoptera explícito no documento original',order:'Coleoptera'}]},
    movement:{type:r.movement,source:'document and filename',confirmed:false,components:r.movementComponents||null},
    loan:{sentDate:r.sentDate,sentDateRaw:r.sentAmbiguous?r.sentRaw:null,dueDate:r.dueDate,
      dueDateRaw:r.dueAmbiguous?r.dueRaw:null,dueSource:r.dueBasis,
      datesNeedReview:r.requiresOriginalCheck,extensionDueDate:null,returnedDate:null,returnStatus:'not_reconciled',returnEvidence:null},
    destination:{country:r.country,city:r.destinationLocality,institution:r.institution,latitude:null,longitude:null,georefPrecision:'country_only'},
    specimenCount:r.quantityDocumented,
    validation:{status:'pending',issues,notes:r.note,reviewedAt:null},
    provenance:{method:'operator-reviewed-docx-and-pdf-text',extractedAt:new Date().toISOString(),source:'Google Drive',sourceOfTruth:true}
  };
});
const snapshot=createSnapshot(map);
if(readSnapshot(snapshot).length!==14)throw Error('Data loss in canonical snapshot');
await writeFile(destination,JSON.stringify(snapshot,null,2)+'\n','utf8');
console.log(`Generated private canonical records ${snapshot.recordCount} (do not commit)`);

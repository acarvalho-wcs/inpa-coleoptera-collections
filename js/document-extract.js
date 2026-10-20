// Original files are read solely inside the authenticated user's browser.
const libraries=new Map();
function script(src,globalName){
  if(globalThis[globalName])return Promise.resolve(globalThis[globalName]);
  if(libraries.has(src))return libraries.get(src);
  const p=new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=src;el.async=true;
    el.onload=()=>globalThis[globalName]?resolve(globalThis[globalName]):reject(Error(`Biblioteca ${globalName} indisponível`));
    el.onerror=()=>reject(Error('Não foi possível carregar a biblioteca de extração'));
    document.head.appendChild(el);
  });libraries.set(src,p);return p;
}
const PDF_VERSION='3.11.174';
export function readPdfFormColumns(items,height){
  // Coordinates are used only to reconstruct two-column INPA loan forms;
  // each inferred field stays subject to checking against the PDF original.
  const pos=items.map(i=>({s:i.str.trim(),x:i.transform?.[4]??0,y:height-(i.transform?.[5]??0)}));
  const labels={recipient:/^Nome:?$/i,institution:/^Institui[cç][aã]o:?$/i,local:/^Pa[ií]s:?$/i,
    collection:/^Cole[cç][aã]o:?$/i,curator:/^Curador:?$/i,requestedBy:/^Solicitante:?$/i,
    shipment:/^Forma de Envio:?$/i,sentDate:/^Data do envio:?$/i,dueDate:/^Data da devolu[cç][aã]o:?$/i};
  if(!pos.some(i=>/Destinat[aá]rio/.test(i.s))||!pos.some(i=>/Solicitante/.test(i.s)))return [];
  const find=(re,xlo,xhi)=>pos.find(i=>i.x>=xlo&&i.x<xhi&&re.test(i.s));
  const right={collection:'Coleção',curator:'Curador',requestedBy:'Solicitante',shipment:'Forma de Envio',sentDate:'Data do envio',dueDate:'Data da devolução'};
  const output=[];
  for(const [name,label] of Object.entries(right)){
    const anchor=find(labels[name],290,440);
    if(!anchor)continue;
    const possible=pos.filter(i=>i.x>420&&i.x<585&&Math.abs(i.y-anchor.y)<11&&i.s.length>1)
      .sort((a,b)=>a.y-b.y||a.x-b.x);
    if(possible.length)output.push(label+': '+possible.map(i=>i.s).join(' '));
  }
  const name=find(labels.recipient,35,110);
  const inst=find(labels.institution,35,110);
  const country=find(labels.local,35,110);
  if(name&&inst){
    const pieces=pos.filter(i=>i.x>=104&&i.x<300&&i.y>=name.y-7&&i.y<inst.y-3)
      .sort((a,b)=>a.y-b.y||a.x-b.x).map(i=>i.s).filter(v=>!/^(?:Name|Institution)$/i.test(v));
    if(pieces.length)output.unshift('Nome: '+pieces.join(' '));
  }
  if(inst&&country){
    const pieces=pos.filter(i=>i.x>=104&&i.x<300&&i.y>=inst.y-5&&i.y<country.y-4)
      .sort((a,b)=>a.y-b.y||a.x-b.x).map(i=>i.s);
    if(pieces.length)output.push('Instituição: '+pieces.join(' '));
  }
  return output;
}

async function pdfText(buffer){
  const lib=await script(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.min.js`,'pdfjsLib');
  lib.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.worker.min.js`;
  const pdf=await lib.getDocument({data:new Uint8Array(buffer)}).promise;
  const pages=[];let formMetadata=[];
  for(let i=1;i<=Math.min(pdf.numPages,40);i++){
    const page=await pdf.getPage(i);
    const items=(await page.getTextContent()).items.filter(x=>x.str?.trim());
    if(i===1)formMetadata=readPdfFormColumns(items,page.view[3]);
    const rows=[];
    for(const item of items){
      const y=item.transform?.[5]??0,x=item.transform?.[4]??0;
      const row=rows.find(r=>Math.abs(r.y-y)<=2.4);
      if(row)row.items.push({x,t:item.str});else rows.push({y,items:[{x,t:item.str}]});
    }
    rows.sort((a,b)=>b.y-a.y);
    pages.push(rows.map(row=>row.items.sort((a,b)=>a.x-b.x).map(x=>x.t).join('  ')).join('\n'));
  }
  await pdf.destroy();
  return pages.join('\n\f\n')+(formMetadata.length?'\n[Campos reconstruídos de colunas do PDF]\n'+formMetadata.join('\n'):'');
}
async function wordText(buffer){
  const [mammoth,JSZip]=await Promise.all([
    script('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.1/mammoth.browser.min.js','mammoth'),
    script('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip')
  ]);
  const base=(await mammoth.extractRawText({arrayBuffer:buffer.slice(0)})).value||'';
  // Many INPA DOCX guides contain crucial data in positioned Word text boxes,
  // ignored by default document-body text extraction. Preserve them explicitly.
  const zip=await JSZip.loadAsync(buffer);
  const xml=await zip.file('word/document.xml')?.async('string');
  if(!xml)return base;
  const dom=new DOMParser().parseFromString(xml,'application/xml');
  const texts=[];const grouped=[];
  const boxes=Array.from(dom.getElementsByTagName('*')).filter(el=>el.localName==='txbxContent');
  for(const box of boxes){
    const paragraphs=Array.from(box.getElementsByTagName('*')).filter(el=>el.localName==='p');
    const lines=[];
    for(const p of paragraphs){
      const nodes=Array.from(p.getElementsByTagName('*')).filter(el=>el.localName==='t');
      const str=nodes.map(x=>x.textContent||'').join('');
      if(str.trim()){texts.push(str.trim());lines.push(str.trim());}
    }
    if(lines.length)grouped.push(lines);
  }
  const unique=[];const seen=new Set();
  for(const g of grouped){const key=g.join('\u241f');if(!seen.has(key)){seen.add(key);unique.push(g);}}
  const metadata=[];
  const recipient=unique.find(g=>g.length===3&&!/^(?:-|xx|invertebrados)$/i.test(g[0])&&!/\d{2}\/\d{2}\/\d{4}/.test(g[0]));
  if(recipient){metadata.push('Nome: '+recipient[0], 'Instituição: '+recipient[1], 'Localidade: '+recipient[2]);}
  const form=unique.find(g=>g.length>=6 && /^\d{2}\/\d{2}\/20\d{2}$/.test(g.at(-2)) && /^\d{2}\/\d{2}\/20\d{2}$/.test(g.at(-1)));
  if(form){metadata.push('Coleção: '+form[0], 'Curador: '+form[1], 'Solicitante: '+form[2], 'Forma de Envio: '+form[3], 'Data do envio: '+form.at(-2), 'Data da devolução: '+form.at(-1));}
  return base+(metadata.length?'\n[Campos reconstruídos de caixas de texto do Word]\n'+metadata.join('\n'):'')+(texts.length?'\n\n[Conteúdo de caixas de texto do Word]\n'+texts.join('\n'):'');
}
export async function extractDocumentText(file,drive){
  const buffer=await drive.downloadTextBuffer(file.id);
  if(file.mimeType==='application/pdf'||/\.pdf$/i.test(file.name))return pdfText(buffer);
  if(/\.docx$/i.test(file.name))return wordText(buffer);
  throw Error('Formato ainda não suportado na extração');
}

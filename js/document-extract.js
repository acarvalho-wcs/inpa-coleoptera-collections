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
async function pdfText(buffer){
  const lib=await script(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.min.js`,'pdfjsLib');
  lib.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.worker.min.js`;
  const pdf=await lib.getDocument({data:new Uint8Array(buffer)}).promise;
  const pages=[];
  for(let i=1;i<=Math.min(pdf.numPages,40);i++){
    const items=(await (await pdf.getPage(i)).getTextContent()).items.filter(x=>x.str?.trim());
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
  return pages.join('\n\f\n');
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
  const texts=[];
  const boxes=Array.from(dom.getElementsByTagName('*')).filter(el=>el.localName==='txbxContent');
  for(const box of boxes){
    const paragraphs=Array.from(box.getElementsByTagName('*')).filter(el=>el.localName==='p');
    for(const p of paragraphs){
      const nodes=Array.from(p.getElementsByTagName('*')).filter(el=>el.localName==='t');
      const str=nodes.map(x=>x.textContent||'').join('');
      if(str.trim())texts.push(str.trim());
    }
  }
  return base+(texts.length?'\n\n[Conteúdo de caixas de texto do Word]\n'+texts.join('\n'):'');
}
export async function extractDocumentText(file,drive){
  const buffer=await drive.downloadTextBuffer(file.id);
  if(file.mimeType==='application/pdf'||/\.pdf$/i.test(file.name))return pdfText(buffer);
  if(/\.docx$/i.test(file.name))return wordText(buffer);
  throw Error('Formato ainda não suportado na extração');
}

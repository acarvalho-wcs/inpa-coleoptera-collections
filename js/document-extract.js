// All extraction happens in the authorized user's browser. Never send document
// bytes, snippets or personal information to the site's static host or GitHub.
const libraries=new Map();
function script(src,globalName){
  if(globalThis[globalName])return Promise.resolve(globalThis[globalName]);
  if(libraries.has(src))return libraries.get(src);
  const p=new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=src;el.async=true;
    el.onload=()=>globalThis[globalName]?resolve(globalThis[globalName]):reject(Error(`Biblioteca ${globalName} indisponível`));
    el.onerror=()=>reject(Error(`Não foi possível carregar biblioteca de extração`));document.head.appendChild(el);
  });libraries.set(src,p);return p;
}
const PDF_VERSION='3.11.174';
async function pdfText(buffer){
  const lib=await script(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.min.js`,'pdfjsLib');
  lib.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.worker.min.js`;
  const pdf=await lib.getDocument({data:new Uint8Array(buffer)}).promise;
  const pages=[];
  for(let i=1;i<=Math.min(pdf.numPages,8);i++){
    const page=await pdf.getPage(i),items=(await page.getTextContent()).items;
    pages.push(items.map(it=>it.str||'').join(' '));
  }
  await pdf.destroy();
  return pages.join('\n');
}
async function wordText(buffer){
  const mammoth=await script('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.1/mammoth.browser.min.js','mammoth');
  return (await mammoth.extractRawText({arrayBuffer:buffer})).value||'';
}
export async function extractDocumentText(file,drive){
  const buffer=await drive.downloadTextBuffer(file.id);
  if(file.mimeType==='application/pdf'||/\.pdf$/i.test(file.name))return pdfText(buffer);
  if(/\.docx$/i.test(file.name))return wordText(buffer);
  throw Error('Formato ainda não suportado na extração');
}

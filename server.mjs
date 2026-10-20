import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const rel=p==='/'?'index.html':p.slice(1);
  const full=path.resolve(root,rel);
  if(rel.split('/').some(s=>s.startsWith('.')||s==='node_modules'||s==='tests')){res.writeHead(404);res.end('Not found');return}
  if (!full.startsWith(root+path.sep) && full!==root){res.writeHead(403);res.end('Forbidden');return}
  try { const s=await stat(full); if(!s.isFile()) throw new Error('not file'); const data=await readFile(full); res.writeHead(200,{'content-type':types[path.extname(full)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);}
  catch {res.writeHead(404);res.end('Not found');}
}).listen(port,()=>console.log(`Coleoptera INPA: http://localhost:${port}`));

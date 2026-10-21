import { cp, mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import {renderPublicPreview} from './render-public-preview.mjs';
import {buildPublicCatalog} from '../js/public-catalog.js';
import { resolve, join } from 'node:path';

// GitHub Pages is a static site. Never copy the repository wholesale: it may
// contain documentation, future institutional exports, credentials or tests.
const source = resolve(import.meta.dirname, '..');
const destination = resolve(process.argv[2] || join(source, 'dist'));
const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();

// A public site shell may be deployed without Google OAuth configured yet.
// Never substitute a fake client ID: unauthorized access remains disabled.
if (clientId && !/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
  console.error('Invalid GOOGLE_OAUTH_CLIENT_ID (GitHub Actions variable).');
  process.exit(1);
}
if (destination === source || destination.startsWith(source + '/js/')) {
  throw new Error('Invalid build output path');
}
await mkdir(destination, { recursive: true });
for (const filename of ['index.html', 'styles.css', '.nojekyll']) {
  await cp(join(source, filename), join(destination, filename));
}
await mkdir(join(destination, 'js'), { recursive: true });
await mkdir(join(destination, 'data'), { recursive: true });
await mkdir(join(destination, 'assets'), { recursive: true });
for(const file of ['inpa.png','invertebrados.png','wcs-brasil.png','dynastes-hercules-macho.png']) await cp(join(source,'assets',file),join(destination,'assets',file));
await cp(join(source,'data','public-preview.json'),join(destination,'data','public-preview.json'));
await cp(join(source,'data','triage-2026-audit.json'),join(destination,'data','triage-2026-audit.json'));
const legacy2026=JSON.parse(await readFile(join(source,'data','public-preview.json'),'utf8'));
const legacy2025=JSON.parse(await readFile(join(source,'data','preliminary-2025.json'),'utf8'));
const years=[];
const annualFiles=(await readdir(join(source,'data'))).filter(name=>/^year-(?:19|20)\d{2}\.json$/.test(name)).sort();
for(const filename of annualFiles)years.push(JSON.parse(await readFile(join(source,'data',filename),'utf8')));
const documentLinks=JSON.parse(await readFile(join(source,'data','document-links.json'),'utf8'));
const publicCatalog=buildPublicCatalog({legacy2026,legacy2025,years,documentLinks});
await writeFile(join(destination,'data','public-catalog.json'),JSON.stringify(publicCatalog,null,2)+'\n','utf8');
const snapshot=legacy2026;
const sourceHtml=await readFile(join(source,'index.html'),'utf8');
await writeFile(join(destination,'index.html'),renderPublicPreview(sourceHtml,snapshot,process.env.GITHUB_SHA||'local',publicCatalog),'utf8');
const scripts = (await readdir(join(source, 'js'))).filter(name => /^[a-z0-9-]+\.js$/i.test(name));
for (const filename of scripts) await cp(join(source, 'js', filename), join(destination, 'js', filename));

// OAuth client IDs are public identifiers, not tokens or client secrets.
// The original Drive files and all documents remain on Google Drive.
const cfg = {
  googleClientId: clientId,
  driveRootFolderId: '1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP',
  startingYear: '2025',
  institutionName: 'Coleção Entomológica do INPA',
  mapTiles: true
};
await writeFile(join(destination, 'config.js'), `window.INPA_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`, { mode: 0o644 });
const output = ['index.html', 'styles.css', '.nojekyll', 'config.js', ...scripts.map(x => `js/${x}`), 'data/public-preview.json', 'data/triage-2026-audit.json', 'data/public-catalog.json', 'assets/inpa.png','assets/invertebrados.png','assets/wcs-brasil.png','assets/dynastes-hercules-macho.png'];
console.log(`Multi-year catalogue: ${publicCatalog.records.length} records, ${publicCatalog.summary.length} years, ${annualFiles.length} additional annual files.`);
console.log(`Pages build: ${output.length} allowlisted files only. Google OAuth: ${clientId ? 'configured' : 'pending'}. No PDF, DOCX, CSV or tokens copied.`);

import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
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
await cp(join(source,'data','public-preview.json'),join(destination,'data','public-preview.json'));
const scripts = (await readdir(join(source, 'js'))).filter(name => /^[a-z0-9-]+\.js$/i.test(name));
for (const filename of scripts) await cp(join(source, 'js', filename), join(destination, 'js', filename));

// OAuth client IDs are public identifiers, not tokens or client secrets.
// The original Drive files and all documents remain on Google Drive.
const cfg = {
  googleClientId: clientId,
  driveRootFolderId: '1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP',
  startingYear: '2026',
  institutionName: 'Coleção Entomológica do INPA',
  mapTiles: true
};
await writeFile(join(destination, 'config.js'), `window.INPA_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`, { mode: 0o644 });
const output = ['index.html', 'styles.css', '.nojekyll', 'config.js', ...scripts.map(x => `js/${x}`), 'data/public-preview.json'];
console.log(`Pages build: ${output.length} allowlisted files only. Google OAuth: ${clientId ? 'configured' : 'pending'}. No PDF, DOCX, CSV or tokens copied.`);

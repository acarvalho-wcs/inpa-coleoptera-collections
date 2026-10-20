import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const builder = join(root, 'scripts', 'build-pages.mjs');
const run = (where, googleClientId) => spawnSync(process.execPath, [builder, where], {
  cwd: root, encoding: 'utf8',
  env: { ...process.env, GOOGLE_OAUTH_CLIENT_ID: googleClientId }
});

const makeOut = () => mkdtemp(join(tmpdir(), 'inpa-pages-test-'));

test('never builds Pages without a configured OAuth client ID', async () => {
  const out = await makeOut();
  try {
    const result = run(out, '');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /GOOGLE_OAUTH_CLIENT_ID/);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('rejects injected or malformed client IDs', async () => {
  const out = await makeOut();
  try {
    assert.notEqual(run(out, "abc'; alert('x').apps.googleusercontent.com").status, 0);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('publishes only app allowlist and public OAuth client ID', async () => {
  const out = await makeOut();
  const clientId = '123456789-sample.apps.googleusercontent.com';
  try {
    const result = run(out, clientId);
    assert.equal(result.status, 0, result.stderr);
    const top = (await readdir(out)).sort();
    assert.deepEqual(top, ['.nojekyll', 'config.js', 'index.html', 'js', 'styles.css']);
    assert.deepEqual((await readdir(join(out, 'js'))).sort(), ['app.js', 'countries.js', 'drive.js', 'records.js']);
    const cfg = await readFile(join(out, 'config.js'), 'utf8');
    assert.match(cfg, /123456789-sample\.apps\.googleusercontent\.com/);
    assert.doesNotMatch(cfg, /client_secret|access_token|refresh_token/i);
  } finally { await rm(out, { recursive: true, force: true }); }
});

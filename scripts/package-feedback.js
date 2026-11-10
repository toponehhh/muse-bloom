'use strict';
// The private feedback Worker has no game/static-assets bundle. Record exactly
// which API sources and migrations are paired with the tested Pages artifact.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist/feedback-service');
const files = ['wrangler.jsonc', 'cloudflare/worker.mjs', 'cloudflare/attachments.mjs',
  'src/feedback/feedback-kind.js', 'src/feedback/feedback-attachments.js',
  ...fs.readdirSync(path.join(root, 'cloudflare/migrations')).filter(name => name.endsWith('.sql')).sort().map(name => 'cloudflare/migrations/' + name)];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function verify() {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'build.json'), 'utf8'));
  if (manifest.target !== 'feedback-service' || manifest.version !== require('../release.json').version) throw new Error('Wrong feedback service release');
  if (process.env.GITHUB_SHA && manifest.sourceCommit !== process.env.GITHUB_SHA) throw new Error('Wrong feedback source commit');
  if (JSON.stringify(manifest.files.map(file => file.file).sort()) !== JSON.stringify([...files].sort())) throw new Error('Unexpected feedback source files');
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(path.join(root, entry.file));
    if (bytes.length !== entry.bytes || sha(bytes) !== entry.sha256) throw new Error('Feedback source hash mismatch: ' + entry.file);
  }
  return manifest;
}
function build() {
  const sourceCommit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8'}).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Invalid source commit');
  fs.mkdirSync(out, {recursive:true});
  fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify({
    version:require('../release.json').version, target:'feedback-service', sourceCommit,
    files:files.map(file => {const bytes = fs.readFileSync(path.join(root, file)); return {file, bytes:bytes.length, sha256:sha(bytes)};})
  }, null, 2) + '\n');
  verify();
  console.log('Feedback service manifest ready: ' + out);
}
module.exports = {build, verify, out};
if (require.main === module) process.argv.includes('--verify') ? verify() : build();

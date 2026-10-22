'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {publicFiles, uiAssets} = require('./package-style-lab');
const release = require('../demos/style-lab/release.json');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist', `crazygames-style-stories-v${release.version}`);
const manifestPath = out + '.manifest.json';
// The portal receives only the playable game and license notices, never a
// Cloudflare Worker, feedback data, source prompts, or deployment credentials.
const files = publicFiles.filter(file => !file.endsWith('provenance.json'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry =>
    entry.isDirectory() ? inventory(path.join(directory, entry.name), prefix + entry.name + '/') : [prefix + entry.name]);
}
function verify() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.target !== 'crazygames-basic' || manifest.version !== release.version) throw new Error('Wrong CrazyGames release');
  if (process.env.GITHUB_SHA && manifest.sourceCommit !== process.env.GITHUB_SHA) throw new Error('Wrong source commit');
  if (JSON.stringify(inventory(out).sort()) !== JSON.stringify([...files].sort())) throw new Error('Unexpected upload files');
  if (JSON.stringify(manifest.files.map(entry => entry.file).sort()) !== JSON.stringify([...files].sort())) throw new Error('Incomplete manifest');
  let total = 0;
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(path.join(out, entry.file));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error('Release hash mismatch: ' + entry.file);
    total += bytes.length;
  }
  // No SDK: total bundle size is the initial download budget. Keep the stricter
  // mobile-homepage limit as our release gate, using decimal MB conservatively.
  if (files.length > 1500 || total > 20_000_000 || manifest.totalBytes !== total) throw new Error('Upload budget exceeded or inconsistent');
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  if (!html.includes('crazygames-basic') || !html.includes('id="feedback-open" hidden') || html.includes('muse-feedback-endpoint')) throw new Error('Wrong distribution entry');
  for (const file of uiAssets) {
    const hash = manifest.files.find(entry => entry.file === file).sha256.slice(0, 16);
    if (!html.includes('="' + file + '?v=' + hash + '"')) throw new Error('Stale asset reference: ' + file);
  }
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:data:|\.\/$)/.test(url)) continue;
    if (/^(?:\/|[a-z]+:)/i.test(url) || !files.includes(url.split('?')[0])) throw new Error('Non-local or missing entry resource: ' + url);
  }
  return manifest;
}
async function build() {
  await require('./build-style-lab')();
  for (const file of inventory(out)) if (!files.includes(file)) throw new Error('Unexpected existing upload file: ' + file);
  for (const file of files) {
    const destination = path.join(out, file);
    fs.mkdirSync(path.dirname(destination), {recursive:true});
    fs.copyFileSync(path.join(root, 'dist/style-lab', file === 'index.html' ? 'campaign.html' : file), destination);
  }
  let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8')
    .replace('<body class="campaign">', '<body class="campaign crazygames">')
    .replace('id="feedback-open"', 'id="feedback-open" hidden')
    .replace('</head>', '<meta name="muse-distribution" content="crazygames-basic"><style>.crazygames .save-row{grid-template-columns:minmax(0,1fr)}.crazygames{-webkit-user-select:none;user-select:none}</style></head>');
  for (const file of uiAssets) html = html.replace('="' + file + '"', '="' + file + '?v=' + sha256(fs.readFileSync(path.join(out, file))).slice(0, 16) + '"');
  fs.writeFileSync(path.join(out, 'index.html'), html);
  const sourceCommit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8'}).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Invalid source commit');
  const entries = files.map(file => { const bytes = fs.readFileSync(path.join(out, file)); return {file, bytes:bytes.length, sha256:sha256(bytes)}; });
  fs.writeFileSync(manifestPath, JSON.stringify({
    ...release, target:'crazygames-basic', sourceCommit, entry:'index.html',
    sdk:false, progress:'localStorage', feedback:'disabled',
    totalBytes:entries.reduce((sum, entry) => sum + entry.bytes, 0), files:entries
  }, null, 2) + '\n');
  const manifest = verify();
  console.log(`CrazyGames ${release.version}: ${files.length} files, ${(manifest.totalBytes / 1_000_000).toFixed(2)} MB. Upload the contents of ${out}`);
  return out;
}
module.exports = {build, verify, out, manifestPath};
if (require.main === module) (process.argv.includes('--verify') ? Promise.resolve().then(() => console.log(verify())) : build()).catch(error => {console.error(error); process.exitCode = 1;});

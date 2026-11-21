'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const standalone = require('./package-crazygames.js');
const {publicFiles} = require('./package-pages.js');
const release = require('../release.json');

const root = path.resolve(__dirname, '..');
const sdkUrl = 'https://integration.gamepix.com/sdk/v3/gamepix.sdk.js';
const adapterFile = 'gamepix-adapter.js';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory()
    ? inventory(path.join(dir, entry.name), prefix + entry.name + '/') : [prefix + entry.name]);
}

function portalPackage(target) {
  const gamepix = target === 'gamepix';
  const out = path.join(root, 'dist', target + '-v' + release.version);
  const manifestPath = out + '.manifest.json', zipPath = out + '.zip';
  const expected = publicFiles.filter(file => !file.endsWith('provenance.json'));
  if (gamepix) expected.push(adapterFile);
  expected.sort();
  const adapterTag = hash => '<script defer src="' + adapterFile + '?v=' + hash.slice(0, 16) + '"></script>';
  const sdkTag = '<script defer src="' + sdkUrl + '"></script>';
  const configTag = '<script>window.GamePixConfig={lifecycle:"manual"};</script>';

  function verify() {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.target !== target || manifest.version !== release.version || manifest.sdk !== gamepix) throw new Error('Wrong portal release');
    if (!/^[a-f0-9]{40}$/.test(manifest.sourceCommit) || (process.env.GITHUB_SHA && manifest.sourceCommit !== process.env.GITHUB_SHA)) throw new Error('Wrong portal source commit');
    if (JSON.stringify(inventory(out).sort()) !== JSON.stringify(expected) || JSON.stringify(manifest.files.map(e => e.file).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected portal files');
    for (const entry of manifest.files) {
      const bytes = fs.readFileSync(path.join(out, entry.file));
      if (bytes.length !== entry.bytes || sha(bytes) !== entry.sha256) throw new Error('Portal hash mismatch: ' + entry.file);
    }
    const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    if (!html.includes('content="' + target + '"') || !html.includes('id="feedback-open" hidden') || /crazygames|muse-feedback-endpoint/i.test(html)) throw new Error('Wrong portal entry');
    const external = Array.from(html.matchAll(/(?:src|href)="((?:https?:)?\/\/[^"]+)"/g), match => match[1]);
    if (JSON.stringify(external) !== JSON.stringify(gamepix ? [sdkUrl] : [])) throw new Error('Unexpected external resources in portal entry');
    if (gamepix) {
      const adapter = manifest.files.find(file => file.file === adapterFile);
      const tags = [configTag, sdkTag, adapterTag(adapter.sha256), '<script src="campaign-app.js?'];
      const positions = tags.map(tag => html.indexOf(tag));
      if (!positions.every((n, i) => n >= 0 && (!i || n > positions[i-1]))) throw new Error('Wrong GamePix SDK bootstrap order');
    }
    if (manifest.files.length > 1000 || manifest.files.some(e => e.file.length > 240 || e.bytes > 200 * 1024 * 1024) || manifest.totalBytes > 500 * 1024 * 1024 || manifest.totalBytes !== manifest.files.reduce((n, e) => n + e.bytes, 0)) throw new Error('Portal upload limits exceeded or size inconsistent');
    return manifest;
  }

  async function build() {
    await standalone.build();
    const source = standalone.verify();
    fs.mkdirSync(out, {recursive:true});
    if (inventory(out).some(file => !expected.includes(file))) throw new Error('Unexpected existing portal file');
    for (const {file} of source.files) {
      const dest = path.join(out, file);
      fs.mkdirSync(path.dirname(dest), {recursive:true});
      fs.copyFileSync(path.join(standalone.out, file), dest);
    }
    const index = path.join(out, 'index.html');
    let html = fs.readFileSync(index, 'utf8').replaceAll('crazygames-basic', target).replaceAll('crazygames', 'portal');
    if (gamepix) {
      const adapter = fs.readFileSync(path.join(root, 'src/platforms/gamepix/adapter.js'));
      fs.writeFileSync(path.join(out, adapterFile), adapter);
      html = html.replace('<script src="campaign-app.js?', configTag + sdkTag + adapterTag(sha(adapter)) + '<script src="campaign-app.js?')
        .replace('Your wardrobe and progress are saved on this device.', 'Your wardrobe and story progress are saved automatically.');
    }
    fs.writeFileSync(index, html);
    const files = expected.map(file => {
      const bytes = fs.readFileSync(path.join(out, file));
      return {file, bytes:bytes.length, sha256:sha(bytes)};
    });
    const manifest = {...source, target, platforms:[gamepix ? 'GamePix' : 'itch.io'], sdk:gamepix,
      ...(gamepix ? {sdkVersion:3, sdkUrl} : {}), files, totalBytes:files.reduce((n, e) => n + e.bytes, 0)};
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    verify();
    const python = process.env.MUSE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const summary = execFileSync(python, [path.join(__dirname, 'zip-portals.py'), out, manifestPath, zipPath], {encoding:'utf8', windowsHide:true});
    console.log(summary.trim());
    return out;
  }
  return {build, verify, out, manifestPath, zipPath};
}

const portals = portalPackage('browser-portals');
const gamepix = portalPackage('gamepix');
module.exports = {...portals, gamepix};
if (require.main === module) {
  const pkg = process.argv.includes('--gamepix') ? gamepix : portals;
  (process.argv.includes('--verify') ? Promise.resolve().then(() => console.log(pkg.verify())) : pkg.build())
    .catch(error => { console.error(error); process.exitCode = 1; });
}

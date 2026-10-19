'use strict';
// Publish only the playable build and the voluntary feedback guide.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { standalone } = require('./standalone');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist/github-pages');
const files = ['index.html', 'playtest/index.html', 'playtest/Muse-Bloom.html'];
const allowed = [...files, 'build.json'];

function checkPublishFiles(directory = out, prefix = '') {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory() && relative === 'playtest') {
      checkPublishFiles(path.join(directory, entry.name), relative + '/');
    } else if (!entry.isFile() || !allowed.includes(relative)) {
      throw new Error('Unexpected publish entry: ' + relative + '. Inspect dist/github-pages before publishing.');
    }
  }
}

checkPublishFiles();
standalone(path.join(out, 'index.html'));
fs.mkdirSync(path.join(out, 'playtest'), { recursive: true });
fs.copyFileSync(path.join(out, 'index.html'), path.join(out, 'playtest/Muse-Bloom.html'));
const guide = require('./build-guide').buildGuide()
  .replaceAll('PRIVATE PLAYTEST', 'ONLINE PLAYTEST')
  .replaceAll('私人试玩', '在线试玩')
  .replace('</header>', '<p class="note">此试玩页通过公开链接访问。反馈仍只保存在本机并由你主动下载。<a href="../">返回普通游戏</a></p></header>');
fs.writeFileSync(path.join(out, 'playtest/index.html'), guide);
const sourceCommit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40,64}$/.test(sourceCommit)) throw new Error('Invalid source commit');
const manifest = {
  version: require('../package.json').version,
  sourceCommit,
  files: files.map(file => {
    const bytes = fs.readFileSync(path.join(out, file));
    return { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  })
};
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify(manifest, null, 2) + '\n');
checkPublishFiles();
console.log('GitHub Pages build ready: ' + out);
console.log('Game: /  |  Feedback guide: /playtest/  |  Source commit: ' + sourceCommit.slice(0, 7));

'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
test('release metadata and default commands point to the production game', () => {
  assert.equal(pkg.version, require('../release.json').version);
  const lock = require('../package-lock.json');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(pkg.scripts.start, 'node scripts/server.js');
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /id="stage"[\s\S]*id="reveal"/);
  for (const command of Object.values(pkg.scripts)) {
    assert.doesNotMatch(command, /\b(?:demos|dev|js)\//);
    for (const [,file] of command.matchAll(/\bnode\s+([^\s&]+\.(?:js|mjs|cjs))/g)) assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});
test('production JavaScript uses only existing relative source dependencies', () => {
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!/\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const [, ref] of text.matchAll(/(?:from\s*|import\s*|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const target = path.resolve(path.dirname(file), ref);
        assert.ok([target, target + '.js', target + '.json'].some(name => fs.existsSync(name)), `${path.relative(root,file)}: ${ref}`);
        assert.ok(!/^(?:demos|dev|js|css)[\\/]/.test(path.relative(root,target)), file);
      }
    }
  }
  visit(path.join(root, 'src'));
  visit(path.join(root, 'cloudflare'));
});

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createServer} = require('../scripts/server');
const {publicFiles} = require('../scripts/package-pages');
async function check() {
  const out = await require('../scripts/build')();
  const inventory = (dir, prefix='') => fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry =>
    entry.isDirectory() ? inventory(path.join(dir,entry.name),prefix+entry.name+'/') : [prefix+entry.name]);
  assert.deepEqual(inventory(out).sort(), [...publicFiles].sort(), 'Default build contains only the production game');
  const server = createServer();
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(base + '/');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /id="reveal"/);
    assert.match(html, /STYLE STORIES/);
    for (const file of publicFiles) assert.equal((await fetch(base + '/' + file)).status, 200, file);
    assert.equal((await fetch(base + '/src/core/data.js')).status, 404);
    assert.equal((await fetch(base + '/.git/config')).status, 403);
    console.log('PASS: default development server serves the complete current build without source or Git files');
  } finally {await new Promise(resolve => server.close(resolve));}
}
check().catch(error => {console.error(error); process.exitCode = 1;});

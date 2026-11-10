'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const D = require('../src/core/data');
const Art = require('../src/rendering/detail-art');
const expected = require('./fixtures/detail-art.sha256.json');
test('all 40 current hair details and accessories preserve their SVG output after extraction', () => {
  const items = D.items.filter(item => ['hair', 'accessory'].includes(item.category));
  assert.equal(items.length, Object.keys(expected).length);
  for (const item of items) {
    const svg = Art.itemSvg(item);
    assert.equal(createHash('sha256').update(svg).digest('hex'), expected[item.id], item.id);
    assert.doesNotMatch(svg, /assets\/characters|MuseAssets|MuseCapsule/);
  }
});

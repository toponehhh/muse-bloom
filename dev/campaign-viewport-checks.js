'use strict';
const assert = require('node:assert/strict');

// Assert before Playwright clicks anything: auto-scroll can otherwise make a
// clipped iframe appear playable even though its primary controls are offscreen.
async function assertCampaignViewport(page, name, {result = false} = {}) {
  const selectors = result
    ? ['#result', '#result .close', '#rank', '#score', '#score-breakdown', '#next-level', '#download', '#retry-look']
    : ['.app-header', 'main', '.fitting-room', '#stage', '#full-view', '#detail-view', '#undo', '#reset',
      '.wardrobe', '#brief-name', '#goals', '.tabs', '.collection-heading', '#items', '#reveal', 'footer'];
  const layout = await page.evaluate(selectors => {
    const root = document.documentElement;
    const rect = node => { const b = node.getBoundingClientRect(); return {x:b.x, y:b.y, width:b.width, height:b.height, right:b.right, bottom:b.bottom}; };
    const items = document.querySelector('#items');
    const first = items?.firstElementChild;
    return {width:innerWidth, height:innerHeight, scrollWidth:root.scrollWidth, scrollHeight:root.scrollHeight,
      scrollX, scrollY, boxes:Object.fromEntries(selectors.map(s => [s, rect(document.querySelector(s))])),
      firstCard:first && rect(first), items:items && rect(items)};
  }, selectors);
  assert.ok(layout.scrollWidth <= layout.width + 1, `${name}: document overflows horizontally (${layout.scrollWidth}/${layout.width})`);
  assert.ok(layout.scrollHeight <= layout.height + 1, `${name}: document overflows vertically (${layout.scrollHeight}/${layout.height})`);
  assert.ok(Math.abs(layout.scrollX) <= 1 && Math.abs(layout.scrollY) <= 1, `${name}: document scrolled to reveal controls`);
  for (const [selector, b] of Object.entries(layout.boxes)) {
    assert.ok(b.width > 0 && b.height > 0, `${name}: ${selector} collapsed`);
    assert.ok(b.x >= -1 && b.y >= -1 && b.right <= layout.width + 1 && b.bottom <= layout.height + 1,
      `${name}: ${selector} is outside ${layout.width}x${layout.height}: ${JSON.stringify(b)}`);
  }
  if (!result) {
    assert.ok(layout.items.height >= 96, `${name}: wardrobe has no usable card row`);
    assert.ok(layout.firstCard.height <= layout.items.height + 1, `${name}: first clothing row cannot fit in its scroll area (${layout.firstCard.height}/${layout.items.height})`);
  }
  return layout;
}

module.exports = {assertCampaignViewport};

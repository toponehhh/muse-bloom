'use strict';
const http = require('node:http');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.mp4': 'video/mp4' };
function createServer() { return http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (name === '/favicon.ico') { res.writeHead(204).end(); return; }
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  const rel = path.relative(root, file);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some(p => p.startsWith('.'))) {
    res.writeHead(403).end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    const type = types[path.extname(file)] || 'application/octet-stream';
    const compress = /gzip/.test(req.headers['accept-encoding'] || '') && /text\/|svg|json/.test(type);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Vary': 'Accept-Encoding', ...(compress ? { 'Content-Encoding': 'gzip' } : {}) });
    res.end(compress ? zlib.gzipSync(data) : data);
  });
}); }
if (require.main === module) createServer().listen(port, '127.0.0.1', () => console.log(`Muse Bloom: http://localhost:${port}`));
module.exports = { createServer };

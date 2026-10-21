'use strict';
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
async function build() {
  const { makeSkeleton, textureFiles } = await import('../demos/skeletal/src/rig.mjs');
  fs.mkdirSync(path.join(root, 'demos/skeletal/assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'demos/skeletal/assets/nora_ske.json'), JSON.stringify(makeSkeleton()));
  for (const [name,file] of Object.entries(textureFiles)) {
    fs.writeFileSync(path.join(root, 'demos/skeletal/assets', name+'_tex.json'), JSON.stringify({name:'muse-atelier',imagePath:file,width:1024,height:1536,SubTexture:[{name,x:0,y:0,width:1024,height:1536}]}));
  }
  await esbuild.build({
    entryPoints: [path.join(root, 'demos/skeletal/src/main.js')],
    outfile: path.join(root, 'demos/skeletal/app.js'),
    bundle: true, format: 'iife', target: ['es2022'], minify: true,
    legalComments: 'linked', logLevel: 'info',
  });
  const dest = path.join(root, 'dist/skeletal-demo');
  // Remove only this reproducible build, never the other game distributions.
  if (path.resolve(dest) !== path.resolve(root, 'dist', 'skeletal-demo') || path.relative(root, dest).startsWith('..')) throw new Error('Unsafe build directory');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const file of ['index.html', 'style.css', 'app.js', 'app.js.LEGAL.txt']) {
    const src = path.join(root, 'demos/skeletal', file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, file));
  }
  fs.cpSync(path.join(root, 'demos/skeletal/assets'), path.join(dest, 'assets'), { recursive: true });
  fs.cpSync(path.join(root, 'demos/skeletal/licenses'), path.join(dest, 'licenses'), { recursive: true });
  console.log('Skeletal demo: dist/skeletal-demo/index.html (serve over HTTP)');
}
if (require.main === module) build().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { build };

'use strict';
const { build } = require('./build-skeletal');
const { createServer } = require('./server');
build().then(() => {
  const port = Number(process.env.PORT || 4175);
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Muse Bloom Motion Atelier: http://localhost:${port}/demos/skeletal/index.html`);
  });
}).catch(error => { console.error(error); process.exitCode = 1; });

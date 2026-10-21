'use strict';
const build=require('./build-style-lab'),{createServer}=require('./server');
build().then(()=>{const server=createServer();server.listen(4182,'127.0.0.1',()=>console.log('Muse Bloom Style Room: http://127.0.0.1:4182/demos/style-lab/index.html'));});

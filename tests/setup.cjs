// Public upstream sample; no user data. Run npm run test:setup once before browser tests.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
(async () => {
 const url='https://raw.githubusercontent.com/strukturag/libheif/master/examples/example.heic';
 const response=await fetch(url);
 if(!response.ok) throw new Error(`HEIC fixture download: ${response.status}`);
 const data=Buffer.from(await response.arrayBuffer());
 if(createHash('sha256').update(data).digest('hex')!=='7f8b363e4936c0666a25f64f3a92fda10bd8e5453be4592530b65a55dd98f3f2') throw new Error('Upstream sample changed; review before updating checksum');
 fs.mkdirSync('.tmp',{recursive:true});fs.writeFileSync('.tmp/example.heic',data);
})().catch(error=>{console.error(error);process.exitCode=1;});

// Explicit maintenance command, not part of the offline build.
const fs = require('node:fs');
const {createHash} = require('node:crypto');
(async () => {
 const dir='vendor/fonts'; fs.mkdirSync(dir,{recursive:true});
 const source='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
 const response=await fetch(source,{headers:{'User-Agent':'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'}});
 if(!response.ok) throw new Error(`Font CSS: ${response.status}`);
 let css=await response.text();
 const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];
 for(const url of urls) {
  const response=await fetch(url); if(!response.ok)throw new Error(`Font: ${response.status}`);
  const data=Buffer.from(await response.arrayBuffer());
  const file=createHash('sha256').update(data).digest('hex').slice(0,16)+new URL(url).pathname.match(/\.[^.]+$/)[0];
  fs.writeFileSync(`${dir}/${file}`,data);css=css.replaceAll(url,file);
 }
 fs.writeFileSync(`${dir}/fonts.css`,css);
 for(const family of ['outfit','plusjakartasans']) {
  const response=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`);
  if(!response.ok)throw new Error('Font license fetch failed');
  fs.writeFileSync(`${dir}/${family}-OFL.txt`,await response.text());
 }
 fs.writeFileSync(`${dir}/SOURCE.txt`,source+'\nRetrieved: 2026-10-22. See OFL files. Versioned by SHA-256 in vendor-manifest.json.\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
